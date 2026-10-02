'use client';

import React, { useState, useMemo } from 'react';
import { Coins, AlertCircle, Loader2, Check } from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ERPPartnerCommitment } from '@/lib/erp/types';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

export interface NewPartnerCommitmentPayload {
  propertyId: string;
  partnerName: string;
  milestoneName: string;
  milestonePhase?: string;
  committedAmount: string;
  dueDate: string;
  notes?: string;
}

interface NewPartnerCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties?: Property[];
  existingPartnerNames?: string[];
  initialPropertyId?: string;
  initialPartnerName?: string;
  isAr?: boolean;
  isMutating?: boolean;
  onSubmit: (payload: NewPartnerCommitmentPayload) => Promise<void>;
}

const QUICK_MILESTONE_TEMPLATES = [
  { name: 'صب القواعد والأساسات الخرسانية', phase: 'excavation' },
  { name: 'صب سقف الدور الأرضي والأعمدة', phase: 'structural_skeleton' },
  { name: 'صب سقف الدور الثالث المتكرر', phase: 'structural_skeleton' },
  { name: 'أعمال الطوب والمباني والتقسيم الداخلي', phase: 'masonry_roughing' },
  { name: 'أعمال تأسيس السباكة والكهرباء', phase: 'masonry_roughing' },
  { name: 'أعمال البياض والمحارة والواجهات الخارجية', phase: 'finishing_handover' },
  { name: 'التشطيبات النهائية وتسليم المشروع', phase: 'finishing_handover' }
];

export const NewPartnerCommitmentModal: React.FC<NewPartnerCommitmentModalProps> = ({
  isOpen,
  onClose,
  properties = [],
  existingPartnerNames = [],
  initialPropertyId,
  initialPartnerName,
  isAr = true,
  isMutating = false,
  onSubmit
}) => {
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId || (properties[0]?.id || ''));
  const [partnerName, setPartnerName] = useState<string>(initialPartnerName || (existingPartnerNames[0] || ''));
  const [milestoneName, setMilestoneName] = useState<string>('');
  const [milestonePhase, setMilestonePhase] = useState<string>('structural_skeleton');
  const [committedAmount, setCommittedAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial props
  React.useEffect(() => {
    if (initialPropertyId) setPropertyId(initialPropertyId);
    if (initialPartnerName) setPartnerName(initialPartnerName);
  }, [initialPropertyId, initialPartnerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!propertyId) {
      setErrorMsg(isAr ? 'يرجى اختيار المشروع العقاري' : 'Please select a project');
      return;
    }
    if (!partnerName.trim()) {
      setErrorMsg(isAr ? 'يرجى تحديد اسم الشريك الممول' : 'Please specify partner name');
      return;
    }
    if (!milestoneName.trim()) {
      setErrorMsg(isAr ? 'يرجى تحديد مسمى المرحلة الإنشائية أو المطالبة' : 'Please enter milestone name');
      return;
    }
    const amtDec = D(committedAmount || 0);
    if (amtDec.lte(0)) {
      setErrorMsg(isAr ? 'يرجى إدخال مبلغ مساهمة صحيح أكبر من الصفر' : 'Please enter a valid amount greater than 0');
      return;
    }
    if (!dueDate) {
      setErrorMsg(isAr ? 'يرجى تحديد تاريخ استحقاق المطالبة' : 'Please specify due date');
      return;
    }

    try {
      await onSubmit({
        propertyId,
        partnerName: partnerName.trim(),
        milestoneName: milestoneName.trim(),
        milestonePhase,
        committedAmount: amtDec.toFixed(2),
        dueDate,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'حدث خطأ أثناء حفظ المطالبة' : 'Error saving commitment'));
    }
  };

  if (!isOpen) return null;

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'جدولة مطالبة تمويل مرحلة إنشائية' : 'Schedule Milestone Capital Call'}
      subtitle={isAr ? 'التزام مالي على الشريك مرتبط بمرحلة بناء وتاريخ استحقاق' : 'Anchor partner capital to a construction milestone and due date'}
      icon={<Coins size={16} />}
      isAr={isAr}
      maxWidth="600px"
      footer={
        <>
          <button type="submit" form="partner-commitment-form" className={p.primaryButton} disabled={isMutating}>
            {isMutating ? <Loader2 size={14} className={p.spin} /> : <Check size={14} />}
            <span>{isMutating ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتثبيت المطالبة' : 'Save Commitment')}</span>
          </button>
          <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isMutating}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </>
      }
    >
      <form id="partner-commitment-form" onSubmit={handleSubmit}>
        {errorMsg && (
          <section className={p.section}>
            <div className={`${p.notice} ${p.noticeDanger}`} role="alert">
              <AlertCircle size={16} className={p.noticeIconDanger} />
              <p className={p.noticeBody}>{errorMsg}</p>
            </div>
          </section>
        )}

        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'المشروع والشريك' : 'Project & Partner'}</h4>
          <div className={p.fieldGrid}>
            <div className={p.field}>
              <label className={p.label} htmlFor="pc-property">{isAr ? 'المشروع العقاري' : 'Project'}</label>
              <select
                id="pc-property"
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className={p.input}
              >
                <option value="">{isAr ? 'اختر المشروع' : 'Select project'}</option>
                {properties.map(pr => (
                  <option key={pr.id} value={pr.id}>
                    {isAr ? (pr.title_ar || pr.title_en) : (pr.title_en || pr.title_ar)}
                  </option>
                ))}
              </select>
            </div>
            <div className={p.field}>
              <label className={p.label} htmlFor="pc-partner">{isAr ? 'الشريك الممول' : 'Partner Name'}</label>
              <input
                id="pc-partner"
                type="text"
                list="existing-partners-list"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                placeholder={isAr ? 'اسم الشريك أو اختر من القائمة' : 'Enter partner name'}
                className={p.input}
              />
              <datalist id="existing-partners-list">
                {existingPartnerNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
        </section>

        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'المرحلة الإنشائية' : 'Milestone'}</h4>
          <div className={p.field}>
            <label className={p.label} htmlFor="pc-milestone">{isAr ? 'المرحلة / بند المطالبة' : 'Milestone Name'}</label>
            <input
              id="pc-milestone"
              type="text"
              value={milestoneName}
              onChange={e => setMilestoneName(e.target.value)}
              placeholder={isAr ? 'مثال: صب سقف الدور الثالث المتكرر' : 'e.g. 3rd Floor Slab Concrete Pouring'}
              className={p.input}
            />
            <div className={p.chipRow}>
              {QUICK_MILESTONE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-pressed={milestoneName === tmpl.name}
                  onClick={() => {
                    setMilestoneName(tmpl.name);
                    setMilestonePhase(tmpl.phase);
                  }}
                  className={milestoneName === tmpl.name ? `${p.chip} ${p.chipActive}` : p.chip}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'المبلغ والاستحقاق' : 'Amount & Due Date'}</h4>
          <div className={p.fieldGrid}>
            <div className={p.field}>
              <label className={p.label} htmlFor="pc-amount">{isAr ? 'مبلغ المطالبة' : 'Committed Amount'}</label>
              <div className={p.affixWrap}>
                <input
                  id="pc-amount"
                  type="number"
                  step="0.01"
                  value={committedAmount}
                  onChange={e => setCommittedAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${p.input} ${p.numeric}`}
                />
                <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              <bdi className={`${p.hint} ${p.numeric}`}>{D(committedAmount || 0).formatEGP(isAr)}</bdi>
            </div>
            <div className={p.field}>
              <label className={p.label} htmlFor="pc-due">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <input
                id="pc-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={`${p.input} ${p.numeric}`}
              />
            </div>
            <div className={`${p.field} ${p.fieldFull}`}>
              <label className={p.label} htmlFor="pc-notes">{isAr ? 'ملاحظات وتفاصيل إضافية' : 'Notes'}</label>
              <input
                id="pc-notes"
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات العقد أو شروط الصرف' : 'Optional notes'}
                className={p.input}
              />
            </div>
          </div>
        </section>
      </form>
    </ZFModalShell>
  );
};
