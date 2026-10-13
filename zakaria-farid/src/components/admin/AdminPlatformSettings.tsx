 'use client';
import React,{useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {usePlatformSettings} from '@/lib/hooks/usePlatformSettings';
import {saveSiteContent} from '@/app/actions/siteContent';
import {mergeSiteContent,PRIVATE_AUTOMATION_FIELDS,type AboutPageContent,type SiteContentMap,type SiteContentKey} from '@/lib/siteContent/defaults';
import {SETTINGS_GROUPS,dirtySettings,updateDraft,resetGroup,saveSettingsDraft,settingsGroupFromUrl,shouldWarnNavigation,previewTarget,type SettingsGroup,type DraftPath,type DraftValue} from '@/lib/siteContent/settingsDraft';
import {installSettingsNavigationGuard,requestSettingsNavigation} from '@/lib/siteContent/settingsNavigationGuard';
import AdminPageContent from './AdminPageContent';
import {SettingsField} from './settings/SettingsFields';
import {PreviewPanel} from './settings/PreviewPanel';
import styles from './settings/Settings.module.css';
interface AdminPlatformSettingsProps {
  adminLocale:string;initialAboutContent:AboutPageContent;initialGroup?:SettingsGroup;
  lastSaved?:{updatedAt?:string;actor?:string};
}
export default function AdminPlatformSettings({adminLocale,initialAboutContent,initialGroup='home',lastSaved}:AdminPlatformSettingsProps) {
  const isAr=adminLocale==='ar',initialSettings=usePlatformSettings(),router=useRouter();
  const [saved,setSaved]=useState<SiteContentMap>(()=>({platform_settings:structuredClone(initialSettings),about_page:structuredClone(initialAboutContent)}));
  const [draft,setDraft]=useState(saved),[group,setGroup]=useState(initialGroup),[target,setTarget]=useState('hero');
  const [status,setStatus]=useState<'idle'|'saving'|'saved'>('idle'),[errors,setErrors]=useState<Partial<Record<SiteContentKey,string>>>({});
  const [wide,setWide]=useState(true),[previewOpen,setPreviewOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null),nav=useRef<HTMLElement>(null);
  const [barBounds,setBarBounds]=useState<{left:number;width:number}>();
  const dialog=useRef<HTMLDialogElement>(null),previewButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const measure=()=>{if(root.current){const rect=root.current.getBoundingClientRect();setBarBounds({left:rect.left,width:rect.width});}};
    const observer=new ResizeObserver(measure);if(root.current)observer.observe(root.current);
    window.addEventListener('resize',measure);measure();return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
  },[]);
  useEffect(()=>{nav.current?.querySelector<HTMLElement>('[aria-current=page]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[group]);
  const dirty=dirtySettings(saved,draft),hasChanges=dirty.count>0;
  const savedRef=useRef(saved);savedRef.current=saved;
  const dirtyRef=useRef(hasChanges);dirtyRef.current=hasChanges;
  const savingRef=useRef(false),guardInstalled=useRef(false);
  const warning=isAr?'توجد تغييرات غير محفوظة. مغادرة الصفحة وتجاهلها؟':'Unsaved changes. Leave and discard them?';
  useEffect(()=>{const media=window.matchMedia('(min-width:1200px)');const sync=()=>{setWide(media.matches);if(media.matches)setPreviewOpen(false);};sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  useEffect(()=>{if(previewOpen&&!wide)dialog.current?.showModal();else dialog.current?.close();},[previewOpen,wide]);
  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current||savingRef.current){event.preventDefault();event.returnValue='';}};
    const click=(event:MouseEvent)=>{
      const element=event.target instanceof Element?event.target:null,link=element?.closest<HTMLAnchorElement>('a[href]');
      if(!link||link.target==='_blank'||link.hasAttribute('download')||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      if(!requestSettingsNavigation(link.href)){event.preventDefault();event.stopImmediatePropagation();}
    };
    const uninstall=installSettingsNavigationGuard(target=>{
      if(!shouldWarnNavigation(dirtyRef.current||savingRef.current,location.href,target))return true;
      if(savingRef.current||!confirm(warning))return false;
      dirtyRef.current=false;setDraft(structuredClone(savedRef.current));return true;
    });
    const sync=()=>{setGroup(settingsGroupFromUrl(location.search));};sync();
    window.addEventListener('beforeunload',beforeUnload);document.addEventListener('click',click,true);window.addEventListener('popstate',sync);
    return()=>{uninstall();window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('click',click,true);window.removeEventListener('popstate',sync);};
  },[warning]);
  // Keep exactly one sentinel; Back skips it after save/discard, without extra clicks.
  useEffect(()=>{
    if(hasChanges&&!guardInstalled.current){
      history.pushState({...history.state,settingsDraftGuard:true},'',location.href);
      guardInstalled.current=true;
    }
  },[hasChanges]);
  useEffect(()=>{
    const back=()=>{
      if(!guardInstalled.current||history.state?.settingsDraftGuard)return;
      if(savingRef.current||(dirtyRef.current&&!confirm(warning))){history.go(1);return;}
      guardInstalled.current=false;dirtyRef.current=false;history.back();
    };
    window.addEventListener('popstate',back);
    return()=>window.removeEventListener('popstate',back);
  },[warning]);
  const change=(path:DraftPath,value:DraftValue)=>{if(savingRef.current)return;setDraft(previous=>updateDraft(previous,path,value));setStatus('idle');setErrors({});};
  const focus=(path:DraftPath)=>setTarget(previewTarget(group,path));
  const selectGroup=(next:SettingsGroup)=>{
    const url=new URL(location.href);url.searchParams.set('group',next);history.replaceState(history.state,'',url);setGroup(next);setTarget(next==='about'||next==='home'?'hero':next==='listings'?'price':next);
  };
  const save=async()=>{
    if(savingRef.current||!hasChanges)return;
    savingRef.current=true;setStatus('saving');setErrors({});
    const result=await saveSettingsDraft(saved,draft,saveSiteContent);
    const normalized=structuredClone(result.saved),next=structuredClone(draft);
    for(const key of ['platform_settings','about_page'] as const){
      if(!result.errors[key]){Object.assign(normalized,{[key]:mergeSiteContent(key,result.saved[key])});Object.assign(next,{[key]:normalized[key]});}
    }
    setSaved(normalized);setDraft(next);setErrors(result.errors);setStatus(Object.keys(result.errors).length?'idle':'saved');savingRef.current=false;router.refresh();
  };
  const discard=()=>{if(confirm(isAr?'تجاهل كل التغييرات غير المحفوظة؟':'Discard all unsaved changes?')){setDraft(structuredClone(saved));setErrors({});setStatus('idle');}};
  const restore=()=>{if(confirm(isAr?'استعادة الافتراضي لهذا القسم؟ لن يُحفظ حتى تضغط حفظ التغييرات.':"Restore this group's defaults? Changes remain a draft until saved.")){setDraft(previous=>resetGroup(previous,group));setStatus('idle');setErrors({});}};
  const field=(path:DraftPath,name:string)=><SettingsField key={path.join('-')} {...{draft,saved,isAr,onChange:change,onFocus:focus,path,name}}/>;
  const selected=SETTINGS_GROUPS.find(item=>item.id===group)!;
  const lastDate=lastSaved?.updatedAt?new Date(lastSaved.updatedAt):null;
  return <div ref={root} className={styles.root} dir={isAr?'rtl':'ltr'} data-admin-settings>
    <header className={styles.header}><div><h1>{isAr?'الإعدادات':'Settings'}</h1><p>{lastDate&&!Number.isNaN(lastDate.getTime())?<>{isAr?'آخر حفظ':'Last saved'} {lastDate.toLocaleString(isAr?'ar-EG':'en-GB')}{lastSaved?.actor&&<> · {isAr?'بواسطة':'by'} <bdi>{lastSaved.actor}</bdi></>}</>:isAr?'لم يُحفظ محتوى مخصص بعد':'No custom content saved yet'}</p></div>
      <button type="button" ref={previewButton} className={styles.previewButton} onClick={()=>setPreviewOpen(true)}>{isAr?'معاينة':'Preview'}</button>
    </header>
    <div className={styles.layout}>
      <nav ref={nav} className={styles.nav} aria-label={isAr?'مجموعات الإعدادات':'Settings groups'}>{SETTINGS_GROUPS.map(item=><button type="button" key={item.id} aria-current={group===item.id?'page':undefined} onClick={()=>selectGroup(item.id)} data-settings-group={item.id}>{isAr?item.ar:item.en}{dirty.groups.includes(item.id)&&<span className={styles.dot} aria-label={isAr?'تغييرات غير محفوظة':'Unsaved changes'}>•</span>}</button>)}</nav>
      <section className={styles.form} aria-label={isAr?selected.ar:selected.en}>
        <div className={styles.groupHeader}><h2>{isAr?selected.ar:selected.en}</h2><p>{isAr?selected.descriptionAr:selected.descriptionEn}</p></div>
        <fieldset disabled={status==='saving'} className={styles.editFields}>
          {group==='home'&&field(['platform_settings','home'],'home')}
          {group==='about'&&<AdminPageContent {...{adminLocale,initialContent:draft.about_page,savedContent:saved.about_page,onChange:change,onFocus:focus}}/>}
          {group==='listings'&&['hidePropertyPrices','showFloorPlans','showCommuteTimes','showVIPAlerts','showMarketRadar'].map(name=>field(['platform_settings',name],name))}
          {group==='contact'&&field(['platform_settings','contact'],'contact')}
          {group==='radar'&&field(['platform_settings','marketDistricts'],'marketDistricts')}
          {group==='whatsapp'&&Object.keys(draft.platform_settings.whatsappAutomation!).filter(key=>!(PRIVATE_AUTOMATION_FIELDS as readonly string[]).includes(key)).map(key=>field(['platform_settings','whatsappAutomation',key],key))}
          <button type="button" className={styles.reset} onClick={restore}>{isAr?'استعادة الافتراضي':'Restore defaults'}</button>
        </fieldset>
        {(['platform_settings','about_page'] as const).filter(key=>errors[key]).map(key=><p key={key} role="alert" className={styles.error}>{isAr?`تعذر حفظ ${key==='about_page'?'محتوى من نحن':'إعدادات المنصة'}. تبقى التغييرات لإعادة المحاولة.`:`Unable to save ${key==='about_page'?'About content':'platform settings'}: ${errors[key]}`}</p>)}
      </section>
      {wide&&<aside className={styles.preview}><PreviewPanel {...{group,draft,isAr,target}}/></aside>}
    </div>
    {!wide&&<dialog ref={dialog} className={styles.previewDialog} onCancel={()=>setPreviewOpen(false)} onClose={()=>{setPreviewOpen(false);previewButton.current?.focus();}} aria-label={isAr?'معاينة':'Preview'}><button type="button" onClick={()=>setPreviewOpen(false)}>{isAr?'إغلاق المعاينة':'Close preview'}</button>{previewOpen&&<PreviewPanel {...{group,draft,isAr,target}}/>}</dialog>}
    <div className={styles.saveBar} style={barBounds?{position:'fixed',left:barBounds.left,width:barBounds.width,boxSizing:'border-box'}:undefined} role="region" aria-label={isAr?'حفظ التغييرات':'Save changes'}><span role="status" aria-live="polite">{status==='saving'?(isAr?'جارٍ الحفظ…':'Saving…'):status==='saved'?(isAr?'تم حفظ التغييرات':'Changes saved'):dirty.count===0?(isAr?'لا توجد تغييرات غير محفوظة':'No unsaved changes'):dirty.count===1?(isAr?'تغيير واحد غير محفوظ':'1 unsaved change'):`${dirty.count} ${isAr?'تغييرات غير محفوظة':'unsaved changes'}`}</span><div><button type="button" disabled={!hasChanges||status==='saving'} onClick={discard}>{isAr?'تجاهل':'Discard'}</button><button type="button" className={styles.primary} disabled={!hasChanges||status==='saving'} onClick={save}>{isAr?'حفظ التغييرات':'Save changes'}</button></div></div>
  </div>;
}
