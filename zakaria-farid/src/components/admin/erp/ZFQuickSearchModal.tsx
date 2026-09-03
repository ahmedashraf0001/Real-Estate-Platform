'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, BookOpen, Landmark } from 'lucide-react';
import { ERPContract, ERPPDCRecord } from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { ERPNavModule } from './ZFNavigationDock';

interface ZFQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contracts: ERPContract[];
  cheques: ERPPDCRecord[];
  onSelectModule: (mod: ERPNavModule) => void;
  onSelectContract: (contract: ERPContract) => void;
  isAr?: boolean;
}

export const ZFQuickSearchModal: React.FC<ZFQuickSearchModalProps> = ({
  isOpen,
  onClose,
  contracts,
  cheques,
  onSelectModule,
  onSelectContract,
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

    // 1. Navigation Modules
    const modules: Array<{ id: ERPNavModule; nameEn: string; nameAr: string }> = [
      { id: 'cockpit', nameEn: 'Financial Cockpit & Horizon', nameAr: 'لوحة القيادة المالية والمنحنى' },
      { id: 'ledger', nameEn: 'General Ledger & Chart of Accounts', nameAr: 'دفتر الأستاذ ودليل الحسابات' },
      { id: 'contracts', nameEn: 'Sales Contracts & Installment Pipeline', nameAr: 'سجل العقود وتتبع الأقساط' },
      { id: 'pdc', nameEn: 'PDC Cheques Vault', nameAr: 'خزينة الشيكات المؤجلة' },
      { id: 'rescissions', nameEn: 'Rescission & Forfeiture Floor', nameAr: 'فسخ العقود والحد الأدنى للرد' },
      { id: 'cost-allocation', nameEn: 'Cost Allocation & RSV Factor', nameAr: 'تخصيص التكاليف ومعامل RSV' },
      { id: 'tax', nameEn: 'Statutory Taxes & Form 41', nameAr: 'الضرائب واستقطاعات نموذج ٤١' },
    ];

    modules.forEach(m => {
      if (m.nameEn.toLowerCase().includes(q) || m.nameAr.toLowerCase().includes(q)) {
        matches.push({
          id: `mod-${m.id}`,
          category: isAr ? 'الوحدات والأقسام' : 'Modules',
          title: isAr ? m.nameAr : m.nameEn,
          subtitle: isAr ? 'الانتقال المباشر' : 'Navigate to module',
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
          category: isAr ? 'الشيكات' : 'Cheques',
          title: `${isAr ? 'شيك رقم' : 'Cheque'} #${ch.cheque_number} (${ch.bank_name})`,
          subtitle: `${ch.nominal_value} EGP | ${ch.drawer_name} | ${ch.status}`,
          icon: Landmark,
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
            placeholder={isAr ? 'ابحث عن عقد، كود حساب، شيك، أو قسم مالي...' : 'Search contracts, accounts, cheques, or jump to module...'}
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
