'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Coins, 
  Building2, 
  User, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ERPPartnerCommitment } from '@/lib/erp/types';
import { ZFModalShell } from '../common/ZFModalShell';

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
      subtitle={isAr ? 'إدراج التزام مالي على الشريك مرتبط بمرحلة بناء محددة وتاريخ استحقاق' : 'Anchor partner capital commitment to a construction milestone and due date'}
      icon={<Coins size={18} />}
      isAr={isAr}
      maxWidth="580px"
      bodyStyle={{ padding: '1.25rem' }}
    >
      <div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.78rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Project Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              <Building2 size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
              {isAr ? 'المشروع العقاري' : 'Project'}
            </label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                background: '#ffffff',
                color: '#0f172a'
              }}
            >
              <option value="">{isAr ? '-- اختر المشروع --' : '-- Select Project --'}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title_ar || p.title_en}
                </option>
              ))}
            </select>
          </div>

          {/* Partner Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              <User size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
              {isAr ? 'الشريك الممول' : 'Partner Name'}
            </label>
            <input
              type="text"
              list="existing-partners-list"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder={isAr ? 'أدخل اسم الشريك أو اختر من القائمة...' : 'Enter partner name...'}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
            <datalist id="existing-partners-list">
              {existingPartnerNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Milestone Name & Quick Templates */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              <Layers size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
              {isAr ? 'المرحلة الإنشائية / بند المطالبة' : 'Milestone Name'}
            </label>
            <input
              type="text"
              value={milestoneName}
              onChange={e => setMilestoneName(e.target.value)}
              placeholder={isAr ? 'مثال: صب سقف الدور الثالث المتكرر' : 'e.g. 3rd Floor Slab Concrete Pouring'}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
            {/* Quick Template Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
              {QUICK_MILESTONE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMilestoneName(tmpl.name);
                    setMilestonePhase(tmpl.phase);
                  }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '0.68rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  + {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount & Due Date Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                <Coins size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
                {isAr ? 'مبلغ المطالبة (ج.م)' : 'Committed Amount (EGP)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={committedAmount}
                onChange={e => setCommittedAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  background: '#ffffff',
                  color: '#0f172a'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                <Calendar size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
                {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  background: '#ffffff',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              <FileText size={13} style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '4px' }} />
              {isAr ? 'ملاحظات وتفاصيل إضافية' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={isAr ? 'ملاحظات العقد أو شروط الصرف...' : 'Optional notes...'}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.6rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.85rem',
            marginTop: '0.5rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isMutating}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--erp-accent, #2563eb)',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: isMutating ? 'not-allowed' : 'pointer',
                opacity: isMutating ? 0.7 : 1
              }}
            >
              {isMutating ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ وتثبيت المطالبة' : 'Save Commitment')}
            </button>
          </div>
        </form>
      </div>
    </ZFModalShell>
  );
};
