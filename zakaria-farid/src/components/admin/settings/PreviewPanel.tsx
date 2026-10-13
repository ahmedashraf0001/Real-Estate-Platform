 'use client';
import React, {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {SettingsPreview} from './SettingsPreview';
import type {SiteContentMap} from '@/lib/siteContent/defaults';
import type {SettingsGroup} from '@/lib/siteContent/settingsDraft';
import styles from './Settings.module.css';
export function PreviewPanel({group,draft,isAr,target}:{group:SettingsGroup;draft:SiteContentMap;isAr:boolean;target:string}) {
  const [locale,setLocale]=useState(isAr?'ar':'en'),[phone,setPhone]=useState(false),[dark,setDark]=useState(false);
  const [frameDocument,setFrameDocument]=useState<Document|null>(null),[width,setWidth]=useState(360);
  const host=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(frameDocument){frameDocument.documentElement.dataset.theme=dark?'dark':'light';frameDocument.documentElement.dir=locale==='ar'?'rtl':'ltr';frameDocument.documentElement.lang=locale;}},[frameDocument,dark,locale]);
  useEffect(()=>{if(frameDocument){const elements=frameDocument.querySelectorAll<HTMLElement>(`[data-preview-target="${target}"]`);elements[0]?.scrollIntoView({block:'nearest'});}},[frameDocument,target,group]);
  const initialize=()=>{
    const doc=frame.current?.contentDocument;if(!doc)return;
    for(const node of document.head.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(node.cloneNode(true));
    // The iframe hosts real React components. Its viewport drives public responsive CSS.
    doc.body.style.margin='0';setFrameDocument(doc);
  };
  useEffect(()=>{if(frame.current?.contentDocument?.readyState==='complete')initialize();},[]);
  const viewport=phone?390:1024,scale=Math.min(1,width/viewport);
  return <section aria-label={isAr?'معاينة مباشرة':'Live preview'} className={styles.previewPanel}>
    <div className={styles.previewTools}><strong>{isAr?'معاينة مباشرة':'Live preview'}</strong>
      <button type="button" onClick={()=>setLocale(locale==='ar'?'en':'ar')}>{locale==='ar'?'EN':(isAr?'العربية':'Arabic')}</button>
      <button type="button" aria-pressed={phone} onClick={()=>setPhone(!phone)}>{phone?(isAr?'الهاتف':'Phone'):(isAr?'حاسوب':'Desktop')}</button>
      <button type="button" aria-pressed={dark} onClick={()=>setDark(!dark)}>{dark?(isAr?'داكن':'Dark'):(isAr?'فاتح':'Light')}</button>
    </div>
    <p className={styles.hint}>{isAr?'معاينة للمسودة. الروابط والإرسال غير متاحة هنا.':'Draft preview. Links and submissions are unavailable here.'}</p>
    <div className={styles.frameHost} ref={host}><iframe title={isAr?'معاينة الموقع':'Website preview'} ref={frame} onLoad={initialize} srcDoc="<!doctype html><html><head></head><body></body></html>" style={{width:viewport,height:620/scale,zoom:scale}} />
      {frameDocument&&createPortal(<div inert><SettingsPreview {...{group,draft,locale,target}}/></div>,frameDocument.body)}
    </div>
  </section>;
}
