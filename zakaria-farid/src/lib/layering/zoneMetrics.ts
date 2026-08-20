// ─── Shared fallback zone metrics ────────────────────────────────────────────
// Single source of truth for room dimensions when a zone has no admin-entered
// `spatial` block. Used by BOTH the admin CAD builder (edit form preview) and
// the public ArchitecturalBlueprintInspector, so the two always show the same
// numbers for the same property.

export interface FallbackZoneMetric {
  length_m: number;
  width_m: number;
  sqm: number;
  ceiling: string;
}

export const FALLBACK_ZONE_METRICS: Record<string, FallbackZoneMetric> = {
  'apt.reception':   { length_m: 11.0, width_m: 8.6, sqm: 95, ceiling: '3.6m Flush' },
  'apt.master_bed':  { length_m: 7.2,  width_m: 6.2, sqm: 45, ceiling: '3.4m Cove' },
  'apt.master_bath': { length_m: 4.0,  width_m: 3.0, sqm: 12, ceiling: '3.2m Flush' },
  'apt.std_bed':     { length_m: 5.5,  width_m: 4.0, sqm: 22, ceiling: '3.4m Flush' },
  'apt.main_bath':   { length_m: 4.5,  width_m: 3.5, sqm: 16, ceiling: '3.2m Flush' },
  'apt.kitchen':     { length_m: 5.5,  width_m: 5.0, sqm: 28, ceiling: '3.2m Flush' },
  'apt.balcony':     { length_m: 8.0,  width_m: 3.0, sqm: 24, ceiling: 'Open Sky' },
  'apt.corridor':    { length_m: 6.0,  width_m: 2.0, sqm: 12, ceiling: '3.2m Flush' },
  'apt.guest_bath':  { length_m: 3.0,  width_m: 2.0, sqm: 6,  ceiling: '3.0m Flush' },
  'apt.laundry':     { length_m: 3.0,  width_m: 3.0, sqm: 9,  ceiling: '3.0m Flush' },
  'apt.dressing':    { length_m: 4.0,  width_m: 3.0, sqm: 12, ceiling: '3.2m Flush' },

  'bld.basement':       { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '2.8m Low' },
  'bld.ground_lobby':   { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '3.2m Flush' },
  'bld.typical_floors': { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '3.0m Flush' },
  'bld.roof':           { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: 'Open Roof' },

  'grg.ramp':           { length_m: 6.0, width_m: 3.5, sqm: 21, ceiling: '2.8m Low' },
  'grg.bay':            { length_m: 5.5, width_m: 2.5, sqm: 14, ceiling: '2.8m Low' },
  'grg.elec':           { length_m: 2.0, width_m: 1.5, sqm: 3,  ceiling: '2.8m Low' },
  'grg.security_booth': { length_m: 2.5, width_m: 2.0, sqm: 5,  ceiling: '2.8m Low' },
  'grg.storage':        { length_m: 4.0, width_m: 3.0, sqm: 12, ceiling: '2.8m Low' },
};

export const GENERIC_ZONE_METRIC: FallbackZoneMetric = {
  length_m: 8.0,
  width_m: 6.5,
  sqm: 52,
  ceiling: '3.6m Architectural Flush',
};

export function fallbackMetricFor(templateId: string): FallbackZoneMetric | null {
  return FALLBACK_ZONE_METRICS[templateId] ?? null;
}
