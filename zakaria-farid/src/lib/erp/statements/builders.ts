import type { Property } from '../../supabase/types';
import type { ERPContract, ERPInstallmentSchedule, ERPJournalEntry, ERPPartnerCommitment, ERPPartnerTransaction, ERPPropertyCostItem, ERPPartnerProfile, ERPPDCRecord } from '../types';
import { D, ratio } from '../math';
import { calculatePropertyAuditMetrics } from '../propertyCostEngine';
import { getConstructionSettlementOpeningBalance, CANONICAL_WIP_ACCOUNTS } from '../canonicalMetrics';
import { buildProjectedVaultItems, normalizeDateStr, toLocalDateStr } from '../installmentsVaultProjection';
import { computeProjectPayoutPosition, isSamePartner, normalizePropertySplits, resolvePartnerSharePct, type ProjectPayoutPosition } from '../partnersEngine';
import { evaluatePartnerCommitment } from '../partnerAgingEngine';

export interface StatementData {
  properties: Property[];
  propertyCosts: ERPPropertyCostItem[];
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  journalEntries: ERPJournalEntry[];
  partnerCommitments?: ERPPartnerCommitment[];
  partnerTransactions?: ERPPartnerTransaction[];
  pdcRecords?: ERPPDCRecord[];
}
interface Column { label: string; kind?: 'money' | 'number' | 'ref'; nowrap?: boolean; width?: number }
interface TableRow { cells: (string | undefined)[]; overdue?: boolean }
interface StatementTable { title: string; note?: string; columns: Column[]; rows: TableRow[]; total?: (string | undefined)[]; empty: string }
interface Reconciliation { label: string; ledger: string; subledger: string; difference: string }
export interface Statement {
  kind: 'P' | 'C' | 'R'; number: string; name: string; title: string; issued: string; currency: string;
  identity: { label: string; value?: string; numeric?: boolean }[];
  summary: { label: string; value: string; details?: { label: string; value: string; bad?: boolean }[] }[];
  timeline?: { label: string; date?: string; note?: string; future?: boolean }[];
  tables: StatementTable[];
  callouts: string[];
  reconciliation: Reconciliation[];
  signatures: string[];
  footer: string;
}
const sum = (amounts: string[]) => amounts.reduce((total, amount) => total.plus(amount), D(0)).toFixed(2);
const money = (label: string): Column => ({ label, kind: 'money' });
const ref: Column = { label: 'القيد', kind: 'ref' };
const mask = (value?: string) => {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length > 7 ? `${digits.slice(0, 4)}${'•'.repeat(digits.length - 7)}${digits.slice(-3)}` : '•'.repeat(digits.length);
};
function base(kind: Statement['kind'], id: string, name: string, issuedAt: Date): Statement {
  if (!Number.isFinite(issuedAt.getTime())) throw new Error('تاريخ إصدار الكشف غير صالح');
  const day = toLocalDateStr(issuedAt);
  const time = `${String(issuedAt.getHours()).padStart(2, '0')}${String(issuedAt.getMinutes()).padStart(2, '0')}`;
  return { kind, number: `ST-${kind}-${day.replaceAll('-', '')}-${time}-${id.slice(0, 8)}`, name,
    title: kind === 'P' ? 'كشف حساب عقار' : kind === 'C' ? 'كشف حساب عميل' : 'كشف حساب شريك',
    issued: `${day} ${time.slice(0, 2)}:${time.slice(2)}`, currency: 'جنيه مصري',
    identity: [], summary: [], tables: [], callouts: [], reconciliation: [], signatures: [], footer: '' };
}
function belongs(contract: ERPContract, property: Property) {
  return contract.property_id === property.id || contract.unit_id === property.id ||
    (!contract.property_id && Boolean(property.building_units?.some(unit => unit.unit_id === contract.building_unit_id || unit.unit_id === contract.unit_id)));
}
function references(entries: ERPJournalEntry[], entityIds: string[], contractId?: string) {
  const matched = entries.filter(entry => entityIds.includes(entry.source_entity_id || '') || entityIds.includes(entry.entry_id) ||
    (contractId && entry.lines.some(line => line.contract_id === contractId)))
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at) || b.entry_number.localeCompare(a.entry_number));
  const numbers = [...new Set(matched.map(entry => entry.entry_number))];
  return numbers.length ? `${numbers[0]}${numbers.length > 1 ? ` +${numbers.length - 1}` : ''}` : undefined;
}
function installments(contract: ERPContract, data: StatementData, day: string) {
  // Schedule projection is the authoritative settlement/status logic; instruments are shown in receipts, not duplicated as tranches.
  return buildProjectedVaultItems([], data.schedules, [contract], data.properties, { referenceDate: day, isAr: true })
    .filter(item => item.contractId === contract.contract_id && item.linkedSchedule)
    .sort((a, b) => (a.trancheNumber ?? 0) - (b.trancheNumber ?? 0))
    .map(item => {
      const overdueDays = D(item.remainingAmount).gt(0) && item.dueDate < day
        ? Math.max(0, Math.floor((Date.parse(day) - Date.parse(item.dueDate)) / 86400000)) : 0;
      const status = item.status === 'cleared' ? 'مسدد' : overdueDays > 0 ? `متأخر ${overdueDays} يوم`
        : item.status === 'bounced' ? 'متعثر' : item.status === 'due_today' ? 'مستحق اليوم'
          : D(item.amountPaid).gt(0) ? 'مدفوع جزئياً' : 'قادم';
      return { label: item.isDownPayment ? 'المقدم' : `قسط ${item.trancheNumber}`, due: item.dueDate,
        amount: item.nominalValue, paid: item.amountPaid, remaining: item.remainingAmount, overdueDays, status,
        journal: references(data.journalEntries, [item.scheduleId!]) };
    });
}

export function buildClientStatement(contract: ERPContract, data: StatementData, issuedAt: Date) {
  const model = base('C', contract.contract_id, contract.buyer_name, issuedAt);
  const day = toLocalDateStr(issuedAt);
  const property = data.properties.find(p => belongs(contract, p));
  const unit = property?.building_units?.find(u => u.unit_id === contract.building_unit_id || u.unit_id === contract.unit_id);
  const installmentRows = installments(contract, data, day);
  const totals = { price: D(contract.gross_contract_value).toFixed(2), paid: D(contract.total_cash_collected).toFixed(2),
    remaining: D(contract.gross_contract_value).minus(contract.total_cash_collected).max(0).toFixed(2),
    overdue: sum(installmentRows.filter(row => row.overdueDays > 0).map(row => row.remaining)) };
  model.currency = contract.currency === 'USD' ? 'دولار أمريكي' : 'جنيه مصري';
  model.identity = [{ label: 'العميل', value: contract.buyer_name }, { label: 'الرقم القومي', value: mask(contract.buyer_national_id), numeric: true },
    { label: 'الهاتف', value: mask(contract.buyer_phone), numeric: true }, { label: 'رقم العقد', value: contract.contract_number, numeric: true },
    { label: 'الوحدة', value: [property?.title_ar, contract.building_unit_number || unit?.unit_number || contract.unit_id, unit?.area_sqm ? `${unit.area_sqm} م²` : undefined].filter(Boolean).join(' · ') },
    { label: 'تاريخ العقد', value: contract.contract_date, numeric: true },
    { label: 'نظام السداد', value: contract.payment_plan_type === 'INSTALLMENTS' ? 'أقساط' : contract.payment_plan_type === 'FULL_CASH' ? 'سداد نقدي' : contract.payment_plan_type === 'UPFRONT_HANDOVER' ? 'مقدم واستلام' : undefined },
    { label: 'حالة العقد', value: contract.status === 'Rescinded' ? 'مفسوخ' : contract.status === 'Completed' ? 'مكتمل' : 'ساري' }];
  model.summary = [{ label: 'سعر الوحدة', value: totals.price }, { label: 'إجمالي المسدد', value: totals.paid,
    details: D(totals.price).gt(0) ? [{ label: 'نسبة السداد', value: `${ratio(D(totals.paid).times(100), totals.price, 1)}%` }] : [] },
    { label: 'المتبقي', value: totals.remaining, details: [{ label: 'منه متأخر', value: totals.overdue, bad: true }] }];
  if (D(totals.overdue).gt(0)) model.callouts.push(`على العميل مبلغ متأخر ${contract.currency === 'EGP' ? D(totals.overdue).formatEGP(true) : `${D(totals.overdue).toFixed(2)} ${model.currency}`} من ${installmentRows.filter(row => row.overdueDays > 0).length} أقساط: ${installmentRows.filter(row => row.overdueDays > 0).map(row => `${row.label} متأخر ${row.overdueDays} يوماً`).join('، ')}.`);
  const relatedIds = [contract.contract_id, ...data.schedules.filter(s => s.contract_id === contract.contract_id).map(s => s.schedule_id),
    ...(data.pdcRecords || []).filter(p => p.contract_id === contract.contract_id).map(p => p.cheque_id)];
  const receiptRows = data.journalEntries.flatMap(entry => {
    const linked = relatedIds.includes(entry.source_entity_id || '') || entry.lines.some(line => line.contract_id === contract.contract_id);
    if (!linked || (entry.source_module !== 'SALES' && entry.source_module !== 'PDC')) return [];
    // Bank-transit transfers do not represent customer settlement. Require the actual receivable/advance credit.
    if (!entry.lines.some(line => ['203000', '103000', '103200', '104000'].includes(line.account_code) && D(line.credit_amount).gt(0))) return [];
    const cashLines = entry.lines.filter(line => ['101000', '102000'].includes(line.account_code) && D(line.debit_amount).gt(0));
    if (!cashLines.length) return [];
    const tranche = data.schedules.find(s => s.schedule_id === entry.source_entity_id);
    return [{ date: entry.entry_date, receipt: /^JE-(RCP|IP)-/.test(entry.entry_number) ? entry.entry_number.replace(/^JE-(RCP|IP)-/, '') : undefined,
      method: cashLines.map(line => line.account_code === '101000' ? 'نقدي' : entry.entry_number.startsWith('JE-IP-') ? 'إنستاباي' : 'بنك').join(' · '),
      allocation: tranche ? (tranche.tranche_number === 0 ? 'المقدم' : `قسط ${tranche.tranche_number}`) : undefined,
      amount: sum(cashLines.map(line => line.debit_amount)), journal: entry.entry_number }];
  }).sort((a, b) => a.date.localeCompare(b.date));
  model.tables = [{ title: 'جدول الأقساط', columns: [{ label: 'القسط' }, { label: 'تاريخ الاستحقاق', kind: 'number' }, money('القيمة'), money('مسدد'), money('متبقٍ'), { label: 'الحالة' }, ref],
    rows: installmentRows.map(row => ({ cells: [row.label, row.due, row.amount, row.paid, row.remaining, row.status, row.journal], overdue: row.overdueDays > 0 })),
    total: ['الإجمالي', undefined, sum(installmentRows.map(row => row.amount)), sum(installmentRows.map(row => row.paid)), sum(installmentRows.map(row => row.remaining))], empty: 'لا توجد أقساط مسجلة لهذا العقد.' },
  { title: 'إيصالات السداد', columns: [{ label: 'التاريخ', kind: 'number' }, { label: 'رقم الإيصال', kind: 'ref' }, { label: 'طريقة الدفع' }, { label: 'مخصوم من' }, money('المبلغ'), ref],
    rows: receiptRows.map(row => ({ cells: [row.date, row.receipt, row.method, row.allocation, row.amount, row.journal] })),
    total: ['الإجمالي', undefined, undefined, undefined, sum(receiptRows.map(row => row.amount))], empty: 'لا توجد إيصالات سداد مرتبطة بقيود في السجل الحالي.' }];
  model.signatures = ['المحاسب', 'اعتماد الإدارة', 'توقيع العميل بالاستلام'];
  model.footer = 'أي اعتراض على هذا الكشف يُقدَّم خلال 15 يوماً من تاريخ الإصدار.';
  return { ...model, totals, installmentRows, receiptRows };
}

export function buildPropertyStatement(property: Property, data: StatementData, issuedAt: Date) {
  const model = base('P', property.id, property.title_ar, issuedAt);
  const audit = calculatePropertyAuditMetrics(property.id, property.area_sqm, data.propertyCosts);
  const costRows = audit.propertyCosts.map(item => {
    const itemCode = item.item_id.slice(0, 8).toUpperCase();
    const adjustmentCodes = (item.adjustments || []).map(adj => `JE-WIP-ADJ-${adj.adjustment_id.slice(0, 8).toUpperCase()}`);
    const linked = data.journalEntries.filter(entry => entry.source_entity_id === property.id &&
      (entry.entry_number === `JE-WIP-${itemCode}` || entry.entry_number.startsWith(`JE-WIP-EDIT-${itemCode}-`) || adjustmentCodes.includes(entry.entry_number)));
    const ids = [item.item_id, ...(item.adjustments || []).map(adj => adj.journal_entry_id || adj.adjustment_id), ...linked.map(entry => entry.entry_id)];
    return { ...getConstructionSettlementOpeningBalance(item), item, journal: references(data.journalEntries, ids) };
  });
  const liveContracts = data.contracts.filter(c => belongs(c, property) && c.status !== 'Rescinded');
  // The ERP has no canonical mixed-currency statement conversion. Do not silently label foreign amounts as EGP.
  if (liveContracts.some(c => c.currency !== 'EGP')) throw new Error('لا يمكن تجميع عقود بعملات مختلفة في كشف عقار بالجنيه المصري');
  const salesRows = liveContracts.map(contract => {
    const client = buildClientStatement(contract, data, issuedAt);
    const unit = property.building_units?.find(u => u.unit_id === contract.building_unit_id || u.unit_id === contract.unit_id);
    return { contract, price: client.totals.price, collected: client.totals.paid, remaining: client.totals.remaining, overdue: client.totals.overdue,
      area: unit?.area_sqm === undefined ? undefined : String(unit.area_sqm),
      journal: references(data.journalEntries, [contract.contract_id, ...data.schedules.filter(s => s.contract_id === contract.contract_id).map(s => s.schedule_id)], contract.contract_id) };
  });
  const showArea = salesRows.some(row => row.area !== undefined);
  const showContractor = costRows.some(row => row.item.supplier_contractor?.trim());
  const capital = (data.partnerCommitments || []).filter(c => c.property_id === property.id && c.status !== 'CANCELLED');
  const debt = capital.map(c => evaluatePartnerCommitment(c, toLocalDateStr(issuedAt)).unpaidBalance.toFixed(2));
  const totals = { netCost: audit.totalLoggedCost, costPaid: sum(costRows.map(row => row.paidAmount)), costOwed: sum(costRows.map(row => row.remainingAmount)),
    sales: sum(salesRows.map(row => row.price)), collected: sum(salesRows.map(row => row.collected)), remaining: sum(salesRows.map(row => row.remaining)),
    capital: sum(capital.map(c => c.committed_amount)), capitalPaid: sum(capital.map(c => c.paid_amount)), capitalDebt: sum(debt) };
  model.identity = [{ label: 'العقار', value: property.title_ar }, { label: 'العنوان', value: property.location },
    { label: 'الحالة', value: property.completion_status === 'ready' ? 'جاهز' : property.construction_completed_at ? 'تحت الإنشاء — اكتمل البناء' : 'تحت الإنشاء' },
    { label: 'الوحدات', value: property.building_units?.length ? `${property.building_units.length} وحدات` : property.total_units_count ? `${property.total_units_count} وحدات` : undefined },
    { label: 'الشركاء', value: normalizePropertySplits(property).filter(s => !s.is_archived).map(s => `${s.partner_name} ${resolvePartnerSharePct(property, s.partner_name)}%`).join(' · ') },
    { label: 'كود العقار', value: property.id.slice(0, 8), numeric: true }, { label: 'العملة', value: model.currency }];
  model.summary = [{ label: 'إجمالي التكلفة الصافية', value: totals.netCost, details: [{ label: 'مدفوع للمقاولين', value: totals.costPaid }, { label: 'مستحق للمقاولين', value: totals.costOwed, bad: true }] },
    { label: 'إجمالي المبيعات المتعاقد عليها', value: totals.sales, details: [{ label: 'محصّل من العملاء', value: totals.collected }, { label: 'متبقٍ على العملاء', value: totals.remaining }] },
    { label: 'رأس مال الشركاء', value: totals.capital, details: [{ label: 'مسدد', value: totals.capitalPaid }, { label: 'مديونية على الشركاء', value: totals.capitalDebt, bad: true }] }];
  // There is no construction-start timestamp in Property. Identify the recorded cost event explicitly.
  const firstConstructionCost = audit.propertyCosts.filter(item => item.phase !== 'planning_permits' && item.logged_date)
    .map(item => normalizeDateStr(item.logged_date)).sort()[0];
  const firstSale = liveContracts.map(c => c.contract_date).filter(Boolean).sort()[0];
  const completed = property.construction_completed_at ? normalizeDateStr(property.construction_completed_at) : undefined;
  const finalized = property.price_finalized_at ? normalizeDateStr(property.price_finalized_at) : undefined;
  model.timeline = [{ label: 'الإنشاء', date: normalizeDateStr(property.created_at) },
    { label: 'بدء البناء', date: firstConstructionCost, note: firstConstructionCost ? 'أول تكلفة تنفيذ مسجلة' : 'لا يوجد تاريخ مسجل', future: !firstConstructionCost },
    { label: 'أول عقد بيع', date: firstSale, future: !firstSale },
    { label: 'اكتمال البناء والتسعير النهائي', date: completed && finalized && completed !== finalized ? `${completed} · ${finalized}` : completed || finalized,
      note: completed && !finalized ? 'التسعير النهائي لم يسجل' : finalized && !completed ? 'اكتمال البناء لم يسجل' : undefined, future: !completed || !finalized },
    { label: 'التوزيع على الشركاء', note: 'عند البيع والتحصيل الكامل', future: true }];
  model.tables = [{ title: 'بنود التكلفة', note: 'صافي = الأصل + الإضافات − المرتجعات',
    columns: [{ label: 'البند' }, ...(showContractor ? [{ label: 'المقاول' }] : []), money('الأصل'), money('تعديلات'), money('الصافي'), money('مدفوع'), money('متبقٍ'), { label: 'الحالة' }, ref],
    rows: costRows.map(row => ({ cells: [row.item.item_name_ar, ...(showContractor ? [row.item.supplier_contractor] : []), row.baseCost, row.netAdjustments, row.netEffectiveCost, row.paidAmount, row.remainingAmount,
      D(row.remainingAmount).isZero() ? 'مسدد' : D(row.paidAmount).gt(0) ? 'مدفوع جزئياً' : 'غير مسدد', row.journal] })),
    total: ['الإجمالي', ...(showContractor ? [undefined] : []), sum(costRows.map(row => row.baseCost)), sum(costRows.map(row => row.netAdjustments)), totals.netCost, totals.costPaid, totals.costOwed], empty: 'لا توجد بنود تكلفة مسجلة.' },
    { title: 'المبيعات والتحصيل', columns: [{ label: 'الوحدة', nowrap: true, width: 6 }, { label: 'العميل', nowrap: true, width: 14 }, { label: 'رقم العقد', kind: 'ref', nowrap: true, width: 13 }, ...(showArea ? [{ label: 'م²', kind: 'number' as const, width: 5 }] : []),
      ...['السعر', 'محصّل', 'متبقٍ', 'متأخر'].map(label => ({ ...money(label), width: showArea ? 10 : 11.25 })), { ...ref, nowrap: true, width: 22 }],
      rows: salesRows.map(row => ({ cells: [row.contract.building_unit_number || row.contract.unit_id, row.contract.buyer_name, row.contract.contract_number, ...(showArea ? [row.area] : []), row.price, row.collected, row.remaining, row.overdue, row.journal], overdue: D(row.overdue).gt(0) })),
      total: [`الإجمالي (${salesRows.length} عقود)`, undefined, undefined, ...(showArea ? [undefined] : []), totals.sales, totals.collected, totals.remaining, sum(salesRows.map(row => row.overdue))], empty: 'لا توجد عقود بيع سارية.' }];
  const unitIds = new Set([property.id, ...(property.building_units || []).map(u => u.unit_id)]);
  const costIds = new Set(audit.propertyCosts.flatMap(c => [c.item_id, c.id || '', ...(c.adjustments || []).map(a => a.adjustment_id)]).filter(Boolean));
  const contractIds = new Set(data.contracts.filter(c => belongs(c, property)).map(c => c.contract_id));
  const scheduleIds = new Set(data.schedules.filter(s => contractIds.has(s.contract_id)).map(s => s.schedule_id));
  const scopedLines = data.journalEntries.flatMap(entry => {
    const entryScoped = entry.source_entity_id === property.id || costIds.has(entry.source_entity_id || '') || contractIds.has(entry.source_entity_id || '') || scheduleIds.has(entry.source_entity_id || '');
    return entry.lines.filter(line => line.contract_id ? contractIds.has(line.contract_id) : entryScoped || Boolean(line.unit_id && unitIds.has(line.unit_id)));
  });
  // Only balances with actual property attribution can be compared. WIP is remaining inventory after handover, so omit its lifetime-cost comparison after any delivery.
  const comparisons = [
    { label: 'أعمال تحت التنفيذ (WIP)', accounts: [...CANONICAL_WIP_ACCOUNTS], subledger: totals.netCost, credit: false, allowed: !data.contracts.some(c => belongs(c, property) && c.handover_status === 'Delivered') },
    { label: 'دائنون — مقاولون 201000', accounts: ['201000'], subledger: totals.costOwed, credit: true, allowed: audit.propertyCosts.every(c => c.linked_account_code) },
    { label: 'عملاء — أقساط مستحقة', accounts: ['103000'], subledger: sum(salesRows.filter(row => row.contract.handover_status === 'Delivered').map(row => row.remaining)), credit: false, allowed: liveContracts.some(c => c.handover_status === 'Delivered') && !data.contracts.some(c => belongs(c, property) && c.status === 'Rescinded') },
  ];
  model.reconciliation = comparisons.flatMap(comparison => {
    const lines = scopedLines.filter(line => comparison.accounts.includes(line.account_code));
    if (!comparison.allowed || !lines.length) return [];
    const ledger = sum(lines.map(line => comparison.credit ? D(line.credit_amount).minus(line.debit_amount).toFixed(2) : D(line.debit_amount).minus(line.credit_amount).toFixed(2)));
    return [{ label: comparison.label, ledger, subledger: comparison.subledger, difference: D(ledger).minus(comparison.subledger).toFixed(2) }];
  });
  model.signatures = ['المحاسب', 'المدير المالي', 'اعتماد الإدارة'];
  model.footer = 'الأرقام بالجنيه المصري. كل مبلغ له قيد يومية بالرقم المرجعي في النظام.';
  return { ...model, totals, costRows, salesRows };
}

export function buildPartnerStatement(partner: Pick<ERPPartnerProfile, 'name' | 'national_id' | 'phone'> & { id?: string }, data: StatementData, issuedAt: Date) {
  // Split-only partners are keyed by name in the existing ERP, not by a fabricated profile UUID.
  const model = base('R', partner.id || partner.name, partner.name, issuedAt);
  const transactions = (data.partnerTransactions || []).filter(t => isSamePartner(t.partner_name, partner.name) && t.status === 'COMPLETED');
  const commitments = (data.partnerCommitments || []).filter(c => isSamePartner(c.partner_name, partner.name) && c.status !== 'CANCELLED');
  const projectRows = data.properties.filter(p => resolvePartnerSharePct(p, partner.name) > 0 || commitments.some(c => c.property_id === p.id) || transactions.some(t => t.property_id === p.id))
    .map(property => {
      const projectContracts = data.contracts.filter(c => belongs(c, property));
      if (projectContracts.some(c => c.currency !== 'EGP' && c.status !== 'Rescinded')) throw new Error('لا يمكن تجميع عقود بعملات مختلفة في كشف شريك بالجنيه المصري');
      const position = computeProjectPayoutPosition({ partnerName: partner.name, property,
        contracts: projectContracts.map(c => ({ ...c, property_id: property.id })), transactions, commitments });
      const projectCommitments = commitments.filter(c => c.property_id === property.id);
      const sharePct = resolvePartnerSharePct(property, partner.name);
      const ids = [property.id, ...projectContracts.map(c => c.contract_id), ...data.schedules.filter(s => projectContracts.some(c => c.contract_id === s.contract_id)).map(s => s.schedule_id)];
      const journal = [...new Set([references(data.journalEntries, ids), ...transactions.filter(t => t.property_id === property.id).map(t => t.journal_entry_number)].filter(Boolean))].join(' · ') || undefined;
      return { ...position, property, sharePct: String(sharePct), journal,
        costShare: D(calculatePropertyAuditMetrics(property.id, property.area_sqm, data.propertyCosts).totalLoggedCost).timesRatio(sharePct, 100).toFixed(2),
        committed: sum(projectCommitments.map(c => c.committed_amount)), capitalPaid: sum(projectCommitments.map(c => c.paid_amount)) };
    });
  const positionTotal = (key: keyof Pick<ProjectPayoutPosition, 'collectionsShare' | 'paidOut' | 'commitmentDebt' | 'cashAvailable'>) => sum(projectRows.map(row => row[key]));
  const totals = { collectionsShare: positionTotal('collectionsShare'), paidOut: positionTotal('paidOut'), commitmentDebt: positionTotal('commitmentDebt'), cashAvailable: positionTotal('cashAvailable') };
  model.identity = [{ label: 'الشريك', value: partner.name }, { label: 'الرقم القومي', value: mask(partner.national_id), numeric: true },
    { label: 'الهاتف', value: mask(partner.phone), numeric: true }, { label: 'المشروعات', value: projectRows.map(row => row.property.title_ar).join(' · ') },
    { label: 'كود الشريك', value: partner.id?.slice(0, 8), numeric: true }];
  const open = commitments.map(c => evaluatePartnerCommitment(c, toLocalDateStr(issuedAt))).filter(c => c.unpaidBalance.gt(0) && c.effectiveStatus !== 'PAID');
  model.tables = [{ title: 'الموقف حسب المشروع', columns: [{ label: 'المشروع' }, { label: 'النسبة', kind: 'number' }, money('نصيبه من التكلفة'), money('رأس مال ملتزم'), money('مسدد'), money('مديونية'), money('نصيبه من التحصيل'), money('صُرف له'), money('متاح للصرف'), ref],
    rows: projectRows.map(row => ({ cells: [row.property.title_ar, `${row.sharePct}%`, row.costShare, row.committed, row.capitalPaid, row.commitmentDebt, row.collectionsShare, row.paidOut, row.cashAvailable, row.journal] })),
    total: ['الإجمالي', undefined, sum(projectRows.map(row => row.costShare)), sum(projectRows.map(row => row.committed)), sum(projectRows.map(row => row.capitalPaid)), totals.commitmentDebt, totals.collectionsShare, totals.paidOut, totals.cashAvailable], empty: 'لا توجد مشروعات مرتبطة بهذا الشريك.' },
    { title: 'حركة الحساب', columns: [{ label: 'التاريخ', kind: 'number' }, { label: 'المرجع', kind: 'ref' }, { label: 'المشروع' }, { label: 'البيان' }, money('دفعه الشريك'), money('صُرف للشريك'), ref],
      rows: [...transactions].sort((a, b) => a.date.localeCompare(b.date)).map(t => ({ cells: [t.date, t.transaction_number, data.properties.find(p => p.id === t.property_id)?.title_ar,
        `${t.type === 'CAPITAL_INJECTION' ? 'دفعة رأس مال' : t.type === 'CAPITAL_RETURN' ? 'رد رأس مال' : 'صرف أرباح'} — ${t.payment_method === 'DEBT_OFFSET' ? 'خصم من الأرباح' : t.payment_method === 'CASH_101000' ? 'نقدي' : t.payment_method === 'INSTAPAY_102000' ? 'إنستاباي' : 'بنك'}`,
        t.type === 'CAPITAL_INJECTION' ? t.amount : undefined, t.type !== 'CAPITAL_INJECTION' ? t.amount : undefined, t.journal_entry_number] })),
      total: ['الإجمالي', undefined, undefined, undefined, sum(transactions.filter(t => t.type === 'CAPITAL_INJECTION').map(t => t.amount)), sum(transactions.filter(t => t.type !== 'CAPITAL_INJECTION').map(t => t.amount))], empty: 'لا توجد حركات مالية مسجلة.' },
    { title: 'التزامات رأس المال المفتوحة', columns: [{ label: 'المشروع' }, { label: 'تاريخ الاستحقاق', kind: 'number' }, money('الملتزم'), money('المسدد'), money('المتبقي'), { label: 'الحالة' }, ref],
      rows: open.map(row => ({ cells: [data.properties.find(p => p.id === row.commitment.property_id)?.title_ar, row.commitment.due_date,
        row.committedAmount.toFixed(2), row.paidAmount.toFixed(2), row.unpaidBalance.toFixed(2), row.isOverdue ? `متأخر ${row.daysOverdue} يوم` : 'مستحق',
        transactions.filter(t => t.commitment_id === row.commitment.commitment_id).map(t => t.journal_entry_number).filter(Boolean).join(' · ') || undefined], overdue: row.isOverdue })), empty: 'لا توجد التزامات رأس مال مفتوحة.' }];
  model.callouts = projectRows.map(row => `متاح للصرف في ${row.property.title_ar} = نصيبه من التحصيل ${D(row.collectionsShare).formatEGP(true)} − ما صُرف له ${D(row.paidOut).formatEGP(true)} − مديونية رأس المال ${D(row.commitmentDebt).formatEGP(true)}. المتاح نقداً ${D(row.cashAvailable).formatEGP(true)}. عند الصرف تُخصم المديونية أولاً تلقائياً.${D(row.debtAfter).gt(0) ? ` المديونية بعد الخصم ${D(row.debtAfter).formatEGP(true)}.` : ''}`);
  model.signatures = ['المحاسب', 'اعتماد الإدارة', 'توقيع الشريك بالاستلام'];
  model.footer = 'نصيب التحصيل محسوب من المبالغ المحصلة فعلياً، وليس من قيمة العقود.';
  return { ...model, totals, projectRows };
}
