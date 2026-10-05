'use client';

import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Coins, 
  Search, 
  ArrowUpDown, 
  Filter, 
  FileText, 
  CreditCard, 
  Building2, 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight,
  ArrowRightLeft,
  CheckCircle2,
  Calendar,
  Plus
} from 'lucide-react';
import { ERPPartnerTransaction, ERPPartnerProfile } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { ZFPagination } from '../../ZFPagination';
import styles from '../../ZFWorkstationShell.module.css';

export interface PartnersTransactionsViewProps {
  transactions: ERPPartnerTransaction[];
  partnerProfiles?: ERPPartnerProfile[];
  properties?: Property[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenInjection?: () => void;
  onOpenPayout?: () => void;
}

export const PartnersTransactionsView: React.FC<PartnersTransactionsViewProps> = ({
  transactions = [],
  partnerProfiles = [],
  properties = [],
  isAr = true,
  isMutating = false,
  onOpenInjection,
  onOpenPayout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Unified transactions list including ownership reallocations from properties
  const unifiedTransactions = useMemo(() => {
    const list: Array<ERPPartnerTransaction & { isReallocation?: boolean; transferredSharePct?: number }> = [];

    // 1. Standard capital injections and distributions
    transactions.forEach(t => list.push(t));

    // 2. Ownership reallocations & partner substitutions from properties
    properties.forEach(prop => {
      if (prop.ownership_history && prop.ownership_history.length > 0) {
        prop.ownership_history.forEach(log => {
          list.push({
            id: log.log_id,
            transaction_number: `LOG-${log.log_id.slice(-6).toUpperCase()}`,
            partner_name: `${log.from_partner_name} ➔ ${log.to_partner_name}`,
            type: 'REALLOCATION' as any,
            amount: log.transfer_value_egp || '0.00',
            property_id: prop.id,
            property_title: prop.title_ar || prop.title_en || 'مشروع عقاري',
            payment_method: (log.transferred_arrears_flag ? 'CASH_101000' : 'INSTAPAY_102000') as any,
            journal_entry_number: 'EQ-REALLOC',
            date: log.effective_date || log.created_at?.slice(0, 10) || '',
            status: 'COMPLETED',
            memo: `${
              log.action_type === 'FULL_INTERNAL_BUYOUT' ? (isAr ? 'تخارج كامل وشراء داخلي' : 'Full Internal Buyout') :
              log.action_type === 'PARTIAL_SALE' ? (isAr ? 'تنازل جزئي عن حصة' : 'Partial Sale') :
              (isAr ? 'إحلال شريك متخارج' : 'Partner Substitution')
            } — نقل حصة ${log.transferred_share_pct}% ${log.notes ? `(${log.notes})` : ''}`,
            isReallocation: true,
            transferredSharePct: log.transferred_share_pct
          });
        });
      }
    });

    return list;
  }, [transactions, properties, isAr]);

  // Unique partners from transactions
  const partnerNames = useMemo(() => {
    const set = new Set<string>();
    unifiedTransactions.forEach(t => {
      if (t.partner_name) {
        if (t.partner_name.includes('➔')) {
          const parts = t.partner_name.split('➔').map(p => p.trim());
          parts.forEach(p => set.add(p));
        } else {
          set.add(t.partner_name);
        }
      }
    });
    return Array.from(set);
  }, [unifiedTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = [...unifiedTransactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.transaction_number && t.transaction_number.toLowerCase().includes(q)) ||
        (t.partner_name && t.partner_name.toLowerCase().includes(q)) ||
        (t.property_title && t.property_title.toLowerCase().includes(q)) ||
        (t.journal_entry_number && t.journal_entry_number.toLowerCase().includes(q)) ||
        (t.memo && t.memo.toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'all') {
      list = list.filter(t => t.type === typeFilter);
    }

    if (methodFilter !== 'all') {
      list = list.filter(t => {
        if (methodFilter === 'INSTAPAY_102000') {
          return String(t.payment_method || '').includes('INSTAPAY');
        }
        if (methodFilter === 'CASH_101000') {
          return String(t.payment_method || '').includes('CASH');
        }
        if (methodFilter === 'BANK_102000') {
          return String(t.payment_method || '').includes('BANK');
        }
        return t.payment_method === methodFilter;
      });
    }

    if (partnerFilter !== 'all') {
      list = list.filter(t => t.partner_name.includes(partnerFilter));
    }

    if (dateFilter !== 'all') {
      list = list.filter(t => (t.date || '').startsWith(dateFilter));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date || '').getTime() - new Date(a.date || '').getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
      }
      if (sortBy === 'amount_desc') {
        return D(b.amount || 0).minus(D(a.amount || 0)).toNumber();
      }
      if (sortBy === 'amount_asc') {
        return D(a.amount || 0).minus(D(b.amount || 0)).toNumber();
      }
      return 0;
    });

    return list;
  }, [unifiedTransactions, searchQuery, typeFilter, methodFilter, partnerFilter, dateFilter, sortBy]);

  // Paginated slice
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;

  // Injections & Distributions Totals
  const { totalInjections, totalDistributions } = useMemo(() => {
    let inj = D(0);
    let dist = D(0);
    transactions.forEach(t => {
      if (t.type === 'CAPITAL_INJECTION') inj = inj.plus(t.amount || 0);
      else if (t.type === 'PROFIT_DISTRIBUTION') dist = dist.plus(t.amount || 0);
    });
    return { totalInjections: inj.toFixed(2), totalDistributions: dist.toFixed(2) };
  }, [transactions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. FILTER & SEARCH TOOLBAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '0.75rem 1rem'
      }}>
        {/* Type Filter Tabs */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: isAr ? 'كافة القيود والتنازلات' : 'All Records' },
            { id: 'CAPITAL_INJECTION', label: isAr ? 'مساهمات رأس المال' : 'Injections' },
            { id: 'PROFIT_DISTRIBUTION', label: isAr ? 'توزيعات الأرباح' : 'Distributions' },
            { id: 'REALLOCATION', label: isAr ? 'إعادة هيكلة الحصص' : 'Reallocations' },
          ].map(tab => {
            const isActive = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTypeFilter(tab.id);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters & Actions Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? 'بحث برقم السند أو القيد...' : 'Search transactions...'}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
            <Search 
              size={14} 
              color="#64748b" 
              style={{ 
                position: 'absolute', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                left: isAr ? '0.65rem' : 'auto', 
                right: isAr ? 'auto' : '0.65rem' 
              }} 
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={e => {
              setMethodFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isAr ? 'طريقة السداد: الكل' : 'All Methods'}</option>
            <option value="INSTAPAY_102000">{isAr ? 'تحويل إنستاباي (الخزينة 101000)' : 'InstaPay (Treasury 101000)'}</option>
            <option value="CASH_101000">{isAr ? 'كاش باليد (الخزينة 101000)' : 'Cash Vault (101000)'}</option>
            <option value="BANK_102000">{isAr ? 'تحويل بنكي تجاري (102000)' : 'Bank Account (102000)'}</option>
          </select>

          {/* Partner Filter */}
          <select
            value={partnerFilter}
            onChange={e => {
              setPartnerFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isAr ? 'كافة الشركاء' : 'All Partners'}</option>
            {partnerNames.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Date Period Filter */}
          <select
            value={dateFilter}
            onChange={e => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="all">{isAr ? 'كافة الفترات' : 'All Periods'}</option>
            <option value="2026-02">{isAr ? 'فبراير 2026' : 'Feb 2026'}</option>
            <option value="2026-01">{isAr ? 'يناير 2026' : 'Jan 2026'}</option>
            <option value="2025">{isAr ? 'سنة 2025' : 'Year 2025'}</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="date_desc">{isAr ? 'الأحدث تاريخاً' : 'Latest'}</option>
            <option value="date_asc">{isAr ? 'الأقدم تاريخاً' : 'Oldest'}</option>
            <option value="amount_desc">{isAr ? 'الأعلى قيمة' : 'Highest Amount'}</option>
            <option value="amount_asc">{isAr ? 'الأقل قيمة' : 'Lowest Amount'}</option>
          </select>
        </div>
      </div>

      {/* 2. TRANSACTIONS REGISTER TABLE */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflowX: 'auto'
      }}>
        <table style={{
          width: '100%',
          minWidth: '1000px',
          borderCollapse: 'collapse',
          fontSize: '0.78rem',
          textAlign: isAr ? 'right' : 'left'
        }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isAr ? 'رقم الإشعار / التاريخ' : 'Reference / Date'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700 }}>{isAr ? 'الشريك / المستفيد' : 'Partner'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700 }}>{isAr ? 'المشروع العقاري' : 'Project'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'نوع الحركة' : 'Type'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700 }}>{isAr ? 'المبلغ (ج.م)' : 'Amount (EGP)'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700 }}>{isAr ? 'قيد اليومية' : 'Journal Entry'}</th>
              <th style={{ padding: '0.75rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isAr ? 'البيان والملاحظات' : 'Memo'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  {isAr ? 'لا توجد حركات مسجلة مطابقة لمعايير البحث' : 'No transactions found'}
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx, idx) => {
                const isReallocation = (tx as any).isReallocation || (tx as any).type === 'REALLOCATION';
                const isInjection = tx.type === 'CAPITAL_INJECTION';

                return (
                  <tr
                    key={tx.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 1 ? '#fafbfc' : '#ffffff'
                    }}
                  >
                    {/* Ref & Date */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.8rem' }}>
                        {tx.transaction_number}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {tx.date}
                      </span>
                    </td>

                    {/* Partner Name */}
                    <td style={{ padding: '0.75rem 0.75rem' }}>
                      <strong style={{ color: '#0f172a' }}>{tx.partner_name}</strong>
                    </td>

                    {/* Project */}
                    <td style={{ padding: '0.75rem 0.75rem', color: '#334155' }}>
                      {tx.property_title || (isAr ? 'عام على الحساب' : 'General')}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                      {isReallocation ? (
                        <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ArrowRightLeft size={11} />
                          <span>{isAr ? 'إعادة هيكلة' : 'Reallocation'}</span>
                        </span>
                      ) : (
                        <span className={`${styles.statusPill} ${isInjection ? styles.statusPillGreen : styles.statusPillBlue}`}>
                          {isInjection ? (isAr ? 'ضخ رأس مال' : 'Injection') : (isAr ? 'صرف أرباح' : 'Distribution')}
                        </span>
                      )}
                    </td>

                    {/* Payment Method */}
                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {isReallocation ? (isAr ? 'تنازل ملكية' : 'Equity Transfer') :
                         tx.payment_method.includes('INSTAPAY') ? (isAr ? 'إنستاباي (102000)' : 'InstaPay (102000)') :
                         tx.payment_method.includes('CASH') ? (isAr ? 'كاش (خزينة 101000)' : 'Cash (101000)') : (isAr ? 'بنكي 102000' : 'Bank 102000')}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{
                      padding: '0.75rem 0.75rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {isReallocation ? (
                        D(tx.amount).isZero() ? (isAr ? 'تسوية ودية' : 'Equity Transfer') : D(tx.amount).formatEGP(isAr)
                      ) : (
                        `${isInjection ? '+' : '-'}${D(tx.amount).formatEGP(isAr)}`
                      )}
                    </td>

                    {/* Journal Entry Ref */}
                    <td style={{ padding: '0.75rem 0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#334155',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {tx.journal_entry_number || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                      <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                        {isAr ? 'معتمد' : 'Posted'}
                      </span>
                    </td>

                    {/* Memo */}
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.74rem', maxWidth: '240px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.memo}>
                        {tx.memo || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filteredTransactions.length > pageSize && (
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0' }}>
            <ZFPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTransactions.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              isAr={isAr}
            />
          </div>
        )}
      </div>

    </div>
  );
};
