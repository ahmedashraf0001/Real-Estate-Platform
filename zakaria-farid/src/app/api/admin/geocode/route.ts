import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface GeocodeResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  source?: string;
  rating?: number;
}

function extractCoordsFromUrl(url: string): { lat: number; lng: number; title?: string } | null {
  try {
    const decodedUrl = decodeURIComponent(url);

    // 1. Check for @lat,lng e.g. @30.5155,31.3463 or @30.5155,31.3463,17z
    const atMatch = decodedUrl.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      const titleMatch = decodedUrl.match(/\/place\/([^/@]+)/);
      const title = titleMatch ? titleMatch[1].replace(/\+/g, ' ') : undefined;
      return { lat, lng, title };
    }

    // 2. Check for !3dlat!4dlng (Google Maps protobuf data param)
    const dMatch = decodedUrl.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
    if (dMatch) {
      const lat = parseFloat(dMatch[1]);
      const lng = parseFloat(dMatch[2]);
      const titleMatch = decodedUrl.match(/\/place\/([^/@]+)/);
      const title = titleMatch ? titleMatch[1].replace(/\+/g, ' ') : undefined;
      return { lat, lng, title };
    }

    // 3. Check for ?q=lat,lng or &query=lat,lng or ll=lat,lng
    const qMatch = decodedUrl.match(/[?&](?:q|query|ll|center)=(-?\d{1,2}\.\d+)[,+]+(-?\d{1,3}\.\d+)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    // 4. Check for /place/lat,lng
    const placeCoordMatch = decodedUrl.match(/\/place\/(-?\d{1,2}\.\d+)[,+]+(-?\d{1,3}\.\d+)/);
    if (placeCoordMatch) {
      return { lat: parseFloat(placeCoordMatch[1]), lng: parseFloat(placeCoordMatch[2]) };
    }

    // 5. Raw coordinate pair in string e.g. "30.5155, 31.3463"
    const rawMatch = decodedUrl.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
    if (rawMatch) {
      const lat = parseFloat(rawMatch[1]);
      const lng = parseFloat(rawMatch[2]);
      if (lat >= 20 && lat <= 33 && lng >= 24 && lng <= 37) {
        return { lat, lng };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Unshortens Google Maps share links (e.g. maps.app.goo.gl/...)
async function resolveGoogleMapsUrl(inputUrl: string): Promise<{ lat: number; lng: number; title?: string } | null> {
  const directMatch = extractCoordsFromUrl(inputUrl);
  if (directMatch) return directMatch;

  let currentUrl = inputUrl.trim();
  if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
    currentUrl = 'https://' + currentUrl;
  }

  try {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    const finalUrl = res.url;
    const resolvedFromFinal = extractCoordsFromUrl(finalUrl);
    if (resolvedFromFinal) return resolvedFromFinal;

    const html = await res.text();
    const metaMatch = html.match(/itemprop="image"\s+content="[^"]*@?(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) ||
      html.match(/center=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/) ||
      html.match(/window\.APP_INITIALIZATION_STATE=\[\[\[\d+,(-?\d{1,3}\.\d+),(-?\d{1,2}\.\d+)/);

    if (metaMatch) {
      const p1 = parseFloat(metaMatch[1]);
      const p2 = parseFloat(metaMatch[2]);
      const lat = p1 < p2 ? p1 : p2;
      const lng = p1 < p2 ? p2 : p1;
      return { lat, lng };
    }
  } catch (err) {
    console.warn('[Geocode API] URL Unshorten error:', err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const customApiKey = body.googleApiKey || '';
    const biasLat = body.biasLat;
    const biasLng = body.biasLng;

    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const apiKey = customApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

    // ─── 1. Check if the query is a Google Maps URL or Raw Coordinates ─────────
    const isMapsUrl = query.includes('maps.app.goo.gl') || 
                      query.includes('goo.gl/maps') || 
                      query.includes('google.com/maps') || 
                      query.includes('maps.google.com') ||
                      /@?-?\d{1,2}\.\d+[,\s]+-?\d{1,3}\.\d+/.test(query);

    if (isMapsUrl) {
      const urlCoords = await resolveGoogleMapsUrl(query);
      if (urlCoords) {
        return NextResponse.json({
          isUrl: true,
          resolved: true,
          results: [
            {
              place_id: 'google-url-' + Date.now(),
              lat: String(urlCoords.lat),
              lon: String(urlCoords.lng),
              display_name: urlCoords.title ? `${urlCoords.title} (${urlCoords.lat.toFixed(5)}, ${urlCoords.lng.toFixed(5)})` : `Google Maps Pin (${urlCoords.lat.toFixed(5)}, ${urlCoords.lng.toFixed(5)})`,
              type: 'google_pin',
              source: 'google_maps_url',
            }
          ],
          total: 1,
        });
      }
    }

    // ─── 2. Google Places Text Search (If Google API key is available) ────────
    if (apiKey) {
      try {
        let googlePlacesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=eg&language=ar&key=${apiKey}`;
        if (biasLat && biasLng) {
          googlePlacesUrl += `&location=${biasLat},${biasLng}&radius=50000`;
        }

        const gRes = await fetch(googlePlacesUrl, { signal: AbortSignal.timeout(5000) });
        const gData = await gRes.json();

        if (gData.status === 'OK' && Array.isArray(gData.results) && gData.results.length > 0) {
          const googleItems: GeocodeResult[] = gData.results.map((p: any) => ({
            place_id: `google-${p.place_id}`,
            lat: String(p.geometry.location.lat),
            lon: String(p.geometry.location.lng),
            display_name: `${p.name}${p.formatted_address ? ' — ' + p.formatted_address : ''}`,
            type: p.types?.[0] || 'establishment',
            source: 'google_places',
            rating: p.rating,
          }));

          return NextResponse.json({
            provider: 'google_places',
            results: googleItems,
            total: googleItems.length,
          });
        }
      } catch (gErr) {
        console.warn('[Geocode API] Google Places error, falling back to multi-engine:', gErr);
      }
    }

    // ─── 3. High-Precision Egyptian Geocoder (Prioritizing Exact City & Streets) ───
    const collected: GeocodeResult[] = [];
    const seenCoordinates = new Set<string>();
    const seenTitles = new Set<string>();

    const addCandidate = (item: GeocodeResult) => {
      const latNum = parseFloat(item.lat);
      const lonNum = parseFloat(item.lon);
      if (isNaN(latNum) || isNaN(lonNum)) return;

      // Cluster coordinates within ~150 meters
      const coordKey = `${latNum.toFixed(3)},${lonNum.toFixed(3)}`;
      const mainTitle = item.display_name.split(/[,—]/)[0].trim().toLowerCase();
      
      if (!seenCoordinates.has(coordKey) && !seenTitles.has(mainTitle)) {
        seenCoordinates.add(coordKey);
        seenTitles.add(mainTitle);
        collected.push(item);
      }
    };

    const cleanQ = query.replace(/[،,]/g, ' ').replace(/\s+/g, ' ').trim();

    // A. OpenStreetMap Nominatim with Egypt Boundary (Best accuracy for Egyptian streets and city centers)
    try {
      const egUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&countrycodes=eg&limit=8&addressdetails=1`;
      const res = await fetch(egUrl, { 
        headers: { 'User-Agent': 'SanctumLuxuryRealEstate/1.0' },
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const d of data) {
          const streetName = d.address?.road || d.name;
          const townOrCity = d.address?.city || d.address?.town || d.address?.suburb || d.address?.state || '';
          const fullLabel = townOrCity ? `${streetName} — ${townOrCity}` : d.display_name;
          addCandidate({
            place_id: `nom-${d.place_id}`,
            lat: String(d.lat),
            lon: String(d.lon),
            display_name: fullLabel,
            type: d.type || d.class || 'street',
            source: 'osm',
          });
        }
      }
    } catch {}

    // B. Photon Geocoder (OSM with lat/lon proximity bias)
    try {
      const lat = biasLat || 30.5155;
      const lon = biasLng || 31.3463;
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&lat=${lat}&lon=${lon}&limit=8`;
      const pRes = await fetch(photonUrl, { signal: AbortSignal.timeout(4000) });
      const pData = await pRes.json();
      if (pData?.features?.length > 0) {
        for (const [idx, f] of pData.features.entries()) {
          const p = f.properties;
          const fullTitle = [p.name, p.street, p.district || p.suburb, p.city || p.town, p.state].filter(Boolean).join(', ');
          addCandidate({
            place_id: `photon-${idx}-${p.osm_id || idx}`,
            lat: String(f.geometry.coordinates[1]),
            lon: String(f.geometry.coordinates[0]),
            display_name: fullTitle || p.name,
            type: p.osm_value || p.type || 'place',
            source: 'photon',
          });
        }
      }
    } catch {}

    // C. ArcGIS World Geocoder (Egypt country code)
    try {
      const arcGisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(cleanQ)}&countryCode=EGY&maxLocations=8&outFields=Match_addr,Addr_type,PlaceName,City,Subregion,Region,Type`;
      const aRes = await fetch(arcGisUrl, { signal: AbortSignal.timeout(4000) });
      const aData = await aRes.json();
      if (Array.isArray(aData?.candidates)) {
        for (const [idx, c] of aData.candidates.entries()) {
          if (c.location && typeof c.location.y === 'number' && typeof c.location.x === 'number' && c.score >= 75) {
            const title = c.attributes?.PlaceName || c.attributes?.Match_addr || c.address || cleanQ;
            const sub = [c.attributes?.City, c.attributes?.Subregion, c.attributes?.Region].filter(Boolean).join(', ');
            addCandidate({
              place_id: `arcgis-${idx}`,
              lat: String(c.location.y),
              lon: String(c.location.x),
              display_name: sub ? `${title} — ${sub}` : title,
              type: c.attributes?.Type || c.attributes?.Addr_type || 'landmark',
              source: 'arcgis',
            });
          }
        }
      }
    } catch {}

    return NextResponse.json({
      provider: 'google_maps_engine',
      hasGoogleApiKey: Boolean(apiKey),
      results: collected,
      total: collected.length,
    });
  } catch (err: any) {
    console.error('[Geocode API] Handler exception:', err);
    return NextResponse.json({ error: err.message || 'Geocoding search failed', results: [], total: 0 }, { status: 500 });
  }
}
