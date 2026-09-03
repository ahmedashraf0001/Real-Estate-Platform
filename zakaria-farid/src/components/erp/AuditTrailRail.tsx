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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
        <div style={{ color: '#946f23' }}>
          <History size={16} />
        </div>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
          {title || (isAr ? 'سجل الرقابة والتدقيق الحي (Live Audit Rail)' : 'Audit Trail Stream')}
        </h4>
        <span style={{ marginLeft: isAr ? undefined : 'auto', marginRight: isAr ? 'auto' : undefined, fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {logs.length} {isAr ? 'عمليات مسجلة' : 'Events'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '1.5rem 0' }}>
            {isAr ? 'لا توجد حركات تدقيق مسجلة حتى الآن' : 'No audit events recorded yet.'}
          </div>
        ) : (
          logs.map(log => (
            <div 
              key={log.log_id} 
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.78rem',
                borderLeft: isAr ? undefined : '2px solid #946f23',
                borderRight: isAr ? '2px solid #946f23' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{log.action}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>
                  <Clock size={11} />
                  <span>{new Date(log.performed_at).toLocaleTimeString()}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.72rem' }}>
                <User size={11} />
                <span>{log.performed_by}</span>
                {log.ip_address && (
                  <span style={{ color: '#64748b' }}>({log.ip_address})</span>
                )}
              </div>

              {(log.prior_state || log.new_state) && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  {log.prior_state && <span>{JSON.stringify(log.prior_state).slice(0, 50)} → </span>}
                  {log.new_state && <span style={{ color: '#946f23', fontWeight: 700 }}>{JSON.stringify(log.new_state).slice(0, 50)}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
