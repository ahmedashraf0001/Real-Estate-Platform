import { D, generateUUID } from './math';
import { calculateCostItemEffectiveTotals } from './propertyCostEngine';
import { getConstructionSettlementOpeningBalance } from './canonicalMetrics';
import { GeneralLedgerEngine } from './ledger';
import type { ERPAccountingPeriod, ERPJournalEntry, ERPPropertyCostItem } from './types';

export function prepareConstructionSettlement(original: ERPPropertyCostItem, updated: ERPPropertyCostItem, period: ERPAccountingPeriod) {
  if (original.linked_account_code !== '201000') throw new Error('This cost has no recognized payable source in account 201000.');
  const before = getConstructionSettlementOpeningBalance(original);
  const after = calculateCostItemEffectiveTotals(updated);
  const amount = D(after.paidAmount).minus(before.paidAmount);
  if (!amount.gt(0) || amount.gt(before.remainingAmount)) throw new Error('Payment must be positive and cannot exceed the remaining liability.');
  const changed = updated.payable_installments?.filter(inst => D(inst.paid_amount_egp).gt(original.payable_installments?.find(prior => prior.installment_id === inst.installment_id)?.paid_amount_egp || 0) && !inst.installment_id.startsWith('inst-prior-'));
  if (changed?.length !== 1) throw new Error('Settle one installment at a time.');
  const installment = changed[0];
  const rawMethod = installment.payment_method;
  const isCash = rawMethod === 'CASH_101000';
  const isInstaPay = rawMethod === 'INSTAPAY_102000' || rawMethod === 'INSTAPAY_101000';
  if (!isCash && !isInstaPay) throw new Error('Only Cash (101000) and InstaPay (102000) are supported.');
  const method: 'CASH_101000' | 'INSTAPAY_102000' = isCash ? 'CASH_101000' : 'INSTAPAY_102000';
  const account: '101000' | '102000' = isCash ? '101000' : '102000';
  const paymentDate = installment.payment_date || new Date().toISOString().slice(0, 10);
  if (period.status !== 'OPEN' || paymentDate < period.start_date || paymentDate > period.end_date) throw new Error('Payment date must fall in an open accounting period.');
  const priorPaymentId = original.payable_installments?.find(inst => inst.installment_id === installment.installment_id)?.payment_id;
  const paymentId = installment.payment_id && installment.payment_id !== priorPaymentId ? installment.payment_id : generateUUID();
  const memo = `${method === 'INSTAPAY_102000' ? 'إنستاباي' : 'كاش بالخزينة'} • ${original.supplier_contractor || original.item_name_ar} • ${account === '102000' ? 'إنستاباي 102000' : 'الخزينة 101000'}`;
  const journal: ERPJournalEntry = GeneralLedgerEngine.validateAndCreateEntry({
    entry_number: `AP-${paymentId}`, entry_date: paymentDate, period,
    description: memo, source_module: 'CONSTRUCTION_SETTLEMENT', source_entity_id: original.item_id, created_by: 'FIN_OS',
    lines: [
      { account_code: '201000', debit_amount: amount.toFixed(2), credit_amount: '0.00', memo },
      { account_code: account, debit_amount: '0.00', credit_amount: amount.toFixed(2), memo }
    ]
  });
  journal.entry_id = paymentId;
  return {
    request: { p_item_id: original.item_id, p_installment_id: installment.installment_id, p_amount: amount.toFixed(2), p_method: method, p_payment_date: paymentDate, p_period_id: period.period_id, p_payment_id: paymentId, p_expected_paid: before.paidAmount, p_notes: installment.notes || '' },
    journal,
    updatedItem: { ...updated, payable_installments: updated.payable_installments?.map(inst => inst.installment_id === installment.installment_id ? { ...inst, payment_method: method, treasury_account_code: account, payment_id: paymentId } : inst) }
  };
}
