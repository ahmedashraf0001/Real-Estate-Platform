'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Building2, CalendarDays, CreditCard, FileText,
  Home, MapPin, Maximize2, Phone, Printer, Receipt, User, Wallet, Coins, Mail
} from 'lucide-react';
import type { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import type { Property, Lead } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { formatCompactNumber, getContractPaymentStatus } from '@/lib/erp/contractsPipeline';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFModalShell } from '../common/ZFModalShell';
import { ZFFacts, ZFEffect, zfForm } from '../common/ZFForm';
import { useERPWorkstationContext } from '../../context/ERPWorkstationContext';
import shellStyles from '../ZFWorkstationShell.module.css';
import css from './ZFContractInspectionModal.module.css';

export interface ZFContractInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ERPContract | null;
  schedules: ERPInstallmentSchedule[];
  properties?: Property[];
  leads?: Lead[];
  isAr?: boolean;
  initialTab?: 'details' | 'schedules';
  onOpenCollectionModal?: (contract: ERPContract, schedule?: ERPInstallmentSchedule) => void;
  onOpenHandoverModal?: (contract: ERPContract) => void;
}

export const ZFContractInspectionModal: React.FC<ZFContractInspectionModalProps> = ({
  isOpen, onClose, contract, schedules, properties = [], isAr = true,
  initialTab = 'details', onOpenCollectionModal, onOpenHandoverModal, leads
}) => {
  const erpContext = useERPWorkstationContext();
  const effectiveLeads = useMemo(() => {
    return leads || erpContext?.data?.leads || [];
  }, [leads, erpContext?.data?.leads]);

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

  const linkedLead = useMemo(() => {
    if (!contract) return null;
    if (contract.lead_id) {
      return effectiveLeads.find(l => l.id === contract.lead_id) || null;
    }
    const buyerName = (contract.buyer_name || '').trim().toLowerCase();
    if (!buyerName) return null;
    return effectiveLeads.find(l => (l.name || '').trim().toLowerCase() === buyerName) || null;
  }, [contract, effectiveLeads]);

  const buyerPhone = contract?.buyer_phone || linkedLead?.phone || '—';
  const buyerEmail = linkedLead?.email || '—';

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
  const statusClass = status === 'overdue' ? shellStyles.statusPillRed : status === 'completed' ? shellStyles.statusPillGreen : status === 'rescinded' ? shellStyles.statusPillNeutral : shellStyles.statusPillBlue;
  const statusText = status === 'overdue' ? (isAr ? 'متأخر' : 'Overdue') : status === 'completed' ? (isAr ? 'مكتمل السداد' : 'Paid in full') : status === 'rescinded' ? (isAr ? 'مفسوخ' : 'Rescinded') : (isAr ? 'ساري' : 'Active');
  const projectName = property ? (isAr ? property.title_ar : property.title_en) : (isAr ? 'عقار غير مرتبط' : 'Unlinked property');
  const paymentPlan = contract.payment_plan_type === 'FULL_CASH' ? (isAr ? 'سداد نقدي' : 'Full cash') : contract.payment_plan_type === 'UPFRONT_HANDOVER' ? (isAr ? 'مقدم واستلام' : 'Upfront handover') : contract.payment_plan_type === 'INSTALLMENTS' ? (isAr ? 'أقساط' : 'Installments') : '—';
  const money = (amount: string | number | Decimal) => `${formatCompactNumber(amount)} ${isAr ? 'ج.م' : 'EGP'}`;
  const scheduleState = (s: ERPInstallmentSchedule) => {
    if (s.status === 'Paid') return { cls: shellStyles.statusPillGreen, label: isAr ? 'مدفوع' : 'Paid' };
    if (s.status === 'Defaulted' || ((s.status === 'Pending' || s.status === 'Partially Paid') && s.due_date < new Date().toISOString().split('T')[0])) return { cls: shellStyles.statusPillRed, label: isAr ? 'متأخر' : 'Overdue' };
    if (s.status === 'Partially Paid') return { cls: shellStyles.statusPillBlue, label: isAr ? 'مدفوع جزئياً' : 'Part paid' };
    return { cls: shellStyles.statusPillAmber, label: isAr ? 'مستحق' : 'Due' };
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1280px"
      maxHeight="92vh"
      isAr={isAr}
      icon={<FileText size={18} />}
      title={isAr ? 'تفاصيل العقد' : 'Contract Details'}
      subtitle={<span className={css.tabular}>{contract.contract_number} • {projectName}</span>}
      className={css.modalWrapper}
    >
      <div className={css.dualLayout}>
        {/* PANE 1: CONTRACT DETAILS */}
        <section className={css.pane} aria-labelledby="contract-pane-title">
          <div className={css.paneHeader}>
            <FileText size={17} />
            <h4 id="contract-pane-title" className={zfForm.sectionTitle}>{isAr ? 'تفاصيل العقد' : 'Contract details'}</h4>
          </div>
          <div className={css.paneBody}>
            <div className={css.propertyCard}>
              {image?.url ? (
                <div className={css.propertyImage}>
                  <Image src={image.url} alt={isAr ? image.alt_text_ar || projectName : image.alt_text_en || projectName} fill sizes="(max-width: 900px) 100vw, 260px" unoptimized />
                </div>
              ) : (
                <div className={css.propertyImageEmpty}>
                  <Building2 size={28} />
                  <span>{isAr ? 'لا توجد صورة للعقار' : 'No property photo'}</span>
                </div>
              )}
              <div className={css.propertyInfo}>
                <strong>{projectName}</strong>
                <span className={css.tabular}>{contract.unit_id}</span>
                <div className={css.propertyFacts}>
                  <span><Home size={13} />{contract.is_whole_building_sale ? (isAr ? 'عمارة كاملة' : 'Whole building') : isAr ? 'وحدة عقارية' : 'Property unit'}</span>
                  {(unit?.area_sqm || property?.area_sqm) ? <span><Maximize2 size={13} />{unit?.area_sqm || property?.area_sqm} {isAr ? 'م²' : 'sqm'}</span> : null}
                  {property?.location && <span><MapPin size={13} />{property.location}</span>}
                </div>
              </div>
            </div>

            <div className={css.clientCard}>
              <div><User size={15} /><span>{isAr ? 'العميل' : 'Client'}</span><strong>{isAr ? localizeBuyerName(contract.buyer_name) : contract.buyer_name}</strong></div>
              <div><Phone size={15} /><span>{isAr ? 'رقم الهاتف' : 'Phone'}</span><strong dir="ltr" className={css.tabular}>{buyerPhone}</strong></div>
              {buyerEmail !== '—' && (
                <div><Mail size={15} /><span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span><strong dir="ltr" className={css.tabular}>{buyerEmail}</strong></div>
              )}
              <span className={`${shellStyles.statusPill} ${statusClass}`}>{statusText}</span>
            </div>

            <div className={css.tabs} role="tablist" aria-label={isAr ? 'بيانات العقد' : 'Contract sections'}>
              {(['data', 'obligations', 'notes'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === key}
                  className={detailTab === key ? css.tabActive : css.tab}
                  onClick={() => setDetailTab(key)}
                >
                  {key === 'data' ? (isAr ? 'بيانات العقد' : 'Contract data') : key === 'obligations' ? (isAr ? 'الالتزامات' : 'Obligations') : (isAr ? 'الملاحظات' : 'Notes')}
                </button>
              ))}
            </div>

            {detailTab === 'data' && (
              <ZFFacts
                items={[
                  { label: isAr ? 'رقم العقد' : 'Contract number', value: contract.contract_number },
                  { label: isAr ? 'تاريخ التوقيع' : 'Signed', value: contract.contract_date },
                  { label: isAr ? 'قيمة العقد' : 'Contract value', value: money(gross) },
                  { label: isAr ? 'نظام السداد' : 'Payment plan', value: paymentPlan },
                  { label: isAr ? 'موعد التسليم' : 'Handover', value: contract.handover_date || '—' },
                  { label: isAr ? 'حالة التسليم' : 'Handover status', value: contract.handover_status === 'Delivered' ? (isAr ? 'تم التسليم' : 'Delivered') : (isAr ? 'لم يسلم' : 'Pending') }
                ]}
              />
            )}

            {detailTab === 'obligations' && (
              <ZFFacts
                items={[
                  { label: isAr ? 'مقدم العقد المسجل' : 'Recorded deposit', value: deposit ? money(deposit.nominal_value) : '—' },
                  { label: isAr ? 'الأقساط المجدولة' : 'Scheduled installments', value: installments.length },
                  { label: isAr ? 'المدفوع حتى الآن' : 'Collected', value: money(collected), tone: 'pos' },
                  { label: isAr ? 'المتبقي' : 'Outstanding', value: money(remaining) }
                ]}
              />
            )}

            {detailTab === 'notes' && (
              <ZFEffect>
                {isAr ? 'لا توجد ملاحظات مرتبطة بهذا العقد في السجل الحالي.' : 'No notes are attached to this contract record.'}
              </ZFEffect>
            )}

            <div className={zfForm.section}>
              <h4 className={zfForm.sectionTitle}>{isAr ? 'مرفقات العقد' : 'Contract attachments'}</h4>
              <p className={css.attachmentsText}>
                {isAr ? 'لا توجد ملفات مرفقة بهذا العقد في السجل الحالي.' : 'No documents are linked to this contract record.'}
              </p>
            </div>

            <div className={css.paneFooter}>
              {onOpenHandoverModal && contract.handover_status !== 'Delivered' && contract.status !== 'Rescinded' && (
                <button
                  type="button"
                  className={shellStyles.btnSecondary}
                  onClick={() => { onClose(); onOpenHandoverModal(contract); }}
                >
                  {isAr ? 'إجراءات التسليم' : 'Handover actions'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* PANE 2: INSTALLMENT TRACKING */}
        <section ref={schedulePaneRef} tabIndex={-1} className={css.pane} aria-labelledby="schedule-pane-title">
          <div className={css.paneHeader}>
            <CalendarDays size={17} />
            <h4 id="schedule-pane-title" className={zfForm.sectionTitle}>{isAr ? 'متابعة الأقساط' : 'Installment tracking'}</h4>
          </div>
          <div className={css.paneBody}>
            <div className={css.scheduleIdentity}>
              {image?.url ? <div className={css.scheduleThumb}><Image src={image.url} alt="" fill sizes="120px" unoptimized /></div> : <Building2 size={24} />}
              <div><strong>{projectName}</strong><span className={css.tabular}>{contract.contract_number}</span></div>
              <div className={css.scheduleClient}><span>{isAr ? 'العميل' : 'Client'}</span><strong>{isAr ? localizeBuyerName(contract.buyer_name) : contract.buyer_name}</strong></div>
            </div>

            <ZFFacts
              items={[
                { label: isAr ? 'قيمة العقد' : 'Contract value', value: money(gross) },
                { label: isAr ? 'المحصل' : 'Collected', value: `${money(collected)} (${Math.round(progress)}%)`, tone: 'pos' },
                { label: isAr ? 'المتبقي' : 'Outstanding', value: money(remaining) },
                { label: isAr ? 'عدد الأقساط' : 'Installments', value: installments.length }
              ]}
            />

            <section className={css.tableCard} aria-labelledby="installments-heading">
              <div className={css.tableHeading}>
                <h5 id="installments-heading">{isAr ? 'جدول الأقساط' : 'Installment schedule'}</h5>
                <span>{installments.length}</span>
              </div>
              <div className={css.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{isAr ? 'الاستحقاق' : 'Due'}</th>
                      <th scope="col">{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th scope="col">{isAr ? 'الحالة' : 'Status'}</th>
                      <th scope="col">{isAr ? 'السداد' : 'Paid on'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractSchedules.length ? contractSchedules.map(s => {
                      const state = scheduleState(s);
                      return (
                        <tr key={s.schedule_id}>
                          <td>{s.tranche_number === 0 ? (isAr ? 'مقدم' : 'Deposit') : s.tranche_number}</td>
                          <td className={css.tabular}>{s.due_date || '—'}</td>
                          <td className={css.tabular}>{money(s.nominal_value)}</td>
                          <td><span className={`${shellStyles.statusPill} ${state.cls}`}>{state.label}</span></td>
                          <td className={css.tabular}>{s.paid_date || '—'}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className={css.emptyCell}>
                          {isAr ? 'لا توجد أقساط مسجلة لهذا العقد.' : 'No installments recorded for this contract.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={css.tableCard} aria-labelledby="payments-heading">
              <div className={css.tableHeading}>
                <h5 id="payments-heading">{isAr ? 'سجل المدفوعات' : 'Payment history'}</h5>
                <span>{paidSchedules.length}</span>
              </div>
              <div className={css.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{isAr ? 'تاريخ السداد' : 'Paid on'}</th>
                      <th scope="col">{isAr ? 'الدفعة' : 'Tranche'}</th>
                      <th scope="col">{isAr ? 'المبلغ' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidSchedules.length ? paidSchedules.map(s => (
                      <tr key={s.schedule_id}>
                        <td className={css.tabular}>{s.paid_date || '—'}</td>
                        <td>{s.tranche_number === 0 ? (isAr ? 'مقدم' : 'Deposit') : s.tranche_number}</td>
                        <td className={css.tabular}>{money(s.amount_paid || s.nominal_value)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className={css.emptyCell}>
                          {isAr ? 'لا توجد دفعات مفصلة في الجدول.' : 'No itemized payments recorded.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className={css.paneFooter}>
              <button
                type="button"
                className={shellStyles.btnSecondary}
                onClick={() => window.print()}
              >
                <Printer size={14} />
                {isAr ? 'طباعة كشف الأقساط' : 'Print schedule'}
              </button>
              {onOpenCollectionModal && pending && contract.status !== 'Rescinded' && (
                <button
                  type="button"
                  className={shellStyles.btnPrimary}
                  onClick={() => { onClose(); onOpenCollectionModal(contract, pending); }}
                >
                  <CreditCard size={14} />
                  {isAr ? 'تحصيل القسط' : 'Collect installment'}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </ZFModalShell>
  );
};

export default ZFContractInspectionModal;
