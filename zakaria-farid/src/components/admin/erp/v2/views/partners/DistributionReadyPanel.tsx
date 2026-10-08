'use client';

import React from 'react';
import { HandCoins } from 'lucide-react';
import { D } from '@/lib/erp/math';
import type { DistributionReadyProject } from '@/lib/erp/partnersEngine';
import { ZFPanel } from '../../common/ZFPageHeader';
import shellStyles from '../../ZFWorkstationShell.module.css';
import styles from './DistributionReadyPanel.module.css';

interface DistributionReadyPanelProps {
  projects: DistributionReadyProject[];
  isAr?: boolean;
  isMutating?: boolean;
  onPay: (partnerName: string, propertyId: string) => void;
}

/** Sold, fully collected projects whose money has not been distributed to the partners yet. */
export function DistributionReadyPanel({ projects, isAr = true, isMutating = false, onPay }: DistributionReadyPanelProps) {
  if (projects.length === 0) return null;
  const egp = (v: string) => D(v).formatEGP(isAr);

  return (
    <div className={styles.stack}>
      {projects.map(project => (
        <ZFPanel
          key={project.propertyId}
          className={styles.panel}
          icon={<HandCoins size={16} />}
          title={isAr ? `جاهز للتوزيع: ${project.propertyTitle}` : `Ready to distribute: ${project.propertyTitle}`}
          hint={isAr
            ? `المشروع اتباع واتحصّل بالكامل (${egp(project.totalCollected)}). وزّع نصيب كل شريك.`
            : `Sold and fully collected (${egp(project.totalCollected)}). Pay each partner their share.`}
          flush
        >
          <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'الشريك' : 'Partner'}</th>
                <th className={styles.num}>{isAr ? 'النسبة' : 'Share'}</th>
                <th className={styles.num}>{isAr ? 'لسه ما اتصرفش' : 'Not paid yet'}</th>
                <th className={styles.num}>{isAr ? 'يتخصم مديونية' : 'Debt offset'}</th>
                <th className={styles.num}>{isAr ? 'يتصرف نقداً' : 'Cash to pay'}</th>
                <th aria-label={isAr ? 'إجراء' : 'Action'} />
              </tr>
            </thead>
            <tbody>
              {project.partners.map(p => (
                <tr key={p.partnerName}>
                  <td className={styles.name}>{p.partnerName}</td>
                  <td className={styles.num}>{p.sharePct}%</td>
                  <td className={styles.num}>{egp(p.grossAvailable)}</td>
                  <td className={`${styles.num} ${D(p.offsetNow).gt(0) ? styles.neg : styles.muted}`}>
                    {D(p.offsetNow).gt(0) ? egp(p.offsetNow) : '—'}
                  </td>
                  <td className={`${styles.num} ${styles.strong}`}>{egp(p.cashAvailable)}</td>
                  <td className={styles.action}>
                    <button
                      type="button"
                      className={shellStyles.btnSecondary}
                      disabled={isMutating}
                      onClick={() => onPay(p.partnerName, project.propertyId)}
                    >
                      {D(p.cashAvailable).gt(0) ? (isAr ? 'صرف' : 'Pay') : (isAr ? 'خصم المديونية' : 'Settle debt')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </ZFPanel>
      ))}
    </div>
  );
}
