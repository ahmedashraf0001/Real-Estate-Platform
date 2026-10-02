'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  UserMinus,
  UserPlus,
  Percent,
  Crown,
  Loader2
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
import p from '../common/ZFModalPrimitives.module.css';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';

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
    return computeDynamicBuildingCapital(activeProperty, partnerTransactions);
  }, [activeProperty, partnerTransactions]);

  // Filter eligible sellers
  // For full_buyout and full_substitution: founder cannot exit
  // For partial_sale: founder can sell partial share as long as share remains > 0
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
  }, [eligibleSellers, initialSellerPartner, selectedPropertyId, isOpen]);

  // Eligible buyers based on mode
  const eligibleExistingBuyers = useMemo(() => {
    if (mode === 'full_buyout') {
      // Must be an active partner in this building different from seller
      return activeSplits.filter(s => s.partner_name !== fromPartner);
    }
    if (mode === 'partial_sale') {
      // Can be an existing partner in this building (excluding seller) or an external profile
      return activeSplits.filter(s => s.partner_name !== fromPartner);
    }
    // full_substitution: usually a new partner or external profile
    return activeSplits.filter(s => s.partner_name !== fromPartner);
  }, [activeSplits, fromPartner, mode]);

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

  if (!isOpen) return null;

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
        isAr ? 'تمت إعادة هيكلة وتوثيق حركة الحصص بنجاح' : 'Partnership reallocation executed successfully',
        {
          description: isAr 
            ? `المبنى: ${activeProperty.title_ar || activeProperty.title_en} • تم تحديث سجل الملكية وقيد التاريخ`
            : `Building: ${activeProperty.title_ar || activeProperty.title_en} • Ownership log recorded`,
          duration: 5000
        }
      );
      onClose();
    } catch (err: any) {
      console.error('Reallocation error:', err);
      toast.error(
        isAr ? 'فشلت عملية إعادة الهيكلة' : 'Reallocation failed',
        { description: err?.message || String(err) }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameOf = (n: string) => (isAr ? localizeBuyerName(n) : n);
  const isFounderName = (n: string) => n === PRIMARY_DEVELOPER_NAME || n.includes('زكريا فريد');
  const pathways: { id: ReallocationMode; icon: React.ElementType; titleAr: string; titleEn: string; descAr: string; descEn: string }[] = [
    { id: 'full_buyout', icon: UserMinus, titleAr: 'تخارج كامل لصالح شريك قائم', titleEn: 'Full Internal Buyout', descAr: 'خروج البائع تماماً وانتقال حصته لشريك حالي', descEn: '100% exit and transfer to an existing partner' },
    { id: 'partial_sale', icon: Percent, titleAr: 'بيع جزئي من الحصة', titleEn: 'Partial Share Sale', descAr: 'بيع جزء من الحصة لشريك قائم أو جديد', descEn: 'Carve out a % to a current or new partner' },
    { id: 'full_substitution', icon: UserPlus, titleAr: 'إحلال كامل لشريك جديد', titleEn: 'Full Substitution', descAr: 'شريك جديد محل المتخارج مع خيار نقل المتأخرات', descEn: 'Full exit to a new partner, optional arrears transfer' },
  ];
  const directoryCandidates = allPartnerProfiles.filter(pr => !eligibleExistingBuyers.some(b => b.partner_name === pr.name) && pr.name !== fromPartner);

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'التخارج وإعادة توزيع الحصص' : 'Equity Reallocation & Exit'}
      subtitle={isAr
        ? 'تخارج، شراء داخلي أو تنازل جزئي مع تدقيق إجمالي 100% وسجل ملكية غير قابل للتعديل'
        : 'Exits, internal buyouts and partial sales with a 100% equity check and immutable log'}
      icon={<ArrowRightLeft size={16} />}
      isAr={isAr}
      maxWidth="780px"
      maxHeight="94vh"
      footer={
        <>
          <button
            type="submit"
            form="partner-reallocation-form"
            className={p.primaryButton}
            disabled={!simulatedPreview.isValid || isSubmitting}
          >
            {isSubmitting ? <Loader2 size={14} className={p.spin} /> : <CheckCircle2 size={14} />}
            <span>
              {isSubmitting
                ? (isAr ? 'جاري توثيق التنازل...' : 'Committing...')
                : (isAr ? 'اعتماد التنازل وتوثيق الملكية' : 'Commit & Record Reallocation')}
            </span>
          </button>
          <button type="button" className={p.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </>
      }
    >
      <form id="partner-reallocation-form" onSubmit={handleConfirm}>
        {/* Building */}
        <section className={p.section}>
          <div className={p.field}>
            <label className={p.label} htmlFor="ra-building">{isAr ? 'العمارة' : 'Building'}</label>
            {buildingProperties.length > 1 ? (
              <select
                id="ra-building"
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setFromPartner('');
                  setToPartner('');
                }}
                className={p.input}
              >
                {buildingProperties.map(b => (
                  <option key={b.id} value={b.id}>
                    {isAr ? (b.title_ar || b.title_en) : (b.title_en || b.title_ar)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="ra-building"
                type="text"
                readOnly
                value={(isAr ? (activeProperty.title_ar || activeProperty.title_en) : (activeProperty.title_en || activeProperty.title_ar)) || ''}
                className={`${p.input} ${p.inputReadonly}`}
              />
            )}
          </div>
        </section>

        {/* Pathway */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'مسار إعادة الهيكلة' : 'Reallocation Pathway'}</h4>
          <div className={`${p.choiceGrid} ${p.choiceGrid3}`} role="radiogroup">
            {pathways.map(pw => {
              const Icon = pw.icon;
              const selected = mode === pw.id;
              return (
                <button
                  key={pw.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(pw.id)}
                  className={selected ? `${p.choice} ${p.choiceStacked} ${p.choiceSelected}` : `${p.choice} ${p.choiceStacked}`}
                >
                  <span className={p.choiceIcon}><Icon size={16} /></span>
                  <span className={p.choiceText}>
                    <span className={p.choiceTitle}>{isAr ? pw.titleAr : pw.titleEn}</span>
                    <span className={p.choiceDesc}>{isAr ? pw.descAr : pw.descEn}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Parties */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'أطراف التنازل' : 'Parties'}</h4>
          <div className={p.fieldGrid}>
            <div className={p.field}>
              <div className={p.labelRow}>
                <label className={p.label} htmlFor="ra-seller">{isAr ? 'الشريك المتنازل / البائع' : 'Exiting / Selling Partner'}</label>
                {currentSellerSplit && (
                  <bdi className={`${p.pill} ${p.numeric}`}>{currentSellerSplit.share_percentage}%</bdi>
                )}
              </div>
              <select
                id="ra-seller"
                value={fromPartner}
                onChange={(e) => setFromPartner(e.target.value)}
                className={p.input}
              >
                {eligibleSellers.map(s => (
                  <option key={s.partner_name} value={s.partner_name}>
                    {nameOf(s.partner_name)} ({s.share_percentage}%)
                  </option>
                ))}
              </select>
              {fromPartner && (
                <p className={p.hint}>
                  {isAr ? 'متأخرات مساهمة رأس المال: ' : 'Capital arrears: '}
                  <bdi className={D(sellerArrears).gt(0) ? p.textDanger : p.textSuccess}>{D(sellerArrears).formatEGP(isAr)}</bdi>
                </p>
              )}
            </div>

            <div className={p.field}>
              <div className={p.labelRow}>
                <label className={p.label} htmlFor="ra-buyer">{isAr ? 'الشريك المشتري / المتنازل له' : 'Buyer / Incoming Partner'}</label>
                {mode !== 'full_buyout' && (
                  <button
                    type="button"
                    className={p.linkButton}
                    aria-pressed={isCustomNewBuyer}
                    onClick={() => {
                      setIsCustomNewBuyer(!isCustomNewBuyer);
                      if (!isCustomNewBuyer) setCustomBuyerName('');
                    }}
                  >
                    {isCustomNewBuyer
                      ? (isAr ? 'اختر من الشركاء' : 'Select from list')
                      : (isAr ? 'طرف خارجي جديد' : 'New external party')}
                  </button>
                )}
              </div>
              {isCustomNewBuyer ? (
                <input
                  id="ra-buyer"
                  type="text"
                  placeholder={isAr ? 'اسم الشريك الجديد بالكامل' : 'Full name of the new partner'}
                  value={customBuyerName}
                  onChange={(e) => setCustomBuyerName(e.target.value)}
                  required
                  className={p.input}
                />
              ) : (
                <select
                  id="ra-buyer"
                  value={toPartner}
                  onChange={(e) => setToPartner(e.target.value)}
                  className={p.input}
                >
                  <optgroup label={isAr ? 'شركاء حاليون بالعمارة' : 'Current Building Partners'}>
                    {eligibleExistingBuyers.map(b => (
                      <option key={b.partner_name} value={b.partner_name}>
                        {nameOf(b.partner_name)} ({b.share_percentage}%)
                      </option>
                    ))}
                  </optgroup>
                  {mode !== 'full_buyout' && directoryCandidates.length > 0 && (
                    <optgroup label={isAr ? 'شركاء مسجلون بالدليل العام' : 'Registered Directory Partners'}>
                      {directoryCandidates.map(pr => (
                        <option key={pr.id} value={pr.name}>
                          {nameOf(pr.name)} ({pr.role})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
              <p className={p.hint}>
                {mode === 'full_buyout'
                  ? (isAr ? 'تنتقل إليه كامل حصة الشريك البائع' : 'Receives the seller\'s full share')
                  : (isAr ? 'تضاف الحصة المتفق عليها لمحفظته' : 'Receives the agreed share')}
              </p>
            </div>
          </div>
        </section>

        {/* Terms */}
        <section className={p.section}>
          <h4 className={p.sectionTitle}>{isAr ? 'شروط التنازل' : 'Terms'}</h4>

          {mode === 'partial_sale' && (
            <div className={p.field}>
              <div className={p.labelRow}>
                <label className={p.label} htmlFor="ra-pct">{isAr ? 'النسبة المراد بيعها' : 'Percentage to Transfer'}</label>
                {currentSellerSplit && (
                  <bdi className={`${p.hint} ${p.numeric}`}>
                    {isAr ? 'الحد الأقصى ' : 'Max '}{(currentSellerSplit.share_percentage - 0.01).toFixed(2)}%
                  </bdi>
                )}
              </div>
              <div className={p.rangeRow}>
                <div className={p.affixWrap}>
                  <input
                    id="ra-pct"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={currentSellerSplit ? (currentSellerSplit.share_percentage - 0.01) : 99}
                    value={soldSharePct}
                    onChange={(e) => setSoldSharePct(e.target.value)}
                    required
                    className={`${p.input} ${p.numeric}`}
                  />
                  <span className={p.affix}>%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={currentSellerSplit ? Math.max(1, currentSellerSplit.share_percentage - 1) : 50}
                  step="1"
                  value={parseFloat(soldSharePct) || 1}
                  onChange={(e) => setSoldSharePct(e.target.value)}
                  className={p.range}
                  aria-label={isAr ? 'النسبة المراد بيعها' : 'Percentage to transfer'}
                />
              </div>
            </div>
          )}

          {mode === 'full_substitution' && (
            <label className={p.check}>
              <input
                type="checkbox"
                checked={transferArrears}
                onChange={(e) => setTransferArrears(e.target.checked)}
              />
              <span>
                {isAr ? 'نقل المتأخرات والالتزامات السابقة للشريك الجديد' : 'Transfer past arrears to the new partner'}
                {D(sellerArrears).gt(0) && (
                  <> · <bdi className={p.textDanger}>{D(sellerArrears).formatEGP(isAr)}</bdi></>
                )}
                <span className={p.cellSub}>
                  {isAr
                    ? 'يلتزم الشريك الجديد بسداد التزامات رأس المال المتأخرة على الحصة'
                    : 'The new partner assumes past unpaid capital calls on this share'}
                </span>
              </span>
            </label>
          )}

          <div className={p.fieldGrid}>
            <div className={p.field}>
              <label className={p.label} htmlFor="ra-value">{isAr ? 'قيمة التنازل المتفق عليها (اختياري)' : 'Agreed Transfer Value (Optional)'}</label>
              <div className={p.affixWrap}>
                <input
                  id="ra-value"
                  type="number"
                  min="0"
                  step="5000"
                  placeholder="0.00"
                  value={transferValueEgp}
                  onChange={(e) => setTransferValueEgp(e.target.value)}
                  className={`${p.input} ${p.numeric}`}
                />
                <span className={p.affix}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
            <div className={p.field}>
              <label className={p.label} htmlFor="ra-date">{isAr ? 'تاريخ سريان التنازل' : 'Effective Date'}</label>
              <input
                id="ra-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className={`${p.input} ${p.numeric}`}
              />
            </div>
            <div className={`${p.field} ${p.fieldFull}`}>
              <label className={p.label} htmlFor="ra-notes">{isAr ? 'بيان الاتفاق' : 'Agreement Terms & Notes'}</label>
              <input
                id="ra-notes"
                type="text"
                placeholder={isAr ? 'بيان الاتفاق، رقم العقد الودي، وأي شروط مضافة' : 'Notes or agreement memo'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={p.input}
              />
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className={p.section}>
          <div className={p.sectionHeader}>
            <h4 className={p.sectionTitle}>{isAr ? 'الحصص قبل وبعد التنفيذ' : 'Shares Before & After'}</h4>
            <span className={simulatedPreview.isValid ? `${p.pill} ${p.pillSuccess}` : `${p.pill} ${p.pillWarning}`}>
              {simulatedPreview.isValid ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              <span>{simulatedPreview.validationMsg}</span>
            </span>
          </div>
          <div className={p.ratioBar} aria-hidden>
            {simulatedPreview.splits
              .filter(s => !s.isArchived && s.afterPct > 0)
              .map(s => (
                <div
                  key={s.partner_name}
                  className={isFounderName(s.partner_name) ? `${p.equitySeg} ${p.equitySegFounder}` : p.equitySeg}
                  style={{ width: `${s.afterPct}%` }}
                  title={`${nameOf(s.partner_name)}: ${s.afterPct}%`}
                />
              ))}
          </div>
          <div className={p.tableWrap}>
            <table className={p.table}>
              <thead>
                <tr>
                  <th>{isAr ? 'الشريك' : 'Partner'}</th>
                  <th className={p.cellEnd}>{isAr ? 'قبل' : 'Before'}</th>
                  <th className={p.cellEnd}>{isAr ? 'الحركة' : 'Change'}</th>
                  <th className={p.cellEnd}>{isAr ? 'بعد' : 'After'}</th>
                  <th>{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {simulatedPreview.splits.map(s => (
                  <tr key={s.partner_name}>
                    <td className={p.cellStrong}>
                      {isFounderName(s.partner_name) && <Crown size={12} aria-hidden />} <bdi>{nameOf(s.partner_name)}</bdi>
                    </td>
                    <td className={`${p.cellEnd} ${p.cellMuted}`}><bdi>{s.beforePct}%</bdi></td>
                    <td className={p.cellEnd}>
                      {s.deltaPct > 0
                        ? <bdi className={p.textSuccess}>+{s.deltaPct}%</bdi>
                        : s.deltaPct < 0
                          ? <bdi className={p.textDanger}>{s.deltaPct}%</bdi>
                          : <bdi className={p.cellMuted}>0%</bdi>}
                    </td>
                    <td className={`${p.cellEnd} ${p.cellStrong}`}><bdi>{s.afterPct}%</bdi></td>
                    <td>
                      {s.isArchived
                        ? <span className={`${p.pill} ${p.pillDanger}`}>{isAr ? 'تخارج وأرشفة' : 'Archived'}</span>
                        : <span className={`${p.pill} ${p.pillMuted}`}>{isAr ? 'مستمر' : 'Active'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </form>
    </ZFModalShell>
  );
};
