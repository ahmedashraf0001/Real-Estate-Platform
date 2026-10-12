import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
import { validateVideoFile } from '../../media';

// Real Storage SDK + production upload helper, fake byte transport. No network.
function harness(status = 200) {
 const requests: Array<{ url: string; headers: Record<string, string>; body: any }> = [];
 let compressed = 0, clients = 0;
 class XHR {
  upload: any = {}; onload!: () => void; onerror!: () => void; ontimeout!: () => void;
  timeout = 0; status = status; responseText = status === 200 ? '{"Id":"test-object","Key":"test-object"}' : '{"message":"Storage denied","statusCode":"403"}';
  url = ''; headers: Record<string, string> = {};
  open(method: string, url: string) { assert.equal(method, 'POST'); this.url = url; }
  setRequestHeader(key: string, value: string) { this.headers[key] = value; }
  send(body: any) { requests.push({ url: this.url, headers: this.headers, body }); this.upload.onprogress({ lengthComputable: true, loaded: 50, total: 100 }); this.onload(); }
 }
 const exports: any = {};
 const source = fs.readFileSync('src/components/admin/media/uploadMedia.ts', 'utf8');
 const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(code, { exports, XMLHttpRequest: XHR, Headers, Response, crypto: globalThis.crypto,
  fetch() { throw new Error('Network forbidden'); },
  require(id: string) {
   if (id === '@/lib/media') return { validateVideoFile };
   if (id === 'browser-image-compression') return { default: async (file: File, options: any) => { compressed++; assert.deepEqual(JSON.parse(JSON.stringify(options)), { maxSizeMB: 1.5, maxWidthOrHeight: 2000, useWebWorker: true }); return file; } };
   if (id === '@/lib/supabase/client') return { createClient: (transport: typeof fetch) => { clients++; return createClient('https://fixture.supabase.co', 'test-only-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport } }); } };
   throw new Error(`Unexpected import ${id}`);
  },
 });
 return { upload: exports.uploadMedia, requests, get compressed() { return compressed; }, get clients() { return clients; } };
}
test('production upload rejects invalid type and oversized file before Storage or compression', async () => {
 const h = harness();
 await assert.rejects(h.upload(new File(['x'], 'wrong.jpg', { type: 'image/jpeg' }), 'videos/', 'video', () => {}), /MP4/);
 await assert.rejects(h.upload({ size: 200 * 1024 * 1024 + 1, type: 'video/mp4' }, 'videos/', 'video', () => {}), /200 MB/);
 assert.equal(h.clients, 0); assert.equal(h.requests.length, 0); assert.equal(h.compressed, 0);
});
test('production upload uses property-images videos prefix SDK multipart and actual byte progress', async () => {
 const h = harness(); const progress: number[] = [];
 const url = await h.upload(new File(['test-video'], 'tour.mp4', { type: 'video/mp4' }), 'videos/', 'video', (p: number) => progress.push(p));
 assert.match(url, /^https:\/\/fixture.supabase.co\/storage\/v1\/object\/public\/property-images\/videos\/.+-tour.mp4$/);
 assert.equal(h.requests.length, 1); assert.match(h.requests[0].url, /\/object\/property-images\/videos\//);
 assert.equal(h.requests[0].headers['x-upsert'], 'false'); assert.equal(h.requests[0].body.get('').type, 'video/mp4');
 assert.deepEqual(progress, [50, 100]); assert.equal(h.compressed, 0);
});
test('production photo upload compresses and retains existing zone path', async () => {
 const h = harness();
 const url = await h.upload(new File(['test-photo'], 'photo.jpg', { type: 'image/jpeg' }), 'zone-photos/unit-fixture-', 'photo', () => {});
 assert.match(url, /\/property-images\/zone-photos\/unit-fixture-.+-photo.jpg$/); assert.equal(h.compressed, 1); assert.equal(h.requests.length, 1);
});
test('production storage failure rejects inline retry source instead of fabricating URL', async () => {
 const h = harness(403); const progress: number[] = [];
 await assert.rejects(h.upload(new File(['test-video'], 'tour.mp4', { type: 'video/mp4' }), 'videos/', 'video', (p: number) => progress.push(p)), /Storage denied/);
 assert.deepEqual(progress, [50]); assert.equal(h.requests.length, 1);
});
