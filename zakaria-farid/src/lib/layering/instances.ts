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

export interface AttributeValue {
  attribute_template_id: string;
  value: boolean | string | number | null;
}

export interface TradeInstance {
  id: string;
  trade_template_id: string;
  status: string;
  attributes: AttributeValue[];
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
  spatial?: ZoneSpatialLayout; // Optional visual CAD layout & dimensions
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
    'liv.hvac':              'NotStarted',
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

function getStatusForTrade(tradeId: string, globalState: GlobalFinishingState, fallbackStatuses: string[]): string {
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
    attributes: getAttributesForTrade(trade.id, zone.id).map(attr => ({
      attribute_template_id: attr.id,
      value: null,
    })),
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

/**
 * Build the full zone instance tree for a property.
 * @param typeId       Property type
 * @param globalState  Global finishing state to pre-populate all trade statuses
 * @param bedroomCount How many Standard Bedroom instances to create (from form)
 */
export function buildZoneInstances(
  typeId: PropertyTypeId,
  globalState: GlobalFinishingState,
  bedroomCount = 2
): ZoneInstance[] {
  const topLevelZones = getZonesForType(typeId).filter(z => !z.parent_zone_id);
  const result: ZoneInstance[] = [];

  for (const zone of topLevelZones) {
    if (zone.is_optional) continue; // Optional zones excluded by default — admin adds manually

    if (zone.is_repeatable) {
      // std_bed count driven by bedrooms field; balconies default to 1
      const count = zone.id.includes('std_bed') ? Math.max(0, bedroomCount - 1) : (zone.default_count ?? 1);
      for (let i = 0; i < count; i++) {
        const label = count > 1 ? `${zone.label_ar} ${i + 1}` : zone.label_ar;
        result.push(buildZoneInstance(zone, globalState, label, undefined, zone.sort_order + i * 0.01));
      }
    } else if (zone.is_container) {
      result.push(buildZoneInstance(zone, globalState));
    } else {
      result.push(buildZoneInstance(zone, globalState));
    }
  }

  return result;
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
    if ((!zoneInst.trades || zoneInst.trades.length === 0) && zoneTpl) {
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
  newValue: boolean | string | number | null
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
                a.attribute_template_id === attributeTemplateId ? { ...a, value: newValue } : a
              )
            : [...t.attributes, { attribute_template_id: attributeTemplateId, value: newValue }];
          return { ...t, attributes: updatedAttrs };
        }),
      };
    }
    if (zone.children) {
      return { ...zone, children: updateAttributeValue(zone.children, zoneInstanceId, tradeInstanceId, attributeTemplateId, newValue) };
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
