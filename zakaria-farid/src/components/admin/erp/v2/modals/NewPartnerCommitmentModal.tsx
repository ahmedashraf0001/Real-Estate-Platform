'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFEffect,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './NewPartnerCommitmentModal.module.css';

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

  useEffect(() => {
    if (initialPropertyId) setPropertyId(initialPropertyId);
    if (initialPartnerName) setPartnerName(initialPartnerName);
  }, [initialPropertyId, initialPartnerName]);

  const numAmount = parseFloat(committedAmount) || 0;
  const moneyFormatted = `${Number(numAmount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;
  const selectedProperty = properties.find(p => p.id === propertyId);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || (isAr ? 'حدث خطأ أثناء حفظ المطالبة' : 'Error saving commitment'));
    }
  };

  const footer = (
    <ZFFormFooter>
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-new-commitment-form"
        className={shellStyles.btnPrimary}
        disabled={isMutating}
      >
        {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ المطالبة' : 'Save commitment')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'مطالبة تمويل شريك' : 'Partner capital call'}
      subtitle={
        isAr
          ? 'إدراج التزام مالي على الشريك مرتبط بمرحلة بناء وتاريخ استحقاق.'
          : 'Anchor partner capital commitment to a construction milestone and due date.'
      }
      icon={<Coins size={18} />}
      isAr={isAr}
      maxWidth="640px"
      footer={footer}
    >
      <form id="zf-new-commitment-form" className={zfForm.form} onSubmit={handleSubmit}>
        {errorMsg && (
          <ZFEffect tone="danger">
            {errorMsg}
          </ZFEffect>
        )}

        {/* 1. Project Selection */}
        <ZFField label={isAr ? 'المشروع العقاري' : 'Project'} required>
          <select
            className={zfForm.control}
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
          >
            <option value="">{isAr ? '-- اختر المشروع --' : '-- Select Project --'}</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar)}
              </option>
            ))}
          </select>
        </ZFField>

        {/* 2. Partner Selection */}
        <ZFField label={isAr ? 'الشريك الممول' : 'Partner'} required>
          <input
            type="text"
            className={zfForm.control}
            list="existing-partners-list"
            value={partnerName}
            onChange={e => setPartnerName(e.target.value)}
            placeholder={isAr ? 'أدخل اسم الشريك أو اختر من القائمة…' : 'Enter partner name…'}
          />
          <datalist id="existing-partners-list">
            {existingPartnerNames.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </ZFField>

        {/* 3. Milestone Name & Quick Templates */}
        <ZFField
          label={isAr ? 'المرحلة الإنشائية' : 'Construction milestone'}
          required
          hint={isAr ? 'اسم المرحلة أو بند المطالبة الإنشائية.' : 'Name of the milestone or construction call.'}
        >
          <input
            type="text"
            className={zfForm.control}
            value={milestoneName}
            onChange={e => setMilestoneName(e.target.value)}
            placeholder={isAr ? 'مثال: صب سقف الدور الثالث المتكرر' : 'e.g. 3rd Floor Slab Concrete Pouring'}
          />
          <div className={styles.templates}>
            {QUICK_MILESTONE_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.templateBtn}
                onClick={() => {
                  setMilestoneName(tmpl.name);
                  setMilestonePhase(tmpl.phase);
                }}
              >
                + {tmpl.name}
              </button>
            ))}
          </div>
        </ZFField>

        {/* 4. Row: Amount & Due Date */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'مبلغ المطالبة' : 'Committed amount'} required>
            <ZFMoneyInput
              value={committedAmount}
              onChange={e => setCommittedAmount(e.target.value)}
              unit={isAr ? 'ج.م' : 'EGP'}
              placeholder="0.00"
              required
            />
          </ZFField>
          <ZFField label={isAr ? 'تاريخ الاستحقاق' : 'Due date'} required>
            <input
              type="date"
              className={zfForm.control}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
            />
          </ZFField>
        </div>

        {/* 5. Notes */}
        <ZFField label={isAr ? 'ملاحظات' : 'Notes'}>
          <input
            type="text"
            className={zfForm.control}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات العقد أو شروط الصرف (اختياري)…' : 'Optional notes…'}
          />
        </ZFField>

        {/* 6. Effect Note */}
        {numAmount > 0 ? (
          <ZFEffect>
            {isAr ? (
              <>
                سيُسجل التزام مالي بقيمة <strong>{moneyFormatted}</strong> على الشريك <strong>{partnerName || 'المحدد'}</strong> لمرحلة <strong>{milestoneName || 'المحددة'}</strong>{selectedProperty ? <> في <strong>{selectedProperty.title_ar || selectedProperty.title_en}</strong></> : null}.
              </>
            ) : (
              <>
                A commitment of <strong>{moneyFormatted}</strong> will be recorded for <strong>{partnerName || 'partner'}</strong> for <strong>{milestoneName || 'milestone'}</strong>{selectedProperty ? <> on <strong>{selectedProperty.title_en || selectedProperty.title_ar}</strong></> : null}.
              </>
            )}
          </ZFEffect>
        ) : (
          <ZFEffect>
            {isAr ? 'أدخل تفاصيل المطالبة والمبلغ لتسجيل الالتزام.' : 'Enter milestone call details and amount.'}
          </ZFEffect>
        )}
      </form>
    </ZFModalShell>
  );
};
