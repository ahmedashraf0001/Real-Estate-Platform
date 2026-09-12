import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 3: Security & RLS Hardening Verification Suite', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const migration016Path = path.join(migrationsDir, '016_harden_security_and_leads_rls.sql');

  describe('Migration 016 SQL Integrity & RLS Policies', () => {
    it('Should find migration file 016_harden_security_and_leads_rls.sql', () => {
      assert.ok(fs.existsSync(migration016Path), 'Migration file 016 must exist');
    });

    it('Should enforce RLS and anon INSERT-only boundary on public.leads', () => {
      const sql = fs.readFileSync(migration016Path, 'utf8');
      
      // RLS enabled on leads
      assert.match(sql, /ALTER TABLE public\.leads ENABLE ROW LEVEL SECURITY;/i);
      
      // Revoke all on leads from anon
      assert.match(sql, /REVOKE ALL ON TABLE public\.leads FROM anon;/i);
      
      // Grant INSERT only on leads to anon
      assert.match(sql, /GRANT INSERT ON TABLE public\.leads TO anon;/i);
      
      // Policy leads_anon_insert
      assert.match(sql, /CREATE POLICY "leads_anon_insert" ON public\.leads\s+FOR INSERT\s+TO anon/i);
      
      // Policy leads_auth_manage uses InitPlan optimization
      assert.match(sql, /CREATE POLICY "leads_auth_manage" ON public\.leads/i);
      assert.match(sql, /\(SELECT auth\.role\(\)\) = 'authenticated'/i);
      
      // Policy leads_service_manage
      assert.match(sql, /CREATE POLICY "leads_service_manage" ON public\.leads\s+FOR ALL\s+TO service_role/i);
    });

    it('Should verify all 16 core ERP tables are protected with RLS and anon access revoked', () => {
      const sql = fs.readFileSync(migration016Path, 'utf8');
      const expectedErpTables = [
        'erp_accounts',
        'erp_accounting_periods',
        'erp_contracts',
        'erp_installment_schedules',
        'erp_journal_entries',
        'erp_journal_lines',
        'erp_pdc_records',
        'erp_rescissions',
        'erp_contract_amendments',
        'erp_cost_allocations',
        'erp_tax_records',
        'erp_partner_calls',
        'erp_maker_checker',
        'erp_audit_logs',
        'erp_partner_profiles',
        'erp_partner_transactions',
      ];

      expectedErpTables.forEach(tbl => {
        assert.ok(sql.includes(`'${tbl}'`), `Table ${tbl} must be included in RLS hardening array`);
      });

      assert.match(sql, /REVOKE ALL ON TABLE public\.\%I FROM anon;/i);
      assert.match(sql, /GRANT ALL ON TABLE public\.\%I TO authenticated, service_role;/i);
    });

    it('Should secure viewing bookings and newsletter subscribers', () => {
      const sql = fs.readFileSync(migration016Path, 'utf8');
      assert.match(sql, /ALTER TABLE public\.bookings ENABLE ROW LEVEL SECURITY;/i);
      assert.match(sql, /REVOKE ALL ON TABLE public\.bookings FROM anon;/i);
      assert.match(sql, /ALTER TABLE public\.newsletter_subscribers ENABLE ROW LEVEL SECURITY;/i);
      assert.match(sql, /GRANT INSERT ON TABLE public\.newsletter_subscribers TO anon;/i);
    });
  });

  describe('Secret Leakage Audit', () => {
    it('Should confirm no SUPABASE_SERVICE_ROLE_KEY is prefixed with NEXT_PUBLIC_', () => {
      const srcDir = path.resolve(__dirname, '../../..');
      const forbiddenPattern = ['NEXT_PUBLIC', 'SUPABASE_SERVICE_ROLE_KEY'].join('_');
      const forbiddenPattern2 = ['NEXT_PUBLIC', 'SERVICE_ROLE'].join('_');

      function scanDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '__tests__') {
              scanDir(fullPath);
            }
          } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert.ok(
              !content.includes(forbiddenPattern),
              `File ${fullPath} leaked service role key in NEXT_PUBLIC_ variable!`
            );
            assert.ok(
              !content.includes(forbiddenPattern2),
              `File ${fullPath} has dangerous NEXT_PUBLIC_SERVICE_ROLE variable!`
            );
          }
        }
      }

      scanDir(srcDir);
    });

    it('Should verify that SUPABASE_SERVICE_ROLE_KEY is only accessed in server context', () => {
      const clientFiles = [
        path.resolve(__dirname, '../../../lib/supabase/client.ts'),
        path.resolve(__dirname, '../../../lib/supabase/public.ts'),
      ];

      clientFiles.forEach(fp => {
        if (fs.existsSync(fp)) {
          const content = fs.readFileSync(fp, 'utf8');
          assert.ok(
            !content.includes('SUPABASE_SERVICE_ROLE_KEY'),
            `Client file ${fp} must never reference SUPABASE_SERVICE_ROLE_KEY`
          );
        }
      });
    });
  });

  describe('Server-Side Input Validation & Phone Number Protection', () => {
    // Replicate the phone validation logic from api/leads/route.ts
    function isValidPhone(phone: string, email?: string | null): boolean {
      const clean = phone.trim();
      if (clean.toUpperCase().startsWith('N/A')) {
        return Boolean(email && email.includes('@'));
      }
      const digitsOnly = clean.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        return false;
      }
      return /^[+]?[0-9\s\-().]{7,30}$/.test(clean);
    }

    it('Should accept valid Egyptian mobile numbers in various formats', () => {
      assert.strictEqual(isValidPhone('01012345678'), true);
      assert.strictEqual(isValidPhone('+201009970776'), true);
      assert.strictEqual(isValidPhone('+20 11 2345 6789'), true);
      assert.strictEqual(isValidPhone('01598765432'), true);
      assert.strictEqual(isValidPhone('(012) 3456-7890'), true);
    });

    it('Should accept valid international phone numbers', () => {
      assert.strictEqual(isValidPhone('+966501234567'), true); // Saudi
      assert.strictEqual(isValidPhone('+971501234567'), true); // UAE
      assert.strictEqual(isValidPhone('+447911123456'), true); // UK
    });

    it('Should accept N/A - Email Only fallback if email is valid', () => {
      assert.strictEqual(isValidPhone('N/A - Email Only', 'vip@client.com'), true);
      assert.strictEqual(isValidPhone('N/A', null), false);
    });

    it('Should strictly reject malicious, injected, or malformed phone strings', () => {
      assert.strictEqual(isValidPhone('<script>alert(1)</script>'), false);
      assert.strictEqual(isValidPhone("01012345678'; DROP TABLE leads;--"), false);
      assert.strictEqual(isValidPhone('123'), false); // Too short (< 7 digits)
      assert.strictEqual(isValidPhone('01012345678901234567890'), false); // Too long (> 15 digits)
      assert.strictEqual(isValidPhone('phone-number-here'), false);
    });
  });
});
