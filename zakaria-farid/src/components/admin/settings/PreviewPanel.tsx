 'use client';
import React, {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {SettingsPreview} from './SettingsPreview';
import type {SiteContentMap} from '@/lib/siteContent/defaults';
import {readDraft,type DraftPath,type SettingsGroup} from '@/lib/siteContent/settingsDraft';
import {stripMarkdown} from '@/lib/markdown/miniMarkdown';
import styles from './Settings.module.css';
export function PreviewPanel({group,draft,isAr,target,focusedPath}:{group:SettingsGroup;draft:SiteContentMap;isAr:boolean;target:string;focusedPath:DraftPath}) {
  const [locale,setLocale]=useState(isAr?'ar':'en'),[phone,setPhone]=useState(false),[dark,setDark]=useState(false);
  const [frameDocument,setFrameDocument]=useState<Document|null>(null),[width,setWidth]=useState(360),[height,setHeight]=useState(620),[availableHeight,setAvailableHeight]=useState(620);
  const host=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{
    const measure=()=>{if(!host.current)return;const rect=host.current.getBoundingClientRect();setWidth(rect.width);setAvailableHeight(Math.max(240,Math.min(620,window.innerHeight-rect.top-110)));};
    const observer=new ResizeObserver(measure);if(host.current)observer.observe(host.current);
    window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});measure();
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);};
  },[]);
  useEffect(()=>{if(frameDocument){frameDocument.documentElement.dataset.theme=dark?'dark':'light';frameDocument.documentElement.dir=locale==='ar'?'rtl':'ltr';frameDocument.documentElement.lang=locale;}},[frameDocument,dark,locale]);

  const initialize=()=>{
    const doc=frame.current?.contentDocument;if(!doc)return;
    for(const node of document.head.querySelectorAll('link[rel="stylesheet"],style'))doc.head.appendChild(node.cloneNode(true));
    // The iframe hosts real React components. Its viewport drives public responsive CSS.
    doc.body.style.margin='0';setFrameDocument(doc);
  };
  useEffect(()=>{if(frame.current?.contentDocument?.readyState==='complete')initialize();},[]);
  const viewport=phone?390:1440,regionWidth=phone?390:480,scale=Math.min(1,width/viewport);
  // A real desktop viewport, cropped to a readable component region rather than a miniature page.
  useEffect(()=>{
    if(!frameDocument)return;
    const root=frameDocument.querySelector<HTMLElement>('[data-settings-preview]');if(!root)return;
    let cancelled=false;
    const layout=()=>{
      if(cancelled||!frameDocument.defaultView||!root.isConnected)return;
      root.querySelectorAll('[data-preview-focus]').forEach(el=>el.removeAttribute('data-preview-focus'));
      const elements=[...root.querySelectorAll<HTMLElement>('*')].filter(el=>!['STYLE','SCRIPT'].includes(el.tagName)&&el.getBoundingClientRect().width>0);
      const effectiveScale=scale*viewport/regionWidth;
      for(const el of elements){
        if([...el.childNodes].some(node=>node.nodeType===3&&node.textContent?.trim())){
          const size=parseFloat(frameDocument.defaultView!.getComputedStyle(el).fontSize);
          if(size*effectiveScale<10)el.style.fontSize=`${10/effectiveScale}px`;
        }
      }
      const path=focusedPath.map(key=>typeof key==='string'?key.replace(/(Ar|En)$/,locale==='ar'?'Ar':'En').replace(/^(ar|en)$/,locale):key);
      if(path[1]==='marketDistricts'&&typeof path.at(-1)==='string'&&String(path.at(-1)).endsWith('En'))path[path.length-1]=String(path.at(-1)).slice(0,-2);
      const value=readDraft(draft,path),text=typeof value==='string'?stripMarkdown(value).trim():'';
      const candidates=elements.filter(el=>el.getBoundingClientRect().height>0&&frameDocument.defaultView!.getComputedStyle(el).visibility!=='hidden');
      const phoneField=/phone|whatsapp/i.test(String(path.at(-1)));
      const matches=text?candidates.filter(el=>el.textContent?.trim()===text||(phoneField&&el.textContent?.replace(/\D/g,'')===text.replace(/\D/g,''))):[];
      const region=root.querySelector<HTMLElement>(`[data-preview-target="${target}"]`)||root;
      const numericPrice=path[1]==='marketDistricts'&&path.at(-1)==='pricePerSqm'?root.querySelector<HTMLElement>('.snapshot-metric-cell:nth-child(2) .cell-value'):null;
      const price=group==='listings'&&target==='price'?root.querySelector<HTMLElement>('.card-price'):null;
      const whatsapp=group==='contact'&&path.at(-1)==='whatsapp'?root.querySelector<HTMLElement>('.chat-agent-link'):null;
      const booleanRegion=typeof value==='boolean'&&region.getBoundingClientRect().height>0&&region.getBoundingClientRect().height<availableHeight/scale?region:null;
      const focused=numericPrice||price||whatsapp||matches.at(-1)||booleanRegion||candidates.find(el=>region.contains(el)&&/^(H[1-6]|P|PRE|SPAN|A|BDI)$/.test(el.tagName)&&el.textContent?.trim())||region;
      focused.dataset.previewFocus='';
      const naturalHeight=Math.ceil(root.getBoundingClientRect().height)+4;
      setHeight(Math.min(availableHeight/scale,naturalHeight));
      requestAnimationFrame(()=>{const view=frameDocument.defaultView;if(!cancelled&&view&&focused.isConnected)view.scrollTo({top:focused.getBoundingClientRect().top+view.scrollY-(view.innerHeight-focused.getBoundingClientRect().height)/2,behavior:'instant'});});
    };
    const observer=new ResizeObserver(layout);observer.observe(root);
    frameDocument.fonts.ready.then(layout);layout();
    return()=>{cancelled=true;observer.disconnect();};
  },[frameDocument,group,target,focusedPath,draft,locale,phone,scale,viewport,regionWidth,availableHeight]);
  return <section aria-label={isAr?'معاينة مباشرة':'Live preview'} className={styles.previewPanel}>
    <div className={styles.previewTools}><strong>{isAr?'معاينة مباشرة':'Live preview'}</strong>
      <button type="button" onClick={()=>setLocale(locale==='ar'?'en':'ar')}>{locale==='ar'?'EN':(isAr?'العربية':'Arabic')}</button>
      <button type="button" aria-pressed={phone} onClick={()=>setPhone(!phone)}>{phone?(isAr?'الهاتف':'Phone'):(isAr?'حاسوب':'Desktop')}</button>
      <button type="button" aria-pressed={dark} onClick={()=>setDark(!dark)}>{dark?(isAr?'داكن':'Dark'):(isAr?'فاتح':'Light')}</button>
    </div>
    <p className={styles.hint}>{isAr?'معاينة للمسودة. الروابط والإرسال غير متاحة هنا.':'Draft preview. Links and submissions are unavailable here.'}</p>
    <div className={styles.frameHost} ref={host}><iframe title={isAr?'معاينة الموقع':'Website preview'} ref={frame} onLoad={initialize} srcDoc="<!doctype html><html><head></head><body></body></html>" style={{width:viewport,height,zoom:scale}} />
      {frameDocument&&createPortal(<div inert><SettingsPreview {...{group,draft,locale,target,focusedPath,regionWidth,viewport}}/></div>,frameDocument.body)}
    </div>
  </section>;
}
