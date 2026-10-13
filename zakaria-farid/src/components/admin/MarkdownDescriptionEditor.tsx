'use client';
import React, { useRef, useState } from 'react';
import { miniMarkdown } from '@/lib/markdown/miniMarkdown';
import { insertMarkdown, type MarkdownAction } from '@/lib/markdown/insertMarkdown';
import styles from './AdminPropertyForm.module.css';

export default function MarkdownDescriptionEditor({ value, onChange, language, isAr, id, placeholder }: { value: string; onChange: (value: string) => void; language: 'ar' | 'en'; isAr: boolean; id?: string; placeholder?: string }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const tools: [MarkdownAction, string, string][] = [
    ['bold', 'B', isAr ? 'عريض' : 'Bold'], ['italic', 'I', isAr ? 'مائل' : 'Italic'],
    ['list', '•', isAr ? 'قائمة' : 'List'], ['ordered', '1.', isAr ? 'قائمة مرقمة' : 'Numbered list'],
    ['heading', 'H', isAr ? 'عنوان' : 'Heading'],
  ];
  const insert = (action: MarkdownAction) => {
    const field = textarea.current;
    if (!field) return;
    const next = insertMarkdown(value, field.selectionStart, field.selectionEnd, action);
    onChange(next.text);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(next.start, next.end); });
  };
  return <div className={styles.markdownEditor}>
    <div className={styles.markdownToolbar} role="group" aria-label={isAr ? 'تنسيق الوصف' : 'Description formatting'}>
      {tools.map(([action, label, title]) => <button key={action} type="button" aria-label={title} title={title} disabled={preview} onMouseDown={e => e.preventDefault()} onClick={() => insert(action)}>{label}</button>)}
      <button type="button" aria-pressed={preview} onClick={() => setPreview(!preview)}>{isAr ? 'معاينة' : 'Preview'}</button>
    </div>
    {preview ? <div className={`mini-markdown ${styles.markdownPreview}`} aria-live="polite">{miniMarkdown(value)}</div>
      : <textarea id={id} placeholder={placeholder} ref={textarea} className={styles.input} rows={8} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-label={language === 'ar' ? 'الوصف بالعربية' : 'EN'} value={value} onChange={e => onChange(e.target.value)} />}
    <p className={styles.markdownHelp}>{isAr ? 'يدعم: **عريض**، *مائل*، القوائم، عناوين (#)، خط فاصل (---)' : 'Supports: **bold**, *italic*, lists, headings (#), horizontal rule (---)'}</p>
  </div>;
}
