'use client';

import React, { useState } from 'react';
import { 
  User, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  Coins, 
  Banknote,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { exportPartnerDossierExcel } from '@/lib/erp/excelExporter';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFModalShell } from '../common/ZFModalShell';
import { ZFFacts, ZFFormFooter, zfForm } from '../common/ZFForm';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './PartnerDossierModal.module.css';

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
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  if (!isOpen || !partner) return null;

  const partnerTransactions = transactions.filter(t => t.partner_name === partner.partnerName);

  const handleExportStatementExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportPartnerDossierExcel(partner, partnerTransactions, isAr);
      toast.success(isAr ? 'تم تصدير كشف حساب الشريك بنجاح إلى Excel' : 'Partner dossier exported to Excel');
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const voucherCode = `PTR-${partner.partnerName.replace(/\s+/g, '').slice(0, 6)}-${new Date().getFullYear()}`;
  const reportDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const printablePartnerBody = (
    <div className={styles.printableBody} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Partner Profile Card */}
      <div className={styles.printProfileGrid}>
        <div>
          <span className={styles.printLabel}>{isAr ? 'اسم الشريك / الممول' : 'Partner Name'}</span>
          <strong className={styles.printVal}>{partner.partnerName}</strong>
        </div>
        <div>
          <span className={styles.printLabel}>{isAr ? 'نوع الشراكة' : 'Partnership Role'}</span>
          <strong className={styles.printValAccent}>{partner.roleTitleAr}</strong>
        </div>
        <div>
          <span className={styles.printLabel}>{isAr ? 'رأس المال المودع' : 'Contributed Capital'}</span>
          <strong className={styles.printVal}>{D(partner.totalContributedCapital).formatEGP(isAr)}</strong>
        </div>
        <div>
          <span className={styles.printLabel}>{isAr ? 'صافي الرصيد المستحق' : 'Net Current Balance'}</span>
          <strong className={D(partner.netCurrentBalance).isNegative() ? styles.printValRed : styles.printValGreen}>
            {D(partner.netCurrentBalance).formatEGP(isAr)}
          </strong>
        </div>
      </div>

      {/* 2. Holdings Table */}
      <div>
        <h4 className={zfForm.sectionTitle}>{isAr ? 'حصص الشراكة في مشاريع الشركة' : 'Project Equity Shares & Holdings'}</h4>
        <div className={styles.tableWrap}>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th className={styles.cellCenter}>#</th>
                <th>{isAr ? 'المشروع العقاري' : 'Project'}</th>
                <th className={styles.cellCenter}>{isAr ? 'نسبة الحصة (%)' : 'Share %'}</th>
                <th className={styles.cellNum}>{isAr ? 'نصيب المبيعات (ج.م)' : 'Sales Share'}</th>
                <th className={styles.cellNum}>{isAr ? 'نصيب التكاليف (ج.م)' : 'WIP Cost Share'}</th>
              </tr>
            </thead>
            <tbody>
              {partner.holdings.map((h, i) => (
                <tr key={i}>
                  <td className={styles.cellCenter}>{i + 1}</td>
                  <td><strong>{h.propertyTitle}</strong></td>
                  <td className={styles.cellCenter}>{h.sharePct}%</td>
                  <td className={styles.cellNum}>{D(h.contractSalesShare).formatEGP(isAr)}</td>
                  <td className={styles.cellNum}>{D(h.wipCostShare).formatEGP(isAr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Transaction History Table */}
      <div>
        <h4 className={zfForm.sectionTitle}>{isAr ? 'سجل العمليات والتحويلات المالية المسجلة' : 'Recorded Financial Transactions'}</h4>
        <div className={styles.tableWrap}>
          <table className={styles.printTable}>
            <thead>
              <tr>
                <th className={styles.cellCenter}>#</th>
                <th className={styles.cellCenter}>{isAr ? 'رقم الإشعار' : 'Ref #'}</th>
                <th className={styles.cellCenter}>{isAr ? 'التاريخ' : 'Date'}</th>
                <th className={styles.cellCenter}>{isAr ? 'نوع العملية' : 'Type'}</th>
                <th className={styles.cellNum}>{isAr ? 'المبلغ (ج.م)' : 'Amount'}</th>
                <th>{isAr ? 'البيان وملاحظات القيد' : 'Memo'}</th>
              </tr>
            </thead>
            <tbody>
              {partnerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    {isAr ? 'لا توجد حركات مالية مسجلة بعد لهذا الشريك' : 'No recorded transactions yet.'}
                  </td>
                </tr>
              ) : (
                partnerTransactions.map((t, idx) => (
                  <tr key={idx}>
                    <td className={styles.cellCenter}>{idx + 1}</td>
                    <td className={styles.cellCenter}><code>{t.transaction_number}</code></td>
                    <td className={styles.cellCenter}>{t.date}</td>
                    <td className={styles.cellCenter}>
                      {t.type === 'CAPITAL_INJECTION' ? (isAr ? 'ضخ رأس مال' : 'Injection') : (isAr ? 'صرف أرباح' : 'Payout')}
                    </td>
                    <td className={styles.cellNum}>{D(t.amount).formatEGP(isAr)}</td>
                    <td>{t.memo || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const footer = (
    <ZFFormFooter
      aside={
        <div className={styles.footerActionsStart}>
          <button
            type="button"
            className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
            onClick={handleExportStatementExcel}
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
          <button
            type="button"
            className={`${shellStyles.btnSecondary} ${shellStyles.btnSm}`}
            onClick={() => setShowPrintPreview(true)}
          >
            <FileText size={13} />
            <span>{isAr ? 'معاينة' : 'Preview'}</span>
          </button>
        </div>
      }
    >
      <button type="button" className={shellStyles.btnSecondary} onClick={onClose}>
        {isAr ? 'إغلاق' : 'Close'}
      </button>
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
          <Banknote size={14} />
          <span>{isAr ? 'صرف أرباح' : 'Payout profit'}</span>
        </button>
      )}
    </ZFFormFooter>
  );

  return (
    <>
      <ZFModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={isAr ? 'ملف الشريك' : 'Partner dossier'}
        subtitle={
          isAr
            ? `كشف حساب استثماري وحصص أرباح: ${partner.partnerName} (${partner.roleTitleAr})`
            : `Investment dossier: ${partner.partnerName} (${partner.roleTitleAr})`
        }
        icon={<User size={18} />}
        isAr={isAr}
        maxWidth="880px"
        footer={footer}
      >
        <div className={styles.container}>
          {/* 1. Key Metrics Strip */}
          <ZFFacts
            items={[
              {
                label: isAr ? 'رأس المال المودع' : 'Contributed capital',
                value: `${Number(partner.totalContributedCapital).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'نصيبه من التحصيلات' : 'Collections share',
                value: `${Number(partner.totalCollectionsShare).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'أرباح مصروفة' : 'Distributions paid',
                value: `${Number(partner.totalDistributionsPaid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`
              },
              {
                label: isAr ? 'صافي الرصيد المستحق' : 'Net current balance',
                value: `${Number(partner.netCurrentBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`,
                tone: D(partner.netCurrentBalance).lt(0) ? 'neg' : D(partner.netCurrentBalance).gt(0) ? 'pos' : undefined
              }
            ]}
          />

          {/* 2. Holdings Section */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>
              {isAr ? 'مشاريع الشراكة وحصص العقارات' : 'Project partnership holdings'}
            </h4>
            {partner.holdings.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{isAr ? 'المشروع' : 'Project'}</th>
                      <th className={styles.cellCenter}>{isAr ? 'نسبة الحصة' : 'Equity %'}</th>
                      <th className={styles.cellNum}>{isAr ? 'نصيب مبيعات الشقق' : 'Sales share'}</th>
                      <th className={styles.cellNum}>{isAr ? 'نصيب التكاليف' : 'Cost share'}</th>
                      <th className={styles.cellNum}>{isAr ? 'صافي ربح المشروع' : 'Project profit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partner.holdings.map((h, i) => (
                      <tr key={h.propertyId || i}>
                        <td><strong>{h.propertyTitle}</strong></td>
                        <td className={styles.cellCenter}>
                          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
                            {h.sharePct}%
                          </span>
                        </td>
                        <td className={styles.cellNum}>{D(h.contractSalesShare).formatEGP(isAr)}</td>
                        <td className={styles.cellNum}>{D(h.wipCostShare).formatEGP(isAr)}</td>
                        <td className={styles.cellNum}>
                          <strong className={D(h.projectProfitShare).gte(0) ? styles.printValGreen : styles.printValRed}>
                            {D(h.projectProfitShare).formatEGP(isAr)}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                {isAr ? 'لا توجد مشاريع محددة مخصصة للشريك حالياً' : 'No specific project allocations'}
              </div>
            )}
          </div>

          {/* 3. Transaction History Section */}
          <div className={zfForm.section}>
            <h4 className={zfForm.sectionTitle}>
              {isAr ? 'سجل العمليات والتحويلات المالية' : 'Financial transactions log'}
            </h4>
            {partnerTransactions.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{isAr ? 'رقم الإشعار' : 'Ref'}</th>
                      <th>{isAr ? 'نوع الحركة' : 'Type'}</th>
                      <th className={styles.cellNum}>{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th>{isAr ? 'طريقة الدفع' : 'Method'}</th>
                      <th>{isAr ? 'البيان' : 'Memo'}</th>
                      <th>{isAr ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerTransactions.map((t, idx) => (
                      <tr key={t.id || idx}>
                        <td><code>{t.transaction_number}</code></td>
                        <td>
                          {t.type === 'CAPITAL_INJECTION' ? (
                            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                              <ArrowDownLeft size={11} />
                              {isAr ? 'ضخ رأس مال' : 'Injection'}
                            </span>
                          ) : (
                            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`}>
                              <ArrowUpRight size={11} />
                              {isAr ? 'صرف أرباح' : 'Payout'}
                            </span>
                          )}
                        </td>
                        <td className={styles.cellNum}>
                          <strong>{D(t.amount).formatEGP(isAr)}</strong>
                        </td>
                        <td>
                          {t.payment_method === 'DEBT_OFFSET'
                            ? (isAr ? 'خصم من الأرباح' : 'Offset from profit')
                            : t.payment_method === 'CASH_101000'
                            ? (isAr ? 'خزينة نقداً' : 'Cash')
                            : (isAr ? 'إنستاباي' : 'InstaPay')}
                        </td>
                        <td>{t.memo || '—'}</td>
                        <td>{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                {isAr ? 'لا توجد حركات مالية مسجلة لهذا الشريك' : 'No recorded transactions'}
              </div>
            )}
          </div>
        </div>
      </ZFModalShell>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div className={styles.printOverlay} onClick={() => setShowPrintPreview(false)}>
          <div className={styles.printCard} onClick={e => e.stopPropagation()}>
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

      {/* Hidden print container for window.print() */}
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
    </>
  );
};
