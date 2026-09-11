---
name: database-schema
description: >-
  Work-routing track for Supabase PostgreSQL schema, migrations, RLS security policies,
  column immutability triggers, and performance indexes in Zakaria Farid Real Estate ERP.
  Enforces dual-gated verification before and after schema mutations.
---

# Track: DATABASE_SCHEMA (Database Custodian & Security Sentry)

## Assigned Role: Database Custodian
- **Model Tier**: `pro`
- **Scoping**: SQL migrations in `supabase/migrations/`, Supabase MCP tools (`apply_migration`, `get_advisors`).

## Guidelines & Requirements
1. **Strict Idempotency**:
   - Every SQL migration must be guarded with `IF EXISTS (SELECT 1 FROM pg_tables ...)` and `CREATE INDEX IF NOT EXISTS` / `DROP POLICY IF EXISTS`.
2. **Column-Level Immutability**:
   - Enforce triggers preventing direct `UPDATE` on financial columns and `DELETE` on posted installments and journal rows (`INV-0.6`).
3. **RLS Least-Privilege**:
   - All 16 ERP domain tables must be isolated to `authenticated` and `service_role`.
   - Wrap role checks in cached InitPlans: `(SELECT auth.role()) = 'authenticated'` to eliminate `auth_rls_initplan` warnings.
   - Separate write policies (`INSERT`, `UPDATE`, `DELETE`) from public `SELECT` to eliminate `multiple_permissive_policies` warnings.
4. **Targeted Performance Indexing**:
   - Index high-traffic sort columns (`properties(created_at DESC)`, `erp_journal_entries(entry_date DESC)`, `erp_pdc_records(due_date ASC)`) and foreign keys.

## Verification Command
```bash
npx tsc --noEmit && npm test
```
