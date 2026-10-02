'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { ERPContract, ERPAccountingPeriod, ERPJournalEntry, ERPCostAllocation } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { JournalEntryPreview, localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ContractsEngine } from '@/lib/erp/contracts';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { getHandoverCOGS } from '@/lib/erp/canonicalMetrics';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

export interface HandoverExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  properties?: Property[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  costAllocations?: ERPCostAllocation[];
  onConfirmHandover: (contract: ERPContract, handoverDate: string, rsvWipCost: Decimal | string) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const HandoverExecutionModal: React.FC<HandoverExecutionModalProps> = ({
  isOpen,
  onClose,
  contract,
  properties = [],
  activePeriod,
  periods,
  costAllocations = [],
  onConfirmHandover,
  isMutating = false,
  isAr = true
}) => {
  const [handoverDate, setHandoverDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [rsvCostAmount, setRsvCostAmount] = useState<string>('0.00');
  const [certifiedCompletionAsserted, setCertifiedCompletionAsserted] = useState<boolean>(false);

  // Identify matching property from portfolio
  const linkedProperty = useMemo(() => {
    if (!contract || !properties || properties.length === 0) return null;
    return properties.find(p => 
      (contract.property_id && p.id === contract.property_id) ||
      p.title_ar === contract.unit_id ||
      p.title_en === contract.unit_id ||
      p.building_units?.some(u => u.unit_id === contract.unit_id || u.unit_number === contract.unit_id)
    ) || null;
  }, [contract, properties]);

  // Determine property readiness (POC Completion Gate §4.14 / INV-4.14)
  const isPropertyReady = useMemo(() => {
    if (!linkedProperty) return false;
    return linkedProperty.completion_status === 'ready';
  }, [linkedProperty]);

  const [isCostAllocated, setIsCostAllocated] = useState<boolean>(false);

  // Initialize values when contract changes or modal opens
  useEffect(() => {
    if (isOpen && contract) {
      setHandoverDate(new Date().toISOString().split('T')[0]);
      setCertifiedCompletionAsserted(false);

      // Canonical Handover COGS (RSV-based unit cost relief without arbitrary fallbacks)
      const { cogsFormatted, isAllocated } = getHandoverCOGS({
        contractValue: contract.gross_contract_value || 0,
        costAllocations,
        property: linkedProperty,
      });

      setRsvCostAmount(cogsFormatted);
      setIsCostAllocated(isAllocated);
    }
  }, [isOpen, contract, linkedProperty, costAllocations]);

  // Derived financial metrics
  const grossValue = useMemo(() => D(contract?.gross_contract_value || 0), [contract]);
  const cashCollected = useMemo(() => D(contract?.total_cash_collected || 0), [contract]);
  const unpaidBalance = useMemo(() => {
    const diff = grossValue.minus(cashCollected);
    return diff.isNegative() ? D(0) : diff;
  }, [grossValue, cashCollected]);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(handoverDate, periods || [activePeriod], activePeriod);
  }, [handoverDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod.status !== 'OPEN';

  // Generate Model B Journal Entry Preview (§14.D.12 & INV-4.17)
  const previewEntry = useMemo<ERPJournalEntry | null>(() => {
    if (!contract || !targetPeriod) return null;
    try {
      const validRsv = D(rsvCostAmount || 0);
      if (validRsv.isZero() || validRsv.isNegative()) return null;
      const previewPeriod: ERPAccountingPeriod = targetPeriod.status === 'OPEN'
        ? targetPeriod
        : { ...targetPeriod, status: 'OPEN' };
      return ContractsEngine.createHandoverModelBEntry(
        contract,
        previewPeriod,
        handoverDate,
        validRsv,
        '501000',
        '151000',
        'PREVIEW'
      );
    } catch (e) {
      console.warn('Model B Preview generation error:', e);
      return null;
    }
  }, [contract, targetPeriod, handoverDate, rsvCostAmount]);

  if (!isOpen || !contract) return null;

  const isAlreadyDelivered = contract.handover_status === 'Delivered';
  // Plain expression: this runs after the early return above, so it must not be a hook.
  const hasValidCost = (() => {
    try {
      return D(rsvCostAmount || '0').gt(0);
    } catch {
      return false;
    }
  })();

  // Gate check: must have valid cost; if not ready, require assertion checkbox; must not be already delivered; preview entry must exist; target period must not be locked
  const canConfirm = !isMutating && !isAlreadyDelivered && hasValidCost && (isPropertyReady || certifiedCompletionAsserted) && grossValue.greaterThan(0) && previewEntry !== null && !isTargetPeriodLocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) {
      if (!hasValidCost) {
        toast.error(
          isAr
            ? 'يرجى إدخال تكلفة البناء المستنزفة (WIP Relief) يدوياً أكبر من الصفر لإتمام التسليم'
            : 'Please enter a valid construction WIP relief amount greater than zero to proceed'
        );
      }
      return;
    }

    const finalRsv = D(rsvCostAmount || 0);
    await onConfirmHandover(contract, handoverDate, finalRsv.isNegative() ? '0.00' : finalRsv);
  };

  const propertyTitle = linkedProperty
    ? (isAr ? (linkedProperty.title_ar || linkedProperty.title_en) : (linkedProperty.title_en || linkedProperty.title_ar))
    : contract.unit_id;

  const buyerName = contract.buyer_name ? (isAr ? localizeBuyerName(contract.buyer_name) : contract.buyer_name) : (isAr ? 'غير مُدخل' : 'Not entered');
  const wipRelief = (() => { try { return D(rsvCostAmount || 0); } catch { return D(0); } })();

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="1120px"
      maxHeight="min(880px, 92vh)"
      icon={<KeyRound size={16} />}
      title={isAr ? 'محضر استلام الوحدة والاعتراف بالإيراد' : 'Handover Protocol & Revenue Recognition'}
      subtitle={isAr
        ? 'إثبات التسليم ونقل الإيراد المؤجل (203000) إلى إيراد محقق (401000) وباقي الأقساط كمدينين (103000)'
        : 'Certify delivery, clear deferred revenue (203000) into realized revenue (401000) and book the balance to A/R (103000)'}
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        <>
          <button type="submit" form="handover-execution-form" className={p.primaryButton} disabled={!canConfirm}>
            {isMutating ? (
              <><Loader2 size={14} className={p.spin} /><span>{isAr ? 'جاري ترحيل القيود...' : 'Posting Journal Entries...'}</span></>
            ) : isTargetPeriodLocked ? (
              <><AlertTriangle size={14} /><span>{isAr ? `الفترة المحاسبية مقفلة (M${targetPeriod.period_number})` : `Period Locked (M${targetPeriod.period_number})`}</span></>
            ) : (
              <><CheckCircle2 size={14} /><span>{isAr ? 'اعتماد محضر الاستلام وترحيل القيد' : 'Confirm Handover & Post Entry'}</span></>
            )}
          </button>
          <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isMutating}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <span className={p.footerHint}>
            {isAr
              ? 'ستتحول حالة العقد إلى "مسلّم" وتُرحَّل خمسة أسطر قيد بسجل القيود العامة.'
              : 'The contract becomes Delivered and 5 journal lines are posted to the general ledger.'}
          </span>
        </>
      }
    >
      <form id="handover-execution-form" onSubmit={handleSubmit} className={p.duo}>
        {/* Contract, inputs and completion gate */}
        <div className={p.duoPane}>
          {(isAlreadyDelivered || isTargetPeriodLocked) && (
            <section className={p.section}>
              {isAlreadyDelivered && (
                <div className={p.notice} role="status">
                  <ShieldCheck size={16} className={p.noticeIconAccent} />
                  <div>
                    <p className={p.noticeTitle}>{isAr ? 'تم تسليم هذه الوحدة رسمياً مسبقاً' : 'Unit already certified and delivered'}</p>
                    <p className={p.noticeBody}>
                      <bdi>
                        {isAr
                          ? `تاريخ التسليم المسجل: ${contract.handover_date || 'غير مُدخل'}. قيود التسليم مُرحّلة مسبقاً.`
                          : `Delivered on: ${contract.handover_date || 'not entered'}. Handover entries were already posted.`}
                      </bdi>
                    </p>
                  </div>
                </div>
              )}
              {isTargetPeriodLocked && (
                <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                  <AlertTriangle size={16} className={p.noticeIconDanger} />
                  <div>
                    <p className={p.noticeTitle}>{isAr ? 'الفترة المحاسبية لتاريخ التسليم مقفلة' : 'Fiscal period is locked'}</p>
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
          )}

          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}>{isAr ? 'بيانات الوحدة والعقد' : 'Contract & Unit'}</h4>
              <span className={isPropertyReady ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillWarning}`}>
                {isPropertyReady ? (isAr ? 'جاهز للتسليم' : 'Ready for Delivery') : (isAr ? 'قيد التنفيذ' : 'Under Construction')}
              </span>
            </div>
            <dl className={p.metaList}>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'العميل المشتري' : 'Buyer'}</dt>
                <dd className={contract.buyer_name ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{buyerName}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'رقم العقد' : 'Contract Number'}</dt>
                <dd className={p.metaValue}><bdi className={p.numeric}>#{contract.contract_number}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'العقار والمشروع' : 'Property / Project'}</dt>
                <dd className={propertyTitle ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{propertyTitle || (isAr ? 'غير مُدخل' : 'Not entered')}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'رقم الوحدة' : 'Unit ID'}</dt>
                <dd className={contract.unit_id ? p.metaValue : `${p.metaValue} ${p.emptyValue}`}><bdi>{contract.unit_id || (isAr ? 'غير مُدخل' : 'Not entered')}</bdi></dd>
              </div>
            </dl>
            <div className={`${p.figureGrid} ${p.figureGrid3}`}>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'قيمة العقد' : 'Gross Value'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{grossValue.formatEGP(isAr)}</bdi>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'المحصل نقداً' : 'Collected'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm} ${p.figureValueSuccess}`}>{cashCollected.formatEGP(isAr)}</bdi>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'المتبقي على العميل' : 'Unpaid Balance'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{unpaidBalance.formatEGP(isAr)}</bdi>
              </div>
            </div>
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'بيانات التسليم' : 'Handover Details'}</h4>
            <div className={p.fieldGrid}>
              <div className={p.field}>
                <label className={p.label} htmlFor="ho-date">{isAr ? 'تاريخ محضر الاستلام' : 'Certified Handover Date'}</label>
                <input
                  id="ho-date"
                  type="date"
                  value={handoverDate}
                  onChange={e => setHandoverDate(e.target.value)}
                  required
                  className={`${p.input} ${p.numeric}`}
                />
              </div>
              <div className={p.field}>
                <div className={p.labelRow}>
                  <label className={p.label} htmlFor="ho-wip">{isAr ? 'تكلفة البناء المستنزفة (WIP)' : 'WIP Relief (RSV)'}</label>
                  <bdi className={`${p.hint} ${p.numeric}`}>501000 / 151000</bdi>
                </div>
                <div className={p.affixWrap}>
                  <input
                    id="ho-wip"
                    type="number"
                    step="0.01"
                    value={rsvCostAmount}
                    onChange={e => setRsvCostAmount(e.target.value)}
                    required
                    className={`${p.input} ${p.numeric}`}
                  />
                  <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>
            </div>
            {isCostAllocated ? (
              <p className={p.hint}>
                {isAr ? 'احتُسبت التكلفة تلقائياً من تخصيص التكلفة المعتمد (RSV).' : 'Derived from the approved relative sales value (RSV) allocation.'}
              </p>
            ) : (
              <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
                <AlertTriangle size={16} className={p.noticeIconDanger} />
                <p className={p.noticeBody}>
                  {isAr
                    ? 'لا يوجد تخصيص تكلفة معتمد لهذا العقار. أدخل تكلفة البناء المستنزفة يدوياً لإتمام التسليم.'
                    : 'No approved cost allocation exists for this property. Enter the WIP relief amount manually to proceed.'}
                </p>
              </div>
            )}
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'بوابة الإنجاز الهندسي (§4.14)' : 'Completion Gate (§4.14)'}</h4>
            <div className={isPropertyReady ? `${p.notice} ${p.noticeSuccess}` : p.notice}>
              {isPropertyReady ? <ShieldCheck size={16} className={p.noticeIconSuccess} /> : <AlertTriangle size={16} className={p.noticeIconAccent} />}
              <p className={p.noticeBody}>
                {isPropertyReady
                  ? (isAr ? 'العقار مسجل "جاهز للتسليم" وتتوفر شهادات المطابقة الهندسية للاعتراف بالإيراد.' : 'The property is marked ready, with certified structural completion.')
                  : (isAr ? 'العقار مسجل قيد التطوير. يُشترط اعتماد شهادة الاستشاري بإنجاز ١٠٠٪ قبل التسليم.' : 'The property is marked off-plan. Certified 100% engineering completion is required before handover.')}
              </p>
            </div>
            {!isPropertyReady && (
              <label className={p.check}>
                <input
                  type="checkbox"
                  checked={certifiedCompletionAsserted}
                  onChange={e => setCertifiedCompletionAsserted(e.target.checked)}
                />
                <span>
                  {isAr
                    ? 'أقر بصفتي المدير المالي باعتماد شهادة استشاري المشروع ومطابقة إنجاز الوحدة بنسبة ١٠٠٪ وإذن التسليم الرسمي.'
                    : 'I certify that engineering inspection confirmed 100% unit completion and approved handover.'}
                </span>
              </label>
            )}
          </section>
        </div>

        {/* Journal preview */}
        <div className={p.duoPane}>
          <section className={p.section}>
            <h4 className={p.paneTitle}>{isAr ? 'معاينة القيد المحاسبي' : 'Journal Entry Preview'}</h4>
            <dl className={p.metaList}>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>
                  {isAr ? 'مدين 203000 · الإيراد المؤجل' : 'Dr 203000 · Deferred revenue'}
                  <span className={p.metaSub}>{isAr ? 'المحصل قبل الاستلام يتحول لمبيعات' : 'Collected advances become sales'}</span>
                </dt>
                <dd className={p.metaValue}><bdi>{cashCollected.formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>
                  {isAr ? 'مدين 103000 · المدينون' : 'Dr 103000 · Receivables'}
                  <span className={p.metaSub}>{isAr ? 'باقي الأقساط مديونية على المشتري' : 'Remaining installments booked to A/R'}</span>
                </dt>
                <dd className={p.metaValue}><bdi>{unpaidBalance.formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>
                  {isAr ? 'دائن 401000 · إيراد المبيعات' : 'Cr 401000 · Realized revenue'}
                  <span className={p.metaSub}>{isAr ? 'اعتراف بكامل سعر البيع' : 'Full sale price recognized'}</span>
                </dt>
                <dd className={p.metaValue}><bdi>{grossValue.formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>
                  {isAr ? 'مدين 501000 / دائن 151000 · تكلفة المباني' : 'Dr 501000 / Cr 151000 · WIP relief'}
                  <span className={p.metaSub}>{isAr ? 'تحميل تكلفة الوحدة على تكلفة المبيعات' : 'Moves unit cost from WIP into COGS'}</span>
                </dt>
                <dd className={p.metaValue}><bdi>{wipRelief.formatEGP(isAr)}</bdi></dd>
              </div>
            </dl>
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'شرح القيد المركب' : 'What this entry does'}</h4>
            <ul className={p.noteList}>
              {isAr ? (
                <>
                  <li><strong>مبيعات الوحدة (401000):</strong> تسجيل كامل الثمن كإيراد محقق لحظة تسليم المفتاح.</li>
                  <li><strong>تسوية المقدمات والأقساط (203000 و103000):</strong> إقفال المحصل سابقاً وإثبات الباقي كمديونية على المشتري.</li>
                  <li><strong>تكلفة المباني (501000 مقابل 151000):</strong> تحميل تكلفة الوحدة على تكلفة البيع لحساب صافي الربح.</li>
                </>
              ) : (
                <>
                  <li><strong>Revenue (401000):</strong> recognizes the full sale price on key delivery.</li>
                  <li><strong>Advances and receivables (203000 and 103000):</strong> clears collected cash and books the balance as A/R.</li>
                  <li><strong>Building cost (501000 vs 151000):</strong> moves construction cost from WIP into COGS to derive gross margin.</li>
                </>
              )}
            </ul>
          </section>

          <section className={p.section}>
            {previewEntry ? (
              <JournalEntryPreview entry={previewEntry} isDraft={true} isAr={isAr} />
            ) : (
              <div className={p.notice}>
                <AlertTriangle size={16} className={p.noticeIconAccent} />
                <p className={p.noticeBody}>
                  {isAr ? 'لا يمكن توليد معاينة القيد قبل إدخال تكلفة بناء أكبر من الصفر.' : 'The entry preview appears once a WIP relief amount above zero is entered.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </form>
    </ZFModalShell>
  );
};
