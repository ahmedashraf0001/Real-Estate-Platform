 'use client';
import React, {useEffect,useRef,useState} from 'react';
import {SettingsPreview} from './SettingsPreview';
import type {SiteContentMap} from '@/lib/siteContent/defaults';
import {type DraftPath,type SettingsGroup} from '@/lib/siteContent/settingsDraft';
import {previewRoute} from '@/lib/siteContent/preview';
import styles from './Settings.module.css';
export function PreviewPanel({group,draft,isAr,target,focusedPath}:{group:SettingsGroup;draft:SiteContentMap;isAr:boolean;target:string;focusedPath:DraftPath}) {
  const [locale,setLocale]=useState(isAr?'ar':'en'),[phone,setPhone]=useState(false),[dark,setDark]=useState(false);
  const [width,setWidth]=useState(360),[availableHeight,setAvailableHeight]=useState(620),[firstSlug,setFirstSlug]=useState<string>();
  const host=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    const measure=()=>{if(!host.current)return;const rect=host.current.getBoundingClientRect();setWidth(rect.width);setAvailableHeight(Math.max(240,Math.min(620,window.innerHeight-rect.top-110)));};
    const observer=new ResizeObserver(measure);if(host.current)observer.observe(host.current);
    window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});measure();
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);};
  },[]);
  const viewport=phone?390:1440,scale=Math.min(1,width/viewport);
  const src=previewRoute(group,locale,target,firstSlug);
  const post=()=>frame.current?.contentWindow?.postMessage({type:'settings-preview-draft',draft,theme:dark?'dark':'light',target,focusedPath},window.location.origin);
  useEffect(()=>{
    const timer=setTimeout(post,150);
    const receive=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow)return;
      if(event.data?.type==='settings-preview-ready')post();
      if(event.data?.type==='settings-preview-property'&&typeof event.data.slug==='string')setFirstSlug(event.data.slug);
    };
    window.addEventListener('message',receive);
    return()=>{clearTimeout(timer);window.removeEventListener('message',receive);};
  },[draft,dark,target,focusedPath,src]);
  return <section aria-label={isAr?'معاينة مباشرة':'Live preview'} className={styles.previewPanel}>
    <div className={styles.previewTools}><strong>{isAr?'معاينة مباشرة':'Live preview'}</strong>
      <button type="button" onClick={()=>setLocale(locale==='ar'?'en':'ar')}>{locale==='ar'?'EN':(isAr?'العربية':'Arabic')}</button>
      <button type="button" aria-pressed={phone} onClick={()=>setPhone(!phone)}>{phone?(isAr?'الهاتف':'Phone'):(isAr?'حاسوب':'Desktop')}</button>
      <button type="button" aria-pressed={dark} onClick={()=>setDark(!dark)}>{dark?(isAr?'داكن':'Dark'):(isAr?'فاتح':'Light')}</button>
    </div>
    <p className={styles.hint}>{isAr?'معاينة للمسودة. الروابط والإرسال غير متاحة هنا.':'Draft preview. Links and submissions are unavailable here.'}</p>
    <div className={styles.frameHost} ref={host}>
      {src?<iframe title={isAr?'معاينة الموقع':'Website preview'} ref={frame} onLoad={post} src={src} style={{width:viewport,height:availableHeight/scale,zoom:scale}} />
        :<div data-theme={dark?'dark':'light'}><SettingsPreview group={group} draft={draft} locale={locale}/></div>}
    </div>
  </section>;
}
