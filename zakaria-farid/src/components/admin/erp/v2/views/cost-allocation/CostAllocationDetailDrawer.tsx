'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Copy, 
  Check 
} from 'lucide-react';
import { ERPCostAllocation, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { RSVEngine } from '@/lib/erp/rsv';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { ZFDrawerShell } from '../../common/ZFDrawerShell';
import {
  ZFField,
  ZFMoneyInput,
  ZFFacts,
  ZFEffect,
  ZFJournalPeek,
  ZFJournalLine,
  ZFFormFooter,
  zfForm
} from '../../common/ZFForm';
import shellStyles from '../../ZFWorkstationShell.module.css';
import styles from '../../ZFWorkstationShell.module.css';
import drawerStyles from './CostAllocationDetailDrawer.module.css';

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

  const journalPeekLines: ZFJournalLine[] = journalImpact ? journalImpact.lines.map(line => {
    const coa = CANONICAL_COA[line.account_code];
    const name = coa 
      ? (isAr ? coa.account_name_ar : coa.account_name_en) 
      : (isAr ? line.account_name_ar : line.account_name_en);
    const dr = D(line.debit_amount);
    const cr = D(line.credit_amount);
    return {
      code: line.account_code,
      name,
      debit: dr.gt(0) ? line.debit_amount : undefined,
      credit: cr.gt(0) ? line.credit_amount : undefined
    };
  }) : [];

  const footer = (
    <ZFFormFooter>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={onClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  );

  const headerExtra = (
    <button
      type="button"
      className={shellStyles.btnGhost}
      onClick={handleCopyId}
      title={isAr ? 'نسخ كود التوزيع' : 'Copy allocation ID'}
    >
      {copiedId ? <Check size={12} /> : <Copy size={12} />}
      <span dir="ltr">#{allocation.allocation_id.slice(0, 8)}</span>
    </button>
  );

  return (
    <ZFDrawerShell
      isOpen={isOpen}
      onClose={onClose}
      isAr={isAr}
      maxWidth="680px"
      icon={<Calculator size={18} />}
      title={allocation.project_name}
      subtitle={
        isAr
          ? 'فاحص توزيع تكاليف المباني ومعامل الاستنزال.'
          : 'WIP cost allocation and relief inspector.'
      }
      headerExtra={headerExtra}
      footer={footer}
    >
      <div className={zfForm.form}>
        {/* 1. Executive Factor & Margin */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? 'معامل التكلفة وهامش الربح' : 'Cost Factor & Margin'}
          </h4>
          <ZFFacts
            items={[
              {
                label: isAr ? 'نسبة تكلفة المباني' : 'Building cost ratio',
                value: `${rsvPct}%`
              },
              {
                label: isAr ? 'صافي هامش الربح' : 'Gross margin',
                value: `${grossMarginPct}%`,
                tone: 'pos'
              },
              {
                label: isAr ? 'تاريخ الحساب' : 'Calculated at',
                value: new Date(allocation.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
              }
            ]}
          />

          <div className={drawerStyles.progressTrack}>
            {rsvFactor.gte(1) ? (
              <div className={drawerStyles.progressFillDanger} />
            ) : (
              <>
                <div
                  className={drawerStyles.progressFillAccent}
                  style={{ width: `${Math.max(0, Math.min(parseFloat(rsvPct) || 0, 100))}%` }}
                />
                <div
                  className={drawerStyles.progressFillSuccess}
                  style={{ width: `${Math.max(0, Math.min(parseFloat(grossMarginPct) || 0, 100))}%` }}
                />
              </>
            )}
          </div>
        </div>

        {/* 2. Capitalized WIP Pool & Sales Ceiling */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? 'أصول التكاليف وسقف المبيعات' : 'Cost Pool & Sales Ceiling'}
          </h4>
          <ZFFacts
            items={[
              {
                label: isAr ? 'المصروف الفعلي على المباني' : 'Incurred construction WIP',
                value: Number(allocation.total_incurred_wip).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
              },
              {
                label: isAr ? 'سقف مبيعات المشروع المتوقع' : 'Project sales ceiling',
                value: Number(allocation.total_sales_value).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
              }
            ]}
          />
        </div>

        {/* 3. Unit-by-unit table */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? `توزيع الوحدات (${unitBreakdown.length})` : `Unit Breakdown (${unitBreakdown.length})`}
          </h4>
          <div className={drawerStyles.tableWrap}>
            <table className={styles.canonicalTable}>
              <thead className={styles.canonicalThead}>
                <tr>
                  <th className={styles.canonicalTh}>{isAr ? 'الوحدة / العميل' : 'Unit / Buyer'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'القيمة البيعية' : 'Sales Value'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'التكلفة المستنزلة' : 'Allocated Cost'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'صافي الربح' : 'Gross Margin'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'حالة التسليم' : 'Handover Status'}</th>
                </tr>
              </thead>
              <tbody>
                {unitBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.canonicalTd}>
                      {isAr ? 'لا توجد وحدات أو عقود مسجلة لهذا المشروع بعد' : 'No units or contracts registered yet'}
                    </td>
                  </tr>
                ) : (
                  unitBreakdown.map((u, idx) => (
                    <tr key={u.unit_id || idx} className={styles.canonicalRow}>
                      <td className={styles.canonicalTd}>{u.unit_title}</td>
                      <td className={styles.canonicalTd}>
                        {Number(u.unit_sales_value).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')}
                      </td>
                      <td className={styles.canonicalTd}>
                        {Number(u.allocated_cost).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')}
                      </td>
                      <td className={styles.canonicalTd}>
                        {Number(u.gross_margin).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')}
                      </td>
                      <td className={styles.canonicalTd}>
                        <span className={`${styles.statusPill} ${u.handover_status === 'Delivered' ? styles.statusPillGreen : styles.statusPillAmber}`}>
                          {u.handover_status === 'Delivered' ? (isAr ? 'تم التسليم' : 'Delivered') : (isAr ? 'قيد التنفيذ' : 'Pending')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Interactive simulator */}
        <div className={zfForm.section}>
          <h4 className={zfForm.sectionTitle}>
            {isAr ? 'محاكي تسليم الشقق' : 'Handover Simulator'}
          </h4>
          <ZFField label={isAr ? 'قيمة بيعية افتراضية للوحدة' : 'Simulated unit sales value'}>
            <div className={zfForm.row}>
              <ZFMoneyInput
                value={simulatedUnitValue}
                onChange={e => setCustomValueByAlloc({ id: allocation.allocation_id, val: e.target.value })}
              />
              <div className={drawerStyles.simulatorPresets}>
                {[
                  { val: '3000000', labelAr: '٣ م', labelEn: '3M' },
                  { val: '5000000', labelAr: '٥ م', labelEn: '5M' },
                  { val: '8000000', labelAr: '٨ م', labelEn: '8M' },
                  { val: '12000000', labelAr: '١٢ م', labelEn: '12M' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    className={`${shellStyles.btnSm} ${simulatedUnitValue === item.val ? shellStyles.btnPrimary : shellStyles.btnSecondary}`}
                    onClick={() => setCustomValueByAlloc({ id: allocation.allocation_id, val: item.val })}
                  >
                    {isAr ? item.labelAr : item.labelEn}
                  </button>
                ))}
              </div>
            </div>
          </ZFField>
          <ZFFacts
            items={[
              {
                label: isAr ? 'تكلفة مباني الشقة المستنزلة' : 'Relieved unit cost',
                value: Number(simCOGS.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP')
              },
              {
                label: isAr ? 'صافي مكسب المكتب' : 'Recognized profit',
                value: Number(simProfit.toNumber()).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (isAr ? ' ج.م' : ' EGP'),
                tone: 'pos'
              }
            ]}
          />
        </div>

        {/* 5. Journal entry peek */}
        {journalPeekLines.length > 0 && (
          <div className={zfForm.section}>
            <ZFJournalPeek lines={journalPeekLines} isAr={isAr} />
          </div>
        )}

        {/* 6. Accounting Note */}
        <div className={zfForm.section}>
          <ZFEffect tone="info">
            {isAr
              ? 'وفقاً لمعايير المحاسبة، تُقيد تكاليف البناء في الأصول حتى تاريخ التسليم الفعلي للوحدة، حيث تُستنزل التكلفة إلى تكلفة المبيعات مع إثبات الإيراد المحقق.'
              : 'Under accounting standards, capitalized costs remain on balance sheet until handover, when proportional cost is transferred to COGS upon revenue recognition.'}
          </ZFEffect>
        </div>
      </div>
    </ZFDrawerShell>
  );
};
