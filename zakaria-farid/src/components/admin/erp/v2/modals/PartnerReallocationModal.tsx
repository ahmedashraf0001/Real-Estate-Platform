'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useMemo, useEffect } from 'react';
import { usePropertyCosts } from '../../context/ERPWorkstationContext';
import { 
  ArrowRightLeft, 
  UserMinus, 
  UserPlus, 
  Percent,
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { D } from '@/lib/erp/math';
import { Property } from '@/lib/supabase/types';
import { 
  ERPPartnerProfile, 
  ERPPartnerTransaction,
  DynamicBuildingCapitalInfo
} from '@/lib/erp/types';
import { 
  normalizePropertySplits,
  computeDynamicBuildingCapital,
  executeFullInternalBuyout,
  executePartialSale,
  executeFullSubstitution
} from '@/lib/erp/partnersEngine';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import { toast } from 'sonner';
import { ZFModalShell } from '../common/ZFModalShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFChoices,
  ZFEffect,
  ZFFormFooter,
  zfForm
} from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './PartnerReallocationModal.module.css';

export type ReallocationMode = 'full_buyout' | 'partial_sale' | 'full_substitution';

interface PartnerReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  allPartnerProfiles?: ERPPartnerProfile[];
  partnerTransactions?: ERPPartnerTransaction[];
  isAr?: boolean;
  onSaveProperty: (updatedProperty: Property) => Promise<void> | void;
  allProperties?: Property[];
  initialSellerPartner?: string;
  initialMode?: ReallocationMode;
}

export const PartnerReallocationModal: React.FC<PartnerReallocationModalProps> = ({
  isOpen,
  onClose,
  property,
  allPartnerProfiles = [],
  partnerTransactions = [],
  isAr = true,
  onSaveProperty,
  allProperties = [],
  initialSellerPartner,
  initialMode
}) => {
  const propertyCosts = usePropertyCosts();
  const [mode, setMode] = useState<ReallocationMode>(initialMode || 'full_buyout');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(property.id);
  const [fromPartner, setFromPartner] = useState<string>('');
  const [toPartner, setToPartner] = useState<string>('');
  const [isCustomNewBuyer, setIsCustomNewBuyer] = useState<boolean>(false);
  const [customBuyerName, setCustomBuyerName] = useState<string>('');
  const [soldSharePct, setSoldSharePct] = useState<string>('10');
  const [transferArrears, setTransferArrears] = useState<boolean>(false);
  const [transferValueEgp, setTransferValueEgp] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter building properties from allProperties or fallback to property
  const buildingProperties = useMemo(() => {
    const list = allProperties.filter(p => p.type === 'building');
    if (list.length === 0 && property.type === 'building') {
      return [property];
    }
    if (property.type === 'building' && !list.some(p => p.id === property.id)) {
      return [property, ...list];
    }
    return list;
  }, [allProperties, property]);

  // Sync selectedPropertyId when property prop changes
  useEffect(() => {
    if (property?.id) {
      setSelectedPropertyId(property.id);
    }
  }, [property?.id]);

  // Sync initialMode when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Active property for reallocation
  const activeProperty = useMemo(() => {
    return buildingProperties.find(p => p.id === selectedPropertyId) || property;
  }, [buildingProperties, selectedPropertyId, property]);

  // Normalized active splits on the active property
  const normalizedSplits = useMemo(() => {
    return normalizePropertySplits(activeProperty);
  }, [activeProperty]);

  const activeSplits = useMemo(() => {
    return normalizedSplits.filter(s => !s.is_archived && s.share_percentage > 0);
  }, [normalizedSplits]);

  // Dynamic capital status for arrears lookup
  const capitalInfo: DynamicBuildingCapitalInfo = useMemo(() => {
    return computeDynamicBuildingCapital(activeProperty, partnerTransactions, propertyCosts);
  }, [activeProperty, partnerTransactions, propertyCosts]);

  // Filter eligible sellers
  const eligibleSellers = useMemo(() => {
    if (mode === 'full_buyout' || mode === 'full_substitution') {
      return activeSplits.filter(s => 
        s.partner_name !== PRIMARY_DEVELOPER_NAME && !s.partner_name.includes('زكريا فريد')
      );
    }
    return activeSplits;
  }, [activeSplits, mode]);

  // Set initial or default seller selection
  useEffect(() => {
    if (isOpen) {
      if (initialSellerPartner && eligibleSellers.some(s => s.partner_name === initialSellerPartner)) {
        setFromPartner(initialSellerPartner);
      } else if (eligibleSellers.length > 0 && (!fromPartner || !eligibleSellers.some(s => s.partner_name === fromPartner))) {
        setFromPartner(eligibleSellers[0].partner_name);
      }
    }
  }, [eligibleSellers, initialSellerPartner, selectedPropertyId, isOpen, fromPartner]);

  // Eligible buyers based on mode
  const eligibleExistingBuyers = useMemo(() => {
    return activeSplits.filter(s => s.partner_name !== fromPartner);
  }, [activeSplits, fromPartner]);

  // Reset or initialize buyer
  useEffect(() => {
    if (mode === 'full_buyout') {
      setIsCustomNewBuyer(false);
      if (eligibleExistingBuyers.length > 0 && !eligibleExistingBuyers.some(b => b.partner_name === toPartner)) {
        setToPartner(eligibleExistingBuyers[0].partner_name);
      }
    }
  }, [mode, eligibleExistingBuyers, toPartner]);

  const currentSellerSplit = useMemo(() => {
    return activeSplits.find(s => s.partner_name === fromPartner);
  }, [activeSplits, fromPartner]);

  const sellerArrears = useMemo(() => {
    const status = capitalInfo.partnerStatuses.find(ps => ps.partnerName === fromPartner);
    return status?.arrearsEgp || '0.00';
  }, [capitalInfo, fromPartner]);

  // Effective buyer name
  const effectiveBuyerName = isCustomNewBuyer ? customBuyerName.trim() : toPartner.trim();

  // Simulated After-Splits Preview
  const simulatedPreview = useMemo(() => {
    if (!currentSellerSplit || !effectiveBuyerName || fromPartner === effectiveBuyerName) {
      return {
        splits: activeSplits.map(s => ({
          partner_name: s.partner_name,
          beforePct: s.share_percentage,
          afterPct: s.share_percentage,
          deltaPct: 0,
          isArchived: false
        })),
        totalPct: activeSplits.reduce((sum, s) => sum + s.share_percentage, 0),
        isValid: false,
        validationMsg: isAr ? 'يرجى اختيار الشريك المتنازل والمشتري' : 'Select buyer and seller'
      };
    }

    const sellerShare = currentSellerSplit.share_percentage;
    const numSold = parseFloat(soldSharePct) || 0;

    let transferAmt = 0;
    if (mode === 'full_buyout' || mode === 'full_substitution') {
      transferAmt = sellerShare;
    } else {
      if (numSold <= 0 || numSold >= sellerShare) {
        return {
          splits: activeSplits.map(s => ({
            partner_name: s.partner_name,
            beforePct: s.share_percentage,
            afterPct: s.share_percentage,
            deltaPct: 0,
            isArchived: false
          })),
          totalPct: activeSplits.reduce((sum, s) => sum + s.share_percentage, 0),
          isValid: false,
          validationMsg: isAr ? 'نسبة البيع الجزئي يجب أن تكون أقل من كامل الحصة' : 'Partial share must be less than full share'
        };
      }
      transferAmt = numSold;
    }

    const previewList: Array<{
      partner_name: string;
      beforePct: number;
      afterPct: number;
      deltaPct: number;
      isArchived?: boolean;
    }> = [];

    // Map existing active partners
    activeSplits.forEach(split => {
      let after = split.share_percentage;
      let delta = 0;
      let isArchived = false;

      if (split.partner_name === fromPartner) {
        after = Math.max(0, Number(D(split.share_percentage).minus(transferAmt).toNumber()));
        delta = -transferAmt;
        if (mode === 'full_buyout' || mode === 'full_substitution') {
          isArchived = true;
          after = 0;
        }
      } else if (split.partner_name === effectiveBuyerName) {
        after = Number(D(split.share_percentage).plus(transferAmt).toNumber());
        delta = transferAmt;
      }

      previewList.push({
        partner_name: split.partner_name,
        beforePct: split.share_percentage,
        afterPct: after,
        deltaPct: delta,
        isArchived
      });
    });

    // If buyer is brand new not currently in active splits
    const existingBuyerInPreview = previewList.find(p => p.partner_name === effectiveBuyerName);
    if (!existingBuyerInPreview) {
      previewList.push({
        partner_name: effectiveBuyerName,
        beforePct: 0,
        afterPct: transferAmt,
        deltaPct: transferAmt,
        isArchived: false
      });
    }

    const activeAfterTotal = previewList
      .filter(p => !p.isArchived)
      .reduce((sum, p) => sum + p.afterPct, 0);

    const isTotal100 = Math.abs(activeAfterTotal - 100) < 0.001;

    return {
      splits: previewList,
      totalPct: activeAfterTotal,
      isValid: isTotal100,
      validationMsg: isTotal100 
        ? (isAr ? '100% تطابق تام ومحقق' : '100% Fully Balanced')
        : (isAr ? `تنبيه: الإجمالي المحاكى (${activeAfterTotal}%) لا يساوي 100%` : `Alert: Total (${activeAfterTotal}%) != 100%`)
    };
  }, [activeSplits, currentSellerSplit, effectiveBuyerName, fromPartner, mode, soldSharePct, isAr]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedPreview.isValid || isSubmitting) return;

    if (!fromPartner || !effectiveBuyerName) {
      toast.error(isAr ? 'يرجى تحديد الشريكين لإتمام العملية' : 'Please select both partners');
      return;
    }

    if (fromPartner === effectiveBuyerName) {
      toast.error(isAr ? 'لا يمكن التنازل لنفس الشريك' : 'Cannot transfer to the same partner');
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedProperty: Property;

      if (mode === 'full_buyout') {
        updatedProperty = executeFullInternalBuyout({
          property: activeProperty,
          fromPartnerName: fromPartner,
          toPartnerName: effectiveBuyerName,
          effectiveDate,
          transferValueEgp: transferValueEgp || undefined,
          notes: notes || undefined
        });
      } else if (mode === 'partial_sale') {
        updatedProperty = executePartialSale({
          property: activeProperty,
          fromPartnerName: fromPartner,
          toPartnerName: effectiveBuyerName,
          soldSharePct: Number(soldSharePct),
          effectiveDate,
          transferValueEgp: transferValueEgp || undefined,
          notes: notes || undefined
        });
      } else {
        updatedProperty = executeFullSubstitution({
          property: activeProperty,
          fromPartnerName: fromPartner,
          toPartnerName: effectiveBuyerName,
          effectiveDate,
          transferValueEgp: transferValueEgp || undefined,
          transferArrears,
          transferredArrearsEgp: transferArrears ? sellerArrears : undefined,
          notes: notes || undefined
        });
      }

      await onSaveProperty(updatedProperty);
      toast.success(
        isAr ? 'تمت إعادة هيكلة وتوثيق حركة الحصص بنجاح' : 'Partnership reallocation executed successfully'
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        isAr ? 'فشلت عملية إعادة الهيكلة' : 'Reallocation failed',
        { description: msg }
      );
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
        disabled={isSubmitting}
      >
        {isAr ? 'إلغاء' : 'Cancel'}
      </button>
      <button
        type="submit"
        form="zf-reallocation-form"
        className={shellStyles.btnPrimary}
        disabled={!simulatedPreview.isValid || isSubmitting}
      >
        {isSubmitting
          ? (isAr ? 'جارٍ التوثيق…' : 'Saving…')
          : (isAr ? 'اعتماد التنازل' : 'Commit reallocation')}
      </button>
    </ZFFormFooter>
  );

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'إعادة توزيع الحصص' : 'Equity reallocation'}
      subtitle={
        isAr
          ? 'إدارة التخارج والشراء الداخلي والتنازل عن الحصص بين الشركاء.'
          : 'Manage partner exits, buyouts, and share transfers.'
      }
      icon={<ArrowRightLeft size={18} />}
      isAr={isAr}
      maxWidth="880px"
      footer={footer}
    >
      <form id="zf-reallocation-form" className={zfForm.form} onSubmit={handleConfirm}>
        {/* 1. Mode Pathway */}
        <ZFField label={isAr ? 'نوع التنازل' : 'Transfer type'}>
          <ZFChoices<ReallocationMode>
            value={mode}
            onChange={setMode}
            options={[
              {
                id: 'full_buyout',
                label: isAr ? 'تخارج وشراء داخلي' : 'Internal buyout',
                sub: isAr ? 'تنازل كامل لشريك قائم' : 'Exit to existing partner',
                icon: <UserMinus size={16} />
              },
              {
                id: 'partial_sale',
                label: isAr ? 'تنازل وبيع جزئي' : 'Partial sale',
                sub: isAr ? 'بيع جزء من الحصة' : 'Sell share %',
                icon: <Percent size={16} />
              },
              {
                id: 'full_substitution',
                label: isAr ? 'إحلال شريك جديد' : 'Full substitution',
                sub: isAr ? 'دخول شريك بديل' : 'Replace partner',
                icon: <UserPlus size={16} />
              }
            ]}
          />
        </ZFField>

        {/* 2. Building Project Selection (if multiple) */}
        {buildingProperties.length > 1 && (
          <ZFField label={isAr ? 'المشروع العقاري' : 'Building project'}>
            <select
              className={zfForm.control}
              value={selectedPropertyId}
              onChange={e => {
                setSelectedPropertyId(e.target.value);
                setFromPartner('');
                setToPartner('');
              }}
            >
              {buildingProperties.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title_ar || b.title_en}
                </option>
              ))}
            </select>
          </ZFField>
        )}

        {/* 3. Partners Row: Seller & Buyer */}
        <div className={zfForm.row}>
          {/* Seller */}
          <ZFField
            label={isAr ? 'الشريك المتنازل' : 'Selling partner'}
            required
            hint={
              currentSellerSplit
                ? (isAr ? `الحصة الحالية: ${currentSellerSplit.share_percentage}%` : `Current share: ${currentSellerSplit.share_percentage}%`)
                : undefined
            }
          >
            <select
              className={zfForm.control}
              value={fromPartner}
              onChange={e => setFromPartner(e.target.value)}
            >
              {eligibleSellers.map(s => (
                <option key={s.partner_name} value={s.partner_name}>
                  {s.partner_name} ({s.share_percentage}%)
                </option>
              ))}
            </select>
          </ZFField>

          {/* Buyer */}
          <ZFField
            label={isAr ? 'الشريك المشتري' : 'Buyer'}
            required
            aside={
              mode !== 'full_buyout' ? (
                <button
                  type="button"
                  className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                  onClick={() => {
                    setIsCustomNewBuyer(!isCustomNewBuyer);
                    if (!isCustomNewBuyer) setCustomBuyerName('');
                  }}
                >
                  {isCustomNewBuyer ? (isAr ? 'من القائمة' : 'From list') : (isAr ? '+ شريك جديد' : '+ New partner')}
                </button>
              ) : undefined
            }
          >
            {isCustomNewBuyer ? (
              <input
                type="text"
                className={zfForm.control}
                placeholder={isAr ? 'اسم الشريك الجديد…' : 'New partner name…'}
                value={customBuyerName}
                onChange={e => setCustomBuyerName(e.target.value)}
                required
              />
            ) : (
              <select
                className={zfForm.control}
                value={toPartner}
                onChange={e => setToPartner(e.target.value)}
              >
                <optgroup label={isAr ? 'شركاء حاليون بالمشروع' : 'Current building partners'}>
                  {eligibleExistingBuyers.map(b => (
                    <option key={b.partner_name} value={b.partner_name}>
                      {b.partner_name} ({b.share_percentage}%)
                    </option>
                  ))}
                </optgroup>
                {mode !== 'full_buyout' && allPartnerProfiles.length > 0 && (
                  <optgroup label={isAr ? 'دليل الشركاء العام' : 'General partners'}>
                    {allPartnerProfiles
                      .filter(p => !eligibleExistingBuyers.some(b => b.partner_name === p.name) && p.name !== fromPartner)
                      .map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.role})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            )}
          </ZFField>
        </div>

        {/* 4. Mode-Specific Inputs */}
        {mode === 'partial_sale' && (
          <ZFField
            label={isAr ? 'النسبة المئوية المراد بيعها (%)' : 'Percentage to sell (%)'}
            required
            hint={
              currentSellerSplit
                ? (isAr ? `الحد الأقصى: ${(currentSellerSplit.share_percentage - 0.01).toFixed(2)}%` : `Max: ${(currentSellerSplit.share_percentage - 0.01).toFixed(2)}%`)
                : undefined
            }
          >
            <div className={styles.rangeWrap}>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={currentSellerSplit ? (currentSellerSplit.share_percentage - 0.01) : 99}
                value={soldSharePct}
                onChange={e => setSoldSharePct(e.target.value)}
                className={`${zfForm.control} ${zfForm.money}`}
                required
              />
              <input
                type="range"
                min="1"
                max={currentSellerSplit ? Math.max(1, currentSellerSplit.share_percentage - 1) : 50}
                step="1"
                value={parseFloat(soldSharePct) || 1}
                onChange={e => setSoldSharePct(e.target.value)}
                className={styles.rangeSlider}
              />
            </div>
          </ZFField>
        )}

        {mode === 'full_substitution' && (
          <label className={styles.checkboxWrap}>
            <input
              type="checkbox"
              checked={transferArrears}
              onChange={e => setTransferArrears(e.target.checked)}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxTexts}>
              <span className={styles.checkboxTitle}>
                {isAr ? 'نقل المتأخرات والالتزامات السابقة للشريك الجديد' : 'Transfer past arrears to new partner'}
                {D(sellerArrears).gt(0) ? ` (${D(sellerArrears).formatEGP(isAr)})` : ''}
              </span>
              <span className={styles.checkboxSub}>
                {isAr
                  ? 'يلتزم الشريك الجديد بسداد المتأخرات المستحقة على الحصة.'
                  : 'New partner assumes previous unpaid capital calls on this share.'}
              </span>
            </span>
          </label>
        )}

        {/* 5. Row: Valuation & Effective Date */}
        <div className={zfForm.row}>
          <ZFField label={isAr ? 'قيمة التنازل المتفق عليها' : 'Transfer valuation'}>
            <ZFMoneyInput
              value={transferValueEgp}
              onChange={e => setTransferValueEgp(e.target.value)}
              unit={isAr ? 'ج.م' : 'EGP'}
              placeholder="0.00"
            />
          </ZFField>
          <ZFField label={isAr ? 'تاريخ السريان' : 'Effective date'} required>
            <input
              type="date"
              className={zfForm.control}
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              required
            />
          </ZFField>
        </div>

        {/* 6. Notes */}
        <ZFField label={isAr ? 'ملاحظات الاتفاق' : 'Agreement notes'}>
          <input
            type="text"
            className={zfForm.control}
            placeholder={isAr ? 'رقم العقد الودي، شروط مضافة (اختياري)…' : 'Optional agreement notes…'}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </ZFField>

        {/* 7. Effect Note */}
        {!simulatedPreview.isValid ? (
          <ZFEffect tone="warn">
            {simulatedPreview.validationMsg}
          </ZFEffect>
        ) : (
          <ZFEffect>
            {isAr ? (
              <>
                {mode === 'full_buyout' && (
                  <>سيتنازل <strong>{fromPartner}</strong> عن كامل حصته ({currentSellerSplit?.share_percentage}%) لصالح <strong>{effectiveBuyerName}</strong> في <strong>{activeProperty.title_ar || activeProperty.title_en}</strong>.</>
                )}
                {mode === 'partial_sale' && (
                  <>سيتنازل <strong>{fromPartner}</strong> عن <strong>{soldSharePct}%</strong> لصالح <strong>{effectiveBuyerName}</strong> في <strong>{activeProperty.title_ar || activeProperty.title_en}</strong>.</>
                )}
                {mode === 'full_substitution' && (
                  <>سيحل <strong>{effectiveBuyerName}</strong> محل <strong>{fromPartner}</strong> بكامل حصته ({currentSellerSplit?.share_percentage}%){transferArrears ? ' مع نقل المتأخرات' : ''} في <strong>{activeProperty.title_ar || activeProperty.title_en}</strong>.</>
                )}
              </>
            ) : (
              <>
                {fromPartner} transfers equity to {effectiveBuyerName} on {activeProperty.title_en || activeProperty.title_ar}.
              </>
            )}
          </ZFEffect>
        )}

        {/* 8. Live Simulation Section */}
        <div className={styles.simBox}>
          <div className={styles.simHeader}>
            <span className={styles.simTitle}>
              {isAr ? 'محاكاة توزيع الحصص (بعد التنفيذ)' : 'Equity share simulation (after)'}
            </span>
            <span
              className={`${shellStyles.statusPill} ${
                simulatedPreview.isValid
                  ? shellStyles.statusPillGreen
                  : shellStyles.statusPillRed
              }`}
            >
              {simulatedPreview.isValid ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              <span>{simulatedPreview.validationMsg}</span>
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className={styles.stackedBar}>
            {simulatedPreview.splits
              .filter(s => !s.isArchived && s.afterPct > 0)
              .map((s, idx) => (
                <div
                  key={s.partner_name}
                  className={`${styles.seg} ${styles[`seg${idx % 6}`]}`}
                  style={{ width: `${s.afterPct}%` }}
                  title={`${s.partner_name}: ${s.afterPct}%`}
                />
              ))}
          </div>

          {/* Comparative Table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{isAr ? 'الشريك' : 'Partner'}</th>
                  <th className={styles.cellCenter}>{isAr ? 'الحصة السابقة' : 'Before'}</th>
                  <th className={styles.cellCenter}>{isAr ? 'الحركة' : 'Change'}</th>
                  <th className={styles.cellCenter}>{isAr ? 'الحصة الجديدة' : 'After'}</th>
                  <th className={styles.cellCenter}>{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {simulatedPreview.splits.map(s => (
                  <tr key={s.partner_name}>
                    <td><strong>{s.partner_name}</strong></td>
                    <td className={styles.cellCenter}>{s.beforePct}%</td>
                    <td className={styles.cellCenter}>
                      {s.deltaPct > 0 && <span className={shellStyles.statusPillGreen}>+{s.deltaPct}%</span>}
                      {s.deltaPct < 0 && <span className={shellStyles.statusPillRed}>{s.deltaPct}%</span>}
                      {s.deltaPct === 0 && '—'}
                    </td>
                    <td className={styles.cellCenter}><strong>{s.afterPct}%</strong></td>
                    <td className={styles.cellCenter}>
                      {s.isArchived ? (
                        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>
                          {isAr ? 'تخارج' : 'Exited'}
                        </span>
                      ) : (
                        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
                          {isAr ? 'مستمر' : 'Active'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </ZFModalShell>
  );
};
