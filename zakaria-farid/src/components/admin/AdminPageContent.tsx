 'use client';
import React from 'react';
import { ABOUT_BLOCKS, type DraftPath, type DraftValue } from '@/lib/siteContent/settingsDraft';
import { type AboutPageContent, type SiteContentMap } from '@/lib/siteContent/defaults';
import { SettingsField, BilingualFlat } from './settings/SettingsFields';
import styles from './settings/Settings.module.css';
export default function AdminPageContent({ adminLocale, initialContent, savedContent, onChange, onFocus }: {
  adminLocale:string; initialContent:AboutPageContent; savedContent:AboutPageContent;
  onChange:(path:DraftPath,value:DraftValue)=>void; onFocus:(path:DraftPath)=>void;
}) {
  const isAr=adminLocale==='ar';
  const draft={about_page:initialContent} as SiteContentMap, saved={about_page:savedContent} as SiteContentMap;
  const props={draft,saved,isAr,onChange,onFocus};
  return <>{ABOUT_BLOCKS.map(block=><section className={styles.section} data-content-block={block.id} key={block.id}>
    <h3>{isAr?block.ar:block.en}</h3>
    <SettingsField {...props} path={['about_page',block.toggle]} name={block.toggle} />
    {block.fields.map(field=>field in initialContent?<SettingsField key={field} {...props} path={['about_page',field]} name={field} />:<BilingualFlat key={field} {...props} path={['about_page']} ar={field+'Ar'} en={field+'En'} name={field} />)}
  </section>)}</>;
}
