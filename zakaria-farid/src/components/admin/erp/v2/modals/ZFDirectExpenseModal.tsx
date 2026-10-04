'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileCheck,
  HardHat,
  Hammer,
  Layers,
  Loader2,
  Paintbrush,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  WalletCards,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

import { GeneralLedgerEngine, resolvePeriodForDate } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import {
  buildConstructionExpenseJournalLines,
  createDirectConstructionExpense,
  type ConstructionExpensePaymentSource
} from '@/lib/erp/propertyCostEngine';
import { tafqeetEGP, tafqeetNumber } from '@/lib/erp/tafqeet';
import {
  type ERPAccountingPeriod,
  type ERPJournalEntry,
  type ERPPropertyCostItem,
  type PropertyCostCategory,
  type PropertyLifecyclePhase
} from '@/lib/erp/types';
import type { Property } from '@/lib/supabase/types';
import { ZFCustomSelect, type ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
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

export type StrictPaymentMethod = 'CASH_101000' | 'INSTAPAY_101000' | 'DEFERRED_201000';

interface ExpenseSuccessData {
  amount: string;
  itemName: string;
  propertyTitle: string;
}


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

  // Stepper State (Step 1, 2, 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Project & Category State
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [category, setCategory] = useState<PropertyCostCategory>('civil_structure');
  const [phase, setPhase] = useState<PropertyLifecyclePhase>('structural_skeleton');

  // Step 2: Item Details & Value State
  const [itemName, setItemName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('مقطوعية');

  // Step 3: Payment Method & Schedule State
  const initialMethod: StrictPaymentMethod = initialPaymentSource === '201000' ? 'DEFERRED_201000' : 'CASH_101000';
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
  const [success, setSuccess] = useState<ExpenseSuccessData | null>(null);

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

  const prevIsOpenRef = useRef(false);
  const resetPropsRef = useRef({
    underConstructionProperties,
    initialPropertyId,
    initialPaymentSource
  });

  useEffect(() => {
    resetPropsRef.current = {
      underConstructionProperties,
      initialPropertyId,
      initialPaymentSource
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
          initialPaymentSource: curSource
        } = resetPropsRef.current;
        setPropertyId(curPropId || curProps[0]?.id || '');
        setPaymentMethod(curSource === '201000' ? 'DEFERRED_201000' : 'CASH_101000');
        setScheduleNow(false);
        setCurrentStep(1);
        setSuccess(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
  }, [isOpen]);

  const propertyItems: ZFCustomSelectItem[] = useMemo(() => underConstructionProperties.map(property => ({
    value: property.id,
    labelAr: property.title_ar,
    labelEn: property.title_en,
    sublabelAr: [property.location, property.area_sqm ? `${property.area_sqm} م²` : null].filter(Boolean).join(' • '),
    sublabelEn: [property.location, property.area_sqm ? `${property.area_sqm} sqm` : null].filter(Boolean).join(' • '),
    icon: property.completion_status === 'off_plan' ? HardHat : Building2
  })), [underConstructionProperties]);

  // Comprehensive categories covering: land, structure, finishing, mep, permits, labor, other
  const categoryItems: ZFCustomSelectItem[] = useMemo(() => [
    { value: 'civil_structure', labelAr: 'خرسانات وحديد ومباني (Structure)', labelEn: 'Civil & Structure', sublabelAr: 'مواد وهيكل إنشائي خرساني', sublabelEn: 'Concrete & steel structure', icon: HardHat },
    { value: 'finishing_interior', labelAr: 'تشطيبات وديكور معماري (Finishing)', labelEn: 'Finishing & Interiors', sublabelAr: 'سيراميك، دهانات، رخام، نجارة', sublabelEn: 'Fit-out, tiles, paints', icon: Paintbrush },
    { value: 'mep_infrastructure', labelAr: 'كهروميكانيك وتأسيسات (MEP)', labelEn: 'MEP Infrastructure', sublabelAr: 'كهرباء، سباكة، مصاعد، وعوازل', sublabelEn: 'Electrical, plumbing, elevators', icon: Zap },
    { value: 'land_allocation', labelAr: 'حصة وتكاليف الأرض (Land)', labelEn: 'Land Allocation', sublabelAr: 'تكاليف تخصيص وتجهيز الأرض', sublabelEn: 'Land cost & site prep', icon: Building2 },
    { value: 'permits_engineering', labelAr: 'تراخيص ومخططات واستشارات (Permits)', labelEn: 'Permits & Engineering', sublabelAr: 'رخص بناء وإشراف هندسي ومساحة', sublabelEn: 'Permits & engineering supervision', icon: FileCheck },
    { value: 'labor_subcontractor', labelAr: 'مصنعيات ومقاولو باطن (Labor)', labelEn: 'Labor & Subcontractors', sublabelAr: 'أجور تنفيذ ومصنعيات موقع', sublabelEn: 'Labor & execution works', icon: Hammer },
    { value: 'taxes_fees', labelAr: 'ضرائب ورسوم إنشائية (Other / Taxes)', labelEn: 'Construction Taxes & Fees', sublabelAr: 'ضرائب ورسوم حكومية وأخرى', sublabelEn: 'Governmental fees & taxes', icon: ReceiptText }
  ], []);

  const phaseItems: ZFCustomSelectItem[] = useMemo(() => [
    { value: 'planning_permits', labelAr: 'التخطيط والتراخيص', labelEn: 'Planning & Permits', icon: FileCheck },
    { value: 'excavation_foundation', labelAr: 'الحفر والأساسات', labelEn: 'Excavation & Foundations', icon: Layers },
    { value: 'structural_skeleton', labelAr: 'الهيكل والصبات والأسقف', labelEn: 'Structural Skeleton', icon: HardHat },
    { value: 'masonry_roughing', labelAr: 'المباني والتأسيسات', labelEn: 'Masonry & Roughing', icon: Hammer },
    { value: 'finishing_interiors', labelAr: 'التشطيبات والدهانات', labelEn: 'Finishing & Painting', icon: Paintbrush },
    { value: 'final_inspection_handover', labelAr: 'المعاينة والتسليم', labelEn: 'Inspection & Handover', icon: CheckCircle2 }
  ], []);

  const total = D(amount || 0);
  const down = paymentMethod === 'DEFERRED_201000' && scheduleNow ? D(downPayment || 0) : D(0);
  const remaining = Decimal.max(0, total.minus(down));
  const installmentValue = remaining.dividedBy(Math.max(1, parseInt(installmentsCount, 10) || 1));

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
    setSuccess(null);
    setCurrentStep(1);
  };

  const handleStepNext = () => {
    if (currentStep === 1) {
      if (!propertyId) {
        toast.error(isAr ? 'يرجى اختيار المشروع العقاري' : 'Select a target property');
        return;
      }
      if (!entryDate) {
        toast.error(isAr ? 'يرجى إدخال تاريخ الفاتورة' : 'Enter bill date');
        return;
      }
      if (isTargetPeriodLocked) {
        toast.error(
          isAr
            ? `الفترة المحاسبية لهذا التاريخ مقفلة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
            : `Fiscal period is locked (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
        );
        return;
      }
      setCurrentStep(2);
      setTimeout(() => amountInputRef.current?.focus(), 50);
    } else if (currentStep === 2) {
      if (purpose === 'claim' && !supplier.trim()) {
        toast.error(isAr ? 'أدخل اسم المقاول للمستخلص' : 'Enter the contractor name');
        return;
      }
      if (!itemName.trim()) {
        toast.error(isAr ? 'يرجى إدخال بيان البند أو خامته' : 'Enter item description');
        return;
      }
      if (!total.gt(0)) {
        toast.error(isAr ? 'يرجى إدخال مبلغ صحيح أكبر من صفر' : 'Enter an amount greater than zero');
        return;
      }
      const q = Number(quantity);
      if (!Number.isFinite(q) || q <= 0) {
        toast.error(isAr ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentStep !== 3) {
      handleStepNext();
      return;
    }

    const quantityValue = Number(quantity);
    const downPaymentValue = D(downPayment || 0);

    if (!propertyId) {
      toast.error(isAr ? 'يرجى اختيار المشروع العقاري' : 'Select a target property');
      setCurrentStep(1);
      return;
    }
    if (!itemName.trim() || !total.gt(0)) {
      toast.error(isAr ? 'يرجى استكمال بيانات البند والقيمة' : 'Complete item details and amount');
      setCurrentStep(2);
      return;
    }
    if (paymentMethod === 'DEFERRED_201000' && !firstDueDate) {
      toast.error(isAr ? 'يرجى تحديد تاريخ استحقاق الفاتورة' : 'Specify invoice due date');
      return;
    }
    if (paymentMethod === 'DEFERRED_201000' && scheduleNow && downPaymentValue.lt(0)) {
      toast.error(isAr ? 'الدفعة المقدمة لا يمكن أن تكون قيمة سالبة' : 'Down payment cannot be negative');
      return;
    }
    if (paymentMethod === 'DEFERRED_201000' && scheduleNow && downPaymentValue.gte(total)) {
      toast.error(isAr ? 'الدفعة المقدمة يجب أن تكون أقل من إجمالي الفاتورة' : 'Down payment must be less than the invoice total');
      return;
    }
    if (isTargetPeriodLocked) {
      toast.error(
        isAr
          ? `الفترة المحاسبية (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) مقفلة بموجب المعيار Invariant 0.9`
          : `Fiscal period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) is ${targetPeriod.status}`
      );
      return;
    }

    // Map strict payment method to accounting payment source
    const paymentSource: ConstructionExpensePaymentSource =
      paymentMethod === 'DEFERRED_201000' ? '201000' : paymentMethod === 'INSTAPAY_101000' ? '102000' : '101000';

    const property = properties.find(candidate => candidate.id === propertyId);
    const propertyTitle = property ? (isAr ? property.title_ar : property.title_en) : propertyId;
    const normalizedAmount = total.toFixed(2);
    const normalizedDownPayment = paymentMethod === 'DEFERRED_201000' && scheduleNow
      ? downPaymentValue.toFixed(2)
      : '0.00';

    const memoParts = [
      itemName.trim(),
      propertyTitle ? `${isAr ? 'مشروع' : 'Project'}: ${propertyTitle}` : '',
      supplier.trim() ? `${isAr ? 'المورد/المقاول' : 'Supplier'}: ${supplier.trim()}` : '',
      invoiceRef.trim() ? `${isAr ? 'مرجع' : 'Ref'}: ${invoiceRef.trim()}` : '',
      paymentMethod === 'INSTAPAY_101000'
        ? (instapayRef.trim() ? `[إنستاباي: ${instapayRef.trim()}]` : '[إنستاباي / InstaPay]')
        : paymentMethod === 'CASH_101000'
          ? '[كاش بالخزينة]'
          : '[آجل على المورد]'
    ];
    const memo = memoParts.filter(Boolean).join(' • ');

    const finalNotes = [
      notes.trim(),
      paymentMethod === 'INSTAPAY_101000' && instapayRef.trim() ? `مرجع إنستاباي: ${instapayRef.trim()}` : ''
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
        notes: [purpose ? `[FIN_OS_SECTION:${purpose === 'claim' ? 'contractors' : 'site'}]` : '', finalNotes].filter(Boolean).join(' | '),
        loggedDate: entryDate,
        loggedBy: 'CFO_FARID'
      });

      // Strict posting: Treasury (101000) or Accounts Payable (201000)
      const journalLines = buildConstructionExpenseJournalLines({
        category,
        totalAmount: normalizedAmount,
        paymentSource,
        downPayment: normalizedDownPayment,
        downPaymentSource: '101000', // Strictly Treasury Account 101000
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
        lines: journalLines.map(line => ({
          ...line,
          unit_id: propertyTitle || undefined
        }))
      });

      await onSaveEntry(entry, costItem);
      setSuccess({ amount: normalizedAmount, itemName: itemName.trim(), propertyTitle });
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

  const selectedCategory = categoryItems.find(item => item.value === category);
  const categoryLabel = isAr ? selectedCategory?.labelAr : selectedCategory?.labelEn;

  const postingSummary = paymentMethod === 'CASH_101000'
    ? (isAr
        ? `تُحمّل ${categoryLabel} على تكلفة المشروع (حساب 151000)، ويُصرف المبلغ فوراً من الخزينة الرئيسية (حساب 101000).`
        : `${categoryLabel} is debited to project WIP and credited to physical treasury cash (101000).`)
    : paymentMethod === 'INSTAPAY_101000'
      ? (isAr
          ? `تُحمّل ${categoryLabel} على تكلفة المشروع (حساب 151000)، ويُسدد فورياً بتحويل إنستاباي من الحساب البنكي (حساب 102000).`
          : `${categoryLabel} is debited to project WIP and paid instantly by InstaPay from the bank account (102000).`)
      : down.gt(0)
        ? (isAr
            ? `تُحمّل ${categoryLabel} على تكلفة المشروع؛ تُخصم الدفعة المقدمة من الخزينة الرئيسية (101000) ويُسجل الباقي كالتزام مستحق للمورد (201000).`
            : `${categoryLabel} is added to project WIP; down payment comes from treasury (101000) and balance is credited to AP (201000).`)
        : (isAr
            ? `تُحمّل ${categoryLabel} على تكلفة المشروع، ويُسجل كامل المبلغ كالتزام مستحق للمورد (حساب 201000).`
            : `${categoryLabel} is added to project WIP and the full amount is credited to AP (201000).`);


  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={purpose === 'claim' ? (isAr ? 'قيد مستخلص مقاول' : 'Record Contractor Claim') : purpose === 'site' ? (isAr ? 'تسجيل مصروف موقع' : 'Record Site Expense') : (isAr ? 'تسجيل فاتورة ومصروف إنشائي' : 'Record Construction Bill & Expense')}
      subtitle={isAr ? 'نظام FIN-OS الإداري المالي • مسار تدقيق المشروع، القيمة، وطرق السداد المعتمدة' : 'FIN-OS Financial Management • 3-Step Project Bill & Payment Wizard'}
      icon={<ReceiptText size={18} />}
      headerExtra={
        <span className={styles.periodPill}>
          {targetPeriod.status === 'OPEN'
            ? `${isAr ? 'فترة مفتوحة' : 'Open'} (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`
            : `${isAr ? 'فترة مقفلة' : 'Locked'} (${targetPeriod.fiscal_year}-M${targetPeriod.period_number})`}
        </span>
      }
      isAr={isAr}
      maxWidth="780px"
      closeOnBackdropClick={!isSubmitting}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Stepper Navigation Indicator */}
        <div className={styles.stepperNav} role="tablist" aria-label={isAr ? 'خطوات تسجيل الفاتورة' : 'Bill Wizard Steps'}>
          <button
            type="button"
            className={`${styles.stepItem} ${currentStep === 1 ? styles.stepItemActive : ''} ${currentStep > 1 ? styles.stepItemCompleted : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className={styles.stepNumber}>{currentStep > 1 ? <Check size={13} /> : '1'}</span>
            <span className={styles.stepTitle}>{isAr ? 'بيانات المشروع والتصنيف' : 'Project & Category'}</span>
          </button>
          <div className={`${styles.stepLine} ${currentStep > 1 ? styles.stepLineActive : ''}`} />

          <button
            type="button"
            className={`${styles.stepItem} ${currentStep === 2 ? styles.stepItemActive : ''} ${currentStep > 2 ? styles.stepItemCompleted : ''}`}
            onClick={() => {
              if (propertyId && entryDate) setCurrentStep(2);
            }}
          >
            <span className={styles.stepNumber}>{currentStep > 2 ? <Check size={13} /> : '2'}</span>
            <span className={styles.stepTitle}>{isAr ? 'تفاصيل البند والقيمة' : 'Item Details & Value'}</span>
          </button>
          <div className={`${styles.stepLine} ${currentStep > 2 ? styles.stepLineActive : ''}`} />

          <button
            type="button"
            className={`${styles.stepItem} ${currentStep === 3 ? styles.stepItemActive : ''}`}
            onClick={() => {
              if (propertyId && entryDate && itemName.trim() && total.gt(0)) setCurrentStep(3);
            }}
          >
            <span className={styles.stepNumber}>3</span>
            <span className={styles.stepTitle}>{isAr ? 'طريقة السداد والجدولة' : 'Payment Method & Schedule'}</span>
          </button>
        </div>

        {success && (
          <div className={styles.successPanel} role="status">
            <span className={styles.successIcon}><Check size={16} /></span>
            <div className={styles.successCopy}>
              <strong>{isAr ? 'تم حفظ الفاتورة بنجاح' : 'Bill saved successfully'}</strong>
              <span>{success.itemName} • {success.propertyTitle} • {D(success.amount).formatEGP(isAr)}</span>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={resetEntryFields}>
              <Plus size={14} />
              {isAr ? 'فاتورة أخرى' : 'Another bill'}
            </button>
          </div>
        )}

        {/* ─── STEP 1: PROJECT & CATEGORY ─── */}
        {currentStep === 1 && (
          <section className={styles.section} aria-labelledby="step-1-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><Building2 size={15} /></span>
              <div>
                <h4 id="step-1-heading">{isAr ? 'الخطوة 1: بيانات المشروع والتصنيف الإنشائي' : 'Step 1: Property & Cost Category'}</h4>
                <p>{isAr ? 'حدد العقار المستهدف، تاريخ التسجيل، فئة التكلفة ومرحلة التنفيذ.' : 'Select target project, bill date, cost category and lifecycle phase.'}</p>
              </div>
            </div>

            <div className={styles.gridTwo}>
              <label className={styles.fieldWide}>
                <span>{isAr ? 'المشروع العقاري *' : 'Target Property *'}</span>
                <ZFCustomSelect value={propertyId} onChange={setPropertyId} items={propertyItems} isAr={isAr} searchable />
              </label>
              <label>
                <span>{isAr ? 'تاريخ الفاتورة أو القيد *' : 'Bill Date *'}</span>
                <input type="date" value={entryDate} onChange={event => setEntryDate(event.target.value)} required />
                {isTargetPeriodLocked && (
                  <div className={styles.lockedPeriodWarning}>
                    <AlertTriangle size={15} className={styles.lockedWarningIcon} />
                    <span>
                      {isAr
                        ? `الفترة (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) مقفلة بموجب Invariant 0.9`
                        : `Period (${targetPeriod.fiscal_year}-M${targetPeriod.period_number}) is ${targetPeriod.status}`}
                    </span>
                  </div>
                )}
              </label>
            </div>

            <div className={styles.gridTwo}>
              <label>
                <span>{isAr ? 'فئة التكلفة الإنشائية *' : 'Cost Category *'}</span>
                <ZFCustomSelect value={category} onChange={value => setCategory(value as PropertyCostCategory)} items={categoryItems} isAr={isAr} searchable />
              </label>
              <label>
                <span>{isAr ? 'مرحلة التنفيذ بالموقع *' : 'Construction Phase *'}</span>
                <ZFCustomSelect value={phase} onChange={value => setPhase(value as PropertyLifecyclePhase)} items={phaseItems} isAr={isAr} />
              </label>
            </div>
          </section>
        )}

        {/* ─── STEP 2: ITEM DETAILS & VALUE ─── */}
        {currentStep === 2 && (
          <section className={styles.section} aria-labelledby="step-2-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><ReceiptText size={15} /></span>
              <div>
                <h4 id="step-2-heading">{isAr ? 'الخطوة 2: تفاصيل البند والقيمة' : 'Step 2: Item Details & Value'}</h4>
                <p>{isAr ? 'أدخل وصف البند، بيانات المقاول أو المورد، والكمية والقيمة الإجمالية.' : 'Enter item description, supplier name, quantity and total value.'}</p>
              </div>
            </div>

            <label>
              <span>{isAr ? 'بيان البند أو التوريد أو الخامة *' : 'Item Description / Scope *'}</span>
              <input
                value={itemName}
                onChange={event => setItemName(event.target.value)}
                placeholder={isAr ? 'مثال: توريد حديد تسليح عز لسقف الدور الثاني' : 'e.g. Steel reinforcement supply for 2nd floor'}
                required
              />
            </label>

            <div className={styles.gridTwo}>
              <label>
                <span>{isAr ? 'المقاول أو المورد' : 'Supplier or Contractor'}</span>
                <input
                  required={purpose === 'claim'}
                  value={supplier}
                  onChange={event => setSupplier(event.target.value)}
                  placeholder={isAr ? 'اسم شركة المقاولات أو المورد' : 'Contractor or supplier name'}
                />
              </label>
              <label>
                <span>{isAr ? 'رقم الفاتورة أو المستخلص (اختياري)' : 'Invoice or Claim Reference (optional)'}</span>
                <input
                  value={invoiceRef}
                  onChange={event => setInvoiceRef(event.target.value)}
                  placeholder="INV-..."
                />
              </label>
            </div>

            <div className={styles.amountGrid}>
              <label className={styles.amountField}>
                <span>{isAr ? 'إجمالي قيمة الفاتورة (ج.م) *' : 'Invoice Total (EGP) *'}</span>
                <input
                  ref={amountInputRef}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                <span>{isAr ? 'الكمية *' : 'Quantity *'}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={event => setQuantity(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>{isAr ? 'الوحدة' : 'Unit'}</span>
                <input value={unit} onChange={event => setUnit(event.target.value)} />
              </label>
            </div>

            {/* Live Arabic Tafqeet Banner */}
            {total.gt(0) && (
              <div className={styles.tafqeetDisplay}>
                <span style={{ fontWeight: 800 }}>{isAr ? 'التفقيط المالي القانوني: ' : 'Legal Amount in Words: '}</span>
                <span>{tafqeetNumber(amount)}</span>
              </div>
            )}
          </section>
        )}

        {/* ─── STEP 3: PAYMENT METHOD & SCHEDULE ─── */}
        {currentStep === 3 && (
          <section className={styles.section} aria-labelledby="step-3-heading">
            <div className={styles.sectionHeading}>
              <span className={styles.sectionIcon}><WalletCards size={15} /></span>
              <div>
                <h4 id="step-3-heading">{isAr ? 'الخطوة 3: طريقة السداد والجدولة المالية' : 'Step 3: Payment Method & Schedule'}</h4>
                <p>{isAr ? 'اختر طريقة السداد المعتمدة وفق معايير FIN-OS (كاش، إنستاباي، أو آجل للمورد).' : 'Choose approved FIN-OS payment method (Cash, InstaPay, or Supplier Payable).'}</p>
              </div>
            </div>

            {/* Strict FIN-OS Payment Methods (Account 101000 or 201000) */}
            <div className={styles.paymentOptions} role="radiogroup" aria-label={isAr ? 'طريقة السداد المعتمدة' : 'Approved payment methods'}>
              {/* Method 1: Cash in Hand (101000) */}
              <div
                className={paymentMethod === 'CASH_101000' ? styles.paymentOptionActive : styles.paymentOption}
                onClick={() => setPaymentMethod('CASH_101000')}
                role="radio"
                aria-checked={paymentMethod === 'CASH_101000'}
                tabIndex={0}
              >
                <div className={styles.paymentOptionHeader}>
                  <span className={styles.paymentOptionIcon}><CircleDollarSign size={16} /></span>
                  <span>{isAr ? 'كاش بالخزينة' : 'Cash in Hand'}</span>
                </div>
                <small>{isAr ? 'صرف نقدي فوري من الخزينة الرئيسية (حساب 101000)' : 'Instant cash payout from treasury (101000)'}</small>
              </div>

              {/* Method 2: InstaPay Transfer (101000) */}
              <div
                className={paymentMethod === 'INSTAPAY_101000' ? styles.paymentOptionActive : styles.paymentOption}
                onClick={() => setPaymentMethod('INSTAPAY_101000')}
                role="radio"
                aria-checked={paymentMethod === 'INSTAPAY_101000'}
                tabIndex={0}
              >
                <div className={styles.paymentOptionHeader}>
                  <span className={styles.paymentOptionIcon}><Zap size={16} /></span>
                  <span>{isAr ? 'إنستاباي' : 'InstaPay'}</span>
                </div>
                <small>{isAr ? 'تحويل رقمي فوري من الحساب البنكي (حساب 102000)' : 'Instant digital transfer from Bank (102000)'}</small>
              </div>

              {/* Method 3: Deferred Payable (201000) */}
              <div
                className={paymentMethod === 'DEFERRED_201000' ? styles.paymentOptionActive : styles.paymentOption}
                onClick={() => setPaymentMethod('DEFERRED_201000')}
                role="radio"
                aria-checked={paymentMethod === 'DEFERRED_201000'}
                tabIndex={0}
              >
                <div className={styles.paymentOptionHeader}>
                  <span className={styles.paymentOptionIcon}><CreditCard size={16} /></span>
                  <span>{isAr ? 'آجل على المورد' : 'Supplier Payable'}</span>
                </div>
                <small>{isAr ? 'قيد مستحق على حساب الموردين (حساب 201000)' : 'Payable to supplier (201000) with scheduling'}</small>
              </div>
            </div>

            {/* InstaPay Transfer Reference Box */}
            {paymentMethod === 'INSTAPAY_101000' && (
              <div className={styles.instapayBox}>
                <label>
                  <span>{isAr ? 'الرقم المرجعي لعملية إنستاباي (اختياري)' : 'InstaPay Transaction Reference'}</span>
                  <input
                    value={instapayRef}
                    onChange={event => setInstapayRef(event.target.value)}
                    placeholder="e.g. IPN-98471203"
                  />
                </label>
              </div>
            )}

            {/* Deferred Payable & Schedule Configuration */}
            {paymentMethod === 'DEFERRED_201000' && (
              <div className={styles.schedulePanel}>
                {!scheduleNow && (
                  <label>
                    <span>{isAr ? 'تاريخ استحقاق الفاتورة بالكامل *' : 'Full Invoice Due Date *'}</span>
                    <input type="date" value={firstDueDate} onChange={event => setFirstDueDate(event.target.value)} required />
                  </label>
                )}
                <label className={styles.toggleRow}>
                  <span>
                    <strong>{isAr ? 'جدولة المستحقات وأقساط المورد الآن' : 'Schedule Payables & Tranches Now'}</strong>
                    <small>{isAr ? 'تفعيل خطة دفعات مجدولة مع إمكانية دفع دفعة مقدمة.' : 'Set up structured tranches with optional down payment.'}</small>
                  </span>
                  <input type="checkbox" checked={scheduleNow} onChange={event => setScheduleNow(event.target.checked)} />
                </label>

                {scheduleNow && (
                  <div className={styles.scheduleFields}>
                    <label>
                      <span>{isAr ? 'الدفعة المقدمة المسددة فوراً (ج.م)' : 'Immediate Down Payment (EGP)'}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        max={amount || undefined}
                        value={downPayment}
                        onChange={event => setDownPayment(event.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      <span>{isAr ? 'عدد الأقساط' : 'Installments Count'}</span>
                      <input type="number" min="1" max="24" value={installmentsCount} onChange={event => setInstallmentsCount(event.target.value)} />
                    </label>
                    <label>
                      <span>{isAr ? 'دورية السداد (أشهر)' : 'Frequency (months)'}</span>
                      <input type="number" min="1" max="12" value={frequencyMonths} onChange={event => setFrequencyMonths(event.target.value)} />
                    </label>
                    <label>
                      <span>{isAr ? 'تاريخ أول قسط *' : 'First Due Date *'}</span>
                      <input type="date" value={firstDueDate} onChange={event => setFirstDueDate(event.target.value)} required />
                    </label>
                    {total.gt(0) && (
                      <div className={styles.scheduleSummary}>
                        <Calendar size={15} />
                        <span>{isAr ? 'المتبقي المجدول' : 'Scheduled Balance'}: <strong>{remaining.formatEGP(isAr)}</strong></span>
                        <span>{isAr ? 'قيمة القسط' : 'Tranche amount'}: <strong>{installmentValue.formatEGP(isAr)}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Financial Effect Preview */}
            <div className={styles.accountingPreview}>
              <ShieldCheck size={16} />
              <div>
                <strong>{isAr ? 'الأثر المالي المحاسبي (FIN-OS Invariant 0.9)' : 'Accounting Posting Effect'}</strong>
                <span>{postingSummary}</span>
              </div>
            </div>

            <label>
              <span>{isAr ? 'ملاحظات وتفاصيل إضافية' : 'Internal Notes'}</span>
              <textarea
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={2}
                placeholder={isAr ? 'أي اشتراطات فنية، نطاق أعمال، أو شروط دفع...' : 'Additional technical specifications or payment notes...'}
              />
            </label>
          </section>
        )}

        {/* ─── STEPPER NAVIGATION FOOTER ─── */}
        <div className={styles.footer}>
          <div className={styles.stepperNavButtons}>
            {currentStep > 1 ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setCurrentStep(prev => (prev - 1) as 1 | 2 | 3)}
                disabled={isSubmitting}
              >
                {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                <span>{isAr ? 'السابق' : 'Previous'}</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            )}
          </div>

          <div className={styles.actions}>
            {currentStep === 3 && (
              <label className={styles.keepOpen}>
                <input type="checkbox" checked={keepOpen} onChange={event => setKeepOpen(event.target.checked)} />
                <span>{isAr ? 'فاتورة أخرى بعد الحفظ' : 'Another bill after save'}</span>
              </label>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleStepNext}
              >
                <span>{isAr ? 'المتابعة للخطوة التالية' : 'Next Step'}</span>
                {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting || isTargetPeriodLocked}
              >
                {isSubmitting ? <Loader2 size={15} className={styles.spinner} /> : <Send size={15} />}
                {isTargetPeriodLocked
                  ? (isAr ? `الفترة مقفلة (M${targetPeriod.period_number})` : `Period Locked (M${targetPeriod.period_number})`)
                  : (isAr ? 'تأكيد وتسجيل المصروف' : 'Confirm & Log Expense')}
              </button>
            )}
          </div>
        </div>
      </form>
    </ZFModalShell>
  );
};

