'use client';

import type { ZoneInstance } from '@/lib/layering/instances';
import { zoneLabel } from '@/lib/layering/labels';
import { autoVideoTitle } from '@/lib/media';
import LuxuryAmbientVideoPlayer from '@/components/video/LuxuryAmbientVideoPlayer';
import styles from './BuildingBlueprintPreview.module.css';
import { useState } from 'react';
import GalleryLightbox from '../property/GalleryLightbox';

export default function ZoneMedia({ zone, isAr }: { zone: ZoneInstance; isAr: boolean }) {
  const overview = zone.videos?.[0];
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  return <section data-zone-media className={styles.zoneMedia} aria-label={zoneLabel(zone, isAr)}>
    {overview && <>
      <h4>{isAr ? 'الفيديو التعريفي' : 'Overview video'}</h4>
      <LuxuryAmbientVideoPlayer key={overview.id} video={{ ...overview,
        title_ar: overview.title_ar || overview.title_en || autoVideoTitle(zoneLabel(zone, true), 1, true),
        title_en: overview.title_en || overview.title_ar || autoVideoTitle(zoneLabel(zone, false), 1, false),
      }} isAr={isAr} compact onOpen={() => setMediaIndex(zone.images?.length ?? 0)} />
    </>}
    <h4>{isAr ? 'صور العنصر' : 'Element photos'}</h4>
    {zone.images?.length ? <div className={styles.photos}>{zone.images.map((url, i) => <button key={`${url}-${i}`} type="button" data-zone-photo onClick={() => setMediaIndex(i)} aria-label={`${isAr ? 'فتح الصورة' : 'Open photo'} ${i + 1}`}><img src={url} alt={`${zoneLabel(zone, isAr)} ${i + 1}`} /></button>)}</div> : <p className={styles.photoSlot}>{isAr ? 'لم تضاف صور بعد' : 'No photos added yet'}</p>}
    {mediaIndex !== null && <GalleryLightbox images={zone.images ?? []} videos={zone.videos} title={zoneLabel(zone, isAr)} isAr={isAr} index={mediaIndex} onIndexChange={setMediaIndex} onClose={() => setMediaIndex(null)} />}
  </section>;
}
