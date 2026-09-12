'use client';

import React from 'react';
import { Printer, ShieldCheck, Landmark, Building2, X } from 'lucide-react';

export interface ZFPrintDocumentLayoutProps {
  documentTitle: string;
  documentSubtitle?: string;
  voucherCode: string;
  date: string;
  children: React.ReactNode;
  onClose?: () => void;
  isAr?: boolean;
}

export const ZFPrintDocumentLayout: React.FC<ZFPrintDocumentLayoutProps> = ({
  documentTitle,
  documentSubtitle,
  voucherCode,
  date,
  children,
  onClose,
  isAr = true
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="zf-print-container" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* SCREEN-ONLY TOOLBAR (Hidden during actual print) */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        background: '#0f172a',
        color: '#ffffff',
        borderRadius: '12px 12px 0 0',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#b8903e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Printer size={16} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
            {isAr ? 'معاينة المستند الرسمي المعتمد للطباعة' : 'Official Document Print Preview'}
          </span>
          <span style={{
            fontSize: '0.72rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}>
            {voucherCode}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #b8903e 0%, #946f23 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(184, 144, 62, 0.3)'
            }}
          >
            <Printer size={15} />
            <span>{isAr ? 'بدء الطباعة الآن (Ctrl+P)' : 'Print Document'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق المعاينة' : 'Close Preview'}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: 'none',
                padding: '0.45rem',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '44px',
                minHeight: '44px',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* THE OFFICIAL PRINTABLE PAPER DOCUMENT */}
      <div 
        id="zf-printable-area" 
        className="zf-printable-document"
        style={{
          background: '#ffffff',
          color: '#0f172a',
          padding: '16mm 16mm',
          fontFamily: isAr ? 'var(--font-thmanyah, "ThmanyahSans"), var(--font-cairo, "Cairo"), "Segoe UI", Tahoma, sans-serif' : 'var(--font-thmanyah, "ThmanyahSans"), Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        {/* 1. OFFICIAL CORPORATE LETTERHEAD */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2.5px solid #0f172a',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            {/* Right: Company Logo & Identity (RTL) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                border: '2px solid #b8903e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4af37',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}>
                <Building2 size={26} />
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  color: '#0f172a'
                }}>
                  {isAr ? 'شركة زكريا فريد للتطوير العقاري' : 'Zakaria Farid Real Estate Developments'}
                </h1>
                <p style={{
                  margin: '0.2rem 0 0 0',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#b8903e',
                  letterSpacing: '0.05em'
                }}>
                  {isAr ? 'آل زكريا للعقارات الفاخرة • ZAKARIA FARID LUXURY ESTATES' : 'LUXURY ASSETS & ARCHITECTURAL ESTATES'}
                </p>
                <div style={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  marginTop: '0.25rem'
                }}>
                  {isAr 
                    ? 'س.ت: 184520 • ب.ض: 541-230-890 • المركز الرئيسي: منيا القمح - محافظة الشرقية'
                    : 'CR: 184520 • Tax ID: 541-230-890 • Headquarters: Minya al-Qamh, Sharkia'}
                </div>
              </div>
            </div>

            {/* Left: Document Type & Serial Metadata */}
            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <div style={{
                display: 'inline-block',
                background: '#0f172a',
                color: '#ffffff',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                marginBottom: '0.4rem'
              }}>
                {documentTitle}
              </div>
              {documentSubtitle && (
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  {documentSubtitle}
                </div>
              )}
              <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', color: '#334155' }}>
                <span style={{ fontWeight: 700 }}>{isAr ? 'رقم المستند: ' : 'Doc Ref: '}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#b8903e' }}>{voucherCode}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '0.15rem' }}>
                <span style={{ fontWeight: 700 }}>{isAr ? 'تاريخ الإصدار: ' : 'Date: '}</span>
                <span style={{ fontWeight: 700 }}>{date}</span>
              </div>
            </div>
          </div>

          {/* 2. DOCUMENT BODY */}
          <div style={{ marginBottom: '2rem' }}>
            {children}
          </div>
        </div>

        {/* 3. OFFICIAL STATUTORY FOOTER & SIGNATURES */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1.5px solid #e2e8f0' }}>
          {/* Signatures Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            {/* Box 1 */}
            <div style={{
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '2.5rem' }}>
                {isAr ? 'توقيع العميل / المودع / الشريك' : 'Client / Payer Signature'}
              </div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.35rem', fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'الاسم والتوقيع' : 'Name & Signature'}
              </div>
            </div>

            {/* Box 2 */}
            <div style={{
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '2.5rem' }}>
                {isAr ? 'توقيع أمين الخزينة / المستلم' : 'Treasurer / Receiver'}
              </div>
              <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '0.35rem', fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'الاستلام والعهد' : 'Custody & Receipt'}
              </div>
            </div>

            {/* Box 3: Company Seal & Management */}
            <div style={{
              border: '1px solid #b8903e',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center',
              background: 'rgba(184, 144, 62, 0.03)',
              position: 'relative'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23', marginBottom: '2.5rem' }}>
                {isAr ? 'اعتماد الإدارة المالية وختم الشركة' : 'Chief Financial Officer & Official Seal'}
              </div>
              <div style={{ borderTop: '1px dashed #b8903e', paddingTop: '0.35rem', fontSize: '0.68rem', color: '#946f23', fontWeight: 700 }}>
                {isAr ? 'مُعتمد رسمياً ومرحل بالدفاتر ✓' : 'Audited & Posted ✓'}
              </div>
            </div>
          </div>

          {/* Legal Notice & Watermark Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.66rem',
            color: '#64748b',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '0.5rem'
          }}>
            <span>
              {isAr 
                ? 'مستند مالي معتمد صادر إلكترونياً من نظام ZF FIN-OS • لا يعتد بأي كشط أو تعديل يدوي' 
                : 'Official financial instrument generated by ZF FIN-OS • Alterations void validity'}
            </span>
            <span>
              {isAr ? 'صفحة 1 من 1 • نسخة أصلية' : 'Page 1 of 1 • Original Copy'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
