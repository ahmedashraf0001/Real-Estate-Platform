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
  Crown,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import { ZFDrawerShell } from '../../common/ZFDrawerShell';
import styles from '../../ZFWorkstationShell.module.css';

export interface PartnerDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partner?: PartnerFinancialSummary | null;
  transactions?: ERPPartnerTransaction[];
  isAr?: boolean;
  onOpenPayout?: (partnerName: string) => void;
  onOpenInjection?: (partnerName: string) => void;
}

export const PartnerDossierDrawer: React.FC<PartnerDossierDrawerProps> = ({
  isOpen,
  onClose,
  partner,
  transactions = [],
  isAr = true,
  onOpenPayout,
  onOpenInjection
}) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedHoldingIndex, setExpandedHoldingIndex] = useState<number | null>(0);

  if (!partner) return null;

  const partnerTransactions = transactions.filter(t => t.partner_name === partner.partnerName);
  const isFounder = partner.isPermanent || partner.partnerName.includes('زكريا فريد');

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(isAr ? `تم نسخ ${fieldName}` : `Copied ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportPartnerDossierExcel(partner, partnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب الشريك بنجاح' : 'Partner statement exported');
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <ZFDrawerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="540px"
      isAr={isAr}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: isFounder ? 'rgba(217, 119, 6, 0.12)' : 'rgba(37, 99, 235, 0.12)',
            color: isFounder ? '#d97706' : 'var(--erp-accent, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem'
          }}>
            {isFounder ? <Crown size={18} /> : (partner.partnerName.slice(0, 1))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {partner.partnerName}
              </span>
              {isFounder && (
                <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.65rem' }}>
                  {isAr ? 'المطور الرئيسي' : 'Founder'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {partner.roleTitleAr}
              </span>
              {partner.joined_date && (
                <>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#64748b' }}>
                    <Calendar size={11} />
                    <span>{isAr ? `انضم: ${partner.joined_date}` : `Joined: ${partner.joined_date}`}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          {onOpenInjection && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInjection(partner.partnerName);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Coins size={14} color="var(--erp-accent, #2563eb)" />
              <span>{isAr ? '+ ضخ رأس مال' : '+ Inject Capital'}</span>
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
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'var(--erp-accent, #2563eb)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Receipt size={14} />
              <span>{isAr ? '+ صرف أرباح' : '+ Pay Dividend'}</span>
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Quick Toolbar (Export & Print & Joining Date) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.6rem 0.85rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`${styles.statusPill} ${D(partner.totalArrears || 0).gt(0) ? styles.statusPillAmber : styles.statusPillGreen}`}>
              {D(partner.totalArrears || 0).gt(0)
                ? (isAr ? 'عجز تمويل' : 'Has Arrears')
                : (isAr ? 'شريك نشط ومعتمد ✓' : 'Active Partner ✓')}
            </span>
            {partner.joined_date && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#64748b' }}>
                <Calendar size={12} />
                <span>{isAr ? `تاريخ الانضمام: ${partner.joined_date}` : `Joined: ${partner.joined_date}`}</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={13} color="#64748b" />
              <span>{isAr ? 'تصدير كشف Excel' : 'Export Excel'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <Printer size={13} />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* 1. FINANCIAL SUMMARY GRID */}
        <div>
          <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
            {isAr ? 'المؤشرات المالية والمستحقات (حسابات 301000 و 303000)' : 'Financial Balance & Metrics'}
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.75rem',
          }}>
            {/* Contributed Capital */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem',
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'رأس المال المودع (301000)' : 'Contributed Capital'}
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {D(partner.totalContributedCapital).formatEGP(isAr)}
              </strong>
            </div>

            {/* Total Distributions Paid */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem',
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'الأرباح المنصرفة (303000)' : 'Distributions Paid'}
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {D(partner.totalDistributionsPaid).formatEGP(isAr)}
              </strong>
            </div>

            {/* Net Current Balance */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem',
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'صافي الرصيد المستحق للصرف' : 'Net Current Balance'}
              </span>
              <strong style={{
                fontSize: '1.05rem',
                color: D(partner.netCurrentBalance).isNegative() ? '#dc2626' : '#2563eb',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {D(partner.netCurrentBalance).formatEGP(isAr)}
              </strong>
            </div>

            {/* ROI % */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.85rem',
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>
                {isAr ? 'العائد على الاستثمار (ROI)' : 'Return on Investment'}
              </span>
              <strong style={{ fontSize: '1.05rem', color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                {partner.roiPercent}%
              </strong>
            </div>
          </div>
        </div>

        {/* 2. BANK & CONTACT DETAILS */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '1rem',
        }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
            {isAr ? 'بيانات الاتصال والتحويل البنكي' : 'Contact & Banking Information'}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.78rem' }}>
            {/* Phone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={13} />
                {isAr ? 'رقم الهاتف:' : 'Phone:'}
              </span>
              {partner.phone ? (
                <a href={`tel:${partner.phone}`} style={{ color: 'var(--erp-accent, #2563eb)', fontWeight: 700, textDecoration: 'none' }}>
                  {partner.phone}
                </a>
              ) : (
                <span style={{ color: '#94a3b8' }}>—</span>
              )}
            </div>

            {/* National ID */}
            {partner.national_id && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>
                  {isAr ? 'الرقم القومي:' : 'National ID:'}
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {partner.national_id}
                </span>
              </div>
            )}

            {/* InstaPay */}
            {partner.instapay_handle && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                background: '#f1f5f9'
              }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>
                  {isAr ? 'حساب إنستاباي (InstaPay):' : 'InstaPay Handle:'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(partner.instapay_handle!, 'InstaPay')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--erp-accent, #2563eb)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {copiedField === 'InstaPay' ? <Check size={12} color="var(--erp-accent, #2563eb)" /> : <Copy size={12} />}
                  <span>{partner.instapay_handle}</span>
                </button>
              </div>
            )}

            {/* Bank & IBAN */}
            {partner.bank_name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Landmark size={13} />
                  {isAr ? 'البنك:' : 'Bank:'}
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{partner.bank_name}</span>
              </div>
            )}

            {partner.iban && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                background: '#f1f5f9'
              }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>IBAN:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(partner.iban!, 'IBAN')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--erp-accent, #2563eb)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.72rem'
                  }}
                >
                  {copiedField === 'IBAN' ? <Check size={12} color="var(--erp-accent, #2563eb)" /> : <Copy size={12} />}
                  <span>{partner.iban.slice(0, 12)}...{partner.iban.slice(-4)}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. PROJECT HOLDINGS ACCORDION */}
        <div>
          <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
            {isAr ? `حصص المشروعات والعماير (${partner.holdings.length})` : `Project Holdings (${partner.holdings.length})`}
          </h4>

          {partner.holdings.length === 0 ? (
            <div style={{
              padding: '1.25rem',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              fontSize: '0.78rem',
              color: '#64748b'
            }}>
              {isAr ? 'لا توجد حصص مسجلة في المشروعات الحالية' : 'No active holdings in current projects'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {partner.holdings.map((h, i) => {
                const isExpanded = expandedHoldingIndex === i;
                return (
                  <div
                    key={h.propertyId || i}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedHoldingIndex(isExpanded ? null : i)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: isAr ? 'right' : 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={15} color="var(--erp-accent, #2563eb)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                          {h.propertyTitle}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className={`${styles.statusPill} ${styles.statusPillBlue}`} style={{ fontWeight: 800 }}>
                          {h.sharePct}%
                        </span>
                        {isExpanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.6rem',
                        fontSize: '0.75rem'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'نصيب المبيعات' : 'Sales Share'}</span>
                          <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(h.contractSalesShare).formatEGP(isAr)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'نصيب تكلفة المباني (WIP)' : 'WIP Cost Share'}</span>
                          <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(h.wipCostShare).formatEGP(isAr)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'نصيب التحصيلات الفعلية' : 'Collections Share'}</span>
                          <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(h.collectionsShare).formatEGP(isAr)}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'صافي ربح المشروع المقدر' : 'Project Profit Share'}</span>
                          <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(h.projectProfitShare).formatEGP(isAr)}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </ZFDrawerShell>
  );
};
