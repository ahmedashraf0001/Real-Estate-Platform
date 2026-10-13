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
import { ABOUT_BLOCKS, type SettingsGroup } from '@/lib/siteContent/settingsDraft';
import { buildZoneInstances } from '@/lib/layering/instances';
import { adaptProperty } from '@/lib/utils/propertyAdapter';
import type { Property } from '@/lib/supabase/types';

const homeSections=[['showHero','hero','الواجهة الرئيسية','Hero'],['showStatsRibbon','stats','الإحصاءات','Statistics'],['showFeaturedGrid','featured','العقارات المميزة','Featured listings'],['showMapExplorer','map','الخريطة','Map'],['showSovereignAdvisory','advisory','الاستشارات','Advisory'],['showSellerConsignment','seller','دعوة البائعين','Seller invitation']] as const;
export function SettingsPreview({group,draft,locale,target}:{group:SettingsGroup;draft:SiteContentMap;locale:string;target:string}) {
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
  return <PlatformSettingsProvider settings={settings}><FavoritesProvider><div data-settings-preview={group} data-highlight={target} dir={isAr?'rtl':'ltr'}>
    {group==='home'&&<><HomeView locale={locale} preview /><div className="preview-section-list">{homeSections.map(([flag,id,ar,en])=><div key={flag} data-preview-target={id}><strong>{isAr?ar:en}</strong><span>{settings.home?.[flag]===false?(isAr?'مخفي':'Hidden'):(isAr?'ظاهر':'Visible')}</span></div>)}</div></>}
    {group==='about'&&<div data-about-preview data-preview-target={selectedBlock.id}>{draft.about_page[selectedBlock.toggle]?<AboutView locale={locale} content={draft.about_page} block={selectedBlock.id}/>:<p className="preview-hidden">{isAr?'مخفي':'Hidden'} · {isAr?selectedBlock.ar:selectedBlock.en}</p>}</div>}
    {group==='listings'&&<><p className="preview-caption">{isAr?'عقار للمعاينة فقط — لا يُحفظ':'Preview listing only — never saved'}</p><div className="preview-listing-card" data-preview-target="price"><PropertyCard property={listing} locale={locale} onSelect={()=>{window.location.href=previewListingHref;}}/></div>
      <div className="preview-detail"><PropertyDetailView property={listing} locale={locale} preview /></div>
      {!settings.showFloorPlans&&<p data-preview-target="plans" className="preview-hidden">{isAr?'المخططات · مخفي':'Floor plans · Hidden'}</p>}
      {!settings.showCommuteTimes&&<p data-preview-target="commute" className="preview-hidden">{isAr?'أوقات الوصول · مخفي':'Travel times · Hidden'}</p>}
      <div data-preview-target="radar">{settings.showMarketRadar?<MarketChart locale={locale}/>:<p className="preview-hidden">{isAr?'مؤشر الأسعار · مخفي':'Price index · Hidden'}</p>}</div>
      <div data-preview-target="vip">{settings.showVIPAlerts?<p className="preview-caption">{isAr?'التنبيهات الخاصة مفعلة':'VIP alerts enabled'}</p>:<p className="preview-hidden">{isAr?'التنبيهات الخاصة · مخفي':'VIP alerts · Hidden'}</p>}</div></>}
    {group==='contact'&&<><div className="luxury-footer" data-preview-target="contact"><FooterContact locale={locale}/></div><div className="contact-page" data-preview-target="contact"><ContactCards locale={locale}/></div></>}
    {group==='radar'&&<div data-preview-target="radar">{settings.showMarketRadar?<MarketChart locale={locale}/>:<p className="preview-hidden">{isAr?'مؤشر الأسعار مخفي. فعّله من عرض العقارات.':'Price index hidden. Enable it in Listings display.'}</p>}{settings.marketDistricts.every(d=>!d.isEnabled)&&<p className="preview-hidden">{isAr?'لا توجد مناطق مفعلة':'No enabled districts'}</p>}</div>}
    {group==='whatsapp'&&<section data-preview-target="whatsapp" className="preview-message"><p>{isAr?'رسالة معاينة فقط':'Preview message only'}</p><p>{isAr?'المستلم':'Recipient'}: <bdi dir="ltr">{formatInternationalWhatsAppNumber(automation.faridAlertPhone)}</bdi></p>{!automation.isEnabled&&<p>{isAr?'إرسال التنبيهات معطل':'Alert delivery disabled'}</p>}<pre>{formatFaridWhatsAppLeadMessage({name:isAr?'عميل المعاينة':'Preview client',phone:settings.contact.whatsapp,email:settings.contact.email,propertyTitle:listing.title,message:isAr?'استفسار تجريبي للمعاينة':'Sample preview inquiry'})}</pre></section>}
    <style>{`
      [data-settings-preview] { background:var(--bg-primary);color:var(--text-primary);min-height:100vh;padding:16px; }
      [data-settings-preview] .preview-caption,[data-settings-preview] .preview-hidden {padding:20px;border:1px solid var(--border-color);border-radius:12px;}
      [data-settings-preview] .preview-hidden {border-style:dashed;color:var(--text-muted);}
      [data-settings-preview=home] .hero-section {min-height:600px!important;height:600px!important;}
      .preview-section-list {display:grid;gap:10px;margin-top:16px;} .preview-section-list > div {display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border-color);}
      .preview-listing-card {max-width:390px;margin:0 auto 24px;}
      .preview-detail .gallery-section,.preview-detail .detail-layout,.preview-detail .top-header-left,.preview-detail .top-action-group,.preview-detail .location-suite-main,.preview-detail .use-location-btn {display:none;}
      .preview-detail .header-main-hero-row,.preview-detail .location-suite-grid {display:block;}
      .preview-detail .top-header-right {width:100%;justify-content:flex-start;}
      .preview-detail .location-suite-side {width:100%;}
      [data-settings-preview=contact] .contact-sidebar-col {width:100%;}
      .preview-message {padding:24px;max-width:620px;margin:auto;} .preview-message pre {white-space:pre-wrap;overflow-wrap:anywhere;background:var(--bg-card);border:1px solid var(--border-color);padding:24px;border-radius:12px;font:inherit;line-height:2;}
      [data-highlight=hero] [data-preview-target=hero], [data-highlight=stats] [data-preview-target=stats], [data-highlight=featured] [data-preview-target=featured], [data-highlight=map] [data-preview-target=map], [data-highlight=advisory] [data-preview-target=advisory], [data-highlight=seller] [data-preview-target=seller], [data-highlight=story] [data-preview-target=story], [data-highlight=charter] [data-preview-target=charter], [data-highlight=founder] [data-preview-target=founder], [data-highlight=portal] [data-preview-target=portal], [data-highlight=price] [data-preview-target=price], [data-highlight=plans] [data-preview-target=plans], [data-highlight=commute] [data-preview-target=commute], [data-highlight=contact] [data-preview-target=contact], [data-highlight=radar] [data-preview-target=radar], [data-highlight=whatsapp] [data-preview-target=whatsapp], [data-highlight=vip] [data-preview-target=vip] {outline:3px solid var(--gold-primary);outline-offset:-3px;}
    `}</style>
  </div></FavoritesProvider></PlatformSettingsProvider>;
}
