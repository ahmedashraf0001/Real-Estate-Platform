'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AboutView } from '@/components/about/AboutView';
import MarkdownDescriptionEditor from './MarkdownDescriptionEditor';
import { DEFAULT_ABOUT_CONTENT, mergeSiteContent, type AboutPageContent } from '@/lib/siteContent/defaults';
import { saveSiteContent, resetSiteContent } from '@/app/actions/siteContent';
import styles from './AdminPageContent.module.css';

const blocks = [
  { id: 'hero', ar: 'الواجهة الرئيسية', en: 'Hero', toggle: 'showHero', fields: ['coordinates', 'imageAlt', 'badge', 'heroTitle1', 'heroTitle2', 'manifesto', 'heroCta1Text', 'heroCta2Text'] },
  { id: 'stats', ar: 'الإحصاءات', en: 'Statistics', toggle: 'showMetrology', fields: ['stats'] },
  { id: 'story', ar: 'السردية والفصول', en: 'Story & chapters', toggle: 'showParavent', fields: ['paraventEyebrow', 'paraventTitle', 'paraventDesc', 'chapterLabel', 'chapters'] },
  { id: 'charter', ar: 'ميثاق الفحص', en: 'Inspection charter', toggle: 'showCuration', fields: ['curationEyebrow', 'curationTitle', 'curationDesc', 'acceptLabel', 'rejectLabel', 'stages', 'reportPrompt', 'reportLink'] },
  { id: 'founder', ar: 'رسالة المؤسس', en: 'Founder', toggle: 'showFounder', fields: ['founderEyebrow', 'founderEst', 'founderQuote', 'founderName', 'founderTitle', 'founderStamp'] },
  { id: 'portal', ar: 'التواصل والاستشارة', en: 'Contact & advisory', toggle: 'showPortal', fields: ['portalEyebrow', 'portalHeading', 'portalParagraph', 'portalCtaBtn', 'portalCatalog'] },
] as const;
const labels: Record<string, string> = {
  coordinates: 'المواقع والإحداثيات', imageAlt: 'وصف صورة الواجهة', badge: 'الشريط التعريفي', heroTitle1: 'العنوان الأول', heroTitle2: 'العنوان الثاني', manifesto: 'النبذة', heroCta1Text: 'رابط الدليل', heroCta2Text: 'رابط الاستشارة',
  stats: 'الإحصاءات', value: 'القيمة (تُخفى إذا كانت فارغة)', label: 'التسمية', paraventEyebrow: 'الترويسة', paraventTitle: 'العنوان', paraventDesc: 'المقدمة', chapterLabel: 'تسمية الفصل', chapters: 'الفصول', year: 'التاريخ', tag: 'الترويسة', title: 'العنوان', subtitle: 'الوصف المختصر', narrative: 'السردية', metrics: 'إحصاءات الفصل',
  curationEyebrow: 'الترويسة', curationTitle: 'العنوان', curationDesc: 'المقدمة', acceptLabel: 'تسمية القبول', rejectLabel: 'تسمية الاستبعاد', stages: 'مراحل الفحص', description: 'وصف المرحلة', accept: 'معايير القبول', reject: 'معايير الاستبعاد', reportPrompt: 'دعوة طلب التقرير', reportLink: 'رابط طلب التقرير',
  founderEyebrow: 'الترويسة', founderEst: 'التأسيس', founderQuote: 'رسالة المؤسس', founderName: 'الاسم', founderTitle: 'الصفة', founderStamp: 'الختم', portalEyebrow: 'الترويسة', portalHeading: 'العنوان', portalParagraph: 'المقدمة', portalCtaBtn: 'رابط التواصل', portalCatalog: 'رابط الدليل',
};
type Path = (string | number)[];
type Json = string | boolean | Json[] | { [key: string]: Json };
function blank(value: Json): Json {
  if (Array.isArray(value)) return [];
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blank(item)]));
  return typeof value === 'boolean' ? value : '';
}

export default function AdminPageContent({ adminLocale, initialContent }: { adminLocale: string; initialContent: AboutPageContent }) {
  const isAr = adminLocale === 'ar';
  const router = useRouter();
  const [draft, setDraft] = useState(initialContent);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<typeof blocks[number]['id']>('hero');
  const [previewLocale, setPreviewLocale] = useState(adminLocale);
  const update = (path: Path, value: Json) => {
    setDraft(previous => {
      const next = structuredClone(previous);
      if (path.length === 2 && !(path[0] in next) && (path[1] === 'ar' || path[1] === 'en')) {
        (next as unknown as Record<string, Json>)[`${path[0]}${path[1] === 'ar' ? 'Ar' : 'En'}`] = value;
        return next;
      }
      let target = next as unknown as Record<string | number, Json>;
      for (const key of path.slice(0, -1)) target = target[key] as Record<string | number, Json>;
      target[path[path.length - 1]] = value;
      return next;
    });
    setStatus('idle');
  };
  const save = async (reset = false) => {
    if (reset && !confirm(isAr ? 'استعادة المحتوى الافتراضي لكل الأقسام؟' : 'Restore defaults for every block?')) return;
    setStatus('saving'); setError('');
    const result = reset ? await resetSiteContent('about_page') : await saveSiteContent('about_page', draft);
    if (!result.success) { setStatus('error'); setError(isAr ? 'تعذر حفظ المحتوى. تحقق من تسجيل الدخول وإتاحة جدول المحتوى ثم حاول مجدداً.' : result.error || 'Unable to save content.'); return; }
    if (reset) setDraft(structuredClone(DEFAULT_ABOUT_CONTENT));
    setStatus('saved'); router.refresh();
  };

  const editor = (value: Json, fallback: Json, path: Path, name: string): React.ReactNode => {
    const id = path.join('-');
    const label = isAr ? labels[name] || 'النص' : name;
    if (Array.isArray(value)) {
      const defaults = fallback as Json[];
      return <div className={styles.list} key={id}><h3>{label}</h3>
        {value.map((item, index) => <div className={styles.listItem} key={index}>
          <div className={styles.listActions}>
            <span>{index + 1}</span>
            <button type="button" disabled={status === 'saving' || index === 0} onClick={() => { const next = [...value]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(path, next); }}>{isAr ? 'لأعلى' : 'Move up'}</button>
            <button type="button" disabled={status === 'saving' || index === value.length - 1} onClick={() => { const next = [...value]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update(path, next); }}>{isAr ? 'لأسفل' : 'Move down'}</button>
            <button type="button" disabled={status === 'saving'} onClick={() => update(path, value.filter((_, i) => i !== index))}>{isAr ? 'حذف' : 'Remove'}</button>
          </div>
          {editor(item, defaults[index] ?? defaults[0], [...path, index], name)}
        </div>)}
        <button type="button" disabled={status === 'saving'} onClick={() => update(path, [...value, blank(defaults[0])])}>{isAr ? 'إضافة' : 'Add'} {label}</button>
      </div>;
    }
    if (typeof value === 'object') {
      const defaults = fallback as Record<string, Json>;
      if ('ar' in value && 'en' in value) return <fieldset className={styles.field} key={id}><legend>{label}</legend><div className={styles.languages}>
        {(['ar', 'en'] as const).map(language => {
          const fieldId = `${id}-${language}`;
          const long = /manifesto|Desc|narrative|description|Quote|Paragraph/i.test(name);
          return <div key={language}><label htmlFor={fieldId}>{language === 'ar' ? (isAr ? 'العربية' : 'AR') : 'EN'}</label>
            {long ? <MarkdownDescriptionEditor value={value[language] as string} onChange={text => update([...path, language], text)} language={language} isAr={isAr} id={fieldId} placeholder={defaults[language] as string} />
              : <input id={fieldId} dir={language === 'ar' ? 'rtl' : 'ltr'} value={value[language] as string} placeholder={defaults[language] as string} onChange={event => update([...path, language], event.target.value)} />}
          </div>;
        })}
      </div></fieldset>;
      return <div key={id}>{Object.entries(value).map(([key, item]) => editor(item, defaults[key], [...path, key], key))}</div>;
    }
    return null;
  };

  const merged = mergeSiteContent('about_page', draft);
  const selected = blocks.find(block => block.id === preview)!;
  return <div className={styles.root} dir={isAr ? 'rtl' : 'ltr'}>
    <header className={styles.header}><div><h1>{isAr ? 'محتوى الصفحات' : 'Page content'}</h1><p>{isAr ? 'تحرير صفحة من نحن. الحقل الفارغ يستخدم النص الافتراضي؛ قيم الإحصاءات الفارغة تُخفى.' : 'Edit the About page. Empty text uses defaults; empty statistics are hidden.'}</p></div>
      <div className={styles.actions}><button type="button" disabled={status === 'saving'} onClick={() => save(true)}>{isAr ? 'استعادة الافتراضي' : 'Reset defaults'}</button>
        <button type="button" className={styles.primary} disabled={status === 'saving'} onClick={() => save()}>{status === 'saving' ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : status === 'saved' ? (isAr ? 'تم الحفظ' : 'Saved') : (isAr ? 'حفظ التعديلات' : 'Save changes')}</button></div>
    </header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.layout}><fieldset className={styles.editFields} disabled={status === 'saving'}>
      {blocks.map(block => <section className={styles.block} data-content-block={block.id} key={block.id}>
        <div className={styles.blockHeader}><h2>{isAr ? block.ar : block.en}</h2><button type="button" aria-pressed={preview === block.id} onClick={() => setPreview(block.id)}>{isAr ? 'معاينة' : 'Preview'}</button></div>
        <label className={styles.visibility}><input type="checkbox" checked={draft[block.toggle]} onChange={event => update([block.toggle], event.target.checked)} />{isAr ? 'إظهار القسم' : 'Show block'}</label>
        {block.fields.map(field => {
          const source = draft as unknown as Record<string, Json>;
          const defaults = DEFAULT_ABOUT_CONTENT as unknown as Record<string, Json>;
          if (field in source) return editor(source[field], defaults[field], [field], field);
          const ar = field + 'Ar', en = field + 'En';
          return <React.Fragment key={field}>{editor({ ar: source[ar], en: source[en] }, { ar: defaults[ar], en: defaults[en] }, [field], field)}</React.Fragment>;
        })}
      </section>)}
    </fieldset><aside className={styles.preview}>
      <div className={styles.blockHeader}><h2>{isAr ? 'معاينة مباشرة' : 'Live preview'}</h2><button type="button" onClick={() => setPreviewLocale(current => current === 'ar' ? 'en' : 'ar')}>{previewLocale === 'ar' ? 'EN' : (isAr ? 'العربية' : 'AR')}</button></div>
      <div data-about-preview data-theme="light"><AboutView locale={previewLocale} content={{ ...merged, [selected.toggle]: true }} block={preview} /></div>
    </aside></div>
  </div>;
}
