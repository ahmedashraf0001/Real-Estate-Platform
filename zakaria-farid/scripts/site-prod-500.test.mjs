import assert from 'node:assert/strict';
import { test } from 'node:test';

// Run against the built Workers preview, never next dev.
const origin = process.env.SITE_PREVIEW_ORIGIN || 'http://127.0.0.1:8799';
const slugs = [
  'sim-building-2x2-units-check-dsraxc',
  'sim-lifecycle-test-building-0a48pm',
  'el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm',
];

for (const slug of [slugs[0], slugs[2]]) {
  test(`Workers renders property title: ${slug}`, async () => {
    const response = await fetch(`${origin}/ar/properties/${encodeURIComponent(slug)}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<title>[^<]+ \| Zakaria Farid<\/title>/);
    assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;404'));
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
}

test('Workers returns HTTP 404 and Next not-found page for unknown slug', async () => {
  const response = await fetch(`${origin}/ar/properties/site-prod-500-bogus`, {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' },
  });
  const html = await response.text();
  assert.equal(response.status, 404);
  assert.match(html, /NEXT_HTTP_ERROR_FALLBACK;404|404/);
  assert.match(html, /name="robots" content="noindex"/);
});

for (const route of ['properties', 'map']) {
  test(`Workers ${route} contains all three current catalog properties without caching`, async () => {
    const response = await fetch(`${origin}/ar/${route}`);
    const html = await response.text();
    assert.equal(response.status, 200);
    const actualSlugs = [...new Set([...html.matchAll(/slug\\?":\\?"([^"\\]+)/g)].map(m => m[1]))];
    assert.deepEqual(actualSlugs.sort(), [...slugs].sort());
    assert.match(response.headers.get('cache-control'), /no-store/);
  });
}
