import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SITE_CONTENT_DEFAULTS } from '../../siteContent/defaults';
import { dirtySettings, updateDraft, resetGroup, saveSettingsDraft, previewTarget, settingsGroupFromUrl, shouldWarnNavigation } from '../../siteContent/settingsDraft';

const initial = () => structuredClone(SITE_CONTENT_DEFAULTS);
test('draft counts changed fields, marks only affected groups, discard and group reset preserve other drafts', () => {
  const saved = initial();
  let draft = updateDraft(saved, ['platform_settings','home','heroTitle1Ar'], 'تغيير');
  draft = updateDraft(draft, ['platform_settings','hidePropertyPrices'], true);
  draft = updateDraft(draft, ['about_page','heroTitle1Ar'], 'عنوان');
  assert.equal(saved.platform_settings.hidePropertyPrices, false);
  assert.deepEqual(dirtySettings(saved,draft).groups, ['home','about','listings']);
  assert.equal(dirtySettings(saved,draft).count, 3);
  draft = resetGroup(draft,'home');
  assert.equal(draft.platform_settings.home?.heroTitle1Ar,saved.platform_settings.home?.heroTitle1Ar);
  assert.equal(draft.platform_settings.hidePropertyPrices,true);
  assert.equal(dirtySettings(saved,structuredClone(saved)).count,0);
});
test('single save writes only changed keys; partial failures retain failed draft and successful baseline', async () => {
  const saved = initial();
  const draft = updateDraft(updateDraft(saved,['platform_settings','hidePropertyPrices'],true),['about_page','heroTitle1Ar'],'تغيير');
  const writes: unknown[] = [];
  const result = await saveSettingsDraft(saved,draft,async (key,content) => { writes.push({key,content}); return key === 'about_page' ? {success:false,error:'denied'} : {success:true}; });
  assert.deepEqual(writes,[{key:'platform_settings',content:draft.platform_settings},{key:'about_page',content:draft.about_page}]);
  assert.equal(result.saved.platform_settings.hidePropertyPrices,true);
  assert.equal(result.saved.about_page.heroTitle1Ar,saved.about_page.heroTitle1Ar);
  assert.deepEqual(result.errors,{about_page:'denied'});
  const retry: string[] = [];
  await saveSettingsDraft(result.saved,draft,async key => {retry.push(key);return {success:true};});
  assert.deepEqual(retry,['about_page']);
  const unchangedWrites: unknown[]=[];
  await saveSettingsDraft(saved,saved,async (key,content)=>{unchangedWrites.push({key,content}); return {success:true};});
  assert.deepEqual(unchangedWrites,[]);
});
test('toggle edits do not write; reset defaults remains a draft; guard permits group changes but warns leaving', () => {
  const saved = initial(); const changed = updateDraft(saved,['platform_settings','showFloorPlans'],false);
  assert.equal(dirtySettings(saved,changed).count,1);
  assert.equal(saved.platform_settings.showFloorPlans,true);
  assert.equal(resetGroup(changed,'listings').platform_settings.showFloorPlans,true);
  assert.equal(shouldWarnNavigation(true,'https://test/admin/ar/settings?group=home','https://test/admin/ar/settings?group=about'),false);
  assert.equal(shouldWarnNavigation(true,'https://test/admin/ar/settings','https://test/admin/ar/properties'),true);
  assert.equal(shouldWarnNavigation(false,'https://test/admin/ar/settings','https://test/admin/ar/properties'),false);
  assert.equal(settingsGroupFromUrl('?group=about'),'about');
  assert.equal(settingsGroupFromUrl('?group=invalid'),'home');
  assert.equal(previewTarget('home',['platform_settings','home','heroTitle1Ar']),'hero');
  assert.equal(previewTarget('about',['about_page','stages',0,'title','ar']),'charter');
  assert.equal(previewTarget('listings',['platform_settings','showCommuteTimes']),'commute');
});
let previewDraft: ReturnType<typeof initial> | null = null;
let previewFocus = 'price';
const req=createRequire(import.meta.url); const Module=req('node:module'); const original=Module._load;
Module._load=function(id:string,...args:unknown[]){
  if(id==='@/lib/hooks/usePlatformSettings') {
    const actual = original.call(this,id,...args);
    return { ...actual, usePlatformSettings: () => previewDraft?.platform_settings || actual.usePlatformSettings(),
      useSettingsPreview: () => previewDraft ? {active:true,value:{draft:previewDraft,target:previewFocus,focusedPath:[]}} : actual.useSettingsPreview() };
  }
  if(id==='@/app/actions/siteContent')return {saveSiteContent:async()=>({success:true})};
  if(id==='next/navigation')return { useRouter:()=>({push() {},refresh() {}}),useParams:()=>({locale:'ar'}),usePathname:()=>'/admin/ar/settings',redirect:(url:string)=>{throw new Error('REDIRECT '+url);} };
  return original.call(this,id,...args);
};
req.extensions['.css']=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};};
test('real About consumes draft override and section visibility; empty sample uses real card and detail toggles',()=>{
  const {AboutView}=req('../../../components/about/AboutView');
  const {PreviewEmptyProperty}=req('../../../components/property/PreviewEmptyProperty');
  const {FavoritesProvider}=req('../../context/FavoritesContext');
  const draft=initial(); draft.about_page.heroTitle1En='Draft About title';
  previewDraft=draft;
  const about=()=>renderToStaticMarkup(React.createElement(AboutView,{locale:'en',content:initial().about_page}));
  assert.match(about(),/Draft About title/);
  draft.about_page.showHero=false;assert.doesNotMatch(about(),/Draft About title/);
  const sample=()=>renderToStaticMarkup(React.createElement(FavoritesProvider,null,React.createElement(PreviewEmptyProperty,{locale:'en'})));
  assert.match(sample(),/Preview sample/);assert.match(sample(),/class="property-card/);
  draft.platform_settings.hidePropertyPrices=true;assert.match(sample(),/Price on Application/);
  draft.platform_settings.hidePropertyPrices=false;assert.doesNotMatch(sample(),/Price on Application/);
  previewFocus='plans';assert.match(sample(),/id="architectural-cad-section"/);
  draft.platform_settings.showFloorPlans=false;assert.doesNotMatch(sample(),/id="architectural-cad-section"/);
  previewFocus='commute';assert.match(sample(),/class="location-suite-side"/);
  draft.platform_settings.showCommuteTimes=false;assert.doesNotMatch(sample(),/class="location-suite-side"/);
  previewDraft=null;assert.equal(sample(),'');
});
test('WhatsApp bubble keeps draft phone and public groups no longer render compact regions',()=>{
  const {SettingsPreview}=req('../../../components/admin/settings/SettingsPreview');
  const draft=initial();draft.platform_settings.whatsappAutomation!.faridAlertPhone='+201234567890';
  const html=renderToStaticMarkup(React.createElement(SettingsPreview,{group:'whatsapp',draft,locale:'en'}));
  assert.match(html,/Preview message only/);assert.match(html,/201234567890/);
  for(const group of ['home','about','contact','listings','radar'])assert.equal(renderToStaticMarkup(React.createElement(SettingsPreview,{group,draft,locale:'en'})),'');
});
test('legacy content route redirects to unified About settings and sidebar drops duplicate editor',async()=>{
  const route=req('../../../app/admin/(dashboard)/[adminLocale]/(dashboard-pages)/page-content/page').default;
  await assert.rejects(()=>route({params:Promise.resolve({adminLocale:'ar'})}),/REDIRECT \/admin\/ar\/settings\?group=about/);
  const {readFileSync}=req('node:fs');
  assert.doesNotMatch(readFileSync('src/components/admin/AdminSidebar.tsx','utf8'),/\/page-content/);
});

test('all group editors expose exact schema fields, localized labels, and no provider credentials in SSR',()=>{
  const Settings=req('../../../components/admin/AdminPlatformSettings').default;
  const defaults=initial();
  const html=(group:string)=>renderToStaticMarkup(React.createElement(Settings,{adminLocale:'ar',initialAboutContent:defaults.about_page,initialGroup:group}));
  for(const group of ['home','about','listings','contact','radar','whatsapp']){
    const markup=html(group);
    assert.match(markup,/data-admin-settings/);assert.doesNotMatch(markup,/metaAccessToken|ultraMsgToken|twilioAuthToken|<form/);
    const text=markup.replace(/<[^>]*>/g,' ').replace(/EN/g,'');
    assert.doesNotMatch(text,/\b(?:Home|About|Settings|Provider|Show|Hide|Add|Remove|Reset|Save)\b/,group);
  }
  for(const flag of ['showFloorPlans','showCommuteTimes','showVIPAlerts','showMarketRadar','hidePropertyPrices'])assert.ok(html('listings').includes('platform_settings-'+flag),flag);
  for(const field of Object.keys(defaults.platform_settings.home!))assert.ok(html('home').includes('platform_settings-home-'+field),field);
});
test('group defaults reset only their persisted subtree and preserve keys and unrelated edits',()=>{
  const saved=initial();
  const dirty=updateDraft(updateDraft(saved,['platform_settings','contact','phone'],'changed'),['about_page','heroTitle1En'],'changed');
  const contact=resetGroup(dirty,'contact');assert.deepEqual(contact.platform_settings.contact,saved.platform_settings.contact);assert.equal(contact.about_page.heroTitle1En,'changed');
  const about=resetGroup(dirty,'about');assert.deepEqual(about.about_page,saved.about_page);assert.equal(about.platform_settings.contact.phone,'changed');
});

test('programmatic navigation guard returns the Settings decision, blocks callers, and cleans up on unmount',()=>{
  const {installSettingsNavigationGuard,requestSettingsNavigation}=req('../../siteContent/settingsNavigationGuard');
  assert.equal(requestSettingsNavigation('/admin/ar/properties'),true);
  const targets:string[]=[];
  const uninstall=installSettingsNavigationGuard((target:string)=>{targets.push(target);return target.includes('?group=');});
  assert.equal(requestSettingsNavigation('/admin/ar/properties'),false);
  assert.equal(requestSettingsNavigation('/admin/ar/settings?group=about'),true);
  assert.equal(requestSettingsNavigation('/admin/login'),false);
  assert.deepEqual(targets,['/admin/ar/properties','/admin/ar/settings?group=about','/admin/login']);
  uninstall();assert.equal(requestSettingsNavigation('/admin/ar/properties'),true);
});
