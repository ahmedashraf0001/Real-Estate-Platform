-- ============================================================================
-- Migration: 009_erp_coas_additions.sql
-- Description: Register missing canonical accounts in erp_accounts:
--   104000: أقساط وأوراق قبض تحت التحصيل بالخزينة (Safe Installments & PDC Notes)
--   105000: مشروعات تحت التنفيذ - مجمع تكاليف البناء (Consolidated WIP)
--   204000: مستحقات ضريبة التصرفات العقارية والرسوم (Accrued Disposition Tax & Fees)
--   603000: مصروفات مرافق وفواتير تشغيل الموقع (Utilities & Site Admin Expenses)
-- ============================================================================

INSERT INTO erp_accounts (account_code, account_name_en, account_name_ar, account_type, normal_balance, notes)
VALUES
  (
    '104000',
    'Installments & Notes Under Collection (Safe)',
    'أقساط وأوراق قبض تحت التحصيل بالخزينة',
    'ASSET',
    'DEBIT',
    'Installments and notes under collection in safe custody (§14.F)'
  ),
  (
    '105000',
    'Projects Under Construction (Consolidated WIP)',
    'مشروعات تحت التنفيذ - مجمع تكاليف البناء (WIP)',
    'ASSET',
    'DEBIT',
    'Consolidated real estate development work-in-progress'
  ),
  (
    '204000',
    'Accrued Real Estate Disposition Taxes & Fees',
    'مستحقات ضريبة التصرفات العقارية والرسوم',
    'LIABILITY',
    'CREDIT',
    'Real estate disposition tax (2.5%) and governmental fee obligations'
  ),
  (
    '603000',
    'Utilities & Site Administration Expenses',
    'مصروفات مرافق وفواتير تشغيل الموقع',
    'EXPENSE',
    'DEBIT',
    'Site utilities, corporate overhead bills and running expenses'
  )
ON CONFLICT (account_code) DO UPDATE SET
  account_name_en = EXCLUDED.account_name_en,
  account_name_ar = EXCLUDED.account_name_ar,
  account_type = EXCLUDED.account_type,
  normal_balance = EXCLUDED.normal_balance,
  notes = EXCLUDED.notes;
