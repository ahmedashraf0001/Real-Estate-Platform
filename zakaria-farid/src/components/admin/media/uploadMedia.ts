import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { validateVideoFile } from '@/lib/media';

// Keep the Storage SDK's bucket, session headers and multipart upload; use XHR
// only as its upload transport so progress represents actual bytes sent.
export async function uploadMedia(file: File, prefix: string, kind: 'video' | 'photo', progress: (percent: number) => void): Promise<string> {
  const invalid = kind === 'video' ? validateVideoFile(file) : !file.type.startsWith('image/') ? 'Images only' : null;
  if (invalid) throw new Error(invalid);
  const body = kind === 'photo' ? await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 2000, useWebWorker: true }) : file;
  const transport: typeof fetch = (input, init) => {
    if (!String(input).includes('/storage/v1/object/') || init?.method !== 'POST') return fetch(input, init);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', String(input));
      xhr.timeout = 180000;
      new Headers(init.headers).forEach((value, key) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = e => { if (e.lengthComputable) progress(Math.min(99, Math.round(e.loaded / e.total * 100))); };
      xhr.onerror = () => reject(new Error('Upload connection failed'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, headers: { 'Content-Type': 'application/json' } }));
      xhr.send(init.body as XMLHttpRequestBodyInit);
    });
  };
  const client = createClient(transport);
  const storage = client.storage.from('property-images');
  const path = `${prefix}${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const { error } = await storage.upload(path, body, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const url = storage.getPublicUrl(path).data.publicUrl;
  if (!url) throw new Error('Upload returned no URL');
  progress(100);
  return url;
}
