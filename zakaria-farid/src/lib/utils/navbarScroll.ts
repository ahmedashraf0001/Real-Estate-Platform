/**
 * Pure helper for resolving navbar visual surface state from scroll offset.
 * At scrollY 0 and up to threshold: transparent (no glass fill/blur/shadow over hero).
 * Above threshold: glass (frosted capsule).
 */
export function getNavbarSurfaceState(scrollY: number, threshold: number = 30): 'transparent' | 'glass' {
  return scrollY > threshold ? 'glass' : 'transparent';
}
