 'use client';
import React from 'react';
import MarkdownDescriptionEditor from '../MarkdownDescriptionEditor';
import { readDraft, type DraftPath, type DraftValue } from '@/lib/siteContent/settingsDraft';
import { SITE_CONTENT_DEFAULTS, type SiteContentMap } from '@/lib/siteContent/defaults';
import styles from './Settings.module.css';
const aboutLabels: Record<string, string> = {
  coordinates: 'المواقع والإحداثيات', imageAlt: 'وصف صورة الواجهة', badge: 'الشريط التعريفي', heroTitle1: 'العنوان الأول', heroTitle2: 'العنوان الثاني', manifesto: 'النبذة', heroCta1Text: 'رابط الدليل', heroCta2Text: 'رابط الاستشارة',
  stats: 'الإحصاءات', value: 'القيمة (تُخفى إذا كانت فارغة)', label: 'التسمية', paraventEyebrow: 'الترويسة', paraventTitle: 'العنوان', paraventDesc: 'المقدمة', chapterLabel: 'تسمية الفصل', chapters: 'الفصول', year: 'التاريخ', tag: 'الترويسة', title: 'العنوان', subtitle: 'الوصف المختصر', narrative: 'السردية', metrics: 'إحصاءات الفصل',
  curationEyebrow: 'الترويسة', curationTitle: 'العنوان', curationDesc: 'المقدمة', acceptLabel: 'تسمية القبول', rejectLabel: 'تسمية الاستبعاد', stages: 'مراحل الفحص', description: 'وصف المرحلة', accept: 'معايير القبول', reject: 'معايير الاستبعاد', reportPrompt: 'دعوة طلب التقرير', reportLink: 'رابط طلب التقرير',
  founderEyebrow: 'الترويسة', founderEst: 'التأسيس', founderQuote: 'رسالة المؤسس', founderName: 'الاسم', founderTitle: 'الصفة', founderStamp: 'الختم', portalEyebrow: 'الترويسة', portalHeading: 'العنوان', portalParagraph: 'المقدمة', portalCtaBtn: 'رابط التواصل', portalCatalog: 'رابط الدليل',
};

const fieldLabels: Record<string, [string,string]> = {
  showMetrology:['إظهار الإحصاءات','Show statistics'], showParavent:['إظهار السردية','Show story'], showCuration:['إظهار ميثاق الفحص','Show inspection charter'], showFounder:['إظهار رسالة المؤسس','Show founder message'], showPortal:['إظهار التواصل والاستشارة','Show contact and advisory'],
  showHero:['الواجهة الرئيسية','Hero'], showStatsRibbon:['شريط الإحصاءات','Statistics ribbon'], showFeaturedGrid:['العقارات المميزة','Featured listings'], showMapExplorer:['استكشاف الخريطة','Map explorer'], showSovereignAdvisory:['الاستشارات','Advisory'], showSellerConsignment:['دعوة البائعين','Seller invitation'],
  heroBadge:['الشريط التعريفي','Hero badge'], heroTitle1:['العنوان الأول','First heading'], heroTitle2:['العنوان الثاني','Second heading'], heroSubtitle:['مقدمة الصفحة','Hero introduction'], featuredEyebrow:['ترويسة العقارات','Featured eyebrow'], featuredTitle1:['عنوان العقارات الأول','Featured first heading'], featuredTitle2:['عنوان العقارات الثاني','Featured second heading'], sellerTitle1:['دعوة البائع الأول','Seller first heading'], sellerTitle2:['دعوة البائع الثاني','Seller second heading'], sellerDesc:['وصف دعوة البائع','Seller description'],
  hidePropertyPrices:['إخفاء أسعار العقارات','Hide property prices'], showFloorPlans:['إظهار المخططات','Show floor plans'], showCommuteTimes:['إظهار أوقات الوصول','Show travel times'], showVIPAlerts:['إظهار التنبيهات الخاصة','Show VIP alerts'], showMarketRadar:['إظهار مؤشر الأسعار','Show market radar'],
  phone:['الهاتف','Phone'], whatsapp:['واتساب','WhatsApp'], email:['البريد الإلكتروني','Email'], address:['عنوان المقر','Office address'], marketDistricts:['المناطق','Districts'], rank:['الترتيب','Rank'], district:['المنطقة','District'], subDistrict:['المنطقة الفرعية','Subdistrict'], category:['التصنيف','Category'], pricePerSqm:['سعر المتر','Price per square metre'], medianTotal:['متوسط السعر الإجمالي','Median total'], fiveYearGain:['نمو خمس سنوات','Five year gain'], historical5Yr:['الأسعار التاريخية لخمس سنوات','Five year history'], insight:['تحليل المنطقة','District insight'], isEnabled:['تفعيل','Enabled'],
  provider:['مزود الخدمة','Provider'], faridAlertPhone:['رقم مستلم التنبيهات','Alert recipient'], metaPhoneNumberId:['معرّف هاتف المنصة','Platform phone identifier'], metaBusinessAccountId:['معرّف حساب الأعمال','Business account identifier'], ultraMsgInstanceId:['معرّف نسخة الخدمة','Service instance identifier'], twilioAccountSid:['معرّف حساب الرسائل','Messaging account identifier'], twilioFromNumber:['رقم إرسال الرسائل','Sender number'], webhookUrl:['رابط استقبال التنبيهات','Notification webhook URL'],
};
function blank(value: DraftValue): DraftValue {
  if (Array.isArray(value)) return [];
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,blank(item)]));
  return typeof value === 'boolean' ? value : typeof value === 'number' ? 0 : '';
}
export function SettingsField({ draft, saved, path, name, isAr, onChange, onFocus, value: provided, fallback: providedFallback }: {
  draft: SiteContentMap; saved: SiteContentMap; path: DraftPath; name: string; isAr: boolean;
  onChange: (path: DraftPath, value: DraftValue) => void; onFocus: (path: DraftPath) => void;
  value?: DraftValue; fallback?: DraftValue;
}) {
  const value = provided ?? readDraft(draft,path), fallback = providedFallback ?? readDraft(SITE_CONTENT_DEFAULTS,path);
  const label = isAr ? fieldLabels[name]?.[0] || aboutLabels[name] || 'النص' : fieldLabels[name]?.[1] || name.replace(/([A-Z])/g,' $1');
  const dirty = JSON.stringify(value) !== JSON.stringify(readDraft(saved,path));
  const id = path.join('-');
  const child = (nextPath: DraftPath, nextName: string, item?: DraftValue, defaultItem?: DraftValue) => <SettingsField key={nextPath.join('-')} {...{draft,saved,isAr,onChange,onFocus}} path={nextPath} name={nextName} value={item} fallback={defaultItem} />;
  if (Array.isArray(value)) {
    const defaults = fallback as DraftValue[];
    return <section className={styles.list} data-dirty={dirty || undefined} onFocusCapture={()=>onFocus(path)}><h3>{label}</h3>
      {!value.length && <p>{isAr ? 'لا توجد عناصر. أضف عنصراً للبدء.' : 'No items. Add an item to begin.'}</p>}
      {value.map((item,index)=><div className={styles.listItem} key={typeof item === 'object' && !Array.isArray(item) && item.id ? String(item.id) : index}>
        <div className={styles.listActions}><span>{index+1}</span>
          <button type="button" disabled={index===0} onClick={()=>{const next=[...value]; [next[index-1],next[index]]=[next[index],next[index-1]]; onChange(path,next);}}>{isAr?'لأعلى':'Move up'}</button>
          <button type="button" disabled={index===value.length-1} onClick={()=>{const next=[...value]; [next[index+1],next[index]]=[next[index],next[index+1]]; onChange(path,next);}}>{isAr?'لأسفل':'Move down'}</button>
          <button type="button" onClick={()=>onChange(path,value.filter((_,i)=>i!==index))}>{isAr?'حذف':'Remove'}</button>
        </div>{child([...path,index],name,item,defaults?.[index] ?? defaults?.[0] ?? 0)}
      </div>)}
      <button type="button" onClick={()=>{ const item=blank(defaults?.[0] ?? 0); if(name==='marketDistricts' && typeof item==='object' && !Array.isArray(item)) item.id=crypto.randomUUID(); onChange(path,[...value,item]); }}>{isAr?'إضافة':'Add'} {label}</button>
    </section>;
  }
  if (value && typeof value === 'object') {
    if ('ar' in value && 'en' in value) return <fieldset className={styles.field}><legend>{label}</legend><div className={styles.languages}>
      {(['ar','en'] as const).map(language=>{
        const childPath = [...path,language];
        const inputId=id+'-'+language;
        const long=/manifesto|Desc|Subtitle|narrative|description|Quote|Paragraph|insight|address/i.test(name);
        return <div key={language} data-dirty={JSON.stringify(value[language])!==JSON.stringify(readDraft(saved,childPath)) || undefined} onFocusCapture={()=>onFocus(childPath)}>
          <label htmlFor={inputId}>{language==='ar'?(isAr?'العربية':'Arabic'):'EN'}</label>
          {long?<MarkdownDescriptionEditor id={inputId} value={String(value[language])} language={language} isAr={isAr} onChange={text=>onChange(childPath,text)} />:<input id={inputId} dir={language==='ar'?'rtl':'ltr'} value={String(value[language])} onChange={event=>onChange(childPath,event.target.value)} />}
        </div>;
      })}</div></fieldset>;
    const keys=Object.keys(value);
    return <>{keys.filter(key=>key!=='id' && !key.endsWith('Ar') && !key.endsWith('En')).map(key=>{
      if(key==='district'||key==='subDistrict'||key==='category'||key==='medianTotal'||key==='insight') {
        const ar=key+'Ar'; if(ar in value)return <BilingualFlat key={key} {...{draft,saved,isAr,onChange,onFocus}} path={path} ar={ar} en={key} name={key} />;
      }
      return child([...path,key],key,value[key],(fallback as Record<string,DraftValue>)?.[key]);
    })}{keys.filter(key=>key.endsWith('Ar')).map(ar=>{
      const base=ar.slice(0,-2),en=base+'En';
      if(!(en in value))return null;
      return <BilingualFlat key={base} {...{draft,saved,isAr,onChange,onFocus}} path={path} ar={ar} en={en} name={base} />;
    })}</>;
  }
  if(typeof value==='boolean') return <label className={styles.toggle} data-dirty={dirty || undefined} onFocusCapture={()=>onFocus(path)}><span><strong>{label}</strong><small>{isAr?'يُطبّق على الموقع بعد حفظ التغييرات.':'Applies to the website after saving changes.'}</small></span><input id={id} role="switch" type="checkbox" checked={value} onChange={event=>onChange(path,event.target.checked)} /></label>;
  const providers=[['meta_cloud_api','منصة الأعمال الرسمية','Official business platform'],['ultramsg','بوابة الرسائل','Message gateway'],['twilio','خدمة الرسائل','Messaging service'],['custom_webhook','رابط مخصص','Custom webhook'],['direct_link','رابط مباشر','Direct link']];
  return <div className={styles.field} data-dirty={dirty || undefined} onFocusCapture={()=>onFocus(path)}><label htmlFor={id}>{label}</label>
    {name==='provider'?<select id={id} value={String(value)} onChange={event=>onChange(path,event.target.value)}>{providers.map(([key,ar,en])=><option value={key} key={key}>{isAr?ar:en}</option>)}</select>:<input id={id} type={typeof value==='number'?'number':'text'} step={typeof value==='number'?'any':undefined} dir="ltr" value={String(value ?? '')} onChange={event=>{ const next=typeof value==='number'?Number(event.target.value):event.target.value; if(typeof next!=='number'||Number.isFinite(next))onChange(path,next); }} />}
  </div>;
}
export function BilingualFlat({path,ar,en,name,...props}: Omit<React.ComponentProps<typeof SettingsField>,'value'|'fallback'> & {ar:string;en:string}) {
  // Flat persisted fields keep their exact original names; pair only in the editor.
  const label=props.isAr?fieldLabels[name]?.[0]||aboutLabels[name]||'النص':fieldLabels[name]?.[1]||name;
  const long=/manifesto|Desc|Subtitle|narrative|Quote|Paragraph|insight|address/i.test(name);
  return <fieldset className={styles.field}><legend>{label}</legend><div className={styles.languages}>{([['ar',ar],['en',en]] as const).map(([language,key])=>{
    const fieldPath=[...path,key],id=fieldPath.join('-'),value=String(readDraft(props.draft,fieldPath)??'');
    return <div key={key} data-dirty={value!==String(readDraft(props.saved,fieldPath)??'') || undefined} onFocusCapture={()=>props.onFocus(fieldPath)}><label htmlFor={id}>{language==='ar'?(props.isAr?'العربية':'Arabic'):'EN'}</label>
      {long?<MarkdownDescriptionEditor {...{id,value,language}} isAr={props.isAr} onChange={text=>props.onChange(fieldPath,text)} />:<input {...{id,value}} dir={language==='ar'?'rtl':'ltr'} onChange={event=>props.onChange(fieldPath,event.target.value)} />}
    </div>;
  })}</div></fieldset>;
}
