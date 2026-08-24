'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Plus, Save, Sparkles, Clock, AlertTriangle,
  Building2, ArrowRight, Phone, Mail, FileText, ChevronRight, X, ArrowUpRight, CheckCircle2, User,
  Search, ArrowUpDown, SlidersHorizontal, Eye, ShieldCheck, Tag, Calendar, Trophy, Check,
  Flame, TrendingUp, Filter, Send, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { createLead, deleteLeadPermanently, toggleArchiveLead, updateLeadDetails, updateLeadStage } from '@/app/actions/leads';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { Booking, Lead, Property } from '@/lib/supabase/types';
import { 
  formatInternationalWhatsAppNumber, 
  getNotifyFaridWhatsAppUrl, 
  formatFaridWhatsAppLeadMessage 
} from '@/lib/services/whatsappNotifier';

interface LeadPipelineProps {
  initialLeads: Lead[];
  properties: Property[];
  adminLocale: string;
}

const STAGE_CONFIG = [
  { key: 'new',               en: 'New Inquiries',     ar: 'طلبات جديدة',        color: '#E5B869', glow: 'rgba(229, 184, 105, 0.2)', step: 1 },
  { key: 'contacted',         en: 'Contacted',         ar: 'تم التواصل',         color: '#D4AF37', glow: 'rgba(212, 175, 55, 0.2)', step: 2 },
  { key: 'viewing_scheduled', en: 'Viewing Scheduled', ar: 'معاينة مجدولة',      color: '#C5A059', glow: 'rgba(197, 160, 89, 0.2)', step: 3 },
  { key: 'negotiating',       en: 'Negotiating',       ar: 'جاري التفاوض',        color: '#E5B869', glow: 'rgba(229, 184, 105, 0.25)', step: 4 },
  { key: 'closed_won',        en: 'Closed Won ✨',     ar: 'تم التعاقد ✨',        color: '#10B981', glow: 'rgba(16, 185, 129, 0.2)', step: 5 },
  { key: 'closed_lost',       en: 'Closed Lost',       ar: 'لم يتم التعاقد',      color: '#94A3B8', glow: 'rgba(148, 163, 184, 0.2)', step: 0 },
] as const;

const PROGRESSION_STAGES = [
  { key: 'new',               en: 'Inquiry',    ar: 'طلب جديد',   num: 1, color: '#E5B869' },
  { key: 'contacted',         en: 'Contacted',  ar: 'تواصل',      num: 2, color: '#D4AF37' },
  { key: 'viewing_scheduled', en: 'Viewing',    ar: 'معاينة',     num: 3, color: '#C5A059' },
  { key: 'negotiating',       en: 'Negotiate',  ar: 'تفاوض',      num: 4, color: '#E5B869' },
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
  const intlPhone = formatInternationalWhatsAppNumber(phone);
  const greeting = isAr
    ? `مرحباً ${leadName}، شكراً لتواصلك مع منصة المهندس زكريا فريد العقارية${propertyTitle ? ` بخصوص ${propertyTitle}` : ''}. يسعدنا الرد على استفسارك ومساعدتك في اختيار العقار الأنسب.`
    : `Hello ${leadName}, thank you for contacting Zakaria Farid Luxury Architectural Platform${propertyTitle ? ` regarding ${propertyTitle}` : ''}. We are pleased to assist you with full details.`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(greeting)}`;
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
  const [selectedPropToAssociate, setSelectedPropToAssociate] = useState<string>('');

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

  // Parse clean structured data from selected lead (no garbage pipe concatenations)
  const cleanLeadData = useMemo(() => {
    if (!selectedLead) return null;

    // 1. Resolve Primary Property
    const primaryProp = properties.find(
      p => p.id === selectedLead.property_id || (selectedLead.property && p.id === selectedLead.property.id)
    ) || null;

    const propTitle = selectedLead.property?.title_en || primaryProp?.title_en || (isAr ? 'طلب استشارة عقارية خاصة' : 'Private Advisory Inquiry');
    const propTitleAr = selectedLead.property?.title_ar || primaryProp?.title_ar || propTitle;
    const displayTitle = isAr ? propTitleAr : propTitle;

    const propLocation = primaryProp?.location || 'New Cairo / Sheikh Zayed';
    const propPrice = primaryProp?.price_egp || null;
    const propImage = primaryProp?.property_images?.[0]?.url || (primaryProp as any)?.featured_image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';

    // 2. Extract Communication Protocol
    let protocol = 'WhatsApp';
    const combined = `${selectedLead.source || ''} ${selectedLead.notes || ''} ${selectedLead.message || ''}`;
    if (combined.includes('Phone Call') || combined.includes('اتصال هاتفي')) {
      protocol = isAr ? 'اتصال هاتفي' : 'Phone Call';
    } else if (combined.includes('Meet in Person') || combined.includes('مقابلة شخصية')) {
      protocol = isAr ? 'مقابلة شخصية' : 'Meet in Person';
    } else {
      protocol = isAr ? 'واتساب (WhatsApp)' : 'WhatsApp';
    }

    // 3. Extract Clean Client Message (not duplicated)
    let clientMessage = '';
    if (selectedLead.message && !selectedLead.message.startsWith('Private Acquisition request for') && !selectedLead.message.startsWith('Property Acquisition:')) {
      clientMessage = selectedLead.message.trim();
    } else if (selectedLead.notes && selectedLead.notes.includes('Client Notes:')) {
      const split = selectedLead.notes.split('Client Notes:');
      if (split[1]) clientMessage = split[1].split('|')[0].trim();
    }

    // 4. Extract Clean Internal Notes for the Admin
    let internalNotes = '';
    if (selectedLead.notes) {
      const filtered = selectedLead.notes
        .split('|')
        .map(s => s.trim())
        .filter(s => 
          !s.startsWith('Property:') && 
          !s.startsWith('Protocol:') && 
          !s.startsWith('Client Notes:') &&
          !s.startsWith('Preferred:') &&
          !s.startsWith('Budget:')
        )
        .join('\n');
      internalNotes = filtered.trim();
    }

    return {
      primaryProp,
      displayTitle,
      propLocation,
      propPrice,
      propImage,
      protocol,
      clientMessage,
      internalNotes,
      hasDirectProperty: !!(selectedLead.property_id || selectedLead.property || primaryProp)
    };
  }, [selectedLead, properties, isAr]);

  // Find other distinct properties the client inquired about (deduplicated)
  const otherInquiries = useMemo(() => {
    if (!selectedLead) return [];
    const normPhone = selectedLead.phone ? selectedLead.phone.replace(/[^0-9]/g, '') : '';
    const normEmail = selectedLead.email ? selectedLead.email.toLowerCase().trim() : '';

    const clientOthers = leads.filter(l => {
      if (l.id === selectedLead.id) return false;
      const otherPhone = l.phone ? l.phone.replace(/[^0-9]/g, '') : '';
      const otherEmail = l.email ? l.email.toLowerCase().trim() : '';
      const matchPhone = normPhone && otherPhone === normPhone;
      const matchEmail = normEmail && otherEmail === normEmail;
      return matchPhone || matchEmail;
    });

    const seenProps = new Set<string>();
    // Exclude current lead property so it's not repeated in previous inquiries
    if (selectedLead.property_id) seenProps.add(selectedLead.property_id);
    if (selectedLead.property?.title_en) seenProps.add(selectedLead.property.title_en);

    const result: Array<{
      id: string;
      propertyId?: string;
      title: string;
      image: string;
      location: string;
      price?: number;
      date: string;
    }> = [];

    for (const inq of clientOthers) {
      const p = properties.find(prop => prop.id === inq.property_id || (inq.property && prop.id === inq.property.id));
      const title = inq.property?.title_en || p?.title_en || (inq as any).property_title;
      const propKey = inq.property_id || title;

      if (propKey && !seenProps.has(propKey)) {
        seenProps.add(propKey);
        result.push({
          id: inq.id,
          propertyId: inq.property_id || p?.id,
          title: (isAr && p?.title_ar ? p.title_ar : title) || (isAr ? 'عقار آخر' : 'Other Property'),
          image: p?.property_images?.[0]?.url || (p as any)?.featured_image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
          location: p?.location || 'Egypt',
          price: p?.price_egp,
          date: inq.created_at
        });
      }
    }

    return result;
  }, [selectedLead, leads, properties, isAr]);

  useEffect(() => {
    if (selectedLead) {
      const parsed = cleanLeadData;
      setDetailDraft({
        notes: parsed?.internalNotes || selectedLead.notes || '',
        lost_reason: selectedLead.lost_reason || '',
        source: selectedLead.source || '',
      });
    }
  }, [selectedLead, cleanLeadData]);

  const [autoArchiveOnClose, setAutoArchiveOnClose] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zf_auto_archive_closed_leads');
      if (saved !== null) return saved === 'true';
    }
    return true; // default ON
  });

  const handleToggleAutoArchive = () => {
    setAutoArchiveOnClose((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('zf_auto_archive_closed_leads', String(next));
      }
      toast.info(
        next
          ? (isAr ? 'تم تفعيل الأرشفة التلقائية للصفقات المغلقة' : 'Auto-archive on closed deals enabled')
          : (isAr ? 'تم تعطيل الأرشفة التلقائية للصفقات المغلقة' : 'Auto-archive on closed deals disabled')
      );
      return next;
    });
  };

  const grouped = useMemo(() => {
    return STAGE_CONFIG.map((stage) => {
      const items = filteredActiveLeads.filter((l) => (l.stage || 'new') === stage.key);
      return {
        ...stage,
        items,
      };
    });
  }, [filteredActiveLeads]);

  // Stage advancement with Auto-Archive on Closed
  const handleStageAdvance = async (leadId: string, targetStage: string) => {
    const prev = leads;
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.stage === targetStage) return;

    const isClosed = targetStage === 'closed_won' || targetStage === 'closed_lost';
    const shouldArchive = autoArchiveOnClose ? isClosed : false;

    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId
          ? { 
              ...l, 
              stage: targetStage as any, 
              is_archived: shouldArchive ? true : (['new', 'contacted', 'viewing_scheduled', 'negotiating'].includes(targetStage) ? false : l.is_archived),
              stage_updated_at: new Date().toISOString() 
            }
          : l
      )
    );

    if (shouldArchive && selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }

    setIsSaving(true);
    try {
      const res = await updateLeadStage(leadId, targetStage, autoArchiveOnClose);
      if (!res.success) {
        setLeads(prev);
        toast.error(isAr ? 'فشل تحديث المرحلة' : 'Failed to advance stage');
      } else {
        if (shouldArchive) {
          toast.success(
            targetStage === 'closed_won'
              ? (isAr ? 'تم إغلاق الصفقة بنجاح ✨ ونقلها تلقائياً إلى الأرشيف' : 'Deal Closed Won ✨ — Auto-archived to Closed Deals')
              : (isAr ? 'تم إغلاق الطلب ونقله تلقائياً إلى الأرشيف' : 'Deal Closed Lost — Auto-archived')
          );
        } else {
          toast.success(isAr ? 'تم تحديث مرحلة العميل' : 'Stage updated successfully');
        }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', flex: 1, minHeight: 'calc(100vh - 120px)', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)" }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* ─── Top Executive Command Header ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        background: 'rgba(16, 20, 29, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {isAr ? 'إدارة العملاء والمبيعات (CRM)' : 'CRM Lead Pipeline'}
            </h1>
            <p style={{ margin: '3px 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12.5px', fontWeight: 500 }}>
              {isAr
                ? 'لوحة إدارة مسار الصفقات ومتابعة العملاء الفوري'
                : 'Interactive sales pipeline & deal progression studio.'}
            </p>
          </div>

          {/* View Tab Switcher & Auto-Archive Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: 'none',
                  background: activeTab === 'pipeline' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                  color: activeTab === 'pipeline' ? '#0A0C10' : 'rgba(255, 255, 255, 0.65)',
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
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  border: 'none',
                  background: activeTab === 'archived' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                  color: activeTab === 'archived' ? '#0A0C10' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {isAr ? 'الأرشيف والصفقات المغلقة' : 'Closed & Archived'} ({archivedLeads.length})
              </button>
            </div>

            {/* Auto-Archive on Closed Toggle Button */}
            <button
              type="button"
              onClick={handleToggleAutoArchive}
              title={isAr ? 'أرشفة الصفقات تلقائياً عند الإغلاق (تم التعاقد / تعذر التعاقد)' : 'Automatically archive deals when moved to Closed Won or Closed Lost'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 11px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                background: autoArchiveOnClose ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                border: autoArchiveOnClose ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                color: autoArchiveOnClose ? '#34D399' : 'rgba(255, 255, 255, 0.55)',
              }}
            >
              <Archive size={12} />
              <span>{isAr ? 'الأرشفة التلقائية' : 'Auto-Archive'}</span>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: autoArchiveOnClose ? '#10B981' : 'rgba(255, 255, 255, 0.25)'
              }} />
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
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '10px',
            fontSize: '12.5px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)',
            color: '#0A0C10',
            border: 'none',
            boxShadow: '0 3px 14px rgba(229, 184, 105, 0.25)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease'
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{isAr ? 'إضافة عميل يدوي' : 'Add New Lead'}</span>
        </button>
      </div>

      {/* ─── Dynamic Real-Time KPI Metrics Filter Strip ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        width: '100%'
      }}>
        {/* 1. New Inquiries */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'new' ? 'all' : 'new')}
          style={{
            background: stageFilter === 'new' ? 'rgba(229, 184, 105, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'new' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'new' ? '#E5B869' : 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'طلبات جديدة' : 'New Inquiries'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {newCount}
            </strong>
          </div>
          <User size={16} style={{ color: '#E5B869', opacity: 0.85 }} />
        </button>

        {/* 2. Contacted */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'contacted' ? 'all' : 'contacted')}
          style={{
            background: stageFilter === 'contacted' ? 'rgba(229, 184, 105, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'contacted' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'contacted' ? '#E5B869' : 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'تم التواصل' : 'Contacted'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {contactedCount}
            </strong>
          </div>
          <Phone size={16} style={{ color: '#D4AF37', opacity: 0.85 }} />
        </button>

        {/* 3. Viewings Scheduled */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'viewing_scheduled' ? 'all' : 'viewing_scheduled')}
          style={{
            background: stageFilter === 'viewing_scheduled' ? 'rgba(229, 184, 105, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'viewing_scheduled' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'viewing_scheduled' ? '#E5B869' : 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'معاينات مجدولة' : 'Viewings'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {viewingCount}
            </strong>
          </div>
          <Calendar size={16} style={{ color: '#C5A059', opacity: 0.85 }} />
        </button>

        {/* 4. In Negotiation */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'negotiating' ? 'all' : 'negotiating')}
          style={{
            background: stageFilter === 'negotiating' ? 'rgba(229, 184, 105, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'negotiating' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'negotiating' ? '#E5B869' : 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'جاري التفاوض' : 'Negotiating'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {negotiatingCount}
            </strong>
          </div>
          <TrendingUp size={16} style={{ color: '#E5B869', opacity: 0.85 }} />
        </button>

        {/* 5. Closed Won */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'closed_won' ? 'all' : 'closed_won')}
          style={{
            background: stageFilter === 'closed_won' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'closed_won' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'تم التعاقد ✨' : 'Closed Won ✨'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {wonCount}
            </strong>
          </div>
          <Trophy size={16} style={{ color: '#10B981', opacity: 0.85 }} />
        </button>

        {/* 6. Needs Follow-Up (>24h) */}
        <button
          type="button"
          onClick={() => setStageFilter(stageFilter === 'stale' ? 'all' : 'stale')}
          style={{
            background: stageFilter === 'stale' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 20, 29, 0.75)',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'stale' ? '1px solid rgba(244, 63, 94, 0.35)' : (staleCount > 0 ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)'),
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: isAr ? 'right' : 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: staleCount > 0 ? '#FB7185' : 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'يحتاج متابعة' : 'Follow-Up'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: staleCount > 0 ? '#FB7185' : '#FFFFFF', marginTop: '2px', display: 'block' }}>
              {staleCount}
            </strong>
          </div>
          <Flame size={16} style={{ color: staleCount > 0 ? '#FB7185' : 'rgba(255, 255, 255, 0.5)', opacity: 0.85 }} />
        </button>
      </div>

      {/* ─── Incoming Viewing Requests (Cal.com bookings awaiting action) ─── */}
      {viewingRequests.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: 'rgba(229, 184, 105, 0.07)',
          padding: '10px 18px',
          borderRadius: '14px',
          border: '1px solid rgba(229, 184, 105, 0.25)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
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
                  border: '1px solid rgba(229, 184, 105, 0.3)',
                  background: 'rgba(16, 20, 29, 0.85)',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span>{lead.name}</span>
                <span style={{ color: '#E5B869' }}>
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
        background: 'rgba(16, 20, 29, 0.75)',
        backdropFilter: 'blur(16px)',
        padding: '10px 18px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {/* Text Search */}
        <div style={{ flex: '1 1 260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '14px', color: '#E5B869', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'البحث باسم العميل، الهاتف، البريد، أو العقار...' : 'Search client name, phone, email, notes, property...'}
            style={{
              width: '100%',
              padding: isAr ? '9px 38px 9px 14px' : '9px 14px 9px 38px',
              fontSize: '13px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              outline: 'none',
              background: 'rgba(10, 13, 20, 0.8)',
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
            background: 'rgba(229, 184, 105, 0.12)',
            border: '1px solid rgba(229, 184, 105, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#E5B869'
          }}>
            <Filter size={12} />
            <span>Filter: {stageFilter === 'stale' ? 'Needs Attention' : stageFilter}</span>
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E5B869', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: 'rgba(10, 13, 20, 0.8)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
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
          background: 'rgba(16, 20, 29, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#E5B869', margin: '0 0 16px' }}>
            {isAr ? 'الطلبات المؤرشفة' : 'Archived Leads'} ({filteredArchivedLeads.length})
          </h2>

          {filteredArchivedLeads.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
              <Archive size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'rgba(229, 184, 105, 0.4)' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>{isAr ? 'لا توجد طلبات مؤرشفة' : 'No archived leads found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {filteredArchivedLeads.map((lead) => (
                <div key={lead.id} style={{
                  background: 'rgba(22, 28, 40, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#FFFFFF' }}>{lead.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.55)' }}>{lead.phone}</p>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.6)' }}>
                      {lead.stage || 'Archived'}
                    </span>
                  </div>

                  {lead.property && (
                    <div style={{ fontSize: '11px', color: '#E5B869', fontWeight: 600, background: 'rgba(229, 184, 105, 0.08)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(229, 184, 105, 0.2)' }}>
                      <Building2 size={11} style={{ display: 'inline', marginInlineEnd: '4px', color: '#E5B869' }} />
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
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#34D399',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
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
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(244, 63, 94, 0.12)',
                          color: '#FB7185',
                          border: '1px solid rgba(244, 63, 94, 0.25)',
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
        gridTemplateColumns: selectedLead ? '1fr 440px' : '1fr',
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
            gridTemplateColumns: selectedLead ? 'repeat(6, minmax(260px, 1fr))' : 'repeat(6, minmax(210px, 1fr))',
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
                  background: isHovered ? 'rgba(229, 184, 105, 0.05)' : 'rgba(16, 20, 29, 0.75)',
                  backdropFilter: 'blur(20px)',
                  borderTop: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : `2px solid ${stage.color}`,
                  borderRight: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderBottom: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderLeft: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '14px',
                  padding: '12px',
                  minHeight: '520px',
                  maxHeight: 'calc(100vh - 220px)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isHovered ? `0 8px 24px ${stage.glow}` : '0 4px 16px rgba(0,0,0,0.2)',
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
                  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stage.color }} />
                    <h3 style={{ fontSize: '12.5px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.01em' }}>
                      {isAr ? stage.ar : stage.en}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: `${stage.color}18`,
                    color: stage.color,
                    border: `1px solid ${stage.color}35`
                  }}>
                    {stage.items.length}
                  </span>
                </div>

                {/* Draggable Cards List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
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
                          borderStyle: 'solid',
                          borderWidth: '1px',
                          borderColor: isSelected
                            ? '#E5B869'
                            : (stale ? 'rgba(244, 63, 94, 0.35)' : 'rgba(255, 255, 255, 0.07)'),
                          ...(isAr
                            ? { borderRightWidth: '3px', borderRightColor: stage.color }
                            : { borderLeftWidth: '3px', borderLeftColor: stage.color }),
                          borderRadius: '10px',
                          padding: '11px',
                          background: isSelected
                            ? 'rgba(229, 184, 105, 0.08)'
                            : (stale ? 'rgba(244, 63, 94, 0.03)' : 'rgba(22, 28, 40, 0.85)'),
                          cursor: 'pointer',
                          opacity: isDraggingThis ? 0.35 : 1,
                          boxShadow: isSelected
                            ? '0 4px 16px rgba(229, 184, 105, 0.2)'
                            : '0 2px 8px rgba(0,0,0,0.15)',
                          transition: 'all 150ms ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '7px'
                        }}
                      >
                        {/* Avatar & Client Name & Attention Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: isSelected ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'rgba(229, 184, 105, 0.12)',
                              color: isSelected ? '#0A0C10' : '#E5B869',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 800,
                              flexShrink: 0,
                              border: `1px solid ${isSelected ? 'transparent' : 'rgba(229, 184, 105, 0.25)'}`
                            }}>
                              {initials}
                            </div>
                            <strong style={{
                              fontSize: '12.5px',
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
                              fontSize: '8.5px',
                              fontWeight: 800,
                              color: '#FB7185',
                              background: 'rgba(244, 63, 94, 0.12)',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}>
                              &gt;24h
                            </span>
                          )}
                        </div>

                        {/* Inquired Property Chip */}
                        <div style={{
                          fontSize: '10.5px',
                          color: '#E5B869',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(229, 184, 105, 0.06)',
                          border: '1px solid rgba(229, 184, 105, 0.16)',
                          padding: '4px 7px',
                          borderRadius: '6px'
                        }}>
                          <Building2 size={10} style={{ flexShrink: 0, color: '#E5B869' }} />
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

                            {/* WhatsApp with Pre-Filled Message to Client */}
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={isAr ? 'مراسلة العميل عبر واتساب' : 'Chat with Client on WhatsApp'}
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
            background: 'rgba(13, 19, 34, 0.96)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(221, 167, 82, 0.3)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(221, 167, 82, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
            scrollbarWidth: 'thin'
          }}>
            {/* Header: Lead Identity, Contact Details & Direct Actions */}
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {/* Client Avatar */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E5B869 0%, #B8860B 100%)',
                    color: '#0A0E18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(229, 184, 105, 0.35)',
                    flexShrink: 0
                  }}>
                    {selectedLead.name ? selectedLead.name.slice(0, 2).toUpperCase() : 'LD'}
                  </div>

                  {/* Name & Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      margin: 0,
                      color: '#FFFFFF',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {selectedLead.name}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <a
                        href={`tel:${selectedLead.phone}`}
                        style={{
                          color: '#E5B869',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          direction: 'ltr',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Phone size={10} style={{ opacity: 0.8 }} />
                        <span>{selectedLead.phone}</span>
                      </a>

                      {selectedLead.email && (
                        <div
                          style={{
                            color: 'rgba(255, 255, 255, 0.55)',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={selectedLead.email}
                        >
                          <span style={{ fontSize: '10px', opacity: 0.6 }}>✉️</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {/* Direct Phone Call Button */}
                  <a
                    href={`tel:${selectedLead.phone}`}
                    title={isAr ? 'اتصال هاتفي مباشر' : 'Direct Call'}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.85)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Phone size={12} />
                  </a>

                  {/* Direct WhatsApp with Client Button */}
                  <a
                    href={`https://wa.me/${formatInternationalWhatsAppNumber(selectedLead.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isAr ? 'محادثة واتساب مباشرة مع العميل' : 'Direct WhatsApp with Client'}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34D399',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <MessageCircle size={12} />
                  </a>

                  {/* Copy Contact Details Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const text = `👤 ${selectedLead.name}\n📞 ${selectedLead.phone}${selectedLead.email ? `\n✉️ ${selectedLead.email}` : ''}${selectedLead.property ? `\n🏡 ${selectedLead.property.title_en}` : ''}`;
                      navigator.clipboard.writeText(text);
                      toast.success(isAr ? 'تم نسخ بيانات العميل بنجاح' : 'Contact card copied to clipboard');
                    }}
                    title={isAr ? 'نسخ بيانات العميل' : 'Copy Contact Card'}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.85)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Copy size={12} />
                  </button>

                  {/* Notify Farid WhatsApp Button */}
                  <a
                    href={getNotifyFaridWhatsAppUrl({
                      name: selectedLead.name,
                      phone: selectedLead.phone,
                      email: selectedLead.email,
                      propertyTitle: cleanLeadData?.displayTitle || 'استفسار عام عن المشاريع الفاخرة',
                      notes: selectedLead.notes,
                      source: selectedLead.source,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isAr ? 'إرسال ملخص الطلب إلى واتساب زكريا فريد' : 'Forward lead summary to Farid Zakaria WhatsApp'}
                    style={{
                      height: '30px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: '8px',
                      padding: '0 8px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: 'rgba(229, 184, 105, 0.15)',
                      border: '1px solid rgba(229, 184, 105, 0.35)',
                      color: '#E5B869',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Send size={11} />
                    <span>{isAr ? 'إشعار' : 'Notify'}</span>
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
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Top Property Badge (if attached) */}
              {cleanLeadData?.primaryProp && (
                <div style={{
                  marginTop: '10px',
                  background: 'rgba(221, 167, 82, 0.08)',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(221, 167, 82, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Building2 size={14} style={{ color: '#E5B869', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cleanLeadData.displayTitle}
                    </span>
                  </div>
                  <Link
                    href={`/admin/${adminLocale}/properties/${cleanLeadData.primaryProp.id}/edit`}
                    target="_blank"
                    style={{ color: '#E5B869', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    <span>{isAr ? 'عرض' : 'View'}</span>
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              )}
            </div>

            {/* ─── Deal Stage Progression Stepper ─── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#E5B869', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'مسار تقدم الصفقة:' : 'Deal Stage Progression:'}
                </span>
                {selectedLead.stage === 'closed_lost' && (
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#F43F5E', background: 'rgba(244, 63, 94, 0.15)', padding: '2px 7px', borderRadius: '4px' }}>
                    {isAr ? 'صفقة ملغية 🔴' : 'Closed Lost 🔴'}
                  </span>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '3px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '3px',
                borderRadius: '10px',
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
                        padding: '5px 2px',
                        borderRadius: '6px',
                        fontSize: '9px',
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
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: isCurrent ? st.color : (isPassed ? `${st.color}40` : 'rgba(255, 255, 255, 0.1)'),
                        color: isCurrent ? '#0A0E18' : (isPassed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8.5px',
                        fontWeight: 900
                      }}>
                        {isPassed ? <Check size={9} strokeWidth={3} /> : st.num}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {isAr ? st.ar : st.en}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 1-Click Advance Button & Lost Switch */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
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
                      gap: '5px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      background: `linear-gradient(135deg, ${nextStageInfo.color} 0%, #0A0E18 180%)`,
                      border: `1px solid ${nextStageInfo.color}`,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <span>{isAr ? `نقل المرحلة إلى: ${nextStageInfo.ar}` : `Advance to: ${nextStageInfo.en}`}</span>
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
                  {selectedLead.stage === 'closed_lost' ? (isAr ? 'إعادة تنشيط 🔄' : 'Reactivate 🔄') : (isAr ? 'تعذر التعاقد 🔴' : 'Closed Lost 🔴')}
                </button>
              </div>
            </div>

            {/* ─── Hero Inquired Property Card ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isAr ? 'تفاصيل العقار المطلوب:' : 'Inquired Property:'}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {formatTimeAgo(selectedLead.created_at)}
                </span>
              </div>

              {cleanLeadData?.hasDirectProperty ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(10, 14, 24, 0.8) 100%)',
                  border: '1px solid rgba(221, 167, 82, 0.3)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
                }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Property Thumbnail */}
                    <img
                      src={cleanLeadData.propImage}
                      alt={cleanLeadData.displayTitle}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '10px',
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          background: 'rgba(229, 184, 105, 0.18)',
                          border: '1px solid rgba(229, 184, 105, 0.4)',
                          color: '#E5B869',
                          textTransform: 'uppercase'
                        }}>
                          🏷️ {isAr ? 'طلب استحواذ خاص' : 'Private Acquisition'}
                        </span>

                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34D399'
                        }}>
                          📱 {cleanLeadData.protocol}
                        </span>
                      </div>

                      {/* Property Title */}
                      <strong style={{ fontSize: '13.5px', color: '#FFFFFF', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cleanLeadData.displayTitle}
                      </strong>

                      {/* Location & Price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                        <span style={{ color: '#E5B869', fontWeight: 800 }}>
                          {cleanLeadData.propPrice ? `${Number(cleanLeadData.propPrice).toLocaleString()} EGP` : 'Price on Request'}
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>·</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cleanLeadData.propLocation}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Client Request Message */}
                  {cleanLeadData.clientMessage && (
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                        {isAr ? 'رسالة واستفسار العميل:' : 'Client Inquiry Note:'}
                      </span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#F1F5F9', lineHeight: 1.4, fontStyle: 'italic' }}>
                        &ldquo;{cleanLeadData.clientMessage}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* 1-Click WhatsApp Client Action & Live View */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    {(() => {
                      const intlPhone = formatInternationalWhatsAppNumber(selectedLead.phone);
                      const shareText = isAr
                        ? `مرحباً ${selectedLead.name}، بخصوص طلب الاستحواذ الخاص بك لعقار *${cleanLeadData.displayTitle}*:\n📍 الموقع: ${cleanLeadData.propLocation}\n💰 القيمة: ${cleanLeadData.propPrice ? `${Number(cleanLeadData.propPrice).toLocaleString()} ج.م` : 'معلنة'}\nمعك المهندس زكريا فريد لتنسيق كافة التفاصيل والخطوات التالية.`
                        : `Hello ${selectedLead.name}, regarding your acquisition inquiry on *${cleanLeadData.displayTitle}*:\n📍 Location: ${cleanLeadData.propLocation}\n💰 Price: ${cleanLeadData.propPrice ? `${Number(cleanLeadData.propPrice).toLocaleString()} EGP` : 'Declared'}\nEng. Farid Zakaria is at your service for next steps.`;
                      const waHref = `https://wa.me/${intlPhone}?text=${encodeURIComponent(shareText)}`;

                      return (
                        <>
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 800,
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: '#FFFFFF',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            <MessageCircle size={13} />
                            <span>{isAr ? 'محادثة العميل عبر واتساب' : 'WhatsApp Client'}</span>
                          </a>

                          {cleanLeadData.primaryProp && (
                            <Link
                              href={`/admin/${adminLocale}/properties/${cleanLeadData.primaryProp.id}/edit`}
                              target="_blank"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'rgba(255, 255, 255, 0.85)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={12} />
                              <span>{isAr ? 'العقار' : 'Property'}</span>
                            </Link>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* No Property Linked State */
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700 }}>
                      {isAr ? 'استشارة عقارية عامة (لم يتم ربط عقار محدد)' : 'General Advisory (No property linked yet)'}
                    </span>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34D399'
                    }}>
                      📱 {cleanLeadData?.protocol || 'WhatsApp'}
                    </span>
                  </div>

                  {cleanLeadData?.clientMessage && (
                    <div style={{
                      padding: '7px 9px',
                      borderRadius: '7px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '11px',
                      color: '#FFFFFF',
                      fontStyle: 'italic'
                    }}>
                      &ldquo;{cleanLeadData.clientMessage}&rdquo;
                    </div>
                  )}

                  {/* Attach property dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <select
                      value={selectedPropToAssociate}
                      onChange={(e) => setSelectedPropToAssociate(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '7px',
                        background: 'rgba(10, 14, 24, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '10.5px',
                        outline: 'none'
                      }}
                    >
                      <option value="">{isAr ? '-- ربط عقار من المحفظة بهذا العميل --' : '-- Link a Portfolio Property --'}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {isAr && p.title_ar ? p.title_ar : p.title_en} ({p.price_egp ? `${Number(p.price_egp).toLocaleString()} EGP` : 'Price on request'})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedPropToAssociate || isSaving}
                      onClick={async () => {
                        if (!selectedPropToAssociate || !selectedLead) return;
                        const matchedP = properties.find(p => p.id === selectedPropToAssociate);
                        if (!matchedP) return;
                        setIsSaving(true);
                        try {
                          const res = await updateLeadDetails(selectedLead.id, {
                            property_id: selectedPropToAssociate,
                          });
                          if (res.success) {
                            setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, property_id: selectedPropToAssociate, property: matchedP } : l));
                            setSelectedPropToAssociate('');
                            toast.success(isAr ? 'تم ربط العقار بالعميل' : 'Property linked to client');
                          }
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '7px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        background: selectedPropToAssociate ? '#E5B869' : 'rgba(255, 255, 255, 0.08)',
                        color: selectedPropToAssociate ? '#0A0E18' : 'rgba(255, 255, 255, 0.4)',
                        border: 'none',
                        cursor: selectedPropToAssociate ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isAr ? 'ربط' : 'Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Other Distinct Inquiries by the same client (if any) ─── */}
            {otherInquiries.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase' }}>
                  {isAr ? `عقارات سابقة استفسر عنها العميل (${otherInquiries.length}):` : `Previous Inquiries by Client (${otherInquiries.length}):`}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {otherInquiries.map((oth) => {
                    const intlPhone = formatInternationalWhatsAppNumber(selectedLead.phone);
                    const shareText = isAr
                      ? `مرحباً ${selectedLead.name}، بخصوص استفسارك السابق لعقار *${oth.title}*:\n📍 الموقع: ${oth.location}\nمعك المهندس زكريا فريد لمتابعة طلبكم.`
                      : `Hello ${selectedLead.name}, regarding your previous inquiry on *${oth.title}* in ${oth.location}...`;
                    const waHref = `https://wa.me/${intlPhone}?text=${encodeURIComponent(shareText)}`;

                    return (
                      <div
                        key={oth.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <img
                            src={oth.image}
                            alt={oth.title}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '11.5px', color: '#FFFFFF', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {oth.title}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.55)' }}>
                              {oth.location} · {formatTimeAgo(oth.date)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34D399',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            flexShrink: 0
                          }}
                        >
                          <MessageCircle size={10} />
                          <span>{isAr ? 'محادثة' : 'Chat'}</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Internal Advisor Notes & Quick Tags ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#E5B869', textTransform: 'uppercase' }}>
                  {isAr ? 'ملاحظات المستشار العقاري:' : 'Internal Advisor Notes:'}
                </span>
                {selectedLead.source && (
                  <span style={{ fontSize: '9.5px', color: 'rgba(255, 255, 255, 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {selectedLead.source}
                  </span>
                )}
              </div>

              {/* Quick Tags Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {[
                  { en: '#HighIntentVIP', ar: '#عميل_VIP' },
                  { en: '#WhatsAppPreferred', ar: '#مفضل_واتساب' },
                  { en: '#ImmediateViewing', ar: '#معاينة_عاجلة' },
                  { en: '#BudgetConfirmed', ar: '#الميزانية_مؤكدة' },
                  { en: '#FollowUpTomorrow', ar: '#متابعة_غداً' },
                  { en: '#CashReady', ar: '#كاش_جاهز' }
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const tagStr = isAr ? tag.ar : tag.en;
                      setDetailDraft(d => ({
                        ...d,
                        notes: d.notes ? `${d.notes}\n${tagStr}` : tagStr
                      }));
                      toast.success(isAr ? `تمت إضافة ${tagStr}` : `Added ${tagStr}`);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(221, 167, 82, 0.12)',
                      border: '1px solid rgba(221, 167, 82, 0.25)',
                      color: '#E5B869',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? tag.ar : tag.en}
                  </button>
                ))}
              </div>

              {/* Notes Textarea */}
              <textarea
                value={detailDraft.notes}
                onChange={(e) => setDetailDraft(d => ({ ...d, notes: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9px',
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  fontFamily: 'inherit',
                  background: 'rgba(10, 14, 24, 0.85)',
                  color: '#FFFFFF',
                  boxSizing: 'border-box',
                  outline: 'none',
                  lineHeight: '1.4'
                }}
                placeholder={isAr ? 'اكتب ملاحظات المكالمة ومتابعة العميل هنا...' : 'Log advisor notes, client feedback, or appointment details...'}
              />

              {/* Closed Lost Reason (if closed lost) */}
              {(selectedLead.stage === 'closed_lost' || detailDraft.lost_reason) && (
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#F43F5E', display: 'block', marginBottom: '3px' }}>
                    {isAr ? 'سبب عدم إتمام الصفقة:' : 'Closed Lost Reason:'}
                  </label>
                  <input
                    value={detailDraft.lost_reason}
                    onChange={(e) => setDetailDraft(d => ({ ...d, lost_reason: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: '7px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      background: 'rgba(244, 63, 94, 0.1)',
                      color: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder={isAr ? 'مثال: السعر، تفضيل موقع آخر، تأجيل الشراء...' : 'Reason (e.g. Budget, Location change, Postponed)...'}
                  />
                </div>
              )}
            </div>

            {/* ─── Footer Action Bar ─── */}
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => void handleSaveDetails()}
                disabled={isSaving}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '9px 14px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
                  color: '#0A0E18',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 12px rgba(221, 167, 82, 0.35)'
                }}
              >
                <Save size={13} />
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
                  padding: '9px 10px',
                  borderRadius: '9px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer'
                }}
              >
                {selectedLead.is_archived ? <RotateCcw size={13} /> : <Archive size={13} />}
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
                  padding: '9px 10px',
                  borderRadius: '9px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#FB7185',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={13} />
              </button>
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
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)", fontWeight: 800, color: '#FFFFFF' }}>
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
                    placeholder={isAr ? 'مثال: حسام حسن' : 'e.g. Hossam Hassan'}
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
                    dir="ltr"
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
                    dir="ltr"
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
                  placeholder={isAr ? 'مثال: اتصال مباشر، واتساب، إحالة عميل...' : 'Direct Call, WhatsApp, Referral...'}
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
                  placeholder={isAr ? 'الميزانية المتاحة، المنطقة المفضلة، الجدول الزمني للشراء...' : 'Client budget, location preferences, timeline...'}
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
