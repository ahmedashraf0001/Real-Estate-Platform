'use client';

import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { D, generateUUID } from '@/lib/erp/math';
import type { ERPConstructionPurchaseOrder } from '@/lib/erp/types';
import type { Property } from '@/lib/supabase/types';
import { ZFModalShell } from '../common/ZFModalShell';
import styles from './ConstructionPurchaseOrderModal.module.css';

export function ConstructionPurchaseOrderModal({ isOpen, onClose, properties, onSave, isAr = true }: {
  isOpen: boolean; onClose: () => void; properties: Property[]; isAr?: boolean;
  onSave: (order: ERPConstructionPurchaseOrder) => Promise<void>;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [orderId, setOrderId] = useState(generateUUID);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) { setPropertyId(properties[0]?.id || ''); setSupplier(''); setDescription(''); setAmount(''); setError(''); setOrderId(generateUUID()); }
  }, [isOpen, properties]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!propertyId || !supplier.trim() || !description.trim() || !D(amount || 0).gt(0)) { setError(isAr ? 'اختر المشروع وأدخل المورد ووصف الطلب ومبلغاً موجباً.' : 'Select a project and enter supplier, description and positive amount.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ order_id: orderId, property_id: propertyId, supplier_name: supplier.trim(), description: description.trim(), amount_egp: D(amount).toFixed(2), order_date: date, status: 'DRAFT' });
      toast.success(isAr ? 'تم حفظ مسودة أمر الشراء' : 'Purchase order draft saved'); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : (isAr ? 'تعذر حفظ أمر الشراء. أعد المحاولة.' : 'Unable to save. Try again.')); }
    finally { setSaving(false); }
  };
  return <ZFModalShell isOpen={isOpen} onClose={onClose} isAr={isAr} maxWidth="580px" icon={<FileText size={18} />} title={isAr ? 'أمر شراء جديد' : 'New Purchase Order'} subtitle={isAr ? 'مسودة طلب توريد • لا تدخل في التكاليف أو المستحقات قبل إثبات الفاتورة' : 'Supply order draft • Excluded from WIP and payables until invoiced'}>
    <form className={styles.form} onSubmit={submit}>
      <label>{isAr ? 'المشروع' : 'Project'}<select value={propertyId} onChange={event => setPropertyId(event.target.value)} required autoFocus><option value="">{isAr ? 'اختر المشروع' : 'Select project'}</option>{properties.map(property => <option value={property.id} key={property.id}>{isAr ? property.title_ar : property.title_en}</option>)}</select></label>
      <label>{isAr ? 'المورد' : 'Supplier'}<input value={supplier} onChange={event => setSupplier(event.target.value)} required maxLength={200} /></label>
      <label>{isAr ? 'الأصناف / نطاق التوريد' : 'Items / scope of supply'}<textarea value={description} onChange={event => setDescription(event.target.value)} required maxLength={2000} rows={3} /></label>
      <div className={styles.row}><label>{isAr ? 'القيمة المتوقعة (ج.م)' : 'Expected amount (EGP)'}<input type="number" dir="ltr" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required /></label><label>{isAr ? 'تاريخ الطلب' : 'Order date'}<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button type="button" onClick={onClose} disabled={saving}>{isAr ? 'إلغاء' : 'Cancel'}</button><button type="submit" disabled={saving || !properties.length}>{saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ مسودة أمر الشراء' : 'Save Purchase Order Draft')}</button></div>
    </form>
  </ZFModalShell>;
}
