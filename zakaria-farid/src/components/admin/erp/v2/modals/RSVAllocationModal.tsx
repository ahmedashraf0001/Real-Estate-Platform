'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Loader2,
  Building2,
  PieChart,
  FolderPlus,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFModalShell } from '../common/ZFModalShell';
import p from '../common/ZFModalPrimitives.module.css';

interface RSVAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onSaveAllocation: (allocation: {
    projectName: string;
    salesValue: string;
    wipAmount: string;
    propertyId?: string;
  }) => Promise<void>;
  isMutating?: boolean;
  isAr?: boolean;
}

export const RSVAllocationModal: React.FC<RSVAllocationModalProps> = ({
  isOpen,
  onClose,
  properties,
  onSaveAllocation,
  isMutating = false,
  isAr = true
}) => {
  const [selectionMode, setSelectionMode] = useState<'portfolio' | 'custom'>('portfolio');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [salesValue, setSalesValue] = useState<string>('100000000');
  const [wipAmount, setWipAmount] = useState<string>('45000000');
  const [saveSuccessData, setSaveSuccessData] = useState<{
    projectName: string;
    salesValue: string;
    wipAmount: string;
    factorPct: string;
    grossMarginPct: string;
    factor: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectionMode('portfolio');
      setSelectedPropertyId('');
      setProjectName('');
      setSalesValue('100000000');
      setWipAmount('45000000');
      setSaveSuccessData(null);
    }
  }, [isOpen]);

  const wip = parseFloat(wipAmount) || 0;
  const sales = parseFloat(salesValue) || 0;
  const factor = sales > 0 ? (wip / sales) : 0;
  const factorPct = (factor * 100).toFixed(2);
  const grossMarginPct = sales > 0 ? (100 - factor * 100).toFixed(2) : '0.00';

  const selectedProp = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const propertySelectItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return properties.map(p => ({
      value: p.id,
      labelAr: p.title_ar || p.title_en || '',
      labelEn: p.title_en || p.title_ar || '',
      sublabelAr: `${p.area_sqm} م² • ${p.location || 'الشرقية'}`,
      sublabelEn: `${p.area_sqm} m² • ${p.location || 'Sharqia'}`,
      price: p.price_egp,
      icon: Building2,
      badge: p.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
      badgeColor: p.completion_status === 'ready' ? '#059669' : '#d97706'
    }));
  }, [properties, isAr]);

  if (!isOpen) return null;

  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    if (propId) {
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        const pTitle = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
        setProjectName(pTitle || '');
        const sVal = (prop.price_egp || 100000000).toString();
        setSalesValue(sVal);
        setWipAmount(Math.round((prop.price_egp || 100000000) * 0.45).toString());
      }
    } else {
      setProjectName('');
    }
  };

  const handleModeChange = (mode: 'portfolio' | 'custom') => {
    setSelectionMode(mode);
    if (mode === 'custom') {
      setSelectedPropertyId('');
      if (projectName && properties.some(p => (p.title_ar === projectName || p.title_en === projectName))) {
        setProjectName('');
      }
    } else {
      if (!selectedPropertyId) {
        setProjectName('');
      }
    }
  };

  const resetForAnother = () => {
    setSaveSuccessData(null);
    setSelectedPropertyId('');
    setProjectName('');
    setSalesValue('100000000');
    setWipAmount('45000000');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectionMode === 'portfolio' && !selectedPropertyId) {
      alert(isAr ? 'يرجى اختيار العمارة أو المشروع المستهدف من القائمة' : 'Please select a property from the portfolio');
      return;
    }
    if (!projectName.trim()) {
      alert(isAr ? 'اكتب اسم العمارة أو المشروع الأول' : 'Please enter project name');
      return;
    }
    if (sales <= 0 || wip <= 0) {
      alert(isAr ? 'لازم تكتب مبالغ أكبر من الصفر لسعر البيع ومصاريف البناء' : 'Values must be greater than zero');
      return;
    }

    await onSaveAllocation({
      projectName: projectName.trim(),
      salesValue,
      wipAmount,
      propertyId: selectionMode === 'portfolio' ? (selectedPropertyId || undefined) : undefined
    });
    setSaveSuccessData({
      projectName: projectName.trim(),
      salesValue,
      wipAmount,
      factorPct,
      grossMarginPct,
      factor
    });
  };

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'معامل التكلفة الإنشائية للشقة الفاخرة (RSV Factor)' : 'Relative Sales Value (RSV) Allocation Wizard'}
      subtitle={isAr ? 'توزيع مصاريف المباني لحساب معامل التكلفة الإنشائية للشقة الفاخرة وتحديد صافي أرباح المكتب بدقة عند التسليم' : 'IFRS 15 relative sales value COGS capitalization factor'}
      icon={<PieChart size={16} />}
      isAr={isAr}
      maxWidth="680px"
      maxHeight="90vh"
      footer={
        saveSuccessData ? (
          <>
            <button type="button" className={p.primaryButton} onClick={onClose}>
              <CheckCircle2 size={15} />
              <span>{isAr ? 'تم / إغلاق النافذة' : 'Done / Close Window'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={resetForAnother}>
              <RotateCcw size={14} />
              <span>{isAr ? 'حساب دراسة لمشروع آخر' : 'Calculate Another Project'}</span>
            </button>
          </>
        ) : (
          <>
            <button type="submit" form="rsv-allocation-form" className={p.primaryButton} disabled={isMutating}>
              {isMutating ? <Loader2 size={14} className={p.spin} /> : <Calculator size={14} />}
              <span>{isAr ? 'حفظ النسبة وتطبيقها على المشروع' : 'Commit & Save Allocation'}</span>
            </button>
            <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isMutating}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </>
        )
      }
    >
      {saveSuccessData ? (
        <div>
          <section className={p.section}>
            <div className={`${p.notice} ${p.noticeSuccess}`} role="status">
              <CheckCircle2 size={16} className={p.noticeIconSuccess} />
              <div>
                <p className={p.noticeTitle}>
                  {isAr ? 'تم اعتماد وحفظ معامل التكلفة الإنشائية (RSV Factor) ونسب الربحية' : 'RSV Allocation & Margin Factor Saved Successfully'}
                </p>
                <p className={p.noticeBody}>
                  {isAr
                    ? 'تم تسجيل معامل التكلفة في دفتر الحسابات لتطبيقه تلقائياً عند تسليم الوحدات واعتراف الإيراد.'
                    : 'Cost allocation factor recorded in ledger for automated COGS recognition upon delivery.'}
                </p>
              </div>
            </div>
          </section>

          <section className={p.section}>
            <div className={p.sectionHeader}>
              <h4 className={p.sectionTitle}><bdi>{saveSuccessData.projectName}</bdi></h4>
              <span className={`${p.pill} ${p.pillSuccess}`}>
                {isAr ? 'معتمد بالدفاتر · IFRS 15' : 'Ledger Active · IFRS 15'}
              </span>
            </div>
            <dl className={p.metaList}>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'إجمالي المبيعات المستهدفة للمشروع' : 'Target Sales Value'}</dt>
                <dd className={p.metaValue}><bdi>{D(saveSuccessData.salesValue || 0).formatEGP(isAr)}</bdi></dd>
              </div>
              <div className={p.metaRow}>
                <dt className={p.metaKey}>{isAr ? 'مصاريف البناء المعتمدة (WIP)' : 'Incurred WIP / Construction'}</dt>
                <dd className={p.metaValue}><bdi>{D(saveSuccessData.wipAmount || 0).formatEGP(isAr)}</bdi></dd>
              </div>
            </dl>
          </section>

          <section className={p.section}>
            <div className={p.figureGrid}>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'معامل التكلفة الإنشائية (RSV)' : 'Construction Cost Factor (RSV)'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueAccent}`}>{saveSuccessData.factorPct}%</bdi>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'صافي هامش ربحية المكتب' : 'Projected Gross Margin'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSuccess}`}>{saveSuccessData.grossMarginPct}%</bdi>
              </div>
            </div>
            <div className={p.ratioBar} aria-hidden>
              <div className={p.ratioPrimary} style={{ width: `${Math.min(parseFloat(saveSuccessData.factorPct) || 0, 100)}%` }} />
              <div className={p.ratioSecondary} />
            </div>
            <p className={p.hint}>
              {isAr
                ? `عند تسليم أي وحدة في (${saveSuccessData.projectName}) يُرحَّل ${saveSuccessData.factorPct}% من قيمة البيع من مشروعات تحت التنفيذ (105000) إلى تكلفة المبيعات (501000)، ويُعتبر الباقي ${saveSuccessData.grossMarginPct}% صافي ربح للمكتب.`
                : `Upon delivery of any unit in (${saveSuccessData.projectName}), ${saveSuccessData.factorPct}% will be charged to COGS (501000) and the remaining ${saveSuccessData.grossMarginPct}% recognized as gross profit.`}
            </p>
          </section>
        </div>
      ) : (
        <form id="rsv-allocation-form" onSubmit={handleSubmit}>
          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'المشروع المستهدف' : 'Target Project'}</h4>
            <div className={p.segmented} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={selectionMode === 'portfolio'}
                onClick={() => handleModeChange('portfolio')}
                className={selectionMode === 'portfolio' ? `${p.segment} ${p.segmentActive}` : p.segment}
              >
                <Building2 size={14} />
                <span>{isAr ? 'من محفظة الشركة' : 'From Company Portfolio'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectionMode === 'custom'}
                onClick={() => handleModeChange('custom')}
                className={selectionMode === 'custom' ? `${p.segment} ${p.segmentActive}` : p.segment}
              >
                <FolderPlus size={14} />
                <span>{isAr ? 'مشروع جديد يدوياً' : 'New / Custom Project'}</span>
              </button>
            </div>

            {selectionMode === 'portfolio' ? (
              <div className={p.field}>
                <label className={p.label}>{isAr ? 'العمارة أو المشروع *' : 'Property / Project *'}</label>
                <ZFCustomSelect<string>
                  value={selectedPropertyId}
                  onChange={handleSelectProperty}
                  items={propertySelectItems}
                  placeholderAr="اختر المشروع أو العمارة من المحفظة"
                  placeholderEn="Choose property from portfolio"
                  isAr={isAr}
                  searchable={true}
                />
                {selectedProp && (
                  <div className={p.sectionHeader}>
                    <p className={p.metaLine}>
                      <bdi className={p.metaLineStrong}>
                        {isAr ? (selectedProp.title_ar || selectedProp.title_en) : (selectedProp.title_en || selectedProp.title_ar)}
                      </bdi>
                      <span className={p.metaDot}>·</span>
                      <bdi className={p.numeric}>{selectedProp.area_sqm ? `${selectedProp.area_sqm} م²` : (isAr ? 'المساحة غير مُدخلة' : 'Area not entered')}</bdi>
                      <span className={p.metaDot}>·</span>
                      <bdi>{selectedProp.location || (isAr ? 'الموقع غير مُدخل' : 'Location not entered')}</bdi>
                    </p>
                    <span className={selectedProp.completion_status === 'ready' ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillWarning}`}>
                      {selectedProp.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className={p.field}>
                <label className={p.label} htmlFor="rsv-project-name">{isAr ? 'اسم العمارة أو المشروع *' : 'Project Name / Phase *'}</label>
                <input
                  id="rsv-project-name"
                  type="text"
                  required
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder={isAr ? 'مثال: عمارة الفردوس - الحي الخامس' : 'e.g. Palatial Villas & Nile Horizons'}
                  className={p.input}
                />
              </div>
            )}
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'المبيعات والتكلفة' : 'Sales & Cost'}</h4>
            <div className={p.fieldGrid}>
              <div className={p.field}>
                <label className={p.label} htmlFor="rsv-sales">{isAr ? 'إجمالي سعر بيع كل الشقق (المبيعات المتوقعة) *' : 'Sales Value Ceiling *'}</label>
                <div className={p.affixWrap}>
                  <input
                    id="rsv-sales"
                    type="number"
                    step="100000"
                    required
                    value={salesValue}
                    onChange={e => setSalesValue(e.target.value)}
                    className={`${p.input} ${p.numeric}`}
                  />
                  <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <bdi className={`${p.hint} ${p.numeric}`}>{D(salesValue || 0).formatEGP(isAr)}</bdi>
              </div>
              <div className={p.field}>
                <label className={p.label} htmlFor="rsv-wip">{isAr ? 'إجمالي مصاريف المباني والخامات المتوقعة *' : 'Incurred Construction WIP *'}</label>
                <div className={p.affixWrap}>
                  <input
                    id="rsv-wip"
                    type="number"
                    step="100000"
                    required
                    value={wipAmount}
                    onChange={e => setWipAmount(e.target.value)}
                    className={`${p.input} ${p.numeric}`}
                  />
                  <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <bdi className={`${p.hint} ${p.numeric}`}>{D(wipAmount || 0).formatEGP(isAr)}</bdi>
              </div>
            </div>
          </section>

          <section className={p.section}>
            <h4 className={p.sectionTitle}>{isAr ? 'النتيجة اللحظية' : 'Live Result'}</h4>
            <div className={p.figureGrid}>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'معامل التكلفة الإنشائية (RSV)' : 'Construction Ratio (RSV)'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueAccent}`}>{factorPct}%</bdi>
                <span className={p.figureCaption}>{isAr ? 'تكلفة المباني من ثمن البيع' : 'Cost of sales ratio'}</span>
              </div>
              <div className={p.figure}>
                <span className={p.figureLabel}>{isAr ? 'صافي المكسب من بيع الشقق' : 'Projected Gross Margin'}</span>
                <bdi className={`${p.figureValue} ${p.figureValueSuccess}`}>{grossMarginPct}%</bdi>
                <span className={p.figureCaption}>{isAr ? 'مكسب صافي للمكتب' : 'Net office profit margin'}</span>
              </div>
            </div>
            <div className={p.ratioBar} aria-hidden>
              <div className={p.ratioPrimary} style={{ width: `${Math.min(parseFloat(factorPct) || 0, 100)}%` }} />
              <div className={p.ratioSecondary} />
            </div>
            <div className={p.legend}>
              <span className={p.legendItem}><span className={p.legendSwatchPrimary} />{isAr ? 'تكلفة المباني' : 'Construction cost'}</span>
              <span className={p.legendItem}><span className={p.legendSwatchSecondary} />{isAr ? 'هامش الربح' : 'Gross margin'}</span>
            </div>
            <p className={`${p.hint} ${p.numeric}`}>
              <bdi>
                {isAr
                  ? `المعادلة: مصاريف المباني (${D(wip).formatEGP(isAr)}) ÷ إجمالي سعر البيع (${D(sales).formatEGP(isAr)}) = ${factorPct}%`
                  : `RSV = WIP (${D(wip).formatEGP(isAr)}) ÷ Sales (${D(sales).formatEGP(isAr)}) = ${factorPct}%`}
              </bdi>
            </p>
            <p className={p.hint}>
              {isAr
                ? `مثال: شقة مباعة بـ 5,000,000 ج.م تُحمَّل بتكلفة مباني ${D(5000000 * factor).formatEGP(isAr)} (${factorPct}%)، والباقي ${D(5000000 * (1 - factor)).formatEGP(isAr)} صافي ربح للمكتب.`
                : `Example: delivering a 5,000,000 EGP unit relieves ${D(5000000 * factor).formatEGP(isAr)} from WIP (105000) into COGS (501000).`}
            </p>
          </section>
        </form>
      )}
    </ZFModalShell>
  );
};
