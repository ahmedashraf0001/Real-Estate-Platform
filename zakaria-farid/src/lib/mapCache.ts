import type L from 'leaflet';
import type { Property } from '@/lib/supabase/types';

const MAP_CACHE_NAME = 'zf-sovereign-map-cache-v1';

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

      // Carto vector tiles
      const vectorTiles = getTileUrlsForLocation(
        lat,
        lng,
        [11, 14],
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
      );

      tileUrls.push(...satTiles, ...vectorTiles);
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
              if (res.ok) {
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

      // Check Cache Storage API first
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open(MAP_CACHE_NAME).then((cache) => {
          cache.match(url).then((response) => {
            if (response && response.ok) {
              response.blob().then((blob) => {
                const objectUrl = URL.createObjectURL(blob);
                tile.src = objectUrl;
              }).catch(() => {
                tile.src = url;
              });
            } else {
              tile.src = url;
              fetch(url, { mode: 'cors', cache: 'force-cache' })
                .then((res) => {
                  if (res.ok) cache.put(url, res.clone());
                })
                .catch(() => {});
            }
          }).catch(() => {
            tile.src = url;
          });
        }).catch(() => {
          tile.src = url;
        });
      } else {
        tile.src = url;
      }

      return tile;
    }
  });

  return new (CachedTileLayerClass as any)(urlTemplate, {
    maxZoom: 19,
    crossOrigin: true,
    ...options
  });
}

