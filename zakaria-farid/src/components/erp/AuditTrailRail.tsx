'use client';

import React from 'react';
import { History, User, Clock } from 'lucide-react';
import { ERPAuditLog } from '@/lib/erp/types';

interface AuditTrailRailProps {
  logs: ERPAuditLog[];
  title?: string;
  isAr?: boolean;
}

export const AuditTrailRail: React.FC<AuditTrailRailProps> = ({
  logs,
  title,
  isAr = false
}) => {
  return (
    <div 
      style={{
        background: 'var(--zf-bg-panel, #121622)',
        border: '1px solid var(--zf-border-hairline, rgba(212, 175, 55, 0.12))',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem' }}>
        <div style={{ color: 'var(--zf-gold, #d4af37)' }}>
          <History size={16} />
        </div>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
          {title || (isAr ? 'سجل الرقابة والتدقيق الحي (Live Audit Rail)' : 'Audit Trail Stream')}
        </h4>
        <span style={{ marginLeft: isAr ? undefined : 'auto', marginRight: isAr ? 'auto' : undefined, fontSize: '0.72rem', color: 'var(--zf-text-muted, #6b7086)' }}>
          {logs.length} {isAr ? 'عمليات مسجلة' : 'Events'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--zf-text-muted, #6b7086)', textAlign: 'center', padding: '1.5rem 0' }}>
            {isAr ? 'لا توجد حركات تدقيق مسجلة حتى الآن' : 'No audit events recorded yet.'}
          </div>
        ) : (
          logs.map(log => (
            <div 
              key={log.log_id} 
              style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.78rem',
                borderLeft: isAr ? undefined : '2px solid var(--zf-gold, #d4af37)',
                borderRight: isAr ? '2px solid var(--zf-gold, #d4af37)' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{log.action}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={11} />
                  <span>{new Date(log.performed_at).toLocaleTimeString()}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--zf-text-secondary, #a7acc0)', fontSize: '0.72rem' }}>
                <User size={11} />
                <span>{log.performed_by}</span>
                {log.ip_address && (
                  <span style={{ color: 'var(--zf-text-muted, #6b7086)' }}>({log.ip_address})</span>
                )}
              </div>

              {(log.prior_state || log.new_state) && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)', fontFamily: 'monospace' }}>
                  {log.prior_state && <span>{JSON.stringify(log.prior_state).slice(0, 50)} → </span>}
                  {log.new_state && <span style={{ color: 'var(--zf-gold, #d4af37)' }}>{JSON.stringify(log.new_state).slice(0, 50)}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
