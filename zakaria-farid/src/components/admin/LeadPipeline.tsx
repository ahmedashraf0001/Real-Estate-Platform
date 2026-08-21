'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Plus, Save, Sparkles, Clock, AlertTriangle,
  Building2, ArrowRight, Phone, Mail, FileText, ChevronRight, X, ArrowUpRight, CheckCircle2, User,
  Search, ArrowUpDown, SlidersHorizontal, Eye, ShieldCheck, Tag, Calendar, Trophy, Check,
  Flame, TrendingUp, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { createLead, deleteLeadPermanently, toggleArchiveLead, updateLeadDetails, updateLeadStage } from '@/app/actions/leads';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { Booking, Lead, Property } from '@/lib/supabase/types';

interface LeadPipelineProps {
  initialLeads: Lead[];
  properties: Property[];
  adminLocale: string;
}

const STAGE_CONFIG = [
  { key: 'new',               en: 'New Inquiries',     ar: 'طلبات جديدة',        color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.25)', step: 1 },
  { key: 'contacted',         en: 'Contacted',         ar: 'تم التواصل',         color: '#A855F7', glow: 'rgba(168, 85, 247, 0.25)', step: 2 },
  { key: 'viewing_scheduled', en: 'Viewing Scheduled', ar: 'معاينة مجدولة',      color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.25)', step: 3 },
  { key: 'negotiating',       en: 'Negotiating',       ar: 'جاري التفاوض',        color: '#FB923C', glow: 'rgba(251, 146, 60, 0.25)', step: 4 },
  { key: 'closed_won',        en: 'Closed Won ✨',     ar: 'تم التعاقد ✨',        color: '#10B981', glow: 'rgba(16, 185, 129, 0.25)', step: 5 },
  { key: 'closed_lost',       en: 'Closed Lost',       ar: 'لم يتم التعاقد',      color: '#F43F5E', glow: 'rgba(244, 63, 94, 0.25)', step: 0 },
] as const;

const PROGRESSION_STAGES = [
  { key: 'new',               en: 'Inquiry',    ar: 'طلب جديد',   num: 1, color: '#38BDF8' },
  { key: 'contacted',         en: 'Contacted',  ar: 'تواصل',      num: 2, color: '#A855F7' },
  { key: 'viewing_scheduled', en: 'Viewing',    ar: 'معاينة',     num: 3, color: '#F59E0B' },
  { key: 'negotiating',       en: 'Negotiate',  ar: 'تفاوض',      num: 4, color: '#FB923C' },
  { key: 'closed_won',        en: 'Won ✨',     ar: 'تعاقد ✨',    num: 5, color: '#10B981' },
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

function getWhatsAppUrl(phone: string, leadName: string, propertyTitle?: string, isAr = false) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const greeting = isAr
    ? `مرحباً ${leadName}، شكراً لتواصلك مع منصة المهندس زكريا فريد العقارية${propertyTitle ? ` بخصوص ${propertyTitle}` : ''}. يسعدنا الرد على استفسارك ومساعدتك في اختيار العقار الأنسب.`
    : `Hello ${leadName}, thank you for contacting Zakaria Farid Luxury Architectural Platform${propertyTitle ? ` regarding ${propertyTitle}` : ''}. We are pleased to assist you with full details.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
}

export default function LeadPipeline({ initialLeads, properties, adminLocale }: LeadPipelineProps) {
  const isAr = adminLocale === 'ar';
  const [leads, setLeads] = useState(initialLeads);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'archived'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'recently_updated'>('newest');
  
  // By default drawer is closed (null) for maximum Kanban board visibility
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
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

  const [detailDraft, setDetailDraft] = useState({ 
    notes: '', 
    lost_reason: '', 
    source: '' 
  });

  const activeLeads = useMemo(
    () => leads.filter((l) => !l.is_archived && l.stage !== 'archived'),
    [leads]
  );

  const archivedLeads = useMemo(
    () => leads.filter((l) => l.is_archived === true || l.stage === 'archived'),
    [leads]
  );

  // Metrics dynamically computed from activeLeads state
  const newCount = useMemo(() => activeLeads.filter(l => (l.stage || 'new') === 'new').length, [activeLeads]);
  const contactedCount = useMemo(() => activeLeads.filter(l => l.stage === 'contacted').length, [activeLeads]);
  const viewingCount = useMemo(() => activeLeads.filter(l => l.stage === 'viewing_scheduled').length, [activeLeads]);
  const negotiatingCount = useMemo(() => activeLeads.filter(l => l.stage === 'negotiating').length, [activeLeads]);
  const wonCount = useMemo(() => activeLeads.filter(l => l.stage === 'closed_won').length, [activeLeads]);
  const staleCount = useMemo(() => activeLeads.filter(l => isStale(l)).length, [activeLeads]);

  const filteredActiveLeads = useMemo(() => {
    return activeLeads
      .filter((lead) => {
        // Stage filter
        if (stageFilter === 'stale') {
          if (!isStale(lead)) return false;
        } else if (stageFilter !== 'all') {
          if ((lead.stage || 'new') !== stageFilter) return false;
        }

        // Text Search
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const name = (lead.name || '').toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const notes = (lead.notes || '').toLowerCase();
        const propTitleEn = (lead.property?.title_en || '').toLowerCase();
        const propTitleAr = (lead.property?.title_ar || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || notes.includes(q) || propTitleEn.includes(q) || propTitleAr.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'recently_updated') {
          const timeA = new Date(a.stage_updated_at || a.created_at).getTime();
          const timeB = new Date(b.stage_updated_at || b.created_at).getTime();
          return timeB - timeA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [activeLeads, searchQuery, stageFilter, sortBy]);

  const filteredArchivedLeads = useMemo(() => {
    return archivedLeads
      .filter((lead) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const name = (lead.name || '').toLowerCase();
        const phone = (lead.phone || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const notes = (lead.notes || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || notes.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [archivedLeads, searchQuery, sortBy]);

  const viewingRequests = useMemo(() => {
    const rows: Array<{ lead: Lead; booking: Booking }> = [];
    for (const lead of leads) {
      for (const booking of lead.bookings ?? []) {
        if (booking.status === 'viewing_scheduling_request') rows.push({ lead, booking });
      }
    }
    return rows.sort((a, b) => {
      const ta = a.booking.start_time ? new Date(a.booking.start_time).getTime() : Infinity;
      const tb = b.booking.start_time ? new Date(b.booking.start_time).getTime() : Infinity;
      return ta - tb;
    });
  }, [leads]);

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

  const grouped = useMemo(() => {
    return STAGE_CONFIG.map((stage) => {
      const items = filteredActiveLeads.filter((l) => (l.stage || 'new') === stage.key);
      return {
        ...stage,
        items,
      };
    });
  }, [filteredActiveLeads]);

  // Stage advancement
  const handleStageAdvance = async (leadId: string, targetStage: string) => {
    const prev = leads;
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.stage === targetStage) return;

    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { ...l, stage: targetStage as any, stage_updated_at: new Date().toISOString() }
          : l
      )
    );

    setIsSaving(true);
    try {
      const res = await updateLeadStage(leadId, targetStage);
      if (!res.success) {
        setLeads(prev);
        toast.error(isAr ? 'فشل تحديث المرحلة' : 'Failed to advance stage');
      } else {
        toast.success(isAr ? 'تم تحديث مرحلة العميل' : 'Stage updated successfully');
      }
    } catch {
      setLeads(prev);
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  // Next stage calculation for 1-click CTA in drawer
  const nextStageInfo = useMemo(() => {
    if (!selectedLead) return null;
    const currentStage = selectedLead.stage || 'new';
    const currentIdx = PROGRESSION_STAGES.findIndex(s => s.key === currentStage);
    if (currentIdx >= 0 && currentIdx < PROGRESSION_STAGES.length - 1) {
      return PROGRESSION_STAGES[currentIdx + 1];
    }
    return null;
  }, [selectedLead]);

  // Archive / Restore
  const handleToggleArchive = async (leadId: string, archiveState: boolean) => {
    setIsSaving(true);
    try {
      const res = await toggleArchiveLead(leadId, archiveState);
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, is_archived: archiveState, stage: archiveState ? 'archived' : 'new' }
              : l
          )
        );
        toast.success(archiveState ? (isAr ? 'تم نقل العميل للأرشيف' : 'Lead moved to archive') : (isAr ? 'تمت استعادة العميل' : 'Lead restored'));
        if (selectedLeadId === leadId) {
          setSelectedLeadId(null);
        }
      } else {
        toast.error(isAr ? 'فشلت العملية' : 'Action failed');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الشبكة' : 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async (leadId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من الحذف النهائي لهذا العميل؟' : 'Permanently delete this client inquiry?')) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await deleteLeadPermanently(leadId);
      if (res.success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        toast.success(isAr ? 'تم حذف العميل نهائياً' : 'Lead permanently deleted');
        if (selectedLeadId === leadId) {
          setSelectedLeadId(null);
        }
      } else {
        toast.error(isAr ? 'فشل الحذف' : 'Delete failed');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Lead Notes / Details
  const handleSaveDetails = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      const res = await updateLeadDetails(selectedLead.id, {
        notes: detailDraft.notes,
        lost_reason: detailDraft.lost_reason,
        source: detailDraft.source,
      });
      if (res.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedLead.id
              ? {
                  ...l,
                  notes: detailDraft.notes,
                  lost_reason: detailDraft.lost_reason,
                  source: detailDraft.source,
                }
              : l
          )
        );
        toast.success(isAr ? 'تم حفظ التعديلات' : 'Details saved');
      } else {
        toast.error(isAr ? 'فشل الحفظ' : 'Failed to save');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Manual Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Name and phone required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await createLead({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        property_id: form.property_id || null,
        notes: form.notes || null,
        source: form.source || 'Direct Manual Entry',
        message: form.message || 'Direct manual registration',
      });
      if (res.success && res.lead) {
        setLeads((prev) => [res.lead as any, ...prev]);
        setSelectedLeadId(res.lead.id);
        setIsComposerOpen(false);
        setForm({
          name: '',
          phone: '',
          email: '',
          property_id: '',
          notes: '',
          source: 'Direct Phone Call',
          message: '',
        });
        toast.success(isAr ? 'تمت إضافة العميل بنجاح' : 'New lead created');
      } else {
        toast.error(isAr ? 'فشل إنشاء العميل' : 'Failed to create lead');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKanbanDragOver = (e: React.DragEvent) => {
    if (!kanbanRef.current) return;
    const rect = kanbanRef.current.getBoundingClientRect();
    const threshold = 100;
    const scrollSpeed = 16;
    if (e.clientX < rect.left + threshold) {
      kanbanRef.current.scrollLeft -= scrollSpeed;
    } else if (e.clientX > rect.right - threshold) {
      kanbanRef.current.scrollLeft += scrollSpeed;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', flex: 1, minHeight: 'calc(100vh - 120px)', fontFamily: "'Plus Jakarta Sans', sans-serif" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ─── Top Executive Command Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'rgba(13, 19, 34, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '20px 26px',
        borderRadius: '20px',
        border: '1px solid rgba(221, 167, 82, 0.22)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {isAr ? 'إدارة العملاء والمبيعات (CRM)' : 'CRM Lead Pipeline'}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
              {isAr
                ? 'لوحة إدارة مسار الصفقات ومتابعة العملاء الفوري'
                : 'Interactive sales pipeline & deal progression studio.'}
            </p>
          </div>

          {/* View Tab Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('pipeline')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'pipeline' ? 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)' : 'transparent',
                color: activeTab === 'pipeline' ? '#0A0E18' : 'rgba(255, 255, 255, 0.65)',
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'archived' ? 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)' : 'transparent',
                color: activeTab === 'archived' ? '#0A0E18' : 'rgba(255, 255, 255, 0.65)',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              {isAr ? 'الأرشيف' : 'Archived'} ({archivedLeads.length})
            </button>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 20px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
            color: '#0A0E18',
            border: 'none',
            boxShadow: '0 4px 16px rgba(221, 167, 82, 0.35)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{isAr ? 'إضافة عميل يدوي' : 'Add New Lead'}</span>
        </button>
      </div>

      {/* ─── Dynamic Real-Time KPI Metrics Filter Strip ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        width: '100%'
      }}>
        {/* 1. New Inquiries */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'new' ? 'all' : 'new')}
          style={{
            background: stageFilter === 'new' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'new' ? '1.5px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'new' ? '0 4px 16px rgba(56, 189, 248, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'طلبات جديدة' : 'New Inquiries'}
            </span>
            <strong key={newCount} style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {newCount}
            </strong>
          </div>
          <User size={18} style={{ color: '#38BDF8', opacity: 0.85 }} />
        </button>

        {/* 2. Contacted */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'contacted' ? 'all' : 'contacted')}
          style={{
            background: stageFilter === 'contacted' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'contacted' ? '1.5px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'contacted' ? '0 4px 16px rgba(168, 85, 247, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'تم التواصل' : 'Contacted'}
            </span>
            <strong key={contactedCount} style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {contactedCount}
            </strong>
          </div>
          <Phone size={18} style={{ color: '#A855F7', opacity: 0.85 }} />
        </button>

        {/* 3. Viewings Scheduled */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'viewing_scheduled' ? 'all' : 'viewing_scheduled')}
          style={{
            background: stageFilter === 'viewing_scheduled' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'viewing_scheduled' ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'viewing_scheduled' ? '0 4px 16px rgba(245, 158, 11, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'معاينات مجدولة' : 'Viewings'}
            </span>
            <strong key={viewingCount} style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {viewingCount}
            </strong>
          </div>
          <Calendar size={18} style={{ color: '#F59E0B', opacity: 0.85 }} />
        </button>

        {/* 4. In Negotiation */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'negotiating' ? 'all' : 'negotiating')}
          style={{
            background: stageFilter === 'negotiating' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'negotiating' ? '1.5px solid #FB923C' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'negotiating' ? '0 4px 16px rgba(251, 146, 60, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'جاري التفاوض' : 'Negotiating'}
            </span>
            <strong key={negotiatingCount} style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {negotiatingCount}
            </strong>
          </div>
          <TrendingUp size={18} style={{ color: '#FB923C', opacity: 0.85 }} />
        </button>

        {/* 5. Closed Won */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'closed_won' ? 'all' : 'closed_won')}
          style={{
            background: stageFilter === 'closed_won' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'closed_won' ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'closed_won' ? '0 4px 16px rgba(16, 185, 129, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'تم التعاقد ✨' : 'Closed Won ✨'}
            </span>
            <strong key={wonCount} style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {wonCount}
            </strong>
          </div>
          <Trophy size={18} style={{ color: '#10B981', opacity: 0.85 }} />
        </button>

        {/* 6. Needs Follow-Up (>24h) */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'stale' ? 'all' : 'stale')}
          style={{
            background: stageFilter === 'stale' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(13, 19, 34, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'stale' ? '1.5px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: stageFilter === 'stale' ? '0 4px 16px rgba(239, 68, 68, 0.25)' : 'none'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: staleCount > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'يحتاج متابعة' : 'Follow-Up'}
            </span>
            <strong key={staleCount} style={{ fontSize: '20px', fontWeight: 800, color: staleCount > 0 ? '#EF4444' : '#FFFFFF', marginTop: '2px', display: 'block', transition: 'transform 0.2s ease' }}>
              {staleCount}
            </strong>
          </div>
          <Flame size={18} style={{ color: staleCount > 0 ? '#EF4444' : 'rgba(255, 255, 255, 0.5)', opacity: 0.85 }} />
        </button>
      </div>

      {/* ─── Incoming Viewing Requests (Cal.com bookings awaiting action) ─── */}
      {viewingRequests.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: 'rgba(245, 158, 11, 0.07)',
          padding: '10px 18px',
          borderRadius: '14px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            <Calendar size={14} />
            {isAr ? `طلبات معاينة (${viewingRequests.length})` : `Viewing Requests (${viewingRequests.length})`}
          </span>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
            {viewingRequests.map(({ lead, booking }) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedLeadId(lead.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  background: 'rgba(13, 19, 34, 0.85)',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{lead.name}</span>
                <span style={{ color: '#F59E0B' }}>
                  {isAr ? (booking.property?.title_ar || booking.property?.title_en || '') : (booking.property?.title_en || '')}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }} dir="ltr">
                  {booking.start_time
                    ? new Date(booking.start_time).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
                    : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Search & Active Filter Bar ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        background: 'rgba(13, 19, 34, 0.75)',
        backdropFilter: 'blur(16px)',
        padding: '10px 18px',
        borderRadius: '14px',
        border: '1px solid rgba(221, 167, 82, 0.16)',
      }}>
        {/* Text Search */}
        <div style={{ flex: '1 1 260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '14px', color: '#DDA752', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث باسم العميل، الهاتف، البريد، أو العقار...' : 'Search client name, phone, email, notes, property...'}
            style={{
              width: '100%',
              padding: isAr ? '9px 38px 9px 14px' : '9px 14px 9px 38px',
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              outline: 'none',
              background: 'rgba(10, 14, 24, 0.7)',
              color: '#FFFFFF',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', [isAr ? 'left' : 'right']: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Active Filter Indicator */}
        {stageFilter !== 'all' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(221, 167, 82, 0.15)',
            border: '1px solid rgba(221, 167, 82, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#DDA752'
          }}>
            <Filter size={12} />
            <span>Filter: {stageFilter === 'stale' ? 'Needs Attention' : stageFilter}</span>
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#DDA752', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: '#DDA752' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '9px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              background: 'rgba(10, 14, 24, 0.7)',
              color: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="newest">{isAr ? 'الأحدث وصولاً' : 'Newest Inquiries'}</option>
            <option value="oldest">{isAr ? 'الأقدم أولاً' : 'Oldest First'}</option>
            <option value="name_asc">{isAr ? 'الاسم (أ - ي)' : 'Client Name (A-Z)'}</option>
            <option value="recently_updated">{isAr ? 'المُحدَّث مؤخراً' : 'Recently Updated'}</option>
          </select>
        </div>
      </div>

      {/* ─── Main Content: Full-Width 6-Column Kanban + Slide-Out Drawer ─── */}
      {activeTab === 'archived' ? (
        <div style={{
          background: 'rgba(13, 19, 34, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(221, 167, 82, 0.18)',
          padding: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#DDA752', margin: '0 0 16px' }}>
            {isAr ? 'الطلبات المؤرشفة' : 'Archived Leads'} ({filteredArchivedLeads.length})
          </h2>

          {filteredArchivedLeads.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: '14px' }}>
              <Archive size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'rgba(221, 167, 82, 0.4)' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>{isAr ? 'لا توجد طلبات مؤرشفة' : 'No archived leads found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {filteredArchivedLeads.map((lead) => (
                <div key={lead.id} style={{
                  background: 'rgba(18, 24, 40, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF' }}>{lead.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>{lead.phone}</p>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {lead.stage || 'Archived'}
                    </span>
                  </div>

                  {lead.property && (
                    <div style={{ fontSize: '11px', color: '#DDA752', fontWeight: 600, background: 'rgba(221, 167, 82, 0.08)', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(221, 167, 82, 0.2)' }}>
                      <Building2 size={11} style={{ display: 'inline', marginInlineEnd: '4px', color: '#DDA752' }} />
                      {isAr && lead.property.title_ar ? lead.property.title_ar : lead.property.title_en}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', marginTop: 'auto' }}>
                    <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.4)' }}>{formatTimeAgo(lead.created_at)}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
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
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={11} />
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
                          fontWeight: 700,
                          background: 'rgba(244, 63, 94, 0.15)',
                          color: '#FB7185',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={11} />
                        <span>{isAr ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      /* ─── Kanban Track: Full-Width 6 Columns when Drawer is Closed ─── */
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedLead ? '1fr 370px' : '1fr',
        gap: '16px',
        alignItems: 'stretch',
        width: '100%',
        flex: 1,
        transition: 'grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Horizontal Kanban Columns Container */}
        <div
          ref={kanbanRef}
          onDragOver={handleKanbanDragOver}
          style={{
            display: 'grid',
            gridTemplateColumns: selectedLead ? 'repeat(6, minmax(240px, 1fr))' : 'repeat(6, minmax(210px, 1fr))',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '10px',
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
                  background: isHovered ? 'rgba(221, 167, 82, 0.06)' : 'rgba(13, 19, 34, 0.75)',
                  backdropFilter: 'blur(20px)',
                  borderTop: isHovered ? '2px dashed rgba(221, 167, 82, 0.6)' : `3px solid ${stage.color}`,
                  borderRight: isHovered ? '2px dashed rgba(221, 167, 82, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderBottom: isHovered ? '2px dashed rgba(221, 167, 82, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderLeft: isHovered ? '2px dashed rgba(221, 167, 82, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '12px',
                  minHeight: '520px',
                  maxHeight: 'calc(100vh - 220px)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isHovered ? `0 10px 30px ${stage.glow}` : '0 6px 20px rgba(0,0,0,0.2)',
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
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color, boxShadow: `0 0 8px ${stage.color}` }} />
                    <h3 style={{ fontSize: '12.5px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.01em' }}>
                      {isAr ? stage.ar : stage.en}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '8px',
                    background: `${stage.color}20`,
                    color: stage.color,
                    border: `1px solid ${stage.color}40`
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
                  maxHeight: 'calc(100vh - 280px)',
                  paddingRight: isAr ? 0 : '2px',
                  paddingLeft: isAr ? '2px' : 0,
                  scrollbarWidth: 'thin'
                }}>
                  {stage.items.map((lead) => {
                    const stale = isStale(lead);
                    const isSelected = lead.id === selectedLeadId;
                    const isDraggingThis = lead.id === draggedLeadId;
                    const initials = lead.name ? lead.name.slice(0, 2).toUpperCase() : 'LD';
                    const propTitle = lead.property ? (isAr && lead.property.title_ar ? lead.property.title_ar : lead.property.title_en) : undefined;
                    const waLink = getWhatsAppUrl(lead.phone, lead.name, propTitle, isAr);

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
                            ? '1.5px solid #DDA752'
                            : (stale ? '1.5px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)'),
                          [isAr ? 'borderRight' : 'borderLeft']: `3.5px solid ${stage.color}`,
                          borderRadius: '12px',
                          padding: '12px',
                          background: isSelected
                            ? 'rgba(221, 167, 82, 0.08)'
                            : (stale ? 'rgba(245, 158, 11, 0.04)' : 'rgba(18, 24, 40, 0.88)'),
                          cursor: 'pointer',
                          opacity: isDraggingThis ? 0.35 : 1,
                          boxShadow: isSelected
                            ? '0 6px 20px rgba(221, 167, 82, 0.22)'
                            : '0 2px 8px rgba(0,0,0,0.18)',
                          transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {/* Avatar & Client Name & Attention Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isSelected ? 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)' : 'rgba(221, 167, 82, 0.12)',
                              color: isSelected ? '#0A0E18' : '#DDA752',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 800,
                              flexShrink: 0,
                              border: `1px solid ${isSelected ? 'transparent' : 'rgba(221, 167, 82, 0.25)'}`
                            }}>
                              {initials}
                            </div>
                            <strong style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#FFFFFF',
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
                              color: '#F59E0B',
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              padding: '1px 5px',
                              borderRadius: '5px',
                              flexShrink: 0
                            }}>
                              ⚡ &gt;24h
                            </span>
                          )}
                        </div>

                        {/* Inquired Property Chip */}
                        <div style={{
                          fontSize: '11px',
                          color: '#DDA752',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(221, 167, 82, 0.07)',
                          border: '1px solid rgba(221, 167, 82, 0.18)',
                          padding: '5px 8px',
                          borderRadius: '7px'
                        }}>
                          <Building2 size={11} style={{ flexShrink: 0, color: '#DDA752' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {propTitle || (isAr ? 'استفسار عام' : 'General Inquiry')}
                          </span>
                        </div>

                        {/* Card Footer: Time ago & Subtle Quick Icon Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)', paddingTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} />
                            {formatTimeAgo(lead.stage_updated_at || lead.created_at)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Direct Phone Call Icon */}
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title={isAr ? 'اتصال بالهاتف' : 'Call Phone'}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.75)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Phone size={11} />
                            </a>

                            {/* WhatsApp with Pre-Filled Message */}
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={isAr ? 'مراسلة واتساب' : 'WhatsApp Chat'}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34D399',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <MessageCircle size={11} />
                            </a>

                            {/* View Property Link */}
                            {lead.property && (
                              <Link
                                href={`/${adminLocale === 'ar' ? 'ar' : 'en'}/properties/${lead.property.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={isAr ? 'عرض العقار على المنصة' : 'View Property'}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: 'rgba(221, 167, 82, 0.12)',
                                  border: '1px solid rgba(221, 167, 82, 0.25)',
                                  color: '#DDA752',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <ArrowUpRight size={12} />
                              </Link>
                            )}

                            {/* Quick Archive Button */}
                            <button
                              type="button"
                              title={isAr ? 'أرشفة الطلب' : 'Archive Lead'}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggleArchive(lead.id, true);
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Archive size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stage.items.length === 0 && (
                    <div style={{
                      padding: '32px 8px',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.3)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: '1.5px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.15)'
                    }}>
                      {isAr ? 'اسحب عميلاً إلى هنا' : 'Drop lead here'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Dismissible Slide-Out Lead Dossier Drawer ─── */}
        {selectedLead && (
          <div style={{
            background: 'rgba(13, 19, 34, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(221, 167, 82, 0.25)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            height: '100%',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Header with [X] Close Button */}
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
                    color: '#0A0E18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(221, 167, 82, 0.3)'
                  }}>
                    {selectedLead.name ? selectedLead.name.slice(0, 2).toUpperCase() : 'LD'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                      {selectedLead.name}
                    </h3>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '11.5px', fontWeight: 600 }}>
                      {selectedLead.phone}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* WhatsApp Button with Prefilled Text */}
                  <a
                    href={getWhatsAppUrl(selectedLead.phone, selectedLead.name, selectedLead.property ? (isAr && selectedLead.property.title_ar ? selectedLead.property.title_ar : selectedLead.property.title_en) : undefined, isAr)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      textDecoration: 'none',
                      boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>

                  {/* [X] Close Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(null)}
                    title={isAr ? 'إغلاق لوحة العميل' : 'Close Dossier'}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.75)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {selectedLead.property && (
                <div style={{
                  marginTop: '12px',
                  background: 'rgba(221, 167, 82, 0.08)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(221, 167, 82, 0.22)'
                }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#DDA752', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {isAr ? 'العقار المطلوب' : 'Inquired Property'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isAr && selectedLead.property.title_ar ? selectedLead.property.title_ar : selectedLead.property.title_en}
                    </span>
                    <Link
                      href={`/admin/${adminLocale}/properties/${selectedLead.property.id}/edit`}
                      style={{ color: '#DDA752', display: 'inline-flex', alignItems: 'center', padding: '2px' }}
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sequential Stepper Progression Track ─── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#DDA752', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'مسار الصفقة المتسلسل:' : 'Deal Stage Progression:'}
                </span>
                {selectedLead.stage === 'closed_lost' && (
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#F43F5E', background: 'rgba(244, 63, 94, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                    {isAr ? 'ملغي' : 'Closed Lost'}
                  </span>
                )}
              </div>

              {/* Linear Stepper Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '4px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {PROGRESSION_STAGES.map((st) => {
                  const currentStageKey = selectedLead.stage || 'new';
                  const currentIdx = PROGRESSION_STAGES.findIndex(s => s.key === currentStageKey);
                  const isCurrent = currentStageKey === st.key;
                  const isPassed = currentIdx > PROGRESSION_STAGES.findIndex(s => s.key === st.key);

                  return (
                    <button
                      key={st.key}
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleStageAdvance(selectedLead.id, st.key)}
                      style={{
                        padding: '6px 2px',
                        borderRadius: '8px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        border: isCurrent ? `1.5px solid ${st.color}` : '1px solid transparent',
                        background: isCurrent ? `${st.color}35` : (isPassed ? `${st.color}15` : 'transparent'),
                        color: isCurrent ? '#FFFFFF' : (isPassed ? st.color : 'rgba(255, 255, 255, 0.45)'),
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: isCurrent ? st.color : (isPassed ? `${st.color}40` : 'rgba(255, 255, 255, 0.1)'),
                        color: isCurrent ? '#0A0E18' : (isPassed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 900
                      }}>
                        {isPassed ? <Check size={10} strokeWidth={3} /> : st.num}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {isAr ? st.ar : st.en}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 1-Click Advance Button & Lost Switch */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {nextStageInfo && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleStageAdvance(selectedLead.id, nextStageInfo.key)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${nextStageInfo.color} 0%, #0A0E18 180%)`,
                      border: `1px solid ${nextStageInfo.color}`,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: `0 3px 12px ${nextStageInfo.color}30`
                    }}
                  >
                    <span>{isAr ? `نقل إلى: ${nextStageInfo.ar}` : `Advance to: ${nextStageInfo.en}`}</span>
                    <ArrowRight size={12} />
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleStageAdvance(selectedLead.id, selectedLead.stage === 'closed_lost' ? 'new' : 'closed_lost')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: selectedLead.stage === 'closed_lost' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.12)',
                    border: selectedLead.stage === 'closed_lost' ? '1px solid #38BDF8' : '1px solid rgba(244, 63, 94, 0.3)',
                    color: selectedLead.stage === 'closed_lost' ? '#38BDF8' : '#FB7185',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedLead.stage === 'closed_lost' ? (isAr ? 'إعادة تنشيط' : 'Reactivate') : (isAr ? 'تعذر التعاقد 🔴' : 'Closed Lost 🔴')}
                </button>
              </div>
            </div>

            {/* Viewing Booking History (Cal.com) */}
            {(selectedLead.bookings?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#DDA752', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? `سجل المعاينات (${selectedLead.bookings!.length})` : `Viewing History (${selectedLead.bookings!.length})`}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...selectedLead.bookings!]
                    .sort((a, b) => new Date(b.start_time ?? b.created_at).getTime() - new Date(a.start_time ?? a.created_at).getTime())
                    .map((booking) => (
                      <div
                        key={booking.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.06)',
                          border: '1px solid rgba(245, 158, 11, 0.22)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#FFFFFF', minWidth: 0 }}>
                            <Calendar size={12} style={{ color: '#F59E0B', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isAr
                                ? (booking.property?.title_ar || booking.property?.title_en || 'عقار غير محدد')
                                : (booking.property?.title_en || 'Unspecified property')}
                            </span>
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap',
                            background: booking.status === 'viewing_scheduling_request' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(148, 163, 184, 0.15)',
                            color: booking.status === 'viewing_scheduling_request' ? '#F59E0B' : '#94A3B8',
                          }}>
                            {booking.status === 'viewing_scheduling_request'
                              ? (isAr ? 'طلب معاينة' : 'Requested')
                              : booking.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }} dir="ltr">
                          {booking.start_time
                            ? new Date(booking.start_time).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'full', timeStyle: 'short' })
                            : (isAr ? 'موعد غير محدد' : 'Time not set')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Editable Notes & Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#DDA752', display: 'block', marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'ملاحظات المتابعة والعميل:' : 'Notes & Requirements:'}
                </label>
                <textarea
                  value={detailDraft.notes}
                  onChange={(e) => setDetailDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    background: 'rgba(10, 14, 24, 0.85)',
                    color: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none',
                    lineHeight: '1.4'
                  }}
                  placeholder="Enter client budget, preferences, timeline..."
                />
              </div>

              {(selectedLead.stage === 'closed_lost' || detailDraft.lost_reason) && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#F43F5E', display: 'block', marginBottom: '4px' }}>
                    {isAr ? 'سبب عدم التعاقد:' : 'Closed Lost Reason:'}
                  </label>
                  <input
                    value={detailDraft.lost_reason}
                    onChange={(e) => setDetailDraft(d => ({ ...d, lost_reason: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      background: 'rgba(244, 63, 94, 0.1)',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder="Price, financing, cold lead..."
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#DDA752', display: 'block', marginBottom: '4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'مصدر الطلب:' : 'Lead Source:'}
                </label>
                <input
                  value={detailDraft.source}
                  onChange={(e) => setDetailDraft(d => ({ ...d, source: e.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    background: 'rgba(10, 14, 24, 0.85)',
                    color: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  placeholder="Property Page, Direct WhatsApp..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
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
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
                    color: '#0A0E18',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(221, 167, 82, 0.35)'
                  }}
                >
                  <Save size={14} />
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Details'}</span>
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
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer'
                  }}
                >
                  {selectedLead.is_archived ? <RotateCcw size={14} /> : <Archive size={14} />}
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
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'rgba(244, 63, 94, 0.12)',
                    color: '#FB7185',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
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

      {/* ─── Luxury Manual Lead Entry Modal ─── */}
      {isComposerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: 'rgba(13, 19, 34, 0.95)',
            backdropFilter: 'blur(24px)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(221, 167, 82, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#FFFFFF' }}>
                  {isAr ? 'إضافة عميل جديد يدوي' : 'Register Manual Inquiry'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12.5px' }}>
                  {isAr ? 'سجل اتصالات هاتفية، رسائل واتساب، أو زيارات مباشرة للمكتب' : 'Record a direct phone call, WhatsApp lead, or office walk-in.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255, 255, 255, 0.6)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    {isAr ? 'اسم العميل *' : 'Client Name *'}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'rgba(10, 14, 24, 0.85)',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder="e.g. Hossam Hassan"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
                  </label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'rgba(10, 14, 24, 0.85)',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder="+20 1xx xxx xxxx"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'rgba(10, 14, 24, 0.85)',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder="client@domain.com"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    {isAr ? 'العقار المرتبط' : 'Related Property'}
                  </label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: '#0D1322',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">{isAr ? 'استفسار عام' : 'General Inquiry'}</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {isAr && p.title_ar ? p.title_ar : p.title_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  {isAr ? 'مصدر الطلب' : 'Lead Source'}
                </label>
                <input
                  value={form.source}
                  onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    background: 'rgba(10, 14, 24, 0.85)',
                    color: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  placeholder="Direct Call, WhatsApp, Referral..."
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  {isAr ? 'ملاحظات أولية ومواصفات الطلب' : 'Initial Notes & Requirements'}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    background: 'rgba(10, 14, 24, 0.85)',
                    color: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none',
                    lineHeight: '1.5'
                  }}
                  placeholder="Client budget, location preferences, timeline..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.75)',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
                    color: '#0A0E18',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    boxShadow: '0 4px 16px rgba(221, 167, 82, 0.35)'
                  }}
                >
                  <Sparkles size={15} />
                  <span>{isAr ? 'تسجيل العميل' : 'Save Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
