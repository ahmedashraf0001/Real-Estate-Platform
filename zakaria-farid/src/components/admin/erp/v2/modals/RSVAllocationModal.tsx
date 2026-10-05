'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  PieChart, 
  FolderPlus 
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import type { ERPPropertyCostItem } from '@/lib/erp/types';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  ZFFacts,
  ZFEffect,
  ZFFormFooter,
  ZFFormDone,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './RSVAllocationModal.module.css';

interface RSVAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  /** Recorded cost items, used to fill the actual building cost of the chosen project. */
  propertyCosts?: ERPPropertyCostItem[];
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
  propertyCosts = [],
  onSaveAllocation,
  isMutating = false,
  isAr = true
}) => {
  const [selectionMode, setSelectionMode] = useState<'portfolio' | 'custom'>('portfolio');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [salesValue, setSalesValue] = useState<string>('');
  const [wipAmount, setWipAmount] = useState<string>('');
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
      setSalesValue('');
      setWipAmount('');
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

  if (!isOpen) return null;

  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    if (propId) {
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        const pTitle = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
        setProjectName(pTitle || '');
        // Real numbers only: list price and the costs actually recorded for this project.
        setSalesValue(prop.price_egp ? String(prop.price_egp) : '');
        const recorded = propertyCosts
          .filter(c => c.property_id === prop.id)
          .reduce((sum, c) => sum + (Number(c.total_cost_egp) || 0), 0);
        setWipAmount(recorded > 0 ? String(Math.round(recorded)) : '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectionMode === 'portfolio' && !selectedPropertyId) {
      alert(isAr ? 'يرجى اختيار العمارة أو المشروع المستهدف من القائمة' : 'Please select a property from the portfolio');
      return;
    }
    if (!projectName.trim()) {
      alert(isAr ? 'اكتب اسم العمارة أو المشروع' : 'Please enter project name');
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

  const footer = saveSuccessData ? (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={() => {
          setSaveSuccessData(null);
          setSelectedPropertyId('');
          setProjectName('');
          setSalesValue('');
          setWipAmount('');
        }}
      >
        {isAr ? 'مشروع آخر' : 'Another project'}
      </button>
      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={onClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  ) : (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-rsv-form"
        className={shellStyles.btnPrimary}
        disabled={isMutating}
      >
        {isMutating ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ المعامل' : 'Save factor')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'معامل التكلفة الإنشائية' : 'Relative Sales Value'}
      subtitle={
        isAr
          ? 'توزيع مصاريف المباني لحساب معامل التكلفة وتحديد هامش أرباح المكتب عند التسليم.'
          : 'Relative sales value allocation to determine cost factor and office margin upon delivery.'
      }
      icon={<PieChart size={18} />}
      isAr={isAr}
      maxWidth="640px"
      footer={footer}
    >
      {saveSuccessData ? (
        <ZFFormDone
          title={isAr ? 'تم حفظ معامل التكلفة الإنشائية' : 'Cost Factor Saved'}
          text={
            isAr
              ? `تم تسجيل المعامل بنجاح لمشروع ${saveSuccessData.projectName}.`
              : `Cost factor recorded successfully for ${saveSuccessData.projectName}.`
          }
        >
          <ZFFacts
            items={[
              {
                label: isAr ? 'المبيعات' : 'Sales',
                value: Number(saveSuccessData.salesValue).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
              },
              {
                label: isAr ? 'مصاريف المباني' : 'WIP',
                value: Number(saveSuccessData.wipAmount).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
              },
              {
                label: isAr ? 'معامل التكلفة' : 'Cost factor',
                value: `${saveSuccessData.factorPct}%`
              },
              {
                label: isAr ? 'هامش الربح' : 'Margin',
                value: `${saveSuccessData.grossMarginPct}%`,
                tone: 'pos'
              }
            ]}
          />
        </ZFFormDone>
      ) : (
        <form id="zf-rsv-form" className={zfForm.form} onSubmit={handleSubmit}>
          {/* 1. Mode selector */}
          <ZFField label={isAr ? 'طريقة تحديد المشروع' : 'Project source'}>
            <ZFChoices<'portfolio' | 'custom'>
              value={selectionMode}
              onChange={handleModeChange}
              options={[
                {
                  id: 'portfolio',
                  label: isAr ? 'مشروع من المحفظة' : 'From portfolio',
                  icon: <Building2 size={16} />
                },
                {
                  id: 'custom',
                  label: isAr ? 'مشروع جديد' : 'Custom project',
                  icon: <FolderPlus size={16} />
                }
              ]}
            />
          </ZFField>

          {/* 2. Target project input / select */}
          {selectionMode === 'portfolio' ? (
            <ZFField label={isAr ? 'المشروع المستهدف' : 'Target property'} required>
              <select
                className={zfForm.control}
                value={selectedPropertyId}
                onChange={e => handleSelectProperty(e.target.value)}
                required
              >
                <option value="">
                  {isAr ? '-- اختر المشروع من المحفظة --' : '-- Choose property --'}
                </option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {(isAr ? p.title_ar || p.title_en : p.title_en || p.title_ar)} ({p.area_sqm} م²)
                  </option>
                ))}
              </select>
            </ZFField>
          ) : (
            <ZFField label={isAr ? 'اسم المشروع' : 'Project name'} required>
              <input
                type="text"
                className={zfForm.control}
                required
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder={isAr ? 'مثال: عمارة الفردوس' : 'e.g. Al-Ferdaws Building'}
              />
            </ZFField>
          )}

          {selectedProp && selectionMode === 'portfolio' && (
            <ZFFacts
              items={[
                {
                  label: isAr ? 'المساحة' : 'Area',
                  value: `${selectedProp.area_sqm} م²`
                },
                {
                  label: isAr ? 'الموقع' : 'Location',
                  value: selectedProp.location || (isAr ? 'الشرقية' : 'Sharqia')
                },
                {
                  label: isAr ? 'الحالة' : 'Status',
                  value: selectedProp.completion_status === 'ready'
                    ? (isAr ? 'جاهز للتسليم' : 'Ready')
                    : (isAr ? 'قيد التطوير' : 'In Progress')
                }
              ]}
            />
          )}

          {/* 3. Amounts */}
          <div className={zfForm.row}>
            <ZFField
              label={isAr ? 'إجمالي المبيعات المستهدفة' : 'Target sales value'}
              required
              hint={salesValue ? (Number(salesValue).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')) : undefined}
            >
              <ZFMoneyInput
                value={salesValue}
                onChange={e => setSalesValue(e.target.value)}
                required
              />
            </ZFField>

            <ZFField
              label={isAr ? 'مصاريف المباني المتوقعة' : 'Expected construction WIP'}
              required
              hint={wipAmount ? (Number(wipAmount).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')) : undefined}
            >
              <ZFMoneyInput
                value={wipAmount}
                onChange={e => setWipAmount(e.target.value)}
                required
              />
            </ZFField>
          </div>

          {/* 4. Live calculations */}
          <ZFFacts
            items={[
              {
                label: isAr ? 'معامل التكلفة الإنشائية' : 'Cost factor',
                value: `${factorPct}%`
              },
              {
                label: isAr ? 'هامش الربح المتوقع' : 'Gross margin',
                value: `${grossMarginPct}%`,
                tone: 'pos'
              }
            ]}
          />

          {/* 5. Progress bar */}
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFillAccent}
              style={{ width: `${Math.min(parseFloat(factorPct) || 0, 100)}%` }}
            />
            <div className={styles.progressFillSuccess} />
          </div>

          {/* 6. Effect */}
          <ZFEffect tone="info">
            {isAr
              ? `سيُعتمد معامل تكلفة ${factorPct}% لمشروع ${projectName || 'المشروع'}، ويُسجل الباقي (${grossMarginPct}%) كهامش ربح للمكتب عند تسليم الوحدات.`
              : `A cost factor of ${factorPct}% will be allocated to ${projectName || 'the project'}, with ${grossMarginPct}% recognized as margin upon delivery.`}
          </ZFEffect>
        </form>
      )}
    </ZFModalShell>
  );
};
