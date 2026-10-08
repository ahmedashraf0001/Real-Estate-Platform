import type { Statement } from './builders';
import { statementHtml } from './statementHtml';

/** Isolate the evidence document from the FIN-OS page and await Arabic fonts before printing. */
export async function printStatement(model: Statement): Promise<void> {
  const html = statementHtml(model, window.location.origin);
  const frame = document.createElement('iframe');
  frame.title = model.title;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0';
  const originalTitle = document.title;
  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error('تعذر تحميل كشف الحساب'));
      frame.srcdoc = html;
      document.body.append(frame);
    });
    const target = frame.contentWindow;
    if (!target) throw new Error('تعذر فتح كشف الحساب للطباعة');
    const fonts = target.document.fonts;
    await Promise.all([400, 500, 700].map(weight => fonts.load(`${weight} 12px ThmanyahSans`)));
    await fonts.ready;
    if (![400, 500, 700].every(weight => fonts.check(`${weight} 12px ThmanyahSans`))) throw new Error('تعذر تحميل خط كشف الحساب');
    document.title = `${model.number} ${model.name}`;
    await new Promise<void>(resolve => {
      target.addEventListener('afterprint', () => resolve(), { once: true });
      target.focus();
      target.print();
    });
  } finally {
    document.title = originalTitle;
    frame.remove();
  }
}
