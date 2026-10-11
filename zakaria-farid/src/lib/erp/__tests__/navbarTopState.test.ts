import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavbarSurfaceState } from '../../utils/navbarScroll';

test('navbar top-state helper returns transparent at scrollY 0 and initial load', () => {
  // initial load at 0
  assert.equal(getNavbarSurfaceState(0), 'transparent');
  // below threshold (default threshold is 30)
  assert.equal(getNavbarSurfaceState(15), 'transparent');
  assert.equal(getNavbarSurfaceState(30), 'transparent');
});

test('navbar top-state helper returns glass when scrolled past threshold', () => {
  assert.equal(getNavbarSurfaceState(31), 'glass');
  assert.equal(getNavbarSurfaceState(100), 'glass');
});

test('navbar top-state helper supports custom threshold', () => {
  assert.equal(getNavbarSurfaceState(10, 10), 'transparent');
  assert.equal(getNavbarSurfaceState(11, 10), 'glass');
});
