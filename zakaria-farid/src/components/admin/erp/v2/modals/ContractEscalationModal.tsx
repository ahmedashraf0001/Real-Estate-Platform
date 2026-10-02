'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Search,
  Check
} from 'lucide-react';
import { ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';

export interface ContractEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  onConfirmEscalation: (deltaAmount: string, reason: string, targetContract?: ERPContract) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const ContractEscalationModal: React.FC<ContractEscalationModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  onConfirmEscalation,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [escalationSuccess, setEscalationSuccess] = useState<{
    oldGross: string;
    newGross: string;
    delta: string;
    reason: string;
    contractNumber: string;
  } | null>(null);

  // Auto-initialize selected contract
  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setDelta('');
      setReason('');
      setError('');
      setSearchQuery('');
      setEscalationSuccess(null);
    } else {
      setEscalationSuccess(null);
    }
  }, [isOpen, contract, contracts]);

  // Determine active contract
  const activeContract = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.find(c => c.contract_id === selectedContractId) || contract || contracts[0];
    }
    return contract;
  }, [contracts, selectedContractId, contract]);

  // Master list of contracts
  const contractList = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return contract ? [contract] : [];
  }, [contracts, contract]);

  const filteredContracts = useMemo(() => {
    return contractList.filter(c => {
      if (statusFilter === 'active' && c.handover_status === 'Delivered') return false;
      if (statusFilter === 'delivered' && c.handover_status !== 'Delivered') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.buyer_name || '').toLowerCase().includes(q);
        const matchNo = (c.contract_number || '').toLowerCase().includes(q);
        const matchUnit = (c.unit_id || '').toLowerCase().includes(q);
        return matchName || matchNo || matchUnit;
      }
      return true;
    });
  }, [contractList, statusFilter, searchQuery]);

  if (!isOpen || !activeContract) return null;

  const currentGross = D(activeContract.gross_contract_value || '0');
  const deltaD = D(delta || '0');
  const newGross = currentGross.plus(deltaD);
  const totalPaid = D(activeContract.total_cash_collected || '0');
  const remainingBal = currentGross.minus(totalPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delta || deltaD.lte(0)) {
      setError(isAr ? 'يرجى إدخال قيمة زيادة صالحة أكبر من الصفر' : 'Please enter a valid escalation amount');
      return;
    }
    if (!reason.trim()) {
      setError(isAr ? 'يرجى كتابة المبرر الهندسي أو السعري للتعديل' : 'Please provide the escalation rationale');
      return;
    }

    try {
      await onConfirmEscalation(delta.trim(), reason.trim(), activeContract);
      setEscalationSuccess({
        oldGross: currentGross.toFixed(2),
        newGross: newGross.toFixed(2),
        delta: delta.trim(),
        reason: reason.trim(),
        contractNumber: activeContract.contract_number
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const resetForAnother = () => {
    setEscalationSuccess(null);
    setDelta('');
    setReason('');
    setError('');
  };

  const buyerLabel = (name: string) => (name ? (isAr ? localizeBuyerName(name) : name) : (isAr ? 'العميل غير مُدخل' : 'Client not entered'));

  const statusFilters: { id: 'all' | 'active' | 'delivered'; labelAr: string; labelEn: string; count: number }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', count: contractList.length },
    { id: 'active', labelAr: 'ساري', labelEn: 'Active', count: contractList.filter(c => c.handover_status !== 'Delivered').length },
    { id: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered', count: contractList.filter(c => c.handover_status === 'Delivered').length },
  ];

  const handleModalClose = () => {
    setEscalationSuccess(null);
    onClose();
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'تعديل قيمة العقد (ملحق تعاقدي)' : 'Contract Value Escalation (Addendum)'}
      subtitle={isAr
        ? 'إثبات الزيادة السعرية أو فروق التشطيب وتعديل القيمة الإجمالية مع قيد تسوية للإيراد المؤجل (202000)'
        : 'Record contract price adjustments and reschedule pending installments without affecting paid dues'}
      icon={<TrendingUp size={16} />}
      isAr={isAr}
      maxWidth="1080px"
      maxHeight="min(820px, 94vh)"
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        escalationSuccess ? (
          <>
            <button type="button" className={p.primaryButton} onClick={handleModalClose}>
              <Check size={14} />
              <span>{isAr ? 'تم / إغلاق النافذة' : 'Done / Close'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={resetForAnother}>
              {isAr ? 'تعديل عقد آخر' : 'Adjust Another Contract'}
            </button>
          </>
        ) : (
          <>
            <button type="submit" form="contract-escalation-form" className={p.primaryButton} disabled={isMutating}>
              {isMutating ? <Loader2 size={14} className={p.spin} /> : <TrendingUp size={14} />}
              <span>{isAr ? 'اعتماد التعديل والإصدار الثاني' : 'Commit & Save v2'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={handleModalClose} disabled={isMutating}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </>
        )
      }
    >
      <div className={p.split}>
        {/* Contracts list */}
        <aside className={p.listPane}>
          <div className={p.listHeader}>
            <div className={p.searchWrap}>
              <Search size={14} className={p.searchIcon} aria-hidden />
              <input
                type="text"
                className={p.input}
                placeholder={isAr ? 'بحث بالعميل، كود العقد، أو الوحدة...' : 'Search client, contract or unit...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={isAr ? 'بحث في العقود' : 'Search contracts'}
              />
            </div>
            <div className={`${p.segmented} ${p.segmentedFull}`} role="tablist">
              {statusFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={statusFilter === f.id ? `${p.segment} ${p.segmentActive}` : p.segment}
                >
                  <span>{isAr ? f.labelAr : f.labelEn}</span>
                  <span className={p.segmentCount}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={p.listBody}>
            {filteredContracts.length === 0 ? (
              <div className={p.emptyState}>
                <Search size={28} className={p.emptyStateIcon} aria-hidden />
                <span>{isAr ? 'لا توجد عقود مطابقة للبحث' : 'No matching contracts found'}</span>
              </div>
            ) : (
              filteredContracts.map((c) => {
                const isSelected = c.contract_id === activeContract.contract_id;
                const delivered = c.handover_status === 'Delivered';
                return (
                  <button
                    key={c.contract_id}
                    type="button"
                    onClick={() => setSelectedContractId(c.contract_id)}
                    aria-pressed={isSelected}
                    className={isSelected ? `${p.listItem} ${p.listItemSelected}` : p.listItem}
                  >
                    <span className={p.listItemTop}>
                      <bdi className={p.listItemTitle}>{buyerLabel(c.buyer_name)}</bdi>
                      <span className={delivered ? `${p.pill} ${p.pillMuted}` : `${p.pill} ${p.pillSuccess}`}>
                        {delivered ? (isAr ? 'تم التسليم' : 'Delivered') : (isAr ? 'ساري' : 'Active')}
                      </span>
                    </span>
                    <span className={p.listItemMeta}>
                      <bdi>{c.unit_id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered')} · #{c.contract_number}</bdi>
                      <bdi className={p.listItemAmount}>{D(c.gross_contract_value || '0').formatEGP(isAr)}</bdi>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className={p.detailPane}>
          {escalationSuccess ? (
            <div>
              <section className={p.section}>
                <div className={`${p.notice} ${p.noticeSuccess}`} role="status">
                  <Check size={16} className={p.noticeIconSuccess} />
                  <div>
                    <p className={p.noticeTitle}>
                      {isAr ? 'تم اعتماد زيادة القيمة وتحديث جدول الأقساط المتبقية' : 'Contract Escalation Successfully Applied'}
                    </p>
                    <p className={p.noticeBody}>
                      <bdi>
                        {isAr
                          ? `عقد رقم ${escalationSuccess.contractNumber} · السبب: ${escalationSuccess.reason}`
                          : `Contract #${escalationSuccess.contractNumber} · Reason: ${escalationSuccess.reason}`}
                      </bdi>
                    </p>
                  </div>
                </div>
              </section>
              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'مقارنة القيمة' : 'Escalation Value Breakdown'}</h4>
                <div className={`${p.figureGrid} ${p.figureGrid3}`}>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'قيمة العقد الأصلية' : 'Original Contract Value'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{D(escalationSuccess.oldGross).formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'الزيادة المعتمدة' : 'Escalation Added'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>+{D(escalationSuccess.delta).formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'إجمالي العقد الجديد' : 'New Gross Value'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm} ${p.figureValueSuccess}`}>{D(escalationSuccess.newGross).formatEGP(isAr)}</bdi>
                  </div>
                </div>
                <p className={p.hint}>
                  {isAr
                    ? 'وُزّع فرق الزيادة على الأقساط غير المسددة مع استيعاب كسور التقريب في الدفعة الأخيرة طبقاً للائحة §4.9.'
                    : 'Escalation spread evenly across pending tranches with the rounding remainder absorbed into the final tranche per §4.9.'}
                </p>
              </section>
            </div>
          ) : (
            <form id="contract-escalation-form" onSubmit={handleSubmit}>
              {error && (
                <section className={p.section}>
                  <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                    <AlertCircle size={16} className={p.noticeIconDanger} />
                    <p className={p.noticeBody}>{error}</p>
                  </div>
                </section>
              )}

              <section className={p.section}>
                <p className={p.metaLine}>
                  <bdi className={p.metaLineStrong}>{buyerLabel(activeContract.buyer_name)}</bdi>
                  <span className={p.metaDot}>·</span>
                  <bdi>{activeContract.unit_id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered')}</bdi>
                  <span className={p.metaDot}>·</span>
                  <bdi className={p.numeric}>#{activeContract.contract_number}</bdi>
                </p>
                <div className={`${p.figureGrid} ${p.figureGrid3}`}>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'القيمة التعاقدية الحالية' : 'Current Gross Value'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{currentGross.formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'المحصل بالخزينة' : 'Cash Collected'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm} ${p.figureValueSuccess}`}>{totalPaid.formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'المتبقي أقساط مستحقة' : 'Outstanding Dues'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{remainingBal.formatEGP(isAr)}</bdi>
                  </div>
                </div>
              </section>

              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'بيانات التعديل' : 'Escalation Details'}</h4>
                <div className={p.fieldGrid}>
                  <div className={`${p.field} ${p.fieldFull}`}>
                    <label className={p.label} htmlFor="esc-delta">{isAr ? 'قيمة الزيادة المعتمدة للعقد *' : 'Escalation Amount *'}</label>
                    <div className={p.affixWrap}>
                      <input
                        id="esc-delta"
                        type="number"
                        step="1000"
                        required
                        value={delta}
                        onChange={e => setDelta(e.target.value)}
                        placeholder={isAr ? 'مثال: 500000' : 'e.g. 500000'}
                        className={`${p.input} ${p.inputLarge} ${p.numeric}`}
                      />
                      <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>
                  <div className={`${p.field} ${p.fieldFull}`}>
                    <label className={p.label} htmlFor="esc-reason">{isAr ? 'مبرر التعديل الهندسي / السعري *' : 'Engineering / Material Rationale *'}</label>
                    <input
                      id="esc-reason"
                      type="text"
                      required
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={isAr ? 'مثال: تعديل مواصفات التشطيب وتعديلات معمارية' : 'e.g. Finishing specs upgrade and layout modifications'}
                      className={p.input}
                    />
                  </div>
                </div>
              </section>

              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'الأثر على العقد' : 'Impact Preview'}</h4>
                <div className={p.compare}>
                  <div className={p.compareItem}>
                    <span className={p.compareLabel}>{isAr ? 'القيمة الحالية' : 'Current Value'}</span>
                    <bdi className={p.compareValue}>{currentGross.formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.compareItem}>
                    <span className={p.compareLabel}>{isAr ? 'الزيادة الصافية' : 'Net Delta'}</span>
                    <bdi className={p.compareValue}>+{(deltaD.gt(0) ? deltaD : D(0)).formatEGP(isAr)}</bdi>
                  </div>
                  <div className={p.compareItem}>
                    <span className={p.compareLabel}>{isAr ? 'القيمة الجديدة' : 'New Gross Value'}</span>
                    <bdi className={p.compareValueStrong}>{(deltaD.gt(0) ? newGross : currentGross).formatEGP(isAr)}</bdi>
                  </div>
                </div>
                <div className={p.notice}>
                  <ShieldCheck size={16} className={p.noticeIconAccent} />
                  <p className={p.noticeBody}>
                    {isAr
                      ? 'يُرحَّل قيد تسوية للإيراد المؤجل (202000) ويُعاد جدولة الأقساط المتبقية فقط. التعديل لا يحذف النسخة السابقة بل يُسجَّل كملحق تعاقدي (الإصدار الثاني) متاح للمراجعة.'
                      : 'An adjusting entry posts to deferred revenue (202000) and only pending installments are rescheduled. The change is recorded as an append-only v2 amendment; the previous version is kept for audit.'}
                  </p>
                </div>
              </section>
            </form>
          )}
        </div>
      </div>
    </ZFModalShell>
  );
};
