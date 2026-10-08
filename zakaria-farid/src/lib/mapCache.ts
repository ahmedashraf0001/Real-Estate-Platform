import type L from 'leaflet';
import type { Property } from '@/lib/supabase/types';

const MAP_CACHE_NAME = 'zf-sovereign-map-cache-v1';

/** Provider templates shared by the visible basemap and property-site prefetch. */
export function getBaseLayerSpecs(mode: 'satellite' | 'neon'): { url: string; options: L.TileLayerOptions }[] {
  const service = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const attribution = 'Tiles &copy; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, and the GIS user community';
  if (mode === 'neon') {
    return ['World_Dark_Gray_Base', 'World_Dark_Gray_Reference'].map(name => ({
      url: `${service}Canvas/${name}/MapServer/tile/{z}/{y}/{x}`,
      options: { maxZoom: 19, maxNativeZoom: 16, pane: 'neon-basemap', attribution },
    }));
  }
  return ['World_Imagery', 'Reference/World_Transportation', 'Reference/World_Boundaries_and_Places'].map((name, index) => ({
    url: `${service}${name}/MapServer/tile/{z}/{y}/{x}`,
    options: { maxZoom: 19, opacity: index === 0 ? 1 : 0.95, attribution: index === 0
      ? 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS user community'
      : attribution },
  }));
}

/**
 * Converts standard Latitude/Longitude to Tile XYZ coordinates at a specific zoom level
 */
export function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

/**
 * Generates all Tile URLs for a specific coordinate and zoom range
 */
export function getTileUrlsForLocation(
  lat: number,
  lng: number,
  zooms: number[] = [11, 13, 15, 16],
  urlTemplate: string = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
): string[] {
  const urls: string[] = [];

  zooms.forEach((zoom) => {
    const center = latLngToTileXY(lat, lng, zoom);
    // Include 1-tile neighborhood (3x3 grid) around the property site
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;
        const tileUrl = urlTemplate
          .replace('{z}', String(zoom))
          .replace('{x}', String(x))
          .replace('{y}', String(y))
          .replace('{s}', 'a');
        urls.push(tileUrl);
      }
    }
  });

  return Array.from(new Set(urls));
}

/**
 * Pre-caches map tiles for all property sites in the background
 * Accepts real Property[] from Supabase
 */
export async function preloadPropertyMapSites(properties?: Property[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cache = await caches.open(MAP_CACHE_NAME);
    const tileUrls: string[] = [];

    // Collect tile URLs for all properties with coordinates
    const propsWithCoords = (properties || []).filter(
      (p) => p.latitude != null && p.longitude != null
    );

    propsWithCoords.forEach((prop) => {
      const lat = prop.latitude!;
      const lng = prop.longitude!;

      // Satellite imagery tiles
      const satTiles = getTileUrlsForLocation(
        lat,
        lng,
        [11, 14, 16],
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      );

      const neonTiles = getBaseLayerSpecs('neon').flatMap(spec =>
        getTileUrlsForLocation(lat, lng, [11, 14], spec.url)
      );
      tileUrls.push(...satTiles, ...neonTiles);
    });

    // Also cache Cairo headquarters
    const hqSatTiles = getTileUrlsForLocation(
      30.025,
      31.25,
      [11, 13],
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    );
    tileUrls.push(...hqSatTiles);

    const uniqueUrls = Array.from(new Set(tileUrls));

    // Batch download with concurrency limit to preserve bandwidth
    const concurrency = 6;
    for (let i = 0; i < uniqueUrls.length; i += concurrency) {
      const batch = uniqueUrls.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(async (url) => {
          try {
            const cachedResponse = await cache.match(url);
            if (!cachedResponse) {
              const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
              if (res.ok && res.headers.get('content-type')?.startsWith('image/')) {
                await cache.put(url, res);
              }
            }
          } catch {
            // Silently ignore tile fetch errors during background pre-caching
          }
        })
      );
    }
  } catch (err) {
    console.debug('[Sovereign Map Cache] Pre-caching finished with notices', err);
  }
}

/**
 * Creates a Leaflet TileLayer that prioritizes the Cache Storage API
 */
export function createCachedTileLayer(
  urlTemplate: string,
  options?: L.TileLayerOptions
): L.TileLayer {
  if (typeof window === 'undefined') return null as any;
  const Leaflet = require('leaflet') as typeof import('leaflet');

  const CachedTileLayerClass = Leaflet.TileLayer.extend({
    createTile: function (coords: { x: number; y: number; z: number }, done: (error: Error | null, tile: HTMLImageElement) => void) {
      const tile = document.createElement('img');

      Leaflet.DomEvent.on(tile, 'load', Leaflet.Util.bind((this as any)._tileOnLoad, this, done, tile));
      Leaflet.DomEvent.on(tile, 'error', Leaflet.Util.bind((this as any)._tileOnError, this, done, tile));

      if ((this as any).options.crossOrigin || (this as any).options.crossOrigin === '') {
        tile.crossOrigin = (this as any).options.crossOrigin === true ? '' : (this as any).options.crossOrigin;
      }

      tile.alt = '';
      tile.setAttribute('role', 'presentation');

      const url = (this as any).getTileUrl(coords);

      let objectUrl: string | undefined;
      let tileCache: Cache | undefined;
      const revoke = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      };
      tile.addEventListener('load', revoke);
      tile.addEventListener('error', () => {
        if (objectUrl) {
          revoke();
          void tileCache?.delete(url).catch(() => {});
          tile.src = url;
        }
      });

      // Ignore opaque, empty and non-image cache entries; never strand a tile
      // on a failed Cache Storage/blob operation.
      const load = async () => {
        if (!('caches' in window)) { tile.src = url; return; }
        try {
          const cache = await caches.open(MAP_CACHE_NAME);
          tileCache = cache;
          const response = await cache.match(url);
          if (response?.ok && response.headers.get('content-type')?.startsWith('image/')) {
            const blob = await response.blob();
            if (blob.size > 0) {
              objectUrl = URL.createObjectURL(blob);
              tile.src = objectUrl;
              return;
            }
          }
          if (response) await cache.delete(url);
          tile.src = url;
          const fresh = await fetch(url, { mode: 'cors', cache: 'force-cache' });
          if (fresh.ok && fresh.headers.get('content-type')?.startsWith('image/')) {
            await cache.put(url, fresh);
          }
        } catch {
          tile.src = url;
        }
      };
      void load();

      return tile;
    }
  });

  const layer: L.TileLayer = new (CachedTileLayerClass as any)(urlTemplate, {
    maxZoom: 19,
    crossOrigin: true,
    ...options
  });
  layer.on('tileunload', (event: L.TileEvent) => {
    const src = (event.tile as HTMLImageElement).src;
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  });
  return layer;
}

