import type { BuildingUnitItem } from '../supabase/types';
import type { TradeInstance, ZoneInstance } from './instances';
import { addCustomZone } from './instances';
import { buildingFloorKey, resolveBlueprintUnit } from './buildingBlueprint';
import { unitCode } from './labels';
import { getAttributesForTrade, getTradesForZone, ZONE_TEMPLATES, type ZoneTemplate } from './templates';

/**
 * Pure edits for the building tile editor (admin). Buildings are layered as
 * floors → units (bld.unit containers holding apt.* rooms) + shared spaces on each floor,
 * plus one optional whole-building zone (bld.building). Floors exist only through the zones on them.
 */

// Old floor-group templates; floors are now keys, so these are never offered as tiles.
const FLOOR_GROUP_TEMPLATES = new Set(['bld.building', 'bld.basement', 'bld.ground_lobby', 'bld.typical_floors', 'bld.roof', 'bld.unit']);

export const SHARED_SPACE_TEMPLATES: ZoneTemplate[] = ZONE_TEMPLATES
  .filter(t => t.property_type_id === 'building' && !FLOOR_GROUP_TEMPLATES.has(t.id))
  .sort((a, b) => a.sort_order - b.sort_order);

export const ROOM_TEMPLATES: ZoneTemplate[] = ZONE_TEMPLATES
  .filter(t => t.property_type_id === 'apartment' && !t.is_container)
  .sort((a, b) => a.sort_order - b.sort_order);

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function floorOrder(key: string): number {
  if (key === 'bld_basement') return -1;
  if (key === 'bld_ground') return 0;
  if (key === 'bld_roof') return Number.MAX_SAFE_INTEGER;
  return Number(key.match(/^Floor (\d+)$/)?.[1] ?? Number.MAX_SAFE_INTEGER - 1);
}

/** Floor keys present in the zones plus any pending (still empty) floors, bottom to top. */
export function listFloorKeys(zones: ZoneInstance[], pending: string[] = []): string[] {
  const keys = new Set(pending);
  for (const z of zones) if (z.zone_template_id !== 'bld.building') keys.add(buildingFloorKey(z));
  return [...keys].sort((a, b) => floorOrder(a) - floorOrder(b));
}

/** The next floor the admin can add: next numbered floor, or a missing ground/basement/roof. */
export function nextFloorKey(existing: string[], kind: 'upper' | 'ground' | 'basement' | 'roof'): string | null {
  if (kind !== 'upper') {
    const key = `bld_${kind}`;
    return existing.includes(key) ? null : key;
  }
  const top = existing.map(k => Number(k.match(/^Floor (\d+)$/)?.[1] ?? 0)).reduce((a, b) => Math.max(a, b), 0);
  return `Floor ${top + 1}`;
}

/** Placement fields for a floor key, with stale placement removed. */
function placeOnFloor<T extends ZoneInstance>(zone: T, key: string): T {
  const { floor_number: _f, level_label: _l, ...rest } = zone;
  void _f; void _l;
  if (key === 'bld_roof') return { ...rest, level_label: 'bld_roof' } as T;
  const n = key === 'bld_ground' ? 0 : key === 'bld_basement' ? -1 : Number(key.match(/^Floor (\d+)$/)?.[1]);
  return (Number.isFinite(n) ? { ...rest, floor_number: n } : { ...rest, level_label: key }) as T;
}

function tradesFor(templateId: string, keep: TradeInstance[] = []): TradeInstance[] {
  const template = ZONE_TEMPLATES.find(t => t.id === templateId);
  if (!template) return keep;
  return getTradesForZone(template).map(t => keep.find(k => k.trade_template_id === t.id) ?? {
    id: uid('trade'),
    trade_template_id: t.id,
    status: t.status_values[0] ?? 'NotStarted',
    attributes: getAttributesForTrade(t.id, template.id).map(a => ({ attribute_template_id: a.id, value: null })),
  });
}

/** A new tile from a template, or a custom tile when only a name is given. */
export function createZone(input: { templateId?: string; label?: string; floorKey?: string; sortOrder: number }): ZoneInstance {
  const label = input.label?.trim();
  const base: ZoneInstance = input.templateId
    ? { id: uid('zone'), zone_template_id: input.templateId, sort_order: input.sortOrder, trades: tradesFor(input.templateId), ...(label ? { instance_label: label } : {}) }
    : { ...addCustomZone([], label || 'Custom', 'red_brick')[0], id: uid('zone'), sort_order: input.sortOrder };
  return input.floorKey ? placeOnFloor(base, input.floorKey) : base;
}

export function createUnit(floorKey: string, code: string, sortOrder: number): ZoneInstance {
  return placeOnFloor({ id: uid('zone'), zone_template_id: 'bld.unit', instance_label: code, unit: { unit_code: code }, sort_order: sortOrder, trades: [], children: [] }, floorKey);
}

/** Next unit code on a floor: floor number + next letter (1A, 1B…; ground uses G). */
export function nextUnitCode(zones: ZoneInstance[], floorKey: string): string {
  const prefix = floorKey === 'bld_ground' ? 'G' : floorKey === 'bld_basement' ? 'B' : floorKey === 'bld_roof' ? 'R' : floorKey.match(/^Floor (\d+)$/)?.[1] ?? '';
  const used = new Set(zones.filter(z => z.zone_template_id === 'bld.unit').map(z => unitCode(z.unit?.unit_code ?? z.instance_label ?? '').toUpperCase()));
  for (let i = 0; i < 26; i++) {
    const code = `${prefix}${String.fromCharCode(65 + i)}`;
    if (!used.has(code.toUpperCase())) return code;
  }
  return `${prefix}${used.size + 1}`;
}

function mapTree(zones: ZoneInstance[], fn: (z: ZoneInstance) => ZoneInstance | null): ZoneInstance[] {
  return zones.flatMap(z => {
    const next = fn(z);
    if (!next) return [];
    return [next.children ? { ...next, children: mapTree(next.children, fn) } : next];
  });
}

export function findZone(zones: ZoneInstance[], id: string): ZoneInstance | undefined {
  for (const z of zones) {
    if (z.id === id) return z;
    const hit = z.children && findZone(z.children, id);
    if (hit) return hit;
  }
  return undefined;
}

export function renameZone(zones: ZoneInstance[], id: string, label: string): ZoneInstance[] {
  const value = label.trim();
  if (!value) return zones;
  return mapTree(zones, z => z.id !== id ? z
    : z.zone_template_id === 'bld.unit' ? { ...z, instance_label: value, unit: { ...z.unit, unit_code: value } }
    : { ...z, instance_label: value });
}

/** Change a tile's type. Trades the new type shares with the old one keep their recorded state. */
export function changeZoneType(zones: ZoneInstance[], id: string, templateId: string): ZoneInstance[] {
  return mapTree(zones, z => z.id !== id ? z : { ...z, zone_template_id: templateId, trades: tradesFor(templateId, z.trades) });
}

export function removeZoneById(zones: ZoneInstance[], id: string): ZoneInstance[] {
  return mapTree(zones, z => z.id === id ? null : z);
}

function cloneZone(zone: ZoneInstance): ZoneInstance {
  return {
    ...zone,
    id: uid('zone'),
    trades: zone.trades.map(t => ({ ...t, id: uid('trade'), attributes: t.attributes.map(a => ({ ...a })) })),
    ...(zone.images ? { images: [...zone.images] } : {}),
    ...(zone.spatial ? { spatial: { ...zone.spatial, openings: zone.spatial.openings?.map(o => ({ ...o, id: uid('open') })) } } : {}),
    ...(zone.children ? { children: zone.children.map(cloneZone) } : {}),
  };
}

/** Insert a zone at top level, or inside a parent (unit rooms). */
export function insertZone(zones: ZoneInstance[], zone: ZoneInstance, parentId?: string): ZoneInstance[] {
  if (!parentId) return [...zones, zone];
  return mapTree(zones, z => z.id === parentId ? { ...z, children: [...(z.children ?? []), zone] } : z);
}

/** Duplicate a tile next to itself. Units get the next free code on their floor. */
export function duplicateZone(zones: ZoneInstance[], id: string): ZoneInstance[] {
  const walk = (list: ZoneInstance[]): ZoneInstance[] => list.flatMap(z => {
    if (z.id !== id) return [z.children ? { ...z, children: walk(z.children) } : z];
    const copy = cloneZone(z);
    if (copy.zone_template_id === 'bld.unit') {
      const code = nextUnitCode(zones, buildingFloorKey(z));
      copy.instance_label = code;
      copy.unit = { ...copy.unit, unit_code: code };
    }
    return [z, { ...copy, sort_order: z.sort_order + 0.5 }];
  });
  return walk(zones);
}

/** Persist a new order for one group of sibling tiles (sort_order = position). */
export function reorderZones(zones: ZoneInstance[], orderedIds: string[]): ZoneInstance[] {
  const position = new Map(orderedIds.map((id, i) => [id, i + 1]));
  return mapTree(zones, z => position.has(z.id) ? { ...z, sort_order: position.get(z.id)! } : z);
}

export function moveInList(ids: string[], id: string, delta: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Move an item to the index of a target item in the list. */
export function moveIdToTarget(ids: string[], id: string, targetId: string): string[] {
  if (id === targetId) return ids;
  const fromIndex = ids.indexOf(id);
  const toIndex = ids.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1) return ids;
  const next = [...ids];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
/** Copy every zone of one floor to a new floor. Unit codes follow the target floor. */
export function duplicateFloor(zones: ZoneInstance[], fromKey: string, toKey: string): ZoneInstance[] {
  const source = zones.filter(z => z.zone_template_id !== 'bld.building' && buildingFloorKey(z) === fromKey);
  let next = zones;
  for (const z of source) {
    const copy = placeOnFloor(cloneZone(z), toKey);
    if (copy.zone_template_id === 'bld.unit') {
      const code = nextUnitCode(next, toKey);
      copy.instance_label = code;
      copy.unit = { ...copy.unit, unit_code: code };
    }
    next = [...next, copy];
  }
  return next;
}

/** Units with a live reservation or sale cannot be deleted from the plan. */
export function isUnitLocked(zone: ZoneInstance, inventory: BuildingUnitItem[]): boolean {
  if (zone.zone_template_id !== 'bld.unit') return false;
  const status = resolveBlueprintUnit(zone, inventory).status;
  return status !== undefined && status !== 'available';
}

export function lockedUnitsOnFloor(zones: ZoneInstance[], key: string, inventory: BuildingUnitItem[]): ZoneInstance[] {
  return zones.filter(z => z.zone_template_id === 'bld.unit' && buildingFloorKey(z) === key && isUnitLocked(z, inventory));
}

export function deleteFloor(zones: ZoneInstance[], key: string): ZoneInstance[] {
  return zones.filter(z => z.zone_template_id === 'bld.building' || buildingFloorKey(z) !== key);
}

/** Tiles of one group in display order. */
export function sortTiles(list: ZoneInstance[]): ZoneInstance[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order);
}

const FRONT_ROOMS = new Set(['apt.balcony', 'bld.balcony']);
const PRIVATE_ROOMS = new Set(['apt.master_bed', 'apt.std_bed', 'apt.master_bath', 'apt.main_bath', 'apt.dressing']);
const ROOM_DEFAULT_SQM: Record<string, number> = {
  'apt.reception': 28, 'apt.master_bed': 16, 'apt.std_bed': 12, 'apt.master_bath': 5, 'apt.main_bath': 4.5,
  'apt.kitchen': 9, 'apt.balcony': 6, 'apt.corridor': 6, 'apt.guest_bath': 2.5, 'apt.laundry': 5, 'apt.dressing': 6,
};

/** Recorded area, else length × width, else a typical size for the room type. Drives tile size only. */
export function roomWeight(zone: ZoneInstance): number {
  const s = zone.spatial;
  const sqm = s?.sqm || (s && s.length_m > 0 && s.width_m > 0 ? s.length_m * s.width_m : 0);
  return Math.max(2, sqm || ROOM_DEFAULT_SQM[zone.zone_template_id] || 10);
}

/** Apartment-like order: balconies along the front, living spaces by the entrance, bedrooms and baths on the private side. */
export function arrangeUnitRooms(rooms: ZoneInstance[]): { front: ZoneInstance[]; social: ZoneInstance[]; private: ZoneInstance[] } {
  const ordered = sortTiles(rooms);
  const front = ordered.filter(z => FRONT_ROOMS.has(z.zone_template_id));
  const privateSide = ordered.filter(z => PRIVATE_ROOMS.has(z.zone_template_id));
  const social = ordered.filter(z => !FRONT_ROOMS.has(z.zone_template_id) && !PRIVATE_ROOMS.has(z.zone_template_id));
  // A unit with only one kind of room still fills both columns.
  if (!social.length && privateSide.length > 1) return { front, social: privateSide.slice(0, Math.ceil(privateSide.length / 2)), private: privateSide.slice(Math.ceil(privateSide.length / 2)) };
  if (!privateSide.length && social.length > 1) return { front, social: social.slice(0, Math.ceil(social.length / 2)), private: social.slice(Math.ceil(social.length / 2)) };
  return { front, social, private: privateSide };
}

const GATE_TEMPLATES = new Set(['bld.entrance_gate']);
const FRONT_GROUND_TEMPLATES = new Set(['bld.entrance_lobby', 'bld.ground_lobby']);
const CORE_GROUND_TEMPLATES = new Set(['bld.staircase', 'bld.elevator']);
const LARGE_GROUND_TEMPLATES = new Set(['bld.garage_bays', 'bld.basement']);

export interface GroundFloorArrangement {
  gate: ZoneInstance[];
  front: ZoneInstance[];
  core: ZoneInstance[];
  large: ZoneInstance[];
  services: ZoneInstance[];
}

/** Ground floor (or no-unit floor) layout partition: gate & wall, front lobby strip, core, large/garage block, and services/other. */
export function arrangeGroundFloor(zones: ZoneInstance[]): GroundFloorArrangement {
  const ordered = sortTiles(zones);
  const gate: ZoneInstance[] = [];
  const front: ZoneInstance[] = [];
  const core: ZoneInstance[] = [];
  const large: ZoneInstance[] = [];
  const services: ZoneInstance[] = [];

  for (const z of ordered) {
    const id = z.zone_template_id;
    if (GATE_TEMPLATES.has(id)) {
      gate.push(z);
    } else if (FRONT_GROUND_TEMPLATES.has(id)) {
      front.push(z);
    } else if (CORE_GROUND_TEMPLATES.has(id)) {
      core.push(z);
    } else if (LARGE_GROUND_TEMPLATES.has(id)) {
      large.push(z);
    } else {
      services.push(z);
    }
  }

  return { gate, front, core, large, services };
}
