'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, BookOpen, Landmark, Wallet } from 'lucide-react';
import { ERPContract, ERPPDCRecord } from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { ERPNavModule } from './ZFNavigationDock';

interface ZFQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  cheques: ERPPDCRecord[];
  onSelectModule: (mod: string) => void;
  onSelectContract: (contract: ERPContract) => void;
  onOpenAcademy?: () => void;
  onStartGuidedTour?: () => void;
  isAr?: boolean;
}

export const ZFQuickSearchModal: React.FC<ZFQuickSearchModalProps> = ({
  isOpen,
  onClose,
  contracts,
  cheques,
  onSelectModule,
  onSelectContract,
  onOpenAcademy,
  onStartGuidedTour,
  isAr = false
}) => {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    const matches: Array<{
      id: string;
      category: string;
      title: string;
      subtitle: string;
      icon: typeof Search;
      action: () => void;
    }> = [];

    // 0. Academy & Guided Tour Commands
    if (onOpenAcademy && ('academy'.includes(q) || 'help'.includes(q) || 'guide'.includes(q) || 'tutorial'.includes(q) || 'دليل'.includes(q) || 'شرح'.includes(q) || 'أكاديمية'.includes(q) || 'تعليم'.includes(q))) {
      matches.push({
        id: 'cmd-academy',
        category: isAr ? 'المساعدة والتدريب' : 'Help & Learning',
        title: isAr ? 'أكاديمية المنظومة ودليل الاستخدام الشامل' : 'FIN-OS Master Academy & Guide',
        subtitle: isAr ? 'شرح دورة العمل العقارية، الشاشات، والروتين اليومي' : 'Learn end-to-end workflows & modules',
        icon: BookOpen,
        action: () => {
          onOpenAcademy();
          onClose();
        }
      });
    }

    if (onStartGuidedTour && ('tour'.includes(q) || 'walkthrough'.includes(q) || 'جولة'.includes(q) || 'استرشاد'.includes(q) || 'بداية'.includes(q))) {
      matches.push({
        id: 'cmd-tour',
        category: isAr ? 'المساعدة والتدريب' : 'Help & Learning',
        title: isAr ? 'بدء الجولة التفاعلية المباشرة للشاشة' : 'Start Live Screen Guided Tour',
        subtitle: isAr ? 'شرح مرئي خطوة بخطوة لمكونات لوحة القيادة' : 'Step-by-step visual spotlight of cockpit components',
        icon: BookOpen,
        action: () => {
          onStartGuidedTour();
          onClose();
        }
      });
    }

    // 1. Navigation Modules & 4-Hubs
    const modules: Array<{ id: string; nameEn: string; nameAr: string; categoryEn: string; categoryAr: string }> = [
      // 4 Main Hubs
      { id: 'operations', nameEn: 'Daily Desk & Cashier', nameAr: 'المكتب اليومي والخزينة', categoryEn: 'Core Hubs', categoryAr: 'المحطات الرئيسية' },
      { id: 'projects', nameEn: 'Cockpit & Projects (WIP)', nameAr: 'القيادة والمشاريع (WIP)', categoryEn: 'Core Hubs', categoryAr: 'المحطات الرئيسية' },
      { id: 'contracts', nameEn: 'Sales & Contracts', nameAr: 'عقود المبيعات والتحصيل', categoryEn: 'Core Hubs', categoryAr: 'المحطات الرئيسية' },
      { id: 'ledger', nameEn: 'General Ledger & Audit', nameAr: 'الحسابات العامة والرقابة', categoryEn: 'Core Hubs', categoryAr: 'المحطات الرئيسية' },

      // Sub-views & Screens
      { id: 'cockpit', nameEn: 'Financial Cockpit & Horizon', nameAr: 'لوحة القيادة المالية والمنحنى', categoryEn: 'Projects Sub-views', categoryAr: 'أقسام المشاريع' },
      { id: 'properties', nameEn: 'Properties & Units Portfolio', nameAr: 'محفظة المشروعات والأصول العقارية', categoryEn: 'Projects Sub-views', categoryAr: 'أقسام المشاريع' },
      { id: 'calculator', nameEn: 'Construction Costs & WIP Feasibility', nameAr: 'تكاليف البناء والجدوى الإنشائية', categoryEn: 'Projects Sub-views', categoryAr: 'أقسام المشاريع' },
      { id: 'cost-allocation', nameEn: 'Cost Allocation & RSV Factor', nameAr: 'تخصيص التكاليف ومعامل الرسملة RSV', categoryEn: 'Projects Sub-views', categoryAr: 'أقسام المشاريع' },
      { id: 'contracts', nameEn: 'Sales Contracts Registry & Schedules', nameAr: 'سجل عقود البيع وجداول الأقساط', categoryEn: 'Contracts Sub-views', categoryAr: 'أقسام العقود' },
      { id: 'pdc', nameEn: 'Hand Installments & Dues Agenda', nameAr: 'أجندة الأقساط وسندات القبض باليد', categoryEn: 'Contracts Sub-views', categoryAr: 'أقسام العقود' },
      { id: 'rescissions', nameEn: 'Contract Rescissions & Settlements', nameAr: 'فسخ واسترداد العقود والإقالات', categoryEn: 'Contracts Sub-views', categoryAr: 'أقسام العقود' },
      { id: 'ledger', nameEn: 'General Ledger & Trial Balance', nameAr: 'دفتر اليومية العامة وميزان المراجعة', categoryEn: 'Ledger Sub-views', categoryAr: 'أقسام الحسابات' },
      { id: 'tax', nameEn: 'Apartment Property Taxes & Unit Fees', nameAr: 'الضرائب العقارية ورسوم الوحدات', categoryEn: 'Ledger Sub-views', categoryAr: 'أقسام الحسابات' }
    ];

    // Filter duplicates by title/id match
    const seenIds = new Set<string>();
    modules.forEach(m => {
      const key = `${m.id}-${m.nameEn}`;
      if (seenIds.has(key)) return;
      if (m.nameEn.toLowerCase().includes(q) || m.nameAr.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) {
        seenIds.add(key);
        matches.push({
          id: `mod-${m.id}-${m.categoryEn}`,
          category: isAr ? m.categoryAr : m.categoryEn,
          title: isAr ? m.nameAr : m.nameEn,
          subtitle: isAr ? 'الانتقال المباشر' : 'Navigate to screen',
          icon: BookOpen,
          action: () => {
            onSelectModule(m.id);
            onClose();
          }
        });
      }
    });

    // 2. Contracts
    contracts.forEach(c => {
      if (
        c.contract_number.toLowerCase().includes(q) ||
        c.unit_id.toLowerCase().includes(q) ||
        c.buyer_name.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `contract-${c.contract_id}`,
          category: isAr ? 'عقود البيع' : 'Contracts',
          title: `${isAr ? 'عقد' : 'Contract'} #${c.contract_number} (${c.unit_id})`,
          subtitle: `${isAr ? 'القيمة:' : 'Value:'} ${c.gross_contract_value} EGP | ${c.buyer_name}`,
          icon: FileText,
          action: () => {
            onSelectContract(c);
            onClose();
          }
        });
      }
    });

    // 3. PDC Cheques
    cheques.forEach(ch => {
      if (
        ch.cheque_number.toLowerCase().includes(q) ||
        ch.bank_name.toLowerCase().includes(q) ||
        ch.drawer_name.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `pdc-${ch.cheque_id}`,
          category: isAr ? 'أقساط وتحصيل باليد' : 'Hand Installments',
          title: `${isAr ? 'بند قسط رقم' : 'Installment Due'} #${ch.cheque_number} (${isAr ? 'نقداً باليد' : 'Cash by Hand'})`,
          subtitle: `${ch.nominal_value} EGP | ${ch.drawer_name} | ${ch.status === 'Cleared' ? (isAr ? 'تم التحصيل باليد' : 'Collected') : (isAr ? 'مستحق لاحقاً باليد' : 'Due Later')}`,
          icon: Wallet,
          action: () => {
            onSelectModule('pdc');
            onClose();
          }
        });
      }
    });

    // 4. Chart of Accounts
    Object.values(CANONICAL_COA).forEach(acc => {
      if (
        acc.account_code.includes(q) ||
        acc.account_name_en.toLowerCase().includes(q) ||
        acc.account_name_ar.includes(q)
      ) {
        matches.push({
          id: `coa-${acc.account_code}`,
          category: isAr ? 'دليل الحسابات' : 'Chart of Accounts',
          title: `[${acc.account_code}] ${isAr ? acc.account_name_ar : acc.account_name_en}`,
          subtitle: `${acc.account_type} | ${acc.normal_balance} balance`,
          icon: Landmark,
          action: () => {
            onSelectModule('ledger');
            onClose();
          }
        });
      }
    });

    return matches.slice(0, 8);
  }, [query, contracts, cheques, isAr, onSelectModule, onSelectContract, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 200
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '600px',
          maxWidth: '92vw',
          background: 'rgba(14, 18, 28, 0.98)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.9), 0 0 25px rgba(212,175,55,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          direction: isAr ? 'rtl' : 'ltr',
          textAlign: isAr ? 'right' : 'left'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={18} color="var(--zf-gold, #d4af37)" />
          <input 
            autoFocus
            type="text"
            placeholder={isAr ? 'ابحث عن عقد، كود حساب، قسط مستحق، أو قسم مالي...' : 'Search contracts, accounts, dues, or jump to module...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '1rem',
              width: '100%'
            }}
          />
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '6px',
              color: '#9ca3af',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.5rem' }}>
          {results.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--zf-text-muted, #6b7086)', fontSize: '0.85rem' }}>
              {query.trim() 
                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching records found.') 
                : (isAr ? 'اكتب كود حساب، رقم عقد، أو اسم وحدة للبحث الفوري' : 'Type an account code, contract #, or module name...')}
            </div>
          ) : (
            results.map(r => {
              const Icon = r.icon;
              return (
                <div 
                  key={r.id}
                  onClick={r.action}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: '0.25rem'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ color: 'var(--zf-gold, #d4af37)' }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
                        {r.subtitle}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)', background: 'rgba(212,175,55,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    {r.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
