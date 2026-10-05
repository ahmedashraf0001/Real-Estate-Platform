'use client';

import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  Coins, 
  FileSpreadsheet, 
  Receipt, 
  Landmark, 
  Printer, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { toast } from 'sonner';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFDrawerShell } from '../../common/ZFDrawerShell';
import { ZFFacts, zfForm } from '../../common/ZFForm';
import shellStyles from '../../ZFWorkstationShell.module.css';
import styles from './PartnerDossierDrawer.module.css';

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

  const footer = (
    <div className={styles.drawerFooter}>
      {onOpenInjection && (
        <button
          type="button"
          className={shellStyles.btnSecondary}
          onClick={() => {
            onClose();
            onOpenInjection(partner.partnerName);
          }}
        >
          <Coins size={14} />
          <span>{isAr ? 'ضخ مساهمة' : 'Inject capital'}</span>
        </button>
      )}

      {onOpenPayout && (
        <button
          type="button"
          className={shellStyles.btnPrimary}
          onClick={() => {
            onClose();
            onOpenPayout(partner.partnerName);
          }}
        >
          <Receipt size={14} />
          <span>{isAr ? 'صرف أرباح' : 'Pay dividend'}</span>
        </button>
      )}
    </div>
  );

  return (
    <ZFDrawerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="540px"
      isAr={isAr}
      title={partner.partnerName}
      subtitle={partner.roleTitleAr}
      icon={<User size={16} />}
      footer={footer}
    >
      <div className={styles.container}>
        {/* Quick Toolbar (Export & Print & Joining Date) */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarStart}>
            <span
              className={`${shellStyles.statusPill} ${
                D(partner.totalArrears || 0).gt(0)
                  ? shellStyles.statusPillAmber
                  : shellStyles.statusPillGreen
              }`}
            >
              {D(partner.totalArrears || 0).gt(0)
                ? (isAr ? 'عجز تمويل' : 'Has arrears')
                : (isAr ? 'شريك نشط' : 'Active partner')}
            </span>
            {partner.joined_date && (
              <span className={styles.dateText}>
                <Calendar size={12} />
                <span>{isAr ? `انضم: ${partner.joined_date}` : `Joined: ${partner.joined_date}`}</span>
              </span>
            )}
          </div>

          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
              onClick={handleExportExcel}
              disabled={isExportingExcel}
            >
              <FileSpreadsheet size={13} />
              <span>{isExportingExcel ? (isAr ? 'جارٍ التصدير…' : 'Exporting…') : (isAr ? 'Excel' : 'Excel')}</span>
            </button>
            <button
              type="button"
              className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
              onClick={() => window.print()}
            >
              <Printer size={13} />
              <span>{isAr ? 'طباعة' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* 1. FINANCIAL SUMMARY */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? 'المؤشرات المالية والمستحقات' : 'Financial balance and metrics'}
          </h4>
          <ZFFacts
            items={[
              {
                label: isAr ? 'رأس المال المودع' : 'Contributed capital',
                value: `${Number(partner.totalContributedCapital).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'الأرباح المنصرفة' : 'Distributions paid',
                value: `${Number(partner.totalDistributionsPaid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'صافي الرصيد المستحق' : 'Net current balance',
                value: `${Number(partner.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                tone: D(partner.netCurrentBalance).lt(0) ? 'neg' : D(partner.netCurrentBalance).gt(0) ? 'pos' : undefined
              },
              {
                label: isAr ? 'العائد على الاستثمار' : 'Return on investment',
                value: `${partner.roiPercent}%`
              }
            ]}
          />
        </div>

        {/* 2. BANK & CONTACT DETAILS */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? 'بيانات الاتصال والتحويل البنكي' : 'Contact & banking information'}
          </h4>
          <div className={styles.contactBox}>
            {/* Phone */}
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>
                <Phone size={13} />
                {isAr ? 'رقم الهاتف:' : 'Phone:'}
              </span>
              {partner.phone ? (
                <a href={`tel:${partner.phone}`} className={styles.copyBtn}>
                  {partner.phone}
                </a>
              ) : (
                <span className={styles.contactVal}>—</span>
              )}
            </div>

            {/* National ID */}
            {partner.national_id && (
              <div className={styles.contactRow}>
                <span className={styles.contactLabel}>
                  {isAr ? 'الرقم القومي:' : 'National ID:'}
                </span>
                <span className={styles.contactVal}>
                  {partner.national_id}
                </span>
              </div>
            )}

            {/* InstaPay */}
            {partner.instapay_handle && (
              <div className={styles.copyRow}>
                <span className={styles.contactLabel}>
                  {isAr ? 'حساب إنستاباي:' : 'InstaPay:'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(partner.instapay_handle!, 'InstaPay')}
                  className={styles.copyBtn}
                >
                  {copiedField === 'InstaPay' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{partner.instapay_handle}</span>
                </button>
              </div>
            )}

            {/* Bank & IBAN */}
            {partner.bank_name && (
              <div className={styles.contactRow}>
                <span className={styles.contactLabel}>
                  <Landmark size={13} />
                  {isAr ? 'البنك:' : 'Bank:'}
                </span>
                <span className={styles.contactVal}>{partner.bank_name}</span>
              </div>
            )}

            {partner.iban && (
              <div className={styles.copyRow}>
                <span className={styles.contactLabel}>IBAN:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(partner.iban!, 'IBAN')}
                  className={styles.copyBtn}
                >
                  {copiedField === 'IBAN' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{partner.iban.slice(0, 12)}…{partner.iban.slice(-4)}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. PROJECT HOLDINGS ACCORDION */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? `حصص المشروعات (${partner.holdings.length})` : `Project holdings (${partner.holdings.length})`}
          </h4>

          {partner.holdings.length === 0 ? (
            <div className={styles.emptyHoldings}>
              {isAr ? 'لا توجد حصص مسجلة في المشروعات الحالية' : 'No active holdings in current projects'}
            </div>
          ) : (
            <div className={styles.accordionList}>
              {partner.holdings.map((h, i) => {
                const isExpanded = expandedHoldingIndex === i;
                return (
                  <div key={h.propertyId || i} className={styles.accordionItem}>
                    <button
                      type="button"
                      onClick={() => setExpandedHoldingIndex(isExpanded ? null : i)}
                      className={styles.accordionHeader}
                    >
                      <div className={styles.accordionTitle}>
                        <Building2 size={15} />
                        <span>{h.propertyTitle}</span>
                      </div>
                      <div className={styles.accordionMeta}>
                        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                          {h.sharePct}%
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className={styles.accordionBody}>
                        <div className={styles.accordionBodyItem}>
                          <span className={styles.accordionBodyLabel}>{isAr ? 'نصيب المبيعات' : 'Sales share'}</span>
                          <span className={styles.accordionBodyVal}>
                            {D(h.contractSalesShare).formatEGP(isAr)}
                          </span>
                        </div>
                        <div className={styles.accordionBodyItem}>
                          <span className={styles.accordionBodyLabel}>{isAr ? 'نصيب تكلفة المباني (WIP)' : 'WIP cost share'}</span>
                          <span className={styles.accordionBodyVal}>
                            {D(h.wipCostShare).formatEGP(isAr)}
                          </span>
                        </div>
                        <div className={styles.accordionBodyItem}>
                          <span className={styles.accordionBodyLabel}>{isAr ? 'نصيب التحصيلات الفعلية' : 'Collections share'}</span>
                          <span className={styles.accordionBodyVal}>
                            {D(h.collectionsShare).formatEGP(isAr)}
                          </span>
                        </div>
                        <div className={styles.accordionBodyItem}>
                          <span className={styles.accordionBodyLabel}>{isAr ? 'صافي ربح المشروع' : 'Project profit share'}</span>
                          <span className={styles.accordionBodyVal}>
                            {D(h.projectProfitShare).formatEGP(isAr)}
                          </span>
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
