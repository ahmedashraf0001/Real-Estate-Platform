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
import { NewContractWizardModal, NewContractWizardPayload } from '@/components/admin/erp/v2/modals/NewContractWizardModal';
import { ContractsEngine } from '@/lib/erp/contracts';
import { GeneralLedgerEngine } from '@/lib/erp/ledger';
import { ERPSupabaseService } from '@/lib/erp/supabaseService';
import { createClient } from '@/lib/supabase/client';
import { generateUUID, D } from '@/lib/erp/math';
import { ERPAccountingPeriod } from '@/lib/erp/types';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';

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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const readTheme = () => {
      const cur = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ||
        (localStorage.getItem('zf_theme') as 'dark' | 'light') || 'dark';
      setTheme(cur);
    };
    readTheme();
    const obs = new MutationObserver(readTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const isLight = theme === 'light';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  const defaultActivePeriod: ERPAccountingPeriod = useMemo(() => ({
    period_id: 'PRD-2026-FY',
    fiscal_year: 2026,
    period_number: 1,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'OPEN'
  }), []);

  const handleContractCreatedFromLead = async (payload: NewContractWizardPayload) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const contractId = generateUUID();
      const contractValue = D(payload.totalNominalValue || payload.basePrice).toFixed(2);
      const contractNumber = `ZF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const dpDec = D(payload.downPaymentAmount || 0);
      let effectiveDpPct = D(contractValue).gt(0) ? dpDec.div(D(contractValue)).toFixed(4) : '0.15';
      let effectiveNumInstallments = payload.numInstallments || 0;
      let intervalMonths: number | string = payload.installmentFrequency || 'QUARTERLY';
      if (payload.paymentPlanType === 'FULL_CASH') {
        effectiveDpPct = '1.00';
        effectiveNumInstallments = 0;
      }

      const schedules = ContractsEngine.generateSchedule(
        contractId,
        contractValue,
        effectiveDpPct,
        effectiveNumInstallments,
        payload.firstPaymentDate,
        intervalMonths,
        payload.firstInstallmentDueDate
      );
      const dpSchedule = schedules[0];
      const dpAmount = dpSchedule ? dpSchedule.nominal_value : '0.00';

      const dpEntry = (dpSchedule && D(dpAmount).gt(0))
        ? GeneralLedgerEngine.validateAndCreateEntry({
            entry_number: `JE-NEW-${contractNumber}`,
            entry_date: payload.firstPaymentDate,
            period: defaultActivePeriod,
            description: `تحصيل دفعة الحجز والمقدم النقدي للعقد ${contractNumber} (${payload.buyerName})`,
            source_module: 'SALES',
            source_entity_id: contractId,
            created_by: 'CFO_FARID',
            lines: [
              {
                account_code: payload.destinationTreasury === 'BANK_102000' || payload.destinationTreasury === '102000' ? '102000' : '101000',
                debit_amount: D(dpAmount).toFixed(2),
                credit_amount: '0.00',
                memo: isAr ? 'استلام دفعة الحجز والمقدم النقدي بالخزينة' : 'Down payment receipt in treasury'
              },
              {
                account_code: '203000',
                debit_amount: '0.00',
                credit_amount: D(dpAmount).toFixed(2),
                memo: isAr ? 'إثبات دفعة الحجز كإيراد تعاقدي مؤجل حتى التسليم' : 'Credit to deferred revenue'
              }
            ]
          })
        : undefined;

      const contractData = {
        contract_id: contractId,
        contract_number: contractNumber,
        contract_date: payload.firstPaymentDate,
        property_id: payload.propertyId === 'custom_unit' ? undefined : payload.propertyId,
        building_unit_id: payload.buildingUnitId || undefined,
        buyer_name: payload.buyerName,
        buyer_national_id: payload.buyerNationalId || 'N/A',
        buyer_phone: payload.buyerPhone || '',
        buyer_email: payload.buyerEmail || '',
        gross_contract_value: contractValue,
        total_cash_collected: dpAmount,
        status: 'Active' as const,
        handover_status: 'Pending' as const,
        partner_splits: payload.partnerSplits,
        notes: `عقد بيع تم تحويله آلياً من عميل مهتم #${convertingLead?.id || ''}`
      };

      await ERPSupabaseService.persistNewContract(supabase, contractData as any, schedules, dpEntry);

      if (convertingLead) {
        await updateLeadStage(convertingLead.id, 'closed_won');
        setLeads(prev => prev.map(l => l.id === convertingLead.id ? { ...l, stage: 'closed_won', stage_updated_at: new Date().toISOString() } : l));
      }

      toast.success(
        isAr ? `🎉 تم تحويل العميل إلى عقد بيع بنجاح! رقم العقد: ${contractNumber}` : `🎉 Lead converted to Contract ${contractNumber}!`,
        {
          description: isAr ? 'تم اعتماد العقد وترحيل دفعة الحجز وتحديث مرحلة العميل إلى تم التعاقد ✨' : 'Contract executed and lead moved to Closed Won ✨'
        }
      );
      setConvertingLead(null);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Unknown error';
      console.error('Error converting lead to contract:', err);
      toast.error(isAr ? `حدث خطأ أثناء تحويل العميل إلى عقد: ${msg}` : `Failed to convert lead: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

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
        background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.85))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
        boxShadow: 'var(--admin-card-shadow, 0 8px 32px rgba(0, 0, 0, 0.4))',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)', letterSpacing: '-0.02em' }}>
              {isAr ? 'إدارة العملاء والمبيعات (CRM)' : 'CRM Lead Pipeline'}
            </h1>
            <p style={{ margin: '3px 0 0', color: 'var(--admin-text-muted, rgba(255, 255, 255, 0.6))', fontSize: '12.5px', fontWeight: 500 }}>
              {isAr
                ? 'لوحة إدارة مسار الصفقات ومتابعة العملاء الفوري'
                : 'Interactive sales pipeline & deal progression studio.'}
            </p>
          </div>

          {/* View Tab Switcher & Auto-Archive Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-input-bg, rgba(255, 255, 255, 0.04))', padding: '3px', borderRadius: '10px', border: '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))' }}>
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
                  color: activeTab === 'pipeline' ? '#0A0C10' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.65))',
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
                  color: activeTab === 'archived' ? '#0A0C10' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.65))',
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
                background: autoArchiveOnClose ? 'rgba(16, 185, 129, 0.1)' : 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.04))',
                border: autoArchiveOnClose ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
                color: autoArchiveOnClose ? '#34D399' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))',
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
            background: stageFilter === 'new' ? 'rgba(229, 184, 105, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'new' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'new' ? 'var(--admin-gold-primary, #E5B869)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'طلبات جديدة' : 'New Inquiries'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
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
            background: stageFilter === 'contacted' ? 'rgba(229, 184, 105, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'contacted' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'contacted' ? 'var(--admin-gold-primary, #E5B869)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'تم التواصل' : 'Contacted'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
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
            background: stageFilter === 'viewing_scheduled' ? 'rgba(229, 184, 105, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'viewing_scheduled' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'viewing_scheduled' ? 'var(--admin-gold-primary, #E5B869)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'معاينات مجدولة' : 'Viewings'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
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
            background: stageFilter === 'negotiating' ? 'rgba(229, 184, 105, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'negotiating' ? '1px solid rgba(229, 184, 105, 0.45)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: stageFilter === 'negotiating' ? 'var(--admin-gold-primary, #E5B869)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'جاري التفاوض' : 'Negotiating'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
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
            background: stageFilter === 'closed_won' ? 'rgba(16, 185, 129, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'closed_won' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
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
            <strong style={{ fontSize: '18px', fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
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
            background: stageFilter === 'stale' ? 'rgba(244, 63, 94, 0.12)' : 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
            backdropFilter: 'blur(16px)',
            border: stageFilter === 'stale' ? '1px solid rgba(244, 63, 94, 0.35)' : (staleCount > 0 ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))'),
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
            <span style={{ fontSize: '10px', fontWeight: 800, color: staleCount > 0 ? '#FB7185' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.55))', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
              {isAr ? 'يحتاج متابعة' : 'Follow-Up'}
            </span>
            <strong style={{ fontSize: '18px', fontWeight: 800, color: staleCount > 0 ? '#FB7185' : 'var(--admin-text-title, #FFFFFF)', marginTop: '2px', display: 'block' }}>
              {staleCount}
            </strong>
          </div>
          <Flame size={16} style={{ color: staleCount > 0 ? '#FB7185' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.5))', opacity: 0.85 }} />
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
        background: 'var(--admin-card-bg, rgba(16, 20, 29, 0.75))',
        backdropFilter: 'blur(16px)',
        padding: '10px 18px',
        borderRadius: '14px',
        border: '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.08))',
        boxShadow: 'var(--admin-card-shadow, none)'
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
              border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.1))',
              borderRadius: '10px',
              outline: 'none',
              background: 'var(--admin-input-bg, rgba(10, 13, 20, 0.8))',
              color: 'var(--admin-text-title, #FFFFFF)',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', [isAr ? 'left' : 'right']: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted, rgba(255, 255, 255, 0.5))' }}
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
            color: 'var(--admin-gold-primary, #E5B869)'
          }}>
            <Filter size={12} />
            <span>Filter: {stageFilter === 'stale' ? 'Needs Attention' : stageFilter}</span>
            <button
              type="button"
              onClick={() => setStageFilter('all')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-gold-primary, #E5B869)', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} style={{ color: 'var(--admin-text-muted, rgba(255, 255, 255, 0.5))' }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: 'var(--admin-input-bg, rgba(10, 13, 20, 0.8))',
              color: 'var(--admin-text-title, #FFFFFF)',
              border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.1))',
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
                  background: 'var(--admin-card-bg, rgba(22, 28, 40, 0.85))',
                  border: '1px solid var(--admin-card-border, #CBD5E1)',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--admin-text-title, #FFFFFF)' }}>{lead.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--admin-text-muted, #475569)', fontWeight: 600 }}>{lead.phone}</p>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.06))', color: 'var(--admin-text-muted, #475569)' }}>
                      {lead.stage || 'Archived'}
                    </span>
                  </div>

                  {lead.property && (
                    <div style={{ fontSize: '11px', color: 'var(--admin-gold-primary, #946F23)', fontWeight: 600, background: 'rgba(197, 160, 89, 0.08)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(197, 160, 89, 0.25)' }}>
                      <Building2 size={11} style={{ display: 'inline', marginInlineEnd: '4px', color: 'var(--admin-gold-primary, #946F23)' }} />
                      {isAr && lead.property.title_ar ? lead.property.title_ar : lead.property.title_en}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed var(--admin-card-border, #CBD5E1)', marginTop: 'auto' }}>
                    <span style={{ fontSize: '10.5px', color: 'var(--admin-text-muted, #475569)', fontWeight: 600 }}>{formatTimeAgo(lead.created_at)}</span>
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
                          background: 'var(--admin-success-bg, rgba(4, 120, 87, 0.08))',
                          color: 'var(--admin-success-text, #047857)',
                          border: '1px solid var(--admin-success-border, rgba(4, 120, 87, 0.25))',
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
        gridTemplateColumns: selectedLead ? (isMobile ? '1fr' : '1fr 440px') : '1fr',
        gap: '16px',
        alignItems: 'stretch',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        flex: 1,
        transition: 'grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Horizontal Kanban Columns Container */}
        <div
          ref={kanbanRef}
          onDragOver={handleKanbanDragOver}
          style={{
            display: 'grid',
            gridTemplateColumns: selectedLead ? (isMobile ? 'repeat(6, minmax(240px, 1fr))' : 'repeat(6, minmax(260px, 1fr))') : 'repeat(6, minmax(210px, 1fr))',
            gap: '12px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
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
                  background: isHovered ? 'var(--admin-gold-glow, rgba(229, 184, 105, 0.05))' : 'var(--admin-card-bg-subtle, rgba(16, 20, 29, 0.75))',
                  backdropFilter: 'blur(20px)',
                  borderTop: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : `2px solid ${stage.color}`,
                  borderRight: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid var(--admin-card-border, #CBD5E1)',
                  borderBottom: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid var(--admin-card-border, #CBD5E1)',
                  borderLeft: isHovered ? '2px dashed rgba(229, 184, 105, 0.6)' : '1px solid var(--admin-card-border, #CBD5E1)',
                  borderRadius: '14px',
                  padding: '12px',
                  minHeight: '520px',
                  maxHeight: 'calc(100vh - 220px)',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isHovered ? `0 8px 24px ${stage.glow}` : 'var(--admin-card-shadow, 0 4px 16px rgba(0,0,0,0.2))',
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
                  borderBottom: '1px solid var(--admin-card-border, #CBD5E1)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stage.color }} />
                    <h3 style={{ fontSize: '12.5px', fontWeight: 800, margin: 0, color: 'var(--admin-text-title, #FFFFFF)', letterSpacing: '0.01em' }}>
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
                    const cardProp = lead.property_id ? properties.find(p => p.id === lead.property_id) : (lead.property ? properties.find(p => p.id === lead.property!.id) : undefined);
                    const cardPrice = (lead.property as any)?.price_egp ?? cardProp?.price_egp;
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
                            ? 'var(--admin-gold-primary, #E5B869)'
                            : (stale ? 'rgba(244, 63, 94, 0.35)' : 'var(--admin-card-border, #CBD5E1)'),
                          ...(isAr
                            ? { borderRightWidth: '3px', borderRightColor: stage.color }
                            : { borderLeftWidth: '3px', borderLeftColor: stage.color }),
                          borderRadius: '10px',
                          padding: '11px',
                          background: isSelected
                            ? 'rgba(229, 184, 105, 0.12)'
                            : (stale ? 'rgba(244, 63, 94, 0.05)' : 'var(--admin-card-bg, rgba(22, 28, 40, 0.85))'),
                          cursor: 'pointer',
                          opacity: isDraggingThis ? 0.35 : 1,
                          boxShadow: isSelected
                            ? '0 4px 16px rgba(229, 184, 105, 0.2)'
                            : 'var(--admin-card-shadow, 0 2px 8px rgba(0,0,0,0.15))',
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
                              color: isSelected ? '#0A0C10' : 'var(--admin-gold-primary, #E5B869)',
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
                            <strong
                              dir="auto"
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: 'var(--admin-text-title, #FFFFFF)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                unicodeBidi: 'plaintext'
                              }}>
                              {lead.name}
                            </strong>
                          </div>

                          {stale && (
                            <span
                              dir="ltr"
                              style={{
                                fontSize: '8.5px',
                                fontWeight: 800,
                                color: '#FB7185',
                                background: 'rgba(244, 63, 94, 0.12)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                flexShrink: 0,
                                unicodeBidi: 'isolate'
                              }}>
                              &gt;24h
                            </span>
                          )}
                        </div>

                        {/* Inquired Property Chip */}
                        <div style={{
                          fontSize: '10.5px',
                          color: 'var(--admin-gold-primary, #946F23)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '5px',
                          background: 'rgba(197, 160, 89, 0.08)',
                          border: '1px solid rgba(197, 160, 89, 0.25)',
                          padding: '4px 7px',
                          borderRadius: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                            <Building2 size={10} style={{ flexShrink: 0, color: 'var(--admin-gold-primary, #946F23)' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {propTitle || (isAr ? 'استفسار عام' : 'General Inquiry')}
                            </span>
                          </div>
                          {cardPrice ? (
                            <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '10.5px', color: 'var(--admin-text-title, #0F172A)' }}>
                              {Number(cardPrice).toLocaleString('en-US')}{' '}
                              <span style={{ color: '#946F23', fontSize: '9px', fontWeight: 700 }}>{isAr ? 'ج.م' : 'EGP'}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Card Footer: Time ago & Subtle Quick Icon Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--admin-text-muted, #475569)', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed var(--admin-card-border, #CBD5E1)' }}>
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
                                background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.06))',
                                border: '1px solid var(--admin-card-border, #CBD5E1)',
                                color: 'var(--admin-text-body, #334155)',
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
                                background: 'var(--admin-success-bg, rgba(4, 120, 87, 0.08))',
                                border: '1px solid var(--admin-success-border, rgba(4, 120, 87, 0.25))',
                                color: 'var(--admin-success-text, #047857)',
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
                                  border: '1px solid var(--admin-card-border, #CBD5E1)',
                                  color: 'var(--admin-gold-primary, #DDA752)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <ArrowUpRight size={12} />
                              </Link>
                            )}

                            {/* Convert to Contract Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingLead(lead);
                              }}
                              title={isAr ? 'تحويل إلى عقد بيع' : 'Convert to Sales Contract'}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'rgba(229, 184, 105, 0.18)',
                                border: '1px solid rgba(229, 184, 105, 0.45)',
                                color: 'var(--admin-gold-primary, #E5B869)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <FileText size={11} />
                            </button>

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
                                background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.04))',
                                border: '1px solid var(--admin-card-border, #CBD5E1)',
                                color: 'var(--admin-text-muted, #475569)',
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
                </div>

                  {stage.items.length === 0 && (
                    <div style={{
                      padding: '32px 8px',
                      textAlign: 'center',
                      color: 'var(--admin-text-muted, #475569)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: '1.5px dashed var(--admin-card-border, #CBD5E1)',
                      borderRadius: '12px',
                      background: 'var(--admin-dropzone-bg, rgba(0, 0, 0, 0.04))'
                    }}>
                      {isAr ? 'اسحب عميلاً إلى هنا' : 'Drop lead here'}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* ─── Dismissible Slide-Out Lead Dossier Drawer ─── */}
        {selectedLead && (
          <div style={{
            background: isLight ? 'var(--admin-drawer-bg, #FFFFFF)' : 'var(--admin-drawer-bg, rgba(13, 19, 34, 0.96))',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: isLight ? '1.5px solid var(--admin-card-border, #D8D2C4)' : '1px solid var(--admin-card-border, rgba(221, 167, 82, 0.3))',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: isLight ? '0 12px 36px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)' : 'var(--admin-card-shadow, 0 16px 48px rgba(0,0,0,0.6))',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: '100%',
            width: '100%',
            maxWidth: isMobile ? '100%' : '440px',
            boxSizing: 'border-box',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            overflowY: 'auto',
            maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
            scrollbarWidth: 'thin'
          }}>
            {/* Scoped style for notes textarea placeholder in light/dark mode */}
            <style dangerouslySetInnerHTML={{ __html: `
              .zf-lead-notes-area::placeholder {
                color: ${isLight ? '#64748B' : 'rgba(255, 255, 255, 0.4)'} !important;
                opacity: 1;
              }
            `}} />

            {/* Header: Lead Identity, Contact Details & Direct Actions (Decongested 3 Rows) */}
            <div style={{
              borderBottom: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid var(--admin-card-border-subtle, rgba(255, 255, 255, 0.08))',
              paddingBottom: '14px'
            }}>
              {/* Row 1: Identity & Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {/* Client Avatar (40px) */}
                  <div style={{
                    width: '40px',
                    height: '40px',
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

                  {/* Full Client Name & Language/Source Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      margin: 0,
                      color: isLight ? 'var(--admin-text-title, #0F172A)' : 'var(--admin-text-title, #FFFFFF)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3
                    }}>
                      {selectedLead.name}
                    </h3>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(229, 184, 105, 0.15)',
                      border: isLight ? '1px solid rgba(148, 111, 35, 0.25)' : '1px solid rgba(229, 184, 105, 0.35)',
                      color: isLight ? '#946F23' : '#E5B869',
                      whiteSpace: 'nowrap'
                    }}>
                      {selectedLead.source ? (selectedLead.source === 'Direct Phone Call' ? (isAr ? 'اتصال مباشر' : 'Direct Call') : selectedLead.source) : (isAr ? 'عربي' : 'EN')}
                    </span>
                  </div>
                </div>

                {/* [X] Close Drawer Button (32x32px) */}
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  title={isAr ? 'إغلاق لوحة العميل' : 'Close Dossier'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                    border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isLight ? '#475569' : 'rgba(255, 255, 255, 0.75)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Row 2: Contact Details */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '8px',
                paddingInlineStart: '2px'
              }}>
                <a
                  href={`tel:${selectedLead.phone}`}
                  style={{
                    color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    direction: 'ltr',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Phone size={12} style={{ opacity: 0.9 }} />
                  <span>{selectedLead.phone}</span>
                </a>

                {selectedLead.email && (
                  <div
                    style={{
                      color: isLight ? 'var(--admin-text-muted, #64748B)' : 'rgba(255, 255, 255, 0.55)',
                      fontSize: '11.5px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={selectedLead.email}
                  >
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>✉️</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.email}</span>
                  </div>
                )}
              </div>

              {/* Row 3: Spacious Action Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '12px',
                width: '100%'
              }}>
                {/* 1. Call Button */}
                <a
                  href={`tel:${selectedLead.phone}`}
                  title={isAr ? 'اتصال هاتفي مباشر' : 'Direct Call'}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                    border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isLight ? '#0F172A' : 'rgba(255, 255, 255, 0.9)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Phone size={12} />
                  <span>{isAr ? 'اتصال' : 'Call'}</span>
                </a>

                {/* 2. WhatsApp Button (Royal Emerald) */}
                <a
                  href={`https://wa.me/${formatInternationalWhatsAppNumber(selectedLead.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isAr ? 'محادثة واتساب مباشرة مع العميل' : 'Direct WhatsApp with Client'}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: isLight ? 'rgba(4, 120, 87, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                    border: isLight ? '1px solid rgba(4, 120, 87, 0.25)' : '1px solid rgba(16, 185, 129, 0.35)',
                    color: isLight ? '#047857' : '#34D399',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <MessageCircle size={12} />
                  <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                </a>

                {/* 3. Copy Details Button */}
                <button
                  type="button"
                  onClick={() => {
                    const text = `👤 ${selectedLead.name}\n📞 ${selectedLead.phone}${selectedLead.email ? `\n✉️ ${selectedLead.email}` : ''}${selectedLead.property ? `\n🏡 ${selectedLead.property.title_en}` : ''}`;
                    navigator.clipboard.writeText(text);
                    toast.success(isAr ? 'تم نسخ بيانات العميل بنجاح' : 'Contact card copied to clipboard');
                  }}
                  title={isAr ? 'نسخ بيانات العميل' : 'Copy Contact Card'}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                    border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: isLight ? '#0F172A' : 'rgba(255, 255, 255, 0.9)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Copy size={12} />
                  <span>{isAr ? 'نسخ' : 'Copy'}</span>
                </button>

                {/* 4. Notify Farid WhatsApp Button (Andalusian Gold) */}
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
                    flex: '1.3 1 0',
                    minWidth: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    background: isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(229, 184, 105, 0.15)',
                    border: isLight ? '1px solid rgba(148, 111, 35, 0.25)' : '1px solid rgba(229, 184, 105, 0.35)',
                    color: isLight ? '#946F23' : '#E5B869',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Send size={11} />
                  <span>{isAr ? 'إشعار زكريا فريد' : 'Notify'}</span>
                </a>
              </div>

              {/* Top Property Badge (if attached) */}
              {cleanLeadData?.primaryProp && (
                <div style={{
                  marginTop: '12px',
                  background: isLight ? 'rgba(148, 111, 35, 0.06)' : 'rgba(221, 167, 82, 0.08)',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  border: isLight ? '1px solid rgba(148, 111, 35, 0.2)' : '1px solid rgba(221, 167, 82, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Building2 size={14} style={{ color: isLight ? '#946F23' : '#E5B869', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isLight ? '#0F172A' : '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cleanLeadData.displayTitle}
                    </span>
                  </div>
                  <Link
                    href={`/admin/${adminLocale}/properties/${cleanLeadData.primaryProp.id}/edit`}
                    target="_blank"
                    style={{ color: isLight ? '#946F23' : '#E5B869', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}
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
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {isAr ? 'مسار تقدم الصفقة:' : 'Deal Stage Progression:'}
                </span>
                {selectedLead.stage === 'closed_lost' && (
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 800,
                    color: isLight ? '#E11D48' : '#F43F5E',
                    background: isLight ? '#FFF1F2' : 'rgba(244, 63, 94, 0.15)',
                    border: isLight ? '1px solid #FECDD3' : 'none',
                    padding: '2px 7px',
                    borderRadius: '4px'
                  }}>
                    {isAr ? 'صفقة ملغية 🔴' : 'Closed Lost 🔴'}
                  </span>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '3px',
                background: isLight ? 'var(--admin-card-bg-subtle, #F8FAFC)' : 'rgba(0, 0, 0, 0.25)',
                padding: '4px',
                borderRadius: '10px',
                border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {PROGRESSION_STAGES.map((st) => {
                  const currentStageKey = selectedLead.stage || 'new';
                  const currentIdx = PROGRESSION_STAGES.findIndex(s => s.key === currentStageKey);
                  const isCurrent = currentStageKey === st.key;
                  const isPassed = currentIdx > PROGRESSION_STAGES.findIndex(s => s.key === st.key);

                  let btnBg = 'transparent';
                  let btnBorder = '1px solid transparent';
                  let btnColor = isLight ? '#64748B' : 'rgba(255, 255, 255, 0.45)';
                  let circleBg = isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)';
                  let circleBorder = isLight ? '1px solid #D8D2C4' : 'none';
                  let circleColor = isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)';

                  if (isCurrent) {
                    btnBg = isLight ? 'rgba(148, 111, 35, 0.12)' : `${st.color}35`;
                    btnBorder = isLight ? '1.5px solid #946F23' : `1.5px solid ${st.color}`;
                    btnColor = isLight ? '#0F172A' : '#FFFFFF';
                    circleBg = isLight ? '#946F23' : st.color;
                    circleBorder = 'none';
                    circleColor = '#FFFFFF';
                  } else if (isPassed) {
                    btnBg = isLight ? 'rgba(4, 120, 87, 0.08)' : `${st.color}15`;
                    btnBorder = isLight ? '1px solid rgba(4, 120, 87, 0.25)' : '1px solid transparent';
                    btnColor = isLight ? '#047857' : st.color;
                    circleBg = isLight ? '#047857' : `${st.color}40`;
                    circleBorder = 'none';
                    circleColor = '#FFFFFF';
                  }

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
                        border: btnBorder,
                        background: btnBg,
                        color: btnColor,
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
                        background: circleBg,
                        border: circleBorder,
                        color: circleColor,
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
                      background: isLight
                        ? `linear-gradient(135deg, ${nextStageInfo.color} 0%, #85581A 100%)`
                        : `linear-gradient(135deg, ${nextStageInfo.color} 0%, #0A0E18 180%)`,
                      border: `1px solid ${nextStageInfo.color}`,
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      boxShadow: isLight ? '0 2px 8px rgba(148, 111, 35, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.3)'
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
                    background: selectedLead.stage === 'closed_lost'
                      ? (isLight ? '#F0F9FF' : 'rgba(56, 189, 248, 0.15)')
                      : (isLight ? '#FFF1F2' : 'rgba(244, 63, 94, 0.12)'),
                    border: selectedLead.stage === 'closed_lost'
                      ? (isLight ? '1px solid #BAE6FD' : '1px solid #38BDF8')
                      : (isLight ? '1px solid #FECDD3' : '1px solid rgba(244, 63, 94, 0.3)'),
                    color: selectedLead.stage === 'closed_lost'
                      ? (isLight ? '#0284C7' : '#38BDF8')
                      : (isLight ? '#E11D48' : '#FB7185'),
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedLead.stage === 'closed_lost' ? (isAr ? 'إعادة تنشيط 🔄' : 'Reactivate 🔄') : (isAr ? 'تعذر التعاقد 🔴' : 'Closed Lost 🔴')}
                </button>
              </div>

              {/* Direct Convert to Contract Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setConvertingLead(selectedLead)}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #E5B869 0%, #B8860B 100%)',
                  color: '#0A0E18',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(229, 184, 105, 0.35)'
                }}
              >
                <FileText size={15} style={{ color: '#0A0E18' }} />
                <span>{isAr ? 'تحويل إلى عقد بيع رسمي (إنشاء عقد جديد) ✍️' : 'Convert to Official Sales Contract ✍️'}</span>
              </button>
            </div>

            {/* ─── Hero Inquired Property Card ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isAr ? 'تفاصيل العقار المطلوب:' : 'Inquired Property:'}
                </span>
                <span style={{ fontSize: '10px', color: isLight ? 'var(--admin-text-muted, #64748B)' : 'rgba(255, 255, 255, 0.5)' }}>
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
                  background: isLight ? 'var(--admin-card-bg-subtle, #F8FAFC)' : 'var(--admin-card-bg, rgba(10, 14, 24, 0.8))',
                  border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid var(--admin-card-border, rgba(221, 167, 82, 0.3))',
                  boxShadow: isLight ? '0 2px 10px rgba(15, 23, 42, 0.04)' : 'var(--admin-card-shadow, 0 4px 16px rgba(0, 0, 0, 0.25))'
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
                        border: isLight ? '1px solid #D8D2C4' : '1px solid rgba(255, 255, 255, 0.15)'
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
                          background: isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(229, 184, 105, 0.18)',
                          border: isLight ? '1px solid rgba(148, 111, 35, 0.25)' : '1px solid rgba(229, 184, 105, 0.4)',
                          color: isLight ? '#946F23' : '#E5B869',
                          textTransform: 'uppercase'
                        }}>
                          🏷️ {isAr ? 'طلب استحواذ خاص' : 'Private Acquisition'}
                        </span>

                        {/* WhatsApp Protocol Badge (Royal Emerald) */}
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          background: isLight ? 'rgba(4, 120, 87, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                          border: isLight ? '1px solid rgba(4, 120, 87, 0.25)' : '1px solid rgba(16, 185, 129, 0.35)',
                          color: isLight ? '#047857' : '#34D399'
                        }}>
                          📱 {cleanLeadData.protocol}
                        </span>
                      </div>

                      {/* Property Title */}
                      <strong style={{ fontSize: '13.5px', color: isLight ? 'var(--admin-text-title, #0F172A)' : 'var(--admin-text-title, #FFFFFF)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cleanLeadData.displayTitle}
                      </strong>

                      {/* Location & Price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                        {cleanLeadData.propPrice ? (
                          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{ color: isLight ? '#0F172A' : 'var(--admin-text-title, #FFFFFF)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                              {Number(cleanLeadData.propPrice).toLocaleString('en-US')}
                            </span>
                            <span style={{ color: isLight ? '#946F23' : '#E5B869', fontWeight: 700 }}>
                              {isAr ? 'ج.م' : 'EGP'}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869', fontWeight: 700 }}>
                            {isAr ? 'السعر عند الطلب' : 'Price on Request'}
                          </span>
                        )}
                        <span style={{ color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)' }}>·</span>
                        <span style={{ color: isLight ? 'var(--admin-text-muted, #64748B)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.7))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                      background: isLight ? '#F1F5F9' : 'var(--admin-card-bg-subtle, rgba(0, 0, 0, 0.35))',
                      border: isLight ? '1px solid #E2E8F0' : '1px solid var(--admin-card-border-subtle, rgba(255, 255, 255, 0.08))',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: isLight ? 'var(--admin-text-muted, #64748B)' : 'var(--admin-text-muted, rgba(255, 255, 255, 0.5))', textTransform: 'uppercase' }}>
                        {isAr ? 'رسالة واستفسار العميل:' : 'Client Inquiry Note:'}
                      </span>
                      <p style={{ margin: 0, fontSize: '11.5px', color: isLight ? '#0F172A' : 'var(--admin-text-body, #F1F5F9)', lineHeight: 1.4, fontStyle: 'italic' }}>
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
                                background: isLight ? '#FFFFFF' : 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.06))',
                                border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.12))',
                                color: isLight ? '#0F172A' : 'var(--admin-text-body, rgba(255, 255, 255, 0.85))',
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
                  background: isLight ? 'var(--admin-card-bg-subtle, #F8FAFC)' : 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.03))',
                  border: isLight ? '1px dashed var(--admin-card-border, #D8D2C4)' : '1px dashed var(--admin-card-border, rgba(255, 255, 255, 0.15))',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11.5px', color: isLight ? 'var(--admin-text-title, #0F172A)' : 'var(--admin-text-title, rgba(255, 255, 255, 0.7))', fontWeight: 700 }}>
                      {isAr ? 'استشارة عقارية عامة (لم يتم ربط عقار محدد)' : 'General Advisory (No property linked yet)'}
                    </span>
                    {/* WhatsApp Protocol Badge (Royal Emerald) */}
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      background: isLight ? 'rgba(4, 120, 87, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                      border: isLight ? '1px solid rgba(4, 120, 87, 0.25)' : '1px solid rgba(16, 185, 129, 0.35)',
                      color: isLight ? '#047857' : '#34D399'
                    }}>
                      📱 {cleanLeadData?.protocol || 'WhatsApp'}
                    </span>
                  </div>

                  {cleanLeadData?.clientMessage && (
                    <div style={{
                      padding: '7px 9px',
                      borderRadius: '7px',
                      background: isLight ? '#F1F5F9' : 'var(--admin-card-bg-subtle, rgba(0, 0, 0, 0.3))',
                      border: isLight ? '1px solid #E2E8F0' : '1px solid var(--admin-card-border-subtle, rgba(255, 255, 255, 0.06))',
                      fontSize: '11px',
                      color: isLight ? '#0F172A' : 'var(--admin-text-body, #FFFFFF)',
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
                        background: isLight ? '#FFFFFF' : 'var(--admin-input-bg, rgba(10, 14, 24, 0.9))',
                        border: isLight ? '1px solid #D8D2C4' : '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                        color: isLight ? '#0F172A' : 'var(--admin-text-title, #FFFFFF)',
                        fontSize: '10.5px',
                        outline: 'none'
                      }}
                    >
                      <option value="">{isAr ? '-- ربط عقار من المحفظة بهذا العميل --' : '-- Link a Portfolio Property --'}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {isAr && p.title_ar ? p.title_ar : p.title_en} ({p.price_egp ? `${Number(p.price_egp).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : (isAr ? 'السعر عند الطلب' : 'Price on request')})
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
                        background: selectedPropToAssociate ? (isLight ? 'linear-gradient(135deg, #946F23 0%, #B8860B 100%)' : '#E5B869') : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)'),
                        color: selectedPropToAssociate ? '#FFFFFF' : (isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'),
                        border: selectedPropToAssociate ? 'none' : (isLight ? '1px solid #E2E8F0' : 'none'),
                        cursor: selectedPropToAssociate ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                        boxShadow: (selectedPropToAssociate && isLight) ? '0 2px 6px rgba(148, 111, 35, 0.25)' : 'none'
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
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869', textTransform: 'uppercase' }}>
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
                          background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                          border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <img
                            src={oth.image}
                            alt={oth.title}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: isLight ? '1px solid #D8D2C4' : 'none'
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '11.5px', color: isLight ? 'var(--admin-text-title, #0F172A)' : '#FFFFFF', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {oth.title}
                            </strong>
                            <span style={{ fontSize: '10px', color: isLight ? 'var(--admin-text-muted, #64748B)' : 'rgba(255, 255, 255, 0.55)' }}>
                              {oth.location} · {formatTimeAgo(oth.date)}
                            </span>
                          </div>
                        </div>

                        {/* WhatsApp Action Button (Royal Emerald) */}
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            background: isLight ? 'rgba(4, 120, 87, 0.08)' : 'rgba(16, 185, 129, 0.15)',
                            border: isLight ? '1px solid rgba(4, 120, 87, 0.25)' : '1px solid rgba(16, 185, 129, 0.35)',
                            color: isLight ? '#047857' : '#34D399',
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
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: isLight ? 'var(--admin-gold-primary, #946F23)' : '#E5B869', textTransform: 'uppercase' }}>
                  {isAr ? 'ملاحظات المستشار العقاري:' : 'Internal Advisor Notes:'}
                </span>
                {selectedLead.source && (
                  <span style={{ fontSize: '9.5px', color: isLight ? 'var(--admin-text-muted, #64748B)' : 'rgba(255, 255, 255, 0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
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
                      background: isLight ? 'rgba(148, 111, 35, 0.08)' : 'rgba(221, 167, 82, 0.12)',
                      border: isLight ? '1px solid rgba(148, 111, 35, 0.25)' : '1px solid rgba(221, 167, 82, 0.25)',
                      color: isLight ? '#946F23' : '#E5B869',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? tag.ar : tag.en}
                  </button>
                ))}
              </div>

              {/* Notes Textarea */}
              <textarea
                className="zf-lead-notes-area"
                value={detailDraft.notes}
                onChange={(e) => setDetailDraft(d => ({ ...d, notes: e.target.value }))}
                rows={3}
                style={{
                  width: '100%',
                  border: isLight ? '1px solid #D8D2C4' : '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: '9px',
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  fontFamily: 'inherit',
                  background: isLight ? '#FFFFFF' : 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                  color: isLight ? '#0F172A' : 'var(--admin-text-title, #FFFFFF)',
                  boxSizing: 'border-box',
                  outline: 'none',
                  lineHeight: '1.4'
                }}
                placeholder={isAr ? 'اكتب ملاحظات المكالمة ومتابعة العميل هنا...' : 'Log advisor notes, client feedback, or appointment details...'}
              />

              {/* Closed Lost Reason (if closed lost) */}
              {(selectedLead.stage === 'closed_lost' || detailDraft.lost_reason) && (
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: isLight ? '#E11D48' : '#F43F5E', display: 'block', marginBottom: '3px' }}>
                    {isAr ? 'سبب عدم إتمام الصفقة:' : 'Closed Lost Reason:'}
                  </label>
                  <input
                    value={detailDraft.lost_reason}
                    onChange={(e) => setDetailDraft(d => ({ ...d, lost_reason: e.target.value }))}
                    style={{
                      width: '100%',
                      border: isLight ? '1px solid #FECDD3' : '1px solid rgba(244, 63, 94, 0.35)',
                      borderRadius: '7px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      background: isLight ? '#FFF1F2' : 'rgba(244, 63, 94, 0.1)',
                      color: isLight ? '#0F172A' : 'var(--admin-text-title, #FFFFFF)',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder={isAr ? 'مثال: السعر، تفضيل موقع آخر، تأجيل الشراء...' : 'Reason (e.g. Budget, Location change, Postponed)...'}
                  />
                </div>
              )}
            </div>

            {/* ─── Footer Action Bar ─── */}
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                  background: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                  color: isLight ? '#0F172A' : 'rgba(255, 255, 255, 0.8)',
                  border: isLight ? '1px solid var(--admin-card-border, #D8D2C4)' : '1px solid rgba(255, 255, 255, 0.12)',
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
                  background: isLight ? '#FFF1F2' : 'rgba(244, 63, 94, 0.12)',
                  color: isLight ? '#E11D48' : '#FB7185',
                  border: isLight ? '1px solid #FECDD3' : '1px solid rgba(244, 63, 94, 0.3)',
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
            background: 'var(--admin-modal-bg, var(--admin-card-bg, #0D1322))',
            backdropFilter: 'blur(24px)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: 'var(--admin-card-shadow, 0 25px 60px rgba(0, 0, 0, 0.6))',
            border: '1px solid var(--admin-card-border, rgba(221, 167, 82, 0.3))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontFamily: "var(--font-sans, 'ThmanyahSans', 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif)", fontWeight: 800, color: 'var(--admin-text-title, #FFFFFF)' }}>
                  {isAr ? 'إضافة عميل جديد يدوي' : 'Register Manual Inquiry'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--admin-text-muted, rgba(255, 255, 255, 0.6))', fontSize: '12.5px' }}>
                  {isAr ? 'سجل اتصالات هاتفية، رسائل واتساب، أو زيارات مباشرة للمكتب' : 'Record a direct phone call, WhatsApp lead, or office walk-in.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted, rgba(255, 255, 255, 0.6))', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                    {isAr ? 'اسم العميل *' : 'Client Name *'}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                      color: 'var(--admin-text-title, #FFFFFF)',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder={isAr ? 'مثال: حسام حسن' : 'e.g. Hossam Hassan'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                    {isAr ? 'رقم الهاتف *' : 'Phone Number *'}
                  </label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                      color: 'var(--admin-text-title, #FFFFFF)',
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
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                      color: 'var(--admin-text-title, #FFFFFF)',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    placeholder="client@domain.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                    {isAr ? 'العقار المرتبط' : 'Related Property'}
                  </label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
                    style={{
                      width: '100%',
                      border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      background: 'var(--admin-input-bg, #0D1322)',
                      color: 'var(--admin-text-title, #FFFFFF)',
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
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                  {isAr ? 'مصدر الطلب' : 'Lead Source'}
                </label>
                <input
                  value={form.source}
                  onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                  style={{
                    width: '100%',
                    border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    background: 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                    color: 'var(--admin-text-title, #FFFFFF)',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  placeholder={isAr ? 'مثال: اتصال مباشر، واتساب، إحالة عميل...' : 'Direct Call, WhatsApp, Referral...'}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', color: 'var(--admin-text-body, rgba(255, 255, 255, 0.85))' }}>
                  {isAr ? 'ملاحظات أولية ومواصفات الطلب' : 'Initial Notes & Requirements'}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    border: '1px solid var(--admin-input-border, rgba(255, 255, 255, 0.12))',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    background: 'var(--admin-input-bg, rgba(10, 14, 24, 0.85))',
                    color: 'var(--admin-text-title, #FFFFFF)',
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
                    border: '1px solid var(--admin-card-border, rgba(255, 255, 255, 0.12))',
                    background: 'var(--admin-card-bg-subtle, rgba(255, 255, 255, 0.05))',
                    color: 'var(--admin-text-body, rgba(255, 255, 255, 0.75))',
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

      {/* Convert Lead to Contract Wizard Modal */}
      {convertingLead && (
        <NewContractWizardModal
          isOpen={!!convertingLead}
          onClose={() => setConvertingLead(null)}
          initialPropertyId={convertingLead.property_id || undefined}
          initialBuyerName={convertingLead.name || ''}
          initialBuyerPhone={convertingLead.phone || ''}
          initialBuyerEmail={convertingLead.email || ''}
          initialLeadId={convertingLead.id}
          properties={properties}
          contracts={[]}
          leads={leads}
          activePeriod={defaultActivePeriod}
          unifiedPartners={[{ name: PRIMARY_DEVELOPER_NAME, role: 'PRIMARY_DEVELOPER' }]}
          isMutating={isSaving}
          isAr={isAr}
          onContractCreated={handleContractCreatedFromLead}
        />
      )}
    </div>
  );
}
