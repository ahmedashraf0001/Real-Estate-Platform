'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Layers, 
  Sparkles, 
  Maximize2, 
  Move, 
  Wand2, 
  Check, 
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Sliders,
  Info,
  Compass
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout } from '@/lib/layering';
import { ZONE_TEMPLATES, getTradesForZone, getAttributesForTrade } from '@/lib/layering/templates';

interface CADBlueprintBuilderProps {
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  propertyType?: 'apartment' | 'building' | 'garage';
  isAr?: boolean;
}

// Default dimension templates for Egyptian middle-class property types
const DEFAULT_DIMENSIONS: Record<string, { l: number; w: number; ceiling: string; titleEn: string; titleAr: string }> = {
  // ── Apartment (شقة) — typical Egyptian middle-class dimensions ───────────
  'apt.reception':   { l: 6.5, w: 4.8, ceiling: '3.0m Flush',   titleEn: 'Living / Reception',    titleAr: 'الصالة / الاستقبال' },
  'apt.master_bed':  { l: 4.2, w: 3.8, ceiling: '3.0m Flush',   titleEn: 'Master Bedroom',        titleAr: 'غرفة النوم الرئيسية' },
  'apt.master_bath': { l: 2.8, w: 2.2, ceiling: '2.8m Flush',   titleEn: 'Master Bathroom',       titleAr: 'الحمام الملحق' },
  'apt.std_bed':     { l: 3.8, w: 3.2, ceiling: '3.0m Flush',   titleEn: 'Bedroom',               titleAr: 'غرفة نوم' },
  'apt.main_bath':   { l: 2.8, w: 2.0, ceiling: '2.8m Flush',   titleEn: 'Bathroom',              titleAr: 'الحمام' },
  'apt.kitchen':     { l: 3.5, w: 2.8, ceiling: '2.8m Flush',   titleEn: 'Kitchen',               titleAr: 'المطبخ' },
  'apt.balcony':     { l: 4.0, w: 1.5, ceiling: 'Open Sky',     titleEn: 'Balcony',               titleAr: 'البلكونة' },
  'apt.corridor':    { l: 4.5, w: 1.4, ceiling: '3.0m Flush',   titleEn: 'Internal Corridor',     titleAr: 'الردهة الداخلية' },
  'apt.guest_bath':  { l: 2.2, w: 1.6, ceiling: '2.8m Flush',   titleEn: 'Guest Toilet',          titleAr: 'حمام الضيوف' },
  'apt.laundry':     { l: 2.5, w: 2.0, ceiling: '2.8m Flush',   titleEn: 'Laundry / Storage',     titleAr: 'غرفة الغسيل / المخزن' },
  // ── Building (عمارة) zones ──────────────────────────────────────────────
  'bld.basement':       { l: 20.0, w: 12.0, ceiling: '2.8m Low',     titleEn: 'Basement / Parking',        titleAr: 'البدروم / الجراج' },
  'bld.ground_lobby':   { l: 20.0, w: 12.0, ceiling: '3.2m Flush',   titleEn: 'Ground Floor & Entrance',   titleAr: 'الدور الأرضي والمدخل' },
  'bld.typical_floors': { l: 20.0, w: 12.0, ceiling: '3.0m Flush',   titleEn: 'Typical Floor (per floor)', titleAr: 'الدور المتكرر (لكل دور)' },
  'bld.roof':           { l: 20.0, w: 12.0, ceiling: 'Open Roof',    titleEn: 'Roof & Water Tanks',        titleAr: 'السطح وخزانات المياه' },
  // ── Garage (جراج) zones ─────────────────────────────────────────────────
  'grg.ramp':  { l: 6.0, w: 3.5, ceiling: '2.8m Low',  titleEn: 'Ramp & Gate',    titleAr: 'الرامب والبوابة' },
  'grg.bay':   { l: 5.5, w: 2.5, ceiling: '2.8m Low',  titleEn: 'Parking Bay',    titleAr: 'باكية الجراج' },
  'grg.elec':  { l: 2.0, w: 1.5, ceiling: '2.8m Low',  titleEn: 'Electrical Box', titleAr: 'لوحة الكهرباء' },
};

// Floor plan slot configurations for continuous shared partition walls
interface RoomSlot {
  xF: number;
  yF: number;
  wF: number;
  hF: number;
}

const FLOOR_PLAN_TEMPLATES: Record<number, RoomSlot[]> = {
  1: [{ xF: 0.08, yF: 0.08, wF: 0.84, hF: 0.84 }],
  2: [
    { xF: 0.08, yF: 0.08, wF: 0.46, hF: 0.84 },
    { xF: 0.54, yF: 0.08, wF: 0.38, hF: 0.84 },
  ],
  3: [
    { xF: 0.08, yF: 0.08, wF: 0.48, hF: 0.84 },
    { xF: 0.56, yF: 0.08, wF: 0.36, hF: 0.44 },
    { xF: 0.56, yF: 0.52, wF: 0.36, hF: 0.40 },
  ],
  4: [
    { xF: 0.08, yF: 0.08, wF: 0.32, hF: 0.84 },
    { xF: 0.40, yF: 0.08, wF: 0.52, hF: 0.44 },
    { xF: 0.40, yF: 0.52, wF: 0.28, hF: 0.40 },
    { xF: 0.68, yF: 0.52, wF: 0.24, hF: 0.40 },
  ],
  5: [
    { xF: 0.08, yF: 0.08, wF: 0.28, hF: 0.44 },
    { xF: 0.36, yF: 0.08, wF: 0.56, hF: 0.44 },
    { xF: 0.08, yF: 0.52, wF: 0.38, hF: 0.40 },
    { xF: 0.46, yF: 0.52, wF: 0.18, hF: 0.40 },
    { xF: 0.64, yF: 0.52, wF: 0.28, hF: 0.40 },
  ],
  6: [
    { xF: 0.08, yF: 0.08, wF: 0.26, hF: 0.44 },
    { xF: 0.34, yF: 0.08, wF: 0.30, hF: 0.44 },
    { xF: 0.64, yF: 0.08, wF: 0.28, hF: 0.44 },
    { xF: 0.08, yF: 0.52, wF: 0.26, hF: 0.40 },
    { xF: 0.34, yF: 0.52, wF: 0.30, hF: 0.40 },
    { xF: 0.64, yF: 0.52, wF: 0.28, hF: 0.40 },
  ],
};

function getFloorPlanSlots(count: number): RoomSlot[] {
  if (FLOOR_PLAN_TEMPLATES[count]) return FLOOR_PLAN_TEMPLATES[count];
  const slots: RoomSlot[] = [];
  const cols = count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    slots.push({
      xF: 0.08 + col * (0.84 / cols),
      yF: 0.08 + row * (0.84 / rows),
      wF: 0.84 / cols,
      hF: 0.84 / rows,
    });
  }
  return slots;
}

export const CADBlueprintBuilder: React.FC<CADBlueprintBuilderProps> = ({
  zoneInstances,
  onZoneInstancesChange,
  propertyType = 'apartment',
  isAr = false
}) => {
  // Default tab key per type
  const defaultKey = propertyType === 'building' ? 'bld_ground' : propertyType === 'garage' ? 'grg_ramp' : 'all';
  const [activeFloorKey, setActiveFloorKey] = useState<string>(defaultKey);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Reset active tab when type changes
  React.useEffect(() => {
    setActiveFloorKey(defaultKey);
    setSelectedZoneId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyType]);

  // Build type-specific tab groups
  const floorGroups = useMemo(() => {
    const groups: Record<string, { labelEn: string; labelAr: string; zones: ZoneInstance[] }> = {};

    function flatZones(list: ZoneInstance[]): ZoneInstance[] {
      const result: ZoneInstance[] = [];
      for (const z of list) {
        if (z.children && z.children.length > 0) result.push(...flatZones(z.children));
        else result.push(z);
      }
      return result;
    }

    const flat = flatZones(zoneInstances);

    if (propertyType === 'apartment') {
      // Single flat group — no floor tabs for apartments
      groups['all'] = { labelEn: 'All Rooms', labelAr: 'جميع الغرف', zones: flat };

    } else if (propertyType === 'building') {
      // 4 zone-based tabs matching building template IDs
      groups['bld_basement'] = { labelEn: 'Basement / Parking', labelAr: 'البدروم والجراج', zones: [] };
      groups['bld_ground']   = { labelEn: 'Ground Floor & Entrance', labelAr: 'الدور الأرضي والمدخل', zones: [] };
      groups['bld_floors']   = { labelEn: 'Typical Floors & Stairwell', labelAr: 'الأدوار المتكررة والسلم', zones: [] };
      groups['bld_roof']     = { labelEn: 'Roof & Water Tanks', labelAr: 'السطح وخزانات المياه', zones: [] };
      for (const z of flat) {
        const t = z.zone_template_id;
        if (t === 'bld.basement')       groups['bld_basement'].zones.push(z);
        else if (t === 'bld.ground_lobby')   groups['bld_ground'].zones.push(z);
        else if (t === 'bld.typical_floors') groups['bld_floors'].zones.push(z);
        else if (t === 'bld.roof')           groups['bld_roof'].zones.push(z);
        else                                 groups['bld_ground'].zones.push(z); // fallback
      }

    } else if (propertyType === 'garage') {
      // 2 tabs for garage
      groups['grg_ramp'] = { labelEn: 'Ramp & Gate', labelAr: 'الرامب والبوابة', zones: [] };
      groups['grg_bays'] = { labelEn: 'Parking Bays & Electrical', labelAr: 'الباكيات والكهرباء', zones: [] };
      for (const z of flat) {
        const t = z.zone_template_id;
        if (t === 'grg.ramp') groups['grg_ramp'].zones.push(z);
        else                  groups['grg_bays'].zones.push(z);
      }
    }

    return groups;
  }, [zoneInstances, propertyType]);

  // Active floor's zones
  const activeZones = useMemo(() => {
    const group = floorGroups[activeFloorKey];
    return group ? group.zones : [];
  }, [floorGroups, activeFloorKey]);

  // Active selected zone
  const currentSelectedZone = useMemo(() => {
    if (!selectedZoneId) return activeZones[0] || null;
    return activeZones.find(z => z.id === selectedZoneId) || activeZones[0] || null;
  }, [selectedZoneId, activeZones]);

  // Update a specific zone instance's spatial layout
  const handleUpdateSpatial = (zoneId: string, updates: Partial<ZoneSpatialLayout>) => {
    function updateRecursive(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        if (z.id === zoneId) {
          const currentSpatial: ZoneSpatialLayout = z.spatial || {
            gridX: 0,
            gridY: 0,
            gridW: 6,
            gridH: 4,
            length_m: DEFAULT_DIMENSIONS[z.zone_template_id]?.l || 8.0,
            width_m: DEFAULT_DIMENSIONS[z.zone_template_id]?.w || 6.0,
            sqm: Math.round((DEFAULT_DIMENSIONS[z.zone_template_id]?.l || 8.0) * (DEFAULT_DIMENSIONS[z.zone_template_id]?.w || 6.0)),
            ceiling_height: DEFAULT_DIMENSIONS[z.zone_template_id]?.ceiling || '3.6m Flush'
          };
          const nextSpatial = { ...currentSpatial, ...updates };
          if (updates.length_m !== undefined || updates.width_m !== undefined) {
            const l = updates.length_m ?? currentSpatial.length_m;
            const w = updates.width_m ?? currentSpatial.width_m;
            nextSpatial.sqm = Math.round(l * w);
          }
          return { ...z, spatial: nextSpatial };
        }
        if (z.children && z.children.length > 0) {
          return { ...z, children: updateRecursive(z.children) };
        }
        return z;
      });
    }

    onZoneInstancesChange(updateRecursive(zoneInstances));
  };

  // Add room to active floor
  const handleAddRoom = (templateId: string) => {
    const defaults = DEFAULT_DIMENSIONS[templateId] || { l: 8.0, w: 6.0, ceiling: '3.6m Flush', titleEn: 'Curated Suite', titleAr: 'مساحة معمارية' };
    const zoneTpl = ZONE_TEMPLATES.find(z => z.id === templateId);
    
    // Automatically build default trades for this room so it's fully populated in Step 4
    let trades: any[] = [];
    if (zoneTpl) {
      const tpls = getTradesForZone(zoneTpl);
      trades = tpls.map(t => ({
        id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trade_template_id: t.id,
        status: t.status_values[0] || 'NotStarted',
        attributes: getAttributesForTrade(t.id, zoneTpl.id).map(attr => ({
          attribute_template_id: attr.id,
          value: null
        }))
      }));
    }

    const newZone: ZoneInstance = {
      id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      zone_template_id: templateId,
      instance_label: isAr ? defaults.titleAr : defaults.titleEn,
      sort_order: zoneInstances.length,
      spatial: {
        gridX: 0,
        gridY: 0,
        gridW: 6,
        gridH: 4,
        length_m: defaults.l,
        width_m: defaults.w,
        sqm: Math.round(defaults.l * defaults.w),
        ceiling_height: defaults.ceiling
      },
      trades
    };

    onZoneInstancesChange([...zoneInstances, newZone]);
    setSelectedZoneId(newZone.id);
  };

  // Remove room
  const handleRemoveRoom = (zoneId: string) => {
    const filtered = zoneInstances.filter(z => z.id !== zoneId);
    onZoneInstancesChange(filtered);
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
    }
  };

  // Compute CAD layout geometry for SVG preview
  const previewSlots = useMemo(() => {
    const count = activeZones.length;
    const cW = 680;
    const cH = 440;
    const slots = getFloorPlanSlots(count);

    return activeZones.map((zone, idx) => {
      const slot = slots[idx] || slots[0];
      const x = cW * slot.xF;
      const y = cH * slot.yF;
      const w = cW * slot.wF;
      const h = cH * slot.hF;
      const spatial = zone.spatial || {
        length_m: DEFAULT_DIMENSIONS[zone.zone_template_id]?.l || 8.0,
        width_m: DEFAULT_DIMENSIONS[zone.zone_template_id]?.w || 6.0,
        sqm: Math.round((DEFAULT_DIMENSIONS[zone.zone_template_id]?.l || 8.0) * (DEFAULT_DIMENSIONS[zone.zone_template_id]?.w || 6.0)),
        ceiling_height: DEFAULT_DIMENSIONS[zone.zone_template_id]?.ceiling || '3.6m Flush'
      };

      const title = isAr 
        ? (DEFAULT_DIMENSIONS[zone.zone_template_id]?.titleAr || zone.instance_label || 'مساحة معمارية')
        : (DEFAULT_DIMENSIONS[zone.zone_template_id]?.titleEn || zone.instance_label || 'Curated Space');

      return {
        zone,
        x, y, w, h,
        pinX: x + w / 2,
        pinY: y + h / 2,
        title,
        dims: `${spatial.length_m}m × ${spatial.width_m}m`,
        sqm: spatial.sqm,
        ceiling: spatial.ceiling_height
      };
    });
  }, [activeZones, isAr]);

  const getZoneLabel = (z: ZoneInstance) => {
    const def = DEFAULT_DIMENSIONS[z.zone_template_id];
    if (def) return isAr ? def.titleAr : def.titleEn;
    const tmpl = ZONE_TEMPLATES.find(t => t.id === z.zone_template_id);
    return isAr ? (tmpl?.label_ar || z.instance_label || z.zone_template_id) : (tmpl?.label_en || z.instance_label || z.zone_template_id);
  };

  return (
    <div className="cad-builder-root">
      
      {/* Top Controls & Floor Selection */}
      <div className="cad-builder-header">
        <div className="cad-header-info">
          <span className="cad-eyebrow">
            <Sparkles size={13} className="sparkle-icon" />
            <span>{isAr ? 'الاستوديو المعماري للمخططات الهندسية (CAD)' : 'ARCHITECTURAL CAD BLUEPRINT & METROLOGY STUDIO'}</span>
          </span>
          <h3 className="cad-title">
            {isAr ? 'تخطيط الأبعاد الهندسية وتوزيع الفراغات' : 'Spatial Metrology & Continuous CAD Floor Plan'}
          </h3>
          <p className="cad-desc">
            {isAr 
              ? 'قم بتحديد أبعاد كل جناح معماري (الطول × العرض)، ارتفاع الأسقف، ومعاينة المخطط الهندسي التفاعلي في الوقت الفعلي.'
              : 'Configure physical room dimensions (Length × Width in meters), ceiling heights, and inspect the real-time architectural CAD floor plan.'
            }
          </p>
        </div>
      </div>

      {/* Floor / Zone Switcher Tabs — hidden for apartment (single flat view) */}
      {propertyType !== 'apartment' && (
        <div className="cad-floor-tabs">
          {Object.entries(floorGroups).map(([key, group]) => {
            const isActive = activeFloorKey === key;
            return (
              <button
                key={key}
                className={`floor-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveFloorKey(key);
                  if (group.zones[0]) setSelectedZoneId(group.zones[0].id);
                }}
                type="button"
              >
                <Building size={14} />
                <span>{isAr ? group.labelAr : group.labelEn}</span>
                <span className="floor-badge">{group.zones.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Builder Grid: Left Interactive CAD Canvas + Right Dimension Inspector */}
      <div className="cad-workspace-grid">
        
        {/* Left: Real-Time Architectural SVG Floor Plan Preview */}
        <div className="cad-canvas-panel">
          <div className="canvas-header-bar">
            <span className="canvas-badge">
              <Layers size={13} />
              <span>{isAr ? 'معاينة المخطط الهندسي التفاعلي (CAD)' : 'LIVE CAD BLUEPRINT PREVIEW • SCALE 1:50'}</span>
            </span>
            <span className="canvas-tip">
              {isAr ? 'انقر على أي جناح لتعديل قياساته' : 'Click any space to inspect & tune dimensions'}
            </span>
          </div>

          <div className="cad-preview-container">
            {previewSlots.length > 0 ? (
              <svg viewBox="0 0 680 440" className="cad-preview-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="adminCadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(221, 167, 82, 0.08)" strokeWidth="0.4" />
                  </pattern>
                  <pattern id="adminCadGridMajor" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(221, 167, 82, 0.15)" strokeWidth="0.8" />
                  </pattern>
                  <filter id="adminGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#DDA752" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Grid */}
                <rect width="680" height="440" fill="url(#adminCadGrid)" />
                <rect width="680" height="440" fill="url(#adminCadGridMajor)" opacity="0.4" />

                {/* Outer Perimeter Wall */}
                {(() => {
                  const minX = Math.min(...previewSlots.map(s => s.x));
                  const maxX = Math.max(...previewSlots.map(s => s.x + s.w));
                  const minY = Math.min(...previewSlots.map(s => s.y));
                  const maxY = Math.max(...previewSlots.map(s => s.y + s.h));
                  return (
                    <g>
                      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="none" stroke="#DDA752" strokeWidth="3" />
                      <rect x={minX + 3} y={minY + 3} width={maxX - minX - 6} height={maxY - minY - 6} fill="none" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                    </g>
                  );
                })()}

                {/* Shared Partitions */}
                {previewSlots.map(s => (
                  <rect key={`part-${s.zone.id}`} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="rgba(221, 167, 82, 0.45)" strokeWidth="1.5" />
                ))}

                {/* Interactive Rooms */}
                {previewSlots.map((s) => {
                  const isSelected = (currentSelectedZone?.id === s.zone.id);
                  const key = s.zone.zone_template_id.toLowerCase();
                  return (
                    <g 
                      key={s.zone.id} 
                      onClick={() => setSelectedZoneId(s.zone.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect 
                        x={s.x + 2} 
                        y={s.y + 2} 
                        width={s.w - 4} 
                        height={s.h - 4} 
                        fill={isSelected ? "rgba(221, 167, 82, 0.16)" : "rgba(255, 255, 255, 0.02)"}
                        stroke={isSelected ? "#DDA752" : "transparent"}
                        strokeWidth="1.5"
                        filter={isSelected ? "url(#adminGoldGlow)" : undefined}
                      />

                      {/* Room Symbol Badge */}
                      <g transform={`translate(${s.pinX}, ${s.pinY - 14})`}>
                        <rect x="-14" y="-14" width="28" height="28" rx="7" fill={isSelected ? "rgba(221, 167, 82, 0.25)" : "rgba(221, 167, 82, 0.08)"} stroke="#DDA752" strokeWidth="1.2" />
                        {(key.includes('reception') || key.includes('living') || key.includes('salon')) ? (
                          <path d="M -7 -3 C -7 -6, 7 -6, 7 -3 L 7 3 L -7 3 Z" fill="none" stroke="#DDA752" strokeWidth="1.2" />
                        ) : key.includes('dining') ? (
                          <circle cx="0" cy="0" r="4" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                        ) : key.includes('kitchen') ? (
                          <line x1="-4" y1="2" x2="4" y2="2" stroke="#DDA752" strokeWidth="1.3" />
                        ) : (key.includes('bath') || key.includes('powder') || key.includes('spa')) ? (
                          <path d="M -6 0 L 6 0 C 6 0 6 4 4 4 L -4 4 C -6 4 -6 0 -6 0 Z" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                        ) : (key.includes('foyer') || key.includes('entrance')) ? (
                          <rect x="-5" y="-6" width="10" height="12" rx="1" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                        ) : (key.includes('bed') || key.includes('master') || key.includes('suite')) ? (
                          <path d="M -6 0 L 6 0 L 6 4 L -6 4 Z" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                        ) : (
                          <circle cx="0" cy="0" r="3" fill="#DDA752" />
                        )}
                      </g>

                      {/* Dimension Tag */}
                      <text x={s.x + 8} y={s.y + 14} fontSize="7.5" fill="#DDA752" fontFamily="monospace">{s.dims}</text>

                      {/* Room Title */}
                      <text x={s.pinX} y={s.y + s.h - 20} fontSize="9.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                        {s.title}
                      </text>

                      {/* SQM */}
                      <text x={s.pinX} y={s.y + s.h - 9} fontSize="8.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                        {s.sqm} SQM
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="empty-floor-box">
                <Building size={36} className="empty-icon" />
                <h4 className="empty-title">{isAr ? 'لا توجد أجنحة مضافة في هذا الطابق بعد' : 'No Suites Added to this Floor Yet'}</h4>
                <p className="empty-desc">{isAr ? 'اختر جناحاً معمارياً من القائمة الجانبية لإضافته فوراً.' : 'Select an architectural suite template from the panel on the right to add it.'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Room Metrology Inspector & Suite Adder */}
        <div className="cad-inspector-panel">
          
          {/* Quick Add Suite to Floor */}
          <div className="quick-add-suite-box">
            <span className="inspector-eyebrow">
              <Plus size={11} />
              <span>{isAr ? 'إضافة جناح معماري لهذا الطابق' : 'ADD ARCHITECTURAL SUITE'}</span>
            </span>

            <div className="suite-templates-picker">
              {Object.entries(DEFAULT_DIMENSIONS)
                .filter(([tid]) => {
                  if (propertyType === 'apartment') return tid.startsWith('apt.');
                  if (propertyType === 'building')  return tid.startsWith('bld.');
                  if (propertyType === 'garage')    return tid.startsWith('grg.');
                  return true;
                })
                .map(([tid, data]) => (
                  <button
                    key={tid}
                    type="button"
                    className="btn-add-template"
                    onClick={() => handleAddRoom(tid)}
                  >
                    <Plus size={12} />
                    <span>{isAr ? data.titleAr : data.titleEn}</span>
                  </button>
                ))}
            </div>
          </div>

          {currentSelectedZone ? (
            <div className="inspector-content">
              <div className="inspector-title-row">
                <div>
                  <span className="inspector-eyebrow">{isAr ? 'القياسات المعمارية المحددة' : 'SELECTED SUITE METROLOGY'}</span>
                  <h4 className="inspector-room-title">{getZoneLabel(currentSelectedZone)}</h4>
                </div>

                <button 
                  type="button"
                  className="btn-remove-room"
                  onClick={() => handleRemoveRoom(currentSelectedZone.id)}
                  title={isAr ? 'حذف هذه المساحة' : 'Remove this room'}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Dimension Inputs */}
              <div className="inspector-fields-group">
                
                {/* Length (m) */}
                <div className="inspector-field">
                  <label className="field-label">
                    {isAr ? 'الطول المعماري (متر)' : 'Length (Meters)'}
                  </label>
                  <div className="field-input-wrap">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      value={currentSelectedZone.spatial?.length_m || DEFAULT_DIMENSIONS[currentSelectedZone.zone_template_id]?.l || 8.0}
                      onChange={(e) => handleUpdateSpatial(currentSelectedZone.id, {
                        length_m: parseFloat(e.target.value) || 1.0
                      })}
                      className="field-input"
                    />
                    <span className="unit-tag">m</span>
                  </div>
                </div>

                {/* Width (m) */}
                <div className="inspector-field">
                  <label className="field-label">
                    {isAr ? 'العرض المعماري (متر)' : 'Width (Meters)'}
                  </label>
                  <div className="field-input-wrap">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      value={currentSelectedZone.spatial?.width_m || DEFAULT_DIMENSIONS[currentSelectedZone.zone_template_id]?.w || 6.0}
                      onChange={(e) => handleUpdateSpatial(currentSelectedZone.id, {
                        width_m: parseFloat(e.target.value) || 1.0
                      })}
                      className="field-input"
                    />
                    <span className="unit-tag">m</span>
                  </div>
                </div>

                {/* Calculated SQM Area */}
                <div className="inspector-field">
                  <label className="field-label">
                    {isAr ? 'المساحة الصافية المحسوبة' : 'Calculated Net Area (SQM)'}
                  </label>
                  <div className="sqm-calc-box">
                    <span className="sqm-calc-val">
                      {Math.round(
                        (currentSelectedZone.spatial?.length_m || DEFAULT_DIMENSIONS[currentSelectedZone.zone_template_id]?.l || 8.0) *
                        (currentSelectedZone.spatial?.width_m || DEFAULT_DIMENSIONS[currentSelectedZone.zone_template_id]?.w || 6.0)
                      )}
                    </span>
                    <span className="sqm-calc-unit">SQM (م²)</span>
                  </div>
                </div>

                {/* Ceiling Height Specification */}
                <div className="inspector-field">
                  <label className="field-label">
                    {isAr ? 'ارتفاع ومواصفة السقف' : 'Ceiling Height & Type'}
                  </label>
                  <select
                    value={currentSelectedZone.spatial?.ceiling_height || DEFAULT_DIMENSIONS[currentSelectedZone.zone_template_id]?.ceiling || '3.6m Flush'}
                    onChange={(e) => handleUpdateSpatial(currentSelectedZone.id, {
                      ceiling_height: e.target.value
                    })}
                    className="field-select"
                  >
                    <option value="5.2m Atrium">5.2m Double-Height Atrium (بهو مزدوج)</option>
                    <option value="4.4m Double-Height">4.4m Double-Height (سقف مزدوج الارتفاع)</option>
                    <option value="3.8m Coffered">3.8m Coffered Gypsum (سقف معلق ديكوري)</option>
                    <option value="3.8m Tray Cove">3.8m Tray Cove (كوف مضيء غير مباشر)</option>
                    <option value="3.6m Flush">3.6m Flush Ceiling (سقف فلات مستوي)</option>
                    <option value="3.4m Ambient">3.4m Ambient Cove (إنارة خافتة مدمجة)</option>
                    <option value="Open Sky Pergola">Open Sky Pergola (برجولا مفتوحة للسماء)</option>
                    <option value="Open Sky">Open Sky (مفتوح بالكامل)</option>
                  </select>
                </div>

              </div>

            </div>
          ) : (
            <div className="empty-inspector-box">
              <Info size={28} className="info-icon" />
              <p>{isAr ? 'اختر مساحة معمارية من المخطط لتعديل أبعادها.' : 'Click any space on the blueprint preview to tune dimensions.'}</p>
            </div>
          )}

        </div>

      </div>

      <style>{`
        .cad-builder-root {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        .cad-builder-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .cad-header-info {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .cad-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          color: #DDA752;
          text-transform: uppercase;
        }

        .sparkle-icon {
          color: #DDA752;
        }

        .cad-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.4rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        [data-theme="light"] .cad-title {
          color: #0F172A;
        }

        .cad-desc {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.65);
          margin: 0;
          max-width: 680px;
          line-height: 1.5;
        }

        [data-theme="light"] .cad-desc {
          color: #64748B;
        }

        .cad-floor-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 4px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .cad-floor-tabs {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
        }

        .floor-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 1.1rem;
          border-radius: 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        [data-theme="light"] .floor-tab-btn {
          color: #475569;
        }

        .floor-tab-btn:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.05);
        }

        .floor-tab-btn.active {
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.22) 0%, rgba(221, 167, 82, 0.06) 100%);
          border: 1px solid rgba(221, 167, 82, 0.4);
          color: #DDA752;
        }

        .floor-badge {
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.08);
        }

        .floor-tab-btn.active .floor-badge {
          background: rgba(221, 167, 82, 0.25);
          color: #DDA752;
        }

        .cad-workspace-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .cad-workspace-grid {
            grid-template-columns: 1fr;
          }
        }

        .cad-canvas-panel {
          border-radius: 20px;
          overflow: hidden;
          background: rgba(10, 14, 24, 0.8);
          border: 1px solid rgba(221, 167, 82, 0.2);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
        }

        [data-theme="light"] .cad-canvas-panel {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
        }

        .canvas-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .canvas-header-bar {
          background: #F8FAFC;
          border-bottom-color: rgba(0, 0, 0, 0.06);
        }

        .canvas-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: #DDA752;
        }

        .canvas-tip {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.45);
        }

        [data-theme="light"] .canvas-tip {
          color: #64748B;
        }

        .cad-preview-container {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 440px;
        }

        .cad-preview-svg {
          width: 100%;
          height: auto;
          max-height: 480px;
          border-radius: 12px;
        }

        .empty-floor-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 3rem 1.5rem;
          text-align: center;
        }

        .empty-icon {
          color: rgba(221, 167, 82, 0.4);
          margin-bottom: 0.5rem;
        }

        .empty-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .empty-desc {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
          max-width: 320px;
        }

        .cad-inspector-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .quick-add-suite-box {
          border-radius: 18px;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(221, 167, 82, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        [data-theme="light"] .quick-add-suite-box {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
        }

        .suite-templates-picker {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .btn-add-template {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(221, 167, 82, 0.08);
          border: 1px solid rgba(221, 167, 82, 0.25);
          color: #DDA752;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .btn-add-template:hover {
          background: rgba(221, 167, 82, 0.2);
          transform: translateY(-1px);
        }

        .inspector-content {
          border-radius: 18px;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(221, 167, 82, 0.3);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        [data-theme="light"] .inspector-content {
          background: #FFFFFF;
          border-color: rgba(221, 167, 82, 0.4);
        }

        .inspector-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .inspector-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #DDA752;
          text-transform: uppercase;
        }

        .inspector-room-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.15rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0.25rem 0 0;
        }

        [data-theme="light"] .inspector-room-title {
          color: #0F172A;
        }

        .btn-remove-room {
          padding: 7px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #F87171;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-remove-room:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #FFFFFF;
        }

        .inspector-fields-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .inspector-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .field-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.75);
        }

        [data-theme="light"] .field-label {
          color: #475569;
        }

        .field-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .field-input {
          width: 100%;
          padding: 0.65rem 2.5rem 0.65rem 0.85rem;
          border-radius: 10px;
          background: rgba(10, 14, 24, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          outline: none;
          transition: all 0.2s ease;
        }

        [data-theme="light"] .field-input {
          background: #F8FAFC;
          border-color: rgba(0, 0, 0, 0.12);
          color: #0F172A;
        }

        .field-input:focus {
          border-color: #DDA752;
          box-shadow: 0 0 0 3px rgba(221, 167, 82, 0.2);
        }

        .unit-tag {
          position: absolute;
          right: 12px;
          font-family: monospace;
          font-size: 0.75rem;
          color: #DDA752;
          font-weight: 700;
          pointer-events: none;
        }

        .sqm-calc-box {
          display: flex;
          align-items: baseline;
          gap: 6px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(221, 167, 82, 0.1);
          border: 1.5px dashed rgba(221, 167, 82, 0.4);
        }

        .sqm-calc-val {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: #DDA752;
        }

        .sqm-calc-unit {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(221, 167, 82, 0.8);
        }

        .field-select {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          background: rgba(10, 14, 24, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.8125rem;
          font-weight: 600;
          outline: none;
        }

        [data-theme="light"] .field-select {
          background: #F8FAFC;
          border-color: rgba(0, 0, 0, 0.12);
          color: #0F172A;
        }

        .field-select:focus {
          border-color: #DDA752;
          box-shadow: 0 0 0 3px rgba(221, 167, 82, 0.2);
        }

        .empty-inspector-box {
          border-radius: 18px;
          padding: 2rem 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.8125rem;
        }

        .info-icon {
          color: #DDA752;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default CADBlueprintBuilder;
