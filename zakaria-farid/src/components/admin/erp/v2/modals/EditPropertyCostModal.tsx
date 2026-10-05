'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Lock, 
  RotateCcw 
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { ERPPropertyCostItem } from '@/lib/erp/types';
import { isItemWithinGracePeriod, getRemainingGraceHours, updateCostItemDirectly } from '@/lib/erp/propertyCostEngine';
import { Property } from '@/lib/supabase/types';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFFacts,
  ZFEffect,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';

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
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : (isAr ? 'حدث خطأ أثناء تعديل البند' : 'Failed to update cost item'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? (withinGrace ? 'إلغاء' : 'إغلاق') : (withinGrace ? 'Cancel' : 'Close')}
      </button>
      {withinGrace && (
        <button
          type="submit"
          form="zf-edit-cost-form"
          className={shellStyles.btnPrimary}
          disabled={isSubmitting}
        >
          {isSubmitting ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ التعديلات' : 'Save changes')}
        </button>
      )}
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="640px"
      icon={withinGrace ? <Edit3 size={18} /> : <Lock size={18} />}
      title={isAr ? 'تعديل بند تكلفة' : 'Edit Cost Item'}
      subtitle={
        isAr
          ? 'تعديل مباشر خلال مهلة الـ 24 ساعة من تاريخ الإضافة.'
          : 'Direct editing within 24-hour grace period.'
      }
      footer={footer}
    >
      <form id="zf-edit-cost-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* 1. Context facts */}
        <ZFFacts
          items={[
            {
              label: isAr ? 'المشروع' : 'Project',
              value: property ? (isAr ? property.title_ar || property.title_en : property.title_en || property.title_ar) : (isAr ? 'مشروع عقاري' : 'Project')
            },
            {
              label: isAr ? 'مهلة التعديل المباشر' : 'Grace period',
              value: withinGrace ? `${remainingHours} ${isAr ? 'ساعة متبقية' : 'hours left'}` : (isAr ? 'منتهية (مقفل)' : 'Expired (Locked)'),
              tone: withinGrace ? 'pos' : 'neg'
            }
          ]}
        />

        {/* 2. Lock Warning if expired */}
        {!withinGrace && (
          <ZFEffect tone="warn">
            {isAr
              ? 'انقضت مهلة الـ 24 ساعة وقُفل هذا البند محاسبياً. لتعديل المبلغ أو معالجة الفروقات، يمكنك تسجيل بند تسوية فرعي مرتبط به.'
              : 'Grace period expired and this item is locked. To modify amounts, record a linked adjustment sub-item instead.'}
            <button
              type="button"
              className={shellStyles.btnSecondary}
              onClick={() => {
                onClose();
                onOpenAdjustmentModal(costItem);
              }}
            >
              <RotateCcw size={13} />
              <span>{isAr ? 'فتح نافذة إضافة بند تسوية فرعي' : 'Open adjustment sub-item'}</span>
            </button>
          </ZFEffect>
        )}

        {/* 3. Item Name */}
        <ZFField label={isAr ? 'اسم وتفاصيل البند' : 'Item name / description'} required>
          <input
            type="text"
            required
            disabled={!withinGrace}
            value={itemNameAr}
            onChange={(e) => setItemNameAr(e.target.value)}
            className={zfForm.control}
          />
        </ZFField>

        {/* 4. Supplier & Invoice */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'المورد أو مقاول الباطن' : 'Supplier / contractor'}>
            <input
              type="text"
              disabled={!withinGrace}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={zfForm.control}
            />
          </ZFField>
          <ZFField label={isAr ? 'رقم الفاتورة المرجعية' : 'Invoice ref'}>
            <input
              type="text"
              disabled={!withinGrace}
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              className={zfForm.control}
            />
          </ZFField>
        </div>

        {/* 5. Quantity & Total Cost */}
        <div className={zfForm.row}>
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'الكمية' : 'Quantity'}>
              <input
                type="number"
                step="any"
                disabled={!withinGrace}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={zfForm.control}
              />
            </ZFField>
            <ZFField label={isAr ? 'الوحدة' : 'Unit'}>
              <input
                type="text"
                disabled={!withinGrace}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={zfForm.control}
              />
            </ZFField>
          </div>
          <ZFField
            label={isAr ? 'إجمالي قيمة البند' : 'Total cost'}
            required
            hint={totalCost ? (Number(totalCost).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')) : undefined}
          >
            <ZFMoneyInput
              disabled={!withinGrace}
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              required
            />
          </ZFField>
        </div>

        {/* 6. Notes */}
        <ZFField label={isAr ? 'ملاحظات إضافية' : 'Notes'}>
          <input
            type="text"
            disabled={!withinGrace}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={zfForm.control}
            placeholder={isAr ? 'اختياري' : 'Optional'}
          />
        </ZFField>

        {/* 7. Effect if within grace */}
        {withinGrace && totalCost && parseFloat(totalCost) > 0 && (
          <ZFEffect tone="info">
            {isAr
              ? `سيتم تحديث قيمة البند إلى ${Number(totalCost).toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م مباشرة في حسابات المشروع.`
              : `Will update total item cost to ${Number(totalCost).toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP directly in project accounts.`}
          </ZFEffect>
        )}
      </form>
    </ZFModalShell>
  );
};
