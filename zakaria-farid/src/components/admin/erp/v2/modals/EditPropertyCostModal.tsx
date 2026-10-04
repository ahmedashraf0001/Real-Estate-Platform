'use client';

import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Clock, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Building2,
  Calendar,
  Save,
  FileText
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPPropertyCostItem, PropertyCostCategory, PropertyLifecyclePhase } from '@/lib/erp/types';
import { isItemWithinGracePeriod, getRemainingGraceHours, updateCostItemDirectly } from '@/lib/erp/propertyCostEngine';
import { Property } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';

interface EditPropertyCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  costItem: ERPPropertyCostItem | null;
  property?: Property | null;
  isAr?: boolean;
  onConfirmEdit: (updatedItem: ERPPropertyCostItem) => Promise<void> | void;
  onOpenAdjustmentModal: (item: ERPPropertyCostItem) => void;
}

export const EditPropertyCostModal: React.FC<EditPropertyCostModalProps> = ({
  isOpen,
  onClose,
  costItem,
  property,
  isAr = true,
  onConfirmEdit,
  onOpenAdjustmentModal
}) => {
  const [itemNameAr, setItemNameAr] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [invoiceRef, setInvoiceRef] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<string>('مقطوعية');
  const [totalCost, setTotalCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (costItem) {
      setItemNameAr(costItem.item_name_ar || '');
      setSupplier(costItem.supplier_contractor || '');
      setInvoiceRef(costItem.invoice_ref || '');
      setQuantity(costItem.quantity?.toString() || '1');
      setUnit(costItem.unit || 'مقطوعية');
      setTotalCost(costItem.total_cost_egp || '');
      setNotes(costItem.notes || '');
    }
  }, [costItem]);

  if (!isOpen || !costItem) return null;

  const withinGrace = isItemWithinGracePeriod(costItem.created_at, 24);
  const remainingHours = getRemainingGraceHours(costItem.created_at, 24);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withinGrace) {
      toast.error(
        isAr 
          ? 'لا يمكن التعديل المباشر بعد انقضاء مهلة الـ 24 ساعة، استخدم بند تسوية فرعي' 
          : 'Grace period expired. Please use an adjustment sub-item.'
      );
      return;
    }

    const numCost = parseFloat(totalCost);
    if (isNaN(numCost) || numCost <= 0) {
      toast.error(isAr ? 'يرجى إدخال مبلغ تكلفة صحيح' : 'Please enter valid total cost');
      return;
    }

    setIsSubmitting(true);
    try {
      const q = parseFloat(quantity) || 1;
      const unitCost = D(totalCost).dividedBy(q).toFixed(2);

      const updated = updateCostItemDirectly(costItem, {
        item_name_ar: itemNameAr.trim(),
        item_name_en: itemNameAr.trim(),
        supplier_contractor: supplier.trim() || undefined,
        invoice_ref: invoiceRef.trim() || undefined,
        quantity: q,
        unit: unit.trim() || 'مقطوعية',
        unit_cost_egp: unitCost,
        total_cost_egp: D(totalCost).toFixed(2),
        notes: notes.trim() || undefined
      });

      await onConfirmEdit(updated);

      toast.success(
        isAr ? 'تم تعديل بيانات البند بنجاح' : 'Cost item updated successfully',
        { duration: 4000 }
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || (isAr ? 'حدث خطأ أثناء تعديل البند' : 'Failed to update cost item'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="640px"
      icon={withinGrace ? <Edit3 size={18} /> : <Lock size={18} />}
      title={isAr ? 'تعديل بيانات بند التكلفة' : 'Edit Cost Item'}
      subtitle={isAr ? 'تعديل مباشر خلال مهلة الـ 24 ساعة من تاريخ الإضافة' : 'Direct editing within 24-hour grace period'}
      headerExtra={
        withinGrace ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'var(--erp-accent-subtle)',
            color: 'var(--erp-accent)',
            fontSize: '0.74rem',
            fontWeight: 700,
            border: '1px solid color-mix(in srgb, var(--erp-accent) 14%, transparent)'
          }}>
            <Clock size={12} />
            <span>{isAr ? `متاح: ${remainingHours} ساعة` : `${remainingHours}h left`}</span>
          </span>
        ) : (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.74rem',
            fontWeight: 700,
            border: '1px solid #e2e8f0'
          }}>
            <Lock size={12} />
            <span>{isAr ? 'مقفل محاسبياً' : 'Locked'}</span>
          </span>
        )
      }
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Content Body */}
      <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!withinGrace && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.86rem', color: '#92400E', display: 'block' }}>
                {isAr ? 'تم قفل هذا البند محاسبياً (انقضت مهلة الـ 24 ساعة)' : 'Accounting Lock: 24h grace period expired'}
              </strong>
              <p style={{ margin: '4px 0 10px', fontSize: '0.78rem', color: '#B45309', lineHeight: 1.5 }}>
                {isAr 
                  ? 'لحماية الاتزان المالي والتدقيق المحاسبي، لا يمكن تعديل أصل البند مباشرة بعد 24 ساعة. إذا حدث خطأ بدفع زيادة أو دفع ناقص، يمكنك تسجيل بند تسوية فرعي مرتبط به.'
                  : 'To preserve accounting immutability, this item cannot be mutated directly. Please record an adjustment sub-item instead.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdjustmentModal(costItem);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D97706',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={13} />
                <span>{isAr ? 'فتح نافذة إضافة بند تسوية فرعي' : 'Open Sub-Item Adjustment'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Item Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            {isAr ? 'اسم وتفاصيل البند' : 'Item Name / Description'}
          </label>
          <input
            type="text"
            required
            disabled={!withinGrace}
            value={itemNameAr}
            onChange={(e) => setItemNameAr(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.86rem',
              color: '#0F172A',
              background: withinGrace ? '#FFFFFF' : '#F8FAFC',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Supplier & Invoice */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'المورد أو مقاول الباطن' : 'Supplier / Contractor'}
            </label>
            <input
              type="text"
              disabled={!withinGrace}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0F172A',
                background: withinGrace ? '#FFFFFF' : '#F8FAFC',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'رقم الفاتورة المرجعية' : 'Invoice Ref'}
            </label>
            <input
              type="text"
              disabled={!withinGrace}
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0F172A',
                background: withinGrace ? '#FFFFFF' : '#F8FAFC',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Quantity & Total Cost */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'الكمية والوحدة' : 'Quantity & Unit'}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                step="any"
                disabled={!withinGrace}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '80px',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  background: withinGrace ? '#FFFFFF' : '#F8FAFC',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                disabled={!withinGrace}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0F172A',
                  background: withinGrace ? '#FFFFFF' : '#F8FAFC',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {isAr ? 'إجمالي قيمة البند (ج.م)' : 'Total Cost (EGP)'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              disabled={!withinGrace}
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0F172A',
                background: withinGrace ? '#FFFFFF' : '#F8FAFC',
                fontVariantNumeric: 'tabular-nums',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            {isAr ? 'ملاحظات إضافية' : 'Notes'}
          </label>
          <textarea
            rows={2}
            disabled={!withinGrace}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              color: '#0F172A',
              background: withinGrace ? '#FFFFFF' : '#F8FAFC',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Actions Footer */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end', 
          paddingTop: '12px', 
          borderTop: '1px solid #e2e8f0', 
          marginTop: 'auto' 
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          {withinGrace && (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : 'var(--erp-accent)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px color-mix(in srgb, var(--erp-accent) 25%, transparent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={15} />
              <span>{isSubmitting ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}</span>
            </button>
          )}
        </div>
      </form>
    </ZFModalShell>
  );
};
