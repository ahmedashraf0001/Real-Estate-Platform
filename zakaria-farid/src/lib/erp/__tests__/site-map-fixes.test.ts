import test from 'node:test';
import assert from 'node:assert/strict';
import { getBaseLayerSpecs } from '../../mapCache';

test('neon uses key-free Esri dark base and reference in a dedicated pane', () => {
  const specs = getBaseLayerSpecs('neon');
  assert.equal(specs.length, 2);
  assert.deepEqual(specs.map(s => s.url.match(/Canvas\/([^/]+)/)?.[1]), ['World_Dark_Gray_Base', 'World_Dark_Gray_Reference']);
  for (const spec of specs) {
    assert.doesNotMatch(spec.url, /cartocdn|[?&](key|token|api_key)=/i);
    assert.equal(spec.options.pane, 'neon-basemap');
    assert.equal(spec.options.maxNativeZoom, 16);
    assert.match(spec.options.attribution!, /Esri/);
  }
});

test('satellite contains imagery only', () => {
  const specs = getBaseLayerSpecs('satellite');
  assert.equal(specs.length, 1);
  assert.deepEqual(specs.map(s => s.url.match(/services\/(.*?)\/MapServer/)?.[1]), ['World_Imagery']);
  assert.doesNotMatch(specs[0].url, /Reference\//);
  assert.match(specs[0].options.attribution!, /Esri/);
});
