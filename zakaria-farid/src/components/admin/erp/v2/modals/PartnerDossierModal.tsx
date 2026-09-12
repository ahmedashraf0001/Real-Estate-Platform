'use client';

import React, { useState } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  TrendingUp, 
  Coins, 
  FileSpreadsheet, 
  ShieldCheck,
  Receipt,
  Landmark,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  FileText,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction } from '@/lib/erp/types';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { D } from '@/lib/erp/math';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';

interface PartnerDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: PartnerFinancialSummary | null;
  transactions?: ERPPartnerTransaction[];
  isAr?: boolean;
  onOpenPayout?: (partnerName: string) => void;
  onOpenInjection?: (partnerName: string) => void;
}

export const PartnerDossierModal: React.FC<PartnerDossierModalProps> = ({
  isOpen,
  onClose,
  partner,
  transactions = [],
  isAr = true,
  onOpenPayout,
  onOpenInjection
}) => {
  if (!isOpen || !partner) return null;

  const partnerTransactions = transactions.filter(t => t.partner_name === partner.partnerName);

  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const handleExportStatementExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportPartnerDossierExcel(partner, partnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب الشريك بنجاح إلى Excel' : 'Partner dossier exported to Excel');
    } catch (e) {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const voucherCode = `PTR-${partner.partnerName.replace(/\s+/g, '').slice(0, 6)}-${new Date().getFullYear()}`;
  const reportDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const printablePartnerBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Partner Profile Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'اسم الشريك / الممول' : 'Partner Name'}
          </span>
          <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{partner.partnerName}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'نوع الشراكة' : 'Partnership Role'}
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#946f23' }}>{partner.roleTitleAr}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'رأس المال المودع (301000)' : 'Contributed Capital'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(partner.totalContributedCapital).formatEGP(isAr)}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'صافي الرصيد المستحق' : 'Net Current Balance'}
          </span>
          <strong style={{ fontSize: '1.15rem', color: D(partner.netCurrentBalance).isNegative() ? '#dc2626' : '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {D(partner.netCurrentBalance).formatEGP(isAr)}
          </strong>
        </div>
      </div>

      {/* 2. Holdings Table */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
          {isAr ? 'حصص الشراكة في مشاريع الشركة' : 'Project Equity Shares & Holdings'}
        </h4>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '0.5rem', textAlign: 'center', width: '6%' }}>#</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'المشروع العقاري' : 'Project'}</th>
                <th style={{ padding: '0.5rem', textAlign: 'center', width: '15%' }}>{isAr ? 'نسبة الحصة (%)' : 'Share %'}</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '25%' }}>{isAr ? 'نصيب المبيعات (ج.م)' : 'Sales Share'}</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '25%' }}>{isAr ? 'نصيب التكاليف (ج.م)' : 'WIP Cost Share'}</th>
              </tr>
            </thead>
            <tbody>
              {partner.holdings.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{h.propertyTitle}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 800, color: '#946f23' }}>{h.sharePct}%</td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    {D(h.contractSalesShare).formatEGP(isAr)}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                    {D(h.wipCostShare).formatEGP(isAr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Transaction History Table */}
      <div>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
          {isAr ? 'سجل العمليات والتحويلات المالية المسجلة' : 'Recorded Financial Transactions'}
        </h4>
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '5%' }}>#</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '16%' }}>{isAr ? 'رقم الإشعار' : 'Ref #'}</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '14%' }}>{isAr ? 'التاريخ' : 'Date'}</th>
              <th style={{ padding: '0.5rem', textAlign: 'center', width: '16%' }}>{isAr ? 'نوع العملية' : 'Type'}</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', width: '20%' }}>{isAr ? 'المبلغ (ج.م)' : 'Amount'}</th>
              <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left', width: '29%' }}>{isAr ? 'البيان وملاحظات القيد' : 'Memo'}</th>
            </tr>
          </thead>
          <tbody>
            {partnerTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                  {isAr ? 'لا توجد حركات مالية مسجلة بعد لهذا الشريك' : 'No recorded transactions yet.'}
                </td>
              </tr>
            ) : (
              partnerTransactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                  <td style={{ padding: '0.45rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '0.45rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                    {t.transaction_number}
                  </td>
                  <td style={{ padding: '0.45rem', textAlign: 'center', color: '#334155' }}>{t.date}</td>
                  <td style={{ padding: '0.45rem', textAlign: 'center', fontWeight: 700, color: t.type === 'CAPITAL_INJECTION' ? '#059669' : '#d97706' }}>
                    {t.type === 'CAPITAL_INJECTION' ? (isAr ? 'ضخ رأس مال' : 'Injection') : (isAr ? 'صرف أرباح' : 'Payout')}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    {D(t.amount).formatEGP(isAr)}
                  </td>
                  <td style={{ padding: '0.45rem 0.75rem', color: '#475569' }}>
                    {t.memo || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        direction: isAr ? 'rtl' : 'ltr'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* HEADER */}
        <div 
          style={{
            padding: 'clamp(0.85rem, 2.5vw, 1.2rem) clamp(1rem, 3vw, 1.5rem)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(() => {
              const isOwner = partner.isPermanent || partner.partnerName === PRIMARY_DEVELOPER_NAME || partner.partnerName.includes('زكريا فريد');
              return (
                <>
                  <div 
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: isOwner ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'rgba(148, 111, 35, 0.1)',
                      color: isOwner ? '#d4af37' : '#946f23',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isOwner ? '1.5px solid rgba(212, 175, 55, 0.45)' : 'none',
                      boxShadow: isOwner ? '0 2px 8px rgba(184, 144, 62, 0.2)' : 'none'
                    }}
                  >
                    {isOwner ? <Crown size={22} color="#d4af37" /> : <User size={22} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {partner.partnerName}
                      </h3>
                      {isOwner ? (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.2) 0%, rgba(184, 144, 62, 0.08) 100%)',
                          color: '#854d0e',
                          border: '1px solid rgba(184, 144, 62, 0.4)',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Crown size={11} color="#946f23" />
                          <span>{isAr ? 'المالك والمطور الرئيسي' : 'Owner & Primary Developer'}</span>
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(29, 78, 216, 0.08)',
                          color: '#1d4ed8',
                          fontWeight: 700
                        }}>
                          {partner.roleTitleAr}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? (isOwner ? 'كشف حساب مساهمات ومسحوبات المالك وحصص المشاريع' : 'كشف الحساب الاستثماري وحصص الأرباح والمشاريع') : 'Investment dossier & statement of account'}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={handleExportStatementExcel}
              disabled={isExportingExcel}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                color: '#15803d',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: isExportingExcel ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title={isAr ? 'تصدير كشف حساب الشريك كاملاً إلى Excel مع المخططات' : 'Export Partner Dossier to Excel'}
            >
              <FileSpreadsheet size={14} />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير إكسيل' : 'Excel')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title={isAr ? 'طباعة كشف الحساب المعتمد للشريك' : 'Print Statement'}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              style={{
                background: 'rgba(184, 144, 62, 0.08)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                color: '#946f23',
                borderRadius: '8px',
                padding: '0.4rem 0.7rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              title={isAr ? 'معاينة المستند الرسمي للطباعة' : 'Preview Document'}
            >
              <FileText size={14} />
              <span>{isAr ? 'معاينة' : 'Preview'}</span>
            </button>

            <button 
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.25rem 1.5rem', gap: '1.25rem' }}>
          
          {/* FINANCIAL METRICS GRID */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem'
          }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                {isAr ? 'إجمالي رأس المال المودع:' : 'Contributed Capital:'}
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <MoneyCell amount={partner.totalContributedCapital} isAr={isAr} />
              </div>
            </div>

            <div style={{ background: 'rgba(29, 78, 216, 0.05)', border: '1px solid rgba(29, 78, 216, 0.2)', borderRadius: '10px', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#1d4ed8', display: 'block', fontWeight: 600 }}>
                {isAr ? 'نصيبه من تحصيلات المبيعات:' : 'Share of Collections:'}
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <MoneyCell amount={partner.totalCollectionsShare} isAr={isAr} />
              </div>
            </div>

            <div style={{ background: 'rgba(112, 26, 117, 0.05)', border: '1px solid rgba(112, 26, 117, 0.2)', borderRadius: '10px', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#701a75', display: 'block', fontWeight: 600 }}>
                {isAr ? 'أرباح ومستحقات مسددة له:' : 'Distributions Received:'}
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <MoneyCell amount={partner.totalDistributionsPaid} isAr={isAr} />
              </div>
            </div>

            <div style={{ background: 'rgba(21, 128, 61, 0.07)', border: '1.5px solid rgba(21, 128, 61, 0.3)', borderRadius: '10px', padding: '0.85rem' }}>
              <span style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', fontWeight: 700 }}>
                {isAr ? 'صافي الرصيد المستحق القائم:' : 'Net Due Balance:'}
              </span>
              <div style={{ marginTop: '0.2rem', fontSize: '1rem', fontWeight: 900, color: '#15803d' }}>
                <MoneyCell amount={partner.netCurrentBalance} isAr={isAr} />
              </div>
            </div>
          </div>

          {/* PROJECT HOLDINGS SECTION */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={15} color="#946f23" />
              <span>{isAr ? 'مشاريع الشراكة وحصص العقارات:' : 'Project Partnership Holdings:'}</span>
            </div>

            {partner.holdings.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'المشروع' : 'Project'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{isAr ? 'نسبة الحصة' : 'Equity %'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'نصيب مبيعات الشقق' : 'Sales Share'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'نصيب التكاليف (WIP)' : 'Cost Share'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'صافي ربح المشروع' : 'Project Profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.holdings.map((h, i) => (
                      <tr key={h.propertyId || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {h.propertyTitle}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(148, 111, 35, 0.1)', color: '#946f23', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '5px' }}>
                            {h.sharePct}%
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: isAr ? 'left' : 'right', fontWeight: 700 }}>
                          <MoneyCell amount={h.contractSalesShare} isAr={isAr} />
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: isAr ? 'left' : 'right', color: '#64748b' }}>
                          <MoneyCell amount={h.wipCostShare} isAr={isAr} />
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800, color: '#15803d' }}>
                          <MoneyCell amount={h.projectProfitShare} isAr={isAr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.74rem' }}>
                {isAr ? 'لا توجد مشاريع محددة مخصصة للشريك حالياً' : 'No specific project allocations'}
              </div>
            )}
          </div>

          {/* RECENT TRANSACTIONS LEDGER */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Receipt size={15} color="#15803d" />
              <span>{isAr ? 'سجل العمليات والتحويلات المالية للشريك:' : 'Financial Transactions & Payouts Log:'}</span>
            </div>

            {partnerTransactions.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.68rem' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'رقم الإشعار' : 'Ref'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'نوع الحركة' : 'Type'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'المبلغ (ج.م)' : 'Amount'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'طريقة الدفع' : 'Method'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'البيان' : 'Memo'}</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerTransactions.map((t, idx) => (
                      <tr key={t.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                          {t.transaction_number}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          {t.type === 'CAPITAL_INJECTION' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#946f23', fontWeight: 800 }}>
                              <ArrowDownLeft size={13} />
                              <span>{isAr ? 'ضخ رأس مال' : 'Injection'}</span>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#15803d', fontWeight: 800 }}>
                              <ArrowUpRight size={13} />
                              <span>{isAr ? 'صرف أرباح' : 'Distribution'}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: isAr ? 'left' : 'right', fontWeight: 800 }}>
                          <MoneyCell amount={t.amount} isAr={isAr} />
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', color: '#475569' }}>
                          {t.payment_method === 'CASH_101000' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Wallet size={12} color="#946f23" />
                              <span>{isAr ? 'خزينة كاش' : 'Cash'}</span>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Landmark size={12} color="#1d4ed8" />
                              <span>{isAr ? 'بنك / إنستاباي' : 'Bank'}</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', color: '#334155' }}>
                          {t.memo}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: isAr ? 'left' : 'right', color: '#64748b' }}>
                          {t.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.74rem' }}>
                {isAr ? 'لا توجد حركات مالية مسجلة لهذا الشريك' : 'No recorded transactions'}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onOpenInjection && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInjection(partner.partnerName);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(148, 111, 35, 0.35)',
                  color: '#946f23',
                  borderRadius: '8px',
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Coins size={15} />
                <span>{isAr ? '+ ضخ مساهمة جديدة' : '+ Inject Capital'}</span>
              </button>
            )}

            {onOpenPayout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayout(partner.partnerName);
                }}
                style={{
                  background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(21, 128, 61, 0.25)'
                }}
              >
                <Receipt size={15} />
                <span>{isAr ? '+ صرف دفعة أرباح' : '+ Payout Profit'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              maxWidth: '900px', 
              width: '100%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'كشف حساب وحصص الشريك الاستثماري' : 'Partner Statement & Investment Dossier'}
              documentSubtitle={isAr ? `الشريك: ${partner.partnerName} (${partner.roleTitleAr})` : `Partner: ${partner.partnerName} (${partner.roleTitleAr})`}
              voucherCode={voucherCode}
              date={reportDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
            >
              {printablePartnerBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'كشف حساب وحصص الشريك الاستثماري' : 'Partner Statement & Investment Dossier'}
          documentSubtitle={isAr ? `الشريك: ${partner.partnerName} (${partner.roleTitleAr})` : `Partner: ${partner.partnerName} (${partner.roleTitleAr})`}
          voucherCode={voucherCode}
          date={reportDate}
          isAr={isAr}
        >
          {printablePartnerBody}
        </ZFPrintDocumentLayout>
      </div>
    </div>
  );
};
