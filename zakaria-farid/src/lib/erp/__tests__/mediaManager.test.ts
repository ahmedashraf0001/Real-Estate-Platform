import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { autoVideoTitle, validateMediaUrl, validateVideoFile, reorderMedia, propertyMediaVideos } from '../../media';
import type { ZoneInstance } from '../../layering/instances';
import { adminHarness, nodes, textOf } from './adminWizardHarness';
const req = createRequire(import.meta.url);
const css = req.extensions['.css'];
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const MediaManager = req('../../../components/admin/media/MediaManager').default;
const Blueprint = req('../../../components/blueprint/BuildingBlueprintPreview').default;
const { ZoneInspector } = req('../../../components/admin/ZoneInspector');
if (css) req.extensions['.css'] = css; else delete req.extensions['.css'];
const video = { id: 'fixture-video', url: 'https://youtu.be/dQw4w9WgXcQ', category: 'tour' as const };
const zone = (type: string): ZoneInstance => ({ id: 'fixture-zone', zone_template_id: type, floor_number: 1, sort_order: 0, trades: [], videos: [video], images: ['https://example.com/photo.jpg'] });

test('auto titles use context and index without rewriting untitled legacy data', () => {
 assert.equal(autoVideoTitle('Apartment 5A', 2, false), 'Apartment 5A — video 2');
 assert.equal(autoVideoTitle('Apartment 5A', 2, true), 'Apartment 5A — فيديو 2');
 const html = renderToStaticMarkup(React.createElement(MediaManager, { contextLabel: 'Apartment 5A', videos: [video], storagePathPrefix: 'videos/', onChange() {} }));
 assert.match(html, /Apartment 5A — video 1/);
 assert.equal('title_en' in video, false);
});
test('URL validation requires HTTPS and rejects empty, credentials and malformed URLs', () => {
 for (const url of ['', ' ', 'http://example.com/video.mp4', 'javascript:alert(1)', 'https://', 'https://user:pass@example.com/v.mp4']) assert.ok(validateMediaUrl(url));
 for (const url of ['https://example.com/video.mp4', video.url]) assert.equal(validateMediaUrl(url), null);
});
test('video file validation accepts MP4 WebM QuickTime up to 200 MB before upload', () => {
 for (const type of ['video/mp4', 'video/webm', 'video/quicktime']) assert.equal(validateVideoFile({ type, size: 200 * 1024 * 1024 }), null);
 assert.ok(validateVideoFile({ type: 'image/jpeg', size: 10 }));
 assert.ok(validateVideoFile({ type: 'video/mp4', size: 200 * 1024 * 1024 + 1 }));
});
test('reorder changes first overview immutably and ignores invalid drops', () => {
 const list = [video, { ...video, id: 'second' }];
 assert.deepEqual(reorderMedia(list, 1, 0).map(v => v.id), ['second', 'fixture-video']);
 assert.equal(list[0].id, 'fixture-video');
 assert.deepEqual(reorderMedia(list, -1, 0), list);
});
test('empty manager renders only two video add buttons and no empty title or URL inputs', () => {
 const html = renderToStaticMarkup(React.createElement(MediaManager, { contextLabel: 'المبنى', videos: [], storagePathPrefix: 'videos/', isAr: true, onChange() {} }));
 assert.match(html, /رفع فيديو من الجهاز/); assert.match(html, /إضافة رابط \(يوتيوب \/ MP4\)/);
 assert.equal((html.match(/<button/g) || []).length, 2);
 assert.doesNotMatch(html, /type="(?:url|text)"|<form/);
 assert.doesNotMatch(html, /<button(?![^>]*type="button")/);
});
test('ZoneInspector renders shared media including photos for unit room and utility', () => {
 for (const type of ['bld.unit', 'apt.living', 'bld.elevator']) {
  const z = zone(type);
  const html = renderToStaticMarkup(React.createElement(ZoneInspector, { zoneInstances: [z], selectedZoneId: z.id, onZoneInstancesChange() {}, isAr: true }));
  assert.match(html, /data-media-manager/); assert.match(html, /رفع فيديو من الجهاز/); assert.match(html, /رفع صور/);
  assert.match(html, /example.com\/photo.jpg/); assert.doesNotMatch(html, /<form/);
 }
});
test('public unit view renders first overview with existing privacy embed and photos', () => {
 const z = zone('bld.unit'); z.videos!.push({ ...video, id: 'second', url: 'https://example.com/second.mp4' });
 const html = renderToStaticMarkup(React.createElement(Blueprint, { zones: [z], view: { mode: 'unit', floorKey: 'Floor 1', unitId: z.id }, selectedId: null, isAr: false, onSelect() {}, onViewChange() {} }));
 assert.match(html, /data-zone-media/); assert.match(html, /youtube-nocookie.com/); assert.match(html, /example.com\/photo.jpg/); assert.doesNotMatch(html, /second.mp4/);
});
test('public zone detail renders overview and keeps photos empty state', () => {
 const z = zone('bld.elevator'); z.images = [];
 const html = renderToStaticMarkup(React.createElement(Blueprint, { zones: [z], view: { mode: 'floor', floorKey: 'Floor 1' }, selectedId: z.id, isAr: false, onSelect() {}, onViewChange() {} }));
 assert.match(html, /data-zone-media/); assert.match(html, /youtube-nocookie.com/); assert.match(html, /No photos added yet/);
});
test('legacy property video_url fallback survives empty videos; populated videos take priority', () => {
 assert.equal(propertyMediaVideos([], 'https://example.com/legacy.mp4')[0].url, 'https://example.com/legacy.mp4');
 assert.deepEqual(propertyMediaVideos([video], 'https://example.com/legacy.mp4'), [video]);
 assert.deepEqual(propertyMediaVideos([], null), []);
});

test('real manager link validation stays inline then adds titled tour; title edit reorder delete preserve category', () => {
 const h = adminHarness('media/MediaManager', '', undefined, { './uploadMedia': { uploadMedia() { throw new Error('No upload expected'); } } });
 let props: any = { contextLabel: 'Unit 5A', storagePathPrefix: 'videos/', videos: [], photos: [], onChange: (next: any) => { props = { ...props, ...next }; } };
 const render = () => h.render(props);
 const click = (tree: any, label: string) => { const b = nodes(tree).find(n => n.type === 'button' && (n.props['aria-label'] === label || textOf(n) === label)); assert.ok(b, label); b.props.onClick(); };
 try {
  let tree = render(); click(tree, 'Add link (YouTube / MP4)'); tree = render(); click(tree, 'Add'); tree = render();
  assert.match(textOf(tree), /Enter a valid HTTPS/); assert.equal(props.videos.length, 0);
  nodes(tree).find(n => n.type === 'input' && n.props.type === 'url').props.onChange({ target: { value: video.url } });
  tree = render(); click(tree, 'Add'); tree = render();
  assert.equal(props.videos[0].url, video.url); assert.equal(props.videos[0].title_en, 'Unit 5A — video 1'); assert.equal(props.videos[0].category, 'tour');
  nodes(tree).find(n => n.type === 'input' && n.props.dir === 'ltr').props.onChange({ target: { value: 'Edited tour' } });
  assert.equal(props.videos[0].title_en, 'Edited tour');
  props.videos = [...props.videos, { id: 'drone-fixture', url: 'https://example.com/drone.mp4', category: 'drone' }];
  tree = render(); nodes(tree).filter(n => n.type === 'button' && n.props['aria-label'] === 'Move up')[1].props.onClick();
  assert.equal(props.videos[0].id, 'drone-fixture'); assert.equal(props.videos[0].category, 'drone');
  tree = render(); click(tree, 'Delete video'); assert.equal(props.videos.length, 1); assert.equal(props.videos[0].title_en, 'Edited tour');
  assert.ok(nodes(tree).filter(n => n.type === 'button').every(n => n.props.type === 'button'));
 } finally { h.cleanup(); }
});

test('real file handler validates before upload, shows progress and inline retry, preserves photos across retry', async () => {
 let fail = true, attempts = 0;
 const h = adminHarness('media/MediaManager', '', undefined, { './uploadMedia': { async uploadMedia(file: any, prefix: string, kind: string, progress: any) {
  attempts++; assert.equal(prefix, 'videos/unit-fixture-'); assert.equal(kind, 'video'); assert.equal(file.type, 'video/mp4'); progress(45);
  if (fail) throw new Error('Storage denied'); return 'https://example.com/uploaded.mp4';
 } } });
 let props: any = { contextLabel: 'Unit', videos: [], photos: ['photo-first'], storagePathPrefix: 'zone-photos/unit-fixture-', onChange: (next: any) => { props = { ...props, ...next }; } };
 const render = () => h.render(props);
 const input = (tree: any) => nodes(tree).find(n => n.type === 'input' && n.props.accept?.includes('video/mp4'));
 const flush = () => new Promise(resolve => setImmediate(resolve));
 try {
  let tree = render(); input(tree).props.onChange({ target: { files: [{ name: 'bad', type: 'image/jpeg', size: 1 }], value: 'selected' } }); await flush();
  tree = render(); assert.equal(attempts, 0); assert.match(textOf(tree), /MP4/);
  input(tree).props.onChange({ target: { files: [{ name: 'tour.mp4', type: 'video/mp4', size: 1048576 }], value: 'selected' } }); await flush();
  tree = render(); assert.match(textOf(tree), /Storage denied/); assert.equal(nodes(tree).find(n => n.type === 'progress').props.value, 45); assert.equal(props.videos.length, 0);
  // A photo edit while the failed upload waits must survive its retry.
  props.photos.push('photo-second'); fail = false;
  await nodes(tree).find(n => n.type === 'button' && textOf(n) === 'Retry').props.onClick(); await flush();
  tree = render(); assert.equal(attempts, 2); assert.equal(props.videos.length, 1); assert.equal(props.videos[0].url, 'https://example.com/uploaded.mp4');
  assert.deepEqual(props.photos, ['photo-first', 'photo-second']); assert.doesNotMatch(textOf(tree), /Storage denied/); assert.match(textOf(tree), /Uploaded · 1.0 MB/);
 } finally { h.cleanup(); }
});

test('real card drag reorders videos and photos; photo remove leaves video category intact', () => {
 const h = adminHarness('media/MediaManager', '', undefined, { './uploadMedia': { uploadMedia() { throw new Error('No upload expected'); } } });
 let props: any = { contextLabel: 'Unit', videos: [video, { ...video, id: 'second', category: 'drone' }], photos: ['first.jpg', 'second.jpg'], storagePathPrefix: 'videos/', onChange(next: any) { props = { ...props, ...next }; } };
 const dragEvent = { preventDefault() {}, dataTransfer: { setData() {}, effectAllowed: '' } };
 try {
  let tree = h.render(props), cards = nodes(tree).filter(n => n.type === 'article');
  cards[1].props.onDragStart(dragEvent); cards[0].props.onDrop(dragEvent);
  assert.equal(props.videos[0].id, 'second'); assert.equal(props.videos[0].category, 'drone');
  tree = h.render(props); cards = nodes(tree).filter(n => n.type === 'article');
  assert.equal(textOf(cards[0]).includes('Overview'), true); assert.equal(textOf(cards[1]).includes('Overview'), false);
  cards[3].props.onDragStart(dragEvent); cards[2].props.onDrop(dragEvent);
  assert.deepEqual(props.photos, ['second.jpg', 'first.jpg']);
  tree = h.render(props); nodes(tree).find(n => n.type === 'button' && n.props['aria-label'] === 'Remove photo').props.onClick();
  assert.deepEqual(props.photos, ['first.jpg']); assert.equal(props.videos[0].category, 'drone');
 } finally { h.cleanup(); }
});

test('stored upload size comes from Storage info without rewriting legacy video', async () => {
 const paths: string[] = [];
 const h = adminHarness('media/MediaManager', '', undefined, {
  './uploadMedia': {}, '@/lib/supabase/client': { createClient: () => ({ storage: { from(bucket: string) { assert.equal(bucket, 'property-images'); return { async info(path: string) { paths.push(path); return { data: { size: 2097152 } }; } }; } } }) },
 });
 const stored = { id: 'stored', url: 'https://fixture.supabase.co/storage/v1/object/public/property-images/videos/stored.mp4', category: 'drone' };
 let writes = 0;
 const props: any = { contextLabel: 'Unit', videos: [stored], storagePathPrefix: 'videos/', onChange() { writes++; } };
 try {
  h.render(props); await new Promise(resolve => setImmediate(resolve));
  const tree = h.render(props);
  assert.match(textOf(tree), /Uploaded · 2.0 MB/); assert.deepEqual(paths, ['videos/stored.mp4']); assert.equal(writes, 0); assert.equal('title_en' in stored, false);
 } finally { h.cleanup(); }
});

test('upload completing after zone manager unmount cannot overwrite another zone draft', async () => {
 let resolve!: (url: string) => void, writes = 0;
 const h = adminHarness('media/MediaManager', '', undefined, { './uploadMedia': { uploadMedia: () => new Promise<string>(yes => { resolve = yes; }) } });
 const props: any = { contextLabel: 'Unit', videos: [], storagePathPrefix: 'videos/', onChange() { writes++; } };
 const tree = h.render(props);
 nodes(tree).find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [{ name: 'tour.mp4', type: 'video/mp4', size: 1 }], value: '' } });
 h.cleanup(); resolve('https://example.com/video.mp4'); await new Promise(yes => setImmediate(yes));
 assert.equal(writes, 0);
});
