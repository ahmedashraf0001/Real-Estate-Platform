'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  DollarSign, 
  ShieldCheck, 
  Building2, 
  Wallet, 
  Landmark, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Sparkles, 
  Layers, 
  HardHat, 
  Truck, 
  Wrench, 
  Paintbrush, 
  FileCheck2,
  AlertCircle,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { 
  ERPAccountingPeriod, 
  ERPJournalEntry, 
  ERPPartnerCall, 
  JournalSourceModule 
} from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { GeneralLedgerEngine, CANONICAL_COA } from '@/lib/erp/ledger';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectSection } from './v2/common/ZFCustomSelect';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePeriod: ERPAccountingPeriod;
  partnerCalls: ERPPartnerCall[];
  properties?: Property[];
  onSaveEntry: (entry: ERPJournalEntry) => Promise<void>;
  isAr: boolean;
  registeredPartners?: Array<{ name: string; role: string }>;
}

export type TransactionType = 'EXPENSE' | 'PARTNER_FUNDING' | 'LOAN';

export interface CategoryPreset {
  id: string;
  mainCategory: string;
  accountCode: string;
  iconName: 'materials' | 'labor' | 'mep' | 'finishing' | 'permits';
  descriptionAr: string;
  subCategories: string[];
}

export const REAL_ESTATE_EXPENSE_PRESETS: CategoryPreset[] = [
  {
    id: 'materials',
    mainCategory: 'مواد بناء وتوريدات إنشائية',
    accountCode: '151000',
    iconName: 'materials',
    descriptionAr: 'حديد تسليح، أسمنت مسلح، سن، رمل، طوب بناء، خرسانة جاهزة',
    subCategories: ['حديد تسليح عالي المقاومة', 'أسمنت بورتلاندي مسلح', 'خرسانة جاهزة صب عمدان وأسقف', 'زلط ورمل وسن', 'طوب بناء أسمنتي ومفرغ', 'مياه خرسانات ومواد عزل']
  },
  {
    id: 'labor',
    mainCategory: 'مقاولات تنفيذ وعمالة موقع',
    accountCode: '151000',
    iconName: 'labor',
    descriptionAr: 'مقاول خرسانات، نجارة وحدادة مسلحة، مهندس إشراف، بناين',
    subCategories: ['مستخلص مقاول خرسانات وهيكل', 'مصنعية نجارة وحدادة مسلحة', 'مهندس إشراف واستشاري موقع', 'أجور عمالة وبناين ومساعدين', 'إيجار خلاطات وسقالات معدنية']
  },
  {
    id: 'mep',
    mainCategory: 'أعمال الكهروميكانيك والمصاعد (MEP)',
    accountCode: '152000',
    iconName: 'mep',
    descriptionAr: 'تأسيس شبكات الكهرباء، السباكة، التكييف، وتوريد المصاعد',
    subCategories: ['تأسيس خراطيم وكابلات الكهرباء', 'مواسير وشبكات الصرف والسباكة', 'دفعة توريد وتركيب أسانسير المبنى', 'تأسيس مواسير وتجهيزات التكييف', 'شبكات إنذار ومكافحة الحريق']
  },
  {
    id: 'finishing',
    mainCategory: 'التشطيبات المعمارية والواجهات',
    accountCode: '153000',
    iconName: 'finishing',
    descriptionAr: 'واجهات حجرية، رخام المداخل والسلالم، سيراميك، ألوميتال',
    subCategories: ['واجهة المبنى حجر فرعوني وهاشمي', 'رخام وجرانيت المداخل والدرج', 'سيراميك وبورسلين الأرضيات', 'دهانات ومعجون وسكينة ديكور', 'قطاعات ألوميتال وشبابيك فاخرة', 'أبواب مصفحة ونجارة داخلية']
  },
  {
    id: 'permits',
    mainCategory: 'أراضي وتراخيص ورسوم رسمية',
    accountCode: '150000',
    iconName: 'permits',
    descriptionAr: 'تراخيص البناء، رسوم إدخال المرافق، التسجيل العقاري',
    subCategories: ['رسوم تراخيص البناء والجهاز', 'رسوم مقايسات وإدخال المرافق', 'رسوم توثيق وتسجيل حيازة الأرض', 'استشارات واختبارات تربة وجسات']
  }
];

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  activePeriod,
  partnerCalls,
  properties,
  onSaveEntry,
  isAr,
  registeredPartners = []
}) => {
  // Guided Step State: 1 = Basic Info & Amount, 2 = Allocation & Category, 3 = Double-Entry Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [subCategory, setSubCategory] = useState<string>(REAL_ESTATE_EXPENSE_PRESETS[0].subCategories[0]);
  const [customSubCategory, setCustomSubCategory] = useState<string>('');
  const [isCustomSubCategory, setIsCustomSubCategory] = useState<boolean>(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [paymentAccount, setPaymentAccount] = useState<'101000' | '201000'>('101000'); // Default to Safe Cash [101000] - No Bank Link
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('زكريا فريد');
  const [customPartnerInput, setCustomPartnerInput] = useState<string>('');
  const [lenderName, setLenderName] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentPreset = REAL_ESTATE_EXPENSE_PRESETS[selectedPresetIndex] || REAL_ESTATE_EXPENSE_PRESETS[0];

  // Quick Amount Shortcuts (in EGP)
  const quickAmounts = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  // Generate Preview Journal Entry
  const previewEntry = useMemo(() => {
    const fixedAmount = D(amount || '0').toFixed(2);
    const timestamp = 'PREVIEW';

    let debitAccount: string = currentPreset.accountCode;
    let creditAccount: string = paymentAccount;
    let description = '';
    let sourceModule: JournalSourceModule = 'WIP_ALLOCATION';

    const finalPartnerName = selectedPartnerName === '__custom__' ? customPartnerInput.trim() : selectedPartnerName;
    const finalSub = isCustomSubCategory && customSubCategory.trim() ? customSubCategory.trim() : subCategory;

    if (transactionType === 'EXPENSE') {
      const targetProp = properties?.find(p => p.id === selectedPropertyId);
      const propTag = targetProp ? ` [مشروع: ${isAr ? targetProp.title_ar : targetProp.title_en}]` : '';
      description = `${currentPreset.mainCategory} - ${finalSub}${propTag}${memo ? ` (${memo})` : ''}`;
      debitAccount = currentPreset.accountCode; // 150000, 151000, 152000, 153000
      creditAccount = paymentAccount; // 101000 Safe, 201000 Payable
      sourceModule = 'WIP_ALLOCATION';
    } else if (transactionType === 'PARTNER_FUNDING') {
      description = `ضخ تمويل رأسمالي - الشريك: ${finalPartnerName || (isAr ? 'شريك ممول' : 'Partner')}${memo ? ` (${memo})` : ''}`;
      debitAccount = '101000'; // 101000 Main Safe Cash on Hand
      creditAccount = '301000'; // Partner Capital
      sourceModule = 'CAPITAL_CALL';
    } else if (transactionType === 'LOAN') {
      description = `سلفة / تمويل ائتماني دائن - الجهة: ${lenderName || (isAr ? 'جهة تمويل' : 'Lender')}${memo ? ` (${memo})` : ''}`;
      debitAccount = '101000'; // 101000 Main Safe Cash on Hand
      creditAccount = '201000'; // Trade Accounts Payable / Creditor
      sourceModule = 'MANUAL';
    }

    const targetProp = properties?.find(p => p.id === selectedPropertyId);

    return {
      entry_number: `JE-${sourceModule}-${timestamp}`,
      entry_date: entryDate,
      period: activePeriod,
      description,
      source_module: sourceModule,
      debitAccount,
      creditAccount,
      debitTitle: CANONICAL_COA[debitAccount]?.account_name_ar || debitAccount,
      creditTitle: CANONICAL_COA[creditAccount]?.account_name_ar || creditAccount,
      amount: fixedAmount,
      targetProp
    };
  }, [
    amount, 
    transactionType, 
    entryDate, 
    activePeriod, 
    currentPreset, 
    paymentAccount, 
    selectedPartnerName, 
    customPartnerInput, 
    isCustomSubCategory, 
    customSubCategory, 
    subCategory, 
    memo, 
    selectedPropertyId, 
    properties, 
    lenderName, 
    isAr
  ]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      alert(isAr ? 'يرجى إدخال مبلغ مالي صحيح أكبر من الصفر' : 'Please enter a valid amount greater than zero');
      return false;
    }
    if (!entryDate) {
      alert(isAr ? 'يرجى اختيار تاريخ الحركة' : 'Please select transaction date');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (transactionType === 'PARTNER_FUNDING') {
      const finalPartner = selectedPartnerName === '__custom__' ? customPartnerInput.trim() : selectedPartnerName;
      if (!finalPartner) {
        alert(isAr ? 'يرجى إدخال اسم الشريك الممول' : 'Please specify partner name');
        return false;
      }
    }
    if (transactionType === 'LOAN' && !lenderName.trim()) {
      alert(isAr ? 'يرجى إدخال اسم الجهة أو المقرض' : 'Please specify lender name');
      return false;
    }
    return true;
  };

  // Submit Final Entry
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const timestamp = Date.now().toString().slice(-6);
      const targetProp = properties?.find(p => p.id === selectedPropertyId);

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-${previewEntry.source_module}-${timestamp}`,
        entry_date: entryDate,
        period: activePeriod,
        description: previewEntry.description,
        source_module: previewEntry.source_module,
        source_entity_id: targetProp?.id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: previewEntry.debitAccount,
            debit_amount: previewEntry.amount,
            credit_amount: '0.00',
            contract_id: undefined,
            unit_id: targetProp ? (isAr ? targetProp.title_ar : targetProp.title_en) : undefined,
            memo: previewEntry.description
          },
          {
            account_code: previewEntry.creditAccount,
            debit_amount: '0.00',
            credit_amount: previewEntry.amount,
            contract_id: undefined,
            unit_id: targetProp ? (isAr ? targetProp.title_ar : targetProp.title_en) : undefined,
            memo: previewEntry.description
          }
        ]
      });

      await onSaveEntry(entry);
      onClose();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Custom Sectioned Dropdown for Properties
  const targetPropertySections: ZFCustomSelectSection[] = useMemo(() => {
    const generalSection: ZFCustomSelectSection = {
      sectionId: 'general',
      titleAr: 'المصروفات العامة والتشغيلية',
      titleEn: 'General & Site Overhead',
      icon: Building2,
      items: [
        {
          value: '',
          labelAr: '-- مصروف عام لكافة مواقع المشاريع (Overhead) --',
          labelEn: '-- General Project Overhead --',
          sublabelAr: 'لا يتم توجيهه لعقار محدد بل يسجل كنفقات عامة',
          sublabelEn: 'Unallocated general development overhead',
          badge: isAr ? 'مصروف عام' : 'Overhead'
        }
      ]
    };

    const propItems = (properties || []).map(p => ({
      value: p.id,
      labelAr: p.title_ar,
      labelEn: p.title_en,
      sublabelAr: p.location || (isAr ? 'الموقع مسجل' : 'Registered Location'),
      sublabelEn: p.location || 'Location',
      badge: p.listing_status === 'sold' ? (isAr ? 'مباع' : 'Sold') : (isAr ? 'قيد التنفيذ' : 'In Progress'),
      icon: Building2
    }));

    const projectsSection: ZFCustomSelectSection = {
      sectionId: 'projects',
      titleAr: 'المشروعات ومواقع العمل الإنشائية',
      titleEn: 'Active Construction Sites & Projects',
      icon: Building2,
      items: propItems
    };

    return [generalSection, projectsSection];
  }, [properties, isAr]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        direction: isAr ? 'rtl' : 'ltr',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafaf9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              color: '#946f23',
              padding: '0.65rem',
              borderRadius: '12px'
            }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'تسجيل قيد محاسبي / مصروف موقع جديد' : 'New General Journal Entry / Site Expense'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#946f23',
                  background: 'rgba(212, 175, 55, 0.12)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  {activePeriod.period_id}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'معالج توجيه القيود اليومية بنظام القيد المزدوج المحصن ضد التلاعب (GAAP / IFRS 15)'
                  : 'Direct double-entry ledger posting with project WIP cost allocation'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              borderRadius: '10px',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-Step Progress Tracker */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: '#f1f5f9',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {[
            { num: 1, titleAr: '1. نوع العملية والمبلغ', titleEn: '1. Type & Amount' },
            { num: 2, titleAr: '2. التوجيه والمشروع', titleEn: '2. COA & Project' },
            { num: 3, titleAr: '3. المعاينة والاعتماد', titleEn: '3. Preview & Post' }
          ].map(s => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div 
                key={s.num}
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  else if (s.num === 2 && validateStep1()) setStep(2);
                  else if (s.num === 3 && validateStep1() && validateStep2()) setStep(3);
                }}
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  background: isActive ? '#ffffff' : isCompleted ? '#f8fafc' : 'transparent',
                  borderBottom: isActive ? '2.5px solid #946f23' : '2.5px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isCompleted ? '#10b981' : (isActive ? 'var(--zf-gold, #d4af37)' : 'rgba(255, 255, 255, 0.1)'),
                  color: isCompleted || isActive ? '#0a0c12' : '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted ? '✓' : s.num}
                </div>
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#946f23' : isCompleted ? '#059669' : '#64748b'
                }}>
                  {isAr ? s.titleAr : s.titleEn}
                </span>
              </div>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* STEP 1: TRANSACTION TYPE & AMOUNT */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Transaction Type Segmented Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                  {isAr ? 'اختر نوع المعاملة المالية المحاسبية:' : 'Select Transaction Category:'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {/* Option 1: Expense */}
                  <div 
                    onClick={() => setTransactionType('EXPENSE')}
                    style={{
                      background: transactionType === 'EXPENSE' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: transactionType === 'EXPENSE' ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <HardHat size={20} color={transactionType === 'EXPENSE' ? 'var(--zf-gold, #d4af37)' : '#94a3b8'} />
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: transactionType === 'EXPENSE' ? 'var(--zf-gold, #d4af37)' : '#64748b',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        - صادر
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                      {isAr ? 'مصروف موقع وإنشاءات' : 'Site Expense'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'مواد، مقاولات، أجور، تشطيب (WIP)' : 'Materials, Labor, Finishing (WIP)'}
                    </span>
                  </div>

                  {/* Option 2: Partner Capital */}
                  <div 
                    onClick={() => setTransactionType('PARTNER_FUNDING')}
                    style={{
                      background: transactionType === 'PARTNER_FUNDING' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: transactionType === 'PARTNER_FUNDING' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <UserCheck size={20} color={transactionType === 'PARTNER_FUNDING' ? '#38bdf8' : '#94a3b8'} />
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: transactionType === 'PARTNER_FUNDING' ? '#38bdf8' : '#64748b',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        + وارد
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                      {isAr ? 'ضخ تمويل رأسمالي' : 'Partner Capital'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'زيادة مساهمة ونقدية الشركاء' : 'Contributed Partner Capital'}
                    </span>
                  </div>

                  {/* Option 3: Loan */}
                  <div 
                    onClick={() => setTransactionType('LOAN')}
                    style={{
                      background: transactionType === 'LOAN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: transactionType === 'LOAN' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <CreditCard size={20} color={transactionType === 'LOAN' ? '#fbbf24' : '#94a3b8'} />
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: transactionType === 'LOAN' ? '#fbbf24' : '#64748b',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        + التزام
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                      {isAr ? 'سلفة / تمويل خارجي' : 'Loan / Payable'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {isAr ? 'قرض أو ائتمان مالي مستحق' : 'External Credit / Liability'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Input Box with Live Currency */}
              <div style={{
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#946f23' }}>
                    {isAr ? 'قيمة المبلغ المالي للحركة:' : 'Transaction Amount:'}
                  </label>
                  {amount && parseFloat(amount) > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                      {D(amount).formatEGP(isAr)}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1.5px solid rgba(184, 144, 62, 0.45)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(184, 144, 62, 0.08)'
                }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(val);
                    }}
                    placeholder="0.00"
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      padding: '0.75rem 1.15rem',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                      background: 'transparent'
                    }}
                  />
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    background: '#f8fafc',
                    borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
                    borderRight: !isAr ? '1px solid #e2e8f0' : 'none',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#946f23',
                    flexShrink: 0
                  }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </div>
                </div>

                {/* Quick Add Chips */}
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    {isAr ? 'إضافة سريعة للمبلغ:' : 'Quick Add Amounts:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {quickAmounts.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAddQuickAmount(val)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontVariantNumeric: 'tabular-nums',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                      </button>
                    ))}
                    {amount && (
                      <button
                        type="button"
                        onClick={() => setAmount('')}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'تصفير' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'تاريخ المعاملة والحركة:' : 'Transaction Date:'}
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      color: '#0f172a',
                      fontSize: '0.8rem',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'الفترة المحاسبية النشطة:' : 'Active Fiscal Period:'}
                  </label>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    color: '#15803d',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>{activePeriod.period_id} (سنة {activePeriod.fiscal_year})</span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                      {activePeriod.status === 'OPEN' ? (isAr ? 'مفتوحة' : 'OPEN') : activePeriod.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CLASSIFICATION & PROJECT ALLOCATION */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* EXPENSE BRANCH */}
              {transactionType === 'EXPENSE' && (
                <>
                  {/* Category Selection Cards */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                      {isAr ? 'بند المصروف الإنشائي الرئيسي (دليل الحسابات COA):' : 'Main Construction WIP Category:'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      {REAL_ESTATE_EXPENSE_PRESETS.map((preset, idx) => {
                        const isSelected = selectedPresetIndex === idx;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              setSelectedPresetIndex(idx);
                              setSubCategory(preset.subCategories[0]);
                              setIsCustomSubCategory(false);
                            }}
                            style={{
                              background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '10px',
                              padding: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.8rem', color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                                {preset.mainCategory}
                              </span>
                              <span style={{
                                fontVariantNumeric: 'tabular-nums',
                                fontSize: '0.68rem',
                                color: '#946f23',
                                background: 'rgba(212, 175, 55, 0.12)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px'
                              }}>
                                [{preset.accountCode}]
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '0.25rem' }}>
                              {preset.descriptionAr}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-Category Pills */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                      {isAr ? 'البند الفرعي الميداني المباشر:' : 'Sub-Category:'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {currentPreset.subCategories.map(sub => {
                        const isSubActive = !isCustomSubCategory && subCategory === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              setSubCategory(sub);
                              setIsCustomSubCategory(false);
                            }}
                            style={{
                              background: isSubActive ? 'var(--zf-gold, #d4af37)' : 'rgba(255, 255, 255, 0.04)',
                              color: isSubActive ? '#0a0c12' : '#cbd5e1',
                              border: isSubActive ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.74rem',
                              fontWeight: isSubActive ? 800 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {sub}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsCustomSubCategory(true)}
                        style={{
                          background: isCustomSubCategory ? 'var(--zf-gold, #d4af37)' : 'rgba(255, 255, 255, 0.04)',
                          color: isCustomSubCategory ? '#0a0c12' : '#cbd5e1',
                          border: isCustomSubCategory ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.74rem',
                          fontWeight: isCustomSubCategory ? 800 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? '+ بند فرعي آخر...' : '+ Custom item...'}
                      </button>
                    </div>

                    {isCustomSubCategory && (
                      <input
                        type="text"
                        placeholder={isAr ? 'اكتب اسم البند الفرعي الميداني هنا...' : 'Type custom sub-category...'}
                        value={customSubCategory}
                        onChange={e => setCustomSubCategory(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '0.5rem',
                          background: '#f8fafc',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          borderRadius: '8px',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.78rem',
                          color: '#0f172a',
                          outline: 'none'
                        }}
                      />
                    )}
                  </div>

                  {/* Target Property Allocation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                      {isAr ? 'المشروع / العقار المستهدف (توجيه تكلفة الأعمال WIP):' : 'Target Project Allocation:'}
                    </label>
                    <ZFCustomSelect 
                      value={selectedPropertyId}
                      onChange={setSelectedPropertyId}
                      sections={targetPropertySections}
                      placeholderAr="-- اختر المشروع المستهدف --"
                      placeholderEn="-- Select Target Project --"
                      isAr={isAr}
                    />
                  </div>
                </>
              )}

              {/* PARTNER FUNDING BRANCH */}
              {transactionType === 'PARTNER_FUNDING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'اختر الشريك الممول لحساب رأس المال:' : 'Select Partner:'}
                  </label>
                  <select
                    value={selectedPartnerName}
                    onChange={e => setSelectedPartnerName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.8rem',
                      color: '#0f172a',
                      outline: 'none',
                      colorScheme: 'dark'
                    }}
                  >
                    {/* Deduplicated Unified Partners Directory */}
                    {(() => {
                      const seen = new Set<string>();
                      const list: Array<{ value: string; label: string }> = [];

                      (registeredPartners || []).forEach(p => {
                        const name = p.name.trim();
                        if (name && !seen.has(name)) {
                          seen.add(name);
                          list.push({
                            value: name,
                            label: `${name} (${p.role || (isAr ? 'شريك استثماري' : 'Partner')})`
                          });
                        }
                      });

                      (partnerCalls || []).forEach(pc => {
                        const name = (pc.partner_name || '').trim();
                        if (name && !seen.has(name)) {
                          seen.add(name);
                          list.push({
                            value: name,
                            label: `${name} (${isAr ? 'شريك استثماري' : 'Investment Partner'})`
                          });
                        }
                      });

                      if (list.length === 0) {
                        list.push({
                          value: 'زكريا فريد',
                          label: isAr ? 'زكريا فريد (المطور الرئيسي / مالك المنظومة)' : 'Zakaria Farid (Primary Developer)'
                        });
                      }

                      return list.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ));
                    })()}
                    <option value="__custom__">{isAr ? '+ إدخال اسم شريك ممول جديد...' : '+ Enter new partner name...'}</option>
                  </select>

                  {selectedPartnerName === '__custom__' && (
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم الشريك الجديد...' : 'Partner full name...'}
                      value={customPartnerInput}
                      onChange={e => setCustomPartnerInput(e.target.value)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.78rem',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>
              )}

              {/* LOAN BRANCH */}
              {transactionType === 'LOAN' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                    {isAr ? 'اسم الجهة أو الشخص المقرض / الدائن:' : 'Lender / Creditor Name:'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAr ? 'مثال: شركة الهدى للمقاولات / شريك خارجي...' : 'Lender or external creditor name...'}
                    value={lenderName}
                    onChange={e => setLenderName(e.target.value)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.8rem',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {/* Funding Source / Payment Method (All Types) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#64748b', marginBottom: '0.45rem' }}>
                  {transactionType === 'EXPENSE'
                    ? (isAr ? 'طريقة السداد وخروج النقدية:' : 'Payment Account Source:')
                    : (isAr ? 'حساب إيداع النقدية الواردة:' : 'Receiving Cash Account:')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: transactionType === 'EXPENSE' ? 'repeat(2, 1fr)' : '1fr', gap: '0.65rem' }}>
                  {/* Cash Safe */}
                  <div
                    onClick={() => setPaymentAccount('101000')}
                    style={{
                      background: paymentAccount === '101000' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: paymentAccount === '101000' ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Wallet size={18} color="#34d399" />
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>
                        {isAr ? 'الخزينة النقدية (سداد نقدي باليد)' : 'Main Cash Safe (By Hand)'}
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.66rem', color: '#64748b' }}>[101000]</span>
                    </div>
                  </div>

                  {/* Credit / Accounts Payable (Only on Expense) */}
                  {transactionType === 'EXPENSE' && (
                    <div
                      onClick={() => setPaymentAccount('201000')}
                      style={{
                        background: paymentAccount === '201000' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: paymentAccount === '201000' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <CreditCard size={18} color="#fbbf24" />
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', display: 'block' }}>
                          {isAr ? 'آجل / موردين (A/P)' : 'Accounts Payable'}
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.66rem', color: '#64748b' }}>[201000]</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Memo & Invoices */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                  {isAr ? 'البيان وملاحظات الفاتورة:' : 'Memo / Notes:'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'رقم الفاتورة، اسم المورد، أرقام الإيصالات الميدانية...' : 'Invoice details, vendor name, receipts...'}
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.78rem',
                    color: '#0f172a',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: LIVE T-ACCOUNT PREVIEW & AUDIT CONFIRMATION */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <Sparkles size={18} color="#34d399" />
                <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                  {isAr 
                    ? 'المعاينة المحاسبية اللحظية: تم توليد القيد المزدوج المتوازن تلقائياً وفقاً لمعايير الحوكمة المالية.'
                    : 'Live double-entry preview: Automatically balanced according to financial governance rules.'}
                </span>
              </div>

              {/* T-Account Review Card */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
              }}>
                {/* Entry Header */}
                <div style={{
                  padding: '0.85rem 1.15rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCheck2 size={16} color="var(--zf-gold, #d4af37)" />
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#946f23', fontSize: '0.82rem' }}>
                      {previewEntry.entry_number}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {previewEntry.entry_date} — {activePeriod.period_id}
                  </span>
                </div>

                {/* Entry Description */}
                <div style={{ padding: '0.75rem 1.15rem', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {previewEntry.description}
                </div>

                {/* T-Account Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                      <th style={{ padding: '0.65rem 1.15rem', textAlign: isAr ? 'right' : 'left', color: '#64748b' }}>
                        {isAr ? 'كود الحساب واسمه بالدفاتر' : 'Account & Title'}
                      </th>
                      <th style={{ padding: '0.65rem 1.15rem', textAlign: isAr ? 'left' : 'right', color: '#15803d' }}>
                        {isAr ? 'مدين (DEBIT)' : 'Debit'}
                      </th>
                      <th style={{ padding: '0.65rem 1.15rem', textAlign: isAr ? 'left' : 'right', color: '#0f172a' }}>
                        {isAr ? 'دائن (CREDIT)' : 'Credit'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Debit Line */}
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <td style={{ padding: '0.75rem 1.15rem' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#946f23', fontWeight: 800, marginRight: '0.35rem' }}>
                          {previewEntry.debitAccount}
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{previewEntry.debitTitle}</span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          {transactionType === 'EXPENSE' ? 'زيادة في أصل وتكلفة المشروع (WIP)' : 'إيداع نقدي في السيولة'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                        {D(previewEntry.amount).formatEGP(isAr)}
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', color: '#475569' }}>
                        —
                      </td>
                    </tr>

                    {/* Credit Line */}
                    <tr style={{ background: '#fcfcfc' }}>
                      <td style={{ padding: '0.75rem 1.15rem' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#946f23', fontWeight: 800, marginRight: '0.35rem' }}>
                          {previewEntry.creditAccount}
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{previewEntry.creditTitle}</span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          {transactionType === 'EXPENSE' ? 'خروج نقدية من حساب الشركة' : 'إثبات مساهمة رأس مال الشريك'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', color: '#475569' }}>
                        —
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#15803d' }}>
                        {D(previewEntry.amount).formatEGP(isAr)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1.15rem', fontWeight: 700, color: '#64748b' }}>
                        {isAr ? 'الإجمالي والتوازن:' : 'Totals & Balance:'}
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#0f172a' }}>
                        {D(previewEntry.amount).formatEGP(isAr)}
                      </td>
                      <td style={{ padding: '0.75rem 1.15rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#15803d' }}>
                        {D(previewEntry.amount).formatEGP(isAr)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Audit Pill */}
                <div style={{
                  padding: '0.65rem 1.15rem',
                  background: 'rgba(16, 185, 129, 0.08)',
                  borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  color: '#15803d',
                  fontWeight: 700
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={13} />
                    <span>{isAr ? 'القيد متوازن تماماً (0.00 Delta)' : 'Double-entry balanced perfectly'}</span>
                  </div>
                  <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {previewEntry.targetProp ? `المشروع: ${previewEntry.targetProp.title_ar || previewEntry.targetProp.title_en}` : (isAr ? 'مصروف عام' : 'General')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div style={{
          padding: '1.1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Back Button */}
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              disabled={isSubmitting}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              {isAr ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isAr ? 'الرجوع للخطوة السابقة' : 'Back'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          )}

          {/* Next / Submit Button */}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && validateStep1()) setStep(2);
                else if (step === 2 && validateStep2()) setStep(3);
              }}
              style={{
                background: 'linear-gradient(135deg, var(--zf-gold, #d4af37) 0%, #b89628 100%)',
                color: '#0a0c12',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.35rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{isAr ? 'متابعة الخطوة التالية' : 'Next Step'}</span>
              {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              style={{
                background: isSubmitting 
                  ? '#64748b' 
                  : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#0f172a',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                borderRadius: '8px',
                padding: '0.6rem 1.65rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting 
                  ? (isAr ? 'جاري الترحيل الدفتري...' : 'Posting to Ledger...') 
                  : (isAr ? 'حفظ وترحيل القيد بالدفاتر المحصنة' : 'Confirm & Post to Ledger')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
