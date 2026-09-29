'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Building2, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldCheck, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { ERPCostAllocation, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { RSVEngine } from '@/lib/erp/rsv';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFDrawerShell } from '../../common/ZFDrawerShell';
import styles from '../../ZFWorkstationShell.module.css';

interface CostAllocationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: ERPCostAllocation | null;
  contracts?: ERPContract[];
  property?: Property;
  isAr?: boolean;
}

export const CostAllocationDetailDrawer: React.FC<CostAllocationDetailDrawerProps> = ({
  isOpen,
  onClose,
  allocation,
  contracts = [],
  property,
  isAr = true
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [customValueByAlloc, setCustomValueByAlloc] = useState<{ id: string; val: string } | null>(null);

  const defaultSimulatedValue = useMemo(() => {
    if (contracts.length > 0 && contracts[0]?.gross_contract_value) {
      return contracts[0].gross_contract_value;
    }
    return '5000000';
  }, [contracts]);

  const simulatedUnitValue = (customValueByAlloc && customValueByAlloc.id === allocation?.allocation_id)
    ? customValueByAlloc.val
    : defaultSimulatedValue;

  const unitBreakdown = useMemo(() => {
    if (!allocation) return [];
    return RSVEngine.calculateProjectUnitsBreakdown(allocation, contracts, property);
  }, [allocation, contracts, property]);

  const journalImpact = useMemo(() => {
    if (!allocation) return null;
    const val = D(simulatedUnitValue || '0');
    const safeVal = val.isNegative() ? D(0) : val;
    return RSVEngine.generateCOGSJournalEntryImpact({
      projectName: allocation.project_name,
      unitIdentifier: isAr ? 'وحدة نموذجية بالمشروع' : 'Sample Project Unit',
      unitContractValue: safeVal,
      rsvFactor: allocation.rsv_factor || '0'
    });
  }, [allocation, simulatedUnitValue, isAr]);

  if (!allocation) return null;

  const rsvFactor = D(allocation.rsv_factor || '0');
  const rsvPct = rsvFactor.times(100).toFixed(2);
  const grossMarginPct = D(1).minus(rsvFactor).times(100).toFixed(2);

  // Simulation calculations
  const simVal = D(simulatedUnitValue || '0');
  const safeSimVal = simVal.isNegative() ? D(0) : simVal;
  const simCOGS = RSVEngine.computeUnitCOGS(safeSimVal, rsvFactor);
  const simProfit = safeSimVal.minus(simCOGS);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(allocation.allocation_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <ZFDrawerShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="680px"
      customHeader={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #cbd5e1',
          background: '#ffffff',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.15))',
              flexShrink: 0
            }}>
              <Calculator size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {allocation.project_name}
                </h3>
                <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                  <ShieldCheck size={11} />
                  <span>{isAr ? 'معتمد IFRS 15' : 'IFRS 15 Certified'}</span>
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'فاحص توزيع تكاليف المباني ومعامل الاستنزال' : 'WIP Cost Allocation & Relief Inspector'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            title={isAr ? 'نسخ كود التوزيع' : 'Copy Allocation ID'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.72rem',
              color: '#64748b',
              cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {copiedId ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
            <span dir="ltr">#{allocation.allocation_id.slice(0, 8)}</span>
          </button>
        </div>
      }
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem',
        boxSizing: 'border-box',
        width: '100%',
        minWidth: 0,
        background: '#ffffff'
      }}>
        {/* 1. EXECUTIVE RSV FACTOR & MARGIN SPLIT */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'المعامل المالي وهامش الربحية المعتمد للمشروع' : 'Executive RSV Factor & Margin Split'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isAr ? 'تاريخ الحساب: ' : 'Calculated: '}
              {new Date(allocation.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.85rem'
          }}>
            {/* Building Cost Ratio */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                {isAr ? 'نسبة تكلفة المباني (معامل RSV):' : 'Building Cost Ratio (RSV):'}
              </span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                {rsvPct}%
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--erp-accent, #2563eb)', display: 'inline-block' }} />
                {isAr ? 'من ثمن الشقة مباني وخامات' : 'construction cost proportion'}
              </span>
            </div>

            {/* Profit Margin */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                {isAr ? 'صافي هامش الربح المقدر للمكتب:' : 'Expected Gross Profit Margin:'}
              </span>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                {grossMarginPct}%
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
                {isAr ? 'مكسب صافي للمكتب' : 'net profit margin'}
              </span>
            </div>
          </div>

          {/* Proportional Split Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--erp-accent, #2563eb)', fontWeight: 700 }}>
                {isAr ? `تكلفة المباني: ${rsvPct}%` : `Cost Ratio: ${rsvPct}%`}
              </span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                {isAr ? `هامش الربح: ${grossMarginPct}%` : `Gross Margin: ${grossMarginPct}%`}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              background: '#f1f5f9',
              overflow: 'hidden',
              display: 'flex'
            }}>
              {rsvFactor.gte(1) ? (
                <div style={{
                  width: '100%',
                  background: '#dc2626',
                  height: '100%'
                }} />
              ) : (
                <>
                  <div style={{
                    width: `${Math.max(0, Math.min(parseFloat(rsvPct) || 0, 100))}%`,
                    background: 'var(--erp-accent, #2563eb)',
                    height: '100%'
                  }} />
                  <div style={{
                    width: `${Math.max(0, Math.min(parseFloat(grossMarginPct) || 0, 100))}%`,
                    background: '#16a34a',
                    height: '100%'
                  }} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. COST POOL & SALES CEILING BREAKDOWN */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Building2 size={15} color="var(--erp-accent, #2563eb)" />
            <span>{isAr ? 'أصول التكاليف المحملة وسقف المبيعات الكلي' : 'Capitalized WIP Pool & Sales Ceiling'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.85rem', fontSize: '0.78rem' }}>
            <div style={{ background: '#fafbfc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', fontWeight: 600 }}>
                {isAr ? 'المصروف الفعلي على المباني (حـ/ 150000):' : 'Incurred WIP (Account 150000):'}
              </span>
              <strong style={{ color: '#0f172a', fontSize: '1.05rem', marginTop: '0.25rem', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                <MoneyCell amount={allocation.total_incurred_wip} isAr={isAr} />
              </strong>
              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                {isAr ? 'خامات ومقاولات ومصاريف إنشائية متكبدة' : 'Direct civil & MEP capitalized costs'}
              </span>
            </div>

            <div style={{ background: '#fafbfc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', fontWeight: 600 }}>
                {isAr ? 'إجمالي سقف مبيعات المشروع المتوقع:' : 'Gross Project Sales Ceiling:'}
              </span>
              <strong style={{ color: '#0f172a', fontSize: '1.05rem', marginTop: '0.25rem', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                <MoneyCell amount={allocation.total_sales_value} isAr={isAr} />
              </strong>
              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                {isAr ? 'إجمالي القيمة البيعية لكل وحدات المشروع' : 'Total target sales denominator'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. UNIT-BY-UNIT ALLOCATED COST TABLE */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafbfc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Layers size={14} color="var(--erp-accent, #2563eb)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'توزيع التكلفة والأرباح على مستوى كل شقة' : 'Unit-by-Unit Cost & Margin Breakdown'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
              {isAr ? `${unitBreakdown.length} وحدة مسجلة` : `${unitBreakdown.length} units`}
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className={styles.canonicalTable} style={{ margin: 0, width: '100%' }}>
              <thead className={styles.canonicalThead}>
                <tr>
                  <th className={styles.canonicalTh}>{isAr ? 'الوحدة / العميل' : 'Unit / Buyer'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'القيمة البيعية' : 'Sales Value'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'التكلفة المستنزلة (COGS)' : 'Allocated COGS'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'صافي الربح' : 'Gross Margin'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'حالة التسليم' : 'Handover Status'}</th>
                </tr>
              </thead>
              <tbody>
                {unitBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.75rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {isAr ? 'لا توجد وحدات أو عقود مسجلة لهذا المشروع بعد' : 'No units or contracts registered for this project yet'}
                    </td>
                  </tr>
                ) : (
                  unitBreakdown.map((u, idx) => (
                    <tr key={u.unit_id || idx} className={styles.canonicalRow}>
                      <td className={styles.canonicalTd} style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                        {u.unit_title}
                      </td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>
                        <MoneyCell amount={u.unit_sales_value} isAr={isAr} />
                      </td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--erp-accent, #2563eb)', fontSize: '0.82rem' }}>
                        <MoneyCell amount={u.allocated_cost} isAr={isAr} />
                      </td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#16a34a', fontSize: '0.82rem' }}>
                        <MoneyCell amount={u.gross_margin} isAr={isAr} />
                      </td>
                      <td className={styles.canonicalTd}>
                        {u.handover_status === 'Delivered' ? (
                          <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                            <CheckCircle2 size={11} />
                            <span>{isAr ? 'تم التسليم والترحيل' : 'Delivered & Relieved'}</span>
                          </span>
                        ) : (
                          <span className={`${styles.statusPill} ${styles.statusPillAmber}`}>
                            <Clock size={11} />
                            <span>{isAr ? 'قيد الإنشاء / لم تسلم' : 'Pending Handover'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. INTERACTIVE HANDOVER COGS SIMULATOR */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#15803d', fontWeight: 800, fontSize: '0.78rem' }}>
              <Calculator size={15} />
              <span>{isAr ? 'محاكي تسليم الشقق وحساب الأرباح الفورية' : 'Unit Handover Relief Simulator'}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {isAr ? 'احسب تكلفتك وصافي مكسبك لأي شقة' : 'Interactive simulation'}
            </span>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              {isAr ? 'افترض قيمة تعاقدية لشقة يتم تسليمها للعميل (بالجنيه):' : 'Simulate unit contract value delivered to buyer (EGP):'}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step="100000"
                value={simulatedUnitValue}
                onChange={(e) => setCustomValueByAlloc({ id: allocation.allocation_id, val: e.target.value })}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  flex: 1,
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {[
                  { val: '3000000', labelAr: '٣ مليون', labelEn: '3M' },
                  { val: '5000000', labelAr: '٥ مليون', labelEn: '5M' },
                  { val: '8000000', labelAr: '٨ مليون', labelEn: '8M' },
                  { val: '12000000', labelAr: '١٢ مليون', labelEn: '12M' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCustomValueByAlloc({ id: allocation.allocation_id, val: item.val })}
                    style={{
                      background: simulatedUnitValue === item.val ? 'var(--erp-accent, #2563eb)' : '#ffffff',
                      border: `1.5px solid ${simulatedUnitValue === item.val ? 'var(--erp-accent, #2563eb)' : '#cbd5e1'}`,
                      color: simulatedUnitValue === item.val ? '#ffffff' : '#475569',
                      borderRadius: '8px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isAr ? item.labelAr : item.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Simulator Results */}
          <div style={{
            background: '#fafbfc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 800 }}>
                {isAr ? 'تكلفة مباني الشقة المستنزلة من WIP:' : 'Relieved Construction Cost (COGS):'}
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
                <MoneyCell amount={simCOGS.toFixed(2)} isAr={isAr} />
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? `تتخصم من حساب المباني بنسبة ${rsvPct}%` : `Relieved from WIP ratio: ${rsvPct}%`}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#15803d', display: 'block', fontWeight: 800 }}>
                {isAr ? 'صافي مكسب المكتب المحقق:' : 'Recognized Gross Profit:'}
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
                <MoneyCell amount={simProfit.toFixed(2)} isAr={isAr} />
              </div>
              <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>
                {isAr ? `ينزل فوراً كربح محقق بالدفاتر بنسبة ${grossMarginPct}%` : `Gross Margin ratio: ${grossMarginPct}%`}
              </span>
            </div>
          </div>
        </div>

        {/* 5. BALANCED IFRS 15 COGS JOURNAL ENTRY IMPACT */}
        {journalImpact && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BookOpen size={15} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'الأثر المحاسبي والقيد المولد آلياً عند التسليم الفعلي' : 'IFRS 15 Handover Journal Entry Impact'}</span>
              </div>
              <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                <CheckCircle2 size={11} />
                <span>{isAr ? 'قيد متوازن (مدين = دائن)' : 'Balanced Entry'}</span>
              </span>
            </div>

            <div style={{
              background: '#fafbfc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              fontSize: '0.76rem',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {journalImpact.lines.map((line, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.35rem 0',
                  borderBottom: idx < journalImpact.lines.length - 1 ? '1px dashed #e2e8f0' : 'none'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {isAr ? line.account_name_ar : line.account_name_en}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {line.memo}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', textAlign: 'right', flexShrink: 0 }}>
                    {line.debit_amount !== '0.00' && (
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'مدين: ' : 'Dr: '}</span>
                        {line.debit_amount} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                    {line.credit_amount !== '0.00' && (
                      <span style={{ color: '#64748b', fontWeight: 700 }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'دائن: ' : 'Cr: '}</span>
                        {line.credit_amount} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                    {line.debit_amount === '0.00' && line.credit_amount === '0.00' && (
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                        0.00 {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. IFRS 15 COMPLIANCE NOTE */}
        <div style={{
          background: '#fafbfc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '0.85rem 1rem',
          fontSize: '0.74rem',
          color: '#64748b',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.55rem'
        }}>
          <FileText size={15} color="var(--erp-accent, #2563eb)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {isAr 
              ? 'وفقاً لمعيار المحاسبة الدولي IFRS 15، لا تُعد تكاليف البناء مصروفاً في قائمة الدخل حتى تاريخ التسليم الفعلي للوحدة، حيث يتم استنزال التكلفة من حساب مشروعات تحت التنفيذ (150000) إلى تكلفة المبيعات (501000) مع إثبات الإيراد المحقق (401000).'
              : 'Under IFRS 15, capitalized WIP costs remain on the balance sheet (Account 150000) until physical unit handover, at which point the RSV factor determines the proportional cost transferred to Cost of Sales (Account 501000).'}
          </span>
        </div>
      </div>

      {/* DRAWER FOOTER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '0.85rem 1.25rem',
        borderTop: '1px solid #cbd5e1',
        background: '#ffffff',
        boxSizing: 'border-box'
      }}>
        <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
          {isAr ? 'حسابات موثقة ومعتمدة بدفتر اليومية للشركة' : 'Audited and locked in company ledger'}
        </span>
        <button
          type="button"
          className={styles.actionBtnSecondary}
          onClick={onClose}
          style={{ fontSize: '0.78rem', padding: '0.5rem 1rem' }}
        >
          <span>{isAr ? 'إغلاق الفاحص' : 'Close'}</span>
        </button>
      </div>
    </ZFDrawerShell>
  );
};
