export function isInsideEgypt(lat: string | number, lon: string | number): boolean {
  const y = Number(lat);
  const x = Number(lon);
  return Number.isFinite(y) && Number.isFinite(x) && y >= 22 && y <= 31.7 && x >= 24.7 && x <= 36.9;
}

function normalizePlace(text: string): string {
  return text.toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

type PlaceCandidate = { display_name: string; type?: string; types?: string[]; class?: string; osm_key?: string; osm_value?: string; Addr_type?: string };

// Provider metadata distinguishes named establishments from address/area matches.
export function rankGeocodeCandidates<T extends PlaceCandidate>(query: string, candidates: readonly T[]): T[] {
  const normalizedQuery = ` ${normalizePlace(query)} `;
  const placeQuery = /(?:مستشفي|مسجد|مدرسه|جامعه|عياده|شارع|طريق|hospital|mosque|school|clinic|university|street|road)/.test(normalizedQuery);
  const kind = (candidate: T) => {
    const metadata = [candidate.type, ...(candidate.types ?? []), candidate.class, candidate.osm_key, candidate.osm_value, candidate.Addr_type].filter(Boolean).join(' ').toLowerCase();
    const poi = /\b(?:poi|establishment|point_of_interest|amenity|hospital|clinic|school|mosque|place_of_worship|university|shop|tourism|healthcare)\b/.test(metadata);
    return placeQuery ? Number(poi) : 0;
  };
  const score = (candidate: T) => {
    const parts = candidate.display_name.split(/[,،—]/);
    const words = normalizePlace(parts.length > 1 ? parts.slice(1).join(' ') : parts[0]).split(' ');
    let best = 0;
    for (let start = 0; start < words.length; start++) {
      for (let end = start + 1; end <= words.length; end++) {
        const phrase = words.slice(start, end).join(' ');
        if (phrase && normalizedQuery.includes(` ${phrase} `)) best = Math.max(best, end - start);
      }
    }
    return best;
  };
  return candidates.map((item, index) => ({ item, index, kind: kind(item), score: score(item) }))
    .sort((a, b) => b.kind - a.kind || b.score - a.score || a.index - b.index).map(({ item }) => item);
}
