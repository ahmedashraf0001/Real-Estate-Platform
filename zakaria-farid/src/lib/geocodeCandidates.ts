export function isInsideEgypt(lat: string | number, lon: string | number): boolean {
  const y = Number(lat);
  const x = Number(lon);
  return Number.isFinite(y) && Number.isFinite(x) && y >= 22 && y <= 31.7 && x >= 24.7 && x <= 36.9;
}

function normalizePlace(text: string): string {
  return text.toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Locality/address phrases outweigh a matching establishment name. Derive phrases
// from provider labels rather than a partial hardcoded registry of Egyptian cities.
export function rankGeocodeCandidates<T extends { display_name: string }>(query: string, candidates: readonly T[]): T[] {
  const normalizedQuery = ` ${normalizePlace(query)} `;
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
  return candidates.map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(({ item }) => item);
}
