'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Building2, CreditCard, FileText, Home, Printer
} from 'lucide-react';
import type { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import type { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { formatCompactNumber, getContractPaymentStatus } from '@/lib/erp/contractsPipeline';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

export interface ZFContractInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  schedules: ERPInstallmentSchedule[];
  properties?: Property[];
  isAr?: boolean;
  initialTab?: 'details' | 'schedules';
  onOpenCollectionModal?: (contract: ERPContract, schedule?: ERPInstallmentSchedule) => void;
  onOpenHandoverModal?: (contract: ERPContract) => void;
}

export const ZFContractInspectionModal: React.FC<ZFContractInspectionModalProps> = ({
  isOpen, onClose, contract, schedules, properties = [], isAr = true,
  initialTab = 'details', onOpenCollectionModal, onOpenHandoverModal
}) => {
  const schedulePaneRef = useRef<HTMLElement>(null);
  const [detailTab, setDetailTab] = useState<'data' | 'obligations' | 'notes'>('data');

  useEffect(() => {
    if (!isOpen) return;
    setDetailTab('data');
    if (initialTab !== 'schedules') return;
    const frame = requestAnimationFrame(() => schedulePaneRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, initialTab, contract?.contract_id]);

  const property = useMemo(() => properties.find(p => p.id === contract?.property_id || p.building_units?.some(u => u.unit_id === contract?.unit_id || u.unit_number === contract?.unit_id)), [properties, contract]);
  const unit = property?.building_units?.find(u => u.unit_id === contract?.unit_id || u.unit_number === contract?.unit_id);
  const image = property?.property_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
  const contractSchedules = useMemo(() => schedules
    .filter(s => s.contract_id === contract?.contract_id && s.status !== 'SUPERSEDED' && s.status !== 'Void')
    .sort((a, b) => a.tranche_number - b.tranche_number || a.due_date.localeCompare(b.due_date)), [schedules, contract?.contract_id]);

  if (!contract) return null;

  const gross = D(contract.gross_contract_value || 0);
  const collected = D(contract.total_cash_collected || 0);
  const remaining = Decimal.max(0, gross.minus(collected));
  const progress = gross.gt(0) ? Math.min(100, collected.div(gross).times(100).toNumber()) : 0;
  const installments = contractSchedules.filter(s => s.tranche_number > 0);
  const paidSchedules = contractSchedules.filter(s => s.status === 'Paid');
  const pending = contractSchedules.find(s => s.status === 'Defaulted') || contractSchedules.find(s => s.status === 'Pending' || s.status === 'Partially Paid');
  const deposit = contractSchedules.find(s => s.tranche_number === 0);
  const status = getContractPaymentStatus(contract, contractSchedules);
  const statusTone = status === 'overdue' ? p.pillDanger : status === 'completed' ? p.pillSuccess : status === 'rescinded' ? p.pillMuted : p.pillAccent;
  const statusText = status === 'overdue' ? (isAr ? 'متأخر' : 'Overdue') : status === 'completed' ? (isAr ? 'مكتمل السداد' : 'Paid in full') : status === 'rescinded' ? (isAr ? 'مفسوخ' : 'Rescinded') : (isAr ? 'ساري' : 'Active');
  const projectName = property ? (isAr ? property.title_ar : property.title_en) : (isAr ? 'عقار غير مرتبط' : 'Unlinked property');
  const empty = isAr ? 'غير مُدخل' : 'Not entered';
  const paymentPlan = contract.payment_plan_type === 'FULL_CASH' ? (isAr ? 'سداد نقدي' : 'Full cash') : contract.payment_plan_type === 'UPFRONT_HANDOVER' ? (isAr ? 'مقدم واستلام' : 'Upfront handover') : contract.payment_plan_type === 'INSTALLMENTS' ? (isAr ? 'أقساط' : 'Installments') : null;
  const money = (amount: string | number | Decimal) => `${formatCompactNumber(amount)} ${isAr ? 'ج.م' : 'EGP'}`;
  const buyerName = isAr ? localizeBuyerName(contract.buyer_name) : contract.buyer_name;
  const area = unit?.area_sqm || property?.area_sqm;
  const canHandover = !!onOpenHandoverModal && contract.handover_status !== 'Delivered' && contract.status !== 'Rescinded';
  const canCollect = !!onOpenCollectionModal && !!pending && contract.status !== 'Rescinded';
  const scheduleState = (s: ERPInstallmentSchedule) => {
    if (s.status === 'Paid') return { tone: p.pillSuccess, label: isAr ? 'مدفوع' : 'Paid' };
    if (s.status === 'Defaulted' || ((s.status === 'Pending' || s.status === 'Partially Paid') && s.due_date < new Date().toISOString().split('T')[0])) return { tone: p.pillDanger, label: isAr ? 'متأخر' : 'Overdue' };
    if (s.status === 'Partially Paid') return { tone: p.pillAccent, label: isAr ? 'مدفوع جزئياً' : 'Part paid' };
    return { tone: p.pillWarning, label: isAr ? 'مستحق' : 'Due' };
  };
  const metaRow = (label: string, value: React.ReactNode, isEmpty = false) => (
    <div className={p.metaRow}>
      <dt className={p.metaKey}>{label}</dt>
      <dd className={isEmpty ? `${p.metaValue} ${p.emptyValue}` : p.metaValue}>{isEmpty ? empty : value}</dd>
    </div>
  );

  return (
    <ZFModalShell isOpen={isOpen} onClose={onClose} maxWidth="1280px" maxHeight="92vh" isAr={isAr}
      icon={<FileText size={16} />}
      title={isAr ? 'تفاصيل العقد ومتابعة الأقساط' : 'Contract and installment inspection'}
      subtitle={<bdi className={p.numeric}>{contract.contract_number} · {projectName}</bdi>}
      bodyStyle={{ padding: 0, display: 'flex', minHeight: 0 }}
      footer={
        <>
          {canCollect && (
            <button type="button" className={p.primaryButton} onClick={() => { onClose(); onOpenCollectionModal!(contract, pending); }}>
              <CreditCard size={14} />
              <span>{isAr ? 'تحصيل القسط' : 'Collect installment'}</span>
            </button>
          )}
          {canHandover && (
            <button type="button" className={p.secondaryButton} onClick={() => { onClose(); onOpenHandoverModal!(contract); }}>
              <Home size={14} />
              <span>{isAr ? 'إجراءات التسليم' : 'Handover actions'}</span>
            </button>
          )}
          <button type="button" className={p.secondaryButton} onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          <button type="button" className={`${p.secondaryButton} ${p.footerEnd}`} onClick={() => window.print()}>
            <Printer size={14} />
            <span>{isAr ? 'طباعة كشف الأقساط' : 'Print schedule'}</span>
          </button>
        </>
      }>
      <div className={p.duo}>
        {/* Contract details */}
        <section className={p.duoPane} aria-labelledby="contract-pane-title">
          <section className={p.section}>
            <div className={p.sectionHeader}>
              <div className={p.identity}>
                {image?.url ? (
                  <div className={p.thumbWide}>
                    <Image src={image.url} alt={isAr ? image.alt_text_ar || projectName : image.alt_text_en || projectName} fill sizes="96px" unoptimized />
                  </div>
                ) : (
                  <span className={p.thumbFallback}><Building2 size={20} /></span>
                )}
                <div className={p.identityText}>
                  <h4 id="contract-pane-title" className={p.identityTitle}><bdi>{projectName}</bdi></h4>
                  <p className={p.metaLine}>
                    <bdi className={p.numeric}>{contract.unit_id || empty}</bdi>
                    <span className={p.metaDot}>·</span>
                    <span>{contract.is_whole_building_sale ? (isAr ? 'عمارة كاملة' : 'Whole building') : (isAr ? 'وحدة عقارية' : 'Property unit')}</span>
                    {area ? (<><span className={p.metaDot}>·</span><bdi className={p.numeric}>{area} {isAr ? 'م²' : 'sqm'}</bdi></>) : null}
                    {property?.location ? (<><span className={p.metaDot}>·</span><bdi>{property.location}</bdi></>) : null}
                  </p>
                </div>
              </div>
              <span className={`${p.pill} ${statusTone}`}>{statusText}</span>
            </div>
            <dl className={p.metaList}>
              {metaRow(isAr ? 'العميل' : 'Client', <bdi>{buyerName}</bdi>, !contract.buyer_name)}
              {metaRow(isAr ? 'رقم الهاتف' : 'Phone', <bdi dir="ltr" className={p.numeric}>{contract.buyer_phone}</bdi>, !contract.buyer_phone)}
            </dl>
          </section>

          <section className={p.section}>
            <div className={p.segmented} role="tablist" aria-label={isAr ? 'بيانات العقد' : 'Contract sections'}>
              {(['data', 'obligations', 'notes'] as const).map(key => (
                <button key={key} type="button" role="tab" aria-selected={detailTab === key}
                  className={detailTab === key ? `${p.segment} ${p.segmentActive}` : p.segment}
                  onClick={() => setDetailTab(key)}>
                  {key === 'data' ? (isAr ? 'بيانات العقد' : 'Contract data') : key === 'obligations' ? (isAr ? 'الالتزامات' : 'Obligations') : (isAr ? 'الملاحظات' : 'Notes')}
                </button>
              ))}
            </div>
            {detailTab === 'data' && (
              <dl className={p.metaList}>
                {metaRow(isAr ? 'رقم العقد' : 'Contract number', <bdi className={p.numeric}>{contract.contract_number}</bdi>)}
                {metaRow(isAr ? 'تاريخ التوقيع' : 'Signed', <bdi className={p.numeric}>{contract.contract_date}</bdi>, !contract.contract_date)}
                {metaRow(isAr ? 'قيمة العقد' : 'Contract value', <bdi className={p.numeric}>{money(gross)}</bdi>)}
                {metaRow(isAr ? 'نظام السداد' : 'Payment plan', paymentPlan, !paymentPlan)}
                {metaRow(isAr ? 'موعد التسليم' : 'Handover', <bdi className={p.numeric}>{contract.handover_date}</bdi>, !contract.handover_date)}
                {metaRow(isAr ? 'حالة التسليم' : 'Handover status', contract.handover_status === 'Delivered' ? (isAr ? 'تم التسليم' : 'Delivered') : (isAr ? 'لم يسلم' : 'Pending'))}
              </dl>
            )}
            {detailTab === 'obligations' && (
              <dl className={p.metaList}>
                {metaRow(isAr ? 'مقدم العقد المسجل' : 'Recorded deposit', <bdi className={p.numeric}>{deposit ? money(deposit.nominal_value) : ''}</bdi>, !deposit)}
                {metaRow(isAr ? 'الأقساط المجدولة' : 'Scheduled installments', <bdi className={p.numeric}>{installments.length}</bdi>)}
                {metaRow(isAr ? 'المدفوع حتى الآن' : 'Collected', <bdi className={p.numeric}>{money(collected)}</bdi>)}
                {metaRow(isAr ? 'المتبقي' : 'Outstanding', <bdi className={p.numeric}>{money(remaining)}</bdi>)}
              </dl>
            )}
            {detailTab === 'notes' && (
              <p className={p.hint}>{isAr ? 'لا توجد ملاحظات مرتبطة بهذا العقد في السجل الحالي.' : 'No notes are attached to this contract record.'}</p>
            )}
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'مرفقات العقد' : 'Contract attachments'}</h4>
            <p className={p.hint}>{isAr ? 'لا توجد ملفات مرفقة بهذا العقد في السجل الحالي.' : 'No documents are linked to this contract record.'}</p>
          </section>
        </section>

        {/* Installment tracking */}
        <section ref={schedulePaneRef} tabIndex={-1} className={p.duoPane} aria-labelledby="schedule-pane-title">
          <section className={p.section}>
            <h4 id="schedule-pane-title" className={p.paneTitle}>{isAr ? 'متابعة الأقساط' : 'Installment tracking'}</h4>
            <div className={p.figureGrid}>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'قيمة العقد' : 'Contract value'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{money(gross)}</bdi>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'المتبقي' : 'Outstanding'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSm}`}>{money(remaining)}</bdi>
              </div>
            </div>
            <div className={p.ratioBar} aria-hidden>
              <div className={p.ratioPrimary} style={{ width: `${progress}%` }} />
            </div>
            <div className={p.legend}>
              <span className={p.legendItem}>
                <span className={p.legendSwatchPrimary} />
                <bdi className={p.numeric}>{isAr ? `المحصل ${money(collected)} · ${Math.round(progress)}%` : `Collected ${money(collected)} · ${Math.round(progress)}%`}</bdi>
              </span>
              <span className={p.legendItem}>
                <bdi className={p.numeric}>{isAr ? `${installments.length} قسط` : `${installments.length} installments`}</bdi>
              </span>
            </div>
          </section>

          <section className={p.section} aria-labelledby="installments-heading">
            <div className={p.sectionHeader}>
              <h4 id="installments-heading" className={p.sectionTitle}>
                <span>{isAr ? 'جدول الأقساط' : 'Installment schedule'}</span>
                <span className={p.sectionCount}>(<bdi className={p.numeric}>{installments.length}</bdi>)</span>
              </h4>
            </div>
            <div className={p.tableWrap}>
              <table className={p.table}>
                <thead><tr><th scope="col">#</th><th scope="col">{isAr ? 'الاستحقاق' : 'Due'}</th><th scope="col">{isAr ? 'المبلغ' : 'Amount'}</th><th scope="col">{isAr ? 'الحالة' : 'Status'}</th><th scope="col">{isAr ? 'السداد' : 'Paid on'}</th></tr></thead>
                <tbody>
                  {contractSchedules.length ? contractSchedules.map(s => {
                    const state = scheduleState(s);
                    return (
                      <tr key={s.schedule_id}>
                        <td>{s.tranche_number === 0 ? (isAr ? 'مقدم' : 'Deposit') : <bdi className={p.numeric}>{s.tranche_number}</bdi>}</td>
                        <td><bdi className={p.numeric}>{s.due_date || empty}</bdi></td>
                        <td className={p.cellStrong}><bdi className={p.numeric}>{money(s.nominal_value)}</bdi></td>
                        <td><span className={`${p.pill} ${state.tone}`}>{state.label}</span></td>
                        <td className={s.paid_date ? undefined : p.emptyValue}><bdi className={p.numeric}>{s.paid_date || (isAr ? 'لم يُسدد' : 'Not paid')}</bdi></td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className={p.tableEmpty}>{isAr ? 'لا توجد أقساط مسجلة لهذا العقد.' : 'No installments recorded for this contract.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={p.section} aria-labelledby="payments-heading">
            <div className={p.sectionHeader}>
              <h4 id="payments-heading" className={p.sectionTitle}>
                <span>{isAr ? 'سجل المدفوعات' : 'Payment history'}</span>
                <span className={p.sectionCount}>(<bdi className={p.numeric}>{paidSchedules.length}</bdi>)</span>
              </h4>
            </div>
            <div className={p.tableWrap}>
              <table className={p.table}>
                <thead><tr><th scope="col">{isAr ? 'تاريخ السداد' : 'Paid on'}</th><th scope="col">{isAr ? 'الدفعة' : 'Tranche'}</th><th scope="col">{isAr ? 'المبلغ' : 'Amount'}</th></tr></thead>
                <tbody>
                  {paidSchedules.length ? paidSchedules.map(s => (
                    <tr key={s.schedule_id}>
                      <td><bdi className={p.numeric}>{s.paid_date || empty}</bdi></td>
                      <td>{s.tranche_number === 0 ? (isAr ? 'مقدم' : 'Deposit') : <bdi className={p.numeric}>{s.tranche_number}</bdi>}</td>
                      <td className={p.cellStrong}><bdi className={p.numeric}>{money(s.amount_paid || s.nominal_value)}</bdi></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className={p.tableEmpty}>{isAr ? 'لا توجد دفعات مفصلة في الجدول.' : 'No itemized payments recorded.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </ZFModalShell>
  );
};


export default ZFContractInspectionModal;
