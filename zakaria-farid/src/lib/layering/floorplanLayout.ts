// ─── Shared metric floor-plan layout engine ──────────────────────────────────
// Converts real room dimensions (meters) into non-overlapping SVG rectangles
// inside the shared 680×440 viewBox. Deterministic: the same ordered room list
// always produces the same layout, so the admin builder preview and the public
// ArchitecturalBlueprintInspector stay visually identical.
//
// Algorithm: shelf (strip) packing at a uniform px-per-meter scale found by
// binary search — every room shares ONE scale, so relative sizes are true:
// a 4 m² bathroom renders small, a 27 m² living room renders large.

export interface MetricRoomInput {
  id: string;
  /** Horizontal extent in meters (drawn landscape — longer side horizontal). */
  widthM: number;
  /** Vertical extent in meters. */
  lengthM: number;
  /** Explicit composer position in meters from the unit origin. When set the
   *  room is placed at this coordinate (no packing, no orientation swap). */
  xM?: number;
  yM?: number;
  label?: string;
}

export interface MetricRoomRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MetricLayoutResult {
  rooms: MetricRoomRect[];
  /** Outer bounding box of all rooms (perimeter wall). */
  bounds: { x: number; y: number; w: number; h: number };
  pxPerMeter: number;
}

const MIN_M = 0.5;
const MAX_M = 60;
/** Gap between room rects in px — reads as a partition wall. */
const ROOM_GAP = 5;

function clampM(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 3;
  return Math.min(MAX_M, Math.max(MIN_M, v));
}

interface PackedRoom {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Try packing rooms (meter dims) into usableW×usableH at scale k px/m.
 * Rows ("shelves") fill left→right, wrap downward. Returns null when it
 * doesn't fit.
 */
function tryPack(
  dims: Array<{ wM: number; hM: number }>,
  k: number,
  usableW: number,
  usableH: number,
): PackedRoom[] | null {
  const out: PackedRoom[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let shelfH = 0;

  for (const d of dims) {
    const w = d.wM * k;
    const h = d.hM * k;
    if (w > usableW) return null;

    if (cursorX > 0 && cursorX + w > usableW) {
      // wrap to next shelf
      cursorY += shelfH + ROOM_GAP;
      cursorX = 0;
      shelfH = 0;
    }

    if (cursorY + h > usableH) return null;

    out.push({ x: cursorX, y: cursorY, w, h });
    cursorX += w + ROOM_GAP;
    shelfH = Math.max(shelfH, h);
  }

  return out;
}

/** Meter gap used when auto-packing rooms that have no composer position. */
const LOOSE_GAP_M = 0.5;

/**
 * Layout used when at least one room carries an explicit composer position:
 * positioned rooms render exactly where the admin placed them; rooms without
 * a position are shelf-packed into a strip below the placed footprint.
 */
function computePositionedLayout(
  rooms: MetricRoomInput[],
  canvasW: number,
  canvasH: number,
): MetricLayoutResult {
  const marginX = canvasW * 0.08;
  const marginY = canvasH * 0.08;
  const usableW = canvasW - marginX * 2;
  const usableH = canvasH - marginY * 2;

  const placed = new Map<string, { x: number; y: number; w: number; h: number }>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  for (const r of rooms) {
    if (r.xM == null || r.yM == null) continue;
    const w = clampM(r.widthM);
    const h = clampM(r.lengthM);
    const x = Math.max(0, r.xM);
    const y = Math.max(0, r.yM);
    placed.set(r.id, { x, y, w, h });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  for (const p of placed.values()) {
    p.x -= minX;
    p.y -= minY;
  }
  maxX -= minX;
  maxY -= minY;

  const loose = rooms.filter(r => r.xM == null || r.yM == null);
  if (loose.length > 0) {
    const isLooseOutdoor = (id: string) => id.includes('balcony') || id.includes('terrace');
    const looseIndoor = loose.filter(r => !isLooseOutdoor(r.id));
    const looseOutdoor = loose.filter(r => isLooseOutdoor(r.id));

    const looseArea = loose.reduce((s, r) => s + clampM(r.widthM) * clampM(r.lengthM), 0);
    const stripW = Math.max(maxX, Math.sqrt(looseArea) * 1.6, 8);
    let cx = 0;
    let cy = placed.size > 0 ? maxY + LOOSE_GAP_M * 2 : 0;
    let shelfH = 0;
    
    // Pack loose indoor rooms first
    for (const r of looseIndoor) {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      const w = Math.max(a, b);
      const h = Math.min(a, b);
      if (cx > 0 && cx + w > stripW) {
        cy += shelfH + LOOSE_GAP_M;
        cx = 0;
        shelfH = 0;
      }
      placed.set(r.id, { x: cx, y: cy, w, h });
      cx += w + LOOSE_GAP_M;
      shelfH = Math.max(shelfH, h);
      maxX = Math.max(maxX, cx - LOOSE_GAP_M);
      maxY = Math.max(maxY, cy + h);
    }

    // Place outdoor balconies on the perimeter East facade
    let balcY = 0;
    for (const r of looseOutdoor) {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      const w = Math.max(a, b);
      const h = Math.min(a, b);
      placed.set(r.id, { x: maxX + LOOSE_GAP_M, y: balcY, w, h });
      balcY += h + LOOSE_GAP_M;
      maxX = Math.max(maxX, maxX + LOOSE_GAP_M + w);
      maxY = Math.max(maxY, balcY - LOOSE_GAP_M);
    }
  }

  const k = Math.min(usableW / Math.max(maxX, 1), usableH / Math.max(maxY, 1));
  const offsetX = marginX + (usableW - maxX * k) / 2;
  const offsetY = marginY + (usableH - maxY * k) / 2;

  const rects: MetricRoomRect[] = rooms.map((r) => {
    const p = placed.get(r.id)!;
    return {
      id: r.id,
      x: offsetX + p.x * k,
      y: offsetY + p.y * k,
      w: p.w * k,
      h: p.h * k,
    };
  });

  return {
    rooms: rects,
    bounds: { x: offsetX, y: offsetY, w: maxX * k, h: maxY * k },
    pxPerMeter: k,
  };
}

/**
 * Compute a deterministic, metric-true layout for the given ordered rooms
 * inside the canvas (default: the shared 680×440 viewBox).
 */
export function computeMetricLayout(
  rooms: MetricRoomInput[],
  canvasW = 680,
  canvasH = 440,
): MetricLayoutResult {
  if (rooms.length === 0) {
    return {
      rooms: [],
      bounds: { x: canvasW * 0.08, y: canvasH * 0.08, w: canvasW * 0.84, h: canvasH * 0.84 },
      pxPerMeter: 1,
    };
  }

  if (rooms.some(r => r.xM != null && r.yM != null)) {
    return computePositionedLayout(rooms, canvasW, canvasH);
  }

  // Detect twin units on the same floor (e.g. Unit A and Unit B)
  const isUnitA = (r: MetricRoomInput) => (r.label || r.id).includes('وحدة أ') || (r.label || r.id).includes('Unit A');
  const isUnitB = (r: MetricRoomInput) => (r.label || r.id).includes('وحدة ب') || (r.label || r.id).includes('Unit B');
  const hasTwinUnits = rooms.some(isUnitA) && rooms.some(isUnitB);

  if (hasTwinUnits) {
    const unitARooms = rooms.filter(isUnitA);
    const unitBRooms = rooms.filter(isUnitB);
    const otherRooms = rooms.filter(r => !isUnitA(r) && !isUnitB(r));

    const positionedRooms: MetricRoomInput[] = [];

    // Arrange Unit A in left wing (X: 0 to ~12.5m)
    let curAX = 0;
    let curAY = 0;
    let maxARowH = 0;
    const maxAWidth = 13.0;
    for (const r of unitARooms) {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      const w = Math.max(a, b);
      const h = Math.min(a, b);
      if (curAX > 0 && curAX + w > maxAWidth) {
        curAX = 0;
        curAY += maxARowH + LOOSE_GAP_M;
        maxARowH = 0;
      }
      positionedRooms.push({ ...r, xM: curAX, yM: curAY });
      curAX += w + LOOSE_GAP_M;
      maxARowH = Math.max(maxARowH, h);
    }

    // Arrange Unit B in right wing (Offset X by 14.5m)
    const OFF_B = 14.5;
    let curBX = 0;
    let curBY = 0;
    let maxBRowH = 0;
    const maxBWidth = 13.0;
    for (const r of unitBRooms) {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      const w = Math.max(a, b);
      const h = Math.min(a, b);
      if (curBX > 0 && curBX + w > maxBWidth) {
        curBX = 0;
        curBY += maxBRowH + LOOSE_GAP_M;
        maxBRowH = 0;
      }
      positionedRooms.push({ ...r, xM: OFF_B + curBX, yM: curBY });
      curBX += w + LOOSE_GAP_M;
      maxBRowH = Math.max(maxBRowH, h);
    }

    for (const r of otherRooms) {
      positionedRooms.push({ ...r, xM: 0, yM: Math.max(curAY, curBY) + 2 });
    }

    return computePositionedLayout(positionedRooms, canvasW, canvasH);
  }

  const marginX = canvasW * 0.08;
  const marginY = canvasH * 0.08;
  const usableW = canvasW - marginX * 2;
  const usableH = canvasH - marginY * 2;

  const isOutdoor = (id: string) => id.includes('balcony') || id.includes('terrace');
  const indoorRooms = rooms.filter(r => !isOutdoor(r.id));
  const outdoorRooms = rooms.filter(r => isOutdoor(r.id));

  // If there are both indoor and outdoor rooms, pack indoor rooms first to create the envelope,
  // then rigidly attach outdoor balconies/terraces to the exterior facade.
  if (indoorRooms.length > 0 && outdoorRooms.length > 0) {
    const indoorDims = indoorRooms.map((r) => {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      return { wM: Math.max(a, b), hM: Math.min(a, b) };
    });

    const outdoorDims = outdoorRooms.map((r) => {
      const a = clampM(r.widthM);
      const b = clampM(r.lengthM);
      return { wM: Math.max(a, b), hM: Math.min(a, b) };
    });

    // Try packing indoor rooms + attaching outdoor balconies
    const tryPackWithExteriorBalconies = (k: number): { indoor: PackedRoom[]; outdoor: PackedRoom[]; maxX: number; maxY: number } | null => {
      const inPacked = tryPack(indoorDims, k, usableW, usableH);
      if (!inPacked) return null;

      const inMaxX = Math.max(...inPacked.map(p => p.x + p.w));
      const inMaxY = Math.max(...inPacked.map(p => p.y + p.h));

      // Check if attaching to East facade fits within usableW
      let outCursorY = 0;
      const outPackedEast: PackedRoom[] = [];
      let fitsEast = true;

      for (const d of outdoorDims) {
        const w = d.wM * k;
        const h = d.hM * k;
        const x = inMaxX + ROOM_GAP;
        const y = outCursorY;
        if (x + w > usableW || y + h > usableH) {
          fitsEast = false;
          break;
        }
        outPackedEast.push({ x, y, w, h });
        outCursorY += h + ROOM_GAP;
      }

      if (fitsEast) {
        const totalMaxX = Math.max(inMaxX, ...outPackedEast.map(p => p.x + p.w));
        const totalMaxY = Math.max(inMaxY, ...outPackedEast.map(p => p.y + p.h));
        return { indoor: inPacked, outdoor: outPackedEast, maxX: totalMaxX, maxY: totalMaxY };
      }

      // If East doesn't fit, attach to South exterior facade
      let outCursorX = 0;
      const outPackedSouth: PackedRoom[] = [];
      let fitsSouth = true;

      for (const d of outdoorDims) {
        const w = d.wM * k;
        const h = d.hM * k;
        const x = outCursorX;
        const y = inMaxY + ROOM_GAP;
        if (x + w > usableW || y + h > usableH) {
          fitsSouth = false;
          break;
        }
        outPackedSouth.push({ x, y, w, h });
        outCursorX += w + ROOM_GAP;
      }

      if (fitsSouth) {
        const totalMaxX = Math.max(inMaxX, ...outPackedSouth.map(p => p.x + p.w));
        const totalMaxY = Math.max(inMaxY, ...outPackedSouth.map(p => p.y + p.h));
        return { indoor: inPacked, outdoor: outPackedSouth, maxX: totalMaxX, maxY: totalMaxY };
      }

      return null;
    };

    let lo = 0.05;
    let hi = 80;
    let bestResult: { indoor: PackedRoom[]; outdoor: PackedRoom[]; maxX: number; maxY: number } | null = null;
    let bestK = lo;

    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      const res = tryPackWithExteriorBalconies(mid);
      if (res) {
        bestResult = res;
        bestK = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    if (bestResult) {
      const offsetX = marginX + (usableW - bestResult.maxX) / 2;
      const offsetY = marginY + (usableH - bestResult.maxY) / 2;

      const rectMap = new Map<string, MetricRoomRect>();

      indoorRooms.forEach((r, i) => {
        const p = bestResult!.indoor[i];
        rectMap.set(r.id, {
          id: r.id,
          x: offsetX + p.x,
          y: offsetY + p.y,
          w: p.w,
          h: p.h,
        });
      });

      outdoorRooms.forEach((r, i) => {
        const p = bestResult!.outdoor[i];
        rectMap.set(r.id, {
          id: r.id,
          x: offsetX + p.x,
          y: offsetY + p.y,
          w: p.w,
          h: p.h,
        });
      });

      const rects = rooms.map(r => rectMap.get(r.id)!);

      return {
        rooms: rects,
        bounds: { x: offsetX, y: offsetY, w: bestResult.maxX, h: bestResult.maxY },
        pxPerMeter: bestK,
      };
    }
  }

  // Standard packing if all rooms are indoor or outdoor
  const dims = rooms.map((r) => {
    const a = clampM(r.widthM);
    const b = clampM(r.lengthM);
    return { wM: Math.max(a, b), hM: Math.min(a, b) };
  });

  // Binary search the largest px-per-meter scale that still fits.
  let lo = 0.05;
  let hi = 80;
  let best: PackedRoom[] | null = null;
  let bestK = lo;

  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const packed = tryPack(dims, mid, usableW, usableH);
    if (packed) {
      best = packed;
      bestK = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!best) {
    // Degenerate fallback (should be unreachable): uniform grid.
    const cols = Math.ceil(Math.sqrt(rooms.length));
    const rowsN = Math.ceil(rooms.length / cols);
    const cw = usableW / cols;
    const ch = usableH / rowsN;
    const rects = rooms.map((r, i) => ({
      id: r.id,
      x: marginX + (i % cols) * cw,
      y: marginY + Math.floor(i / cols) * ch,
      w: cw - ROOM_GAP,
      h: ch - ROOM_GAP,
    }));
    return {
      rooms: rects,
      bounds: { x: marginX, y: marginY, w: usableW, h: usableH },
      pxPerMeter: 1,
    };
  }

  // Center the packed bounds inside the canvas.
  const maxX = Math.max(...best.map((p) => p.x + p.w));
  const maxY = Math.max(...best.map((p) => p.y + p.h));
  const offsetX = marginX + (usableW - maxX) / 2;
  const offsetY = marginY + (usableH - maxY) / 2;

  const rects: MetricRoomRect[] = best.map((p, i) => ({
    id: rooms[i].id,
    x: offsetX + p.x,
    y: offsetY + p.y,
    w: p.w,
    h: p.h,
  }));

  return {
    rooms: rects,
    bounds: { x: offsetX, y: offsetY, w: maxX, h: maxY },
    pxPerMeter: bestK,
  };
}

/**
 * Derive meter dimensions for layout from a zone's spatial block, with
 * graceful fallbacks for legacy records: explicit W×L → sqm-derived 4:3
 * rectangle → generic 4×3 room.
 */
export function metricInputFromSpatial(
  id: string,
  spatial: { width_m?: number; length_m?: number; sqm?: number; pos_x_m?: number; pos_y_m?: number } | undefined,
  fallbackSqm?: number,
): MetricRoomInput {
  const w = spatial?.width_m;
  const l = spatial?.length_m;
  const xM = spatial?.pos_x_m;
  const yM = spatial?.pos_y_m;
  if (w && l && w > 0 && l > 0) {
    return { id, widthM: w, lengthM: l, xM, yM };
  }
  const sqm = spatial?.sqm && spatial.sqm > 0 ? spatial.sqm : fallbackSqm;
  if (sqm && sqm > 0) {
    // 4:3 rectangle of equivalent area.
    const lengthM = Math.sqrt(sqm * (3 / 4));
    return { id, widthM: sqm / lengthM, lengthM };
  }
  return { id, widthM: 4, lengthM: 3 };
}

export interface OpeningSegment {
  id: string;
  kind: 'door' | 'window';
  edge: 'n' | 'e' | 's' | 'w';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset_m?: number;
  width_m?: number;
  flip?: boolean;
}

/**
 * Convert a room's stored openings (meter offsets along an edge) into px line
 * segments on its rendered rect — shared by the admin canvas and the public
 * inspector so doors/windows draw identically on both.
 */
export function openingSegments(
  rect: { x: number; y: number; w: number; h: number },
  openings: Array<{ id: string; kind: 'door' | 'window'; edge: 'n' | 'e' | 's' | 'w'; offset_m: number; width_m: number; flip?: boolean }> | undefined,
  pxPerMeter: number,
): OpeningSegment[] {
  if (!openings || openings.length === 0 || pxPerMeter <= 0) return [];
  const out: OpeningSegment[] = [];
  for (const o of openings) {
    const horizontal = o.edge === 'n' || o.edge === 's';
    const edgeLen = horizontal ? rect.w : rect.h;
    const wPx = Math.min(o.width_m * pxPerMeter, edgeLen);
    const offPx = Math.max(0, Math.min(o.offset_m * pxPerMeter, edgeLen - wPx));
    if (horizontal) {
      const y = o.edge === 'n' ? rect.y : rect.y + rect.h;
      out.push({ id: o.id, kind: o.kind, edge: o.edge, x1: rect.x + offPx, y1: y, x2: rect.x + offPx + wPx, y2: y, offset_m: o.offset_m, width_m: o.width_m, flip: o.flip });
    } else {
      const x = o.edge === 'w' ? rect.x : rect.x + rect.w;
      out.push({ id: o.id, kind: o.kind, edge: o.edge, x1: x, y1: rect.y + offPx, x2: x, y2: rect.y + offPx + wPx, offset_m: o.offset_m, width_m: o.width_m, flip: o.flip });
    }
  }
  return out;
}
