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

  const marginX = canvasW * 0.08;
  const marginY = canvasH * 0.08;
  const usableW = canvasW - marginX * 2;
  const usableH = canvasH - marginY * 2;

  // Landscape orientation: longer side horizontal — corridors read naturally
  // and shelves pack densely. Labels always report the true entered W × L.
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
  spatial: { width_m?: number; length_m?: number; sqm?: number } | undefined,
  fallbackSqm?: number,
): MetricRoomInput {
  const w = spatial?.width_m;
  const l = spatial?.length_m;
  if (w && l && w > 0 && l > 0) {
    return { id, widthM: w, lengthM: l };
  }
  const sqm = spatial?.sqm && spatial.sqm > 0 ? spatial.sqm : fallbackSqm;
  if (sqm && sqm > 0) {
    // 4:3 rectangle of equivalent area.
    const lengthM = Math.sqrt(sqm * (3 / 4));
    return { id, widthM: sqm / lengthM, lengthM };
  }
  return { id, widthM: 4, lengthM: 3 };
}
