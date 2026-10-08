type Coordinates = { lat: number; lng: number };
type Route = { distanceKm: number; durationMin: number };
const cache = new Map<string, Route>();

export async function fetchRoute(profile: 'car' | 'foot', from: Coordinates, to: Coordinates, signal?: AbortSignal): Promise<Route | null> {
  if (signal?.aborted) return null;
  const coords = [from.lng, from.lat, to.lng, to.lat].map(value => value.toFixed(4));
  const key = `${profile}:${coords.join(',')}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 8000);
  try {
    const mode = profile === 'car' ? 'driving' : 'foot';
    const response = await fetch(`https://routing.openstreetmap.de/routed-${profile}/route/v1/${mode}/${coords[0]},${coords[1]};${coords[2]},${coords[3]}?overview=false`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    const route = data.routes?.[0];
    if (controller.signal.aborted || data.code !== 'Ok' || !route ||
        typeof route.distance !== 'number' || !Number.isFinite(route.distance) || route.distance < 0 ||
        typeof route.duration !== 'number' || !Number.isFinite(route.duration) || route.duration < 0) return null;
    const result = { distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export function estimateRoute(profile: 'car' | 'foot', directDistanceKm: number): Route {
  const distanceKm = directDistanceKm * 1.3;
  return { distanceKm, durationMin: distanceKm * 60 / (profile === 'car' ? 50 : 4.8) };
}

export function formatDuration(minutes: number, locale: string): string {
  if (minutes < 1) return locale === 'ar' ? 'أقل من دقيقة' : '< 1 min';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60), mins = total % 60;
  if (locale !== 'ar') {
    const parts = [];
    if (hours) parts.push(`${hours} ${hours === 1 ? 'hr' : 'hrs'}`);
    if (mins) parts.push(`${mins} ${mins === 1 ? 'min' : 'mins'}`);
    return parts.join(' ');
  }
  const unit = (value: number, singular: string, dual: string, plural: string) =>
    value === 1 ? singular : value === 2 ? dual : `${value} ${value >= 3 && value <= 10 ? plural : singular}`;
  const parts = [];
  if (hours) parts.push(unit(hours, 'ساعة', 'ساعتان', 'ساعات'));
  if (mins) parts.push(unit(mins, 'دقيقة', 'دقيقتان', 'دقائق'));
  return parts.join(' و ');
}
