'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Building2,
  Undo2
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPAccountingPeriod } from '@/lib/erp/types';
import { RescissionEngine } from '@/lib/erp/rescission';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { D } from '@/lib/erp/math';
import { JournalEntryPreview, localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

export interface RescissionSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  contracts?: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  onConfirmRescission: (details: {
    selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
    targetContract?: ERPContract;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RescissionSettlementModal: React.FC<RescissionSettlementModalProps> = ({
  isOpen,
  onClose,
  contract,
  contracts = [],
  schedules,
  activePeriod,
  periods,
  onConfirmRescission,
  isMutating = false,
  isAr = true
}) => {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<'Branch1_PreDelivery' | 'Branch2_PostDelivery'>('Branch1_PreDelivery');
  const [rescissionDate, setRescissionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rescissionSuccess, setRescissionSuccess] = useState<{
    contractNumber: string;
    buyer: string;
    unitId: string;
    penaltyRetained: string;
    netRefundLiability: string;
    totalCashCollected: string;
    grossContractValue: string;
    branch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
    rescissionDate: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (contract && contract.contract_id) {
        setSelectedContractId(contract.contract_id);
      } else if (contracts.length > 0 && (!selectedContractId || !contracts.some(c => c.contract_id === selectedContractId))) {
        setSelectedContractId(contracts[0].contract_id);
      }
      setSelectedBranch('Branch1_PreDelivery');
      setRescissionDate(new Date().toISOString().split('T')[0]);
      setSearchQuery('');
      setRescissionSuccess(null);
    }
  }, [isOpen, contract, contracts]);

  // Master list of contracts eligible for rescission (non-rescinded)
  const contractList = useMemo(() => {
    if (contracts.length > 0) return contracts;
    return contract ? [contract] : [];
  }, [contracts, contract]);

  const filteredContracts = useMemo(() => {
    return contractList.filter(c => {
      if (c.status === 'Rescinded') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (c.buyer_name || '').toLowerCase().includes(q);
        const matchNo = (c.contract_number || '').toLowerCase().includes(q);
        const matchUnit = (c.unit_id || '').toLowerCase().includes(q);
        return matchName || matchNo || matchUnit;
      }
      return true;
    });
  }, [contractList, searchQuery]);

  // Active contract resolution
  const activeContract = useMemo(() => {
    if (contracts.length > 0) {
      return contracts.find(c => c.contract_id === selectedContractId) || contract || contracts[0];
    }
    return contract;
  }, [contracts, selectedContractId, contract]);

  // Contract schedules for this active contract
  const contractSchedules = useMemo(() => {
    if (!activeContract) return [];
    return schedules.filter(s => s.contract_id === activeContract.contract_id);
  }, [schedules, activeContract]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(rescissionDate, periods || [activePeriod], activePeriod);
  }, [rescissionDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod.status !== 'OPEN';

  // Compute rescission metrics
  const computed = useMemo(() => {
    if (!activeContract || !targetPeriod) return null;
    try {
      const calculationPeriod: ERPAccountingPeriod = targetPeriod.status === 'OPEN'
        ? targetPeriod
        : { ...targetPeriod, status: 'OPEN' };
      return RescissionEngine.processRescission(
        activeContract,
        contractSchedules,
        calculationPeriod,
        rescissionDate,
        D(activeContract.gross_contract_value).times('0.45').toFixed(),
        '501000',
        '151000',
        'CFO_FARID'
      );
    } catch (err) {
      console.warn('Rescission preview computation error:', err);
      return null;
    }
  }, [activeContract, contractSchedules, targetPeriod, rescissionDate]);

  if (!isOpen || !activeContract || !computed) return null;

  const preview = {
    grossContractValue: computed.rescissionRecord.gross_contract_value,
    totalCashCollected: computed.rescissionRecord.total_cash_collected,
    penaltyRetained: computed.rescissionRecord.penalty_retained,
    netRefundLiability: computed.rescissionRecord.net_refund_liability,
    journalEntry: computed.journalEntry
  };

  const handleSubmit = async () => {
    await onConfirmRescission({
      selectedBranch,
      rescissionDate,
      targetContract: activeContract
    });
    setRescissionSuccess({
      contractNumber: activeContract.contract_number,
      buyer: activeContract.buyer_name,
      unitId: activeContract.unit_id,
      penaltyRetained: computed.rescissionRecord.penalty_retained,
      netRefundLiability: computed.rescissionRecord.net_refund_liability,
      totalCashCollected: computed.rescissionRecord.total_cash_collected,
      grossContractValue: computed.rescissionRecord.gross_contract_value,
      branch: selectedBranch,
      rescissionDate
    });
  };

  const buyerLabel = (name: string) => (name ? (isAr ? localizeBuyerName(name) : name) : (isAr ? 'العميل غير مُدخل' : 'Client not entered'));
  const unitLabel = (id: string) => id || (isAr ? 'الوحدة غير مُدخلة' : 'Unit not entered');
  const isDelivered = activeContract.handover_status === 'Delivered';
  const branches: { id: 'Branch1_PreDelivery' | 'Branch2_PostDelivery'; icon: React.ReactNode; titleAr: string; titleEn: string; descAr: string; descEn: string }[] = [
    {
      id: 'Branch1_PreDelivery',
      icon: <Undo2 size={16} />,
      titleAr: 'المسار ١: إلغاء قبل التسليم',
      titleEn: 'Branch 1: Pre-Delivery Cancellation',
      descAr: 'الوحدة لم تُسلّم. لا اعتراف بالإيراد؛ النقدية في الإيرادات المؤجلة (203000).',
      descEn: 'No handover yet. Revenue not recognized; cash rests in Deferred Revenue (203000).',
    },
    {
      id: 'Branch2_PostDelivery',
      icon: <Building2 size={16} />,
      titleAr: 'المسار ٢: استرداد بعد التسليم',
      titleEn: 'Branch 2: Post-Delivery Repossession',
      descAr: 'سُلّمت الوحدة واعتُرف بالإيراد (401000). يعكس الإيراد ويسوي المدينين (103000) ويستعيد أصل WIP.',
      descEn: 'Handover occurred; revenue in 401000. Reverses revenue, clears A/R (103000), restores inventory.',
    },
  ];

  const handleModalClose = () => {
    setRescissionSuccess(null);
    onClose();
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isAr ? 'فسخ العقد وتسوية الغرامة' : 'Contract Rescission & Settlement'}
      subtitle={isAr
        ? 'غرامة فسخ ١٠٪ بحد حظر المطالبة بعجز إضافي، ورد المستحق وإلغاء الأقساط المستقبلية تلقائياً'
        : '10% statutory penalty with Forfeiture Floor protection; refund and future installments voided automatically'}
      icon={<RotateCcw size={16} />}
      isAr={isAr}
      maxWidth="1120px"
      maxHeight="min(880px, 92vh)"
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        rescissionSuccess ? (
          <>
            <button type="button" className={p.primaryButton} onClick={handleModalClose}>
              <CheckCircle2 size={14} />
              <span>{isAr ? 'تم / إغلاق النافذة' : 'Done / Close Window'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={() => setRescissionSuccess(null)}>
              <RotateCcw size={14} />
              <span>{isAr ? 'معالجة عقد آخر' : 'Process Another Contract'}</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className={p.dangerButton} onClick={handleSubmit} disabled={isMutating || isTargetPeriodLocked}>
              {isMutating ? <Loader2 size={14} className={p.spin} /> : isTargetPeriodLocked ? <AlertCircle size={14} /> : <RotateCcw size={14} />}
              <span>
                {isTargetPeriodLocked
                  ? (isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod.period_number})` : `Period Locked (M${targetPeriod.period_number})`)
                  : (isAr ? 'تأكيد الفسخ وترحيل القيد' : 'Confirm & Post Rescission Entry')}
              </span>
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
          </div>
          <div className={p.listSummary}>
            <span>{isAr ? 'العقود القابلة للتسوية' : 'Eligible contracts'}</span>
            <bdi className={p.numeric}>{filteredContracts.length}</bdi>
          </div>
          <div className={p.listBody}>
            {filteredContracts.length === 0 ? (
              <div className={p.emptyState}>
                <Search size={28} className={p.emptyStateIcon} aria-hidden />
                <span>{isAr ? 'لا توجد عقود نشطة مطابقة للبحث' : 'No matching active contracts found'}</span>
              </div>
            ) : (
              filteredContracts.map((c) => {
                const isSelected = c.contract_id === activeContract.contract_id;
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
                      <bdi className={p.listItemCode}>#{c.contract_number}</bdi>
                    </span>
                    <span className={p.listItemMeta}>
                      <bdi>{unitLabel(c.unit_id)}</bdi>
                      <bdi className={p.listItemAmount}>{D(c.gross_contract_value || '0').formatEGP(isAr)}</bdi>
                    </span>
                    <span className={p.listItemMeta}>
                      <span>{isAr ? 'المسدد' : 'Paid'}</span>
                      <bdi className={p.numeric}>{D(c.total_cash_collected || '0').formatEGP(isAr)}</bdi>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className={p.detailPane}>
          {rescissionSuccess ? (
            <div>
              <section className={p.section}>
                <div className={`${p.notice} ${p.noticeSuccess}`} role="status">
                  <CheckCircle2 size={16} className={p.noticeIconSuccess} />
                  <div>
                    <p className={p.noticeTitle}>{isAr ? 'تم اعتماد فسخ العقد وترحيل قيود الرد المالي' : 'Contract Rescission Successfully Posted'}</p>
                    <p className={p.noticeBody}>
                      {isAr
                        ? 'أُلغيت الأقساط المتبقية وحُدِّث قيد الاسترداد، وأصبحت الوحدة متاحة لإعادة البيع.'
                        : 'Future installments voided, penalty retained, and net refund liability credited to the ledger.'}
                    </p>
                  </div>
                </div>
              </section>
              <section className={p.section}>
                <div className={p.sectionHeader}>
                  <p className={p.metaLine}>
                    <bdi className={p.metaLineStrong}>{buyerLabel(rescissionSuccess.buyer)}</bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi className={p.numeric}>#{rescissionSuccess.contractNumber}</bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi className={p.numeric}>{rescissionSuccess.rescissionDate}</bdi>
                  </p>
                  <span className={`${p.pill} ${p.pillSuccess}`}>
                    <bdi>{isAr ? `الوحدة ${unitLabel(rescissionSuccess.unitId)} متاحة للبيع` : `Unit ${unitLabel(rescissionSuccess.unitId)} available`}</bdi>
                  </span>
                </div>
                <dl className={p.metaList}>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'قيمة العقد الأصلية' : 'Gross Contract Value'}</dt>
                    <dd className={p.metaValue}><bdi>{D(rescissionSuccess.grossContractValue || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'إجمالي المحصل بالخزينة' : 'Total Cash Collected'}</dt>
                    <dd className={p.metaValue}><bdi>{D(rescissionSuccess.totalCashCollected || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'غرامة الفسخ المحتجزة' : 'Retained Penalty'}</dt>
                    <dd className={p.metaValue}><bdi>{D(rescissionSuccess.penaltyRetained || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'صافي رد العميل المستحق (206200)' : 'Net Refund Liability (206200)'}</dt>
                    <dd className={p.metaValue}><bdi>{D(rescissionSuccess.netRefundLiability || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                </dl>
                <p className={p.hint}>
                  {isAr
                    ? 'طُبّق حد حظر المطالبة بعجز إضافي، ورُحّل صافي المسترد إلى ذمة العميل (206200)، وأُثبتت الغرامة كإيراد استثنائي.'
                    : 'Forfeiture Floor applied: net refund credited to buyer liability (206200) and penalty recognized as miscellaneous gain.'}
                </p>
              </section>
            </div>
          ) : (
            <div>
              <section className={p.section}>
                <div className={p.sectionHeader}>
                  <p className={p.metaLine}>
                    <bdi className={p.metaLineStrong}>{buyerLabel(activeContract.buyer_name)}</bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi className={p.numeric}>#{activeContract.contract_number}</bdi>
                    <span className={p.metaDot}>·</span>
                    <bdi>{unitLabel(activeContract.unit_id)}</bdi>
                  </p>
                  <span className={isDelivered ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillMuted}`}>
                    {isDelivered ? (isAr ? 'مسلّمة' : 'Delivered') : (isAr ? 'لم تُسلّم' : 'Not delivered')}
                  </span>
                </div>
                <div className={p.fieldGrid}>
                  <div className={p.field}>
                    <label className={p.label} htmlFor="resc-date">{isAr ? 'تاريخ الفسخ المعتمد' : 'Effective Date'}</label>
                    <input
                      id="resc-date"
                      type="date"
                      value={rescissionDate}
                      onChange={e => setRescissionDate(e.target.value)}
                      required
                      className={`${p.input} ${p.numeric}`}
                    />
                  </div>
                </div>
                {isTargetPeriodLocked && (
                  <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                    <AlertCircle size={16} className={p.noticeIconDanger} />
                    <div>
                      <p className={p.noticeTitle}>{isAr ? 'الفترة المحاسبية لتاريخ الفسخ مقفلة' : 'Fiscal period is locked'}</p>
                      <p className={p.noticeBody}>
                        <bdi>
                          {isAr
                            ? `التاريخ يقع في الفترة ${targetPeriod.fiscal_year}-M${targetPeriod.period_number} وهي مقفلة (Invariant 0.9). اختر تاريخاً في فترة مفتوحة.`
                            : `The date falls in period ${targetPeriod.fiscal_year}-M${targetPeriod.period_number}, which is locked (Invariant 0.9). Pick a date in an open period.`}
                        </bdi>
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'المسار المحاسبي للفسخ' : 'Rescission Branch'}</h4>
                <div className={p.choiceGrid} role="radiogroup">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedBranch === b.id}
                      onClick={() => setSelectedBranch(b.id)}
                      className={selectedBranch === b.id ? `${p.choice} ${p.choiceSelected}` : p.choice}
                    >
                      <span className={p.choiceIcon}>{b.icon}</span>
                      <span className={p.choiceText}>
                        <span className={p.choiceTitle}>{isAr ? b.titleAr : b.titleEn}</span>
                        <span className={p.choiceDesc}>{isAr ? b.descAr : b.descEn}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className={p.hint}>
                  {isAr
                    ? `الحالة المسجلة للوحدة: ${isDelivered ? 'مسلّمة' : 'لم تُسلّم'}. حدد المسار المطابق قبل الترحيل (Invariant 4.10).`
                    : `Recorded unit status: ${isDelivered ? 'Delivered' : 'Not delivered'}. Confirm the matching branch before posting (Invariant 4.10).`}
                </p>
              </section>

              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'التسوية المالية' : 'Financial Settlement'}</h4>
                <div className={p.figureGrid}>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'غرامة الفسخ المحتجزة' : 'Retained Penalty'}</span>
                    <bdi className={p.figureValue}>{D(preview.penaltyRetained || '0').formatEGP(isAr)}</bdi>
                    <span className={p.figureCaption}>{isAr ? 'حد أقصى ١٠٪ من قيمة العقد' : 'Capped at 10% of contract value'}</span>
                  </div>
                  <div className={p.figure}>
                    <span className={p.figureLabel}>{isAr ? 'صافي رد العميل (206200)' : 'Net Refund Liability (206200)'}</span>
                    <bdi className={`${p.figureValue} ${p.figureValueSuccess}`}>{D(preview.netRefundLiability || '0').formatEGP(isAr)}</bdi>
                  </div>
                </div>
                <dl className={p.metaList}>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'قيمة العقد الإجمالية' : 'Gross Contract Value'}</dt>
                    <dd className={p.metaValue}><bdi>{D(preview.grossContractValue || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                  <div className={p.metaRow}>
                    <dt className={p.metaKey}>{isAr ? 'المحصل نقداً حتى الآن' : 'Total Cash Collected'}</dt>
                    <dd className={p.metaValue}><bdi>{D(preview.totalCashCollected || '0').formatEGP(isAr)}</bdi></dd>
                  </div>
                </dl>
                <div className={p.notice}>
                  <ShieldAlert size={16} className={p.noticeIconAccent} />
                  <p className={p.noticeBody}>
                    {isAr
                      ? 'حد حظر المطالبة بعجز إضافي: لن يُطالب العميل بأي مبالغ إضافية إذا كانت مدفوعاته أقل من الغرامة.'
                      : 'Forfeiture Floor: the client is never billed for a deficit if payments were less than the penalty.'}
                  </p>
                </div>
              </section>

              <section className={p.section}>
                <h4 className={p.sectionTitle}>{isAr ? 'معاينة القيد المحاسبي' : 'Journal Entry Preview'}</h4>
                <JournalEntryPreview entry={preview.journalEntry} isDraft={true} isAr={isAr} />
              </section>
            </div>
          )}
        </div>
      </div>
    </ZFModalShell>
  );
};
