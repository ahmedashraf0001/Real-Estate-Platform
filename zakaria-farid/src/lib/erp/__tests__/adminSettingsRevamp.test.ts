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
const req=createRequire(import.meta.url); const Module=req('node:module'); const original=Module._load;
Module._load=function(id:string,...args:unknown[]){
  if(id==='@/app/actions/siteContent')return {saveSiteContent:async()=>({success:true})};
  if(id==='next/navigation')return { useRouter:()=>({push() {},refresh() {}}),useParams:()=>({locale:'ar'}),usePathname:()=>'/admin/ar/settings',redirect:(url:string)=>{throw new Error('REDIRECT '+url);} };
  return original.call(this,id,...args);
};
req.extensions['.css']=module=>{module.exports={__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};};
test('every real preview receives draft values in SSR and maps focused fields',()=>{
  const {SettingsPreview}=req('../../../components/admin/settings/SettingsPreview');
  const draft=initial();
  draft.platform_settings.home!.heroTitle1Ar='عنوان البيت التجريبي'; draft.about_page.heroTitle1Ar='عنوان المكتب التجريبي';
  draft.platform_settings.contact.email='preview@example.invalid'; draft.platform_settings.marketDistricts[0].districtAr='منطقة المعاينة';
  draft.platform_settings.whatsappAutomation!.faridAlertPhone='+201234567890';
  for(const [group,text] of [['home','عنوان البيت التجريبي'],['about','عنوان المكتب التجريبي'],['contact','preview@example.invalid'],['radar','منطقة المعاينة'],['whatsapp','201234567890']] as const){
    const html=renderToStaticMarkup(React.createElement(SettingsPreview,{group,draft,locale:'ar',target:'hero'})); assert.ok(html.includes(text),group+' draft value missing');
  }
  const render=(hide:boolean)=>renderToStaticMarkup(React.createElement(SettingsPreview,{group:'listings',draft:{...draft,platform_settings:{...draft.platform_settings,hidePropertyPrices:hide}},locale:'en',target:'price'}));
  assert.match(render(true),/Price on Application/); assert.doesNotMatch(render(false),/Price on Application/);
  assert.match(render(true),/data-preview-target="price"/);
  const listings=renderToStaticMarkup(React.createElement(SettingsPreview,{group:'listings',draft,locale:'ar',target:'plans'}));
  assert.match(listings,/id="architectural-cad-section"/);assert.match(listings,/class="location-suite-side"/);
  const hidden=renderToStaticMarkup(React.createElement(SettingsPreview,{group:'listings',draft:{...draft,platform_settings:{...draft.platform_settings,showFloorPlans:false,showCommuteTimes:false}},locale:'ar',target:'plans'}));
  assert.doesNotMatch(hidden,/id="architectural-cad-section"|class="location-suite-side"/);assert.match(hidden,/مخفي/);
  draft.about_page.stages[0].title.ar='معيار مسودة للمعاينة';
  const charter=renderToStaticMarkup(React.createElement(SettingsPreview,{group:'about',draft,locale:'ar',target:'charter'}));
  assert.match(charter,/معيار مسودة للمعاينة/);assert.doesNotMatch(charter,/عنوان المكتب التجريبي/);
  draft.platform_settings.home!.showHero=false;
  const home=renderToStaticMarkup(React.createElement(SettingsPreview,{group:'home',draft,locale:'ar',target:'hero'}));
  assert.doesNotMatch(home,/class="hero-section"/);assert.match(home,/مخفي/);

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
