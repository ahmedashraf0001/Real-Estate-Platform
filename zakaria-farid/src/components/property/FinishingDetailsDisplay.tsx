'use client';

import { useState, useCallback, useRef } from 'react';
import {
  MessageCircle, FileText, X, Download, Printer,
  Layers, Thermometer, Zap, Droplets, PaintBucket, DoorOpen,
  Wind, TreePine, ShieldCheck, Car, Wrench, Sofa, Tv,
  Bed, BedDouble, Bath, ChefHat, Utensils, Sun, Building2, Sparkles,
  ChevronLeft, ChevronRight, Info, CheckCircle2, Sliders, ArrowRight, ArrowLeft
} from 'lucide-react';
import type { ZoneInstance, TradeInstance } from '@/lib/layering/instances';
import {
  getZoneBadge,
  getZoneTemplateLabels,
  getTradeTemplateLabels,
  groupByFloor,
  type FinishBadge,
} from '@/lib/layering/instances';
import { ATTRIBUTE_TEMPLATES, ZONE_TEMPLATES } from '@/lib/layering/templates';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './FinishingDetailsDisplay.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  zones: ZoneInstance[];
  propertyTitle: string;
  locale: string;
  propertyImages?: string[];
}

const BADGE_CONFIG: Record<FinishBadge, { en: string; ar: string; cls: string; icon: string }> = {
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل', cls: 'badgeFull',    icon: '✨' },
  semi_finished:  { en: 'Semi-Finished',  ar: 'نص تشطيب',   cls: 'badgeSemi',    icon: '🏗️' },
  red_brick:      { en: 'Red Brick',      ar: 'طوب أحمر',   cls: 'badgeBrick',   icon: '🧱' },
  mixed:          { en: 'Mixed',          ar: 'مختلط',      cls: 'badgeMixed',   icon: '↕️' },
  unknown:        { en: 'Not Specified',  ar: 'غير محدد',   cls: 'badgeUnknown', icon: '—' },
};

// ─── Curated Luxury Room Category Photos ────────────────────────────────────────

const DEFAULT_ZONE_PHOTOS: Record<string, string> = {
  'apt.reception':     'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  'vil.g.reception':   'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
  'vil.g.entrance':    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'vil.g.dining':      'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
  'vil.f.family_room': 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',

  'apt.master_bed':    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
  'apt.std_bed':       'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
  'vil.f.master_suite':'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
  'vil.f.std_bed':     'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
  'vil.r.guest_suite': 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',

  'apt.master_bath':   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'apt.main_bath':     'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'apt.guest_bath':    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'vil.g.powder_room': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'vil.f.master_bath': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
  'vil.f.main_bath':   'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',

  'apt.kitchen':       'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  'vil.g.kitchen':     'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',

  'apt.balcony':       'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'apt.corridor':      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'apt.open_terrace':  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  'vil.exterior':      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  'vil.r.terrace':     'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
};

// ─── Zone Category Icons ─────────────────────────────────────────────────────

const ZONE_ICONS: Record<string, React.ReactNode> = {
  'apt.reception':     <Sofa size={18} strokeWidth={1.5} />,
  'vil.g.reception':   <Sofa size={18} strokeWidth={1.5} />,
  'vil.g.entrance':    <DoorOpen size={18} strokeWidth={1.5} />,
  'vil.g.dining':      <Utensils size={18} strokeWidth={1.5} />,
  'vil.f.family_room': <Tv size={18} strokeWidth={1.5} />,

  'apt.master_bed':    <BedDouble size={18} strokeWidth={1.5} />,
  'apt.std_bed':       <Bed size={18} strokeWidth={1.5} />,
  'vil.f.master_suite':<BedDouble size={18} strokeWidth={1.5} />,
  'vil.f.std_bed':     <Bed size={18} strokeWidth={1.5} />,
  'vil.r.guest_suite': <Bed size={18} strokeWidth={1.5} />,

  'apt.master_bath':   <Bath size={18} strokeWidth={1.5} />,
  'apt.main_bath':     <Bath size={18} strokeWidth={1.5} />,
  'apt.guest_bath':    <Bath size={18} strokeWidth={1.5} />,
  'vil.g.powder_room': <Bath size={18} strokeWidth={1.5} />,
  'vil.f.master_bath': <Bath size={18} strokeWidth={1.5} />,
  'vil.f.main_bath':   <Bath size={18} strokeWidth={1.5} />,
  'apt.kitchen':       <ChefHat size={18} strokeWidth={1.5} />,
  'vil.g.kitchen':     <ChefHat size={18} strokeWidth={1.5} />,

  'apt.balcony':       <Wind size={18} strokeWidth={1.5} />,
  'apt.corridor':      <DoorOpen size={18} strokeWidth={1.5} />,
  'apt.open_terrace':  <Sun size={18} strokeWidth={1.5} />,
  'vil.exterior':      <TreePine size={18} strokeWidth={1.5} />,
  'vil.r.terrace':     <Sun size={18} strokeWidth={1.5} />,

  'vil.b.garage':      <Car size={18} strokeWidth={1.5} />,
  'vil.b.game_room':   <Sparkles size={18} strokeWidth={1.5} />,
  'vil.b.driver_room': <Bed size={18} strokeWidth={1.5} />,
  'vil.b.storage':     <Layers size={18} strokeWidth={1.5} />,
  'bld.basement':      <Car size={18} strokeWidth={1.5} />,
  'bld.ground_lobby':  <Building2 size={18} strokeWidth={1.5} />,
  'bld.typical_floors':<Building2 size={18} strokeWidth={1.5} />,
  'bld.roof':           <Sun size={18} strokeWidth={1.5} />,
};

const TRADE_ICONS: Record<string, React.ReactNode> = {
  'wet.plumbing':    <Droplets size={14} strokeWidth={1.5} />,
  'wet.electrical':  <Zap size={14} strokeWidth={1.5} />,
  'wet.walls':       <PaintBucket size={14} strokeWidth={1.5} />,
  'wet.flooring':    <Layers size={14} strokeWidth={1.5} />,
  'wet.hvac':        <Wind size={14} strokeWidth={1.5} />,
  'liv.electrical':  <Zap size={14} strokeWidth={1.5} />,
  'liv.walls':       <PaintBucket size={14} strokeWidth={1.5} />,
  'liv.flooring':    <Layers size={14} strokeWidth={1.5} />,
  'liv.carpentry':   <DoorOpen size={14} strokeWidth={1.5} />,
  'liv.hvac':        <Thermometer size={14} strokeWidth={1.5} />,
  'trn.electrical':  <Zap size={14} strokeWidth={1.5} />,
  'trn.walls':       <PaintBucket size={14} strokeWidth={1.5} />,
  'trn.flooring':    <Layers size={14} strokeWidth={1.5} />,
  'ext.landscaping': <TreePine size={14} strokeWidth={1.5} />,
  'ext.fence_gate':  <ShieldCheck size={14} strokeWidth={1.5} />,
  'ext.pool':        <Droplets size={14} strokeWidth={1.5} />,
  'inf.ramp_access': <Car size={14} strokeWidth={1.5} />,
  'inf.parking':     <Car size={14} strokeWidth={1.5} />,
  'inf.elevator':    <Layers size={14} strokeWidth={1.5} />,
};

function getZoneIcon(templateId: string, label?: string): React.ReactNode {
  if (ZONE_ICONS[templateId]) return ZONE_ICONS[templateId];
  const text = (templateId + ' ' + (label ?? '')).toLowerCase();
  if (text.includes('maid') || text.includes('driver') || text.includes('bed') || text.includes('suite') || text.includes('room') || text.includes('نوم') || text.includes('غرفة') || text.includes('خادمة') || text.includes('سائق')) return <Bed size={18} strokeWidth={1.5} />;
  if (text.includes('bath') || text.includes('toilet') || text.includes('wc') || text.includes('حمام')) return <Bath size={18} strokeWidth={1.5} />;
  if (text.includes('kitchen') || text.includes('pantry') || text.includes('مطبخ') || text.includes('بوفيه')) return <ChefHat size={18} strokeWidth={1.5} />;
  if (text.includes('pool') || text.includes('jacuzzi') || text.includes('سباحة') || text.includes('جاكوزي')) return <Droplets size={18} strokeWidth={1.5} />;
  if (text.includes('garden') || text.includes('terrace') || text.includes('roof') || text.includes('balcony') || text.includes('حديقة') || text.includes('تراس')) return <Sun size={18} strokeWidth={1.5} />;
  if (text.includes('office') || text.includes('storage') || text.includes('laundry') || text.includes('مكتب') || text.includes('مخزن') || text.includes('غسيل')) return <Layers size={18} strokeWidth={1.5} />;
  return <Sparkles size={18} strokeWidth={1.5} />;
}

function getZonePhoto(templateId: string, label?: string, customImages?: string[]): string {
  if (customImages && customImages.length > 0) return customImages[0];
  if (DEFAULT_ZONE_PHOTOS[templateId]) return DEFAULT_ZONE_PHOTOS[templateId];
  const text = (templateId + ' ' + (label ?? '')).toLowerCase();
  if (text.includes('maid') || text.includes('driver') || text.includes('bed') || text.includes('suite') || text.includes('نوم') || text.includes('خادمة') || text.includes('سائق'))
    return 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80';
  if (text.includes('bath') || text.includes('toilet') || text.includes('wc') || text.includes('حمام'))
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80';
  if (text.includes('kitchen') || text.includes('pantry') || text.includes('مطبخ') || text.includes('بوفيه'))
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80';
  if (text.includes('pool') || text.includes('jacuzzi') || text.includes('سباحة') || text.includes('جاكوزي'))
    return 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80';
  if (text.includes('garden') || text.includes('terrace') || text.includes('roof') || text.includes('balcony') || text.includes('حديقة') || text.includes('تراس'))
    return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
}

interface DisplayZoneGroup {
  id: string;
  templateId: string;
  nameEn: string;
  nameAr: string;
  isGroup: boolean;
  count: number;
  badge: FinishBadge;
  instances: ZoneInstance[];
  image: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDominantFinishTier(zones: ZoneInstance[]): FinishBadge {
  const badges: FinishBadge[] = [];
  function collect(zList: ZoneInstance[]) {
    for (const z of zList) {
      if (z.trades && z.trades.length > 0) {
        badges.push(getZoneBadge(z));
      }
      if (z.children) collect(z.children);
    }
  }
  collect(zones);
  if (badges.length === 0) return 'fully_finished';
  
  const counts: Record<string, number> = {};
  for (const b of badges) counts[b] = (counts[b] || 0) + 1;
  let dominant: FinishBadge = 'fully_finished';
  let maxCount = 0;
  for (const b in counts) {
    if (counts[b] > maxCount) {
      maxCount = counts[b];
      dominant = b as FinishBadge;
    }
  }
  return dominant;
}

function groupRepeatableZoneInstances(instances: ZoneInstance[], propertyImages: string[] = []): DisplayZoneGroup[] {
  const groupsMap = new Map<string, ZoneInstance[]>();
  const singles: ZoneInstance[] = [];

  for (const inst of instances) {
    const tmpl = ZONE_TEMPLATES.find(t => t.id === inst.zone_template_id);
    if (tmpl?.is_repeatable) {
      const key = inst.zone_template_id;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(inst);
    } else {
      singles.push(inst);
    }
  }

  const result: DisplayZoneGroup[] = [];

  for (const inst of singles) {
    const labels = getZoneTemplateLabels(inst.zone_template_id);
    const tmplNameEn = inst.instance_label ?? (labels ? labels.en : inst.zone_template_id);
    const tmplNameAr = inst.instance_label ?? (labels ? labels.ar : inst.zone_template_id);
    
    const photo = getZonePhoto(inst.zone_template_id, inst.instance_label, inst.images);

    result.push({
      id: inst.id,
      templateId: inst.zone_template_id,
      nameEn: tmplNameEn,
      nameAr: tmplNameAr,
      isGroup: false,
      count: 1,
      badge: getZoneBadge(inst),
      instances: [inst],
      image: photo,
    });
  }

  for (const [templateId, insts] of groupsMap.entries()) {
    const labels = getZoneTemplateLabels(templateId);
    const tmplNameEn = labels ? labels.en : templateId;
    const tmplNameAr = labels ? labels.ar : templateId;
    
    const badges = insts.map(getZoneBadge);
    const groupBadge = badges.every(b => b === badges[0]) ? badges[0] : 'mixed';
    
    const customImages = insts.find(i => (i.images?.length ?? 0) > 0)?.images;
    const photo = getZonePhoto(templateId, undefined, customImages);

    result.push({
      id: `group_${templateId}`,
      templateId,
      nameEn: insts.length > 1 ? `${tmplNameEn} (${insts.length})` : tmplNameEn,
      nameAr: insts.length > 1 ? `${tmplNameAr} (${insts.length})` : tmplNameAr,
      isGroup: insts.length > 1,
      count: insts.length,
      badge: groupBadge,
      instances: insts,
      image: photo,
    });
  }

  return result;
}

function getStatusPosition(trade: TradeInstance): { step: number; total: number } {
  const tmpl = getTradeTemplateLabels(trade.trade_template_id);
  if (!tmpl) return { step: 0, total: 1 };
  const idx = tmpl.status_values.indexOf(trade.status);
  return { step: Math.max(0, idx), total: tmpl.status_values.length };
}

function humanizeStatus(status: string): string {
  return status.replace(/([A-Z])/g, ' $1').trim();
}

function getAttrLabel(attrTemplateId: string, locale: string): string {
  const tmpl = ATTRIBUTE_TEMPLATES.find(a => a.id === attrTemplateId);
  if (!tmpl) return attrTemplateId;
  return locale === 'ar' ? tmpl.label_ar : tmpl.label_en;
}

function formatAttrValue(value: boolean | string | number | null, locale: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? (locale === 'ar' ? 'نعم' : 'Yes') : (locale === 'ar' ? 'لا' : 'No');
  return String(value);
}

function getTopLevelZones(zones: ZoneInstance[]): ZoneInstance[] {
  return zones.filter(z => {
    const tmpl = ZONE_TEMPLATES.find(t => t.id === z.zone_template_id);
    return !tmpl?.parent_zone_id;
  });
}

// ─── TradeProgressDots ────────────────────────────────────────────────────────

function TradeProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <span className={styles.dotRow} dir="ltr" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`${styles.dot} ${i <= step ? styles.dotFilled : styles.dotEmpty}`} />
      ))}
    </span>
  );
}

// ─── TradeCardItem (Revamped Luxury Trade Item) ───────────────────────────────

function TradeCardItem({ trade, locale }: { trade: TradeInstance; locale: string }) {
  const tmpl = getTradeTemplateLabels(trade.trade_template_id);
  if (!tmpl) return null;

  const { step, total } = getStatusPosition(trade);
  const tradeName = locale === 'ar' ? tmpl.ar : tmpl.en;
  const icon = TRADE_ICONS[trade.trade_template_id] ?? <Wrench size={14} strokeWidth={1.5} />;
  const filledAttrs = trade.attributes.filter(a => a.value !== null && a.value !== undefined && a.value !== '');

  return (
    <div className={styles.revampedTradeCard}>
      <div className={styles.tradeHeaderRow}>
        <div className={styles.tradeTitleBadge}>
          <span className={styles.tradeIconBox}>{icon}</span>
          <span className={styles.tradeTitleText}>{tradeName}</span>
        </div>
        <span className={styles.tradeStatusPill}>
          <CheckCircle2 size={12} className={styles.checkIcon} />
          {humanizeStatus(trade.status)}
        </span>
      </div>

      <div className={styles.tradeProgressLineWrap}>
        <TradeProgressDots step={step} total={total} />
      </div>

      {filledAttrs.length > 0 && (
        <div className={styles.revampedAttrGrid}>
          {filledAttrs.map(attr => (
            <div key={attr.attribute_template_id} className={styles.revampedAttrChip}>
              <span className={styles.revampedAttrKey}>{getAttrLabel(attr.attribute_template_id, locale)}:</span>
              <span className={styles.revampedAttrVal}>{formatAttrValue(attr.value, locale)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Revamped ZonePopUpModal ──────────────────────────────────────────────────

function RevampedZonePopUpModal({
  group, locale, propertyTitle, onClose,
}: {
  group: DisplayZoneGroup;
  locale: string;
  propertyTitle: string;
  onClose: () => void;
}) {
  const isAr = locale === 'ar';
  const groupName = isAr ? group.nameAr : group.nameEn;
  const cfg = BADGE_CONFIG[group.badge];
  const [activeInstanceIdx, setActiveInstanceIdx] = useState(0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const activeZone = group.instances[activeInstanceIdx] ?? group.instances[0];
  const instLabels = getZoneTemplateLabels(activeZone.zone_template_id);
  const instName = activeZone.instance_label ?? (instLabels ? (isAr ? instLabels.ar : instLabels.en) : activeZone.zone_template_id);
  const activeDisplayName = activeZone.instance_label ?? (group.isGroup ? `${instName} ${activeInstanceIdx + 1}` : instName);

  const zonePhotos = activeZone.images && activeZone.images.length > 0
    ? activeZone.images
    : [group.image];
  const currentHeroPhoto = zonePhotos[activePhotoIdx] ?? zonePhotos[0];

  const waMsg = isAr
    ? `مرحباً، أستفسر عن تفاصيل تشطيب ${activeDisplayName} في ${propertyTitle}`
    : `Hello, I'd like to ask about the ${activeDisplayName} finishing details in "${propertyTitle}"`;

  const nextPhoto = () => {
    if (zonePhotos.length === 0) return;
    setActivePhotoIdx((prev) => (prev + 1) % zonePhotos.length);
  };

  const prevPhoto = () => {
    if (zonePhotos.length === 0) return;
    setActivePhotoIdx((prev) => (prev - 1 + zonePhotos.length) % zonePhotos.length);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.splitModalDialog} onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <button className={styles.revampedCloseBtn} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* ── Left Side: Interactive Photo Gallery Slider ── */}
        <div className={styles.modalGalleryCol}>
          <div className={styles.mainHeroPhotoWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentHeroPhoto} alt={groupName} className={styles.mainHeroImg} />
            <div className={styles.mainHeroOverlay} />

            {zonePhotos.length > 1 && (
              <>
                <button type="button" className={`${styles.galleryNavArrow} ${styles.navLeft}`} onClick={prevPhoto} aria-label="Previous photo">
                  {isAr ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
                <button type="button" className={`${styles.galleryNavArrow} ${styles.navRight}`} onClick={nextPhoto} aria-label="Next photo">
                  {isAr ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
              </>
            )}

            <div className={styles.galleryBadgeOverlay}>
              <span className={`${styles.finishBadge} ${styles[cfg.cls]}`}>
                <span className={styles.badgeEmoji}>{cfg.icon}</span>
                <span className={styles.badgeText}>{isAr ? cfg.ar : cfg.en}</span>
              </span>
            </div>
          </div>

          {/* Thumbnails Row below main photo */}
          {zonePhotos.length > 1 && (
            <div className={styles.galleryThumbnailsRow}>
              {zonePhotos.map((photoUrl, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  className={`${styles.galleryThumbBtn} ${pIdx === activePhotoIdx ? styles.galleryThumbActive : ''}`}
                  onClick={() => setActivePhotoIdx(pIdx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt={`Thumbnail ${pIdx + 1}`} className={styles.thumbImg} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Side: Scrollable Specs & Inquire Action ── */}
        <div className={styles.modalInfoCol}>
          <div className={styles.modalInfoHeader}>
            <div className={styles.modalTitleWrap}>
              <h2 className={styles.modalTitleText}>{groupName}</h2>
              <p className={styles.modalSubtitleText}>
                {isAr ? 'مواصفات المقايسة والتشطيب الفعلي' : 'Official execution specs & trade attributes'}
              </p>
            </div>
          </div>

          {/* Multi-instance Segmented Tabs for Grouped Repeatable Cards */}
          {group.isGroup && (
            <div className={styles.instanceTabsBar}>
              {group.instances.map((zone, idx) => {
                const l = getZoneTemplateLabels(zone.zone_template_id);
                const name = l ? (isAr ? l.ar : l.en) : zone.zone_template_id;
                const tabLabel = zone.instance_label ?? `${name} ${idx + 1}`;

                return (
                  <button
                    key={zone.id}
                    className={`${styles.instanceTabBtn} ${idx === activeInstanceIdx ? styles.instanceTabActive : ''}`}
                    onClick={() => setActiveInstanceIdx(idx)}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          )}

          {/* Modal Scrollable Trade Specs Grid */}
          <div className={styles.modalScrollableContent}>
            <div className={styles.specSectionHeader}>
              <Sliders size={16} className={styles.specHeaderIcon} />
              <span>{isAr ? `مواصفات ${activeDisplayName}` : `${activeDisplayName} Execution Specs` }</span>
            </div>

            {activeZone.trades.length > 0 ? (
              <div className={styles.tradesGridContainer}>
                {activeZone.trades.map(trade => (
                  <TradeCardItem key={trade.id} trade={trade} locale={locale} />
                ))}
              </div>
            ) : (
              <div className={styles.noTradesCard}>
                <Info size={24} className={styles.noTradesIcon} />
                <p>{isAr ? 'لم تُسجَّل مقايسات تفصيلية لهذة المنطقة' : 'No trade specifications recorded for this zone yet'}</p>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className={styles.revampedModalFooter}>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER, waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.revampedWaBtn}
            >
              <MessageCircle size={18} strokeWidth={1.5} />
              <span>{isAr ? `استفسر عن ${activeDisplayName}` : `Inquire about ${activeDisplayName}`}</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Breathtaking Revamped ZoneGroupCard ──────────────────────────────────────

function ZoneGroupCard({
  group, dominantTier, onClick, locale,
}: {
  group: DisplayZoneGroup;
  dominantTier: FinishBadge;
  onClick: () => void;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const groupName = isAr ? group.nameAr : group.nameEn;
  const icon = getZoneIcon(group.templateId, groupName);
  const cfg = BADGE_CONFIG[group.badge];

  // Quick Trade Chips Preview
  const firstInst = group.instances[0];
  const tradeCount = firstInst?.trades?.length ?? 0;

  return (
    <div className={styles.luxuryZoneCard} onClick={onClick}>
      <div className={styles.luxuryCardPhotoContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={group.image}
          alt={groupName}
          className={styles.luxuryCardPhoto}
        />
        <div className={styles.luxuryPhotoGradient} />
        
        {/* Floating Glass Top Bar */}
        <div className={styles.luxuryPhotoTopBar}>
          <div className={styles.luxuryIconPill}>
            {icon}
          </div>

          <span className={`${styles.finishBadge} ${styles[cfg.cls]}`}>
            <span className={styles.badgeEmoji}>{cfg.icon}</span>
            <span className={styles.badgeText}>{isAr ? cfg.ar : cfg.en}</span>
          </span>
        </div>

        {/* Floating Bottom Room Title Overlay */}
        <div className={styles.luxuryPhotoBottomTitle}>
          <h3 className={styles.luxuryCardTitle}>{groupName}</h3>
          {group.isGroup && (
            <span className={styles.luxuryGroupBadge}>
              {isAr ? `${group.count} غرف / مناطق` : `${group.count} Zones Included` }
            </span>
          )}
        </div>
      </div>

      <div className={styles.luxuryCardContent}>
        {/* Trade Preview Line */}
        <div className={styles.luxuryTradePreviewRow}>
          <span className={styles.luxuryTradeCountLabel}>
            <Sliders size={13} className={styles.goldIcon} />
            {isAr ? `${tradeCount} بنود تشطيب مسجلة` : `${tradeCount} Trade Specs` }
          </span>
          <div className={styles.luxuryTradeIconsMini}>
            {firstInst?.trades?.slice(0, 4).map(t => (
              <span key={t.id} className={styles.miniTradeDot} title={t.trade_template_id}>
                {TRADE_ICONS[t.trade_template_id] ?? <Wrench size={11} />}
              </span>
            ))}
          </div>
        </div>

        {/* Action Trigger Button */}
        <div className={styles.luxuryActionTrigger}>
          <span>{isAr ? 'معاينة مواصفات المنطقة' : 'Inspect Zone Specs'}</span>
          {isAr ? <ArrowLeft size={15} className={styles.triggerArrow} /> : <ArrowRight size={15} className={styles.triggerArrow} />}
        </div>
      </div>
    </div>
  );
}

// ─── Horizontal Carousel Track Component ──────────────────────────────────────

function ZoneCarousel({
  groups, dominantTier, onSelectGroup, locale,
}: {
  groups: DisplayZoneGroup[];
  dominantTier: FinishBadge;
  onSelectGroup: (group: DisplayZoneGroup) => void;
  locale: string;
}) {
  const isAr = locale === 'ar';
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scroll = (direction: 'prev' | 'next') => {
    if (!trackRef.current) return;
    const cardWidth = 360;
    const scrollAmount = isAr
      ? (direction === 'next' ? -cardWidth * 2 : cardWidth * 2)
      : (direction === 'next' ? cardWidth * 2 : -cardWidth * 2);

    trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!trackRef.current) return;
    const { scrollLeft } = trackRef.current;
    const cardWidth = 340;
    const index = Math.round(Math.abs(scrollLeft) / cardWidth);
    setActiveIndex(index);
  };

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselControls}>
        <div className={styles.carouselIndicators}>
          {groups.map((_, i) => (
            <button
              key={i}
              className={`${styles.carouselDot} ${i === activeIndex ? styles.carouselDotActive : ''}`}
              onClick={() => {
                if (trackRef.current) {
                  const cardWidth = 360;
                  trackRef.current.scrollTo({
                    left: isAr ? -i * cardWidth : i * cardWidth,
                    behavior: 'smooth',
                  });
                }
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <div className={styles.carouselNavBtns}>
          <button
            className={styles.carouselNavBtn}
            onClick={() => scroll('prev')}
            aria-label="Previous Slide"
          >
            {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button
            className={styles.carouselNavBtn}
            onClick={() => scroll('next')}
            aria-label="Next Slide"
          >
            {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={styles.carouselTrack}
        onScroll={handleScroll}
      >
        {groups.map(grp => (
          <div key={grp.id} className={styles.carouselSlide}>
            <ZoneGroupCard
              group={grp}
              dominantTier={dominantTier}
              onClick={() => onSelectGroup(grp)}
              locale={locale}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Breathtaking Downloadable Spec Sheet Modal ────────────────────────────────

function RevampedDownloadableSpecSheet({
  zones, propertyTitle, locale, onClose,
}: {
  zones: ZoneInstance[];
  propertyTitle: string;
  locale: string;
  onClose: () => void;
}) {
  const isAr = locale === 'ar';
  const dominantBadge = getDominantFinishTier(zones);
  const cfg = BADGE_CONFIG[dominantBadge];

  // Calculate summary metrics
  let totalZones = 0;
  let totalTrades = 0;
  let completedTrades = 0;

  function countStats(zList: ZoneInstance[]) {
    for (const z of zList) {
      totalZones++;
      if (z.trades) {
        for (const t of z.trades) {
          totalTrades++;
          if (t.status === 'Finished' || t.status === 'FinalPaint' || t.status === 'Installed' || t.status === 'Fitted') {
            completedTrades++;
          }
        }
      }
      if (z.children) countStats(z.children);
    }
  }
  countStats(zones);

  const completionPct = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 100;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-spec-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    const printWin = window.open('', '_blank', 'width=960,height=800');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="${locale}" dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="utf-8">
          <title>${propertyTitle} — Official Finishing Specification Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
            body { font-family: 'Outfit', system-ui, -apple-system, sans-serif; padding: 30px; color: #1A1A1A; line-height: 1.5; background: #FFFFFF; }
            h1, h2, h3, h4 { font-family: Georgia, serif; color: #1E4D3D; margin-top: 0; }
            .badgeFull { background: #E8F5E9; color: #2E7D32; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; }
            .badgeSemi { background: #FFF3E0; color: #E65100; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; }
            .badgeBrick { background: #FFEBEE; color: #C62828; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; }
            .badgeMixed { background: #EDE7F6; color: #512DA8; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; }
            button, svg, [class*="reportActionBtns"], [class*="reportTopBar"] { display: none !important; }
            div[class*="reportDocHeader"] { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C9A96A; padding-bottom: 16px; margin-bottom: 20px; }
            div[class*="reportDocTitle"] { font-size: 24px; font-weight: bold; color: #1E4D3D; margin: 4px 0; }
            div[class*="reportDocTag"] { font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #C9A96A; }
            div[class*="reportKpiBanner"] { display: flex; justify-content: space-around; background: #F8F9F8; border: 1px solid #C9A96A; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
            div[class*="reportKpiItem"] { text-align: center; }
            span[class*="reportKpiVal"] { font-size: 24px; font-weight: bold; color: #1E4D3D; display: block; }
            span[class*="reportKpiLabel"] { font-size: 12px; color: #666; }
            div[class*="reportZoneCard"] { border: 1px solid #E0E0E0; border-radius: 12px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; background: #FFFFFF; }
            div[class*="reportZoneHead"] { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F0F0F0; padding-bottom: 10px; margin-bottom: 12px; }
            h4[class*="reportZoneName"] { font-size: 18px; font-weight: bold; color: #1E4D3D; margin: 0; }
            div[class*="reportTradesGrid"] { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
            div[class*="reportTradeBox"] { background: #FBFBFA; border: 1px solid #EEEEEE; border-radius: 8px; padding: 12px; }
            div[class*="reportTradeHeader"] { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 13px; margin-bottom: 6px; }
            span[class*="reportTradeStatusTag"] { background: #E8F5E9; color: #1E4D3D; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
            div[class*="reportAttrGrid"] { border-top: 1px dashed #E0E0E0; padding-top: 6px; margin-top: 6px; }
            div[class*="reportAttrRow"] { display: flex; justify-content: space-between; font-size: 11px; color: #555; }
            span[class*="reportAttrVal"] { font-weight: bold; color: #1E4D3D; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  function renderZoneSpecBlock(zone: ZoneInstance, level = 0): React.ReactNode {
    const labels = getZoneTemplateLabels(zone.zone_template_id);
    const zoneName = zone.instance_label ?? (labels ? (isAr ? labels.ar : labels.en) : zone.zone_template_id);
    const badge = getZoneBadge(zone);
    const bCfg = BADGE_CONFIG[badge];
    const icon = getZoneIcon(zone.zone_template_id, zoneName);

    return (
      <div key={zone.id} className={`${styles.reportZoneCard} ${level > 0 ? styles.reportZoneChild : ''}`}>
        <div className={styles.reportZoneHead}>
          <div className={styles.reportZoneTitleBox}>
            <span className={styles.reportZoneIcon}>{icon}</span>
            <div>
              <h4 className={styles.reportZoneName}>{zoneName}</h4>
              {zone.instance_label && zone.instance_label !== zoneName && (
                <span className={styles.reportZoneSubLabel}>{zone.instance_label}</span>
              )}
            </div>
          </div>

          <span className={`${styles.finishBadge} ${styles[bCfg.cls]}`}>
            <span className={styles.badgeEmoji}>{bCfg.icon}</span>
            <span className={styles.badgeText}>{isAr ? bCfg.ar : bCfg.en}</span>
          </span>
        </div>

        {zone.trades.length > 0 ? (
          <div className={styles.reportTradesGrid}>
            {zone.trades.map(trade => {
              const tmpl = getTradeTemplateLabels(trade.trade_template_id);
              if (!tmpl) return null;
              const tradeName = isAr ? tmpl.ar : tmpl.en;
              const tIcon = TRADE_ICONS[trade.trade_template_id] ?? <Wrench size={14} />;
              const filledAttrs = trade.attributes.filter(a => a.value !== null && a.value !== undefined && a.value !== '');

              return (
                <div key={trade.id} className={styles.reportTradeBox}>
                  <div className={styles.reportTradeHeader}>
                    <div className={styles.reportTradeIconBox}>
                      {tIcon}
                      <span className={styles.reportTradeTitle}>{tradeName}</span>
                    </div>
                    <span className={styles.reportTradeStatusTag}>
                      {humanizeStatus(trade.status)}
                    </span>
                  </div>

                  {filledAttrs.length > 0 && (
                    <div className={styles.reportAttrGrid}>
                      {filledAttrs.map(attr => (
                        <div key={attr.attribute_template_id} className={styles.reportAttrRow}>
                          <span className={styles.reportAttrKey}>{getAttrLabel(attr.attribute_template_id, locale)}:</span>
                          <span className={styles.reportAttrVal}>{formatAttrValue(attr.value, locale)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.reportNoTrades}>{isAr ? 'لم تُسجَّل مقايسات تفصيلية' : 'No specific trade details recorded'}</p>
        )}

        {zone.children && zone.children.length > 0 && (
          <div className={styles.reportChildrenList}>
            {zone.children.map(c => renderZoneSpecBlock(c, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.reportModalDialog} onClick={e => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Report Top Header Bar */}
        <div className={styles.reportTopBar}>
          <div className={styles.reportBrandTitle}>
            <Building2 size={20} className={styles.goldIcon} />
            <span>Zakaria Farid — Official Finishing Spec Sheet</span>
          </div>

          <div className={styles.reportActionBtns}>
            <button className={styles.reportPrintBtn} onClick={handlePrint} title="Print or Download PDF">
              <Printer size={16} />
              <span>{isAr ? 'طباعة / تحويل PDF' : 'Download / Print PDF'}</span>
            </button>
            <button className={styles.reportCloseBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className={styles.reportDocumentBody} id="printable-spec-sheet">
          {/* Executive Header */}
          <div className={styles.reportDocHeader}>
            <div className={styles.reportDocHeaderMain}>
              <span className={styles.reportDocTag}>{isAr ? 'تقرير المواصفات المعمارية والتشطيب' : 'ARCHITECTURAL & FINISHING SPECIFICATION REPORT'}</span>
              <h1 className={styles.reportDocTitle}>{propertyTitle}</h1>
              <p className={styles.reportDocDate}>
                {isAr ? `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}` : `Report Date: ${new Date().toLocaleDateString('en-US')}`}
              </p>
            </div>

            <div className={styles.reportDocBadgeBox}>
              <span className={`${styles.finishBadge} ${styles[cfg.cls]}`}>
                <span className={styles.badgeEmoji}>{cfg.icon}</span>
                <span className={styles.badgeText}>{isAr ? cfg.ar : cfg.en}</span>
              </span>
            </div>
          </div>

          {/* KPI Summary Banner */}
          <div className={styles.reportKpiBanner}>
            <div className={styles.reportKpiItem}>
              <span className={styles.reportKpiVal}>{totalZones}</span>
              <span className={styles.reportKpiLabel}>{isAr ? 'إجمالي المناطق' : 'Total Zones'}</span>
            </div>
            <div className={styles.reportKpiItem}>
              <span className={styles.reportKpiVal}>{totalTrades}</span>
              <span className={styles.reportKpiLabel}>{isAr ? 'بنود المقايسة' : 'Trade Items'}</span>
            </div>
            <div className={styles.reportKpiItem}>
              <span className={styles.reportKpiVal}>{completionPct}%</span>
              <span className={styles.reportKpiLabel}>{isAr ? 'نسبة الإكتمال' : 'Completion Rate'}</span>
            </div>
          </div>

          {/* Full Zone Specifications List */}
          <div className={styles.reportZonesList}>
            {zones.map(zone => renderZoneSpecBlock(zone))}
          </div>

          {/* Report Footer */}
          <div className={styles.reportDocFooter}>
            <p>{isAr ? 'تقرير رسمي صادر عن المنصة العقارية — المهندس زكريا فريد' : 'Official finishing specification generated by Zakaria Farid Real Estate Platform'}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function FinishingDetailsDisplay({ zones, propertyTitle, locale, propertyImages = [] }: Props) {
  const isAr = locale === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<DisplayZoneGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!zones || zones.length === 0) return null;

  const topLevelZones = getTopLevelZones(zones);
  const dominantTier = getDominantFinishTier(topLevelZones);
  const floorGroups = groupByFloor(topLevelZones);

  return (
    <section className={styles.root} id="finishing-details" dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.heading}>
        <h2 className={styles.title}>{isAr ? 'تفاصيل التشطيب والمساحات' : 'Finishing & Zone Details'}</h2>
        <p className={styles.subtitle}>
          {isAr
            ? 'مواصفات فعلية لكل قسم من الواقع — انقر على أي كارت لفتح النافذة التفصيلية'
            : 'Real per-zone finish specs — click any card to open the interactive pop-up modal.'}
        </p>
      </div>

      <div>
        {floorGroups ? (
          <>
            {/* Villa exterior / non-container top-level zones */}
            {(() => {
              const exteriorInstances = topLevelZones.filter(z => {
                const t = ZONE_TEMPLATES.find(tt => tt.id === z.zone_template_id);
                return !t?.is_container;
              });
              const displayGroups = groupRepeatableZoneInstances(exteriorInstances, propertyImages);
              if (displayGroups.length === 0) return null;
              return (
                <div className={styles.floorSection} style={{ marginBottom: 28 }}>
                  <div className={styles.floorHeader}>
                    <TreePine size={18} className={styles.floorIcon} />
                    <span className={styles.floorLabel}>{isAr ? 'الحدائق والمساحات الخارجية' : 'Outdoor & Landscaping'}</span>
                  </div>
                  <ZoneCarousel
                    groups={displayGroups}
                    dominantTier={dominantTier}
                    onSelectGroup={setSelectedGroup}
                    locale={locale}
                  />
                </div>
              );
            })()}

            {/* Floor groups */}
            {floorGroups.map(group => {
              const displayGroups = groupRepeatableZoneInstances(group.zones, propertyImages);
              return (
                <div key={group.containerId} className={styles.floorSection}>
                  <div className={styles.floorHeader}>
                    <Building2 size={18} className={styles.floorIcon} />
                    <span className={styles.floorLabel}>{isAr ? group.label_ar : group.label_en}</span>
                  </div>
                  {displayGroups.length > 0 ? (
                    <ZoneCarousel
                      groups={displayGroups}
                      dominantTier={dominantTier}
                      onSelectGroup={setSelectedGroup}
                      locale={locale}
                    />
                  ) : (
                    <p className={styles.emptyFloor}>
                      {isAr ? 'لا مناطق مسجلة في هذا الدور' : 'No zones recorded for this floor'}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <ZoneCarousel
            groups={groupRepeatableZoneInstances(topLevelZones, propertyImages)}
            dominantTier={dominantTier}
            onSelectGroup={setSelectedGroup}
            locale={locale}
          />
        )}
      </div>

      <div className={styles.fullSpecRow}>
        <button className={styles.fullSpecBtn} onClick={() => setSheetOpen(true)}>
          <FileText size={16} strokeWidth={1.5} />
          <span>{isAr ? 'عرض وتنزيل المواصفات الكاملة للتشطيب' : 'View & Download Complete Finishing Spec Sheet'}</span>
        </button>
      </div>

      {/* Revamped Pop-up Modal when card is clicked */}
      {selectedGroup && (
        <RevampedZonePopUpModal
          group={selectedGroup}
          locale={locale}
          propertyTitle={propertyTitle}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Revamped Downloadable Spec Sheet Modal */}
      {sheetOpen && (
        <RevampedDownloadableSpecSheet
          zones={topLevelZones}
          propertyTitle={propertyTitle}
          locale={locale}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </section>
  );
}
