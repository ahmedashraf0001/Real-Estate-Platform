import type { BuildingUnitInstance, ZoneInstance } from './instances';
import { getTradesForZone, ZONE_TEMPLATES } from './templates';
import type { BuildingUnitItem } from '../supabase/types';
import { unitCode } from './labels';
import { getZoneBadge } from './instances';

export type BlueprintView = { mode: 'elevation' } | { mode: 'floor'; floorKey: string } | { mode: 'unit'; floorKey: string; unitId: string };

export function buildingFloorKey(zone: ZoneInstance): string {
  if (zone.zone_template_id === 'bld.building') return 'building';
  if (zone.floor_number !== undefined) return zone.floor_number === 0 ? 'bld_ground' : zone.floor_number === -1 ? 'bld_basement' : `Floor ${zone.floor_number}`;
  const label = zone.level_label?.trim();
  if (/^(?:bld_roof|roof|السطح)$/i.test(label ?? '') || ['bld.roof', 'bld.roof_service', 'bld.roof_terrace'].includes(zone.zone_template_id)) return 'bld_roof';
  if (/^(?:bld_basement|basement|البدروم)$/i.test(label ?? '') || zone.zone_template_id === 'bld.basement') return 'bld_basement';
  if (!label || /^(?:bld_ground|ground floor|الأرضي|الدور الأرضي)$/i.test(label)) return 'bld_ground';
  const digits = label.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const number = digits.match(/(?:Floor|الدور|الطابق)\s*(\d+)/i)?.[1];
  return number ? Number(number) === 0 ? 'bld_ground' : `Floor ${Number(number)}` : label;
}

export function floorLabel(key: string, isAr: boolean): string {
  if (key === 'building') return isAr ? 'المبنى' : 'Building';
  if (key === 'bld_ground') return isAr ? 'الدور الأرضي' : 'Ground floor';
  if (key === 'bld_basement') return isAr ? 'البدروم' : 'Basement';
  if (key === 'bld_roof') return isAr ? 'السطح' : 'Roof';
  const number = key.match(/^Floor (\d+)$/)?.[1];
  if (number) return `${isAr ? 'الدور' : 'Floor'} ${number}`;
  return (isAr ? !/[A-Za-z]/.test(key) : !/[\u0600-\u06ff]/.test(key)) ? key : (isAr ? 'دور غير محدد' : 'Unspecified floor');
}

export function selectBuildingFloor(zones: ZoneInstance[], key: string) {
  const selected = zones.filter(z => buildingFloorKey(z) === key && z.zone_template_id !== 'bld.building');
  return { units: selected.filter(z => z.zone_template_id === 'bld.unit'), core: selected.filter(z => z.zone_template_id !== 'bld.unit') };
}

/** Pure dry run. Exact duplicate payloads are collapsed, differing recorded values are preserved. */
export function repairBuildingTradeScopes(input: ZoneInstance[]) {
  const movedTrades: ZoneInstance['trades'] = [];
  let moved = 0;
  const walk = (list: ZoneInstance[]): ZoneInstance[] => list.map(zone => {
    const template = ZONE_TEMPLATES.find(t => t.id === zone.zone_template_id);
    const scoped = template && zone.zone_template_id.startsWith('bld.') && zone.zone_template_id !== 'bld.building';
    const allowed = scoped ? new Set(getTradesForZone(template).map(t => t.id)) : null;
    const trades = zone.trades.filter(trade => {
      if (allowed && trade.trade_template_id.startsWith('inf.') && !allowed.has(trade.trade_template_id)) {
        movedTrades.push(trade); moved++; return false;
      }
      return true;
    });
    return { ...zone, trades, ...(zone.children ? { children: walk(zone.children) } : {}) };
  });
  const zones = walk(input);
  if (moved) {
    const existing = zones.find(z => z.zone_template_id === 'bld.building');
    const target = existing ?? { id: `${input[0]?.id ?? 'blueprint'}-shared-building`, zone_template_id: 'bld.building', sort_order: 0, trades: [] };
    const signatures = new Set(target.trades.map(t => JSON.stringify([t.trade_template_id, t.status, t.attributes])));
    const trades = [...target.trades];
    for (const trade of movedTrades) {
      const signature = JSON.stringify([trade.trade_template_id, trade.status, trade.attributes]);
      if (!signatures.has(signature)) { trades.push(trade); signatures.add(signature); }
    }
    if (existing) zones[zones.indexOf(existing)] = { ...target, trades };
    else zones.unshift({ ...target, trades });
  }
  return { zones, moved, before: input.reduce((n, z) => n + z.trades.length, 0), after: zones.reduce((n, z) => n + z.trades.length, 0) };
}

/** Status is derived from properties.building_units, maintained by ERP contract writes. Never manual CAD status. */
export function resolveBlueprintUnit(zone: ZoneInstance, inventory: BuildingUnitItem[]) {
  const code = unitCode(zone.unit?.unit_code ?? zone.instance_label ?? '');
  const key = buildingFloorKey(zone);
  const floor = key === 'bld_ground' ? 0 : key === 'bld_basement' ? -1 : Number(key.match(/^Floor (\d+)$/)?.[1]);
  const matches = inventory.filter(u => u.floor === floor && (u.unit_id === zone.id || (code && unitCode(u.unit_number).toLowerCase() === code.toLowerCase())));
  const unit = matches.length === 1 ? matches[0] : undefined;
  const facts: Partial<BuildingUnitInstance> = { ...zone.unit, floor_number: Number.isFinite(floor) ? floor : undefined };
  if (unit) Object.assign(facts, { area_sqm: zone.unit?.area_sqm ?? unit.area_sqm, bedrooms: zone.unit?.bedrooms ?? unit.bedrooms, bathrooms: zone.unit?.bathrooms ?? unit.bathrooms });
  const rooms = zone.children?.flatMap(z => z.children?.length ? z.children : [z]) ?? [];
  if (rooms.length) {
    facts.bedrooms ??= rooms.filter(z => ['apt.master_bed', 'apt.std_bed'].includes(z.zone_template_id)).length;
    facts.bathrooms ??= rooms.filter(z => ['apt.master_bath', 'apt.main_bath', 'apt.guest_bath'].includes(z.zone_template_id)).length;
    const badge = getZoneBadge({ ...zone, trades: rooms.flatMap(z => z.trades) });
    if (badge === 'red_brick' || badge === 'semi_finished' || badge === 'fully_finished') facts.finishing_state ??= badge;
  }
  return { ...facts, status: unit?.status === 'contracted' ? 'sold' : unit?.status };
}

export function patchBlueprintZone(zones: ZoneInstance[], id: string, patch: Partial<ZoneInstance>, grid = 0.1): ZoneInstance[] {
  return zones.map(z => {
    if (z.id !== id) return z.children ? { ...z, children: patchBlueprintZone(z.children, id, patch, grid) } : z;
    if (!patch.spatial) return { ...z, ...patch };
    const spatial = { ...patch.spatial };
    const snap = (n: number) => Number((Math.round(n / grid) * grid).toFixed(4));
    for (const field of ['pos_x_m', 'pos_y_m', 'width_m', 'length_m'] as const) {
      const value = spatial[field];
      if (value !== undefined) spatial[field] = field.endsWith('_m') && (field === 'width_m' || field === 'length_m') ? Math.max(grid, snap(value)) : Math.max(0, snap(value));
    }
    spatial.sqm = Number((spatial.width_m * spatial.length_m).toFixed(2));
    return { ...z, ...patch, spatial };
  });
}

