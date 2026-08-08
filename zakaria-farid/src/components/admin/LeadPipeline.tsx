'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Plus, Save, Sparkles, Clock, AlertTriangle,
  Building2, ArrowRight, Phone, Mail, FileText, ChevronRight, X, ArrowUpRight, CheckCircle2, User
} from 'lucide-react';
import { toast } from 'sonner';
import { createLead, deleteLeadPermanently, toggleArchiveLead, updateLeadDetails, updateLeadStage } from '@/app/actions/leads';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { Lead, Property } from '@/lib/supabase/types';

interface LeadPipelineProps {
  initialLeads: Lead[];
  properties: Property[];
  adminLocale: string;
}

const STAGE_CONFIG = [
  { key: 'new',               en: 'New Inquiries',    ar: 'طلبات جديدة',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'contacted',         en: 'Contacted',        ar: 'تم التواصل',        color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'viewing_scheduled', en: 'Viewing Scheduled',ar: 'معاينة مجدولة',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'negotiating',       en: 'Negotiating',      ar: 'جاري التفاوض',       color: '#EA580C', bg: '#FFF7ED', border: '#FFEDD5' },
  { key: 'closed_won',        en: 'Closed Won ✨',    ar: 'تم التعاقد ✨',       color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { key: 'closed_lost',       en: 'Closed Lost',      ar: 'لم يتم التعاقد',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
] as const;

function formatTimeAgo(value?: string | null) {
  if (!value) return 'Recently';
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - then) / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function isStale(lead: Lead) {
  const stage = lead.stage || 'new';
  if (stage !== 'new') return false;
  const base = lead.stage_updated_at || lead.created_at;
  if (!base) return false;
  const then = new Date(base).getTime();
  const diffHours = (Date.now() - then) / (1000 * 60 * 60);
  return diffHours >= 24;
}

export default function LeadPipeline({ initialLeads, properties, adminLocale }: LeadPipelineProps) {
  const isAr = adminLocale === 'ar';
  const [leads, setLeads] = useState(initialLeads);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'archived'>('pipeline');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const kanbanRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    property_id: '',
    notes: '',
    source: 'Direct Phone Call',
    message: '',
  });

  const [detailDraft, setDetailDraft] = useState({ notes: '', lost_reason: '', source: '' });

  const activeLeads = useMemo(
    () => leads.filter((l) => !l.is_archived && l.stage !== 'archived'),
    [leads]
  );

  const archivedLeads = useMemo(
    () => leads.filter((l) => l.is_archived === true || l.stage === 'archived'),
    [leads]
  );

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  useEffect(() => {
    if (selectedLead) {
      setDetailDraft({
        notes: selectedLead.notes || '',
        lost_reason: selectedLead.lost_reason || '',
        source: selectedLead.source || '',
      });
    }
  }, [selectedLead]);

  const grouped = useMemo(
    () =>
      STAGE_CONFIG.map((stage) => ({
        ...stage,
        items: activeLeads.filter((lead) => (lead.stage || 'new') === stage.key),
      })),
    [activeLeads]
  );

  const handleToggleArchive = async (leadId: string, shouldArchive: boolean) => {
    setIsSaving(true);
    try {
      setLeads((current) =>
        current.map((l) => (l.id === leadId ? { ...l, is_archived: shouldArchive } : l))
      );
      const res = await toggleArchiveLead(leadId, shouldArchive);
      if (res.success) {
        toast.success(
          shouldArchive
            ? isAr
              ? 'تم أرشفة الطلب بنجاح'
              : 'Lead archived successfully'
            : isAr
            ? 'تم استعادة الطلب بنجاح'
            : 'Lead restored to active pipeline'
        );
      } else {
        setLeads(initialLeads);
        toast.error(res.error || 'Failed to update archive state');
      }
    } catch {
      setLeads(initialLeads);
      toast.error('Failed to update archive state');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePermanentDelete = async (leadId: string) => {
    if (!confirm(isAr ? 'هل أنت تأكد من حذف هذا الطلب نهائياً؟' : 'Are you sure you want to permanently delete this lead?')) {
      return;
    }
    setIsSaving(true);
    try {
      setLeads((current) => current.filter((l) => l.id !== leadId));
      const res = await deleteLeadPermanently(leadId);
      if (res.success) {
        toast.success(isAr ? 'تم حذف الطلب نهائياً' : 'Lead deleted permanently');
        if (selectedLeadId === leadId) setSelectedLeadId(null);
      } else {
        setLeads(initialLeads);
        toast.error(res.error || 'Failed to delete lead');
      }
    } catch {
      setLeads(initialLeads);
      toast.error('Failed to delete lead');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKanbanDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!kanbanRef.current) return;
    const container = kanbanRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX;

    const edgeThreshold = 90;
    const scrollSpeed = 16;

    if (mouseX - rect.left < edgeThreshold) {
      container.scrollLeft -= scrollSpeed;
    } else if (rect.right - mouseX < edgeThreshold) {
      container.scrollLeft += scrollSpeed;
    }
  };

  const handleStageAdvance = async (leadId: string, nextStage: string) => {
    const currentLead = leads.find(l => l.id === leadId);
    if (!currentLead || (currentLead.stage || 'new') === nextStage) return;

    setIsSaving(true);
    try {
      // Optimistic UI update
      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId
            ? { ...lead, stage: nextStage, stage_updated_at: new Date().toISOString() }
            : lead
        )
      );

      const stageLabel = STAGE_CONFIG.find(s => s.key === nextStage);
      const msg = isAr ? `تم نقل الطلب إلى: ${stageLabel?.ar}` : `Moved lead to ${stageLabel?.en}`;

      const result = await updateLeadStage(leadId, nextStage);
      if (result.success) {
        toast.success(msg);
      } else {
        setLeads(initialLeads);
        toast.error(result.error || 'Unable to update stage.');
      }
    } catch {
      setLeads(initialLeads);
      toast.error('Unable to update stage.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      const result = await updateLeadDetails(selectedLead.id, {
        notes: detailDraft.notes,
        lost_reason: detailDraft.lost_reason,
        source: detailDraft.source,
      });
      if (result.success) {
        setLeads((current) =>
          current.map((lead) =>
            lead.id === selectedLead.id
              ? { ...lead, notes: detailDraft.notes, lost_reason: detailDraft.lost_reason, source: detailDraft.source }
              : lead
          )
        );
        toast.success(isAr ? 'تم حفظ التغييرات بنجاح' : 'Lead details saved successfully.');
      } else {
        toast.error(result.error || 'Unable to save details.');
      }
    } catch {
      toast.error('Unable to save details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(isAr ? 'الاسم ورقم الهاتف مطلوبان' : 'Name and phone are required.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await createLead({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        message: form.message || null,
        property_id: form.property_id || null,
        notes: form.notes || null,
        source: form.source || 'Manual Entry',
        entry_method: 'manual',
      });
      if (result.success && result.lead) {
        setLeads((current) => [result.lead as Lead, ...current]);
        setSelectedLeadId(result.lead.id);
        setForm({ name: '', phone: '', email: '', property_id: '', notes: '', source: 'Direct Phone Call', message: '' });
        setIsComposerOpen(false);
        toast.success(isAr ? 'تمت إضافة الطلب اليدوي إلى اللوحة' : 'Manual lead added to pipeline.');
      } else {
        toast.error(result.error || 'Unable to create lead.');
      }
    } catch {
      toast.error('Unable to create lead.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', flex: 1, minHeight: 'calc(100vh - 120px)' }} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Executive Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: '#FFFFFF',
        padding: '16px 22px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", color: '#1E4D3D', letterSpacing: isAr ? 'normal' : '-0.02em' }}>
              {isAr ? 'متابعة المبيعات والعملاء' : 'Lead Pipeline'}
            </h1>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  background: activeTab === 'pipeline' ? '#1E4D3D' : 'transparent',
                  color: activeTab === 'pipeline' ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {isAr ? 'الطلبات النشطة' : 'Active Pipeline'} ({activeLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  background: activeTab === 'archived' ? '#1E4D3D' : 'transparent',
                  color: activeTab === 'archived' ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {isAr ? 'الأرشيف' : 'Archived'} ({archivedLeads.length})
              </button>
            </div>
          </div>
          <p style={{ margin: '3px 0 0', color: '#64748B', fontSize: '13px' }}>
            {isAr
              ? 'قم بسحب وإسقاط البطاقات لتغيير مراحل المبيعات بسهولة أو أرشفة الطلبات القديمة'
              : 'Drag & drop lead cards between stage columns to advance your sales pipeline or manage archived inquiries.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            background: '#1E4D3D',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 14px rgba(30,77,61,0.2)',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          <span>{isAr ? 'إضافة عميل يدوي' : 'Add Manual Lead'}</span>
        </button>
      </div>

      {/* Conditional Content: Active Pipeline vs Archived Leads */}
      {activeTab === 'archived' ? (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E4D3D', margin: '0 0 16px', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
            {isAr ? 'الطلبات المؤرشفة' : 'Archived Leads'} ({archivedLeads.length})
          </h2>

          {archivedLeads.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '12px' }}>
              <Archive size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#94A3B8' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{isAr ? 'لا توجد طلبات مؤرشفة' : 'No archived leads found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {archivedLeads.map((lead) => (
                <div key={lead.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>{lead.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>{lead.phone} {lead.email ? `• ${lead.email}` : ''}</p>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#E2E8F0', color: '#475569' }}>
                      {lead.stage || 'Archived'}
                    </span>
                  </div>

                  {lead.property && (
                    <div style={{ fontSize: '11px', color: '#1E4D3D', fontWeight: 600, background: '#FFFFFF', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <Building2 size={12} style={{ display: 'inline', marginInlineEnd: '4px', color: '#C9A96A' }} />
                      {isAr && lead.property.title_ar ? lead.property.title_ar : lead.property.title_en}
                    </div>
                  )}

                  {lead.notes && (
                    <p style={{ margin: 0, fontSize: '11px', color: '#475569', background: '#FFFFFF', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      {lead.notes}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', marginTop: 'auto' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>{formatTimeAgo(lead.created_at)}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => void handleToggleArchive(lead.id, false)}
                        disabled={isSaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>{isAr ? 'استعادة' : 'Restore'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePermanentDelete(lead.id)}
                        disabled={isSaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{isAr ? 'حذف نهائي' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      /* Main Grid: Full-Width 6-Column Kanban + Equal Height Side Panel */
      <div style={{ display: 'grid', gridTemplateColumns: selectedLead ? '1fr 350px' : '1fr', gap: '16px', alignItems: 'stretch', width: '100%', flex: 1 }}>
        
        {/* Horizontal Kanban Drag & Drop Columns Track with Edge Auto-Scroll */}
        <div
          ref={kanbanRef}
          onDragOver={handleKanbanDragOver}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(295px, 1fr))',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth'
          }}
        >
          {grouped.map((stage) => {
            const isHovered = draggedOverStage === stage.key;

            return (
              <div
                key={stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDraggedOverStage(stage.key);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDraggedOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) {
                    void handleStageAdvance(leadId, stage.key);
                  }
                  setDraggedOverStage(null);
                  setDraggedLeadId(null);
                }}
                style={{
                  background: isHovered ? 'rgba(30, 77, 61, 0.05)' : '#F8FAFC',
                  border: isHovered ? '2px dashed #1E4D3D' : `1px solid ${stage.border}`,
                  borderRadius: '14px',
                  padding: '12px',
                  minHeight: '480px',
                  maxHeight: 'calc(100vh - 200px)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isHovered ? '0 4px 16px rgba(30,77,61,0.1)' : '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'all 150ms ease',
                  boxSizing: 'border-box'
                }}
              >
                {/* Stage Column Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '10px',
                  marginBottom: '10px',
                  borderBottom: '1px solid #E2E8F0',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }} />
                    <h3 style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: '#1E293B', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif" }}>
                      {isAr ? stage.ar : stage.en}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: stage.bg,
                    color: stage.color,
                    border: `1px solid ${stage.border}`
                  }}>
                    {stage.items.length}
                  </span>
                </div>

                {/* Draggable Cards List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  flex: 1,
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 260px)',
                  paddingRight: isAr ? 0 : '4px',
                  paddingLeft: isAr ? '4px' : 0,
                  scrollbarWidth: 'thin'
                }}>
                  {stage.items.map((lead) => {
                    const stale = isStale(lead);
                    const isSelected = lead.id === selectedLeadId;
                    const isDraggingThis = lead.id === draggedLeadId;
                    const initials = lead.name ? lead.name.slice(0, 2).toUpperCase() : 'LD';

                    return (
                      <div
                        key={lead.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedLeadId(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDraggedOverStage(null);
                        }}
                        onClick={() => setSelectedLeadId(lead.id)}
                        style={{
                          textAlign: isAr ? 'right' : 'left',
                          border: isSelected
                            ? '2px solid #1E4D3D'
                            : (stale ? '1.5px solid #F59E0B' : '1px solid #E2E8F0'),
                          borderRadius: '12px',
                          padding: '12px',
                          background: stale ? '#FFFBEB' : '#FFFFFF',
                          cursor: 'grab',
                          opacity: isDraggingThis ? 0.4 : 1,
                          boxShadow: isSelected
                            ? '0 4px 14px rgba(30,77,61,0.12)'
                            : '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'all 150ms ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {/* Avatar & Name */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isSelected ? '#1E4D3D' : 'rgba(30,77,61,0.08)',
                              color: isSelected ? '#FFFFFF' : '#1E4D3D',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {initials}
                            </div>
                            <strong style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif",
                              color: '#1E293B',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {lead.name}
                            </strong>
                          </div>

                          {stale && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              color: '#D97706',
                              background: '#FEF3C7',
                              border: '1px solid #FCD34D',
                              padding: '1px 5px',
                              borderRadius: '5px',
                              flexShrink: 0
                            }}>
                              &gt;24h
                            </span>
                          )}
                        </div>

                        {/* Phone & Direct WhatsApp Action */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748B', fontSize: '11px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <Phone size={11} style={{ color: '#1E4D3D' }} />
                            {lead.phone}
                          </span>

                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#059669',
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              textDecoration: 'none'
                            }}
                          >
                            <MessageCircle size={10} />
                            <span>Chat</span>
                          </a>
                        </div>

                        {/* Property Inquired */}
                        <div style={{
                          fontSize: '11px',
                          color: '#1E4D3D',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#F1F5F9',
                          padding: '4px 8px',
                          borderRadius: '6px'
                        }}>
                          <Building2 size={11} style={{ flexShrink: 0, color: '#C9A96A' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.property
                              ? (isAr && lead.property.title_ar ? lead.property.title_ar : lead.property.title_en)
                              : (isAr ? 'استفسار عام' : 'General Inquiry')}
                          </span>
                        </div>

                        {/* Card Footer: Time ago & Functional View Property Link / Archive Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', paddingTop: '4px', borderTop: '1px dashed #E2E8F0' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />
                            {formatTimeAgo(lead.stage_updated_at || lead.created_at)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {lead.property && (
                              <Link
                                href={`/${adminLocale === 'ar' ? 'ar' : 'en'}/properties/${lead.property.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#1E4D3D',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>{isAr ? 'عرض' : 'View'}</span>
                                <ArrowUpRight size={11} />
                              </Link>
                            )}

                            <button
                              type="button"
                              title={isAr ? 'أرشفة الطلب' : 'Archive Lead'}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggleArchive(lead.id, true);
                              }}
                              style={{
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                color: '#475569',
                                fontSize: '9px',
                                fontWeight: 600
                              }}
                            >
                              <Archive size={10} />
                              <span>{isAr ? 'أرشفة' : 'Archive'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stage.items.length === 0 && (
                    <div style={{
                      padding: '28px 8px',
                      textAlign: 'center',
                      color: '#94A3B8',
                      fontSize: '11px',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '10px',
                      background: '#FFFFFF'
                    }}>
                      {isAr ? 'اسحب بطاقة إلى هنا' : 'Drag card here'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Side Lead Detail Panel */}
        {selectedLead && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '14px',
            padding: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Header Info */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#1E4D3D',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px'
                  }}>
                    {selectedLead.name ? selectedLead.name.slice(0, 2).toUpperCase() : 'LD'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", color: '#1E4D3D' }}>
                      {selectedLead.name}
                    </h3>
                    <p style={{ margin: '1px 0 0', color: '#64748B', fontSize: '11px' }}>
                      {selectedLead.phone}
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#10B981',
                    color: '#FFFFFF',
                    textDecoration: 'none'
                  }}
                >
                  <MessageCircle size={12} />
                  <span>WhatsApp</span>
                </a>
              </div>

              {selectedLead.property && (
                <div style={{ marginTop: '10px', background: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#C9A96A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isAr ? 'العقار المطلوب' : 'Inquired Property'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E4D3D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isAr && selectedLead.property.title_ar ? selectedLead.property.title_ar : selectedLead.property.title_en}
                    </span>
                    <Link
                      href={`/admin/${adminLocale}/properties/${selectedLead.property.id}/edit`}
                      style={{ color: '#1E4D3D', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Transition Selector */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#1E4D3D', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'تغيير مرحلة المبيعات:' : 'Move Pipeline Stage:'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {STAGE_CONFIG.map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    disabled={isSaving || selectedLead.stage === st.key}
                    onClick={() => void handleStageAdvance(selectedLead.id, st.key)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: selectedLead.stage === st.key ? `2px solid ${st.color}` : '1px solid #E2E8F0',
                      background: selectedLead.stage === st.key ? st.bg : '#FFFFFF',
                      color: selectedLead.stage === st.key ? st.color : '#475569',
                      cursor: selectedLead.stage === st.key ? 'default' : 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {isAr ? st.ar : st.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Notes & Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1E4D3D', display: 'block', marginBottom: '3px' }}>
                  {isAr ? 'ملاحظات المتابعة والعميل:' : 'Notes & Requirements:'}
                </label>
                <textarea
                  value={detailDraft.notes}
                  onChange={(e) => setDetailDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter client budget, preferences, timeline..."
                />
              </div>

              {(selectedLead.stage === 'closed_lost' || detailDraft.lost_reason) && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'block', marginBottom: '3px' }}>
                    {isAr ? 'سبب عدم التعاقد:' : 'Closed Lost Reason:'}
                  </label>
                  <input
                    value={detailDraft.lost_reason}
                    onChange={(e) => setDetailDraft(d => ({ ...d, lost_reason: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '11px',
                      background: '#FEF2F2',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Price, financing, cold lead..."
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#1E4D3D', display: 'block', marginBottom: '3px' }}>
                  {isAr ? 'مصدر الطلب:' : 'Lead Source:'}
                </label>
                <input
                  value={detailDraft.source}
                  onChange={(e) => setDetailDraft(d => ({ ...d, source: e.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    fontSize: '11px',
                    background: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Property Page, Direct WhatsApp..."
                />
              </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => void handleSaveDetails()}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#1E4D3D',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Save size={14} />
                    <span>{isAr ? 'حفظ' : 'Save'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleArchive(selectedLead.id, !selectedLead.is_archived)}
                    disabled={isSaving}
                    title={selectedLead.is_archived ? (isAr ? 'استعادة' : 'Restore') : (isAr ? 'أرشفة' : 'Archive')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: selectedLead.is_archived ? '#ECFDF5' : '#F1F5F9',
                      color: selectedLead.is_archived ? '#059669' : '#475569',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedLead.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                    <span>{selectedLead.is_archived ? (isAr ? 'استعادة' : 'Restore') : (isAr ? 'أرشفة' : 'Archive')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePermanentDelete(selectedLead.id)}
                    disabled={isSaving}
                    title={isAr ? 'حذف نهائي' : 'Delete'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
        )}

      </div>
      )}

      {/* Manual Lead Entry Modal */}
      {isComposerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: isAr ? 'var(--font-serif)' : "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#1E4D3D' }}>
                  {isAr ? 'إضافة عميل يدوي' : 'Add Manual Lead'}
                </h3>
                <p style={{ margin: '2px 0 0', color: '#64748B', fontSize: '12px' }}>
                  Record a phone call, WhatsApp message, or walk-in inquiry.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                    placeholder="e.g. Hossam Hassan"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Phone *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                    placeholder="+20 1xx xxx xxxx"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Related Property</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    <option value="">General Inquiry</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {isAr && p.title_ar ? p.title_ar : p.title_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Lead Source</label>
                <input
                  value={form.source}
                  onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  placeholder="Direct Call, WhatsApp, Referral..."
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px', color: '#1E293B' }}>Initial Notes & Requirements</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  style={{ border: '1px solid #CBD5E1', background: 'transparent', padding: '8px 14px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '12px', background: '#1E4D3D', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <Sparkles size={14} />
                  <span>Save Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
