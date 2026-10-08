import type { BlueprintView } from './buildingBlueprint';
import type { ZoneInstance } from './instances';
import { blueprintLabel } from './labels';
import { getTradesForZone, ZONE_TEMPLATES } from './templates';

export function serializeBlueprintView(view: BlueprintView): string {
  if (view.mode === 'elevation') return 'building';
  const floor = `floor/${encodeURIComponent(view.floorKey)}`;
  return view.mode === 'unit' ? `${floor}/unit/${encodeURIComponent(view.unitId)}` : floor;
}

export function parseBlueprintView(value: string | null): BlueprintView {
  try {
    const parts = value?.split('/') ?? [];
    if (parts[0] === 'floor' && parts[1]) {
      const floorKey = decodeURIComponent(parts[1]);
      if (parts.length === 2) return { mode: 'floor', floorKey };
      if (parts.length === 4 && parts[2] === 'unit' && parts[3]) return { mode: 'unit', floorKey, unitId: decodeURIComponent(parts[3]) };
    }
  } catch { /* Invalid percent encoding falls back to the building. */ }
  return { mode: 'elevation' };
}

/** Display only recorded facts and the selected element's permitted trades. */
export function blueprintElementDetail(zone: ZoneInstance, isAr: boolean) {
  const template = ZONE_TEMPLATES.find(t => t.id === zone.zone_template_id);
  const allowed = template && zone.zone_template_id.startsWith('bld.') && zone.zone_template_id !== 'bld.building'
    ? new Set(getTradesForZone(template).map(t => t.id)) : null;
  const trades = zone.trades.filter(t => !allowed || allowed.has(t.trade_template_id));
  const facts = trades.flatMap(t => t.attributes.flatMap(a => {
    if (a.value == null || a.value === '' || a.value === 0 || a.value === false || /^\s*\[.*\]\s*$/.test(String(a.value))) return [];
    const bilingual = String(a.value).match(/^(.*?)\s*\((.*?[\u0600-\u06ff].*?)\)\s*$/);
    const value = a.value === true ? (isAr ? 'نعم' : 'Yes') : bilingual ? bilingual[isAr ? 2 : 1].trim() : String(a.value);
    return [[blueprintLabel('attribute', a.attribute_template_id, isAr), value]];
  }));
  return { trades, facts };
}
