// ─── Instance builder ────────────────────────────────────────────────────────
// Builds per-property zone/trade/attribute instances from templates + a
// Global Finishing State. This is what gets saved into the `spec_layers` column.
// ─────────────────────────────────────────────────────────────────────────────

import {
  PropertyTypeId,
  ZoneTemplate,
  TradeTemplate,
  AttributeTemplate,
  ZONE_TEMPLATES,
  TRADE_TEMPLATES,
  getZonesForType,
  getChildZones,
  getTradesForZone,
  getAttributesForTrade,
} from './templates';

export type GlobalFinishingState = 'red_brick' | 'semi_finished' | 'fully_finished';

export type ApartmentSubType = 'standard' | 'ground' | 'duplex' | 'standard_roof' | 'full_roof';
export type BuildingSubType = 'residential' | 'mixed';

export interface BuildZoneOptions {
  subtype?: ApartmentSubType | BuildingSubType;
  totalFloors?: number;
  unitsPerFloor?: number;
}

export interface AttributeValue {
  attribute_template_id: string;
  value: boolean | string | number | null;
  custom_label?: string;
}

export interface TradeInstance {
  id: string;
  trade_template_id: string;
  status: string;
  attributes: AttributeValue[];
}

export interface ZoneOpening {
  id: string;
  kind: 'door' | 'window';
  edge: 'n' | 'e' | 's' | 'w';
  offset_m: number;       // Distance from edge start (n/s: from left, e/w: from top)
  width_m: number;        // Opening width along the edge
  flip?: boolean;         // Optional door swing / window flip
}

export interface ZoneSpatialLayout {
  gridX: number;          // Column offset (0-11 in a 12-col grid)
  gridY: number;          // Row offset (0-11 in a 12-row grid)
  gridW: number;          // Width span (1-12)
  gridH: number;          // Height span (1-12)
  length_m: number;       // Real-world length in meters (e.g. 14.2)
  width_m: number;        // Real-world width in meters (e.g. 10.2)
  sqm?: number;           // Computed or manual SQM
  ceiling_height?: string; // e.g. "4.4m Double-Height"
  pos_x_m?: number;       // Composer position in meters from unit origin (left)
  pos_y_m?: number;       // Composer position in meters from unit origin (top)
  openings?: ZoneOpening[]; // Doors/windows attached to this room's edges
}

export interface ZoneVideo {
  id: string;
  url: string;
  title_en?: string;
  title_ar?: string;
  thumbnail?: string;
  duration?: string;
  category?: string;
}

export interface ZoneInstance {
  id: string;
  zone_template_id: string;
  instance_label?: string;   // "Bedroom 2" for repeatable zones
  level_label?: string;      // "Upper Level" for duplex/triplex
  sort_order: number;
  trades: TradeInstance[];
  children?: ZoneInstance[]; // for container zones (Villa floors)
  images?: string[];         // optional admin-uploaded photos for this zone (multiple)
  videos?: ZoneVideo[];      // optional demo/walkthrough videos for this room/spec
  spatial?: ZoneSpatialLayout; // Optional visual CAD layout & dimensions
}

export interface BuildingUnitInstance {
  id: string;
  unit_code: string;         // e.g. "Flat 2A"
  unit_type: 'apartment' | 'duplex' | 'commercial';
  floor_number: number;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  finishing_state: GlobalFinishingState;
  zones: ZoneInstance[];
}


// ─────────────────────────────────────────────────────────────────────────────
// Global Finishing State → Trade status mappings
// ─────────────────────────────────────────────────────────────────────────────
type TradeStatusMap = Record<string, string>; // trade_id_prefix → status

const GLOBAL_STATE_MAP: Record<GlobalFinishingState, TradeStatusMap> = {
  red_brick: {
    'wet.plumbing':          'NotStarted',
    'wet.electrical':        'NotStarted',
    'wet.walls':             'RedBrick',
    'wet.flooring':          'SandBed',
    'liv.electrical':        'NotStarted',
    'liv.walls':             'RedBrick',
    'liv.flooring':          'SandBed',
    'liv.carpentry':         'None',
    'liv.hvac':              'NotStarted',
    'trn.electrical':        'NotStarted',
    'trn.walls':             'RedBrick',
    'trn.flooring':          'SandBed',
    'inf.ramp_access':       'NotStarted',
    'inf.parking':           'NotStarted',
    'inf.drainage':          'NotStarted',
    'inf.lobby':             'NotStarted',
    'inf.security':          'NotStarted',
    'inf.elevator':          'NotStarted',
    'inf.common_finish':     'NotStarted',
    'inf.insulation':        'NotStarted',
    'inf.water_systems':     'NotStarted',
    'grg.ramp_construction': 'NotStarted',
    'grg.bay_finish':        'NotStarted',
  },
  semi_finished: {
    'wet.plumbing':          'RoughIn',
    'wet.electrical':        'ConduitsOnly',
    'wet.walls':             'Plastered',
    'wet.flooring':          'SandBed',
    'liv.electrical':        'ConduitsOnly',
    'liv.walls':             'Plastered',
    'liv.flooring':          'SandBed',
    'liv.carpentry':         'SubFrames',
    'liv.hvac':              'CopperPrep',
    'trn.electrical':        'NotStarted',
    'trn.walls':             'Plastered',
    'trn.flooring':          'SandBed',
    'inf.ramp_access':       'InProgress',
    'inf.parking':           'InProgress',
    'inf.drainage':          'Installed',
    'inf.lobby':             'InProgress',
    'inf.security':          'NotStarted',
    'inf.elevator':          'Shaft',
    'inf.common_finish':     'InProgress',
    'inf.insulation':        'Applied',
    'inf.water_systems':     'NotStarted',
    'grg.ramp_construction': 'InProgress',
    'grg.bay_finish':        'NotStarted',
  },
  fully_finished: {
    'wet.plumbing':          'Finished',
    'wet.electrical':        'Finished',
    'wet.walls':             'Finished',
    'wet.flooring':          'Finished',
    'liv.electrical':        'Finished',
    'liv.walls':             'FinalPaint',
    'liv.flooring':          'Finished',
    'liv.carpentry':         'Installed',
    'liv.hvac':              'Installed',
    'trn.electrical':        'Finished',
    'trn.walls':             'FinalPaint',
    'trn.flooring':          'Finished',
    'inf.ramp_access':       'Finished',
    'inf.parking':           'Finished',
    'inf.drainage':          'Installed',
    'inf.lobby':             'Finished',
    'inf.security':          'Installed',
    'inf.elevator':          'Installed',
    'inf.common_finish':     'Finished',
    'inf.insulation':        'Finished',
    'inf.water_systems':     'Installed',
    'grg.ramp_construction': 'Finished',
    'grg.bay_finish':        'Finished',
  },
};

export function getStatusForTrade(tradeId: string, globalState: GlobalFinishingState, fallbackStatuses: string[]): string {
  const map = GLOBAL_STATE_MAP[globalState];
  if (map[tradeId]) return map[tradeId];
  // Fallback: first status for red_brick, last for fully_finished, middle for semi
  if (globalState === 'red_brick') return fallbackStatuses[0];
  if (globalState === 'fully_finished') return fallbackStatuses[fallbackStatuses.length - 1];
  const midIdx = Math.floor(fallbackStatuses.length / 2);
  return fallbackStatuses[midIdx];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function buildTradeInstances(
  zone: ZoneTemplate,
  globalState: GlobalFinishingState
): TradeInstance[] {
  const trades = getTradesForZone(zone);
  return trades.map(trade => ({
    id: uid(),
    trade_template_id: trade.id,
    status: getStatusForTrade(trade.id, globalState, trade.status_values),
    attributes: [],
  }));
}

function buildZoneInstance(
  zone: ZoneTemplate,
  globalState: GlobalFinishingState,
  instanceLabel?: string,
  levelLabel?: string,
  sortOrder?: number
): ZoneInstance {
  const inst: ZoneInstance = {
    id: uid(),
    zone_template_id: zone.id,
    instance_label: instanceLabel,
    level_label: levelLabel,
    sort_order: sortOrder ?? zone.sort_order,
    trades: zone.is_container ? [] : buildTradeInstances(zone, globalState),
  };

  if (zone.is_container) {
    const children = getChildZones(zone.id);
    inst.children = buildChildInstances(children, globalState);
  }

  return inst;
}

function buildChildInstances(
  zones: ZoneTemplate[],
  globalState: GlobalFinishingState
): ZoneInstance[] {
  const result: ZoneInstance[] = [];
  for (const zone of zones) {
    if (zone.is_repeatable) {
      const count = zone.default_count ?? 1;
      for (let i = 0; i < count; i++) {
        result.push(buildZoneInstance(zone, globalState, i === 0 ? undefined : `${zone.label_en} ${i + 1}`, undefined, zone.sort_order + i * 0.01));
      }
    } else {
      // Optional zones (guest bath, open terrace) are excluded by default — admin adds them
      if (!zone.is_optional) {
        result.push(buildZoneInstance(zone, globalState));
      }
    }
  }
  return result;
}

function fromTemplateId(
  templateId: string,
  globalState: GlobalFinishingState,
  instanceLabel?: string,
  levelLabel?: string,
  sortOrder?: number
): ZoneInstance | null {
  const tpl = ZONE_TEMPLATES.find(z => z.id === templateId);
  if (!tpl) return null;
  return buildZoneInstance(tpl, globalState, instanceLabel, levelLabel, sortOrder);
}

function buildLevelContainer(
  levelLabel: string,
  instanceLabel: string,
  childTemplateIds: string[],
  globalState: GlobalFinishingState,
  sortOrder: number
): ZoneInstance {
  const children = childTemplateIds
    .map((tid, i) => fromTemplateId(tid, globalState, undefined, levelLabel, sortOrder + (i + 1) * 0.01))
    .filter((z): z is ZoneInstance => z !== null);
  return {
    id: uid(),
    zone_template_id: 'apt.level',
    instance_label: instanceLabel,
    level_label: levelLabel,
    sort_order: sortOrder,
    trades: [],
    children,
  };
}

function buildDuplexTree(globalState: GlobalFinishingState, bedroomCount: number): ZoneInstance[] {
  const lowerLabel = 'Lower Floor';
  const upperLabel = 'Upper Floor';

  const lower = buildLevelContainer(
    lowerLabel,
    lowerLabel,
    ['apt.reception', 'apt.kitchen', 'apt.guest_bath', 'apt.corridor', 'apt.balcony'],
    globalState,
    1,
  );

  const upperChildIds = ['apt.master_bed', 'apt.master_bath', 'apt.main_bath', 'apt.corridor'];
  const upper = buildLevelContainer(upperLabel, upperLabel, upperChildIds, globalState, 2);
  const stdBedTpl = ZONE_TEMPLATES.find(z => z.id === 'apt.std_bed');
  if (stdBedTpl && upper.children) {
    const extraBeds = Math.max(0, bedroomCount - 1);
    for (let i = 0; i < extraBeds; i++) {
      upper.children.push(
        buildZoneInstance(stdBedTpl, globalState, `${stdBedTpl.label_en} ${i + 2}`, upperLabel, 2 + (upperChildIds.length + i + 1) * 0.01),
      );
    }
  }

  return [lower, upper];
}

const UNIT_CHILD_TEMPLATES = ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.std_bed', 'apt.main_bath', 'apt.balcony'];
const UNIT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function buildBuildingStructureAndUnits(
  globalState: GlobalFinishingState,
  totalFloors = 4,
  unitsPerFloor = 2,
): ZoneInstance[] {
  const result: ZoneInstance[] = [];
  let sortIdx = 1;

  // ── 1. Ground Floor Realistic Egyptian Components ──
  const groundFloorComponents: Array<{ tid: string; label?: string }> = [
    { tid: 'bld.entrance_gate', label: 'Entrance Gate & Fence' },
    { tid: 'bld.entrance_lobby', label: 'Main Entrance & Marble Lobby' },
    { tid: 'bld.staircase', label: 'Building Staircase' },
    { tid: 'bld.elevator', label: 'Elevator & Shaft' },
    { tid: 'bld.electric_box', label: 'Electric Meters & Board Box' },
    { tid: 'bld.water_motors', label: 'Water Motors & Pumps Box' },
    { tid: 'bld.garage_bays', label: 'Ground Garage & Parking' },
    { tid: 'bld.guard_room', label: 'Guard Room / Booth' },
  ];

  for (const item of groundFloorComponents) {
    const inst = fromTemplateId(item.tid, globalState, item.label, 'bld_ground', sortIdx++);
    if (inst) result.push(inst);
  }

  // ── 2. Typical Residential Floors (Floor 1, Floor 2...) ──
  const typicalFloors = Math.min(14, Math.max(1, totalFloors - 1));
  const unitsCount = Math.min(UNIT_LETTERS.length, Math.max(1, unitsPerFloor));

  for (let f = 1; f <= typicalFloors; f++) {
    const levelLabel = `Floor ${f}`;

    // Common Core per Typical Floor
    const floorCoreComponents = [
      { tid: 'bld.central_corridor', label: `Floor ${f} Central Corridor` },
      { tid: 'bld.staircase', label: `Floor ${f} Stairwell` },
      { tid: 'bld.elevator', label: `Floor ${f} Elevator` },
      { tid: 'bld.lightwell', label: `Floor ${f} Lightwell & Duct` },
    ];

    for (const item of floorCoreComponents) {
      const inst = fromTemplateId(item.tid, globalState, item.label, levelLabel, sortIdx++);
      if (inst) result.push(inst);
    }

    // Residential Units per Floor
    for (let u = 0; u < unitsCount; u++) {
      const code = `${f}${UNIT_LETTERS[u]}`;
      const children = UNIT_CHILD_TEMPLATES
        .map((tid, i) => fromTemplateId(tid, globalState, undefined, levelLabel, i + 1))
        .filter((z): z is ZoneInstance => z !== null);

      result.push({
        id: uid(),
        zone_template_id: 'bld.unit',
        instance_label: `Flat ${code}`,
        level_label: levelLabel,
        sort_order: sortIdx++,
        trades: [],
        children,
      });
    }
  }

  // ── 3. Roof Sky Terrace & Service Components ──
  const roofComponents = [
    { tid: 'bld.staircase', label: 'Staircase Roof Access' },
    { tid: 'bld.roof_service', label: 'Elevator Machine & Water Tanks' },
    { tid: 'bld.roof_terrace', label: 'Panoramic Roof Sky Terrace' },
  ];

  for (const item of roofComponents) {
    const inst = fromTemplateId(item.tid, globalState, item.label, 'bld_roof', sortIdx++);
    if (inst) result.push(inst);
  }

  return result;
}

function buildStandardRoofTree(globalState: GlobalFinishingState, bedroomCount: number): ZoneInstance[] {
  // Standard Roof: Compact low-end apartment on the roof (Kitchen, Reception, Bathroom, and Rooms) - No penthouse terrace
  const result: ZoneInstance[] = [];
  let sortIdx = 1;

  const standardTpls = [
    { tid: 'apt.reception', label: 'Reception & Living' },
    { tid: 'apt.kitchen', label: 'Kitchen' },
    { tid: 'apt.main_bath', label: 'Bathroom' },
    { tid: 'apt.master_bed', label: 'Main Bedroom' },
  ];

  for (const item of standardTpls) {
    const inst = fromTemplateId(item.tid, globalState, item.label, undefined, sortIdx++);
    if (inst) result.push(inst);
  }

  const extraBeds = Math.max(0, bedroomCount - 1);
  for (let i = 0; i < extraBeds; i++) {
    const bed = fromTemplateId('apt.std_bed', globalState, `Bedroom ${i + 2}`, undefined, sortIdx++);
    if (bed) result.push(bed);
  }

  return result;
}

function buildFullRoofTree(globalState: GlobalFinishingState, bedroomCount: number): ZoneInstance[] {
  // Full Roof Package: 
  // Level 1 (Main Floor): Full Apartment (150m²) + Front Companion Apartment (150m²)
  // Level 2 (Upper Floor): Normal Full Roof Sky Terrace (Full Package)
  const lowerLabel = 'Main Floor (Unit A + Unit B 300 m²)';
  const upperLabel = 'Upper Private Roof Terrace';

  // Primary Residential Suite / Unit A (150m²)
  const primaryUnitIds = ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.master_bath', 'apt.main_bath', 'apt.corridor', 'apt.balcony'];
  const mainFloor = buildLevelContainer(
    lowerLabel,
    lowerLabel,
    primaryUnitIds,
    globalState,
    1,
  );

  // Add extra bedrooms to primary suite
  const stdBedTpl = ZONE_TEMPLATES.find(z => z.id === 'apt.std_bed');
  if (stdBedTpl && mainFloor.children) {
    const extraBeds = Math.max(0, bedroomCount - 1);
    for (let i = 0; i < extraBeds; i++) {
      mainFloor.children.push(
        buildZoneInstance(stdBedTpl, globalState, `Unit A Bedroom ${i + 2}`, lowerLabel, 1 + (primaryUnitIds.length + i + 1) * 0.01),
      );
    }
    // Front Companion Apartment Wing / Unit B (150m² across the landing)
    const frontWingComponents = [
      { tid: 'apt.reception', label: 'Unit B Grand Reception & Living (150m²)' },
      { tid: 'apt.kitchen', label: 'Unit B Kitchen' },
      { tid: 'apt.master_bed', label: 'Unit B Master Bedroom' },
      { tid: 'apt.main_bath', label: 'Unit B Bathroom' },
      { tid: 'apt.balcony', label: 'Unit B Balcony' },
    ];
    for (const item of frontWingComponents) {
      const inst = fromTemplateId(item.tid, globalState, item.label, lowerLabel, 1 + (primaryUnitIds.length + extraBeds + 2) * 0.01);
      if (inst) mainFloor.children.push(inst);
    }
  }

  // Upper Roof Floor: Plain Full Open Rooftop Slab
  const upperRoof = buildLevelContainer(upperLabel, upperLabel, [], globalState, 2);
  const roofSlab = fromTemplateId('apt.balcony', globalState, 'السطح المكشوف (Open Rooftop Slab)', upperLabel, 2.01);
  if (roofSlab) upperRoof.children = [roofSlab];

  return [mainFloor, upperRoof];
}

/**
 * Build the full zone instance tree for a property.
 * @param typeId       Property type
 * @param globalState  Global finishing state to pre-populate all trade statuses
 * @param bedroomCount How many Standard Bedroom instances to create (from form)
 * @param options      Subtype (duplex/ground/roof, residential/mixed) and
 *                     building templating (totalFloors × unitsPerFloor)
 */
export function buildZoneInstances(
  typeId: PropertyTypeId,
  globalState: GlobalFinishingState,
  bedroomCount = 2,
  options: BuildZoneOptions = {}
): ZoneInstance[] {
  if (typeId === 'apartment' && options.subtype === 'duplex') {
    return buildDuplexTree(globalState, bedroomCount);
  }

  if (typeId === 'apartment' && options.subtype === 'standard_roof') {
    return buildStandardRoofTree(globalState, bedroomCount);
  }

  if (typeId === 'apartment' && options.subtype === 'full_roof') {
    return buildFullRoofTree(globalState, bedroomCount);
  }

  if (typeId === 'building') {
    return buildBuildingStructureAndUnits(
      globalState,
      options.totalFloors ?? 4,
      options.unitsPerFloor ?? 2,
    );
  }

  const topLevelZones = getZonesForType(typeId).filter(z => !z.parent_zone_id);
  const result: ZoneInstance[] = [];

  for (const zone of topLevelZones) {
    if (zone.is_optional) continue; // Optional zones excluded by default — admin adds manually

    if (zone.is_repeatable) {
      // std_bed count driven by bedrooms field; balconies default to 1
      const count = zone.id.includes('std_bed') ? Math.max(0, bedroomCount - 1) : (zone.default_count ?? 1);
      for (let i = 0; i < count; i++) {
        const label = count > 1 ? `${zone.label_en} ${i + 1}` : zone.label_en;
        result.push(buildZoneInstance(zone, globalState, label, undefined, zone.sort_order + i * 0.01));
      }
    } else if (zone.is_container) {
      result.push(buildZoneInstance(zone, globalState));
    } else {
      result.push(buildZoneInstance(zone, globalState));
    }
  }

  if (typeId === 'apartment' && options.subtype === 'ground') {
    const garden = fromTemplateId('apt.balcony', globalState, 'Private Garden', undefined, 20);
    if (garden) result.push(garden);
  }

  return result;
}

/**
 * Re-apply a global finishing state to ONE zone subtree (per-unit override):
 * e.g. mark "Flat 3A" Fully Finished while the rest of the building stays
 * Semi-Finished. Attribute values and photos are preserved.
 */
export function applyGlobalStateToZone(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  globalState: GlobalFinishingState
): ZoneInstance[] {
  return zones.map(zoneInst => {
    if (zoneInst.id === zoneInstanceId) {
      return applyGlobalState([zoneInst], globalState)[0];
    }
    if (zoneInst.children && zoneInst.children.length > 0) {
      return { ...zoneInst, children: applyGlobalStateToZone(zoneInst.children, zoneInstanceId, globalState) };
    }
    return zoneInst;
  });
}

/**
 * Re-apply a new global finishing state to an existing set of zone instances
 * without touching any attribute values the admin has already filled in.
 */
export function applyGlobalState(
  zones: ZoneInstance[],
  globalState: GlobalFinishingState,
  allZones = ZONE_TEMPLATES
): ZoneInstance[] {
  return zones.map(zoneInst => {
    const zoneTpl = allZones.find(z => z.id === zoneInst.zone_template_id);
    
    // If zone has no trades yet but matches a template, build them!
    // Containers (levels, building units) never carry trades of their own.
    if ((!zoneInst.trades || zoneInst.trades.length === 0) && zoneTpl && !zoneTpl.is_container) {
      return {
        ...zoneInst,
        trades: buildTradeInstances(zoneTpl, globalState),
        children: zoneInst.children ? applyGlobalState(zoneInst.children, globalState, allZones) : undefined
      };
    }

    const availableTrades = zoneTpl ? getTradesForZone(zoneTpl) : TRADE_TEMPLATES;
    const updatedTrades = (zoneInst.trades || []).map(tradeInst => {
      const tradeTpl = availableTrades.find(t => t.id === tradeInst.trade_template_id) || TRADE_TEMPLATES.find(t => t.id === tradeInst.trade_template_id);
      if (!tradeTpl) return tradeInst;
      return {
        ...tradeInst,
        status: getStatusForTrade(tradeTpl.id, globalState, tradeTpl.status_values),
      };
    });
    const updatedChildren = zoneInst.children
      ? applyGlobalState(zoneInst.children, globalState, allZones)
      : undefined;
    return { ...zoneInst, trades: updatedTrades, children: updatedChildren };
  });
}

/**
 * Add an optional zone (guest bathroom, villa basement, open terrace, pool…)
 * to an existing zone instance list.
 */
export function addOptionalZone(
  zones: ZoneInstance[],
  zoneTemplateId: string,
  globalState: GlobalFinishingState,
  parentZoneInstanceId?: string
): ZoneInstance[] {
  const zoneTpl = ZONE_TEMPLATES.find(z => z.id === zoneTemplateId);
  if (!zoneTpl) return zones;

  const newInst = buildZoneInstance(zoneTpl, globalState);

  if (!parentZoneInstanceId) {
    // Top-level zone
    return [...zones, newInst].sort((a, b) => a.sort_order - b.sort_order);
  }

  // Child of a container zone
  return zones.map(z => {
    if (z.id === parentZoneInstanceId && z.children) {
      return {
        ...z,
        children: [...z.children, newInst].sort((a, b) => a.sort_order - b.sort_order),
      };
    }
    return z;
  });
}

/**
 * Update a single trade's status inside the zone instance tree.
 */
export function updateTradeStatus(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  tradeInstanceId: string,
  newStatus: string
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return {
        ...zone,
        trades: zone.trades.map(t =>
          t.id === tradeInstanceId ? { ...t, status: newStatus } : t
        ),
      };
    }
    if (zone.children) {
      return { ...zone, children: updateTradeStatus(zone.children, zoneInstanceId, tradeInstanceId, newStatus) };
    }
    return zone;
  });
}

/**
 * Update a single attribute value inside the zone instance tree.
 */
export function updateAttributeValue(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  tradeInstanceId: string,
  attributeTemplateId: string,
  newValue: boolean | string | number | null,
  customLabel?: string
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return {
        ...zone,
        trades: zone.trades.map(t => {
          if (t.id !== tradeInstanceId) return t;
          const exists = t.attributes.some(a => a.attribute_template_id === attributeTemplateId);
          const updatedAttrs = exists
            ? t.attributes.map(a =>
                a.attribute_template_id === attributeTemplateId ? { ...a, value: newValue, custom_label: customLabel ?? a.custom_label } : a
              )
            : [...t.attributes, { attribute_template_id: attributeTemplateId, value: newValue, custom_label: customLabel }];
          return { ...t, attributes: updatedAttrs };
        }),
      };
    }
    if (zone.children) {
      return { ...zone, children: updateAttributeValue(zone.children, zoneInstanceId, tradeInstanceId, attributeTemplateId, newValue, customLabel) };
    }
    return zone;
  });
}

/**
 * Remove an attribute from a trade (for optional or custom attributes).
 */
export function removeAttributeFromTrade(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  tradeInstanceId: string,
  attributeTemplateId: string
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return {
        ...zone,
        trades: zone.trades.map(t => {
          if (t.id !== tradeInstanceId) return t;
          return {
            ...t,
            attributes: t.attributes.filter(a => a.attribute_template_id !== attributeTemplateId),
          };
        }),
      };
    }
    if (zone.children) {
      return { ...zone, children: removeAttributeFromTrade(zone.children, zoneInstanceId, tradeInstanceId, attributeTemplateId) };
    }
    return zone;
  });
}

/**
 * Add an image URL to a zone's images array.
 */
export function addZoneImage(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  imageUrl: string
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return { ...zone, images: [...(zone.images ?? []), imageUrl] };
    }
    if (zone.children) {
      return { ...zone, children: addZoneImage(zone.children, zoneInstanceId, imageUrl) };
    }
    return zone;
  });
}

/**
 * Remove an image URL from a zone's images array by index.
 */
export function removeZoneImage(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  imageIndex: number
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      const updated = (zone.images ?? []).filter((_, i) => i !== imageIndex);
      return { ...zone, images: updated.length > 0 ? updated : undefined };
    }
    if (zone.children) {
      return { ...zone, children: removeZoneImage(zone.children, zoneInstanceId, imageIndex) };
    }
    return zone;
  });
}

/**
 * Add a video to a zone's videos array.
 */
export function addZoneVideo(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  video: ZoneVideo
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return { ...zone, videos: [...(zone.videos ?? []), video] };
    }
    if (zone.children) {
      return { ...zone, children: addZoneVideo(zone.children, zoneInstanceId, video) };
    }
    return zone;
  });
}

/**
 * Remove a video from a zone's videos array by id or index.
 */
export function removeZoneVideo(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  videoIdOrIndex: string | number
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      const updated = (zone.videos ?? []).filter((v, i) =>
        typeof videoIdOrIndex === 'number' ? i !== videoIdOrIndex : v.id !== videoIdOrIndex
      );
      return { ...zone, videos: updated.length > 0 ? updated : undefined };
    }
    if (zone.children) {
      return { ...zone, children: removeZoneVideo(zone.children, zoneInstanceId, videoIdOrIndex) };
    }
    return zone;
  });
}



/**
 * Remove a zone instance by ID (top-level or from children of any container).
 */
export function removeZone(
  zones: ZoneInstance[],
  zoneInstanceId: string
): ZoneInstance[] {
  const filtered = zones.filter(z => z.id !== zoneInstanceId);
  return filtered.map(zone => {
    if (zone.children) {
      return { ...zone, children: removeZone(zone.children, zoneInstanceId) };
    }
    return zone;
  });
}

export function removeZones(
  zones: ZoneInstance[],
  zoneInstanceIds: string[]
): ZoneInstance[] {
  const idSet = new Set(zoneInstanceIds);
  const filtered = zones.filter(z => !idSet.has(z.id));
  return filtered.map(zone => {
    if (zone.children) {
      return { ...zone, children: removeZones(zone.children, zoneInstanceIds) };
    }
    return zone;
  });
}


/**
 * Add a fully custom zone (no template) with just a label at the top level.
 * Uses a synthetic zone_template_id = 'custom.<uid>' so it won't clash with real templates.
 */
export function addCustomZone(
  zones: ZoneInstance[],
  labelEn: string,
  globalState: GlobalFinishingState
): ZoneInstance[] {
  const customId = `custom.${uid()}`;
  const lower = labelEn.toLowerCase();
  const isWet = lower.includes('bath') || lower.includes('toilet') || lower.includes('kitchen') || lower.includes('laundry') || lower.includes('pantry') || lower.includes('حمام') || lower.includes('مطبخ') || lower.includes('غسيل');

  let trades: TradeInstance[] = [];

  if (isWet) {
    trades = [
      {
        id: uid(),
        trade_template_id: 'wet.plumbing',
        status: globalState === 'red_brick' ? 'NotStarted' : globalState === 'fully_finished' ? 'Finished' : 'RoughIn',
        attributes: [],
      },
      {
        id: uid(),
        trade_template_id: 'wet.electrical',
        status: globalState === 'red_brick' ? 'NotStarted' : globalState === 'fully_finished' ? 'Finished' : 'ConduitsOnly',
        attributes: [],
      },
      {
        id: uid(),
        trade_template_id: 'wet.walls',
        status: globalState === 'red_brick' ? 'RedBrick' : globalState === 'fully_finished' ? 'Finished' : 'Plastered',
        attributes: [],
      },
      {
        id: uid(),
        trade_template_id: 'wet.flooring',
        status: globalState === 'red_brick' ? 'SandBed' : globalState === 'fully_finished' ? 'Finished' : 'SandBed',
        attributes: [],
      },
    ];
  } else {
    trades = [
      {
        id: uid(),
        trade_template_id: 'liv.electrical',
        status: globalState === 'red_brick' ? 'NotStarted' : globalState === 'fully_finished' ? 'Finished' : 'ConduitsOnly',
        attributes: [],
      },
      {
        id: uid(),
        trade_template_id: 'liv.walls',
        status: globalState === 'red_brick' ? 'RedBrick' : globalState === 'fully_finished' ? 'Finished' : 'Plastered',
        attributes: [],
      },
      {
        id: uid(),
        trade_template_id: 'liv.flooring',
        status: globalState === 'red_brick' ? 'SandBed' : globalState === 'fully_finished' ? 'Finished' : 'SandBed',
        attributes: [],
      },
    ];
  }

  const customInst: ZoneInstance = {
    id: uid(),
    zone_template_id: customId,
    instance_label: labelEn,
    sort_order: 9999 + zones.length,
    trades,
  };
  return [...zones, customInst];
}

/**
 * Add a trade template to a specific zone instance.
 * Skips if the trade is already present.
 */
export function addTradeToZone(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  tradeTemplateId: string,
  globalState: GlobalFinishingState
): ZoneInstance[] {
  const tradeTpl = TRADE_TEMPLATES.find(t => t.id === tradeTemplateId);
  if (!tradeTpl) return zones;

  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      // Avoid duplicates
      if (zone.trades.some(t => t.trade_template_id === tradeTemplateId)) return zone;
      const newTrade: TradeInstance = {
        id: uid(),
        trade_template_id: tradeTemplateId,
        status: globalState === 'red_brick'
          ? tradeTpl.status_values[0]
          : globalState === 'fully_finished'
            ? tradeTpl.status_values[tradeTpl.status_values.length - 1]
            : tradeTpl.status_values[Math.floor(tradeTpl.status_values.length / 2)],
        attributes: [],
      };
      return { ...zone, trades: [...zone.trades, newTrade] };
    }
    if (zone.children) {
      return { ...zone, children: addTradeToZone(zone.children, zoneInstanceId, tradeTemplateId, globalState) };
    }
    return zone;
  });
}

/**
 * Remove a trade instance from a zone by trade instance ID.
 */
export function removeTradeFromZone(
  zones: ZoneInstance[],
  zoneInstanceId: string,
  tradeInstanceId: string
): ZoneInstance[] {
  return zones.map(zone => {
    if (zone.id === zoneInstanceId) {
      return { ...zone, trades: zone.trades.filter(t => t.id !== tradeInstanceId) };
    }
    if (zone.children) {
      return { ...zone, children: removeTradeFromZone(zone.children, zoneInstanceId, tradeInstanceId) };
    }
    return zone;
  });
}


export type FinishBadge = 'fully_finished' | 'semi_finished' | 'red_brick' | 'mixed' | 'unknown';




/**
 * Compute a per-zone finish badge by comparing every trade's status against
 * the first and last values of its status_values enum.
 *
 * Rules (per spec §7.2):
 *  - All at last status  → 'fully_finished'
 *  - All at first status → 'red_brick'
 *  - All at middle/same  → 'semi_finished'
 *  - Mixed               → 'mixed'
 *  - No trades           → 'unknown'
 */
export function getZoneBadge(zone: ZoneInstance): FinishBadge {
  const allTrades = zone.trades ?? [];
  if (allTrades.length === 0) return 'unknown';

  const positions = allTrades.map(t => {
    const tmpl = TRADE_TEMPLATES.find(tt => tt.id === t.trade_template_id);
    if (!tmpl) return 'unknown';
    const last = tmpl.status_values.length - 1;
    if (t.status === tmpl.status_values[last]) return 'done';
    if (t.status === tmpl.status_values[0]) return 'first';
    return 'middle';
  });

  if (positions.every(p => p === 'done')) return 'fully_finished';
  if (positions.every(p => p === 'first')) return 'red_brick';
  if (positions.some(p => p === 'unknown')) return 'unknown';
  // Check if all non-unknown are at the same position
  const knownPos = positions.filter(p => p !== 'unknown');
  if (knownPos.length > 0 && knownPos.every(p => p === knownPos[0]) && knownPos[0] === 'middle') return 'semi_finished';
  return 'mixed';
}

/** Look up the bilingual labels for a zone template ID */
export function getZoneTemplateLabels(zoneTemplateId: string): { en: string; ar: string } | null {
  const tmpl = ZONE_TEMPLATES.find(z => z.id === zoneTemplateId);
  if (!tmpl) return null;
  return { en: tmpl.label_en, ar: tmpl.label_ar };
}

/** Look up the bilingual labels for a trade template ID */
export function getTradeTemplateLabels(tradeTemplateId: string): { en: string; ar: string; status_values: string[] } | null {
  const tmpl = TRADE_TEMPLATES.find(t => t.id === tradeTemplateId);
  if (!tmpl) return null;
  return { en: tmpl.label_en, ar: tmpl.label_ar, status_values: tmpl.status_values };
}

/** Get the parent container zone (floor) template id for a given zone template id (villa only) */
export function getParentZoneId(zoneTemplateId: string): string | undefined {
  const tmpl = ZONE_TEMPLATES.find(z => z.id === zoneTemplateId);
  return tmpl?.parent_zone_id;
}

/** Group a flat list of ZoneInstances by their parent container (Villa floors) */
export interface FloorGroup {
  containerId: string;
  label_en: string;
  label_ar: string;
  zones: ZoneInstance[];
}

export function groupByFloor(zones: ZoneInstance[]): FloorGroup[] | null {
  // Detect villa floor containers — zones with is_container = true
  const containerZones = zones.filter(z => {
    const tmpl = ZONE_TEMPLATES.find(t => t.id === z.zone_template_id);
    return tmpl?.is_container;
  });

  if (containerZones.length === 0) return null; // Not a villa, no grouping needed

  // Return container zones with their children already embedded
  return containerZones.map(container => {
    const tmpl = ZONE_TEMPLATES.find(t => t.id === container.zone_template_id)!;
    return {
      containerId: container.id,
      label_en: tmpl.label_en,
      label_ar: tmpl.label_ar,
      zones: container.children ?? [],
    };
  });
}
