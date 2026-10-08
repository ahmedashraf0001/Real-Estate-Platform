import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRoute, estimateRoute, formatDuration } from '../../geo/routing';

test('OSRM parses metres/seconds and caches rounded coordinates per profile', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.match(String(url), /routed-(car|foot)\/route\/v1\/(driving|foot)\//);
    return Response.json({ code: 'Ok', routes: [{ distance: 12345, duration: 900 }] });
  };
  try {
    const from = { lat: 30.12341, lng: 31.23451 }, to = { lat: 30.2, lng: 31.3 };
    assert.deepEqual(await fetchRoute('car', from, to), { distanceKm: 12.345, durationMin: 15 });
    assert.deepEqual(await fetchRoute('car', { ...from, lat: 30.12342 }, to), { distanceKm: 12.345, durationMin: 15 });
    assert.equal(calls, 1);
    assert.deepEqual(await fetchRoute('foot', from, to), { distanceKm: 12.345, durationMin: 15 });
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});

test('OSRM returns null for NoRoute, network errors, HTTP errors and invalid metrics', async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [{ code: 'NoRoute' }, { code: 'Ok', routes: [{ distance: -1, duration: 1 }] }]) {
      globalThis.fetch = async () => Response.json(response);
      assert.equal(await fetchRoute('car', { lat: 1, lng: 2 }, { lat: 3, lng: 4 }), null);
    }
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await fetchRoute('car', { lat: 1, lng: 2 }, { lat: 3, lng: 4 }), null);
    globalThis.fetch = async () => new Response('', { status: 500 });
    assert.equal(await fetchRoute('car', { lat: 1, lng: 2 }, { lat: 3, lng: 4 }), null);
  } finally { globalThis.fetch = original; }
});

test('OSRM aborts on caller cancellation and the eight-second timeout', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  try {
    const controller = new AbortController();
    const pending = fetchRoute('car', { lat: 5, lng: 6 }, { lat: 7, lng: 8 }, controller.signal);
    controller.abort();
    assert.equal(await pending, null);
    const started = Date.now();
    assert.equal(await fetchRoute('foot', { lat: 5, lng: 6 }, { lat: 7, lng: 8 }), null);
    assert.ok(Date.now() - started >= 7900);
    assert.ok(Date.now() - started < 10000);
  } finally { globalThis.fetch = original; }
});

test('10 km straight-line fallback uses 13 km roads and the specified speeds', () => {
  assert.deepEqual(estimateRoute('car', 10), { distanceKm: 13, durationMin: 15.6 });
  assert.deepEqual(estimateRoute('foot', 10), { distanceKm: 13, durationMin: 162.5 });
});

test('duration uses Arabic singular, dual and plural forms and rounded carry', () => {
  for (const [minutes, expected] of [[60, 'ساعة'], [120, 'ساعتان'], [185, '3 ساعات و 5 دقائق'], [2, 'دقيقتان'], [1, 'دقيقة'], [15, '15 دقيقة'], [59.8, 'ساعة']] as const) {
    assert.equal(formatDuration(minutes, 'ar'), expected);
  }
  assert.equal(formatDuration(185, 'en'), '3 hrs 5 mins');
});
