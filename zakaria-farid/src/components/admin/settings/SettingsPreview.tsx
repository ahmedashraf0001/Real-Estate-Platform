 'use client';
import React from 'react';
import { formatFaridWhatsAppLeadMessage, formatInternationalWhatsAppNumber } from '@/lib/services/whatsappNotifier';
import type { SiteContentMap } from '@/lib/siteContent/defaults';
import type { SettingsGroup } from '@/lib/siteContent/settingsDraft';
import styles from './Settings.module.css';

// WhatsApp has no public route. All other groups load their actual route in PreviewPanel.
export function SettingsPreview({group,draft,locale}:{group:SettingsGroup;draft:SiteContentMap;locale:string}) {
  if(group!=='whatsapp')return null;
  const isAr=locale==='ar',settings=draft.platform_settings,automation=settings.whatsappAutomation!;
  return <section data-preview-target="whatsapp" className={`settings-message-preview ${styles.messagePreview}`} dir={isAr?'rtl':'ltr'}>
    <p>{isAr?'رسالة معاينة فقط':'Preview message only'}</p>
    <p>{isAr?'المستلم':'Recipient'}: <bdi dir="ltr">{formatInternationalWhatsAppNumber(automation.faridAlertPhone)}</bdi></p>
    {!automation.isEnabled&&<p>{isAr?'إرسال التنبيهات معطل':'Alert delivery disabled'}</p>}
    <pre>{formatFaridWhatsAppLeadMessage({name:isAr?'عميل المعاينة':'Preview client',phone:settings.contact.whatsapp,email:settings.contact.email,propertyTitle:isAr?settings.home!.featuredTitle1Ar!:settings.home!.featuredTitle1En!,message:isAr?'استفسار تجريبي للمعاينة':'Sample preview inquiry'})}</pre>
  </section>;
}
