'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  HardHat,
  ReceiptText,
  Smartphone,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

import { GeneralLedgerEngine, resolvePeriodForDate } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import {
  buildConstructionExpenseJournalLines,
  createDirectConstructionExpense,
  type ConstructionExpensePaymentSource
} from '@/lib/erp/propertyCostEngine';
import {
  type ERPAccountingPeriod,
  type ERPJournalEntry,
  type ERPPropertyCostItem,
  type PropertyCostCategory,
  type PropertyLifecyclePhase
} from '@/lib/erp/types';
import type { Property } from '@/lib/supabase/types';
import {
  zfForm,
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  type ZFChoiceOption,
  ZFFacts,
  ZFEffect,
  ZFJournalPeek,
  ZFFormFooter
} from '../common/ZFForm';
import { ZFModalShell } from '../common/ZFModalShell';
import { ZFSegmented } from '../common/ZFPageHeader';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './ZFDirectExpenseModal.module.css';

export interface ZFDirectExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr?: boolean;
  properties: Property[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  onSaveEntry: (entry: ERPJournalEntry, costItem: ERPPropertyCostItem) => Promise<void>;
  initialPropertyId?: string;
  purpose?: 'claim' | 'site';
  initialPaymentSource?: ConstructionExpensePaymentSource;
}

export type StrictPaymentMethod = 'CASH_101000' | 'INSTAPAY_102000' | 'DEFERRED_201000';

const ACCOUNT_NAMES: Record<string, { ar: string; en: string }> = {
  '101000': { ar: 'الخزينة الرئيسية', en: 'Main Treasury' },
  '102000': { ar: 'حساب إنستاباي البنكي', en: 'InstaPay Account' },
  '201000': { ar: 'موردون ومقاولون', en: 'Accounts Payable' },
  '151000': { ar: 'خرسانات وهيكل إنشائي', en: 'Civil & Structure' },
  '152000': { ar: 'كهروميكانيك وتأسيسات', en: 'MEP Infrastructure' },
  '153000': { ar: 'تشطيبات وتجهيزات', en: 'Finishing & Fit-out' },
  '150000': { ar: 'حصة وتكاليف الأرض', en: 'Land Allocation' },
  '154000': { ar: 'تراخيص وإشراف هندسي', en: 'Permits & Engineering' },
  '155000': { ar: 'مصنعيات ومقاولو باطن', en: 'Labor & Subcontractors' },
  '156000': { ar: 'ضرائب ورسوم إنشائية', en: 'Construction Taxes & Fees' }
};

export const ZFDirectExpenseModal: React.FC<ZFDirectExpenseModalProps> = ({
  isOpen,
  onClose,
  isAr = true,
  properties,
  activePeriod,
  periods,
  onSaveEntry,
  initialPropertyId,
  purpose,
  initialPaymentSource = '101000'
}) => {
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<'claim' | 'site'>(purpose ?? 'site');

  // Fields State
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [category, setCategory] = useState<PropertyCostCategory>('civil_structure');
  const [phase, setPhase] = useState<PropertyLifecyclePhase>('structural_skeleton');

  const [itemName, setItemName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('مقطوعية');

  const initialMethod: StrictPaymentMethod =
    kind === 'site'
      ? (initialPaymentSource === '102000' ? 'INSTAPAY_102000' : 'CASH_101000')
      : (initialPaymentSource === '201000' ? 'DEFERRED_201000' : initialPaymentSource === '102000' ? 'INSTAPAY_102000' : 'CASH_101000');

  const [paymentMethod, setPaymentMethod] = useState<StrictPaymentMethod>(initialMethod);
  const [instapayRef, setInstapayRef] = useState('');
  const [scheduleNow, setScheduleNow] = useState(false);
  const [downPayment, setDownPayment] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [frequencyMonths, setFrequencyMonths] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [keepOpen, setKeepOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetPeriod = useMemo(() => {
    return resolvePeriodForDate(entryDate, periods || [activePeriod], activePeriod);
  }, [entryDate, periods, activePeriod]);
  const isTargetPeriodLocked = targetPeriod.status !== 'OPEN';

  const underConstructionProperties = useMemo(() => {
    const active = properties.filter(property =>
      property.completion_status === 'off_plan' ||
      property.type === 'building' ||
      property.building_units?.some(unitItem => unitItem.status !== 'contracted')
    );
    return active.length > 0 ? active : properties;
  }, [properties]);

  const money = (x: number | string | Decimal) => {
    const n = typeof x === 'number' ? x : Number(x.toString()) || 0;
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP');
  };

  const handleKindChange = (nextKind: 'claim' | 'site') => {
    setKind(nextKind);
    if (nextKind === 'site' && paymentMethod === 'DEFERRED_201000') {
      setPaymentMethod('CASH_101000');
    }
  };

  const resetEntryFields = () => {
    setItemName('');
    setSupplier('');
    setInvoiceRef('');
    setAmount('');
    setQuantity('1');
    setUnit('مقطوعية');
    setNotes('');
    setDownPayment('');
    setInstapayRef('');
    setScheduleNow(false);
    setTimeout(() => amountInputRef.current?.focus(), 50);
  };

  const prevIsOpenRef = useRef(false);
  const resetPropsRef = useRef({
    underConstructionProperties,
    initialPropertyId,
    initialPaymentSource,
    purpose
  });

  useEffect(() => {
    resetPropsRef.current = {
      underConstructionProperties,
      initialPropertyId,
      initialPaymentSource,
      purpose
    };
  });

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    if (!prevIsOpenRef.current) {
      const resetTimer = window.setTimeout(() => {
        prevIsOpenRef.current = true;
        const {
          underConstructionProperties: curProps,
          initialPropertyId: curPropId,
          initialPaymentSource: curSource,
          purpose: curPurpose
        } = resetPropsRef.current;
        const nextKind = curPurpose ?? 'site';
        setKind(nextKind);
        setPropertyId(curPropId || curProps[0]?.id || '');
        setPaymentMethod(
          nextKind === 'site'
            ? (curSource === '102000' ? 'INSTAPAY_102000' : 'CASH_101000')
            : (curSource === '201000' ? 'DEFERRED_201000' : curSource === '102000' ? 'INSTAPAY_102000' : 'CASH_101000')
        );
        setScheduleNow(false);
        resetEntryFields();
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  const total = D(amount || 0);
  const down = paymentMethod === 'DEFERRED_201000' && scheduleNow ? D(downPayment || 0) : D(0);
  const remaining = Decimal.max(0, total.minus(down));
  const installmentValue = remaining.dividedBy(Math.max(1, parseInt(installmentsCount, 10) || 1));

  const property = properties.find(candidate => candidate.id === propertyId);
  const propertyTitle = property ? (isAr ? property.title_ar : property.title_en) : propertyId;

  const paymentOptions = useMemo(() => {
    const opts: ZFChoiceOption<StrictPaymentMethod>[] = [
      {
        id: 'CASH_101000',
        label: kind === 'site' ? (isAr ? 'نقداً' : 'Cash') : (isAr ? 'نقداً الآن' : 'Cash now'),
        sub: isAr ? 'من الخزينة' : 'From the safe',
        icon: <Wallet size={16} />
      },
      {
        id: 'INSTAPAY_102000',
        label: kind === 'site' ? (isAr ? 'إنستاباي' : 'InstaPay') : (isAr ? 'إنستاباي الآن' : 'InstaPay now'),
        sub: isAr ? 'من حساب إنستاباي' : 'From InstaPay',
        icon: <Smartphone size={16} />
      }
    ];
    if (kind === 'claim') {
      opts.push({
        id: 'DEFERRED_201000',
        label: isAr ? 'لاحقاً' : 'Later',
        sub: isAr ? 'يُسجل مستحقاً للمقاول' : 'Recorded as owed to the contractor',
        icon: <Clock size={16} />
      });
    }
    return opts;
  }, [kind, isAr]);

  const memoPreview = useMemo(() => {
    const parts = [
      itemName.trim() || (isAr ? 'مصروف بناء' : 'Construction expense'),
      propertyTitle ? `${isAr ? 'مشروع' : 'Project'}: ${propertyTitle}` : '',
      supplier.trim() ? `${kind === 'claim' ? (isAr ? 'المقاول' : 'Contractor') : (isAr ? 'المورد/المحل' : 'Supplier')}: ${supplier.trim()}` : '',
      invoiceRef.trim() ? `${isAr ? 'مرجع' : 'Ref'}: ${invoiceRef.trim()}` : '',
      paymentMethod === 'INSTAPAY_102000'
        ? (instapayRef.trim() ? `[إنستاباي: ${instapayRef.trim()}]` : '[إنستاباي / InstaPay]')
        : paymentMethod === 'CASH_101000'
          ? '[كاش بالخزينة]'
          : '[آجل على المورد]'
    ];
    return parts.filter(Boolean).join(' • ');
  }, [itemName, propertyTitle, supplier, kind, invoiceRef, paymentMethod, instapayRef, isAr]);

  const journalLines = useMemo(() => {
    const tot = D(amount || 0);
    if (!tot.gt(0)) return [];
    try {
      const paymentSource: ConstructionExpensePaymentSource =
        paymentMethod === 'DEFERRED_201000'
          ? '201000'
          : paymentMethod === 'INSTAPAY_102000'
            ? '102000'
            : '101000';
      const dwn = paymentMethod === 'DEFERRED_201000' && scheduleNow ? D(downPayment || 0) : D(0);
      const lines = buildConstructionExpenseJournalLines({
        category,
        totalAmount: tot.toFixed(2),
        paymentSource,
        downPayment: dwn.toFixed(2),
        downPaymentSource: '101000',
        memo: memoPreview
      });
      return lines.map(line => {
        const code = line.account_code;
        const meta = ACCOUNT_NAMES[code];
        const name = (isAr ? meta?.ar : meta?.en) || line.memo || '';
        return {
          code,
          name,
          debit: Number(line.debit_amount) > 0 ? line.debit_amount : undefined,
          credit: Number(line.credit_amount) > 0 ? line.credit_amount : undefined
        };
      });
    } catch {
      return [];
    }
  }, [amount, category, paymentMethod, scheduleNow, downPayment, memoPreview, isAr]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const quantityValue = Number(quantity);
    const downPaymentValue = D(downPayment || 0);

    // 1. Property validation
    if (!propertyId) {
      toast.error(isAr ? 'يرجى اختيار المشروع العقاري' : 'Select a target property');
      return;
    }
    // 2. Date validation
    if (!entryDate) {
      toast.error(isAr ? 'يرجى إدخال تاريخ الفاتورة' : 'Enter bill date');
      return;
    }
    // 3. Locked period validation
    if (isTargetPeriodLocked) {
      toast.error(
        isAr
          ? `الفترة المحاسبية لهذا التاريخ مقفلة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
          : `Fiscal period is locked (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
      );
      return;
    }
    // 4. Supplier required for claim
    if (kind === 'claim' && !supplier.trim()) {
      toast.error(isAr ? 'أدخل اسم المقاول للمستخلص' : 'Enter the contractor name');
      return;
    }
    // 5. Description validation
    if (!itemName.trim()) {
      toast.error(isAr ? 'يرجى إدخال بيان البند أو خامته' : 'Enter item description');
      return;
    }
    // 6. Amount validation
    if (!total.gt(0)) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح أكبر من صفر' : 'Enter an amount greater than zero');
      return;
    }
    // 7. Quantity validation
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      toast.error(isAr ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero');
      return;
    }
    // 8. Due date validation for deferred
    if (paymentMethod === 'DEFERRED_201000' && !firstDueDate) {
      toast.error(isAr ? 'يرجى تحديد تاريخ استحقاق الفاتورة' : 'Specify invoice due date');
      return;
    }
    // 9. Down payment negative check
    if (paymentMethod === 'DEFERRED_201000' && scheduleNow && downPaymentValue.lt(0)) {
      toast.error(isAr ? 'الدفعة المقدمة لا يمكن أن تكون قيمة سالبة' : 'Down payment cannot be negative');
      return;
    }
    // 10. Down payment >= total check
    if (paymentMethod === 'DEFERRED_201000' && scheduleNow && downPaymentValue.gte(total)) {
      toast.error(isAr ? 'الدفعة المقدمة يجب أن تكون أقل من إجمالي الفاتورة' : 'Down payment must be less than the invoice total');
      return;
    }

    const paymentSource: ConstructionExpensePaymentSource =
      paymentMethod === 'DEFERRED_201000' ? '201000' : paymentMethod === 'INSTAPAY_102000' ? '102000' : '101000';

    const normalizedAmount = total.toFixed(2);
    const normalizedDownPayment = paymentMethod === 'DEFERRED_201000' && scheduleNow
      ? downPaymentValue.toFixed(2)
      : '0.00';

    const memoParts = [
      itemName.trim(),
      propertyTitle ? `${isAr ? 'مشروع' : 'Project'}: ${propertyTitle}` : '',
      supplier.trim() ? `${kind === 'claim' ? (isAr ? 'المقاول' : 'Contractor') : (isAr ? 'المورد/المقاول' : 'Supplier')}: ${supplier.trim()}` : '',
      invoiceRef.trim() ? `${isAr ? 'مرجع' : 'Ref'}: ${invoiceRef.trim()}` : '',
      paymentMethod === 'INSTAPAY_102000'
        ? (instapayRef.trim() ? `[إنستاباي: ${instapayRef.trim()}]` : '[إنستاباي / InstaPay]')
        : paymentMethod === 'CASH_101000'
          ? '[كاش بالخزينة]'
          : '[آجل على المورد]'
    ];
    const memo = memoParts.filter(Boolean).join(' • ');

    const finalNotes = [
      notes.trim(),
      paymentMethod === 'INSTAPAY_102000' && instapayRef.trim() ? `مرجع إنستاباي: ${instapayRef.trim()}` : ''
    ].filter(Boolean).join(' | ');

    setIsSubmitting(true);
    try {
      const costItem = createDirectConstructionExpense({
        propertyId,
        category,
        phase,
        itemName: itemName.trim(),
        supplier: supplier.trim(),
        invoiceRef: invoiceRef.trim(),
        totalAmount: normalizedAmount,
        paymentSource,
        scheduleNow: paymentMethod === 'DEFERRED_201000' && scheduleNow,
        downPayment: normalizedDownPayment,
        numberOfInstallments: parseInt(installmentsCount, 10) || 1,
        firstDueDate,
        frequencyMonths: parseInt(frequencyMonths, 10) || 1,
        quantity: quantityValue,
        unit,
        notes: [`[FIN_OS_SECTION:${kind === 'claim' ? 'contractors' : 'site'}]`, finalNotes].filter(Boolean).join(' | '),
        loggedDate: entryDate,
        loggedBy: 'CFO_FARID'
      });

      const lines = buildConstructionExpenseJournalLines({
        category,
        totalAmount: normalizedAmount,
        paymentSource,
        downPayment: normalizedDownPayment,
        downPaymentSource: '101000',
        memo
      });

      const entryNumber = `JE-WIP-${costItem.item_id.slice(0, 8).toUpperCase()}`;
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: entryNumber,
        entry_date: entryDate,
        period: targetPeriod,
        description: memo,
        source_module: 'WIP_ALLOCATION',
        source_entity_id: propertyId,
        created_by: 'CFO_FARID',
        lines: lines.map(line => ({
          ...line,
          unit_id: propertyTitle || undefined
        }))
      });

      await onSaveEntry(entry, costItem);
      toast.success(isAr ? 'تم حفظ الفاتورة وتحديث تكلفة المشروع والمستحقات بنجاح' : 'Bill saved and project costs updated');

      if (keepOpen) {
        resetEntryFields();
      } else {
        onClose();
      }
    } catch (error) {
      toast.error(isAr ? 'تعذر حفظ الفاتورة وتحديث تكلفة المشروع' : 'Failed to save the bill and update project costs', {
        description: error instanceof Error ? error.message : undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEffect = () => {
    if (isTargetPeriodLocked) {
      return (
        <ZFEffect tone="danger">
          {isAr
            ? `الفترة المحاسبية لهذا التاريخ مقفلة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
            : `Fiscal period is closed (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`}
        </ZFEffect>
      );
    }
    if (!total.gt(0)) {
      return (
        <ZFEffect>
          {isAr ? 'أدخل المبلغ لمعرفة ما سيُسجل.' : 'Enter an amount to see what will be recorded.'}
        </ZFEffect>
      );
    }
    if (paymentMethod === 'CASH_101000') {
      return (
        <ZFEffect>
          {isAr ? (
            <>
              سيُضاف <strong>{money(total)}</strong> لتكلفة <strong>{propertyTitle}</strong> ويُخصم من الخزينة.
            </>
          ) : (
            <>
              <strong>{money(total)}</strong> will be added to the cost of <strong>{propertyTitle}</strong> and paid from the safe.
            </>
          )}
        </ZFEffect>
      );
    }
    if (paymentMethod === 'INSTAPAY_102000') {
      return (
        <ZFEffect>
          {isAr ? (
            <>
              سيُضاف <strong>{money(total)}</strong> لتكلفة <strong>{propertyTitle}</strong> ويُخصم من حساب إنستاباي.
            </>
          ) : (
            <>
              <strong>{money(total)}</strong> will be added to the cost of <strong>{propertyTitle}</strong> and paid from InstaPay.
            </>
          )}
        </ZFEffect>
      );
    }
    if (down.gt(0)) {
      return (
        <ZFEffect>
          {isAr ? (
            <>
              سيُضاف <strong>{money(total)}</strong> لتكلفة <strong>{propertyTitle}</strong>: يُدفع <strong>{money(down)}</strong> الآن من الخزينة والباقي <strong>{money(remaining)}</strong> مستحق للمقاول.
            </>
          ) : (
            <>
              <strong>{money(total)}</strong> will be added to the cost of <strong>{propertyTitle}</strong>: <strong>{money(down)}</strong> paid now from the safe and the remaining <strong>{money(remaining)}</strong> owed to the contractor.
            </>
          )}
        </ZFEffect>
      );
    }
    return (
      <ZFEffect>
        {isAr ? (
          <>
            سيُضاف <strong>{money(total)}</strong> لتكلفة <strong>{propertyTitle}</strong> ويُسجل مستحقاً {supplier.trim() ? <>لـ <strong>{supplier.trim()}</strong> </> : null}بتاريخ {firstDueDate}.
          </>
        ) : (
          <>
            <strong>{money(total)}</strong> will be added to the cost of <strong>{propertyTitle}</strong> and recorded as owed {supplier.trim() ? <>to <strong>{supplier.trim()}</strong> </> : null}due on {firstDueDate}.
          </>
        )}
      </ZFEffect>
    );
  };

  const footer = (
    <ZFFormFooter
      aside={
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={keepOpen}
            onChange={e => setKeepOpen(e.target.checked)}
          />
          <span>{isAr ? 'إضافة بند آخر بعد الحفظ' : 'Add another after saving'}</span>
        </label>
      }
    >
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
        disabled={isSubmitting}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-cost-form"
        className={shellStyles.btnPrimary}
        disabled={isSubmitting || isTargetPeriodLocked}
      >
        {isSubmitting
          ? (isAr ? 'جارٍ الحفظ…' : 'Saving…')
          : kind === 'claim'
            ? (isAr ? 'حفظ المستخلص' : 'Save bill')
            : (isAr ? 'حفظ المصروف' : 'Save expense')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="640px"
      icon={kind === 'claim' ? <HardHat size={18} /> : <ReceiptText size={18} />}
      title={
        purpose === undefined
          ? (isAr ? 'تسجيل تكلفة بناء' : 'Record construction cost')
          : kind === 'claim'
            ? (isAr ? 'مستخلص مقاول' : 'Contractor bill')
            : (isAr ? 'مصروف موقع' : 'Site expense')
      }
      subtitle={
        kind === 'claim'
          ? (isAr ? 'مبلغ لمقاول عن أعمال تمت. يُضاف لتكلفة المشروع ويُدفع الآن أو يُسجل مستحقاً عليه.' : 'Money owed to a contractor for completed work. Added to project cost; paid now or recorded as owed.')
          : (isAr ? 'مشتريات ومصاريف دُفعت في الموقع. تُضاف لتكلفة المشروع وتُخصم من الخزينة أو إنستاباي.' : 'Purchases and costs paid on site. Added to project cost and paid from the safe or InstaPay.')
      }
      isAr={isAr}
      footer={footer}
      closeOnBackdropClick={!isSubmitting}
    >
      <form id="zf-cost-form" className={zfForm.form} onSubmit={handleSubmit}>
        {/* 0. Segmented selector if purpose is undefined */}
        {purpose === undefined && (
          <ZFSegmented
            value={kind}
            onChange={handleKindChange}
            ariaLabel={isAr ? 'النوع' : 'Type'}
            options={[
              { id: 'claim', label: isAr ? 'مستخلص مقاول' : 'Contractor bill', icon: <HardHat size={14} /> },
              { id: 'site', label: isAr ? 'مصروف موقع' : 'Site expense', icon: <ReceiptText size={14} /> }
            ]}
          />
        )}

        {/* 1. Project & Date row */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'المشروع' : 'Project'} required>
            <select
              className={zfForm.control}
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              required
            >
              {underConstructionProperties.map(prop => (
                <option key={prop.id} value={prop.id}>
                  {isAr ? prop.title_ar : prop.title_en}
                </option>
              ))}
            </select>
          </ZFField>

          <ZFField
            label={isAr ? 'التاريخ' : 'Date'}
            required
            error={isTargetPeriodLocked ? (isAr ? 'الفترة المحاسبية لهذا التاريخ مقفلة' : 'This date is in a closed period') : undefined}
          >
            <input
              type="date"
              className={zfForm.control}
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              required
            />
          </ZFField>
        </div>

        {/* 2. Counterparty & Reference row */}
        {kind === 'claim' ? (
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'المقاول' : 'Contractor'} required>
              <input
                className={zfForm.control}
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder={isAr ? 'اسم شركة المقاولات أو المقاول' : 'Contractor name'}
                required
              />
            </ZFField>
            <ZFField label={isAr ? 'رقم المستخلص' : 'Bill no.'}>
              <input
                className={`${zfForm.control} ${zfForm.mono}`}
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                placeholder={isAr ? 'اختياري' : 'Optional'}
              />
            </ZFField>
          </div>
        ) : (
          <div className={zfForm.row}>
            <ZFField label={isAr ? 'المورد أو المحل' : 'Supplier or shop'}>
              <input
                className={zfForm.control}
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder={isAr ? 'اختياري' : 'Optional'}
              />
            </ZFField>
            <ZFField label={isAr ? 'رقم الفاتورة' : 'Invoice no.'}>
              <input
                className={`${zfForm.control} ${zfForm.mono}`}
                value={invoiceRef}
                onChange={e => setInvoiceRef(e.target.value)}
                placeholder={isAr ? 'اختياري' : 'Optional'}
              />
            </ZFField>
          </div>
        )}

        {/* 3. Description field */}
        <ZFField label={isAr ? 'البيان' : 'Description'} required>
          <input
            className={zfForm.control}
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            placeholder={
              kind === 'claim'
                ? (isAr ? 'مثال: مستخلص 3 – خرسانة الدور الثاني' : 'e.g. Bill 3 – 2nd floor concrete')
                : (isAr ? 'مثال: أسمنت ورمل لصبة السقف' : 'e.g. Cement and sand for the roof slab')
            }
            required
          />
        </ZFField>

        {/* 4. Amount & Cost Category row */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'المبلغ' : 'Amount'} required>
            <ZFMoneyInput
              ref={amountInputRef}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              unit={isAr ? 'ج.م' : 'EGP'}
              required
            />
          </ZFField>
          <ZFField label={isAr ? 'البند' : 'Cost type'}>
            <select
              className={zfForm.control}
              value={category}
              onChange={e => setCategory(e.target.value as PropertyCostCategory)}
            >
              <option value="civil_structure">{isAr ? 'خرسانات وحديد ومباني' : 'Structure'}</option>
              <option value="finishing_interior">{isAr ? 'تشطيبات' : 'Finishing'}</option>
              <option value="mep_infrastructure">{isAr ? 'كهرباء وسباكة وتكييف' : 'MEP'}</option>
              <option value="land_allocation">{isAr ? 'الأرض' : 'Land'}</option>
              <option value="permits_engineering">{isAr ? 'تراخيص وتصميم وإشراف' : 'Permits & design'}</option>
              <option value="labor_subcontractor">{isAr ? 'مصنعيات' : 'Labour'}</option>
              <option value="taxes_fees">{isAr ? 'ضرائب ورسوم' : 'Taxes & fees'}</option>
            </select>
          </ZFField>
        </div>

        {/* 5. Stage field */}
        <ZFField label={isAr ? 'مرحلة التنفيذ' : 'Stage'}>
          <select
            className={zfForm.control}
            value={phase}
            onChange={e => setPhase(e.target.value as PropertyLifecyclePhase)}
          >
            <option value="planning_permits">{isAr ? 'التخطيط والتراخيص' : 'Planning & Permits'}</option>
            <option value="excavation_foundation">{isAr ? 'الحفر والأساسات' : 'Excavation & Foundations'}</option>
            <option value="structural_skeleton">{isAr ? 'الهيكل والصبات والأسقف' : 'Structural Skeleton'}</option>
            <option value="masonry_roughing">{isAr ? 'المباني والتأسيسات' : 'Masonry & Roughing'}</option>
            <option value="finishing_interiors">{isAr ? 'التشطيبات والدهانات' : 'Finishing & Painting'}</option>
            <option value="final_inspection_handover">{isAr ? 'المعاينة والتسليم' : 'Inspection & Handover'}</option>
          </select>
        </ZFField>

        {/* 6. Payment method choices */}
        <ZFField label={kind === 'claim' ? (isAr ? 'الدفع' : 'Payment') : (isAr ? 'دُفع من' : 'Paid from')}>
          <ZFChoices
            value={paymentMethod}
            onChange={val => setPaymentMethod(val as StrictPaymentMethod)}
            options={paymentOptions}
          />
        </ZFField>

        {/* 7. Conditional payment method details */}
        {paymentMethod === 'INSTAPAY_102000' && (
          <ZFField label={isAr ? 'رقم عملية إنستاباي' : 'InstaPay reference'}>
            <input
              className={`${zfForm.control} ${zfForm.mono}`}
              value={instapayRef}
              onChange={e => setInstapayRef(e.target.value)}
              placeholder="e.g. IPN-98471203"
            />
          </ZFField>
        )}

        {paymentMethod === 'DEFERRED_201000' && (
          <>
            <ZFField label={isAr ? 'تاريخ الاستحقاق' : 'Due date'} required>
              <input
                type="date"
                className={zfForm.control}
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                required
              />
            </ZFField>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={scheduleNow}
                onChange={e => setScheduleNow(e.target.checked)}
              />
              <span>{isAr ? 'تقسيط المبلغ على دفعات' : 'Split into installments'}</span>
            </label>

            {scheduleNow && (
              <>
                <div className={zfForm.row3}>
                  <ZFField
                    label={isAr ? 'دفعة مقدمة' : 'Down payment'}
                    hint={isAr ? 'تُدفع الآن من الخزينة' : 'Paid now from the safe'}
                  >
                    <ZFMoneyInput
                      value={downPayment}
                      onChange={e => setDownPayment(e.target.value)}
                      placeholder="0.00"
                      unit={isAr ? 'ج.م' : 'EGP'}
                    />
                  </ZFField>
                  <ZFField label={isAr ? 'عدد الدفعات' : 'Installments'}>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className={zfForm.control}
                      value={installmentsCount}
                      onChange={e => setInstallmentsCount(e.target.value)}
                    />
                  </ZFField>
                  <ZFField label={isAr ? 'كل' : 'Every'}>
                    <select
                      className={zfForm.control}
                      value={frequencyMonths}
                      onChange={e => setFrequencyMonths(e.target.value)}
                    >
                      <option value="1">{isAr ? 'شهر' : 'month'}</option>
                      <option value="2">{isAr ? 'شهرين' : '2 months'}</option>
                      <option value="3">{isAr ? '3 شهور' : '3 months'}</option>
                    </select>
                  </ZFField>
                </div>

                <ZFFacts
                  items={[
                    { label: isAr ? 'قيمة كل دفعة' : 'Each installment', value: money(installmentValue) },
                    { label: isAr ? 'الباقي بعد المقدم' : 'Balance after down payment', value: money(remaining) }
                  ]}
                />
              </>
            )}
          </>
        )}

        {/* 8. Notes */}
        <ZFField label={isAr ? 'ملاحظات' : 'Notes'}>
          <textarea
            className={zfForm.control}
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات اختيارية...' : 'Optional notes...'}
          />
        </ZFField>

        {/* 9. Effect */}
        {renderEffect()}

        {/* 10. Journal peek */}
        {total.gt(0) && journalLines.length > 0 && (
          <ZFJournalPeek isAr={isAr} lines={journalLines} />
        )}
      </form>
    </ZFModalShell>
  );
};
