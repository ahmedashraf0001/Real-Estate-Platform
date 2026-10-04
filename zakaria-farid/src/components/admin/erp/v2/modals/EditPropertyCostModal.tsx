'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Edit3, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Save
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPPropertyCostItem, ERPAccountingPeriod } from '@/lib/erp/types';
import { updateCostItemDirectly } from '@/lib/erp/propertyCostEngine';
import { resolvePeriodForDate } from '@/lib/erp/ledger';
import { Property } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';

interface EditPropertyCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  costItem: ERPPropertyCostItem | null;
  property?: Property | null;
  activePeriod?: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  onConfirmEdit: (updatedItem: ERPPropertyCostItem) => Promise<void> | void;
  onOpenAdjustmentModal: (item: ERPPropertyCostItem) => void;
}

export const EditPropertyCostModal: React.FC<EditPropertyCostModalProps> = ({
  isOpen,
  onClose,
  costItem,
  property,
  activePeriod,
  periods,
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

  const itemDate = costItem?.logged_date || costItem?.created_at?.split('T')[0];
  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(itemDate, periods || (activePeriod ? [activePeriod] : []), activePeriod);
  }, [itemDate, periods, activePeriod]);

  if (!isOpen || !costItem) return null;

  const isLocked = targetPeriod.status !== 'OPEN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(
        isAr 
          ? `لا يمكن التعديل المباشر لأن الفترة المحاسبية (${targetPeriod.period_id}) مقفلة (${targetPeriod.status})، استخدم بند تسوية فرعي` 
          : `Accounting period (${targetPeriod.period_id}) is ${targetPeriod.status}. Direct editing is locked; please use an adjustment sub-item.`
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
      }, { targetPeriod });

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
      icon={!isLocked ? <Edit3 size={18} /> : <Lock size={18} />}
      title={isAr ? 'تعديل بيانات بند التكلفة' : 'Edit Cost Item'}
      subtitle={
        !isLocked
          ? (isAr ? `تعديل مباشر متاح: الفترة المحاسبية مفتوحة (${targetPeriod.period_id})` : `Direct editing enabled: Accounting period is open (${targetPeriod.period_id})`)
          : (isAr ? `مقفل محاسبياً: الفترة المحاسبية مقفلة (${targetPeriod.status})` : `Accounting Lock: Target period is locked (${targetPeriod.status})`)
      }
      headerExtra={
        !isLocked ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
            color: 'var(--erp-accent, #2563eb)',
            fontSize: '0.74rem',
            fontWeight: 700,
            border: '1px solid var(--erp-accent-subtle, rgba(37, 99, 235, 0.2))'
          }}>
            <CheckCircle2 size={12} />
            <span>{isAr ? `فترة مفتوحة: ${targetPeriod.period_id}` : `Period Open: ${targetPeriod.period_id}`}</span>
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
            border: '1px solid #cbd5e1'
          }}>
            <Lock size={12} />
            <span>{isAr ? `مقفل محاسبياً (${targetPeriod.status})` : `Locked (${targetPeriod.status})`}</span>
          </span>
        )
      }
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Content Body */}
      <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLocked && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderInlineStart: '3px solid #d97706',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a', display: 'block' }}>
                {isAr 
                  ? `تم قفل هذا البند محاسبياً (الفترة ${targetPeriod.period_id} مقفلة)` 
                  : `Accounting Lock: Period ${targetPeriod.period_id} is locked`}
              </strong>
              <p style={{ margin: '4px 0 10px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                {isAr 
                  ? 'لحماية الاتزان المالي والتدقيق المحاسبي، لا يمكن تعديل أصل البند مباشرة بعد إقفال الفترة المحاسبية. إذا حدث خطأ بدفع زيادة أو دفع ناقص، يمكنك تسجيل بند تسوية فرعي مرتبط به.'
                  : 'To preserve accounting immutability, this item cannot be mutated directly in a locked period. Please record an adjustment sub-item instead.'}
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
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
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
            disabled={isLocked}
            value={itemNameAr}
            onChange={(e) => setItemNameAr(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.86rem',
              color: '#0f172a',
              background: !isLocked ? '#ffffff' : '#f8fafc',
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
              disabled={isLocked}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                background: !isLocked ? '#ffffff' : '#f8fafc',
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
              disabled={isLocked}
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#0f172a',
                background: !isLocked ? '#ffffff' : '#f8fafc',
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
                disabled={isLocked}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: '80px',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  background: !isLocked ? '#ffffff' : '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                disabled={isLocked}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#0f172a',
                  background: !isLocked ? '#ffffff' : '#f8fafc',
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
              disabled={isLocked}
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#0f172a',
                background: !isLocked ? '#ffffff' : '#f8fafc',
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
            disabled={isLocked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              color: '#0f172a',
              background: !isLocked ? '#ffffff' : '#f8fafc',
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
          borderTop: '1px solid #cbd5e1', 
          marginTop: 'auto' 
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          {!isLocked && (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : 'var(--erp-accent, #2563eb)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px var(--erp-accent-subtle, rgba(37, 99, 235, 0.25))',
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
