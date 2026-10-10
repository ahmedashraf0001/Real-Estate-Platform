import test from 'node:test';
import assert from 'node:assert/strict';
import { getBaseLayerSpecs } from '../../mapCache';

test('vector basemap follows site theme: key-free light and dark basemaps', () => {
  const lightSpecs = getBaseLayerSpecs('map', 'light');
  assert.equal(lightSpecs.length, 2);
  assert.match(lightSpecs[0].url, /Canvas\/World_Light_Gray_Base\//);
  assert.match(lightSpecs[1].url, /Canvas\/World_Light_Gray_Reference\//);
  assert.equal(lightSpecs[0].options.maxZoom, 19);
  assert.match(lightSpecs[0].options.attribution!, /Esri/);

  const darkSpecs = getBaseLayerSpecs('map', 'dark');
  assert.equal(darkSpecs.length, 2);
  assert.match(darkSpecs[0].url, /Canvas\/World_Dark_Gray_Base\//);
  assert.match(darkSpecs[1].url, /Canvas\/World_Dark_Gray_Reference\//);
  assert.equal(darkSpecs[0].options.maxZoom, 19);
  assert.match(darkSpecs[0].options.attribution!, /Esri/);
});

test('satellite contains imagery only', () => {
  const specs = getBaseLayerSpecs('satellite');
  assert.equal(specs.length, 1);
  assert.deepEqual(specs.map(s => s.url.match(/services\/(.*?)\/MapServer/)?.[1]), ['World_Imagery']);
  assert.doesNotMatch(specs[0].url, /Reference\/|Transportation|Canvas/);
  assert.match(specs[0].options.attribution!, /Esri/);
});
