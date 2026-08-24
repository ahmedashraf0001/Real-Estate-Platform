'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Save, Trash2, Upload, X, Layers, Image as ImageIcon, ChevronRight, ChevronLeft, Check, Eye, MapPin, Building2, Sparkles, FileText, PanelRightClose, PanelRightOpen, Sofa, Bed, Bath, Trees, Tag, DollarSign, Ruler, Compass, AlertCircle } from 'lucide-react';
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
  icon: 'sofa' | 'bed' | 'bath' | 'outdoor';
  match: (id: string, label?: string) => boolean;
}> = [
  {
    key: 'living',
    en: 'Living & Reception Areas',
    ar: 'المساحات المعيشية والاستقبال',
    icon: 'sofa',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('reception') || text.includes('living') || text.includes('dining') || text.includes('corridor') || text.includes('entrance') || text.includes('foyer') || text.includes('salon') || text.includes('office') || text.includes('storage') || text.includes('مساحات') || text.includes('معيشة') || text.includes('استقبال') || text.includes('مكتب') || text.includes('مخزن');
    },
  },
  {
    key: 'bedrooms',
    en: 'Bedrooms & Suites',
    ar: 'غرف النوم والأجنحة',
    icon: 'bed',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('bedroom') || text.includes('suite') || text.includes('maid') || text.includes('driver') || text.includes('dressing') || text.includes('نوم') || text.includes('غرفة') || text.includes('خادمة') || text.includes('سائق') || text.includes('ملابس');
    },
  },
  {
    key: 'baths_kitchen',
    en: 'Bathrooms & Kitchen',
    ar: 'الحمامات والمطبخ',
    icon: 'bath',
    match: (id: string, label?: string) => {
      const text = (id + ' ' + (label ?? '')).toLowerCase();
      return text.includes('bath') || text.includes('kitchen') || text.includes('toilet') || text.includes('wc') || text.includes('laundry') || text.includes('pantry') || text.includes('powder') || text.includes('حمام') || text.includes('مطبخ') || text.includes('غسيل') || text.includes('بوفيه');
    },
  },
  {
    key: 'outdoor',
    en: 'Outdoor & Terraces',
    ar: 'البلكونات والمساحات الخارجية',
    icon: 'outdoor',
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

function ReviewZoneCard({ zone, levelLabel, isAr }: { zone: ZoneInstance; levelLabel?: string; isAr: boolean }) {
  const badge = getZoneBadge(zone);
  const sqm = Math.round(zoneSqm(zone));

  const badgeCfg = {
    red_brick:      { en: 'Red Brick',   ar: 'طوب أحمر',   color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)',   border: 'rgba(217, 119, 6, 0.3)' },
    semi_finished:  { en: 'Semi',        ar: 'نص تشطيب',   color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)',  border: 'rgba(59, 130, 246, 0.3)' },
    fully_finished: { en: 'Finished',    ar: 'تشطيب كامل', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
    mixed:          { en: 'Mixed',       ar: 'مختلط',      color: '#DDA752', bg: 'rgba(221, 167, 82, 0.12)', border: 'rgba(221, 167, 82, 0.3)' },
    unknown:        null,
  }[badge];

  return (
    <div className={styles.reviewRoomCard}>
      <div className={styles.reviewRoomHead}>
        <div className={styles.reviewRoomTitleGroup}>
          <span className={styles.reviewRoomName}>
            {resolveZoneName(zone, isAr)}
          </span>
          <div className={styles.reviewRoomMeta}>
            {sqm > 0 && <span className={styles.reviewRoomSqm}>{sqm} m²</span>}
            {levelLabel && (
              <span className={styles.reviewRoomLevel}>
                {levelLabel}
              </span>
            )}
          </div>
        </div>
        {badgeCfg && (
          <span
            className={styles.reviewRoomBadge}
            style={{ color: badgeCfg.color, background: badgeCfg.bg, borderColor: badgeCfg.border }}
          >
            {isAr ? badgeCfg.ar : badgeCfg.en}
          </span>
        )}
      </div>
      <div className={styles.reviewRoomTrades}>
        {zone.trades.map((t) => {
          const isFinished = t.status.toLowerCase().includes('finish') || t.status.toLowerCase().includes('tile') || t.status.toLowerCase().includes('paint') || t.status.toLowerCase().includes('install');
          const isNotStarted = t.status.toLowerCase().includes('not') || t.status.toLowerCase().includes('none');

          return (
            <div key={t.id} className={styles.reviewTradeRow}>
              <span className={styles.reviewTradeName}>{resolveTradeName(t.trade_template_id, isAr)}</span>
              <span className={`${styles.reviewTradeStatus} ${isFinished ? styles.tradeFinished : isNotStarted ? styles.tradeNotStarted : styles.tradeInProgress}`}>
                {formatStatus(t.status, isAr)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function inferSubtype(property: Property | undefined): FormValues['subtype'] {
  if (!property) return 'standard';
  if (property.type === 'building') return 'residential';
  if (property.type === 'garage') return undefined;
  const zones = Array.isArray(property.spec_layers) ? (property.spec_layers as ZoneInstance[]) : [];
  const text = zones.map(z => `${z.zone_template_id} ${z.instance_label ?? ''} ${z.level_label ?? ''}`).join(' ');
  if (zones.some(z => z.zone_template_id === 'apt.level') || /Lower Floor|Upper Floor|الدور السفلي|الدور العلوي/.test(text)) return 'duplex';
  if (/الدور المشترك|وحدة أ|وحدة ب|Unit A|Unit B|السطح العلوي/.test(text)) return 'full_roof';
  if (/السطح|Roof/.test(text) && zones.length > 0) return 'standard_roof';
  if (/Private Garden|الحديقة الخاصة/.test(text)) return 'ground';
  return 'standard';
}

function generateSlug(text: string) {
  const base = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return `${base}-${Math.random().toString(36).substring(2, 8)}`;
}

const schema = z.object({
  title_en: z.string().min(3, 'English title must be at least 3 characters'),
  title_ar: z.string().min(3, 'Arabic title must be at least 3 characters'),
  price_egp: z.coerce.number().positive(),
  bedrooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  area_sqm: z.coerce.number().positive(),
  type: z.enum(['apartment', 'building', 'garage']),
  subtype: z.enum(['standard', 'ground', 'duplex', 'standard_roof', 'full_roof', 'residential', 'mixed']).optional(),
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
        if (parsed >= 1 && parsed <= 4) {
          setCurrentStep(parsed);
        }
      }
      if (sp.get('saved') === 'true') {
        setIsSaved(true);
      }
    }
  }, []);

  const [step3PromptOpen, setStep3PromptOpen] = useState(false);
  const [autoOpenWizard, setAutoOpenWizard] = useState(false);

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
      const valid = await trigger(['title_en', 'title_ar', 'price_egp', 'area_sqm']);
      if (!valid) return;
    } else if (currentStep === 2) {
      const valid = await trigger(['location']);
      if (!valid) return;
      // Prompt user before entering step 3 if apartment has no rooms yet
      if (selectedType === 'apartment' && zoneInstances.length === 0) {
        setStep3PromptOpen(true);
        return;
      }
    }
    goToStep(Math.min(currentStep + 1, 4));
  };

  const handleChooseWizard = () => {
    setStep3PromptOpen(false);
    setAutoOpenWizard(true);
    goToStep(3);
  };

  const handleChooseGroundZero = () => {
    setStep3PromptOpen(false);
    setAutoOpenWizard(false);
    setZoneInstances([]);
    goToStep(3);
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
  const [viewTags, setViewTags] = useState<string[]>(
    (property?.view ?? '').split(/[,،]/).map(s => s.trim()).filter(Boolean)
  );
  const [viewInput, setViewInput] = useState('');
  const [priceDraft, setPriceDraft] = useState<string>(
    property?.price_egp ? String(property.price_egp) : ''
  );

  const [inspectorZoneId, setInspectorZoneId] = useState<string | null>(null);
  const [roomsRailEl, setRoomsRailEl] = useState<HTMLDivElement | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [zoneInstances, setZoneInstances] = useState<ZoneInstance[]>(() => {
    if (property?.spec_layers && Array.isArray(property.spec_layers) && property.spec_layers.length > 0) {
      if ('zone_template_id' in property.spec_layers[0]) {
        return property.spec_layers as ZoneInstance[];
      }
    }
    // For new properties, start with empty array so Step 3 prompts the user with the Wizard vs Ground Zero choice
    return [];
  });

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: property ? {
      title_en: property.title_en || '',
      title_ar: property.title_ar || property.title_en || '',
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
      title_en: '',
      title_ar: '',
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
    { num: 3, title_en: 'Floor Plan & Finishes', title_ar: 'المخططات والتشطيب' },
    { num: 4, title_en: 'Review & Publish', title_ar: 'المراجعة والنشر' },
  ];

  const selectedType = watch('type');
  const bedroomsCount = watch('bedrooms') || 2;
  const selectedSubtype = watch('subtype');
  const totalFloorsRaw = watch('total_floors');
  const unitsPerFloorRaw = watch('units_per_floor');

  const confirmRebuild = () => {
    if (zoneInstances.length === 0) return true;
    const customized = isEditing || zoneInstances.some(z => z.images?.length || z.spatial);
    if (!customized) return true;
    return window.confirm(isAr
      ? 'سيؤدي هذا إلى إعادة بناء غرف المخطط واستبدال التخصيصات الحالية (الأبعاد، التشطيبات، الصور). هل تريد المتابعة؟'
      : 'This rebuilds the floor plan rooms and replaces current customizations (dimensions, finishes, photos). Continue?');
  };

  const reseedZones = (
    type: FormValues['type'],
    subtype: FormValues['subtype'],
    totalFloors?: number | '',
    unitsPerFloor?: number | '',
  ) => {
    setZoneInstances(buildZoneInstances(type, 'semi_finished', bedroomsCount, {
      subtype,
      totalFloors: typeof totalFloors === 'number' ? totalFloors : undefined,
      unitsPerFloor: typeof unitsPerFloor === 'number' ? unitsPerFloor : undefined,
    }));
    setInspectorZoneId(null);
  };

  const handleTypeChange = (newType: string) => {
    const typed = newType as FormValues['type'];
    if (typed !== selectedType && !confirmRebuild()) return;
    setValue('type', typed, { shouldValidate: true });
    const defaultSub = typed === 'apartment' ? 'standard' : typed === 'building' ? 'residential' : undefined;
    setValue('subtype', defaultSub);
    if (typed === 'building' || typed === 'garage') {
      reseedZones(typed, defaultSub);
    } else {
      setZoneInstances([]);
      setAutoOpenWizard(false);
    }
  };

  const handleSubtypeChange = (newSubtype: string) => {
    const sub = newSubtype as FormValues['subtype'];
    if (sub === selectedSubtype) return;
    if (!confirmRebuild()) return;
    setValue('subtype', sub);
    const tf = Number(totalFloorsRaw) || undefined;
    const uf = Number(unitsPerFloorRaw) || undefined;
    if (selectedType === 'building') {
      reseedZones(selectedType, sub, tf, uf);
    } else {
      setZoneInstances([]);
      setAutoOpenWizard(false);
    }
  };

  const handleBuildingConfigChange = (field: 'total_floors' | 'units_per_floor', raw: string) => {
    const num = raw === '' ? '' : Math.max(1, Math.min(field === 'total_floors' ? 15 : 6, Number(raw) || 1));
    const tf = field === 'total_floors' ? num : totalFloorsRaw;
    const uf = field === 'units_per_floor' ? num : unitsPerFloorRaw;
    const willReseed = typeof tf === 'number' && typeof uf === 'number' && selectedType === 'building';
    if (willReseed && !confirmRebuild()) return;
    setValue(field, num as FormValues['total_floors']);
    if (willReseed) {
      reseedZones(selectedType, selectedSubtype, tf, uf);
    }
  };

  // Tiptap editors for English and Arabic descriptions
  const editorEn = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write luxury property architectural brief in English...' }),
    ],
    content: property?.description_en ?? '',
  });

  const editorAr = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'اكتب الوصف المعماري والتسويقي الفاخر للعقار باللغة العربية...' }),
    ],
    content: property?.description_ar ?? property?.description_en ?? '',
  });

  const [descTab, setDescTab] = useState<'en' | 'ar'>(isAr ? 'ar' : 'en');

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
    const title = (isAr ? watch('title_ar') || watch('title_en') : watch('title_en') || watch('title_ar')) || 'Property Specification Report';
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
                    <span>${isAr ? cat.ar : cat.en}</span>
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
        title_en: data.title_en,
        title_ar: data.title_ar,
        price_egp: data.price_egp,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area_sqm: data.area_sqm,
        type: data.type,
        location: data.location,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        completion_status: data.completion_status,
        listing_status: data.listing_status,
        is_featured: data.is_featured,
        view: data.view || null,
        floor_number: (data.floor_number === '' || data.floor_number === null || data.floor_number === undefined) ? null : Number(data.floor_number),
        description_en: editorEn?.getHTML() ?? '',
        description_ar: editorAr?.getHTML() ?? '',
        spec_layers: zoneInstances,
      };

      const payload = isEditing && property 
        ? payloadBase 
        : { ...payloadBase, slug: generateSlug(data.title_en || data.title_ar) };

      const res = await saveProperty(payload, isEditing, property?.id, amenities, previewUrls);
      
      if (!res.success) {
        throw new Error(res.error);
      }

      toast.success(isAr ? (isEditing ? 'تم تحديث العقار بنجاح!' : 'تم إنشاء العقار بنجاح!') : (isEditing ? 'Property updated!' : 'Property created!'));
      setSavedSlug(res.slug || property?.slug || null);
      setIsSaved(true);
      setCurrentStep(4);
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

  function parsePriceDraft(raw: string): number | null {
    const m = raw.trim().toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(k|m)?$/);
    if (!m) return null;
    const mult = m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1_000 : 1;
    return Math.round(parseFloat(m[1]) * mult);
  }

  const priceParsed = parsePriceDraft(priceDraft);

  function handlePriceChange(raw: string) {
    setPriceDraft(raw);
    const parsed = parsePriceDraft(raw);
    if (parsed !== null) setValue('price_egp', parsed, { shouldValidate: false });
  }

  function applyPriceMagnitude(suffix: 'k' | 'm') {
    const numericPart = priceDraft.trim().toLowerCase().replace(/,/g, '').replace(/(k|m)$/, '');
    if (!numericPart || isNaN(parseFloat(numericPart))) return;
    handlePriceChange(`${numericPart}${suffix}`);
  }

  function syncViewTags(tags: string[]) {
    setViewTags(tags);
    setValue('view', tags.join(', '));
  }

  function handleAddViewTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = viewInput.trim();
    if (val && !viewTags.includes(val)) {
      syncViewTags([...viewTags, val]);
      setViewInput('');
    }
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
    <form onSubmit={handleSubmit(onSubmit)} className={`${styles.form} ${currentStep === 3 ? (railOpen ? 'form-step-3-with-rail' : 'form-step-3-full') : ''}`} onKeyDown={(e) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
        e.preventDefault();
      }
    }}>
      <style>{`
        .form-step-3-with-rail {
          max-width: 100% !important;
          padding-inline-end: 356px;
        }
        .form-step-3-full {
          max-width: 100% !important;
          padding-inline-end: 0;
        }
        @media (max-width: 1023px) {
          .form-step-3-with-rail, .form-step-3-full { padding-inline-end: 0; }
        }
      `}</style>

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

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>🇬🇧</span>
                  <span>{isAr ? 'عنوان العقار (إنجليزي) *' : 'Property Title (English) *'}</span>
                </span>
              </label>
              <input 
                type="text" 
                dir="ltr"
                className={`${styles.input} ${errors.title_en ? styles.err : ''}`} 
                {...register('title_en')} 
                placeholder="e.g. Direct Sea-Front Luxury Chalet in Sidi Abdel Rahman" 
              />
              {errors.title_en && <p className={styles.errMsg}>{errors.title_en.message}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>🇪🇬</span>
                  <span>{isAr ? 'عنوان العقار (عربي) *' : 'Property Title (Arabic) *'}</span>
                </span>
              </label>
              <input 
                type="text" 
                dir="rtl"
                className={`${styles.input} ${errors.title_ar ? styles.err : ''}`} 
                {...register('title_ar')} 
                placeholder="مثال: شاليه فاخر مباشر على البحر في سيدي عبد الرحمن" 
              />
              {errors.title_ar && <p className={styles.errMsg}>{errors.title_ar.message}</p>}
            </div>
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
                    { value: 'standard',      en: 'Standard Flat', ar: 'شقة عادية' },
                    { value: 'duplex',        en: 'Duplex (دورين)', ar: 'دوبلكس (دورين)' },
                    { value: 'standard_roof', en: 'Standard Roof (Low-End Flat on Rooftop)', ar: 'روف عادي (شقة بسيطة على السطح)' },
                    { value: 'full_roof',     en: 'Premium Roof (150m + 150m + Open Rooftop)', ar: 'روف بريميم (150م + 150م + سطح مكشوف)' },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  className={`${styles.input} ${errors.price_egp ? styles.err : ''}`}
                  value={priceDraft}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  placeholder={isAr ? 'مثال: 850k أو 12.5m' : 'e.g. 850k or 12.5m'}
                  style={{ flex: 1, minWidth: 0 }}
                />
                {(['k', 'm'] as const).map(sfx => (
                  <button
                    key={sfx}
                    type="button"
                    onClick={() => applyPriceMagnitude(sfx)}
                    title={sfx === 'k' ? '× 1,000' : '× 1,000,000'}
                    style={{
                      flexShrink: 0,
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: priceDraft.trim().toLowerCase().endsWith(sfx) ? 'rgba(221,167,82,0.18)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${priceDraft.trim().toLowerCase().endsWith(sfx) ? '#DDA752' : 'rgba(221,167,82,0.25)'}`,
                      color: priceDraft.trim().toLowerCase().endsWith(sfx) ? '#DDA752' : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {sfx.toUpperCase()}
                  </button>
                ))}
              </div>
              {priceParsed !== null && priceParsed > 0 && (
                <p style={{ margin: '6px 2px 0', fontSize: 12.5, fontWeight: 700, color: '#DDA752' }} dir="ltr">
                  = {priceParsed.toLocaleString()} EGP
                </p>
              )}
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
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'الإطلالة (اضغط Enter للإضافة)' : 'View (Press Enter to add)'}</label>
              <div className={styles.tagsInputContainer}>
                {viewTags.map((tag) => (
                  <div key={tag} className={styles.tag}>
                    {tag}
                    <button type="button" onClick={() => syncViewTags(viewTags.filter(t => t !== tag))} className={styles.tagRemove}>
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  className={styles.tagsInput}
                  placeholder={isAr ? 'مثال: إطلالة على المسبح، البحر...' : 'e.g. Pool View, Sea View...'}
                  value={viewInput}
                  onChange={(e) => setViewInput(e.target.value)}
                  onKeyDown={handleAddViewTag}
                />
              </div>
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
        <div className="step2-vertical-layout">
          <style>{`
            .step2-vertical-layout {
              display: flex;
              flex-direction: column;
              gap: 24px;
              width: 100%;
            }
            .step2-top-row {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
              gap: 20px;
              align-items: stretch;
              width: 100%;
            }
            .step2-top-row .step2-card {
              height: 100%;
              box-sizing: border-box;
            }
            @media (max-width: 1024px) {
              .step2-top-row {
                grid-template-columns: 1fr;
              }
              .step2-top-row .step2-card {
                height: auto;
              }
            }
            .step2-card {
              background: rgba(13, 19, 34, 0.75);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(221, 167, 82, 0.18);
              border-radius: 18px;
              padding: 22px 24px;
              display: flex;
              flex-direction: column;
              gap: 16px;
              box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
              box-sizing: border-box;
            }
            [data-theme="light"] .step2-card {
              background: #FFFFFF;
              border-color: rgba(0, 0, 0, 0.08);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
            }
            .step2-card-head {
              display: flex;
              align-items: center;
              gap: 10px;
              padding-bottom: 12px;
              border-bottom: 1px solid rgba(221, 167, 82, 0.12);
            }
            .step2-card-icon {
              width: 32px;
              height: 32px;
              border-radius: 8px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: rgba(221, 167, 82, 0.12);
              color: #DDA752;
              border: 1px solid rgba(221, 167, 82, 0.25);
            }
            .step2-card-title {
              font-size: 0.85rem;
              font-weight: 800;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: #DDA752;
              margin: 0;
            }
            .step2-dropzone-compact {
              border: 1.5px dashed rgba(221, 167, 82, 0.3);
              border-radius: 14px;
              padding: 24px 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 8px;
              cursor: pointer;
              background: rgba(221, 167, 82, 0.02);
              transition: all 0.2s ease;
              text-align: center;
            }
            .step2-dropzone-compact:hover {
              border-color: #DDA752;
              background: rgba(221, 167, 82, 0.06);
              transform: translateY(-1px);
            }
            .step2-dropzone-icon {
              color: #DDA752;
            }
            .step2-dropzone-text {
              font-size: 0.78rem;
              color: rgba(237, 232, 221, 0.7);
              margin: 0;
            }
            [data-theme="light"] .step2-dropzone-text {
              color: #64748B;
            }
          `}</style>

          {/* Top Row: Media Gallery & Rich Description */}
          <div className="step2-top-row">
            {/* Overview Photos */}
            <div className="step2-card">
              <div className="step2-card-head">
                <div className="step2-card-icon">
                  <ImageIcon size={16} />
                </div>
                <h2 className="step2-card-title">
                  {isAr ? 'صور الغلاف والمعرض العام' : 'Overview & Hero Gallery Photos'}
                </h2>
              </div>

              <div {...getRootProps()} className="step2-dropzone-compact">
                <input {...getInputProps()} />
                {uploadingImages ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DDA752', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Loader2 size={18} className={styles.spinner} />
                    <span>{isAr ? 'جاري رفع الصور...' : 'Uploading gallery photos…'}</span>
                  </div>
                ) : (
                  <>
                    <Upload size={22} strokeWidth={1.75} className="step2-dropzone-icon" />
                    <p className="step2-dropzone-text">
                      {isDragActive 
                        ? (isAr ? 'أفلت الصور العامة هنا' : 'Drop overview images here') 
                        : (isAr ? 'اسحب صور المعرض العام هنا أو انقر للتصفح' : 'Drag overview gallery images here or click to browse')}
                    </p>
                  </>
                )}
              </div>

              {previewUrls.length > 0 && (
                <div className={styles.previews}>
                  {previewUrls.map((url) => (
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

            {/* Description & Key Amenities */}
            <div className="step2-card">
              <div className="step2-card-head">
                <div className="step2-card-icon">
                  <Sparkles size={16} />
                </div>
                <h2 className="step2-card-title">
                  {isAr ? 'الوصف والمرافق المميزة' : 'Description & Key Amenities'}
                </h2>
              </div>
              
              <div className={styles.field}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label className={styles.label} style={{ margin: 0 }}>
                    {isAr ? 'الوصف المعماري والتسويقي *' : 'Architectural Description *'}
                  </label>

                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setDescTab('en')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: descTab === 'en' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                        color: descTab === 'en' ? '#0A0C10' : 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 150ms ease'
                      }}
                    >
                      <span>🇬🇧</span>
                      <span>English</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDescTab('ar')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: descTab === 'ar' ? 'linear-gradient(135deg, #E5B869 0%, #C5A059 100%)' : 'transparent',
                        color: descTab === 'ar' ? '#0A0C10' : 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 150ms ease'
                      }}
                    >
                      <span>🇪🇬</span>
                      <span>العربية</span>
                    </button>
                  </div>
                </div>

                <div className={styles.tiptap} dir={descTab === 'ar' ? 'rtl' : 'ltr'}>
                  {descTab === 'en' ? (
                    <EditorContent editor={editorEn} />
                  ) : (
                    <EditorContent editor={editorAr} />
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{isAr ? 'المرافق المميزة (اضغط Enter للإضافة)' : 'Key Amenities (Press Enter to add)'}</label>
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
                    placeholder={isAr ? "مثال: مسبح خاص، نادي صحي، تراس بانورامي..." : "e.g. Private Pool, Gym, Panoramic Terrace..."}
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={handleAddAmenity}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width Bottom Section: Location & Interactive Map */}
          <div className="step2-card" style={{ width: '100%' }}>
            <div className="step2-card-head">
              <div className="step2-card-icon">
                <MapPin size={16} />
              </div>
              <h2 className="step2-card-title">
                {isAr ? 'الموقع الجغرافي وتحديد الإحداثيات على الخريطة' : 'Property Location & Coordinates'}
              </h2>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{isAr ? 'اسم الموقع / الحي والمنطقة *' : 'Location / Area & Neighborhood *'}</label>
              <input 
                className={`${styles.input} ${errors.location ? styles.err : ''}`} 
                {...register('location')} 
                placeholder={isAr ? "مثال: بيفرلي هيلز، الشيخ زايد" : "e.g. Beverly Hills, Sheikh Zayed"} 
              />
              {errors.location && <p className={styles.errMsg}>{errors.location.message}</p>}
            </div>

            <div className={styles.field} style={{ marginTop: '4px' }}>
              <label className={styles.label}>{isAr ? 'حدد الموقع الدقيق على الخريطة التفاعلية' : 'Pinpoint Location on Map'}</label>
              <DynamicMapPicker 
                latitude={watch('latitude')} 
                longitude={watch('longitude')} 
                onChange={(lat, lng) => {
                  setValue('latitude', lat, { shouldValidate: true });
                  setValue('longitude', lng, { shouldValidate: true });
                }}
                isAr={isAr}
              />
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
            subtype={selectedSubtype}
            bedrooms={bedroomsCount}
            declaredArea={Number(watch('area_sqm')) || undefined}
            selectedZoneId={inspectorZoneId}
            onSelectedZoneIdChange={(id) => {
              setInspectorZoneId(id);
              if (id) setRailOpen(true);
            }}
            listPortalTarget={roomsRailEl}
            onPresetMeta={({ bedrooms, bathrooms, floorNumber }) => {
              setValue('bedrooms', bedrooms);
              setValue('bathrooms', bathrooms);
              if (floorNumber !== null) setValue('floor_number', floorNumber);
            }}
            autoOpenWizardOnEmpty={autoOpenWizard}
            isAr={isAr}
          />

          <div className={`rooms-rail ${railOpen ? '' : 'closed'}`} dir={isAr ? 'rtl' : 'ltr'}>
            <div className="rooms-rail-head">
              {inspectorZoneId ? (
                <button
                  type="button"
                  className="rooms-rail-back-btn"
                  onClick={() => setInspectorZoneId(null)}
                  title={isAr ? 'العودة لقائمة الغرف' : 'Back to all rooms'}
                >
                  <ChevronLeft size={15} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                  <span>{isAr ? 'قائمة الغرف' : 'All Rooms'}</span>
                </button>
              ) : (
                <span className="rooms-rail-title">{isAr ? 'الغرف' : 'ROOMS'}</span>
              )}
              <button
                type="button"
                className="rooms-rail-toggle"
                aria-label={isAr ? 'إخفاء اللوحة' : 'Hide panel'}
                onClick={() => { setRailOpen(false); setInspectorZoneId(null); }}
              >
                <PanelRightClose size={14} />
              </button>
            </div>

            <div className="rooms-rail-body" ref={setRoomsRailEl} style={{ display: inspectorZoneId ? 'none' : 'flex' }} />

            {inspectorZoneId && (
              <div className="rooms-rail-inspector-scroll">
                <ZoneInspector
                  zoneInstances={zoneInstances}
                  onZoneInstancesChange={setZoneInstances}
                  selectedZoneId={inspectorZoneId}
                  declaredArea={Number(watch('area_sqm')) || undefined}
                  nested={false}
                  onClose={() => setInspectorZoneId(null)}
                  isAr={isAr}
                />
              </div>
            )}
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

          <style>{`
            .rooms-rail {
              position: fixed;
              top: 0;
              bottom: 72px;
              inset-inline-end: 0;
              width: 340px;
              height: calc(100dvh - 72px);
              z-index: 60;
              background: #0D1220;
              border-inline-start: 1px solid rgba(221, 167, 82, 0.16);
              border-bottom: 1px solid rgba(221, 167, 82, 0.16);
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
              background: #0A0E18;
              min-height: 48px;
            }
            .rooms-rail-title {
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.12em;
              color: rgba(237, 232, 221, 0.55);
            }
            .rooms-rail-back-btn {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: rgba(221, 167, 82, 0.08);
              border: 1px solid rgba(221, 167, 82, 0.25);
              color: #DDA752;
              font-family: 'Plus Jakarta Sans', sans-serif;
              font-size: 0.75rem;
              font-weight: 700;
              cursor: pointer;
              padding: 5px 9px;
              border-radius: 7px;
              transition: all 0.15s ease;
            }
            .rooms-rail-back-btn:hover {
              background: rgba(221, 167, 82, 0.18);
              border-color: #DDA752;
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
              overflow-y: auto;
            }
            .rooms-rail-body > .fp-list-panel { flex: 1; min-height: 0; }

            .rooms-rail-inspector-scroll {
              flex: 1;
              min-height: 0;
              overflow-y: auto;
            }

            .rooms-rail .zi-root {
              position: static !important;
              width: 100% !important;
              height: auto !important;
              max-height: none !important;
              box-shadow: none !important;
              border-inline-start: none !important;
              border-inline-end: none !important;
              background: transparent !important;
              padding: 12px 14px 28px !important;
              z-index: auto !important;
            }

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

      {/* ─── STEP 4: Full Pre-Save Specification & Property Summary Review ─── */}
      {currentStep === 4 && (
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

          {/* ─── Step 4 Header ─── */}
          <div className={styles.reviewHeader}>
            <div>
              <div className={styles.reviewBadge}>
                <Sparkles size={13} />
                <span>{isAr ? 'الخطوة ٤: مراجعة العقار والنشر النهائي' : 'STEP 4: FINAL SPECIFICATION REVIEW'}</span>
              </div>
              <h2 className={styles.reviewTitle}>
                {isAr ? 'مراجعة ملخص العقار والمواصفات المعمارية' : 'Review Property & CAD Specs Summary'}
              </h2>
              <p className={styles.reviewSubtitle}>
                {isAr
                  ? 'راجع تفاصيل العقار وأبعاد المخطط الهندسي وكافة المواصفات أدناه قبل التأكيد والنشر النهائي.'
                  : 'Review property identity, CAD floor plan metrology, and engineering specifications before live publishing.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrintSummary}
              className={styles.reviewPdfBtn}
            >
              <FileText size={14} />
              <span>{isAr ? 'طباعة تقرير المواصفات PDF' : 'Download Specification Dossier PDF'}</span>
            </button>
          </div>

          {/* ─── 4 Modern Summary Metrics Cards ─── */}
          <div className={styles.reviewStatsGrid}>
            {/* Metric 1: Title & Location */}
            <div className={styles.reviewStatCard}>
              <div className={styles.reviewStatIconWrap}>
                <Building2 size={18} />
              </div>
              <div className={styles.reviewStatContent}>
                <span className={styles.reviewStatLabel}>{isAr ? 'العنوان والموقع' : 'Title & Location'}</span>
                <span className={styles.reviewStatMainText}>
                  {isAr ? (watch('title_ar') || watch('title_en')) : (watch('title_en') || watch('title_ar')) || '—'}
                </span>
                <span className={styles.reviewStatSubText}>
                  <MapPin size={12} />
                  {watch('location') || (isAr ? 'لم يحدد الموقع' : 'No location specified')}
                </span>
              </div>
            </div>

            {/* Metric 2: Pricing & Specs */}
            <div className={styles.reviewStatCard}>
              <div className={styles.reviewStatIconWrap}>
                <DollarSign size={18} />
              </div>
              <div className={styles.reviewStatContent}>
                <span className={styles.reviewStatLabel}>{isAr ? 'السعر والمساحة' : 'Pricing & Specs'}</span>
                <span className={styles.reviewStatPrice}>
                  {watch('price_egp') ? `${Number(watch('price_egp')).toLocaleString()} EGP` : '—'}
                </span>
                <span className={styles.reviewStatSubText}>
                  {selectedType} • {watch('area_sqm')} m² • {bedroomsCount} {isAr ? 'غرف' : 'Bedrooms'}
                </span>
              </div>
            </div>

            {/* Metric 3: Media & Photos */}
            <div className={styles.reviewStatCard}>
              <div className={styles.reviewStatIconWrap}>
                <ImageIcon size={18} />
              </div>
              <div className={styles.reviewStatContent}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={styles.reviewStatLabel}>{isAr ? 'معاينة الوسائط' : 'Media & Photos'}</span>
                  <span className={styles.reviewStatCountBadge}>
                    {previewUrls.length} {isAr ? 'صور' : 'Photos'}
                  </span>
                </div>
                {previewUrls.length > 0 ? (
                  <div className={styles.reviewMediaThumbs}>
                    {previewUrls.slice(0, 4).map((url, i) => (
                      <div key={i} className={styles.reviewMediaThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Photo ${i + 1}`} />
                        {i === 3 && previewUrls.length > 4 && (
                          <div className={styles.reviewMediaOverflow}>
                            +{previewUrls.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className={styles.reviewStatSubText}>
                    {isAr ? 'لم يتم إرفاق صور بعد' : 'No photos uploaded yet'}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 4: Blueprint & Trade Specs */}
            <div className={styles.reviewStatCard}>
              <div className={styles.reviewStatIconWrap}>
                <Compass size={18} />
              </div>
              <div className={styles.reviewStatContent}>
                <span className={styles.reviewStatLabel}>{isAr ? 'المخطط الهندسي' : 'Blueprint & Trades'}</span>
                {(() => {
                  const leaves = flattenLeafZones(zoneInstances);
                  const totalSqm = Math.round(leaves.reduce((acc, { zone }) => acc + zoneSqm(zone), 0));
                  const declared = Number(watch('area_sqm')) || 0;
                  const ratio = declared > 0 ? totalSqm / declared : 0;
                  const matches = declared > 0 && ratio >= 0.9 && ratio <= 1.1;
                  const tradeCount = leaves.reduce((acc, { zone }) => acc + zone.trades.length, 0);

                  return (
                    <>
                      <span className={styles.reviewStatMainText}>
                        {leaves.length} {isAr ? 'غرفة' : 'Rooms'} · <bdi dir="ltr">{totalSqm} m²</bdi>
                      </span>
                      <div className={styles.reviewStatSubText}>
                        <span>{tradeCount} {isAr ? 'بند تشطيب' : 'Trade Specs'}</span>
                        {declared > 0 && (
                          <span className={matches ? styles.reconTagOk : styles.reconTagWarn}>
                            {matches
                              ? (isAr ? 'مطابق للمساحة ✓' : 'Matches area ✓')
                              : (isAr ? `المعلن ${declared} م²` : `Declared ${declared} m²`)}
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ─── Categorized Human-Readable Zones Breakdown ─── */}
          <div className={styles.reviewBreakdownBox}>
            <div className={styles.reviewBreakdownHead}>
              <div className={styles.reviewBreakdownTitleWrap}>
                <Layers size={18} className={styles.reviewBreakdownIcon} />
                <h3 className={styles.reviewBreakdownTitle}>
                  {isAr ? 'توزيع الغرف والمواصفات المسجلة' : 'Registered Finishing & Zone Breakdown'}
                </h3>
              </div>
              <span className={styles.reviewBreakdownCount}>
                {flattenLeafZones(zoneInstances).length} {isAr ? 'غرفة جاهزة' : 'Zones Configured'}
              </span>
            </div>

            <div className={styles.reviewBucketsStack}>
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
                    <div key={cat.key} className={styles.reviewBucketCard}>
                      <div className={styles.reviewBucketHead}>
                        <div className={styles.reviewBucketTitleWrap}>
                          <span className={styles.reviewBucketIconWrap}>
                            {cat.icon === 'sofa' && <Sofa size={14} />}
                            {cat.icon === 'bed' && <Bed size={14} />}
                            {cat.icon === 'bath' && <Bath size={14} />}
                            {cat.icon === 'outdoor' && <Trees size={14} />}
                          </span>
                          <h4 className={styles.reviewBucketTitle}>
                            {isAr ? cat.ar : cat.en}
                          </h4>
                        </div>
                        <span className={styles.reviewBucketCountBadge}>
                          {catZones.length} {isAr ? 'غرفة' : 'Rooms'}
                        </span>
                      </div>

                      <div className={styles.reviewRoomsGrid}>
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
                      <div className={styles.reviewBucketCard}>
                        <div className={styles.reviewBucketHead}>
                          <div className={styles.reviewBucketTitleWrap}>
                            <span className={styles.reviewBucketIconWrap}>
                              <Building2 size={14} />
                            </span>
                            <h4 className={styles.reviewBucketTitle}>
                              {isAr ? 'مساحات أخرى' : 'Other Areas'}
                            </h4>
                          </div>
                          <span className={styles.reviewBucketCountBadge}>
                            {uncategorizedZones.length} {isAr ? 'غرفة' : 'Rooms'}
                          </span>
                        </div>

                        <div className={styles.reviewRoomsGrid}>
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

          {/* Verification Callout Note */}
          <div className={styles.reviewVerifyNotice}>
            <div className={styles.reviewVerifyNoticeIcon}>
              <Check size={16} />
            </div>
            <div className={styles.reviewVerifyNoticeContent}>
              <h4 className={styles.reviewVerifyNoticeTitle}>
                {isAr ? 'مراجعة المخطط والمواصفات جاهزة' : 'Pre-Publish Verification Complete'}
              </h4>
              <p className={styles.reviewVerifyNoticeText}>
                {isAr
                  ? 'تمت مطابقة كافة مقاسات المخطط وبنود التشطيب. اضغط على "تأكيد ونشر العقار" في الشريط السفلي لنشر العقار مباشرة.'
                  : 'All room metrology and layered engineering systems are synchronized. Click "Confirm & Publish Property" to make this listing live.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Stepper Bottom Navigation Bar ─── */}
      <div className={styles.saveBar}>
        <div className={styles.saveBarStepper}>
          {steps.map((st, idx) => {
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;
            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (st.num === 3 && currentStep !== 3 && selectedType === 'apartment' && zoneInstances.length === 0) {
                      setStep3PromptOpen(true);
                      return;
                    }
                    if (st.num < currentStep || currentStep > 1) {
                      goToStep(st.num);
                    }
                  }}
                  className={`${styles.saveBarStepItem} ${isActive ? styles.saveBarStepItemActive : ''} ${isCompleted ? styles.saveBarStepItemCompleted : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                  title={isAr ? st.title_ar : st.title_en}
                >
                  <div className={styles.saveBarStepBadge}>
                    {isCompleted ? <Check size={13} strokeWidth={2.5} /> : st.num}
                  </div>
                  <div className={styles.saveBarStepText}>
                    <span className={styles.saveBarStepNum}>{isAr ? `الخطوة ${st.num}` : `Step ${st.num}`}</span>
                    <span className={styles.saveBarStepTitle}>{isAr ? st.title_ar : st.title_en}</span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`${styles.saveBarStepLine} ${isCompleted ? styles.saveBarStepLineActive : ''}`} />
                )}
              </React.Fragment>
            );
          })}
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

          {currentStep < 4 ? (
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

      {/* ─── Modal Choice Before Step 3: Wizard vs Ground Zero ─── */}
      {step3PromptOpen && (
        <div className={styles.promptOverlay} role="dialog" aria-modal="true">
          <div className={styles.promptModal}>
            <div className={styles.promptHeader}>
              <div className={styles.promptBadge}>
                <Sparkles size={14} />
                <span>{isAr ? 'إعداد المخطط المعماري (الخطوة ٣)' : 'STEP 3: BLUEPRINT SETUP'}</span>
              </div>
              <button type="button" className={styles.promptClose} onClick={() => setStep3PromptOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <h3 className={styles.promptTitle}>
              {isAr ? 'كيف ترغب في بناء المخطط الهندسي؟' : 'How would you like to build the floor plan?'}
            </h3>
            <p className={styles.promptSubtitle}>
              {isAr
                ? 'اختر بين استخدام معالج التوليد الذكي لإنشاء التوزيع والمقاسات ومستوى التشطيب بضغطة زر، أو البدء من الصفر داخل حدود الشقة.'
                : 'Choose whether to generate an automated architectural layout with custom dimensions & finishing, or start with clean boundary walls from ground zero.'}
            </p>

            <div className={styles.promptCards}>
              {/* Option A: Smart Preset Wizard */}
              <div className={`${styles.promptCard} ${styles.promptCardPrimary}`} onClick={handleChooseWizard}>
                <div className={styles.promptCardTag}>{isAr ? 'موصى به' : 'RECOMMENDED'}</div>
                <div className={styles.promptIconBox}>
                  <Sparkles size={26} />
                </div>
                <h4 className={styles.promptCardTitle}>
                  {isAr ? 'معالج التوليد الذكي' : 'Smart Preset Wizard'}
                </h4>
                <p className={styles.promptCardDesc}>
                  {isAr
                    ? 'حدد عدد الغرف، الصالة، البلكونات، والمساحات الإضافية ومستوى التشطيب لتوليد المخطط وتعديله بحرية.'
                    : 'Configure bedrooms, living room, balconies, extra layout spaces and finishing level to generate the layout.'}
                </p>
                <button type="button" className={styles.promptBtnPrimary}>
                  <Sparkles size={14} />
                  <span>{isAr ? 'توليد بالمعالج والمتابعة' : 'Generate with Wizard'}</span>
                </button>
              </div>

              {/* Option B: Build from Ground Zero */}
              <div className={styles.promptCard} onClick={handleChooseGroundZero}>
                <div className={`${styles.promptIconBox} ${styles.promptIconBoxMuted}`}>
                  <Layers size={26} />
                </div>
                <h4 className={styles.promptCardTitle}>
                  {isAr ? 'البدء من نقطة الصفر' : 'Build from Ground Zero'}
                </h4>
                <p className={styles.promptCardDesc}>
                  {isAr
                    ? 'مساحة عمل فارغة محاطة بحدود الشقة الخارجية، لتضيف وتسحب وتوزع الغرف والأبواب يدوياً.'
                    : 'Start with clean outer perimeter boundary walls and assemble rooms, partitions & doors manually.'}
                </p>
                <button type="button" className={styles.promptBtnOutline}>
                  <span>{isAr ? 'البدء بحدود فارغة' : 'Start from Scratch'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
