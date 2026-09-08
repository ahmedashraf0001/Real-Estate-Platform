'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  X, 
  Search, 
  Coins, 
  Wallet, 
  Receipt, 
  Scale, 
  Building2, 
  ShieldCheck, 
  Phone, 
  CreditCard, 
  Landmark, 
  Smartphone, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  PlusCircle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction, ERPContract, ERPPartnerProfile } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, formatEGP } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { toast } from 'sonner';
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';

export interface PartnerOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: PartnerFinancialSummary[];
  partnerProfiles?: ERPPartnerProfile[];
  partnerTransactions?: ERPPartnerTransaction[];
  properties?: Property[];
  contracts?: ERPContract[];
  initialPartnerName?: string;
  isAr?: boolean;
  isMutating?: boolean;
  onOpenNewPartnerModal?: () => void;
  onConfirmPayout: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    payoutDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<void>;
  onConfirmInjection: (details: {
    partnerName: string;
    amount: string;
    paymentMethod: 'CASH_101000' | 'INSTAPAY_102000' | 'BANK_102000';
    propertyId?: string;
    propertyTitle?: string;
    injectionDate: string;
    receiptRef: string;
    memo: string;
  }) => Promise<void>;
}

export const PartnerOperationsModal: React.FC<PartnerOperationsModalProps> = ({
  isOpen,
  onClose,
  partners = [],
  partnerProfiles = [],
  partnerTransactions = [],
  properties = [],
  initialPartnerName,
  isAr = true,
  isMutating = false,
  onOpenNewPartnerModal,
  onConfirmPayout,
  onConfirmInjection
}) => {
  // --------------------------------------------------------------------------
  // 1. SELECTION & FILTERING STATE (SIDE 1)
  // --------------------------------------------------------------------------
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'equity_partner' | 'land_partner' | 'silent_financier'>('all');

  // --------------------------------------------------------------------------
  // 2. OPERATIONS WORKBENCH TABS (SIDE 2)
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'payout' | 'injection' | 'statement'>('payout');

  // PAYOUT FORM STATE
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'CASH_101000' | 'INSTAPAY_102000'>('CASH_101000');
  const [payoutPropertyId, setPayoutPropertyId] = useState<string>('');
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payoutReceiptRef, setPayoutReceiptRef] = useState<string>(`PAY-${Date.now().toString().slice(-6)}`);
  const [payoutMemo, setPayoutMemo] = useState<string>('');
  const [payoutError, setPayoutError] = useState<string>('');

  // INJECTION FORM STATE
  const [injectionAmount, setInjectionAmount] = useState<string>('');
  const [injectionMethod, setInjectionMethod] = useState<'CASH_101000' | 'INSTAPAY_102000'>('CASH_101000');
  const [injectionPropertyId, setInjectionPropertyId] = useState<string>('');
  const [injectionDate, setInjectionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [injectionReceiptRef, setInjectionReceiptRef] = useState<string>(`REC-CAP-${Date.now().toString().slice(-6)}`);
  const [injectionMemo, setInjectionMemo] = useState<string>('');
  const [injectionError, setInjectionError] = useState<string>('');

  // EXCEL EXPORT STATE
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Initialize selected partner on open
  useEffect(() => {
    if (isOpen) {
      if (initialPartnerName && partners.some(p => p.partnerName === initialPartnerName)) {
        setSelectedPartnerName(initialPartnerName);
      } else if (partners.length > 0 && (!selectedPartnerName || !partners.some(p => p.partnerName === selectedPartnerName))) {
        setSelectedPartnerName(partners[0].partnerName);
      }
      // Reset form errors and generate fresh refs
      setPayoutError('');
      setInjectionError('');
      setPayoutReceiptRef(`PAY-${Date.now().toString().slice(-6)}`);
      setInjectionReceiptRef(`REC-CAP-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, initialPartnerName, partners]);

  // Currently active partner object
  const activePartner = useMemo(() => {
    return partners.find(p => p.partnerName === selectedPartnerName) || partners[0] || null;
  }, [partners, selectedPartnerName]);

  // Filtered partners list for Side 1
  const filteredPartners = useMemo(() => {
    const profileMap = new Map(partnerProfiles.map(p => [p.name, p.role]));
    return partners.filter(p => {
      if (roleFilter !== 'all') {
        const partnerRole = profileMap.get(p.partnerName);
        if (partnerRole) {
          if (partnerRole !== roleFilter) return false;
        } else {
          if (roleFilter === 'equity_partner' && !p.roleTitleAr.includes('مال')) return false;
          if (roleFilter === 'land_partner' && !p.roleTitleAr.includes('أرض')) return false;
          if (roleFilter === 'silent_financier' && !p.roleTitleAr.includes('صامت')) return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.partnerName || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').toLowerCase().includes(q);
        const matchNationalId = (p.national_id || '').toLowerCase().includes(q);
        const matchHoldings = p.holdings.some(h => (h.propertyTitle || '').toLowerCase().includes(q));
        return matchName || matchPhone || matchNationalId || matchHoldings;
      }
      return true;
    });
  }, [partners, roleFilter, searchQuery, partnerProfiles]);

  // Aggregate stats
  const totalNetDueAll = useMemo(() => {
    return partners.reduce((sum, p) => sum.plus(p.netCurrentBalance || 0), D(0));
  }, [partners]);

  // Transactions for active partner
  const currentPartnerTransactions = useMemo(() => {
    if (!activePartner) return [];
    return partnerTransactions.filter(t => t.partner_name === activePartner.partnerName);
  }, [partnerTransactions, activePartner]);

  const payoutPropertyItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return [
      {
        value: '',
        labelAr: isAr ? 'توزيع عام على كامل أرباح الشريك' : 'General Portfolio Payout',
        labelEn: 'General Portfolio Payout',
        sublabelAr: isAr ? 'غير مخصص لعمارة معينة (توزيع عام)' : 'Unallocated to a specific building',
        sublabelEn: 'Unallocated to a specific building',
        badge: isAr ? 'عام' : 'General',
        badgeBg: 'rgba(100, 116, 139, 0.08)',
        badgeTextColor: '#64748b',
        icon: Building2,
        iconBg: 'rgba(100, 116, 139, 0.08)',
        iconColor: '#64748b'
      },
      ...properties.map(prop => ({
        value: prop.id,
        labelAr: prop.title_ar || prop.title_en || '',
        labelEn: prop.title_en || prop.title_ar || '',
        sublabelAr: `${prop.location || 'الشرقية'} • ${prop.area_sqm || 0} م²`,
        sublabelEn: `${prop.location || 'Sharkia'} • ${prop.area_sqm || 0} sqm`,
        badge: prop.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: prop.completion_status === 'ready' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(148, 111, 35, 0.08)',
        badgeTextColor: prop.completion_status === 'ready' ? '#15803d' : '#946f23',
        icon: Building2,
        iconBg: 'rgba(148, 111, 35, 0.1)',
        iconColor: '#946f23'
      }))
    ];
  }, [properties, isAr]);

  const injectionPropertyItems = useMemo<ZFCustomSelectItem<string>[]>(() => {
    return [
      {
        value: '',
        labelAr: isAr ? 'محفظة الشركة العامة (غير مخصص لعمارة)' : 'Company General Capital',
        labelEn: 'Company General Capital',
        sublabelAr: isAr ? 'تمويل عام لكامل محفظة الشركة ومشاريعها' : 'General portfolio financing',
        sublabelEn: 'General portfolio financing',
        badge: isAr ? 'محفظة عامة' : 'General',
        badgeBg: 'rgba(100, 116, 139, 0.08)',
        badgeTextColor: '#64748b',
        icon: Building2,
        iconBg: 'rgba(100, 116, 139, 0.08)',
        iconColor: '#64748b'
      },
      ...properties.map(prop => ({
        value: prop.id,
        labelAr: prop.title_ar || prop.title_en || '',
        labelEn: prop.title_en || prop.title_ar || '',
        sublabelAr: `${prop.location || 'الشرقية'} • ${prop.area_sqm || 0} م²`,
        sublabelEn: `${prop.location || 'Sharkia'} • ${prop.area_sqm || 0} sqm`,
        badge: prop.completion_status === 'ready' ? (isAr ? 'جاهز' : 'Ready') : (isAr ? 'قيد التطوير' : 'In Progress'),
        badgeBg: prop.completion_status === 'ready' ? 'rgba(21, 128, 61, 0.08)' : 'rgba(148, 111, 35, 0.08)',
        badgeTextColor: prop.completion_status === 'ready' ? '#15803d' : '#946f23',
        icon: Building2,
        iconBg: 'rgba(148, 111, 35, 0.1)',
        iconColor: '#946f23'
      }))
    ];
  }, [properties, isAr]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // PAYOUT FORM HANDLERS
  // --------------------------------------------------------------------------
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    const numAmount = parseFloat(payoutAmount) || 0;
    if (numAmount <= 0) {
      setPayoutError(isAr ? 'يرجى إدخال مبلغ صرف صحيح أكبر من الصفر' : 'Please enter a valid payout amount');
      return;
    }

    try {
      const selectedProp = properties.find(p => p.id === payoutPropertyId);
      await onConfirmPayout({
        partnerName: activePartner.partnerName,
        amount: D(numAmount).toFixed(2),
        paymentMethod: payoutMethod,
        propertyId: payoutPropertyId || undefined,
        propertyTitle: selectedProp ? (selectedProp.title_ar || selectedProp.title_en) : undefined,
        payoutDate,
        receiptRef: payoutReceiptRef,
        memo: payoutMemo.trim() || `صرف أرباح للشريك: ${activePartner.partnerName}`
      });
      setPayoutAmount('');
      setPayoutMemo('');
      setPayoutReceiptRef(`PAY-${Date.now().toString().slice(-6)}`);
      setPayoutError('');
      setActiveTab('statement');
    } catch (err: unknown) {
      setPayoutError((err as Error).message);
    }
  };

  // --------------------------------------------------------------------------
  // INJECTION FORM HANDLERS
  // --------------------------------------------------------------------------
  const handleInjectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) return;
    const numAmount = parseFloat(injectionAmount) || 0;
    if (numAmount <= 0) {
      setInjectionError(isAr ? 'يرجى إدخال مبلغ مساهمة صحيح أكبر من الصفر' : 'Please enter a valid capital injection amount');
      return;
    }

    try {
      const selectedProp = properties.find(p => p.id === injectionPropertyId);
      await onConfirmInjection({
        partnerName: activePartner.partnerName,
        amount: D(numAmount).toFixed(2),
        paymentMethod: injectionMethod,
        propertyId: injectionPropertyId || undefined,
        propertyTitle: selectedProp ? (selectedProp.title_ar || selectedProp.title_en) : undefined,
        injectionDate,
        receiptRef: injectionReceiptRef,
        memo: injectionMemo.trim() || `إيداع مساهمة رأس مال جديدة من الشريك: ${activePartner.partnerName}`
      });
      setInjectionAmount('');
      setInjectionMemo('');
      setInjectionReceiptRef(`REC-CAP-${Date.now().toString().slice(-6)}`);
      setInjectionError('');
      setActiveTab('statement');
    } catch (err: unknown) {
      setInjectionError((err as Error).message);
    }
  };

  // --------------------------------------------------------------------------
  // EXCEL EXPORT HANDLER
  // --------------------------------------------------------------------------
  const handleExportExcel = async () => {
    if (!activePartner) return;
    try {
      setIsExportingExcel(true);
      await exportPartnerDossierExcel(activePartner, currentPartnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب الشريك بنجاح إلى Excel' : 'Partner dossier exported to Excel');
    } catch {
      toast.error(isAr ? 'فشل تصدير كشف الحساب' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------
  const payoutNum = parseFloat(payoutAmount) || 0;
  const injectionNum = parseFloat(injectionAmount) || 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem',
      direction: isAr ? 'rtl' : 'ltr'
    }}>
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '1200px',
          height: 'min(870px, 94vh)',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ══════════════════════════════════════════════════════════════════════════
            1. TOP HEADER BAR
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '1.1rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.18) 0%, rgba(184, 144, 62, 0.06) 100%)',
              border: '1px solid rgba(184, 144, 62, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#946f23',
              flexShrink: 0
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'إدارة وتوزيعات الشركاء والممولين (غرفة العمليات المركزية)' : 'Partner Management & Distributions Workbench'}
                </h3>
                <span style={{
                  background: 'rgba(184, 144, 62, 0.12)',
                  color: '#946f23',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.18rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {isAr ? 'نظام الشقين • رأس المال والأرباح' : 'Two-Sided Studio'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {isAr 
                  ? 'متابعة وتدقيق أرصدة الشركاء، صرف دفعات الأرباح، ضخ مساهمات رأس المال، وإصدار كشوف الحسابات بالمليم.' 
                  : 'Track partner balances, disburse profit distributions, inject capital, and view transaction history.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#64748b',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            2. TWO-SIDED MASTER-DETAIL GRID
            ══════════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 1 (MASTER): SEARCHABLE LIST OF PARTNERS
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#f8fafc',
            borderLeft: isAr ? '1px solid #e2e8f0' : 'none',
            borderRight: isAr ? 'none' : '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search and Filters Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث باسم الشريك، الهاتف، أو العمارة...' : 'Search partner, phone, property...'}
                  style={{
                    width: '100%',
                    padding: isAr ? '0.55rem 2.2rem 0.55rem 0.75rem' : '0.55rem 0.75rem 0.55rem 2.2rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    color: '#0f172a'
                  }}
                />
                <Search 
                  size={15} 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isAr ? 'right' : 'left']: '0.75rem',
                    color: '#94a3b8'
                  }} 
                />
              </div>

              {/* Role filter pills */}
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'all', label: isAr ? 'الكل' : 'All' },
                  { id: 'equity_partner', label: isAr ? 'شريك بالمال' : 'Equity' },
                  { id: 'land_partner', label: isAr ? 'شريك بالأرض' : 'Land' },
                  { id: 'silent_financier', label: isAr ? 'ممول صامت' : 'Silent' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoleFilter(tab.id as any)}
                    style={{
                      padding: '0.28rem 0.6rem',
                      fontSize: '0.72rem',
                      fontWeight: roleFilter === tab.id ? 800 : 600,
                      borderRadius: '8px',
                      background: roleFilter === tab.id ? '#0f172a' : '#ffffff',
                      color: roleFilter === tab.id ? '#ffffff' : '#64748b',
                      border: `1px solid ${roleFilter === tab.id ? '#0f172a' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-bar showing count & net liability */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#64748b',
                padding: '0.35rem 0.5rem',
                background: 'rgba(15, 23, 42, 0.03)',
                borderRadius: '8px'
              }}>
                <span>{filteredPartners.length} {isAr ? 'شريك مسجل' : 'partners'}</span>
                <span>
                  {isAr ? 'إجمالي المستحق: ' : 'Total Net: '}
                  <strong style={{ color: '#047857', fontWeight: 800 }}>{formatEGP(totalNetDueAll)}</strong>
                </span>
              </div>
            </div>

            {/* Scrollable list of partner cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {filteredPartners.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                  {isAr ? 'لم يتم العثور على شركاء مطابقين للبحث' : 'No matching partners found'}
                </div>
              ) : (
                filteredPartners.map(p => {
                  const isSelected = activePartner?.partnerName === p.partnerName;
                  const netDue = D(p.netCurrentBalance || 0);
                  const isPositiveDue = netDue.gt(0);

                  return (
                    <div
                      key={p.partnerName}
                      onClick={() => {
                        setSelectedPartnerName(p.partnerName);
                        setPayoutError('');
                        setInjectionError('');
                      }}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '14px',
                        background: isSelected ? 'rgba(184, 144, 62, 0.06)' : '#ffffff',
                        border: isSelected ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(184, 144, 62, 0.12)' : 'none',
                        position: 'relative'
                      }}
                    >
                      {/* Top row: Initial Monogram + Name + Role Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isSelected ? '#0f172a' : '#f1f5f9',
                            color: isSelected ? '#d4af37' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            border: `1px solid ${isSelected ? 'rgba(212, 175, 55, 0.3)' : '#e2e8f0'}`
                          }}>
                            {p.partnerName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                              {p.partnerName}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              {p.roleTitleAr}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#946f23',
                            boxShadow: '0 0 8px #946f23'
                          }} />
                        )}
                      </div>

                      {/* Middle row: Contributed Capital */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#64748b',
                        padding: '0.25rem 0',
                        borderBottom: '1px dashed #e2e8f0'
                      }}>
                        <span>{isAr ? 'رأس المال المساهم:' : 'Contributed Capital:'}</span>
                        <strong style={{ color: '#0f172a' }}>{formatEGP(p.totalContributedCapital)}</strong>
                      </div>

                      {/* Bottom row: Net Due Balance */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        marginTop: '0.35rem'
                      }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>
                          {isAr ? 'صافي المستحق له:' : 'Net Balance Due:'}
                        </span>
                        <span style={{
                          fontWeight: 800,
                          color: isPositiveDue ? '#047857' : '#64748b',
                          background: isPositiveDue ? 'rgba(4, 120, 87, 0.08)' : 'transparent',
                          padding: isPositiveDue ? '0.12rem 0.45rem' : '0',
                          borderRadius: '6px'
                        }}>
                          {formatEGP(p.netCurrentBalance)}
                        </span>
                      </div>

                      {/* Project Allocations Badges */}
                      {p.holdings.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.45rem' }}>
                          {p.holdings.slice(0, 2).map((h, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.65rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                color: '#475569'
                              }}
                            >
                              {h.propertyTitle} ({h.sharePct}%)
                            </span>
                          ))}
                          {p.holdings.length > 2 && (
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                              +{p.holdings.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Footer: Onboard New Partner Button */}
            {onOpenNewPartnerModal && (
              <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewPartnerModal();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.09) 0%, rgba(184, 144, 62, 0.03) 100%)',
                    border: '1.5px dashed rgba(184, 144, 62, 0.4)',
                    borderRadius: '12px',
                    color: '#946f23',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PlusCircle size={16} />
                  <span>{isAr ? '+ تسجيل وتوثيق شريك جديد' : '+ Onboard New Partner'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              SIDE 2 (DETAIL): OPERATIONS & FUNCTIONALITY WORKBENCH
              ────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            {activePartner ? (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. PARTNER PROFILE RIBBON */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.15rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#d4af37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.25rem',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}>
                      {activePartner.partnerName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {activePartner.partnerName}
                        </h4>
                        <span style={{
                          background: 'rgba(184, 144, 62, 0.1)',
                          color: '#946f23',
                          border: '1px solid rgba(184, 144, 62, 0.25)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {activePartner.roleTitleAr}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#047857', fontSize: '0.72rem', fontWeight: 800 }}>
                          <ShieldCheck size={14} />
                          <span>{isAr ? 'شريك موثق' : 'Verified'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
                        {activePartner.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={13} style={{ color: '#94a3b8' }} />
                            {activePartner.phone}
                          </span>
                        )}
                        {activePartner.national_id && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CreditCard size={13} style={{ color: '#94a3b8' }} />
                            {isAr ? 'الرقم القومي: ' : 'ID: '}{activePartner.national_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payout Channels Pill */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.45rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    fontSize: '0.75rem',
                    color: '#475569'
                  }}>
                    <Smartphone size={16} style={{ color: '#059669' }} />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'قناة التحويل المفضلة' : 'Payout Channel'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {activePartner.instapay_handle ? `إنستاباي: ${activePartner.instapay_handle}` : (activePartner.phone ? `إنستاباي / هاتف: ${activePartner.phone}` : (isAr ? 'خزينة نقدية (كاش)' : 'Cash Safe'))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 4 EXECUTIVE KPIS FOR ACTIVE PARTNER */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {/* KPI 1: Contributed Capital */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#946f23' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                        {isAr ? 'رأس المال المساهم' : 'Capital Contributed'}
                      </span>
                      <Coins size={16} />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatEGP(activePartner.totalContributedCapital)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isAr ? 'حساب 301000 بالدفاتر' : 'GL 301000'}
                    </span>
                  </div>

                  {/* KPI 2: Share of Collections */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1d4ed8' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                        {isAr ? 'نصيبه من التحصيلات' : 'Collections Share'}
                      </span>
                      <Wallet size={16} />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatEGP(activePartner.totalCollectionsShare)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isAr ? 'من أقساط الشقق المحصلة' : 'From collected installments'}
                    </span>
                  </div>

                  {/* KPI 3: Distributions Paid */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#475569' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                        {isAr ? 'أرباح مسددة فعلياً' : 'Distributions Paid'}
                      </span>
                      <Receipt size={16} />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {formatEGP(activePartner.totalDistributionsPaid)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {isAr ? 'حساب 303000 أرباح موزعة' : 'GL 303000 Dividends'}
                    </span>
                  </div>

                  {/* KPI 4: Net Balance Due (HERO) */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(4, 120, 87, 0.08) 0%, rgba(4, 120, 87, 0.02) 100%)',
                    border: '1.5px solid rgba(4, 120, 87, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#047857' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857' }}>
                        {isAr ? 'صافي الرصيد المستحق له' : 'Net Current Balance'}
                      </span>
                      <Scale size={16} />
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#047857' }}>
                      {formatEGP(activePartner.netCurrentBalance)}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#047857' }}>
                      {isAr ? 'جاهز للصرف والتسوية الآن' : 'Available for immediate payout'}
                    </span>
                  </div>
                </div>

                {/* 3. PROJECT EQUITY HOLDINGS BAR */}
                {activePartner.holdings.length > 0 && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={15} style={{ color: '#946f23' }} />
                      {isAr ? 'مشاريع الشراكة والحصص:' : 'Project Holdings:'}
                    </span>
                    {activePartner.holdings.map((h, i) => (
                      <span 
                        key={i}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.73rem',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem'
                        }}
                      >
                        <strong>{h.propertyTitle}</strong>
                        <span style={{ color: '#946f23', fontWeight: 800 }}>{h.sharePct}%</span>
                        <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                          ({isAr ? 'مبيعات:' : 'sales:'} {formatEGP(h.contractSalesShare)})
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* 4. WORKBENCH OPERATIONS TABS SWITCHER */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '2px solid #e2e8f0',
                  gap: '1.25rem',
                  marginTop: '0.5rem'
                }}>
                  {[
                    { id: 'payout', label: isAr ? 'صرف دفعة أرباح وتسديد مستحقات' : 'Disburse Dividend', icon: Receipt },
                    { id: 'injection', label: isAr ? 'ضخ مساهمة رأس مال جديدة' : 'Inject Capital', icon: Coins },
                    { id: 'statement', label: isAr ? 'كشف الحساب وسجل العمليات' : 'Statement & Ledger', icon: FileText }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                          background: 'none',
                          border: 'none',
                          borderBottom: isActive ? '3px solid #946f23' : '3px solid transparent',
                          padding: '0.65rem 0.25rem',
                          color: isActive ? '#0f172a' : '#64748b',
                          fontSize: '0.88rem',
                          fontWeight: isActive ? 800 : 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '-2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={17} style={{ color: isActive ? '#946f23' : '#94a3b8' }} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 5. TAB A: DISBURSE PROFIT DIVIDEND FORM */}
                {activeTab === 'payout' && (
                  <form onSubmit={handlePayoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    
                    {payoutError && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <AlertCircle size={16} />
                        <span>{payoutError}</span>
                      </div>
                    )}

                    {/* Amount Input with Quick-fill Presets */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                          {isAr ? 'مبلغ دفعة الأرباح المطلوب صرفها *' : 'Dividend Payout Amount *'}
                        </label>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(activePartner.netCurrentBalance)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            {isAr ? 'صرف كامل المستحق' : 'Full Balance'} ({formatEGP(activePartner.netCurrentBalance)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayoutAmount(D(activePartner.netCurrentBalance).times(0.5).toFixed(2))}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '0.15rem 0.5rem',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            {isAr ? 'صرف 50%' : '50%'}
                          </button>
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: '0.65rem 1rem',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#0f172a'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isAr ? 'left' : 'right']: '1rem',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: '#946f23'
                        }}>
                          {isAr ? 'جنيه مصري' : 'EGP'}
                        </span>
                      </div>
                      {payoutNum > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                          {tafqeetEGP(payoutNum)}
                        </div>
                      )}
                    </div>

                    {/* Payment Method Cards */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                        {isAr ? 'طريقة وخزينة صرف الدفعة *' : 'Payout Payment Method *'}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                        {[
                          { id: 'CASH_101000', title: isAr ? 'خزينة نقدية (101000)' : 'Cash Vault', sub: isAr ? 'صرف كاش باليد من الخزنة' : 'Safe cash', icon: Wallet },
                          { id: 'INSTAPAY_102000', title: isAr ? 'إنستاباي فوري (102000)' : 'InstaPay Transfer', sub: isAr ? 'تحويل لحساب/محفظة الشريك' : 'Instant mobile transfer', icon: Smartphone }
                        ].map(m => {
                          const Icon = m.icon;
                          const isSelected = payoutMethod === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => setPayoutMethod(m.id as any)}
                              style={{
                                border: isSelected ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                                background: isSelected ? 'rgba(184, 144, 62, 0.06)' : '#ffffff',
                                borderRadius: '12px',
                                padding: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <Icon size={16} style={{ color: isSelected ? '#946f23' : '#64748b' }} />
                                <strong style={{ fontSize: '0.82rem', color: isSelected ? '#0f172a' : '#334155' }}>{m.title}</strong>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{m.sub}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Property Allocation, Date, and Reference */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'ربط الدفعة بمشروع معين (اختياري):' : 'Allocate to Property (Optional):'}
                        </label>
                        <ZFCustomSelect<string>
                          value={payoutPropertyId}
                          onChange={(val) => setPayoutPropertyId(val)}
                          items={payoutPropertyItems}
                          placeholderAr="-- توزيع عام على أرباح الشريك --"
                          placeholderEn="-- General Portfolio Payout --"
                          isAr={isAr}
                          searchable={true}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'تاريخ الصرف:' : 'Payout Date:'}
                        </label>
                        <input
                          type="date"
                          value={payoutDate}
                          onChange={(e) => setPayoutDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            color: '#0f172a',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'رقم سند الصرف / المرجع:' : 'Receipt / Voucher #:'}
                        </label>
                        <input
                          type="text"
                          value={payoutReceiptRef}
                          onChange={(e) => setPayoutReceiptRef(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            color: '#0f172a',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    {/* Memo */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'البيان المحاسبي والشرح:' : 'Accounting Memo:'}
                      </label>
                      <input
                        type="text"
                        value={payoutMemo}
                        onChange={(e) => setPayoutMemo(e.target.value)}
                        placeholder={isAr ? `صرف دفعة أرباح للشريك: ${activePartner.partnerName}` : `Dividend distribution for ${activePartner.partnerName}`}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          background: '#ffffff'
                        }}
                      />
                    </div>

                    {/* Double-Entry Journal Preview Box */}
                    {payoutNum > 0 && (
                      <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        color: '#f8fafc',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.45rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Scale size={15} />
                            {isAr ? 'معاينة القيد المحاسبي المزدوج الآلي (INV-4.1)' : 'Audited Journal Entry Preview'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>
                            {isAr ? '✓ القيد متوازن بالمليم' : '✓ Balanced (0.00 Delta)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc' }}>
                            <span>من حـ/ 303000 أرباح موزعة للشركاء (مدين)</span>
                            <strong style={{ color: '#d4af37' }}>{formatEGP(payoutNum)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', paddingRight: isAr ? '1.5rem' : '0', paddingLeft: isAr ? '0' : '1.5rem' }}>
                            <span>إلى حـ/ {payoutMethod === 'CASH_101000' ? '101000 خزينة النقدية الرئيسية' : '102000 تحويلات إنستاباي الفورية'} (دائن)</span>
                            <strong style={{ color: '#94a3b8' }}>{formatEGP(payoutNum)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={onClose}
                        style={{
                          padding: '0.65rem 1.25rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={payoutNum <= 0 || isMutating}
                        style={{
                          padding: '0.65rem 1.5rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: payoutNum > 0 && !isMutating ? 'linear-gradient(135deg, #047857 0%, #065f46 100%)' : '#cbd5e1',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: payoutNum > 0 && !isMutating ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: payoutNum > 0 ? '0 4px 12px rgba(4, 120, 87, 0.25)' : 'none'
                        }}
                      >
                        {isMutating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{isAr ? 'جاري ترحيل القيد...' : 'Posting Entry...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>{isAr ? 'تأكيد صرف الدفعة وترحيل القيد' : 'Confirm Payout & Post GL'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* 6. TAB B: CAPITAL INJECTION FORM */}
                {activeTab === 'injection' && (
                  <form onSubmit={handleInjectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    
                    {injectionError && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#dc2626',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <AlertCircle size={16} />
                        <span>{injectionError}</span>
                      </div>
                    )}

                    {/* Amount Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                        {isAr ? 'مبلغ مساهمة رأس المال الإضافية *' : 'Capital Injection Amount *'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={injectionAmount}
                          onChange={(e) => setInjectionAmount(e.target.value)}
                          placeholder="0.00"
                          style={{
                            width: '100%',
                            padding: '0.65rem 1rem',
                            background: '#ffffff',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: '#0f172a'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          [isAr ? 'left' : 'right']: '1rem',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color: '#946f23'
                        }}>
                          {isAr ? 'جنيه مصري' : 'EGP'}
                        </span>
                      </div>
                      {injectionNum > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                          {tafqeetEGP(injectionNum)}
                        </div>
                      )}
                    </div>

                    {/* Payment Method Cards */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem' }}>
                        {isAr ? 'طريقة وخزينة توريد المساهمة *' : 'Capital Injection Method *'}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                        {[
                          { id: 'CASH_101000', title: isAr ? 'توريد نقد بالخزينة (101000)' : 'Cash Safe Deposit', sub: isAr ? 'استلام كاش باليد في الخزنة' : 'Vault cash received', icon: Wallet },
                          { id: 'INSTAPAY_102000', title: isAr ? 'تحويل إنستاباي فوري (102000)' : 'InstaPay Transfer', sub: isAr ? 'تحويل فوري عبر تطبيق إنستاباي' : 'Instant mobile deposit', icon: Smartphone }
                        ].map(m => {
                          const Icon = m.icon;
                          const isSelected = injectionMethod === m.id;
                          return (
                            <div
                              key={m.id}
                              onClick={() => setInjectionMethod(m.id as any)}
                              style={{
                                border: isSelected ? '1.5px solid #946f23' : '1px solid #cbd5e1',
                                background: isSelected ? 'rgba(184, 144, 62, 0.06)' : '#ffffff',
                                borderRadius: '12px',
                                padding: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                <Icon size={16} style={{ color: isSelected ? '#946f23' : '#64748b' }} />
                                <strong style={{ fontSize: '0.82rem', color: isSelected ? '#0f172a' : '#334155' }}>{m.title}</strong>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{m.sub}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Property, Date, and Reference */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'تخصيص المساهمة لمشروع معين:' : 'Target Property:'}
                        </label>
                        <ZFCustomSelect<string>
                          value={injectionPropertyId}
                          onChange={(val) => setInjectionPropertyId(val)}
                          items={injectionPropertyItems}
                          placeholderAr="-- محفظة الشركة العامة --"
                          placeholderEn="-- Company General Capital --"
                          isAr={isAr}
                          searchable={true}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'تاريخ التوريد:' : 'Injection Date:'}
                        </label>
                        <input
                          type="date"
                          value={injectionDate}
                          onChange={(e) => setInjectionDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            color: '#0f172a',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                          {isAr ? 'رقم إيصال التوريد:' : 'Receipt / Ref #:'}
                        </label>
                        <input
                          type="text"
                          value={injectionReceiptRef}
                          onChange={(e) => setInjectionReceiptRef(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            color: '#0f172a',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>

                    {/* Memo */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        {isAr ? 'البيان المحاسبي والشرح:' : 'Accounting Memo:'}
                      </label>
                      <input
                        type="text"
                        value={injectionMemo}
                        onChange={(e) => setInjectionMemo(e.target.value)}
                        placeholder={isAr ? `إيداع مساهمة رأس مال جديدة من الشريك: ${activePartner.partnerName}` : `Capital injection from ${activePartner.partnerName}`}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: '#0f172a',
                          background: '#ffffff'
                        }}
                      />
                    </div>

                    {/* Double-Entry Journal Preview Box */}
                    {injectionNum > 0 && (
                      <div style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        color: '#f8fafc',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.45rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d4af37', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Scale size={15} />
                            {isAr ? 'معاينة القيد المحاسبي المزدوج الآلي (INV-4.1)' : 'Audited Journal Entry Preview'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700 }}>
                            {isAr ? '✓ القيد متوازن بالمليم' : '✓ Balanced (0.00 Delta)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc' }}>
                            <span>من حـ/ {injectionMethod === 'CASH_101000' ? '101000 خزينة النقدية الرئيسية' : '102000 تحويلات إنستاباي الفورية'} (مدين)</span>
                            <strong style={{ color: '#d4af37' }}>{formatEGP(injectionNum)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', paddingRight: isAr ? '1.5rem' : '0', paddingLeft: isAr ? '0' : '1.5rem' }}>
                            <span>إلى حـ/ 301000 رأس مال الشركاء والممولين (دائن)</span>
                            <strong style={{ color: '#94a3b8' }}>{formatEGP(injectionNum)}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={onClose}
                        style={{
                          padding: '0.65rem 1.25rem',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={injectionNum <= 0 || isMutating}
                        style={{
                          padding: '0.65rem 1.5rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: injectionNum > 0 && !isMutating ? 'linear-gradient(135deg, #946f23 0%, #785718 100%)' : '#cbd5e1',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: injectionNum > 0 && !isMutating ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: injectionNum > 0 ? '0 4px 12px rgba(184, 144, 62, 0.25)' : 'none'
                        }}
                      >
                        {isMutating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{isAr ? 'جاري ترحيل القيد...' : 'Posting Entry...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>{isAr ? 'تأكيد ضخ رأس المال وترحيل القيد' : 'Confirm Capital Injection & Post GL'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* 7. TAB C: STATEMENT & TRANSACTIONS REGISTER */}
                {activeTab === 'statement' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Header with Export & Print Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                          {isAr ? `كشف حساب الشريك: ${activePartner.partnerName}` : `Statement for ${activePartner.partnerName}`}
                        </h5>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                          {isAr ? `إجمالي الحركات المسجلة: ${currentPartnerTransactions.length} حركة` : `${currentPartnerTransactions.length} transactions recorded`}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          disabled={isExportingExcel}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {isExportingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} style={{ color: '#047857' }} />}
                          <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Printer size={14} style={{ color: '#64748b' }} />
                          <span>{isAr ? 'طباعة' : 'Print'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Transactions Table */}
                    {currentPartnerTransactions.length === 0 ? (
                      <div style={{
                        padding: '3rem 1.5rem',
                        textAlign: 'center',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '12px',
                        color: '#64748b',
                        fontSize: '0.85rem'
                      }}>
                        {isAr ? 'لا توجد حركات مسجلة لهذا الشريك حتى الآن' : 'No transactions recorded for this partner yet'}
                      </div>
                    ) : (
                      <div style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#ffffff'
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: isAr ? 'right' : 'left', color: '#64748b' }}>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'رقم الحركة' : 'Tx #'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'التاريخ' : 'Date'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'نوع الحركة' : 'Type'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'المبلغ' : 'Amount'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'طريقة السداد' : 'Method'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'المشروع / البيان' : 'Property / Memo'}</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{isAr ? 'رقم السند والقيد' : 'Ref & GL'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentPartnerTransactions.map(tx => {
                              const isInjection = tx.type === 'CAPITAL_INJECTION';
                              return (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                                    {tx.transaction_number}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {tx.date}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      background: isInjection ? 'rgba(184, 144, 62, 0.1)' : 'rgba(4, 120, 87, 0.1)',
                                      color: isInjection ? '#946f23' : '#047857'
                                    }}>
                                      {isInjection ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                      {isInjection ? (isAr ? 'ضخ مساهمة' : 'Injection') : (isAr ? 'صرف أرباح' : 'Payout')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: isInjection ? '#946f23' : '#047857' }}>
                                    {formatEGP(tx.amount)}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', color: '#475569' }}>
                                    {tx.payment_method === 'CASH_101000' 
                                      ? (isAr ? 'خزينة كاش (101000)' : 'Cash Safe') 
                                      : (isAr ? 'إنستاباي فوري (102000)' : 'InstaPay')}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', color: '#334155' }}>
                                    <div>{tx.property_title || (isAr ? 'عام ع المحفظة' : 'General')}</div>
                                    {tx.memo && (
                                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.1rem' }}>
                                        {tx.memo}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.7rem' }}>
                                    <div>{tx.receipt_ref || '—'}</div>
                                    {tx.journal_entry_number && (
                                      <div style={{ color: '#946f23', fontWeight: 700 }}>
                                        #{tx.journal_entry_number}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem',
                color: '#94a3b8'
              }}>
                <Users size={48} style={{ strokeWidth: 1.2, marginBottom: '1rem', color: '#cbd5e1' }} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>
                  {isAr ? 'اختار شريكاً من القائمة الجانبية لبدء العمليات' : 'Select a partner from the list to start operations'}
                </h4>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  {isAr ? 'يمكنك تدقيق الأرصدة، صرف دفعات أرباح، أو ضخ مساهمات إضافية' : 'Manage balances, dividends, and capital contributions'}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
