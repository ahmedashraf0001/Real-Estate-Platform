'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRightLeft, 
  UserMinus, 
  UserPlus, 
  Users, 
  Scale, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Percent, 
  Building2,
  Coins,
  Crown,
  History,
  Info
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

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'استوديو التخارج وإعادة توزيع الحصص' : 'Equity Reallocation & Exit Studio'}
      subtitle={isAr 
        ? 'إدارة التخارج، الشراء الداخلي، والتنازل الجزئي مع تدقيق الـ 100% وسجل التاريخ غير القابل للتعديل' 
        : 'Execute immutable exits, internal buyouts, and partial sales with 100% equity balance lock'}
      icon={<ArrowRightLeft size={18} />}
      headerExtra={
        buildingProperties.length > 1 ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--erp-accent-subtle)',
            border: '1px solid color-mix(in srgb, var(--erp-accent) 28%, transparent)',
            borderRadius: '8px',
            padding: '0.2rem 0.55rem'
          }}>
            <Building2 size={13} color="var(--erp-accent)" />
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setFromPartner('');
                setToPartner('');
              }}
              style={{
                background: 'transparent',
                color: 'var(--erp-accent-hover)',
                border: 'none',
                outline: 'none',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer'
              }}
              title={isAr ? 'التبديل بين عماير الشركة' : 'Switch building'}
            >
              {buildingProperties.map(b => (
                <option key={b.id} value={b.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                  {b.title_ar || b.title_en}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '0.18rem 0.55rem',
            borderRadius: '999px',
            background: 'var(--erp-accent-subtle)',
            color: 'var(--erp-accent)',
            border: '1px solid color-mix(in srgb, var(--erp-accent) 28%, transparent)'
          }}>
            {activeProperty.title_ar || activeProperty.title_en}
          </span>
        )
      }
      isAr={isAr}
      maxWidth="780px"
      maxHeight="94vh"
      bodyStyle={{ padding: 0 }}
    >

        {/* MODAL BODY */}
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.4rem 1.65rem', gap: '1.25rem' }}>
          
          {/* 1. PATHWAY SELECTOR (THE 3 APPROVED WORKFLOWS) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              {isAr ? 'مسار إعادة الهيكلة والتخارج المعتمد:' : 'Select Reallocation Pathway:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {/* Option 1: Full Buyout */}
              <button
                type="button"
                onClick={() => setMode('full_buyout')}
                style={{
                  padding: '0.85rem 0.65rem',
                  borderRadius: '10px',
                  border: mode === 'full_buyout' ? '2px solid var(--erp-accent)' : '1px solid #e2e8f0',
                  background: mode === 'full_buyout' ? 'rgba(184, 144, 62, 0.08)' : '#f8fafc',
                  color: mode === 'full_buyout' ? 'var(--erp-accent)' : '#475569',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: mode === 'full_buyout' ? '0 2px 8px rgba(184, 144, 62, 0.15)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: mode === 'full_buyout' ? 'var(--erp-accent)' : '#e2e8f0',
                  color: mode === 'full_buyout' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserMinus size={18} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {isAr ? '1. انسحاب وتخارج كامل لصالح شريك قائم' : '1. Full Internal Buyout'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>
                  {isAr ? 'خروج الشريك البائع تماماً وتنازله لشريك حالي وزيادة حصة المشتري' : '100% exit & transfer to existing partner'}
                </span>
              </button>

              {/* Option 2: Partial Sale */}
              <button
                type="button"
                onClick={() => setMode('partial_sale')}
                style={{
                  padding: '0.85rem 0.65rem',
                  borderRadius: '10px',
                  border: mode === 'partial_sale' ? '2px solid var(--erp-accent)' : '1px solid #e2e8f0',
                  background: mode === 'partial_sale' ? 'rgba(184, 144, 62, 0.08)' : '#f8fafc',
                  color: mode === 'partial_sale' ? 'var(--erp-accent)' : '#475569',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: mode === 'partial_sale' ? '0 2px 8px rgba(184, 144, 62, 0.15)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: mode === 'partial_sale' ? 'var(--erp-accent)' : '#e2e8f0',
                  color: mode === 'partial_sale' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Percent size={18} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {isAr ? '2. تنازل وبيع جزئي من الحصة' : '2. Partial Share Sale'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>
                  {isAr ? 'بيع جزء من الحصة لشريك قائم أو لشريك خارجي بديل/منضم' : 'Carve out % to current or new partner'}
                </span>
              </button>

              {/* Option 3: Full Substitution */}
              <button
                type="button"
                onClick={() => setMode('full_substitution')}
                style={{
                  padding: '0.85rem 0.65rem',
                  borderRadius: '10px',
                  border: mode === 'full_substitution' ? '2px solid var(--erp-accent)' : '1px solid #e2e8f0',
                  background: mode === 'full_substitution' ? 'rgba(184, 144, 62, 0.08)' : '#f8fafc',
                  color: mode === 'full_substitution' ? 'var(--erp-accent)' : '#475569',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: mode === 'full_substitution' ? '0 2px 8px rgba(184, 144, 62, 0.15)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: mode === 'full_substitution' ? 'var(--erp-accent)' : '#e2e8f0',
                  color: mode === 'full_substitution' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={18} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {isAr ? '3. تنازل وإحلال كامل لشريك بديل جديد' : '3. Full Substitution'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>
                  {isAr ? 'إحلال شريك جديد بالكامل محل الشريك المتخارج مع خيار نقل المتأخرات' : 'Full exit to new partner + arrears transfer'}
                </span>
              </button>
            </div>
          </div>

          {/* 2. PARTNERS INVOLVED (SELLER & BUYER) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* SELLER */}
            <div style={{
              background: '#fff1f2',
              border: '1.5px solid #fecdd3',
              borderRadius: '12px',
              padding: '0.9rem 1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#9f1239', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserMinus size={15} />
                  <span>{isAr ? 'الشريك المتنازل / البائع:' : 'Exiting / Selling Partner:'}</span>
                </span>
                {currentSellerSplit && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#be123c', background: '#ffe4e6', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                    {isAr ? `الحصة الحالية: ${currentSellerSplit.share_percentage}%` : `Current: ${currentSellerSplit.share_percentage}%`}
                  </span>
                )}
              </div>

              <select
                value={fromPartner}
                onChange={(e) => setFromPartner(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #fda4af',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                {eligibleSellers.map(s => (
                  <option key={s.partner_name} value={s.partner_name}>
                    {s.partner_name} ({s.share_percentage}%)
                  </option>
                ))}
              </select>

              {/* Seller financial alert */}
              {fromPartner && (
                <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: '#881337', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{isAr ? 'متأخرات مساهمة رأس المال:' : 'Capital Arrears:'}</span>
                  <strong style={{ color: D(sellerArrears).gt(0) ? '#e11d48' : '#059669' }}>
                    {D(sellerArrears).formatEGP(true)}
                  </strong>
                </div>
              )}
            </div>

            {/* BUYER */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '12px',
              padding: '0.9rem 1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserPlus size={15} />
                  <span>{isAr ? 'الشريك المشتري / المتنازل له:' : 'Buyer / Incoming Partner:'}</span>
                </span>
                {mode !== 'full_buyout' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomNewBuyer(!isCustomNewBuyer);
                      if (!isCustomNewBuyer) setCustomBuyerName('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {isCustomNewBuyer 
                      ? (isAr ? 'اختر من الشركاء' : 'Select from list') 
                      : (isAr ? '+ طرف خارجي جديد' : '+ New external')}
                  </button>
                )}
              </div>

              {isCustomNewBuyer ? (
                <input
                  type="text"
                  placeholder={isAr ? 'اكتب اسم الشريك الجديد بالكامل...' : 'Enter new partner name...'}
                  value={customBuyerName}
                  onChange={(e) => setCustomBuyerName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1.5px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                  required
                />
              ) : (
                <select
                  value={toPartner}
                  onChange={(e) => setToPartner(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  <optgroup label={isAr ? 'شركاء حاليون بالعمارة' : 'Current Building Partners'}>
                    {eligibleExistingBuyers.map(b => (
                      <option key={b.partner_name} value={b.partner_name}>
                        {b.partner_name} ({b.share_percentage}%)
                      </option>
                    ))}
                  </optgroup>
                  {mode !== 'full_buyout' && allPartnerProfiles.length > 0 && (
                    <optgroup label={isAr ? 'شركاء مسجلون بالدليل العام' : 'Registered Directory Partners'}>
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

              <div style={{ marginTop: '0.55rem', fontSize: '0.72rem', color: '#166534' }}>
                {isAr 
                  ? (mode === 'full_buyout' ? '✓ تنتقل إليه كامل حصة الشريك البائع' : '✓ تضاف الحصة المتفق عليها لمحفظته') 
                  : 'Receives transferred share directly'}
              </div>
            </div>
          </div>

          {/* 3. MODE-SPECIFIC PARAMETERS */}
          {/* A. PARTIAL SALE: PERCENTAGE INPUT */}
          {mode === 'partial_sale' && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'النسبة المئوية المراد بيعها والتنازل عنها (%):' : 'Percentage to Transfer (%):'}
                </label>
                {currentSellerSplit && (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {isAr ? `الحد الأقصى المتاح: ${(currentSellerSplit.share_percentage - 0.01).toFixed(2)}%` : `Max: ${(currentSellerSplit.share_percentage - 0.01).toFixed(2)}%`}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={currentSellerSplit ? (currentSellerSplit.share_percentage - 0.01) : 99}
                  value={soldSharePct}
                  onChange={(e) => setSoldSharePct(e.target.value)}
                  style={{
                    width: '140px',
                    background: '#ffffff',
                    border: '1.5px solid var(--erp-accent)',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: 'var(--erp-accent)'
                  }}
                  required
                />
                <input
                  type="range"
                  min="1"
                  max={currentSellerSplit ? Math.max(1, currentSellerSplit.share_percentage - 1) : 50}
                  step="1"
                  value={parseFloat(soldSharePct) || 1}
                  onChange={(e) => setSoldSharePct(e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--erp-accent)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>%</span>
              </div>
            </div>
          )}

          {/* B. FULL SUBSTITUTION: TRANSFER ARREARS TOGGLE */}
          {mode === 'full_substitution' && (
            <div style={{
              background: transferArrears ? 'rgba(245, 158, 11, 0.08)' : '#f8fafc',
              border: transferArrears ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'نقل المتأخرات والالتزامات السابقة للشريك الجديد' : 'Transfer Past Arrears to New Partner'}
                  </span>
                  {D(sellerArrears).gt(0) && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      background: '#fef3c7',
                      color: '#b45309',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px'
                    }}>
                      {isAr ? `متأخرات: ${D(sellerArrears).formatEGP(true)}` : `Arrears: ${D(sellerArrears).formatEGP(true)}`}
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr 
                    ? 'عند التفعيل، يلتزم الشريك الجديد بسداد التزامات رأس المال المتأخرة المستحقة على الحصة بموجب ضخ المؤسس' 
                    : 'When enabled, new partner assumes past unpaid capital calls and founder-matching arrears'}
                </p>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={transferArrears}
                  onChange={(e) => setTransferArrears(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--erp-accent)', cursor: 'pointer' }}
                />
              </label>
            </div>
          )}

          {/* 4. DOCUMENTATION FIELDS: AGREED VALUATION & EFFECTIVE DATE */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'قيمة التنازل المتفق عليها (ج.م) - اختياري للتوثيق:' : 'Agreed Transfer Value (EGP) - Optional:'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={transferValueEgp}
                onChange={(e) => setTransferValueEgp(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem',
                  color: '#0f172a'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'تاريخ سريان التنازل والاتفاق:' : 'Effective Date:'}
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem',
                  color: '#0f172a'
                }}
                required
              />
            </div>
          </div>

          {/* 5. NOTES */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'ملاحظات وبيان الاتفاق الودي:' : 'Agreement Terms & Notes:'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'بيان الاتفاق، رقم العقد الودي، وأي شروط مضافة...' : 'Notes or amicable agreement memo...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.82rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* 6. BEFORE & AFTER LIVE SIMULATION PREVIEW (محاكاة بصرية فورية) */}
          <div style={{
            background: '#fafaf9',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Scale size={16} color="var(--erp-accent)" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'محاكاة بصرية فورية (قبل وبعد التنفيذ):' : 'Before & After Live Preview:'}
                </span>
              </div>

              {/* Total 100% Equity Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                background: simulatedPreview.isValid ? '#dcfce7' : '#fee2e2',
                color: simulatedPreview.isValid ? '#15803d' : '#b91c1c',
                border: simulatedPreview.isValid ? '1px solid #86efac' : '1px solid #fca5a5'
              }}>
                {simulatedPreview.isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                <span>{simulatedPreview.validationMsg}</span>
              </div>
            </div>

            {/* Live Stacked Bar */}
            <div style={{
              height: '14px',
              background: '#e2e8f0',
              borderRadius: '999px',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '0.75rem'
            }}>
              {simulatedPreview.splits
                .filter(s => !s.isArchived && s.afterPct > 0)
                .map((s, idx) => {
                  const colors = ['#0f172a', '#946f23', '#2563eb', '#059669', '#7c3aed', '#d97706'];
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={s.partner_name}
                      style={{
                        width: `${s.afterPct}%`,
                        background: color,
                        height: '100%',
                        transition: 'width 0.3s ease'
                      }}
                      title={`${s.partner_name}: ${s.afterPct}%`}
                    />
                  );
                })}
            </div>

            {/* Comparative Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.74rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ textAlign: isAr ? 'right' : 'left', padding: '0.35rem 0' }}>{isAr ? 'الشريك' : 'Partner'}</th>
                    <th style={{ textAlign: 'center', padding: '0.35rem' }}>{isAr ? 'الحصة السابقة' : 'Before'}</th>
                    <th style={{ textAlign: 'center', padding: '0.35rem' }}>{isAr ? 'الحركة' : 'Change'}</th>
                    <th style={{ textAlign: 'center', padding: '0.35rem', fontWeight: 800 }}>{isAr ? 'الحصة الجديدة' : 'After'}</th>
                    <th style={{ textAlign: 'center', padding: '0.35rem' }}>{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {simulatedPreview.splits.map(s => {
                    const isFounder = s.partner_name === PRIMARY_DEVELOPER_NAME || s.partner_name.includes('زكريا فريد');
                    return (
                      <tr key={s.partner_name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.45rem 0', fontWeight: 800, color: '#0f172a' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {isFounder && <Crown size={12} color="var(--erp-accent)" />}
                            <span>{s.partner_name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                          {s.beforePct}%
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {s.deltaPct > 0 && <span style={{ color: '#16a34a' }}>+{s.deltaPct}%</span>}
                          {s.deltaPct < 0 && <span style={{ color: '#dc2626' }}>{s.deltaPct}%</span>}
                          {s.deltaPct === 0 && <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          {s.afterPct}%
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {s.isArchived ? (
                            <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                              {isAr ? 'أرشفة وتخارج' : 'Archived'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {isAr ? 'مستمر' : 'Active'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={!simulatedPreview.isValid || isSubmitting}
              style={{
                padding: '0.6rem 1.65rem',
                borderRadius: '8px',
                border: 'none',
                background: !simulatedPreview.isValid || isSubmitting
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: !simulatedPreview.isValid || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: !simulatedPreview.isValid || isSubmitting ? 'none' : '0 4px 14px rgba(184, 144, 62, 0.35)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting 
                  ? (isAr ? 'جاري توثيق التنازل...' : 'Committing...') 
                  : (isAr ? 'اعتماد التنازل وتوثيق الملكية' : 'Commit & Record Reallocation')}
              </span>
            </button>
          </div>
        </form>
    </ZFModalShell>
  );
};
