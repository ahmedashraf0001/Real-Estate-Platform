'use client';

import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Building, Plus, Trash2, ImagePlus, Loader2, X, MousePointerClick } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  ZoneInstance,
  ZoneSpatialLayout,
  TradeTemplate,
  ZONE_TEMPLATES,
  TRADE_TEMPLATES,
  getTradesForZone,
  getAttributesForTrade,
  getZoneBadge,
  updateTradeStatus,
  updateAttributeValue,
  addZoneImage,
  removeZoneImage,
  addTradeToZone,
  removeTradeFromZone,
  removeZone,
} from '@/lib/layering';
import { FALLBACK_ZONE_TITLES, fallbackMetricFor } from '@/lib/layering/zoneMetrics';

interface ZoneInspectorProps {
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  selectedZoneId: string | null;
  /** Figma-style flyout mode: hidden when nothing is selected, closable, offset beside the rooms rail. */
  nested?: boolean;
  onClose?: () => void;
  isAr?: boolean;
}

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  NotStarted: { en: 'Not Started', ar: 'لم يبدأ' },
  RoughIn: { en: 'Rough-In', ar: 'تمديدات خام' },
  Finished: { en: 'Finished', ar: 'تم' },
  ConduitsOnly: { en: 'Conduits Only', ar: 'مواسير فقط' },
  Wired: { en: 'Wired', ar: 'أسلاك' },
  RedBrick: { en: 'Red Brick', ar: 'طوب أحمر' },
  Plastered: { en: 'Plastered', ar: 'مبياض' },
  Tiled: { en: 'Tiled', ar: 'سيراميك' },
  FinalPaint: { en: 'Final Paint', ar: 'دهان نهائي' },
  Putty: { en: 'Putty', ar: 'معجون' },
  SandBed: { en: 'Sand Bed', ar: 'رملة' },
  None: { en: 'None', ar: 'لا يوجد' },
  SubFrames: { en: 'Sub-Frames', ar: 'حلوق' },
  Installed: { en: 'Installed', ar: 'مركّب' },
  CopperPrep: { en: 'Copper Prep', ar: 'تمديد نحاس' },
  InProgress: { en: 'In Progress', ar: 'جاري' },
  Shaft: { en: 'Shaft Ready', ar: 'بئر المصعد' },
  Applied: { en: 'Applied', ar: 'تم التطبيق' },
};

function statusLabel(status: string, isAr: boolean): string {
  const s = STATUS_LABELS[status];
  return s ? (isAr ? s.ar : s.en) : status;
}

function prettify(id: string): string {
  const last = id.split('.').pop() ?? id;
  return last.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function findZone(zones: ZoneInstance[], id: string): ZoneInstance | null {
  for (const z of zones) {
    if (z.id === id) return z;
    if (z.children) {
      const hit = findZone(z.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function zoneName(zone: ZoneInstance, isAr: boolean): string {
  if (zone.instance_label?.trim()) return zone.instance_label;
  const tpl = ZONE_TEMPLATES.find(t => t.id === zone.zone_template_id);
  if (tpl) return isAr ? tpl.label_ar : tpl.label_en;
  const shared = FALLBACK_ZONE_TITLES[zone.zone_template_id];
  if (shared) return isAr ? shared.ar : shared.en;
  return prettify(zone.zone_template_id);
}

function tradeTemplateFor(trade: { trade_template_id: string; status: string }): TradeTemplate {
  const found = TRADE_TEMPLATES.find(t => t.id === trade.trade_template_id);
  if (found) return found;
  const generic = ['NotStarted', 'InProgress', 'Finished'];
  return {
    id: trade.trade_template_id,
    categories: [],
    label_en: prettify(trade.trade_template_id),
    label_ar: prettify(trade.trade_template_id),
    status_values: generic.includes(trade.status) || !trade.status ? generic : [...generic, trade.status],
  };
}

const TIER_STYLES: Record<string, { en: string; ar: string; color: string }> = {
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل', color: '#4CC38A' },
  semi_finished: { en: 'Semi-Finished', ar: 'نص تشطيب', color: '#E0A63A' },
  red_brick: { en: 'Red Brick', ar: 'طوب أحمر', color: '#E06D5B' },
  mixed: { en: 'Mixed', ar: 'مختلط', color: '#9FB3D9' },
};

export function ZoneInspector({ zoneInstances, onZoneInstancesChange, selectedZoneId, nested = false, onClose, isAr = false }: ZoneInspectorProps) {
  const [uploading, setUploading] = useState(false);
  const [addTradeOpen, setAddTradeOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const zone = useMemo(
    () => (selectedZoneId ? findZone(zoneInstances, selectedZoneId) : null),
    [zoneInstances, selectedZoneId],
  );

  if (!zone) {
    if (nested) return null;
    return (
      <aside className="zi-root" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="zi-empty">
          <MousePointerClick size={28} className="zi-empty-icon" />
          <h4 className="zi-empty-title">{isAr ? 'لم يتم تحديد غرفة' : 'No room selected'}</h4>
          <p className="zi-empty-desc">
            {isAr
              ? 'اختر غرفة من المخطط أو القائمة لعرض أبعادها وتشطيباتها هنا.'
              : 'Select a room on the plan or list to inspect its dimensions and finishes here.'}
          </p>
        </div>
        <InspectorStyles />
      </aside>
    );
  }

  return (
    <aside className={`zi-root ${nested ? 'zi-nested' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      <ZoneInspectorBody
        key={zone.id}
        zone={zone}
        zoneInstances={zoneInstances}
        onZoneInstancesChange={onZoneInstancesChange}
        isAr={isAr}
        uploading={uploading}
        setUploading={setUploading}
        addTradeOpen={addTradeOpen}
        setAddTradeOpen={setAddTradeOpen}
        fileRef={fileRef}
        onClose={nested ? onClose : undefined}
      />
      <InspectorStyles />
    </aside>
  );
}

interface BodyProps {
  zone: ZoneInstance;
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  isAr: boolean;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  addTradeOpen: boolean;
  setAddTradeOpen: (v: boolean) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onClose?: () => void;
}

function ZoneInspectorBody({
  zone, zoneInstances, onZoneInstancesChange, isAr,
  uploading, setUploading, addTradeOpen, setAddTradeOpen, fileRef, onClose,
}: BodyProps) {
  const shared = fallbackMetricFor(zone.zone_template_id);
  const widthM = zone.spatial?.width_m ?? shared?.width_m ?? 3;
  const lengthM = zone.spatial?.length_m ?? shared?.length_m ?? 4;
  const sqm = zone.spatial?.sqm ?? shared?.sqm ?? Math.round(widthM * lengthM);
  const ceiling = zone.spatial?.ceiling_height ?? shared?.ceiling ?? '3.0m Flush';
  const badge = getZoneBadge(zone);
  const tier = TIER_STYLES[badge];

  const patchSpatial = (updates: Partial<ZoneSpatialLayout>) => {
    function walk(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        if (z.id === zone.id) {
          const current: ZoneSpatialLayout = z.spatial ?? {
            gridX: 0, gridY: 0, gridW: 6, gridH: 4,
            length_m: lengthM, width_m: widthM, sqm, ceiling_height: ceiling,
          };
          const next = { ...current, ...updates };
          if (updates.length_m !== undefined || updates.width_m !== undefined) {
            next.sqm = Math.round((updates.length_m ?? current.length_m) * (updates.width_m ?? current.width_m) * 10) / 10;
          }
          return { ...z, spatial: next };
        }
        return z.children ? { ...z, children: walk(z.children) } : z;
      });
    }
    onZoneInstancesChange(walk(zoneInstances));
  };

  const commitDim = (field: 'width_m' | 'length_m', raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;
    patchSpatial({ [field]: Math.max(0.1, Math.round(parsed * 10) / 10) });
  };

  const zoneTpl = ZONE_TEMPLATES.find(t => t.id === zone.zone_template_id);
  const existingTradeIds = new Set(zone.trades.map(t => t.trade_template_id));
  const addableTrades = (zoneTpl ? getTradesForZone(zoneTpl) : TRADE_TEMPLATES).filter(t => !existingTradeIds.has(t.id));

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `zone-photos/${zone.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from('property-images').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('property-images').getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
      let next = zoneInstances;
      for (const url of urls) next = addZoneImage(next, zone.id, url);
      onZoneInstancesChange(next);
      toast.success(isAr ? `تم رفع ${urls.length} صورة` : `${urls.length} photo(s) uploaded`);
    } catch {
      toast.error(isAr ? 'فشل رفع الصور' : 'Photo upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <header className="zi-header">
        <span className="zi-header-icon"><Building size={15} /></span>
        <div className="zi-header-text">
          <h4 className="zi-title" dir="auto">{zoneName(zone, isAr)}</h4>
          <div className="zi-meta">
            <span dir="ltr">{sqm} m²</span>
            {zone.level_label && <span className="zi-level">{zone.level_label}</span>}
          </div>
        </div>
        {tier && (
          <span className="zi-tier" style={{ color: tier.color, borderColor: tier.color }}>
            {isAr ? tier.ar : tier.en}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            className="zi-icon-btn"
            aria-label={isAr ? 'إغلاق' : 'Close'}
            onClick={onClose}
          >
            <X size={13} />
          </button>
        )}
      </header>

      {onClose && (
        <button
          type="button"
          className="zi-delete-zone"
          onClick={() => {
            const ok = window.confirm(isAr
              ? `حذف "${zoneName(zone, isAr)}" نهائياً من المخطط؟`
              : `Delete "${zoneName(zone, isAr)}" from the floor plan?`);
            if (!ok) return;
            onZoneInstancesChange(removeZone(zoneInstances, zone.id));
            onClose();
          }}
        >
          <Trash2 size={12} />
          <span>{isAr ? 'حذف الغرفة' : 'Delete room'}</span>
        </button>
      )}

      <section className="zi-section">
        <span className="zi-section-label">{isAr ? 'الأبعاد' : 'DIMENSIONS'}</span>
        <div className="zi-dims">
          <label className="zi-dim">
            <span>{isAr ? 'العرض' : 'W'}</span>
            <span className="zi-dim-field" dir="ltr">
              <input
                key={`w-${widthM}`}
                type="text"
                inputMode="decimal"
                defaultValue={widthM}
                onBlur={e => commitDim('width_m', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitDim('width_m', (e.target as HTMLInputElement).value); }}
              />
              <em>m</em>
            </span>
          </label>
          <label className="zi-dim">
            <span>{isAr ? 'الطول' : 'L'}</span>
            <span className="zi-dim-field" dir="ltr">
              <input
                key={`l-${lengthM}`}
                type="text"
                inputMode="decimal"
                defaultValue={lengthM}
                onBlur={e => commitDim('length_m', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitDim('length_m', (e.target as HTMLInputElement).value); }}
              />
              <em>m</em>
            </span>
          </label>
        </div>
        <label className="zi-ceiling">
          <span>{isAr ? 'الارتفاع' : 'Ceiling'}</span>
          <input
            key={`ceil-${ceiling}`}
            type="text"
            dir="auto"
            maxLength={30}
            defaultValue={ceiling}
            placeholder="e.g. 3.0m Flush"
            onBlur={e => { const v = e.target.value.trim(); if (v && v !== ceiling) patchSpatial({ ceiling_height: v }); }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && v !== ceiling) patchSpatial({ ceiling_height: v });
              }
            }}
          />
        </label>
      </section>

      <section className="zi-section">
        <div className="zi-section-head">
          <span className="zi-section-label">{isAr ? 'أنظمة التشطيب' : 'FINISHING SYSTEMS'}</span>
          <span className="zi-count">{zone.trades.length}</span>
        </div>

        {zone.trades.map(trade => {
          const tpl = tradeTemplateFor(trade);
          const attrs = getAttributesForTrade(trade.trade_template_id, zone.zone_template_id);
          return (
            <div key={trade.id} className="zi-trade">
              <div className="zi-trade-head">
                <span className="zi-trade-name" dir="auto">{isAr ? tpl.label_ar : tpl.label_en}</span>
                <button
                  type="button"
                  className="zi-icon-btn danger"
                  aria-label={isAr ? 'حذف القسم' : 'Remove trade'}
                  onClick={() => onZoneInstancesChange(removeTradeFromZone(zoneInstances, zone.id, trade.id))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="zi-statuses">
                {tpl.status_values.map(sv => (
                  <button
                    key={sv}
                    type="button"
                    className={`zi-status ${trade.status === sv ? 'active' : ''}`}
                    onClick={() => onZoneInstancesChange(updateTradeStatus(zoneInstances, zone.id, trade.id, sv))}
                  >
                    {statusLabel(sv, isAr)}
                  </button>
                ))}
              </div>
              {attrs.length > 0 && (
                <div className="zi-attrs">
                  {attrs.map(attr => {
                    const current = trade.attributes.find(a => a.attribute_template_id === attr.id)?.value ?? null;
                    const set = (v: boolean | string | number | null) =>
                      onZoneInstancesChange(updateAttributeValue(zoneInstances, zone.id, trade.id, attr.id, v));
                    return (
                      <label key={attr.id} className="zi-attr">
                        <span dir="auto">{isAr ? attr.label_ar : attr.label_en}</span>
                        {attr.data_type === 'boolean' ? (
                          <input type="checkbox" checked={current === true} onChange={e => set(e.target.checked)} />
                        ) : attr.data_type === 'enum' ? (
                          <select value={String(current ?? '')} onChange={e => set(e.target.value || null)}>
                            <option value="">—</option>
                            {(attr.enum_values ?? []).map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : (
                          <input
                            type={attr.data_type === 'text' ? 'text' : 'number'}
                            defaultValue={current === null ? '' : String(current)}
                            onBlur={e => set(e.target.value === '' ? null : attr.data_type === 'text' ? e.target.value : Number(e.target.value))}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {addableTrades.length > 0 && (
          <div className="zi-add-trade">
            {addTradeOpen ? (
              <select
                autoFocus
                defaultValue=""
                onChange={e => {
                  if (e.target.value) {
                    onZoneInstancesChange(addTradeToZone(zoneInstances, zone.id, e.target.value, 'semi_finished'));
                  }
                  setAddTradeOpen(false);
                }}
                onBlur={() => setAddTradeOpen(false)}
              >
                <option value="" disabled>{isAr ? 'اختر نظاماً...' : 'Pick a system...'}</option>
                {addableTrades.map(t => (
                  <option key={t.id} value={t.id}>{isAr ? t.label_ar : t.label_en}</option>
                ))}
              </select>
            ) : (
              <button type="button" className="zi-add-btn" onClick={() => setAddTradeOpen(true)}>
                <Plus size={12} />
                <span>{isAr ? 'إضافة نظام تشطيب' : 'Add finishing system'}</span>
              </button>
            )}
          </div>
        )}
      </section>

      <section className="zi-section">
        <div className="zi-section-head">
          <span className="zi-section-label">{isAr ? 'صور المنطقة' : 'ZONE PHOTOS'}</span>
          <span className="zi-count">{zone.images?.length ?? 0}</span>
        </div>
        {(zone.images?.length ?? 0) > 0 && (
          <div className="zi-photos">
            {zone.images!.map((url, i) => (
              <div key={`${url}-${i}`} className="zi-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Zone photo ${i + 1}`} />
                <button
                  type="button"
                  className="zi-photo-x"
                  aria-label={isAr ? 'حذف الصورة' : 'Remove photo'}
                  onClick={() => onZoneInstancesChange(removeZoneImage(zoneInstances, zone.id, i))}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="zi-add-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 size={12} className="zi-spin" /> : <ImagePlus size={12} />}
          <span>{isAr ? 'رفع صور' : 'Upload photos'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleUpload(e.target.files)} />
      </section>
    </>
  );
}

function InspectorStyles() {
  return (
    <style>{`
      .zi-root {
        position: fixed;
        inset-block: 0;
        inset-inline-end: 0;
        width: 320px;
        height: 100dvh;
        z-index: 60;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px 14px;
        background: #0D1220;
        border-inline-start: 1px solid rgba(221,167,82,0.16);
        box-shadow: -12px 0 32px rgba(0,0,0,0.35);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #EDE8DD;
      }

      [dir="rtl"].zi-root {
        box-shadow: 12px 0 32px rgba(0,0,0,0.35);
      }

      .zi-root.zi-nested {
        inset-inline-end: 300px;
        z-index: 59;
        border-inline-end: 1px solid rgba(221,167,82,0.16);
        animation: ziSlideIn 0.18s cubic-bezier(0.2,0,0,1);
      }

      @keyframes ziSlideIn {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: translateX(0); }
      }

      [dir="rtl"].zi-root.zi-nested {
        animation-name: ziSlideInRtl;
      }

      @keyframes ziSlideInRtl {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .zi-delete-zone {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 0.66rem;
        font-weight: 800;
        cursor: pointer;
        background: rgba(217,107,107,0.08);
        border: 1px solid rgba(217,107,107,0.3);
        color: #D96B6B;
        transition: background-color 0.15s;
      }

      .zi-delete-zone:hover { background: rgba(217,107,107,0.16); }

      @media (max-width: 1023px) {
        .zi-root {
          position: static;
          width: auto;
          height: auto;
          max-height: none;
          border-radius: 14px;
          border: 1px solid rgba(221,167,82,0.16);
          box-shadow: none;
          margin-top: 16px;
        }
      }

      .zi-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 3rem 0.5rem;
      }
      .zi-empty-icon { color: rgba(221,167,82,0.45); margin-bottom: 4px; }
      .zi-empty-title { margin: 0; font-size: 0.875rem; font-weight: 700; }
      .zi-empty-desc { margin: 0; font-size: 0.72rem; line-height: 1.5; color: rgba(237,232,221,0.55); }

      .zi-header { display: flex; align-items: flex-start; gap: 8px; }
      .zi-header-icon {
        flex-shrink: 0;
        display: inline-flex;
        padding: 6px;
        border-radius: 8px;
        color: #DDA752;
        background: rgba(221,167,82,0.10);
      }
      .zi-header-text { flex: 1; min-width: 0; }
      .zi-title { margin: 0; font-size: 0.85rem; font-weight: 800; line-height: 1.25; overflow-wrap: break-word; }
      .zi-meta {
        display: flex; align-items: center; gap: 6px; margin-top: 3px;
        font-family: monospace; font-variant-numeric: tabular-nums;
        font-size: 0.68rem; font-weight: 700; color: rgba(237,232,221,0.55);
      }
      .zi-level {
        font-family: 'Plus Jakarta Sans', sans-serif;
        padding: 1px 7px; border-radius: 999px;
        background: rgba(221,167,82,0.10); color: #DDA752;
      }
      .zi-tier {
        flex-shrink: 0; font-size: 0.6rem; font-weight: 800;
        padding: 2px 8px; border-radius: 999px; border: 1px solid;
        white-space: nowrap;
      }

      .zi-section {
        display: flex; flex-direction: column; gap: 8px;
        padding-top: 12px; border-top: 1px solid rgba(221,167,82,0.12);
      }
      .zi-section-head { display: flex; align-items: center; justify-content: space-between; }
      .zi-section-label {
        font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em;
        color: rgba(237,232,221,0.5);
      }
      .zi-count {
        font-family: monospace; font-size: 0.62rem; font-weight: 800;
        padding: 1px 7px; border-radius: 999px;
        background: rgba(221,167,82,0.12); color: #DDA752;
      }

      .zi-dims { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .zi-dim { display: flex; flex-direction: column; gap: 3px; }
      .zi-dim > span, .zi-ceiling > span {
        font-size: 0.62rem; font-weight: 700; color: rgba(237,232,221,0.55);
      }
      .zi-dim-field {
        display: flex; align-items: baseline; gap: 3px;
        padding: 5px 8px; border-radius: 8px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(221,167,82,0.16);
      }
      .zi-dim-field input {
        width: 100%; min-width: 0; background: transparent; border: none; outline: none;
        color: #EDE8DD; font-family: monospace; font-size: 0.78rem; font-weight: 700;
      }
      .zi-dim-field em { font-style: normal; font-family: monospace; font-size: 0.62rem; color: rgba(237,232,221,0.5); }
      .zi-dim-field:focus-within { border-color: #DDA752; }

      .zi-ceiling { display: flex; flex-direction: column; gap: 3px; }
      .zi-ceiling select, .zi-ceiling input, .zi-add-trade select, .zi-attr select {
        padding: 6px 8px; border-radius: 8px;
        background: #0A0E18; border: 1px solid rgba(221,167,82,0.16);
        color: #EDE8DD; font-family: inherit; font-size: 0.72rem; font-weight: 600;
        outline: none; cursor: pointer; max-width: 100%;
      }
      .zi-ceiling select:focus, .zi-ceiling input:focus, .zi-attr select:focus { border-color: #DDA752; }

      .zi-trade {
        display: flex; flex-direction: column; gap: 6px;
        padding: 8px; border-radius: 10px;
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(221,167,82,0.10);
      }
      .zi-trade-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
      .zi-trade-name { font-size: 0.72rem; font-weight: 700; min-width: 0; overflow-wrap: break-word; }

      .zi-icon-btn {
        flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; border-radius: 6px;
        background: transparent; border: 1px solid rgba(221,167,82,0.14);
        color: rgba(237,232,221,0.4); cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
      }
      .zi-icon-btn.danger:hover { color: #D96B6B; border-color: #D96B6B; }

      .zi-statuses { display: flex; flex-wrap: wrap; gap: 4px; }
      .zi-status {
        padding: 3px 8px; border-radius: 999px;
        font-size: 0.6rem; font-weight: 700; cursor: pointer;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(221,167,82,0.14);
        color: rgba(237,232,221,0.6);
        transition: color 0.15s, border-color 0.15s, background-color 0.15s;
      }
      .zi-status:hover { color: #EDE8DD; }
      .zi-status.active {
        background: rgba(221,167,82,0.15);
        border-color: #DDA752; color: #DDA752;
      }

      .zi-attrs {
        display: flex; flex-direction: column; gap: 5px;
        padding-top: 6px; border-top: 1px dashed rgba(221,167,82,0.12);
      }
      .zi-attr {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        font-size: 0.66rem; font-weight: 600; color: rgba(237,232,221,0.7);
      }
      .zi-attr input[type="text"], .zi-attr input[type="number"] {
        width: 45%; padding: 4px 6px; border-radius: 6px;
        background: #0A0E18; border: 1px solid rgba(221,167,82,0.16);
        color: #EDE8DD; font-size: 0.66rem; outline: none;
      }
      .zi-attr input:focus { border-color: #DDA752; }
      .zi-attr input[type="checkbox"] { accent-color: #DDA752; width: 14px; height: 14px; }
      .zi-attr select { max-width: 50%; }

      .zi-add-trade select { width: 100%; }
      .zi-add-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; min-height: 32px; padding: 6px 10px; border-radius: 8px;
        font-size: 0.66rem; font-weight: 800; cursor: pointer;
        background: rgba(221,167,82,0.08);
        border: 1px dashed rgba(221,167,82,0.35); color: #DDA752;
        transition: background-color 0.15s;
      }
      .zi-add-btn:hover:not(:disabled) { background: rgba(221,167,82,0.16); }
      .zi-add-btn:disabled { opacity: 0.6; cursor: default; }

      .zi-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
      .zi-photo {
        position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
        border: 1px solid rgba(221,167,82,0.2);
      }
      .zi-photo img { width: 100%; height: 100%; object-fit: cover; }
      .zi-photo-x {
        position: absolute; top: 3px; inset-inline-end: 3px;
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border-radius: 999px;
        background: rgba(10,14,24,0.8); border: none; color: #EDE8DD; cursor: pointer;
      }
      .zi-photo-x:hover { color: #D96B6B; }

      .zi-spin { animation: ziSpin 0.9s linear infinite; }
      @keyframes ziSpin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

export default ZoneInspector;
