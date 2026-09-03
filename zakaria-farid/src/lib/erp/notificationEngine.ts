import { 
  ERPPDCRecord, 
  ERPContract, 
  ERPInstallmentSchedule,
  ERPMakerCheckerRequest, 
  ERPTaxRecord, 
  ERPAccountingPeriod,
  ERPNotification 
} from './types';
import { D } from './math';

const STORAGE_KEY_READ = 'zf_fin_os_read_notifications_v1';
const STORAGE_KEY_DISMISSED = 'zf_fin_os_dismissed_notifications_v1';

export function getPersistedNotificationState(): { readIds: Set<string>; dismissedIds: Set<string> } {
  if (typeof window === 'undefined') {
    return { readIds: new Set(), dismissedIds: new Set() };
  }

  try {
    const rawRead = localStorage.getItem(STORAGE_KEY_READ);
    const rawDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    const readIds = rawRead ? new Set<string>(JSON.parse(rawRead)) : new Set<string>();
    const dismissedIds = rawDismissed ? new Set<string>(JSON.parse(rawDismissed)) : new Set<string>();
    return { readIds, dismissedIds };
  } catch {
    return { readIds: new Set(), dismissedIds: new Set() };
  }
}

export function persistNotificationRead(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const { readIds } = getPersistedNotificationState();
    readIds.add(id);
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(readIds)));
  } catch (err) {
    console.error('Failed to persist read notification:', err);
  }
}

export function persistMarkAllRead(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const { readIds } = getPersistedNotificationState();
    ids.forEach(id => readIds.add(id));
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(readIds)));
  } catch (err) {
    console.error('Failed to persist mark all read:', err);
  }
}

export function persistNotificationDismiss(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const { dismissedIds } = getPersistedNotificationState();
    dismissedIds.add(id);
    localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(Array.from(dismissedIds)));
  } catch (err) {
    console.error('Failed to persist dismissed notification:', err);
  }
}

export function persistClearAll(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const { dismissedIds } = getPersistedNotificationState();
    ids.forEach(id => dismissedIds.add(id));
    localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(Array.from(dismissedIds)));
  } catch (err) {
    console.error('Failed to persist clear all:', err);
  }
}

interface AlertEvaluationParams {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  schedules?: ERPInstallmentSchedule[];
  makerCheckerRequests: ERPMakerCheckerRequest[];
  taxRecords: ERPTaxRecord[];
  activePeriod?: ERPAccountingPeriod;
  readIds?: Set<string>;
  dismissedIds?: Set<string>;
}

export function evaluateFinancialAlerts({
  pdcRecords,
  contracts,
  schedules = [],
  makerCheckerRequests,
  taxRecords,
  activePeriod,
  readIds = new Set(),
  dismissedIds = new Set()
}: AlertEvaluationParams): ERPNotification[] {
  const notifications: ERPNotification[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatMoney = (val: string | number) => {
    return D(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // --------------------------------------------------------------------------
  // RULE 1: OVERDUE CHEQUES IN SAFE (Critical)
  // --------------------------------------------------------------------------
  pdcRecords.forEach(pdc => {
    if (pdc.status !== 'In Safe') return;
    const dueDate = new Date(pdc.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      const id = `overdue_pdc_${pdc.cheque_id}_${pdc.due_date}`;
      if (dismissedIds.has(id)) return;

      notifications.push({
        id,
        titleAr: `شيك مؤجل متأخر التحصيل #${pdc.cheque_number}`,
        titleEn: `Overdue Cheque in Safe #${pdc.cheque_number}`,
        messageAr: `الشيك رقم ${pdc.cheque_number} بمبلغ ${formatMoney(pdc.nominal_value)} ج.م على ${pdc.bank_name} تجاوز موعد استحقاقه منذ ${diffDays} يوم (${pdc.due_date}) ولم يُحصل بعد.`,
        messageEn: `Cheque #${pdc.cheque_number} for ${formatMoney(pdc.nominal_value)} EGP on ${pdc.bank_name} is overdue by ${diffDays} days (${pdc.due_date}) and requires immediate clearing.`,
        severity: 'critical',
        category: 'cheque',
        createdAt: pdc.due_date,
        read: readIds.has(id),
        actionLabelAr: 'الانتقال إلى حافظة الشيكات',
        actionLabelEn: 'Open Cheque Vault',
        targetModule: 'pdc',
        metadata: { chequeId: pdc.cheque_id }
      });
    } else if (diffDays >= -7 && diffDays <= 0) {
      // --------------------------------------------------------------------------
      // RULE 2: APPROACHING CHEQUE MATURITY (Warning - Within 7 Days)
      // --------------------------------------------------------------------------
      const id = `maturing_pdc_${pdc.cheque_id}_${pdc.due_date}`;
      if (dismissedIds.has(id)) return;

      const daysRemaining = Math.abs(diffDays);
      notifications.push({
        id,
        titleAr: `استحقاق شيك مؤجل خلال ${daysRemaining === 0 ? 'اليوم' : `${daysRemaining} أيام`}`,
        titleEn: `Cheque Maturing in ${daysRemaining === 0 ? 'Today' : `${daysRemaining} days`}`,
        messageAr: `الشيك رقم ${pdc.cheque_number} بمبلغ ${formatMoney(pdc.nominal_value)} ج.م على ${pdc.bank_name} يستحق في ${pdc.due_date}. يرجى التجهيز للإيداع البنكي.`,
        messageEn: `Cheque #${pdc.cheque_number} for ${formatMoney(pdc.nominal_value)} EGP on ${pdc.bank_name} matures on ${pdc.due_date}. Prepare for bank clearing presentation.`,
        severity: 'warning',
        category: 'cheque',
        createdAt: pdc.due_date,
        read: readIds.has(id),
        actionLabelAr: 'فحص الشيك بالحافظة',
        actionLabelEn: 'Inspect Cheque',
        targetModule: 'pdc',
        metadata: { chequeId: pdc.cheque_id }
      });
    }
  });

  // --------------------------------------------------------------------------
  // RULE 3: PENDING MAKER-CHECKER APPROVALS (Critical Dual Authorization)
  // --------------------------------------------------------------------------
  makerCheckerRequests.forEach(req => {
    if (req.status !== 'Pending') return;
    const id = `maker_checker_${req.request_id}`;
    if (dismissedIds.has(id)) return;

    notifications.push({
      id,
      titleAr: `طلب موافقة معلق: ${req.mutation_type}`,
      titleEn: `Pending Dual Authorization: ${req.mutation_type}`,
      messageAr: `طلب قيد/تسوية رقم ${req.request_id} بمبلغ ${req.amount ? `${formatMoney(req.amount)} ج.م` : 'غير محدد'} مقدّم من ${req.requested_by} بانتظار الاعتماد الرقابي.`,
      messageEn: `Maker-checker request #${req.request_id} for ${req.amount ? `${formatMoney(req.amount)} EGP` : 'unspecified'} submitted by ${req.requested_by} requires secondary approval.`,
      severity: 'critical',
      category: 'approval',
      createdAt: req.created_at || new Date().toISOString(),
      read: readIds.has(id),
      actionLabelAr: 'مراجعة واعتماد الطلب',
      actionLabelEn: 'Review & Approve',
      targetModule: 'rescissions',
      metadata: { requestId: req.request_id }
    });
  });

  // --------------------------------------------------------------------------
  // RULE 4: CONTRACT TRANCHES IN ARREARS (Critical / Warning)
  // --------------------------------------------------------------------------
  schedules.forEach(schedule => {
    if (schedule.status !== 'Pending') return;
    const dueDate = new Date(schedule.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      const contract = contracts.find(c => c.contract_id === schedule.contract_id);
      if (contract && contract.status === 'Rescinded') return;

      const id = `overdue_tranche_${schedule.schedule_id}_${schedule.due_date}`;
      if (dismissedIds.has(id)) return;

      const contractNum = contract ? contract.contract_number : 'مجهول';
      const buyerName = contract ? contract.buyer_name : 'العميل';

      notifications.push({
        id,
        titleAr: `قسط تعاقدي متأخر السداد (عقد ${contractNum})`,
        titleEn: `Overdue Installment Tranche (Contract ${contractNum})`,
        messageAr: `القسط رقم ${schedule.tranche_number} بمبلغ ${formatMoney(schedule.nominal_value)} ج.م للعميل ${buyerName} مستحق منذ ${schedule.due_date} (${diffDays} يوم تأخير).`,
        messageEn: `Tranche #${schedule.tranche_number} for ${formatMoney(schedule.nominal_value)} EGP for ${buyerName} is overdue since ${schedule.due_date} (${diffDays} days past due).`,
        severity: diffDays > 30 ? 'critical' : 'warning',
        category: 'contract',
        createdAt: schedule.due_date,
        read: readIds.has(id),
        actionLabelAr: 'سجل العقد والمبيعات',
        actionLabelEn: 'View Contract',
        targetModule: 'contracts',
        metadata: { contractId: schedule.contract_id, scheduleId: schedule.schedule_id }
      });
    }
  });

  // --------------------------------------------------------------------------
  // RULE 5: UNREMITTED TAX LIABILITIES (Warning)
  // --------------------------------------------------------------------------
  taxRecords.forEach(tax => {
    if (tax.remittance_status !== 'Pending') return;
    const id = `unremitted_tax_${tax.tax_id}`;
    if (dismissedIds.has(id)) return;

    notifications.push({
      id,
      titleAr: `مستحق ضريبي بانتظار التوريد (${tax.tax_type})`,
      titleEn: `Pending Statutory Tax Remittance (${tax.tax_type})`,
      messageAr: `مبلغ ${formatMoney(tax.tax_amount)} ج.م لوعاء ${formatMoney(tax.taxable_base)} ج.م مقيد تحت ${tax.tax_type} بانتظار السداد لمصلحة الضرائب المصرية.`,
      messageEn: `Tax liability of ${formatMoney(tax.tax_amount)} EGP on taxable base of ${formatMoney(tax.taxable_base)} EGP (${tax.tax_type}) requires remittance to ETA.`,
      severity: 'warning',
      category: 'tax',
      createdAt: tax.created_at || new Date().toISOString(),
      read: readIds.has(id),
      actionLabelAr: 'توريد الضرائب',
      actionLabelEn: 'Remit Tax',
      targetModule: 'tax',
      metadata: { taxId: tax.tax_id }
    });
  });

  // --------------------------------------------------------------------------
  // RULE 6: ACCOUNTING PERIOD CONSTRAINTS (Info / Notice)
  // --------------------------------------------------------------------------
  if (activePeriod && (activePeriod.status === 'LOCKED' || activePeriod.status === 'CLOSED')) {
    const id = `period_locked_${activePeriod.fiscal_year}_${activePeriod.period_number}`;
    if (!dismissedIds.has(id)) {
      notifications.push({
        id,
        titleAr: `الفترة المالية ${activePeriod.fiscal_year}/${activePeriod.period_number} مقفلة`,
        titleEn: `Accounting Period ${activePeriod.fiscal_year}/${activePeriod.period_number} Locked`,
        messageAr: `الفترة المحاسبية الحالية في حالة ${activePeriod.status}. القيود المحاسبية وتعديل الأرصدة مقيدة لحماية سلامة القوائم المالية.`,
        messageEn: `Current accounting period is ${activePeriod.status}. New journal postings and balance modifications are restricted to preserve financial statements.`,
        severity: 'info',
        category: 'period',
        createdAt: new Date().toISOString(),
        read: readIds.has(id),
        actionLabelAr: 'عرض دفتر الأستاذ',
        actionLabelEn: 'View Ledger',
        targetModule: 'ledger',
        metadata: { periodNumber: activePeriod.period_number }
      });
    }
  }

  // Sort: Critical first, then Warning, then Info, and newest first within each severity
  const severityRank: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3
  };

  return notifications.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
