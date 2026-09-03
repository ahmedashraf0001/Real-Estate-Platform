'use client';

import React from 'react';
import { Building2, Undo2, CheckCircle2 } from 'lucide-react';
import { ERPContract } from '@/lib/erp/types';

interface BranchDecisionCardProps {
  contract: ERPContract;
  selectedBranch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery';
  onSelectBranch: (branch: 'Branch1_PreDelivery' | 'Branch2_PostDelivery') => void;
  isAr?: boolean;
}

export const BranchDecisionCard: React.FC<BranchDecisionCardProps> = ({
  contract,
  selectedBranch,
  onSelectBranch,
  isAr = false
}) => {
  const isDelivered = contract.handover_status === 'Delivered';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
        {isAr ? 'الخطوة ٠ (إلزامية): التحقق من المسار المحاسبي والقانوني للفسخ' : 'Step 0 (Mandatory Precondition): Branch Determination'}
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--zf-text-secondary, #a7acc0)', margin: 0 }}>
        {isAr 
          ? 'بموجب المعيار Invariant 4.10: يجب تحديد ما إذا كانت الوحدة قد سُلمت فعلياً لتحديد مسار المعالجة المحاسبية الصحيح.'
          : 'Per ERP Invariant 4.10: Explicit confirmation of handover state is required before computing forfeiture and refund.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Branch 1 */}
        <div
          onClick={() => onSelectBranch('Branch1_PreDelivery')}
          style={{
            background: selectedBranch === 'Branch1_PreDelivery' ? 'rgba(212, 175, 55, 0.08)' : 'var(--zf-bg-panel, #121622)',
            border: selectedBranch === 'Branch1_PreDelivery' ? '2px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Undo2 size={18} color="#f0c674" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              {isAr ? 'المسار ١: إلغاء قبل التسليم' : 'Branch 1: Pre-Delivery Cancellation'}
            </h4>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-secondary, #a7acc0)', lineHeight: 1.4 }}>
            {isAr
              ? 'الوحدة لم تُسلّم للعميل. لا يوجد اعتراف بالإيراد. النقدية محتجزة في الإيرادات المؤجلة (حساب 203000).'
              : 'Physical handover has NOT occurred. Revenue not recognized. Cash rests in Deferred Revenue (203000).'}
          </div>
          {selectedBranch === 'Branch1_PreDelivery' && (
            <div style={{ position: 'absolute', top: '12px', right: isAr ? undefined : '12px', left: isAr ? '12px' : undefined, color: 'var(--zf-gold, #d4af37)' }}>
              <CheckCircle2 size={18} />
            </div>
          )}
        </div>

        {/* Branch 2 */}
        <div
          onClick={() => onSelectBranch('Branch2_PostDelivery')}
          style={{
            background: selectedBranch === 'Branch2_PostDelivery' ? 'rgba(212, 175, 55, 0.08)' : 'var(--zf-bg-panel, #121622)',
            border: selectedBranch === 'Branch2_PostDelivery' ? '2px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Building2 size={18} color="#6fcf97" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              {isAr ? 'المسار ٢: استرداد بعد التسليم' : 'Branch 2: Post-Delivery Repossession'}
            </h4>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-secondary, #a7acc0)', lineHeight: 1.4 }}>
            {isAr
              ? 'تم تسليم الوحدة مسبقاً والاعتراف بالإيراد (401000). يتطلب عكس الإيراد، تسوية المدينين (103000)، واستعادة أصل WIP.'
              : 'Handover occurred; revenue recognized in 401000. Reverses revenue, clears A/R (103000), restores inventory asset.'}
          </div>
          {selectedBranch === 'Branch2_PostDelivery' && (
            <div style={{ position: 'absolute', top: '12px', right: isAr ? undefined : '12px', left: isAr ? '12px' : undefined, color: 'var(--zf-gold, #d4af37)' }}>
              <CheckCircle2 size={18} />
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--zf-text-muted, #6b7086)', fontStyle: 'italic' }}>
        {isAr 
          ? `الحالة المسجلة للوحدة بالمنظومة: ${isDelivered ? 'مسلّمة (Delivered)' : 'تحت الإنشاء / لم تسلم (Pending)'}.`
          : `System recorded status for unit: ${isDelivered ? 'Delivered' : 'Pending (Pre-handover)'}.`}
      </div>
    </div>
  );
};
