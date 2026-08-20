'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Loader2, Save, Trash2, Upload, X, Layers, Image as ImageIcon, ChevronRight, ChevronLeft, Check, Eye, MapPin, Building2, Sparkles, FileText, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import FinishingWizard from './FinishingWizard';
import CADBlueprintBuilder from './CADBlueprintBuilder';
import ZoneInspector from './ZoneInspector';
import DynamicMapPicker from './DynamicMapPicker';
import styles from './AdminPropertyForm.module.css';
import { saveProperty } from '@/app/actions/properties';
import { getZoneTemplateLabels, getTradeTemplateLabels, getZoneBadge, buildZoneInstances } from '@/lib/layering';
import { FALLBACK_ZONE_TITLES, fallbackMetricFor } from '@/lib/layering/zoneMetrics';
import type { ZoneInstance } from '@/lib/layering';
import type { Property } from '@/lib/supabase/types';


const TRADE_STATUS_MAP: Record<string, { en: string; ar: string }> = {
  NotStarted:    { en: 'Not Started',     ar: 'لم يبدأ' },
  RoughIn:       { en: 'Rough-In',        ar: 'تمديدات خام' },
  Finished:      { en: 'Finished',        ar: 'مكتمل' },
  ConduitsOnly:  { en: 'Conduits Only',   ar: 'مواسير فقط' },
  Wired:         { en: 'Wired',           ar: 'أسلاك' },
  RedBrick:      { en: 'Red Brick',       ar: 'طوب أحمر' },
  Plastered:     { en: 'Plastered',       ar: 'محارة' },
  Tiled:         { en: 'Tiled',           ar: 'سيراميك' },
  FinalPaint:    { en: 'Final Paint',     ar: 'دهان نهائي' },
  Putty:         { en: 'Putty',           ar: 'معجون' },
  SandBed:       { en: 'Sand Bed',        ar: 'رملة' },
  None:          { en: 'None',            ar: 'لا يوجد' },
  Installed:     { en: 'Installed',       ar: 'مركب' },
};

function formatStatus(status: string, isAr: boolean) {
  const item = TRADE_STATUS_MAP[status];
  if (item) return isAr ? item.ar : item.en;
  return status.replace(/([A-Z])/g, ' $1').trim();
}

const CATEGORY_BUCKETS: Array<{
  key: string;
  en: string;
  ar: string;
  emoji: string;
  match: (id: string, label?: string) => boolean;
}> = [
  {
    key: 'living',
    en: 'Living & Reception Areas',
    ar: 'المساحات المعيشية والاستقبال',
    emoji: '🛋️',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('reception') || text.includes('living') || text.includes('dining') || text.includes('corridor') || text.includes('entrance') || text.includes('foyer') || text.includes('salon') || text.includes('office') || text.includes('storage') || text.includes('مساحات') || text.includes('معيشة') || text.includes('استقبال') || text.includes('مكتب') || text.includes('مخزن');
    },
  },
  {
    key: 'bedrooms',
    en: 'Bedrooms & Suites',
    ar: 'غرف النوم والأجنحة',
    emoji: '🛏️',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('bedroom') || text.includes('suite') || text.includes('maid') || text.includes('driver') || text.includes('dressing') || text.includes('نوم') || text.includes('غرفة') || text.includes('خادمة') || text.includes('سائق') || text.includes('ملابس');
    },
  },
  {
    key: 'baths_kitchen',
    en: 'Bathrooms & Kitchen',
    ar: 'الحمامات والمطبخ',
    emoji: '🛁',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('bath') || text.includes('kitchen') || text.includes('toilet') || text.includes('wc') || text.includes('laundry') || text.includes('pantry') || text.includes('powder') || text.includes('حمام') || text.includes('مطبخ') || text.includes('غسيل') || text.includes('بوفيه');
    },
  },
  {
    key: 'outdoor',
    en: 'Outdoor & Terraces',
    ar: 'البلكونات والمساحات الخارجية',
    emoji: '🌿',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('balcony') || text.includes('terrace') || text.includes('exterior') || text.includes('roof') || text.includes('garden') || text.includes('pool') || text.includes('jacuzzi') || text.includes('بلكونة') || text.includes('تراس') || text.includes('حديقة') || text.includes('روف') || text.includes('سباحة') || text.includes('جاكوزي');
    },
  },
];

function prettifyTemplateId(id: string): string {
  const last = id.split('.').pop() ?? id;
  return last.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function resolveZoneName(zone: ZoneInstance, isAr: boolean): string {
  if (zone.instance_label && zone.instance_label.trim()) return zone.instance_label;
  const labels = getZoneTemplateLabels(zone.zone_template_id);
  if (labels) return isAr ? labels.ar : labels.en;
  const shared = FALLBACK_ZONE_TITLES[zone.zone_template_id];
  if (shared) return isAr ? shared.ar : shared.en;
  return prettifyTemplateId(zone.zone_template_id);
}

function resolveTradeName(tradeTemplateId: string, isAr: boolean): string {
  const labels = getTradeTemplateLabels(tradeTemplateId);
  if (labels) return isAr ? labels.ar : labels.en;
  return prettifyTemplateId(tradeTemplateId);
}

function flattenLeafZones(zones: ZoneInstance[], parentLabel?: string): Array<{ zone: ZoneInstance; levelLabel?: string }> {
  const result: Array<{ zone: ZoneInstance; levelLabel?: string }> = [];
  for (const z of zones) {
    if (z.children && z.children.length > 0) {
      const label = z.instance_label || z.level_label || parentLabel;
      result.push(...flattenLeafZones(z.children, label));
    } else {
      result.push({ zone: z, levelLabel: parentLabel ?? z.level_label ?? undefined });
    }
  }
  return result;
}

function zoneSqm(zone: ZoneInstance): number {
  if (zone.spatial?.sqm && zone.spatial.sqm > 0) return zone.spatial.sqm;
  if (zone.spatial?.length_m && zone.spatial?.width_m) return Math.round(zone.spatial.length_m * zone.spatial.width_m);
  return fallbackMetricFor(zone.zone_template_id)?.sqm ?? 0;
}

const REVIEW_BADGES: Record<string, { en: string; ar: string; color: string; bg: string; border: string }> = {
  fully_finished: { en: 'Fully Finished ✨', ar: 'تشطيب كامل ✨', color: '#4CC38A', bg: 'rgba(76,195,138,0.12)', border: 'rgba(76,195,138,0.35)' },
  semi_finished:  { en: 'Semi-Finished 🏗️', ar: 'نص تشطيب 🏗️', color: '#E0A63A', bg: 'rgba(224,166,58,0.12)', border: 'rgba(224,166,58,0.35)' },
  red_brick:      { en: 'Red Brick 🧱', ar: 'طوب أحمر 🧱', color: '#E06D5B', bg: 'rgba(224,109,91,0.12)', border: 'rgba(224,109,91,0.35)' },
  mixed:          { en: 'Mixed 🔄', ar: 'مختلط 🔄', color: '#9FB3D9', bg: 'rgba(159,179,217,0.12)', border: 'rgba(159,179,217,0.35)' },
};

function ReviewZoneCard({ zone, levelLabel, isAr }: { zone: ZoneInstance; levelLabel?: string; isAr: boolean }) {
  const badge = getZoneBadge(zone);
  const badgeCfg = REVIEW_BADGES[badge];
  const sqm = zoneSqm(zone);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(221, 167, 82, 0.14)',
      borderRadius: '10px',
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <strong style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {resolveZoneName(zone, isAr)}
        </strong>
        {badgeCfg && (
          <span style={{ flexShrink: 0, fontSize: '9px', fontWeight: 800, color: badgeCfg.color, background: badgeCfg.bg, border: `1px solid ${badgeCfg.border}`, padding: '1px 6px', borderRadius: '6px' }}>
            {isAr ? badgeCfg.ar : badgeCfg.en}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
        {sqm > 0 && <span dir="ltr">{sqm} m²</span>}
        {levelLabel && (
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '1px 7px', borderRadius: '999px', background: 'rgba(221,167,82,0.10)', color: '#DDA752', fontWeight: 700 }}>
            {levelLabel}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
        {zone.trades.map((t) => (
          <span key={t.id} style={{
            fontSize: '9px',
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '2px 6px',
            color: 'rgba(255, 255, 255, 0.75)'
          }}>
            {resolveTradeName(t.trade_template_id, isAr)}: {formatStatus(t.status, isAr)}
          </span>
        ))}
      </div>
    </div>
  );
}

function generateSlug(text: string) {
  const base = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return `${base}-${Math.random().toString(36).substring(2, 8)}`;
}

const schema = z.object({
  title: z.string().min(3),
  price_egp: z.coerce.number().positive(),
  bedrooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  area_sqm: z.coerce.number().positive(),
  type: z.enum(['apartment', 'building', 'garage']),
  subtype: z.enum(['standard', 'ground', 'duplex', 'roof', 'residential', 'mixed']).optional(),
  total_floors: z.coerce.number().int().min(1).max(15).optional().or(z.literal('')),
  units_per_floor: z.coerce.number().int().min(1).max(6).optional().or(z.literal('')),
  location: z.string().min(2),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  completion_status: z.enum(['ready', 'off_plan']),
  listing_status: z.enum(['active', 'under_offer', 'sold', 'archived']),
  is_featured: z.boolean(),
  view: z.string().optional().nullable().or(z.literal('')),
  floor_number: z.coerce.number().int().optional().nullable().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface AdminPropertyFormProps {
  property?: Property;
  isAr?: boolean;
}

export default function AdminPropertyForm({ property, isAr = false }: AdminPropertyFormProps) {
  const isEditing = !!property;
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(property?.slug ?? null);
  const [savedResult, setSavedResult] = useState<{ id?: string; slug?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('step');
      if (s) {
        const parsed = Number(s);
        if (parsed >= 1 && parsed <= 5) {
          setCurrentStep(parsed);
        }
      }
      if (sp.get('saved') === 'true') {
        setIsSaved(true);
      }
    }
  }, []);

  const goToStep = (stepNum: number) => {
    setCurrentStep(stepNum);
    setIsSaved(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('step', String(stepNum));
      url.searchParams.delete('saved');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const valid = await trigger(['title', 'price_egp', 'area_sqm']);
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = await trigger(['location']);
      if (!valid) return;
    }
    goToStep(Math.min(currentStep + 1, 5));
  };

  const handlePrevStep = () => {
    goToStep(Math.max(currentStep - 1, 1));
  };
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    property?.property_images?.map((img) => img.url) ?? []
  );
  const [amenities, setAmenities] = useState<string[]>(
    property?.property_amenities?.map((a) => a.amenity_en) ?? []
  );
  const [amenityInput, setAmenityInput] = useState('');

  const [inspectorZoneId, setInspectorZoneId] = useState<string | null>(null);
  const [roomsRailEl, setRoomsRailEl] = useState<HTMLDivElement | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [zoneInstances, setZoneInstances] = useState<ZoneInstance[]>(() => {
    if (property?.spec_layers && Array.isArray(property.spec_layers) && property.spec_layers.length > 0) {
      if ('zone_template_id' in property.spec_layers[0]) {
        return property.spec_layers as ZoneInstance[];
      }
    }
    const initialType = (property ? (['apartment', 'building', 'garage'].includes(property.type) ? property.type : 'apartment') : 'apartment') as 'apartment' | 'building' | 'garage';
    return buildZoneInstances(initialType, 'semi_finished', property?.bedrooms || 2);
  });

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: property ? {
      title: property.title_en,
      price_egp: property.price_egp,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area_sqm: property.area_sqm,
      type: (['apartment', 'building', 'garage'].includes(property.type) ? property.type : 'apartment') as 'apartment' | 'building' | 'garage',
      subtype: inferSubtype(property),
      total_floors: '',
      units_per_floor: '',
      location: property.location,
      latitude: property.latitude ?? undefined,
      longitude: property.longitude ?? undefined,
      completion_status: property.completion_status,
      listing_status: property.listing_status,
      is_featured: property.is_featured,
      view: property.view ?? '',
      floor_number: property.floor_number ?? '',
    } : {
      type: 'apartment',
      subtype: 'standard',
      total_floors: '',
      units_per_floor: '',
      completion_status: 'ready',
      listing_status: 'active',
      is_featured: false,
      bedrooms: 2,
      bathrooms: 1,
      view: '',
      floor_number: '',
    },
  });

  const steps = [
    { num: 1, title_en: 'Property Details', title_ar: 'بيانات العقار' },
    { num: 2, title_en: 'Location & Media', title_ar: 'الموقع والوسائط' },
    { num: 3, title_en: 'Floor Plans', title_ar: 'المخططات' },
    { num: 4, title_en: 'Features & Finishes', title_ar: 'المزايا والتشطيب' },
    { num: 5, title_en: 'Review & Publish', title_ar: 'المراجعة والنشر' },
  ];

  const selectedType = watch('type');
  const bedroomsCount = watch('bedrooms') || 2;
  const selectedSubtype = watch('subtype');
  const totalFloorsRaw = watch('total_floors');
  const unitsPerFloorRaw = watch('units_per_floor');

  const canReseed = () =>
    !isEditing || zoneInstances.length === 0 || zoneInstances.every(z => !z.images?.length);

  const reseedZones = (
    type: FormValues['type'],
    subtype: FormValues['subtype'],
    totalFloors?: number | '',
    unitsPerFloor?: number | '',
  ) => {
    if (!canReseed()) return;
    setZoneInstances(buildZoneInstances(type, 'semi_finished', bedroomsCount, {
      subtype,
      totalFloors: typeof totalFloors === 'number' ? totalFloors : undefined,
      unitsPerFloor: typeof unitsPerFloor === 'number' ? unitsPerFloor : undefined,
    }));
  };

  const handleTypeChange = (newType: string) => {
    const typed = newType as FormValues['type'];
    if (typed !== selectedType && !confirmRebuild()) return;
    setValue('type', typed, { shouldValidate: true });
    const defaultSub = typed === 'apartment' ? 'standard' : typed === 'building' ? 'residential' : undefined;
    setValue('subtype', defaultSub);
    reseedZones(typed, defaultSub);
  };

  const handleSubtypeChange = (newSubtype: string) => {
    const sub = newSubtype as FormValues['subtype'];
    setValue('subtype', sub);
    const tf = Number(totalFloorsRaw) || undefined;
    const uf = Number(unitsPerFloorRaw) || undefined;
    reseedZones(selectedType, sub, tf, uf);
  };

  const handleBuildingConfigChange = (field: 'total_floors' | 'units_per_floor', raw: string) => {
    const num = raw === '' ? '' : Math.max(1, Math.min(field === 'total_floors' ? 15 : 6, Number(raw) || 1));
    setValue(field, num as FormValues['total_floors']);
    const tf = field === 'total_floors' ? num : totalFloorsRaw;
    const uf = field === 'units_per_floor' ? num : unitsPerFloorRaw;
    if (typeof tf === 'number' && typeof uf === 'number') {
      reseedZones(selectedType, selectedSubtype, tf, uf);
    }
  };

  // Tiptap editor for description
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: isAr ? 'اكتب وصف العقار هنا...' : 'Property description...' }),
    ],
    content: property?.description_en ?? '',
  });

  // Image dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 20,
    onDrop: async (files) => {
      setUploadingImages(true);
      const supabase = createClient();
      const urls: string[] = [];
      try {
        for (const file of files) {
          const compressed = await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2000, useWebWorker: true });
          const ext = file.name.split('.').pop();
          const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('property-images').upload(path, compressed, { upsert: false });
          if (error) throw error;
          const { data } = supabase.storage.from('property-images').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
        setPreviewUrls((prev) => [...prev, ...urls]);
        toast.success(isAr ? `تم رفع ${urls.length} صورة بنجاح` : `${urls.length} image(s) uploaded`);
      } catch (err) {
        console.error(err);
        toast.error(isAr ? 'فشل رفع الصورة' : 'Image upload failed');
      } finally {
        setUploadingImages(false);
      }
    },
  });

  
  const handlePrintSummary = () => {
    const title = watch('title') || 'Property Specification Report';
    const price = watch('price_egp') ? Number(watch('price_egp')).toLocaleString() : 'N/A';
    const area = watch('area_sqm') || 'N/A';
    const location = watch('location') || 'N/A';

    const printWin = window.open('', '_blank', 'width=960,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="utf-8">
          <title>${title} — Specification Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px; color: #1E293B; background: #FFFFFF; line-height: 1.5; }
            .header { border-bottom: 2px solid #DDA752; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .brand { font-size: 11px; font-weight: 800; color: #DDA752; text-transform: uppercase; letter-spacing: 1px; }
            .title { font-size: 24px; font-weight: 800; color: #0A0E18; margin: 4px 0 0; }
            .kpiGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center; }
            .kpiVal { font-size: 20px; font-weight: 800; color: #DDA752; display: block; }
            .kpiLabel { font-size: 11px; color: #64748B; font-weight: 600; }
            .catCard { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
            .catHeader { font-size: 15px; font-weight: 800; color: #0A0E18; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
            .zoneGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
            .zoneCard { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; }
            .zoneName { font-size: 12px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block; }
            .tradeChip { font-size: 10px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 2px 6px; border-radius: 4px; display: inline-block; margin: 2px 2px 0 0; color: #475569; }
            .footer { margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 11px; color: #94A3B8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${isAr ? 'منصة المهندس زكريا فريد العقارية' : 'ZAKARIA FARID REAL ESTATE PLATFORM'}</div>
              <h1 class="title">${title}</h1>
              <div style="font-size: 12px; color: #64748B; margin-top: 4px;">${location} • ${selectedType}</div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 20px; font-weight: 800; color: #DDA752;">${price} EGP</span>
              <div style="font-size: 11px; color: #64748B;">${area} sqm</div>
            </div>
          </div>

          <div class="kpiGrid">
            <div><span class="kpiVal">${zoneInstances.length}</span><span class="kpiLabel">${isAr ? 'مناطق مسجلة' : 'Zones Recorded'}</span></div>
            <div><span class="kpiVal">${previewUrls.length}</span><span class="kpiLabel">${isAr ? 'صور مرفوعة' : 'Photos Uploaded'}</span></div>
            <div><span class="kpiVal">${amenities.length}</span><span class="kpiLabel">${isAr ? 'مرفق وميزة' : 'Amenities Added'}</span></div>
            <div><span class="kpiVal">100%</span><span class="kpiLabel">${isAr ? 'جاهز للنشر' : 'Ready Status'}</span></div>
          </div>

          <h3 style="font-size: 16px; font-weight: 800; color: #0A0E18; margin-bottom: 12px;">${isAr ? 'المواصفات المعمارية والتشطيبات' : 'Architectural & Finishing Specifications'}</h3>

          ${(() => {
            const leaves = flattenLeafZones(zoneInstances);
            return CATEGORY_BUCKETS.map(cat => {
              const catLeaves = leaves.filter(({ zone }) => cat.match(zone.zone_template_id, resolveZoneName(zone, false)));
              if (catLeaves.length === 0) return '';
              return `
                <div class="catCard">
                  <div class="catHeader">
                    <span>${cat.emoji} ${isAr ? cat.ar : cat.en}</span>
                    <span style="font-size: 11px; color: #64748B;">${catLeaves.length} ${isAr ? 'مناطق' : 'Zones'}</span>
                  </div>
                  <div class="zoneGrid">
                    ${catLeaves.map(({ zone, levelLabel }) => `
                      <div class="zoneCard">
                        <span class="zoneName">${resolveZoneName(zone, isAr)}${levelLabel ? ` — ${levelLabel}` : ''}</span>
                        <div>
                          ${zone.trades.map(t =>
                            `<span class="tradeChip">${resolveTradeName(t.trade_template_id, isAr)}: <strong>${formatStatus(t.status, isAr)}</strong></span>`
                          ).join('')}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('');
          })()}

          <div class="footer">
            ${isAr ? 'تقرير رسمي صادر عن منصة المهندس زكريا فريد العقارية' : 'Official Property Specification Summary — Zakaria Farid Real Estate Platform'}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const payloadBase = {
        ...data,
        description_en: editor?.getHTML() ?? '',
        description_ar: editor?.getHTML() ?? '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        title_en: data.title,
        title_ar: data.title,
        view: data.view || null,
        floor_number: (data.floor_number === '' || data.floor_number === null || data.floor_number === undefined) ? null : Number(data.floor_number),
        spec_layers: zoneInstances,
      };

      // @ts-ignore
      delete payloadBase.title;

      const payload = isEditing && property 
        ? payloadBase 
        : { ...payloadBase, slug: generateSlug(data.title) };

      const res = await saveProperty(payload, isEditing, property?.id, amenities, previewUrls);
      
      if (!res.success) {
        throw new Error(res.error);
      }

      toast.success(isAr ? (isEditing ? 'تم تحديث العقار بنجاح!' : 'تم إنشاء العقار بنجاح!') : (isEditing ? 'Property updated!' : 'Property created!'));
      setSavedSlug(res.slug || property?.slug || null);
      setIsSaved(true);
      setCurrentStep(5);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('step', '5');
        url.searchParams.set('saved', 'true');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err: any) {
      console.error('Save error:', err?.message || err, err);
      toast.error(isAr ? 'فشل الحفظ. يرجى المحاولة مرة أخرى.' : 'Save failed: ' + (err?.message || 'Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  function removePreview(url: string) {
    setPreviewUrls((prev) => prev.filter((u) => u !== url));
  }

  function handleAddAmenity(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = amenityInput.trim();
      if (val && !amenities.includes(val)) {
        setAmenities([...amenities, val]);
        setAmenityInput('');
      }
    }
  }

  function removeAmenity(am: string) {
    setAmenities(amenities.filter((a) => a !== am));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`${styles.form} ${currentStep === 3 && railOpen ? 'form-with-inspector' : ''}`} onKeyDown={(e) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
        e.preventDefault();
      }
    }}>
      <style>{`
        .form-with-inspector {
          padding-inline-end: 308px;
        }
        @media (max-width: 1023px) {
          .form-with-inspector { padding-inline-end: 0; }
        }
      `}</style>
      {/* ─── Stepper Progress Header ─── */}
      {/* ─── Stepper Progress Header ─── */}
      <div className={styles.stepperContainer}>
        <div className={styles.stepperHeader}>
          {steps.map((st, idx) => {
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;
            return (
              <div key={st.num} className={styles.stepTrackItem}>
                <button
                  type="button"
                  onClick={() => {
                    if (st.num < currentStep || currentStep > 1) {
                      setCurrentStep(st.num);
                    }
                  }}
                  className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${isCompleted ? styles.stepItemCompleted : ''}`}
                >
                  <div className={styles.stepBadge}>
                    {isCompleted ? <Check size={15} strokeWidth={2.5} /> : st.num}
                  </div>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepNum}>{isAr ? `الخطوة ${st.num}` : `Step ${st.num}`}</span>
                    <span className={styles.stepTitle}>{isAr ? st.title_ar : st.title_en}</span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`${styles.stepDivider} ${isCompleted ? styles.stepDividerActive : ''}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 1: Basic Info & Property Type ─── */}
      {currentStep === 1 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderIcon}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>
                {isAr ? 'الخطوة ١: البيانات الأساسية ونوع العقار' : 'Step 1: Core Property Details & Type'}
              </h2>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', display: 'block' }}>
                {isAr ? 'حدد عنوان العقار، تصنيفه الهندسي، والمواصفات الأولية' : 'Define property identity, architectural categorization, and primary specs'}
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{isAr ? 'عنوان العقار *' : 'Property Title *'}</label>
            <input 
              type="text" 
              className={`${styles.input} ${errors.title ? styles.err : ''}`} 
              {...register('title')} 
              placeholder={isAr ? "مثال: فيلا فاخرة للإيجار بالشيخ زايد" : "e.g. Luxury Modern Villa in Sheikh Zayed"} 
            />
            {errors.title && <p className={styles.errMsg}>{errors.title.message}</p>}
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'نوع العقار *' : 'Property Type *'}</label>
              <select
                className={styles.input}
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {([
                  { value: 'apartment', en: 'Apartment', ar: 'شقة (Apartment)' },
                  { value: 'building',  en: 'Building',  ar: 'عمارة (Building)' },
                  { value: 'garage',    en: 'Garage',    ar: 'جراج (Garage)' },
                ] as const).map((t) => (
                  <option key={t.value} value={t.value}>
                    {isAr ? t.ar : t.en}
                  </option>
                ))}
              </select>
            </div>

            {selectedType !== 'garage' && (
              <div className={styles.field}>
                <label className={styles.label}>{isAr ? 'النوع الفرعي' : 'Subtype'}</label>
                <select
                  className={styles.input}
                  value={selectedSubtype ?? (selectedType === 'apartment' ? 'standard' : 'residential')}
                  onChange={(e) => handleSubtypeChange(e.target.value)}
                >
                  {(selectedType === 'apartment' ? [
                    { value: 'standard', en: 'Standard Flat', ar: 'شقة عادية' },
                    { value: 'ground',   en: 'Ground + Garden', ar: 'أرضي بحديقة' },
                    { value: 'duplex',   en: 'Duplex (دورين)', ar: 'دوبلكس (دورين)' },
                    { value: 'roof',     en: 'Roof Apartment', ar: 'شقة روف' },
                  ] : [
                    { value: 'residential', en: 'Residential', ar: 'سكني' },
                    { value: 'mixed',       en: 'Mixed Use',   ar: 'سكني تجاري' },
                  ]).map((s) => (
                    <option key={s.value} value={s.value}>{isAr ? s.ar : s.en}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedType === 'building' && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>{isAr ? 'عدد الأدوار' : 'Total Floors'}</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    className={styles.input}
                    value={totalFloorsRaw ?? ''}
                    onChange={(e) => handleBuildingConfigChange('total_floors', e.target.value)}
                    placeholder={isAr ? 'مثال: 5' : 'e.g. 5'}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{isAr ? 'وحدات لكل دور' : 'Units per Floor'}</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    className={styles.input}
                    value={unitsPerFloorRaw ?? ''}
                    onChange={(e) => handleBuildingConfigChange('units_per_floor', e.target.value)}
                    placeholder={isAr ? 'مثال: 2' : 'e.g. 2'}
                  />
                </div>
              </>
            )}

            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'السعر (ج.م) *' : 'Price (EGP) *'}</label>
              <input 
                type="number" 
                className={`${styles.input} ${errors.price_egp ? styles.err : ''}`} 
                {...register('price_egp')} 
                placeholder="e.g. 12500000" 
              />
              {errors.price_egp && <p className={styles.errMsg}>{errors.price_egp.message}</p>}
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'المساحة (مترمربع) *' : 'Area (sqm) *'}</label>
              <input 
                type="number" 
                className={`${styles.input} ${errors.area_sqm ? styles.err : ''}`} 
                {...register('area_sqm')} 
                placeholder="e.g. 350" 
              />
              {errors.area_sqm && <p className={styles.errMsg}>{errors.area_sqm.message}</p>}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'غرف النوم' : 'Bedrooms'}</label>
              <input type="number" className={styles.input} {...register('bedrooms')} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'الحمامات' : 'Bathrooms'}</label>
              <input type="number" className={styles.input} {...register('bathrooms')} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'حالة البناء' : 'Completion Status'}</label>
              <select className={styles.input} {...register('completion_status')}>
                <option value="ready">{isAr ? 'جاهز للسكن' : 'Ready to Move'}</option>
                <option value="off_plan">{isAr ? 'قيد الإنشاء (على المخطط)' : 'Off-Plan'}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'حالة الإدراج' : 'Listing Status'}</label>
              <select className={styles.input} {...register('listing_status')}>
                <option value="active">{isAr ? 'متاح' : 'Active'}</option>
                <option value="under_offer">{isAr ? 'تحت العرض' : 'Under Offer'}</option>
                <option value="sold">{isAr ? 'مُباع' : 'Sold'}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'رقم الطابق' : 'Floor Number'}</label>
              <input type="number" className={styles.input} {...register('floor_number')} placeholder={isAr ? "مثال: 0 (أرضي)، 2" : "e.g. 0 for Ground, 2"} />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'الإطلالة' : 'View'}</label>
              <input type="text" className={styles.input} {...register('view')} placeholder={isAr ? "مثال: إطلالة على المسبح، إطلالة على البحر" : "e.g. Pool view, Sea view"} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'التمييز بالمنصة' : 'Platform Highlight'}</label>
              <div className={styles.checkRow}>
                <label className={styles.toggleSwitch}>
                  <input type="checkbox" id="is_featured" {...register('is_featured')} className={styles.toggleInput} />
                  <span className={styles.toggleSlider}></span>
                </label>
                <label htmlFor="is_featured" style={{ fontWeight: 600, fontSize: 13.5, cursor: 'pointer', color: 'rgba(255, 255, 255, 0.9)', userSelect: 'none' }}>
                  {isAr ? 'عرض في العقارات المميزة بالصفحة الرئيسية' : 'Feature this property on homepage'}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Location, Media & Description ─── */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Location */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <MapPin size={18} />
              {isAr ? 'الموقع على الخريطة' : 'Property Location'}
            </h2>
            <div className={styles.field} style={{ marginBottom: 16 }}>
              <label className="label">{isAr ? 'اسم الموقع / المنطقة *' : 'Location / Area Name *'}</label>
              <input className={`input ${errors.location ? styles.err : ''}`} {...register('location')} placeholder={isAr ? "الشيخ زايد - التجمع الخامس" : "Sheikh Zayed - New Cairo"} />
              {errors.location && <p className={styles.errMsg}>{errors.location.message}</p>}
            </div>
            <div className={styles.field}>
              <label className="label">{isAr ? 'حدد الموقع الدقيق على الخريطة' : 'Pinpoint Location on Map'}</label>
              <DynamicMapPicker 
                latitude={watch('latitude')} 
                longitude={watch('longitude')} 
                onChange={(lat, lng) => {
                  setValue('latitude', lat, { shouldValidate: true });
                  setValue('longitude', lng, { shouldValidate: true });
                }}
              />
            </div>
          </div>

          {/* Overview & Hero Gallery Images */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <ImageIcon size={18} />
              {isAr ? 'صور الغلاف والمعرض العام' : 'Overview & Hero Gallery Photos'}
            </h2>
            <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}>
              <input {...getInputProps()} />
              {uploadingImages ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)' }}>
                  <Loader2 size={20} className={styles.spinner} /> {isAr ? 'جاري الرفع...' : 'Uploading…'}
                </div>
              ) : (
                <>
                  <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 8 }}>
                    {isDragActive 
                      ? (isAr ? 'أفلت الصور العامة هنا' : 'Drop overview images here') 
                      : (isAr ? 'اسحب صور المعرض العام هنا أو انقر للتصفح' : 'Drag overview gallery images here or click to browse')}
                  </p>
                </>
              )}
            </div>
            {previewUrls.length > 0 && (
              <div className={styles.previews}>
                {previewUrls.map((url, i) => (
                  <div key={url} className={styles.preview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="overview preview" className={styles.previewImg} />
                    <button type="button" className={styles.removeImg} onClick={() => removePreview(url)}>
                      <Trash2 size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description & Amenities */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{isAr ? 'الوصف والمرافق المميزة' : 'Description & Amenities'}</h2>
            
            <div className={styles.field}>
              <label className="label">{isAr ? 'الوصف التفصيلي' : 'Detailed Description'}</label>
              <div className={styles.tiptap}><EditorContent editor={editor} /></div>
            </div>

            <div className={styles.field} style={{ marginTop: '12px' }}>
              <label className="label">{isAr ? 'المرافق المميزة (اضغط Enter للإضافة)' : 'Key Amenities (Press Enter to add)'}</label>
              <div className={styles.tagsInputContainer}>
                {amenities.map((am) => (
                  <div key={am} className={styles.tag}>
                    {am}
                    <button type="button" onClick={() => removeAmenity(am)} className={styles.tagRemove}>
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
                <input 
                  type="text" 
                  className={styles.tagsInput} 
                  placeholder={isAr ? "مثال: مسبح، نادي رياضي، بلكونة..." : "e.g. Pool, Gym, Balcony..."}
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={handleAddAmenity}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: CAD Blueprint Studio + Rooms Rail + Nested Inspector ─── */}
      {currentStep === 3 && (
        <div className={styles.section} style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, backdropFilter: 'none' }}>
          <CADBlueprintBuilder
            zoneInstances={zoneInstances}
            onZoneInstancesChange={setZoneInstances}
            propertyType={selectedType}
            bedrooms={bedroomsCount}
            declaredArea={Number(watch('area_sqm')) || undefined}
            selectedZoneId={inspectorZoneId}
            onSelectedZoneIdChange={(id) => {
              setInspectorZoneId(id);
              if (id) setRailOpen(true);
            }}
            listPortalTarget={roomsRailEl}
            isAr={isAr}
          />

          <div className={`rooms-rail ${railOpen ? '' : 'closed'}`} dir={isAr ? 'rtl' : 'ltr'}>
            <div className="rooms-rail-head">
              <span className="rooms-rail-title">{isAr ? 'الغرف' : 'ROOMS'}</span>
              <button
                type="button"
                className="rooms-rail-toggle"
                aria-label={isAr ? 'إخفاء اللوحة' : 'Hide panel'}
                onClick={() => { setRailOpen(false); setInspectorZoneId(null); }}
              >
                <PanelRightClose size={14} />
              </button>
            </div>
            <div className="rooms-rail-body" ref={setRoomsRailEl} />
          </div>

          {!railOpen && (
            <button
              type="button"
              className={`rooms-rail-reopen ${isAr ? 'rtl' : ''}`}
              aria-label={isAr ? 'إظهار لوحة الغرف' : 'Show rooms panel'}
              onClick={() => setRailOpen(true)}
            >
              <PanelRightOpen size={15} />
              <span>{isAr ? 'الغرف' : 'Rooms'}</span>
            </button>
          )}

          {railOpen && (
            <ZoneInspector
              zoneInstances={zoneInstances}
              onZoneInstancesChange={setZoneInstances}
              selectedZoneId={inspectorZoneId}
              nested
              onClose={() => setInspectorZoneId(null)}
              isAr={isAr}
            />
          )}

          <style>{`
            .rooms-rail {
              position: fixed;
              inset-block: 0;
              inset-inline-end: 0;
              width: 300px;
              height: 100dvh;
              z-index: 60;
              background: #0D1220;
              border-inline-start: 1px solid rgba(221, 167, 82, 0.16);
              box-shadow: -12px 0 32px rgba(0, 0, 0, 0.35);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
            }
            [dir="rtl"].rooms-rail {
              box-shadow: 12px 0 32px rgba(0, 0, 0, 0.35);
            }
            .rooms-rail.closed { transform: translateX(100%); pointer-events: none; }
            [dir="rtl"].rooms-rail.closed { transform: translateX(-100%); }

            .rooms-rail-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px 14px;
              border-block-end: 1px solid rgba(221, 167, 82, 0.16);
              flex-shrink: 0;
            }
            .rooms-rail-title {
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.12em;
              color: rgba(237, 232, 221, 0.55);
            }
            .rooms-rail-toggle, .rooms-rail-reopen {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              border-radius: 8px;
              cursor: pointer;
              background: transparent;
              border: 1px solid rgba(221, 167, 82, 0.2);
              color: rgba(237, 232, 221, 0.6);
              transition: color 0.15s, border-color 0.15s;
            }
            .rooms-rail-toggle { width: 26px; height: 26px; }
            .rooms-rail-toggle:hover, .rooms-rail-reopen:hover { color: #DDA752; border-color: #DDA752; }

            .rooms-rail-reopen {
              position: fixed;
              top: 50%;
              right: 0;
              transform: translateY(-50%);
              z-index: 90;
              flex-direction: column;
              padding: 12px 7px;
              border-top-right-radius: 0;
              border-bottom-right-radius: 0;
              background: #0D1220;
              box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 11px;
              font-weight: 800;
            }
            .rooms-rail-reopen > span { writing-mode: vertical-rl; }
            .rooms-rail-reopen.rtl {
              right: auto;
              left: 0;
              border-radius: 8px;
              border-top-left-radius: 0;
              border-bottom-left-radius: 0;
              box-shadow: 8px 0 24px rgba(0, 0, 0, 0.4);
            }

            .rooms-rail-body {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .rooms-rail-body > .fp-list-panel { flex: 1; min-height: 0; }

            @media (max-width: 1023px) {
              .rooms-rail {
                position: static;
                width: auto;
                height: auto;
                max-height: 520px;
                margin-top: 16px;
                border-radius: 14px;
                border: 1px solid rgba(221, 167, 82, 0.16);
                box-shadow: none;
              }
              .rooms-rail.closed { transform: none; pointer-events: auto; }
              .rooms-rail-toggle, .rooms-rail-reopen { display: none; }
            }
          `}</style>
        </div>
      )}

      {/* ─── STEP 4: Detailed Layered Specs & Finishing ─── */}
      {currentStep === 4 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            <Layers size={18} />
            {isAr ? 'الخطوة ٤: مواصفات الأنظمة والتشطيبات الهندسية' : 'Step 4: Layered Engineering Systems & Finishes'}
          </h2>

          <FinishingWizard
            propertyType={selectedType}
            bedroomCount={bedroomsCount}
            zoneInstances={zoneInstances}
            onZoneInstancesChange={setZoneInstances}
            initialSubType={selectedSubtype}
            isAr={isAr}
          />
        </div>
      )}

      {/* ─── STEP 5: Full Pre-Save Specification & Property Summary Review ─── */}
      {currentStep === 5 && (
        <div className={styles.section}>
          {isSaved && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={18} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: '#10B981', display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {isAr ? 'تم حفظ وتحديث العقار والمخطط الهندسي بنجاح!' : 'Property & CAD Blueprint Saved Successfully!'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {isAr ? 'كافة المواصفات والطبقات المعمارية مسجلة ومتاحة للمعاينة الحية.' : 'All layered specs and floor plans are stored. You can inspect live or return to dashboard.'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {savedSlug && (
                  <a
                    href={`/${isAr ? 'ar' : 'en'}/properties/${savedSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #DDA752 0%, #B8860B 100%)',
                      color: '#0A0E18',
                      textDecoration: 'none'
                    }}
                  >
                    <Eye size={14} />
                    <span>{isAr ? 'معاينة الصفحة الحية ↗' : 'View Live ↗'}</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/admin/${isAr ? 'ar' : 'en'}/properties`)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'العودة للقائمة ←' : 'Return to List ←'}
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                  <Sparkles size={18} />
                  {isAr ? 'الخطوة ٥: مراجعة ملخص العقار والمخطط الهندسي' : 'Step 5: Review Property & CAD Specs Summary'}
                </h2>
                <button
                  type="button"
                  onClick={handlePrintSummary}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    background: 'rgba(221, 167, 82, 0.12)',
                    border: '1px solid rgba(221, 167, 82, 0.3)',
                    color: '#DDA752',
                    cursor: 'pointer',
                  }}
                >
                  <FileText size={14} />
                  <span>{isAr ? 'طباعة تقرير المواصفات PDF 📄' : 'Download Specification Dossier PDF 📄'}</span>
                </button>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {isAr
                  ? 'راجع تفاصيل العقار وأبعاد المخطط الهندسي وكافة المواصفات أدناه قبل التأكيد والنشر النهائي'
                  : 'Review property identity, CAD floor plan metrology, and engineering specifications before live publishing.'}
              </p>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Card 1: Property Title & Location */}
            <div className={styles.reviewBox}>
              <span className={styles.reviewBoxTitle}>{isAr ? 'عنوان العقار والموقع' : 'Property Title & Location'}</span>
              <span className={styles.reviewVal} style={{ fontSize: '15px', lineHeight: 1.3 }}>{watch('title') || '—'}</span>
              <span className={styles.reviewSub}>{watch('location') || (isAr ? 'لم يحدد الموقع' : 'No location specified')}</span>
            </div>

            {/* Card 2: Type, Area & Pricing */}
            <div className={styles.reviewBox}>
              <span className={styles.reviewBoxTitle}>{isAr ? 'نوع العقار والسعر' : 'Type & Pricing'}</span>
              <span className={styles.reviewVal} style={{ color: '#DDA752', fontWeight: 800, fontSize: '20px' }}>
                {watch('price_egp') ? `${Number(watch('price_egp')).toLocaleString()} EGP` : '—'}
              </span>
              <span className={styles.reviewSub} style={{ textTransform: 'capitalize' }}>
                {selectedType} • {watch('area_sqm')} sqm • {bedroomsCount} {isAr ? 'غرف نوم' : 'Bedrooms'}
              </span>
            </div>

            {/* Card 3: Media & Live Photo Thumbnails Preview */}
            <div className={styles.reviewBox} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className={styles.reviewBoxTitle}>{isAr ? 'معاينة الصور والوسائط' : 'Media & Photo Preview'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#DDA752' }}>
                    {previewUrls.length} {isAr ? 'صور' : 'Photos'}
                  </span>
                </div>
                <span className={styles.reviewSub}>
                  {amenities.length} {isAr ? 'مرفق وميزة إضافية' : 'Amenities Added'}
                </span>
              </div>

              {previewUrls.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '10px' }}>
                  {previewUrls.slice(0, 4).map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: '100%', height: '54px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(221, 167, 82, 0.3)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {i === 3 && previewUrls.length > 4 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10, 14, 24, 0.85)', color: '#DDA752', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                          +{previewUrls.length - 4}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '8px', fontStyle: 'italic' }}>
                  {isAr ? 'لم تم ارفاق صور حتى الآن' : 'No photos uploaded yet'}
                </div>
              )}
            </div>

            {/* Card 4: Layered Specs Overview */}
            <div className={styles.reviewBox}>
              <span className={styles.reviewBoxTitle}>{isAr ? 'طبقات المواصفات المعمارية' : 'Layered Specs Overview'}</span>
              {(() => {
                const leaves = flattenLeafZones(zoneInstances);
                const totalSqm = Math.round(leaves.reduce((acc, { zone }) => acc + zoneSqm(zone), 0));
                const declared = Number(watch('area_sqm')) || 0;
                const ratio = declared > 0 ? totalSqm / declared : 0;
                const matches = declared > 0 && ratio >= 0.9 && ratio <= 1.1;
                const tradeCount = leaves.reduce((acc, { zone }) => acc + zone.trades.length, 0);
                return (
                  <>
                    <span className={styles.reviewVal}>
                      {leaves.length} {isAr ? 'غرفة' : 'Rooms'} · <span dir="ltr">{totalSqm} m²</span>
                    </span>
                    <span className={styles.reviewSub}>
                      {tradeCount} {isAr ? 'بند تشطيب معرف' : 'Trade Specs'}
                      {declared > 0 && (
                        <span style={{ color: matches ? '#4CC38A' : '#E0A63A', fontWeight: 700 }}>
                          {' · '}{matches
                            ? (isAr ? 'مطابق للمساحة المعلنة ✓' : 'Matches declared area ✓')
                            : (isAr ? `المعلن ${declared} م² ⚠` : `Declared ${declared} m² ⚠`)}
                        </span>
                      )}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Full Pre-Save Specs Breakdown Summary Box */}
          <div style={{
            marginTop: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(221, 167, 82, 0.16)',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#DDA752' }} />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#DDA752', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {isAr ? 'ملخص المواصفات والتشطيبات المسجلة' : 'Registered Finishing & Zone Summary'}
                </h3>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: 'rgba(221, 167, 82, 0.15)', color: '#DDA752', border: '1px solid rgba(221, 167, 82, 0.3)' }}>
                {flattenLeafZones(zoneInstances).length} {isAr ? 'منطقة جاهزة' : 'Zones Configured'}
              </span>
            </div>

            {/* Categorized Human-Readable Zones & Trades Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const leaves = flattenLeafZones(zoneInstances);
                const categorizedSet = new Set<string>();
                const renderedBuckets = CATEGORY_BUCKETS.map((cat) => {
                  const catZones = leaves.filter(({ zone }) => {
                    const matched = cat.match(zone.zone_template_id, resolveZoneName(zone, false));
                    if (matched) categorizedSet.add(zone.id);
                    return matched;
                  });
                  if (catZones.length === 0) return null;

                  return (
                    <div key={cat.key} style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>{cat.emoji}</span>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#DDA752', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {isAr ? cat.ar : cat.en}
                          </h4>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: 'rgba(221, 167, 82, 0.1)', color: '#DDA752' }}>
                          {catZones.length} {isAr ? 'مناطق' : 'Zones'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                        {catZones.map(({ zone, levelLabel }) => (
                          <ReviewZoneCard key={zone.id} zone={zone} levelLabel={levelLabel} isAr={isAr} />
                        ))}
                      </div>
                    </div>
                  );
                });

                const uncategorizedZones = leaves.filter(({ zone }) => !categorizedSet.has(zone.id));

                return (
                  <>
                    {renderedBuckets}
                    {uncategorizedZones.length > 0 && (
                      <div style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "12px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "16px" }}>📍</span>
                            <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#DDA752", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {isAr ? "مناطق أخرى" : "Other Areas"}
                            </h4>
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "8px", background: "rgba(221, 167, 82, 0.1)", color: "#DDA752" }}>
                            {uncategorizedZones.length} {isAr ? "مناطق" : "Zones"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                          {uncategorizedZones.map(({ zone, levelLabel }) => (
                            <ReviewZoneCard key={zone.id} zone={zone} levelLabel={levelLabel} isAr={isAr} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ padding: '16px 20px', background: 'rgba(221, 167, 82, 0.05)', borderRadius: 14, border: '1px solid rgba(221, 167, 82, 0.25)', marginTop: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: '#DDA752', marginBottom: 4, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📌</span>
              <span>{isAr ? 'مراجعة المخطط والمواصفات قبل النشر' : 'Pre-Publish Architectural Verification'}</span>
            </h4>
            <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {isAr
                ? 'تم ضبط كافة أبعاد الغرف والمواصفات المعمارية. عند الضغط على زر "تأكيد ونشر العقار"، سيتم تحديث الصفحة العامة والمخطط الهندسي التفاعلي فوراً.'
                : 'All room metrology and layered engineering systems are synchronized. Clicking "Confirm & Publish Property" will deploy updates live immediately.'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Stepper Bottom Navigation Bar ─── */}
      <div className={styles.saveBar}>
        <div className={styles.saveBarStepIndicator}>
          <span>{isAr ? `الخطوة ${currentStep} من 5` : `Step ${currentStep} of 5`}</span>
          <span>•</span>
          <span style={{ color: '#DDA752' }}>
            {isAr ? steps[currentStep - 1]?.title_ar : steps[currentStep - 1]?.title_en}
          </span>
        </div>

        <div className={styles.saveBarControls}>
          <button type="button" className={styles.btnPrev} onClick={() => router.back()}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          {currentStep > 1 && (
            <button type="button" className={styles.btnPrev} onClick={handlePrevStep}>
              {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              <span>{isAr ? 'الخطوة السابقة' : 'Previous'}</span>
            </button>
          )}

          {currentStep < 5 ? (
            <button type="button" className={styles.btnNext} onClick={handleNextStep}>
              <span>{isAr ? 'الخطوة التالية' : 'Next Step'}</span>
              {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPublish}
              disabled={saving}
              id="admin-property-save"
              onClick={handleSubmit(onSubmit)}
            >
              {saving ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : isSaved ? (
                <Check size={16} strokeWidth={2.5} />
              ) : (
                <Save size={16} strokeWidth={1.5} />
              )}
              <span>
                {isSaved
                  ? (isAr ? 'تم النشر بنجاح ✓' : 'Published Successfully ✓')
                  : isEditing 
                    ? (isAr ? 'تأكيد وحفظ التعديلات ➔' : 'Confirm & Save Changes ➔') 
                    : (isAr ? 'تأكيد ونشر العقار ➔' : 'Confirm & Publish Property ➔')}
              </span>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
