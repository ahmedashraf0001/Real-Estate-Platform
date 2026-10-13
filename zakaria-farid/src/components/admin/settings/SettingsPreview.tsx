 'use client';
import React, { useMemo } from 'react';
import { PlatformSettingsProvider } from '@/lib/hooks/usePlatformSettings';
import { FavoritesProvider } from '@/lib/context/FavoritesContext';
import { HomeView } from '@/components/home/HomeView';
import { AboutView } from '@/components/about/AboutView';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyDetailView } from '@/components/property/PropertyDetailView';
import { FooterContact } from '@/components/Footer';
import { ContactCards } from '@/components/contact/ContactView';
import { MarketChart } from '@/components/MarketChart';
import { formatFaridWhatsAppLeadMessage, formatInternationalWhatsAppNumber } from '@/lib/services/whatsappNotifier';
import { DEFAULT_PLATFORM_SETTINGS } from '@/lib/services/marketIntelligence';
import { DEFAULT_ABOUT_CONTENT, type SiteContentMap } from '@/lib/siteContent/defaults';
import { ABOUT_BLOCKS, type DraftPath, type SettingsGroup } from '@/lib/siteContent/settingsDraft';
import { buildZoneInstances } from '@/lib/layering/instances';
import { adaptProperty } from '@/lib/utils/propertyAdapter';
import type { Property } from '@/lib/supabase/types';

const homeSections=[['showHero','hero','الواجهة الرئيسية','Hero'],['showStatsRibbon','stats','الإحصاءات','Statistics'],['showFeaturedGrid','featured','العقارات المميزة','Featured listings'],['showMapExplorer','map','الخريطة','Map'],['showSovereignAdvisory','advisory','الاستشارات','Advisory'],['showSellerConsignment','seller','دعوة البائعين','Seller invitation']] as const;
export function SettingsPreview({group,draft,locale,target,focusedPath=[],regionWidth=480,viewport=1440}:{group:SettingsGroup;draft:SiteContentMap;locale:string;target:string;focusedPath?:DraftPath;regionWidth?:number;viewport?:number}) {
  const isAr=locale==='ar',settings=draft.platform_settings;
  // Explicitly isolated preview data, derived from existing defaults; never a persistence payload.
  const listing=useMemo(()=>{
    const [lat,lng]=DEFAULT_ABOUT_CONTENT.coordinates.en.match(/[\d.]+/g)!.map(Number);
    const record:Property={id:'settings-preview',slug:'settings-preview',title_en:DEFAULT_PLATFORM_SETTINGS.home!.featuredTitle1En!,title_ar:DEFAULT_PLATFORM_SETTINGS.home!.featuredTitle1Ar!,description_en:'',description_ar:'',price_egp:DEFAULT_PLATFORM_SETTINGS.marketDistricts[0].pricePerSqm,area_sqm:0,bedrooms:0,bathrooms:0,type:'apartment',location:DEFAULT_PLATFORM_SETTINGS.marketDistricts[0].district,latitude:lat,longitude:lng,completion_status:'ready',listing_status:'active',is_featured:false,created_at:'',property_images:[],spec_layers:buildZoneInstances('apartment','fully_finished')};
    return adaptProperty(record,isAr?'ar':'en');
  },[isAr]);
  const selectedBlock=ABOUT_BLOCKS.find(block=>block.id===target)||ABOUT_BLOCKS[0];
  const automation=settings.whatsappAutomation!;
  const previewListingHref=`/${locale}/properties/${listing.slug}`;
  return <PlatformSettingsProvider settings={settings}><FavoritesProvider><div data-settings-preview={group} data-highlight={target} dir={isAr?'rtl':'ltr'} style={{width:regionWidth,zoom:viewport/regionWidth}}>
    {group==='home'&&<><HomeView locale={locale} preview /><div className="preview-section-list">{homeSections.map(([flag,id,ar,en])=><div key={flag} data-preview-target={id}><strong>{isAr?ar:en}</strong><span>{settings.home?.[flag]===false?(isAr?'مخفي':'Hidden'):(isAr?'ظاهر':'Visible')}</span></div>)}</div></>}
    {group==='about'&&<div data-about-preview data-preview-target={selectedBlock.id}>{draft.about_page[selectedBlock.toggle]?<AboutView locale={locale} content={draft.about_page} block={selectedBlock.id} preview previewChapter={focusedPath[1]==='chapters'?Number(focusedPath[2])||0:0}/>:<p className="preview-hidden">{isAr?'مخفي':'Hidden'} · {isAr?selectedBlock.ar:selectedBlock.en}</p>}</div>}
    {group==='listings'&&<><p className="preview-caption">{isAr?'عقار للمعاينة فقط — لا يُحفظ':'Preview listing only — never saved'}</p><div className="preview-listing-card" data-preview-target="price"><PropertyCard preview property={listing} locale={locale} onSelect={()=>{window.location.href=previewListingHref;}}/></div>
      <div className="preview-detail"><PropertyDetailView property={listing} locale={locale} preview /></div>
      {!settings.showFloorPlans&&<p data-preview-target="plans" className="preview-hidden">{isAr?'المخططات · مخفي':'Floor plans · Hidden'}</p>}
      {!settings.showCommuteTimes&&<p data-preview-target="commute" className="preview-hidden">{isAr?'أوقات الوصول · مخفي':'Travel times · Hidden'}</p>}
      <div data-preview-target="radar">{settings.showMarketRadar?<MarketChart locale={locale} preview previewDistrictId={focusedPath[1]==='marketDistricts'?settings.marketDistricts[Number(focusedPath[2])]?.id:undefined}/>:<p className="preview-hidden">{isAr?'مؤشر الأسعار · مخفي':'Price index · Hidden'}</p>}</div>
      <div data-preview-target="vip">{settings.showVIPAlerts?<p className="preview-caption">{isAr?'التنبيهات الخاصة مفعلة':'VIP alerts enabled'}</p>:<p className="preview-hidden">{isAr?'التنبيهات الخاصة · مخفي':'VIP alerts · Hidden'}</p>}</div></>}
    {group==='contact'&&<><footer className="luxury-footer" data-preview-target="contact"><FooterContact locale={locale}/></footer><div className="contact-page" data-preview-target="contact"><ContactCards locale={locale}/></div></>}
    {group==='radar'&&<div data-preview-target="radar">{settings.showMarketRadar?<MarketChart locale={locale} preview previewDistrictId={focusedPath[1]==='marketDistricts'?settings.marketDistricts[Number(focusedPath[2])]?.id:undefined}/>:<p className="preview-hidden">{isAr?'مؤشر الأسعار مخفي. فعّله من عرض العقارات.':'Price index hidden. Enable it in Listings display.'}</p>}{settings.marketDistricts.every(d=>!d.isEnabled)&&<p className="preview-hidden">{isAr?'لا توجد مناطق مفعلة':'No enabled districts'}</p>}</div>}
    {group==='whatsapp'&&<section data-preview-target="whatsapp" className="preview-message"><p>{isAr?'رسالة معاينة فقط':'Preview message only'}</p><p>{isAr?'المستلم':'Recipient'}: <bdi dir="ltr">{formatInternationalWhatsAppNumber(automation.faridAlertPhone)}</bdi></p>{!automation.isEnabled&&<p>{isAr?'إرسال التنبيهات معطل':'Alert delivery disabled'}</p>}<pre>{formatFaridWhatsAppLeadMessage({name:isAr?'عميل المعاينة':'Preview client',phone:settings.contact.whatsapp,email:settings.contact.email,propertyTitle:listing.title,message:isAr?'استفسار تجريبي للمعاينة':'Sample preview inquiry'})}</pre></section>}
    <style>{`
      [data-settings-preview] { background:var(--bg-primary);color:var(--text-primary);min-height:0;padding:16px;box-sizing:border-box; }
      [data-settings-preview] .preview-caption,[data-settings-preview] .preview-hidden {padding:20px;border:1px solid var(--border-color);border-radius:12px;}
      [data-settings-preview] .preview-hidden {border-style:dashed;color:var(--text-muted);}
      .preview-section-list {display:grid;gap:10px;margin-top:16px;} .preview-section-list > div {display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border-color);}
      .preview-listing-card {max-width:390px;margin:0 auto 24px;}
      .preview-detail .gallery-section,.preview-detail .detail-layout,.preview-detail .top-header-left,.preview-detail .top-action-group,.preview-detail .location-suite-main,.preview-detail .use-location-btn {display:none;}
      .preview-detail .header-main-hero-row,.preview-detail .location-suite-grid {display:block;}
      .preview-detail .top-header-right {width:100%;justify-content:flex-start;}
      .preview-detail .location-suite-side {width:100%;}
      [data-settings-preview=contact] .contact-sidebar-col {width:100%;}
      .preview-message {padding:24px;max-width:620px;margin:auto;} .preview-message pre {white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg-card);border:1px solid var(--border-color);padding:24px;border-radius:12px;font:inherit;line-height:2;}
      [data-preview-focus] {outline:3px solid var(--gold-primary);outline-offset:-3px;scroll-margin:12px;}
      [data-settings-preview] *,[data-settings-preview] *::before,[data-settings-preview] *::after {animation:none!important;transition:none!important;}
      [data-settings-preview] .container {width:100%;padding:0;}
      [data-settings-preview] .atelier-about-page {min-height:0;}
      [data-about-preview] section {padding:24px 12px!important;min-height:0!important;}
      [data-about-preview] .atelier-hero-title {font-size:48px;}
      [data-about-preview] .atelier-hero-container {padding:0;}
      [data-about-preview] .atelier-section-header {margin-bottom:24px;}
      [data-about-preview] .metrology-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));}
      [data-about-preview] .paravent-deck-container {display:block;height:auto;min-height:0;max-height:none;}
      [data-about-preview] .paravent-panel.collapsed {display:none;}
      [data-about-preview] .paravent-panel.expanded {height:auto;min-height:0;}
      [data-about-preview] .paravent-spine {display:none;}
      [data-about-preview] .paravent-body,[data-about-preview] .paravent-content-inner {min-width:0;position:static;width:auto;height:auto;padding:24px;overflow:visible;}
      [data-about-preview] .atelier-portal-card {padding:24px;}
      [data-about-preview] .portal-inner-wrap {width:100%;}
      [data-settings-preview=contact] .luxury-footer {padding:24px;margin-bottom:16px;}
      [data-settings-preview=contact] .contact-page {min-height:0;padding:0;}
      [data-settings-preview=home] .hero-section {min-height:480px!important;height:auto!important;padding:24px 12px!important;}
      [data-settings-preview=home] .hero-title {font-size:${regionWidth<480?32:48}px!important;display:flex!important;flex-direction:column;gap:12px;height:auto!important;min-height:0!important;}
      [data-settings-preview=home] .hero-title > span {position:static!important;transform:none!important;display:block!important;height:auto!important;min-height:0!important;line-height:1.2!important;font-size:inherit!important;}
      [data-settings-preview=home] .hero-title-glass-card {height:auto!important;min-height:0!important;}

      [data-settings-preview=home] .home-view {min-height:0;}
      [data-settings-preview=home] .hero-content {padding:24px 0;}
      [data-settings-preview=home] .metrology-ribbon-grid {display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px;}
      [data-settings-preview=home] .metrology-sep {display:none;}
      [data-settings-preview=home] .metrology-cell {min-width:0!important;padding:12px;max-width:100%;}
      [data-settings-preview=home] .metrology-num {font-size:28px!important;}
      [data-settings-preview=home] .metrology-lbl,[data-settings-preview=home] .metrology-desc {white-space:normal!important;overflow-wrap:anywhere;max-width:100%;}

      [data-settings-preview=home] .quick-search-panel {width:100%;}
      [data-settings-preview=home] .hero-scroll-hint {display:none;}
      [data-theme=light] [data-settings-preview] .hero-image-dark,[data-theme=light] [data-settings-preview] .hero-dim-dark,[data-theme=light] [data-settings-preview] .hero-fade-dark,
      [data-theme=dark] [data-settings-preview] .hero-image-light,[data-theme=dark] [data-settings-preview] .hero-dim-light,[data-theme=dark] [data-settings-preview] .hero-fade-light {display:none;}
      [data-settings-preview=home] .hero-title span {white-space:normal!important;max-width:100%;min-width:0;overflow-wrap:anywhere;}
      [data-settings-preview=home] .hero-title {max-width:100%;min-width:0;}
      [data-settings-preview=home] .home-view > [data-preview-target]:not([data-preview-target=${target}]),
      [data-settings-preview=home] .preview-section-list > div:not([data-preview-target=${target}]) {display:none;}
      [data-settings-preview=home] .featured-section,[data-settings-preview=home] .seller-banner-section {padding:24px 0;}
      [data-settings-preview=home] .seller-consignment-banner {padding:24px;}
      [data-settings-preview=home] .seller-banner-content,[data-settings-preview=home] .seller-eyebrow-row,[data-settings-preview=home] .seller-stats-strip {flex-wrap:wrap;}
      [data-about-preview] .founder-letter-card {padding:24px;}
      [data-about-preview] .founder-quote-serif {width:auto!important;margin-inline:0!important;overflow-wrap:anywhere;}
      [data-about-preview] .metrology-cell {min-width:0;padding:16px 8px;}
      [data-about-preview] .metrology-num {font-size:28px;line-height:1.2;overflow-wrap:anywhere;}
      [data-settings-preview=home] .hero-search-wrapper {position:static;margin:24px 0 0;width:100%;}
      [data-settings-preview=home] .quick-search-bar {display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:16px!important;}
      [data-settings-preview=home] .search-field {width:auto!important;min-width:0!important;padding:0!important;}
      [data-settings-preview=home] .field-label,[data-settings-preview=home] .trigger-value {white-space:normal!important;overflow:visible!important;text-overflow:clip;overflow-wrap:anywhere;}

      [data-settings-preview=home] .search-divider {display:none;}
      [data-settings-preview=home] .search-submit-btn {grid-column:1/-1;width:100%;}

      [data-settings-preview=listings] .preview-listing-card {display:${target==='price'?'block':'none'};}
      [data-settings-preview=listings] .preview-detail {display:${target==='plans'||target==='commute'?'block':'none'};}
      [data-settings-preview=listings] > [data-preview-target]:not([data-preview-target=${target}]) {display:none;}
      .preview-detail .property-top-header,.preview-detail .content-section:not([data-preview-target=plans]),.preview-detail .gps-locate-btn {display:none;}
      .preview-detail .location-suite-section {display:${target==='commute'?'block':'none'};}
      .preview-detail [data-preview-target=plans] {display:${target==='plans'?'block':'none'};}
      .preview-detail .property-detail-view,.preview-detail .location-suite-section,.preview-detail .content-section {min-height:0;padding:0;margin:0;}

      [data-about-preview] .founder-letter-top,[data-about-preview] .founder-letter-signoff,[data-about-preview] .portal-actions-group {flex-wrap:wrap;}


    `}</style>
  </div></FavoritesProvider></PlatformSettingsProvider>;
}
