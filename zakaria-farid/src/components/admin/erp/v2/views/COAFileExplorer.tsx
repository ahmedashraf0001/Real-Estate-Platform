'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  Search, 
  ChevronsDownUp,
  ChevronsUpDown,
  X,
  Check,
  Layers
} from 'lucide-react';
import { ERPAccount } from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { Decimal, D } from '@/lib/erp/math';
import { getCategorySemanticIcon, getAccountSemanticIcon } from '@/lib/erp/accountSemanticIcons';
import css from './GeneralLedgerView.module.css';

export interface COACategorySelection {
  id: string;
  code: string;
  title: string;
  accountCodes: string[];
}

export interface COAFileExplorerProps {
  accounts?: ERPAccount[];
  accountStats?: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  isAr?: boolean;
  onSelectAccount?: (account: ERPAccount) => void;
  onFilterInJournal?: (accountCode: string) => void;
  onSelectCategory?: (category: COACategorySelection | null) => void;
  selectedCategoryId?: string | null;
  selectedAccountCode?: string | null;
  mode?: 'compact' | 'full';
  className?: string;
}

export type { TreeNodeCategory } from '@/lib/erp/coaHierarchy';
export { HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';
import { TreeNodeCategory, HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';

function getCategoryIcon(code: string, isSelected: boolean, size = 15) {
  return getCategorySemanticIcon(code, isSelected, size);
}

export const COAFileExplorer: React.FC<COAFileExplorerProps> = (props) => {
  const {
    isAr = true,
    onSelectCategory,
    onSelectAccount,
    selectedCategoryId,
    selectedAccountCode,
    accountStats,
    className
  } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(['cat_1', 'cat_2', 'cat_3', 'cat_4', 'cat_5'])
  );
  const [expandedSubNodes, setExpandedSubNodes] = useState<Set<string>>(
    () => new Set(['sub_11', 'sub_21'])
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const toggleSubNode = (subId: string) => {
    setExpandedSubNodes(prev => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const allSubs = new Set<string>();
    HIERARCHY_STRUCTURE.forEach(cat => {
      all.add(cat.id);
      cat.subcategories.forEach(sub => {
        all.add(sub.id);
        allSubs.add(sub.id);
      });
    });
    setExpandedNodes(all);
    setExpandedSubNodes(allSubs);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
    setExpandedSubNodes(new Set());
  };

  const query = searchQuery.trim().toLowerCase();

  const isSubcategoryMatch = (sub: TreeNodeCategory['subcategories'][0]) => {
    if (!query) return true;
    if (sub.code.includes(query) || sub.titleAr.toLowerCase().includes(query) || sub.titleEn.toLowerCase().includes(query)) {
      return true;
    }
    return sub.accountCodes.some(code => {
      const acc = CANONICAL_COA[code];
      if (!acc) return false;
      return (
        code.toLowerCase().includes(query) ||
        acc.account_name_ar.toLowerCase().includes(query) ||
        acc.account_name_en.toLowerCase().includes(query)
      );
    });
  };

  const isCategoryMatch = (cat: TreeNodeCategory) => {
    if (!query) return true;
    if (cat.code.includes(query) || cat.titleAr.toLowerCase().includes(query) || cat.titleEn.toLowerCase().includes(query)) {
      return true;
    }
    return cat.subcategories.some(isSubcategoryMatch);
  };

  return (
    <div className={`${css.treeExplorer} ${className || ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hierarchy Header */}
      <div className={css.treeTopBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div
            className={css.iconSquircle}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.18))'
            }}
          >
            <Layers size={14} />
          </div>
          <h3 className={css.treeTopTitle}>{isAr ? 'هيكل الحسابات' : 'Account Hierarchy'}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={expandAll}
            title={isAr ? 'توسيع كل الفئات' : 'Expand All'}
            className={css.treeActionBtn}
          >
            <ChevronsUpDown size={13} />
          </button>
          <button
            type="button"
            onClick={collapseAll}
            title={isAr ? 'طي كل الفئات' : 'Collapse All'}
            className={css.treeActionBtn}
          >
            <ChevronsDownUp size={13} />
          </button>
        </div>
      </div>

      {/* Search Header */}
      <div className={css.treeHeaderToolbar}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search 
            size={13} 
            color="#94a3b8" 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              [isAr ? 'right' : 'left']: '8px', 
              pointerEvents: 'none' 
            }} 
          />
          <input
            type="text"
            className={css.treeSearchInput}
            style={{ [isAr ? 'paddingRight' : 'paddingLeft']: '26px' }}
            placeholder={isAr ? 'ابحث في الدليل بالاسم أو الكود...' : 'Search categories or codes...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isAr ? 'left' : 'right']: '6px',
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={isAr ? 'مسح البحث' : 'Clear search'}
            >
              <X size={12} color="#94a3b8" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Tree Structure (Folder Nodes Only - Zero Leaf Items Inside) */}
      <div className={css.treeContainer}>
        {HIERARCHY_STRUCTURE.filter(isCategoryMatch).map(cat => {
          const isCatExpanded = expandedNodes.has(cat.id) || !!query;
          const allCatCodes = cat.subcategories.flatMap(s => s.accountCodes);
          const isCatSelected = selectedCategoryId === cat.id;

          return (
            <div key={cat.id} className={css.treeFolderNode}>
              {/* Category Level (e.g. [1] الأصول) */}
              <div
                className={`${css.treeFolderHeader} ${isCatSelected ? css.treeFolderHeaderActive : ''}`}
                onClick={() => {
                  if (isCatSelected) {
                    onSelectCategory?.(null);
                  } else {
                    onSelectCategory?.({
                      id: cat.id,
                      code: cat.code,
                      title: isAr ? cat.titleAr : cat.titleEn,
                      accountCodes: allCatCodes
                    });
                  }
                }}
                title={isAr 
                  ? (isCatSelected ? 'اضغط لإلغاء التصفية' : `اضغط لتصفية الجدول لعرض حسابات وقيود [${cat.titleAr}]`)
                  : (isCatSelected ? 'Click to deselect' : `Click to filter middle table by [${cat.titleEn}]`)}
              >
                <div className={css.treeFolderLeading}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(cat.id);
                    }}
                    className={css.treeChevronBtn}
                    title={isCatExpanded ? (isAr ? 'طي' : 'Collapse') : (isAr ? 'توسيع' : 'Expand')}
                  >
                    {isCatExpanded ? (
                      <ChevronDown size={13} color="#64748b" />
                    ) : (
                      <ChevronLeft size={13} color="#64748b" />
                    )}
                  </button>

                  <span
                    className={css.treeIconWrap}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isCatSelected ? 'var(--erp-accent, #2563eb)' : 'var(--erp-accent-subtle, #eff6ff)',
                      color: isCatSelected ? '#ffffff' : 'var(--erp-accent, #2563eb)',
                      border: `1px solid ${isCatSelected ? 'transparent' : 'var(--erp-accent-tint, rgba(37, 99, 235, 0.18))'}`,
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    {getCategoryIcon(cat.code, isCatSelected, 14)}
                  </span>

                  <span className={css.treeFolderCode}>{cat.code}</span>

                  <span className={css.treeFolderTitle}>
                    {isAr ? cat.titleAr : cat.titleEn}
                  </span>
                </div>

                <div className={css.treeFolderTrailing}>
                  {isCatSelected ? (
                    <span className={css.treeSelectedPill}>
                      <Check size={11} strokeWidth={2.5} />
                      <span>{isAr ? 'نشط' : 'Active'}</span>
                    </span>
                  ) : (
                    <span className={css.treeCountPill} title={isAr ? `${allCatCodes.length} حساب` : `${allCatCodes.length} accounts`}>
                      {allCatCodes.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Subcategories with Expandable Accounts */}
              {isCatExpanded && (
                <div className={css.treeSubcategoriesWrap}>
                  {cat.subcategories.filter(isSubcategoryMatch).map(sub => {
                    const isSubSelected = selectedCategoryId === sub.id;
                    const isSubExpanded = expandedSubNodes.has(sub.id) || Boolean(query);

                    return (
                      <div key={sub.id} className={css.treeSubcategoryNode}>
                        <div
                          className={`${css.treeSubcategoryHeader} ${isSubSelected ? css.treeSubcategoryHeaderActive : ''}`}
                          onClick={() => {
                            if (isSubSelected) {
                              onSelectCategory?.(null);
                            } else {
                              onSelectCategory?.({
                                id: sub.id,
                                code: sub.code,
                                title: isAr ? sub.titleAr : sub.titleEn,
                                accountCodes: sub.accountCodes
                              });
                            }
                          }}
                          title={isAr 
                            ? (isSubSelected ? 'اضغط لإلغاء التصفية' : `اضغط لتصفية الجدول لعرض حسابات [${sub.titleAr}]`)
                            : (isSubSelected ? 'Click to deselect' : `Click to filter middle table by [${sub.titleEn}]`)}
                        >
                          <div className={css.treeFolderLeading}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubNode(sub.id);
                              }}
                              className={css.treeChevronBtn}
                              title={isSubExpanded ? (isAr ? 'طي الحسابات' : 'Collapse Accounts') : (isAr ? 'عرض الحسابات' : 'Expand Accounts')}
                            >
                              {isSubExpanded ? (
                                <ChevronDown size={11} color="#64748b" />
                              ) : (
                                <ChevronLeft size={11} color="#64748b" />
                              )}
                            </button>

                            <span
                              className={css.treeIconWrap}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isSubSelected ? 'var(--erp-accent, #2563eb)' : 'var(--erp-accent-subtle, #eff6ff)',
                                color: isSubSelected ? '#ffffff' : 'var(--erp-accent, #2563eb)',
                                border: `1px solid ${isSubSelected ? 'transparent' : 'var(--erp-accent-tint, rgba(37, 99, 235, 0.18))'}`,
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                              }}
                            >
                              {getCategoryIcon(sub.code, isSubSelected, 12)}
                            </span>

                            <span className={css.treeFolderCodeSmall}>{sub.code}</span>

                            <span className={css.treeSubcategoryTitle}>
                              {isAr ? sub.titleAr : sub.titleEn}
                            </span>
                          </div>

                          <div className={css.treeFolderTrailing}>
                            {isSubSelected ? (
                              <span className={css.treeSelectedPill}>
                                <Check size={10} strokeWidth={2.5} />
                                <span>{isAr ? 'نشط' : 'Active'}</span>
                              </span>
                            ) : (
                              <span className={css.treeCountPillSmall}>
                                {sub.accountCodes.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Child Accounts Under Subcategory */}
                        {isSubExpanded && (
                          <div className={css.treeAccountsWrap}>
                            {sub.accountCodes.map(accCode => {
                              const acc = CANONICAL_COA[accCode];
                              if (!acc) return null;
                              if (query && !acc.account_code.includes(query) && !acc.account_name_ar.toLowerCase().includes(query) && !acc.account_name_en.toLowerCase().includes(query)) {
                                return null;
                              }
                              const isAccSelected = selectedAccountCode === acc.account_code;
                              const stats = accountStats?.[acc.account_code];
                              const net = acc.normal_balance === 'DEBIT'
                                ? (stats ? stats.debits.minus(stats.credits) : D(0))
                                : (stats ? stats.credits.minus(stats.debits) : D(0));

                              return (
                                <div
                                  key={acc.account_code}
                                  className={`${css.treeAccountItem} ${isAccSelected ? css.treeAccountItemActive : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isAccSelected) {
                                      onSelectCategory?.(null);
                                    } else {
                                      onSelectAccount?.(acc);
                                    }
                                  }}
                                  title={isAr
                                    ? (isAccSelected ? 'اضغط لإلغاء التحديد' : `اضغط لتصفية الجدول بالكامل على حساب [${acc.account_code} - ${acc.account_name_ar}]`)
                                    : (isAccSelected ? 'Click to deselect' : `Click to filter table by [${acc.account_code} - ${acc.account_name_en}]`)}
                                >
                                  <div className={css.treeFolderLeading} style={{ minWidth: 0, gap: '0.4rem' }}>
                                    <span
                                      className={css.treeIconWrap}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '5px',
                                        background: isAccSelected ? 'var(--erp-accent, #2563eb)' : 'var(--erp-accent-subtle, #eff6ff)',
                                        color: isAccSelected ? '#ffffff' : 'var(--erp-accent, #2563eb)',
                                        border: `1px solid ${isAccSelected ? 'transparent' : 'var(--erp-accent-tint, rgba(37, 99, 235, 0.18))'}`,
                                        transition: 'all 0.15s ease',
                                        flexShrink: 0
                                      }}
                                    >
                                      {getAccountSemanticIcon(acc, { size: 12 })}
                                    </span>
                                    <span
                                      className={css.treeAccountTitle}
                                      title={`${acc.account_code} - ${isAr ? acc.account_name_ar : acc.account_name_en}`}
                                    >
                                      {isAr ? acc.account_name_ar : acc.account_name_en}
                                    </span>
                                  </div>
                                  <div className={css.treeFolderTrailing}>
                                    {isAccSelected ? (
                                      <span className={css.treeSelectedPill} style={{ padding: '0.12rem 0.35rem', fontSize: '0.62rem' }}>
                                        <Check size={9} strokeWidth={2.5} />
                                        <span>{isAr ? 'نشط' : 'Active'}</span>
                                      </span>
                                    ) : (
                                      <span className={css.treeAccountBalance}>
                                        {net.formatEGP(isAr)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default COAFileExplorer;
