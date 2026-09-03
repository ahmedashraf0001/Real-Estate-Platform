'use client';

import React, { useState } from 'react';
import { GitBranch, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import styles from './VersionTimeline.module.css';
import { ERPInstallmentSchedule, ERPContractAmendment } from '@/lib/erp/types';
import { StatusBadge } from './StatusBadge';
import { D } from '@/lib/erp/math';

interface VersionTimelineProps {
  schedules: ERPInstallmentSchedule[];
  amendments?: ERPContractAmendment[];
  isAr?: boolean;
  onCollect?: (sch: ERPInstallmentSchedule) => void;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  schedules,
  amendments = [],
  isAr = false,
  onCollect
}) => {
  const [expandedTranches, setExpandedTranches] = useState<Record<number, boolean>>({});

  // Group schedules by tranche_number
  const groupedByTranche = React.useMemo(() => {
    const map = new Map<number, ERPInstallmentSchedule[]>();
    schedules.forEach(s => {
      const arr = map.get(s.tranche_number) || [];
      arr.push(s);
      map.set(s.tranche_number, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [schedules]);

  const toggleTranche = (trancheNum: number) => {
    setExpandedTranches(prev => ({
      ...prev,
      [trancheNum]: !prev[trancheNum]
    }));
  };

  return (
    <div className={styles.container} style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
      {groupedByTranche.map(([trancheNum, tranches]) => {
        // Sort versions ascending
        const sorted = [...tranches].sort((a, b) => a.schedule_version - b.schedule_version);
        const currentActive = sorted.find(s => s.status !== 'SUPERSEDED') || sorted[sorted.length - 1];
        const hasHistory = sorted.length > 1;
        const isPaid = currentActive.status === 'Paid' || currentActive.status === 'Partially Paid';
        const isExpanded = !!expandedTranches[trancheNum];

        return (
          <div 
            key={trancheNum} 
            className={`${styles.lineageRow} ${isPaid ? styles.settledRow : ''}`}
          >
            {/* Main Tranche Row */}
            <div 
              className={styles.lineageHeader}
              onClick={() => hasHistory && !isPaid && toggleTranche(trancheNum)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                  {trancheNum === 0 ? (isAr ? 'الدفعة المقدمة' : 'Down Payment') : (isAr ? `قسط #${trancheNum}` : `Tranche #${trancheNum}`)}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--zf-text-muted, #6b7086)' }}>
                  ({currentActive.due_date})
                </span>

                {/* Paid tranches never show version chevron, indicating immutability (UI_BUILD.md §5.2) */}
                {hasHistory && !isPaid && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--zf-gold, #d4af37)', fontSize: '0.75rem', fontWeight: 700 }}>
                    <GitBranch size={13} />
                    <span>v{currentActive.schedule_version}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={styles.activeAmount}>
                  {D(currentActive.nominal_value).formatEGP(isAr)}
                </span>

                <StatusBadge domain="installment" status={currentActive.status} isAr={isAr} />

                {currentActive.status === 'Pending' && onCollect && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollect(currentActive);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #d4af37, #b8860b)',
                      color: '#0c0e14',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>{isAr ? 'تحصيل' : 'Collect'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsed Version Timeline (v1 -> v2) */}
            {hasHistory && isExpanded && (
              <div className={styles.supersededTimeline}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)', textTransform: 'uppercase' }}>
                  {isAr ? 'سجل التعديلات والتصعيد (Lineage Audit)' : 'Escalation Version Lineage'}
                </div>

                {sorted.map((s, idx) => {
                  const linkedAmendment = amendments.find(a => a.amendment_id === s.amendment_id);
                  const isCurrent = s.schedule_id === currentActive.schedule_id;

                  return (
                    <div key={s.schedule_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div className={styles.timelineNode}>
                        <span className={isCurrent ? styles.versionBadgeNew : styles.versionBadgeOld}>
                          v{s.schedule_version}
                        </span>

                        <span className={isCurrent ? styles.activeAmount : styles.struckAmount}>
                          {D(s.nominal_value).formatEGP(isAr)}
                        </span>

                        <StatusBadge domain="installment" status={s.status} isAr={isAr} />

                        {idx < sorted.length - 1 && (
                          <span style={{ color: 'var(--zf-text-muted, #6b7086)', fontSize: '0.75rem' }}>
                            → {isAr ? 'استبدل بالتصعيد' : 'superseded'}
                          </span>
                        )}
                      </div>

                      {linkedAmendment && (
                        <div className={styles.reasonBox}>
                          {isAr ? 'مبرر التعديل:' : 'Amendment Reason:'} &ldquo;{linkedAmendment.reason}&rdquo; ({linkedAmendment.effective_date})
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
  );
};
