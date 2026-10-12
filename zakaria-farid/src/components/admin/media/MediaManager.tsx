'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Film, GripVertical, Upload, Link as LinkIcon, Play, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { ZoneVideo } from '@/lib/layering/instances';
import { autoVideoTitle, reorderMedia, validateMediaUrl, validateVideoFile } from '@/lib/media';
import { createClient } from '@/lib/supabase/client';
import LuxuryAmbientVideoPlayer, { parseVideoUrl } from '@/components/video/LuxuryAmbientVideoPlayer';
import { ZFModalShell } from '@/components/admin/erp/v2/common/ZFModalShell';
import { uploadMedia } from './uploadMedia';
import styles from './MediaManager.module.css';

interface MediaManagerProps {
  contextLabel: string;
  videos: ZoneVideo[];
  photos?: string[];
  onChange: (media: { videos: ZoneVideo[]; photos?: string[] }) => void;
  storagePathPrefix: string;
  isAr?: boolean;
}
interface UploadItem { id: string; file: File; kind: 'video' | 'photo'; progress: number; error?: string }

export default function MediaManager({ contextLabel, videos, photos, onChange, storagePathPrefix, isAr = false }: MediaManagerProps) {
  const videoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const latest = useRef({ videos, photos, onChange });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  latest.current = { videos, photos, onChange };
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    let active = true;
    const stored = videos.filter(v => /\/storage\/v1\/object\/public\/property-images\//.test(v.url) && sizes[v.id] === undefined);
    if (stored.length) {
      const storage = createClient().storage.from('property-images');
      for (const v of stored) {
        let path: string;
        try { path = decodeURIComponent(new URL(v.url).pathname.split('/property-images/')[1]); } catch { continue; }
        void storage.info(path).then(({ data }) => {
          const size = data?.size;
          if (active && size !== undefined) setSizes(current => ({ ...current, [v.id]: size }));
        }).catch(() => { /* Older files without readable metadata keep their source label. */ });
      }
    }
    return () => { active = false; };
  }, [videos, sizes]);
  const [preview, setPreview] = useState<ZoneVideo | null>(null);
  const drag = useRef<{ kind: 'video' | 'photo'; index: number } | null>(null);
  const t = (ar: string, en: string) => isAr ? ar : en;
  const title = (v: ZoneVideo, i: number, ar: boolean) => (ar ? v.title_ar || v.title_en : v.title_en || v.title_ar) || autoVideoTitle(contextLabel, i + 1, ar);
  const change = (nextVideos = latest.current.videos, nextPhotos = latest.current.photos) => {
    latest.current = { ...latest.current, videos: nextVideos, photos: nextPhotos };
    latest.current.onChange({ videos: nextVideos, ...(nextPhotos !== undefined ? { photos: nextPhotos } : {}) });
  };
  const appendVideo = (videoUrl: string, id: string) => {
    const number = latest.current.videos.length + 1;
    change([...latest.current.videos, { id, url: videoUrl, title_ar: autoVideoTitle(contextLabel, number, true), title_en: autoVideoTitle(contextLabel, number, false), category: 'tour' }]);
  };
  const runUpload = async (item: UploadItem) => {
    setUploads(list => list.map(u => u.id === item.id ? { ...u, progress: 0, error: undefined } : u));
    try {
      // Preserve zone-photos/<zone-id>- paths; zone videos use videos/<zone-id>-.
      const prefix = item.kind === 'photo' ? storagePathPrefix : storagePathPrefix.replace(/^zone-photos\//, 'videos/');
      const result = await uploadMedia(item.file, prefix, item.kind, percent => setUploads(list => list.map(u => u.id === item.id ? { ...u, progress: percent } : u)));
      if (!mounted.current) return;
      if (item.kind === 'video') {
        appendVideo(result, item.id);
        setSizes(s => ({ ...s, [item.id]: item.file.size }));
      } else change(latest.current.videos, [...(latest.current.photos ?? []), result]);
      setUploads(list => list.filter(u => u.id !== item.id));
    } catch (cause) {
      setUploads(list => list.map(u => u.id === item.id ? { ...u, error: cause instanceof Error ? cause.message : String(cause) } : u));
    }
  };
  const chooseFiles = async (files: FileList | null, kind: 'video' | 'photo') => {
    setError('');
    for (const file of Array.from(files ?? [])) {
      const invalid = kind === 'video' ? validateVideoFile(file) : !file.type.startsWith('image/') ? 'Images only' : null;
      if (invalid) { setError(t(kind === 'video' ? 'اختر MP4 أو WebM أو QuickTime بحد أقصى 200 MB' : 'اختر ملف صورة', invalid)); continue; }
      const item: UploadItem = { id: crypto.randomUUID(), file, kind, progress: 0 };
      setUploads(list => [...list, item]);
      await runUpload(item);
    }
  };
  const move = (kind: 'video' | 'photo', from: number, to: number) => {
    if (kind === 'video') change(reorderMedia(latest.current.videos, from, to));
    else change(latest.current.videos, reorderMedia(latest.current.photos ?? [], from, to));
  };
  const reorderControls = (kind: 'video' | 'photo', index: number, count: number) => <div className={styles.actions}>
    <GripVertical size={16} aria-hidden="true" />
    <button type="button" disabled={index === 0} aria-label={t('نقل لأعلى', 'Move up')} onClick={() => move(kind, index, index - 1)}><ArrowUp size={16} /></button>
    <button type="button" disabled={index === count - 1} aria-label={t('نقل لأسفل', 'Move down')} onClick={() => move(kind, index, index + 1)}><ArrowDown size={16} /></button>
  </div>;
  const dragProps = (kind: 'video' | 'photo', index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { drag.current = { kind, index }; e.dataTransfer.setData('text/plain', String(index)); e.dataTransfer.effectAllowed = 'move'; },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragEnd: () => { drag.current = null; },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (drag.current?.kind === kind) move(kind, drag.current.index, index); drag.current = null; },
  });
  return <section data-media-manager className={styles.root} dir={isAr ? 'rtl' : 'ltr'} aria-label={t('وسائط', 'Media') + ' ' + contextLabel}>
    <h3>{t('وسائط', 'Media')} <bdi>{contextLabel}</bdi></h3>
    <p>{t('أول فيديو هو الفيديو التعريفي ويظهر أولاً للعميل', 'The first video is the overview and appears first for clients')}</p>
    <div className={styles.actions}>
      <button type="button" onClick={() => videoInput.current?.click()}><Upload size={16} />{t('رفع فيديو من الجهاز', 'Upload video from device')}</button>
      <button type="button" aria-expanded={linkOpen} onClick={() => setLinkOpen(!linkOpen)}><LinkIcon size={16} />{t('إضافة رابط (يوتيوب / MP4)', 'Add link (YouTube / MP4)')}</button>
    </div>
    <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden onChange={e => { void chooseFiles(e.target.files, 'video'); e.target.value = ''; }} />
    {linkOpen && <div className={styles.actions}>
      <input type="url" dir="ltr" aria-label={t('رابط الفيديو', 'Video URL')} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" aria-invalid={Boolean(error)} />
      <button type="button" onClick={() => {
        if (validateMediaUrl(url)) { setError(t('أدخل رابط فيديو صحيحاً يبدأ بـ https://', 'Enter a valid HTTPS video URL')); return; }
        appendVideo(url.trim(), crypto.randomUUID()); setUrl(''); setError(''); setLinkOpen(false);
      }}>{t('إضافة', 'Add')}</button>
    </div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {uploads.map(item => <div key={item.id} className={styles.card}>
      <bdi>{item.file.name}</bdi><progress value={item.progress} max={100} aria-label={t('تقدم الرفع', 'Upload progress') + ' ' + item.file.name} />
      {item.error && <><p role="alert" className={styles.error}>{t('فشل الرفع', 'Upload failed')}: {item.error}</p><button type="button" onClick={() => void runUpload(item)}>{t('إعادة المحاولة', 'Retry')}</button></>}
    </div>)}
    {!videos.length && <p>{t('لم تضاف فيديوهات بعد', 'No videos added yet')}</p>}
    <div className={styles.grid}>{videos.map((v, i) => {
      const parsed = parseVideoUrl(v.url);
      const uploaded = Boolean(sizes[v.id] || /\/storage\/v1\/object\/public\/property-images\//.test(v.url));
      return <article key={v.id} className={styles.card} {...dragProps('video', i)}>
        <div className={styles.thumbnail}><Film size={32} />{v.thumbnail || parsed.thumbnail ? <img src={v.thumbnail || parsed.thumbnail} alt="" onError={e => { e.currentTarget.hidden = true; }} /> : parsed.type === 'html5' ? <video src={v.url + '#t=0.1'} muted playsInline preload="metadata" aria-hidden="true" onError={e => { e.currentTarget.hidden = true; }} /> : null}</div>
        {i === 0 && <span className={styles.badge}>{t('تعريفي', 'Overview')}</span>}
        {(['title_ar', 'title_en'] as const).map(field => <label key={field}>{field === 'title_ar' ? t('العنوان بالعربية', 'Arabic title') : t('العنوان بالإنجليزية', 'English title')}<input type="text" dir={field === 'title_ar' ? 'rtl' : 'ltr'} value={title(v, i, field === 'title_ar')} onChange={e => change(latest.current.videos.map(item => item.id === v.id ? { ...item, [field]: e.target.value } : item))} /></label>)}
        <small>{parsed.type === 'youtube' ? t('يوتيوب', 'YouTube') : uploaded ? t('مرفوع', 'Uploaded') : t('رابط', 'Link')}{sizes[v.id] ? ` · ${(sizes[v.id] / 1024 / 1024).toFixed(1)} MB` : ''}</small>
        <small dir="ltr" className={styles.url}>{v.url}</small>
        <div className={styles.actions}>
          <button type="button" onClick={() => setPreview({ ...v, title_ar: title(v, i, true), title_en: title(v, i, false) })}><Play size={16} />{t('معاينة', 'Preview')}</button>
          <button type="button" aria-label={t('حذف الفيديو', 'Delete video')} onClick={() => { if (window.confirm(t('حذف الفيديو؟', 'Delete video?'))) change(latest.current.videos.filter(item => item.id !== v.id)); }}><Trash2 size={16} /></button>
        </div>
        {reorderControls('video', i, videos.length)}
      </article>;
    })}</div>
    {photos !== undefined && <>
      <h4>{t('الصور', 'Photos')}</h4>
      <button type="button" onClick={() => photoInput.current?.click()}><Upload size={16} />{t('رفع صور', 'Upload photos')}</button>
      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={e => { void chooseFiles(e.target.files, 'photo'); e.target.value = ''; }} />
      {!photos.length && <p>{t('لم تضاف صور بعد', 'No photos added yet')}</p>}
      <div className={styles.grid}>{photos.map((photo, i) => <article key={`${photo}-${i}`} className={styles.card} {...dragProps('photo', i)}>
        <img className={styles.photo} src={photo} alt={`${contextLabel} ${i + 1}`} />
        <button type="button" aria-label={t('حذف الصورة', 'Remove photo')} onClick={() => change(latest.current.videos, latest.current.photos?.filter((_, index) => index !== i))}><Trash2 size={16} /></button>
        {reorderControls('photo', i, photos.length)}
      </article>)}</div>
    </>}
    <ZFModalShell isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={preview ? (isAr ? preview.title_ar : preview.title_en) : ''} isAr={isAr} maxWidth="860px">
      {preview && <LuxuryAmbientVideoPlayer video={preview} isAr={isAr} autoPlay />}
    </ZFModalShell>
  </section>;
}
