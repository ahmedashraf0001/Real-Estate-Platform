import { D } from '../math';
import { formatAmount as amount, type Statement } from './builders';
import { statementCss } from './statementCss';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** All record strings are text nodes, never trusted markup. Font URLs must be an HTTP(S) origin. */
export function statementHtml(model: Statement, fontOrigin: string): string {
  const origin = new URL(fontOrigin);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('عنوان خطوط الكشف غير صالح');
  const css = statementCss.replaceAll('__FONT_ORIGIN__', escape(origin.origin));
  const header = `<div class="head"><div class="co">شركة زكريا فريد للتطوير العقاري<small>كشف رسمي مستخرج من دفتر الأستاذ العام</small></div><div class="doc"><div class="t">${escape(model.title)}</div><div class="meta"><span>رقم الكشف</span><b class="num">${escape(model.number)}</b><span>تاريخ الإصدار</span><b class="num">${escape(model.issued)}</b><span>${model.kind === 'P' ? 'الفترة' : 'حتى تاريخ'}</span><b>${model.kind === 'P' ? 'من الإنشاء حتى تاريخه' : escape(model.issued.slice(0, 10))}</b></div></div></div>`;
  const identity = `<div class="id">${model.identity.filter(field => field.value).map(field => `<div><span>${escape(field.label)}</span><b${field.numeric ? ' class="num"' : ''}>${escape(field.value!)}</b></div>`).join('')}</div>`;
  const summary = model.summary.length ? `<h2>الملخص</h2><div class="sum">${model.summary.map(item => `<div><div class="k">${escape(item.label)}</div><div class="v num">${amount(item.value)}</div>${(item.details || []).map(detail => `<div class="s"><span>${escape(detail.label)}</span><b class="num${detail.bad ? ' bad' : ''}">${detail.value.endsWith('%') ? escape(detail.value) : amount(detail.value)}</b></div>`).join('')}</div>`).join('')}</div>` : '';
  const timeline = model.timeline?.length ? `<h2>مراحل العقار</h2><div class="tl">${model.timeline.map(item => `<div${item.future ? ' class="fut"' : ''}><b>${escape(item.label)}</b>${item.date ? `<span class="num">${escape(item.date)}</span>` : ''}${item.note ? `<span class="stage-note">${escape(item.note)}</span>` : ''}</div>`).join('')}</div>` : '';
  const tables = model.tables.map((table, index) => {
    const heading = `<h2>${escape(table.title)}${table.note ? `<i>${escape(table.note)}</i>` : ''}</h2>`;
    if (!table.rows.length) return `${heading}<p class="empty">${escape(table.empty)}</p>`;
    const cells = (row: (string | undefined)[], tag: 'td' | 'th' = 'td') => table.columns.map((column, cell) => {
      const value = row[cell];
      const formatted = value === undefined ? '—' : column.kind === 'money' ? amount(value) : escape(value);
      const cls = [column.kind === 'money' || column.kind === 'number' ? 'n' : column.kind === 'ref' ? 'ref' : '', column.nowrap ? 'nowrap' : ''].filter(Boolean).join(' ');
      return `<${tag}${tag === 'th' ? ' scope="col"' : ''}${cls ? ` class="${cls}"` : ''}>${formatted}</${tag}>`;
    }).join('');
    const footer = table.total ? `<tfoot><tr>${cells(table.total)}</tr></tfoot>` : '';
    const callouts = (model.kind === 'C' && index === 0) || (model.kind === 'R' && index === 1)
      ? model.callouts.map(text => `<div class="callout">${escape(text)}</div>`).join('') : '';
    const widths = table.columns.some(column => column.width) ? `<colgroup>${table.columns.map(column => `<col${column.width ? ` style="width:${column.width}%"` : ''}>`).join('')}</colgroup>` : '';
    return `${callouts}${heading}<table>${widths}<thead><tr>${table.columns.map(column => `<th scope="col"${column.kind === 'money' || column.kind === 'number' ? ' class="n"' : ''}>${escape(column.label)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => `<tr${row.overdue ? ' class="overdue"' : ''}>${cells(row.cells)}</tr>`).join('')}</tbody>${footer}</table>`;
  }).join('');
  const reconciliation = model.reconciliation.length ? `<h2>مطابقة دفتر الأستاذ</h2><div class="rec"><span class="h">الحساب</span><span class="h num">الدفتر العام</span><span class="h num">السجل الفرعي</span><span class="h">النتيجة</span>${model.reconciliation.map(row => `<span>${escape(row.label)}</span><span class="num">${amount(row.ledger)}</span><span class="num">${amount(row.subledger)}</span><span class="st ${D(row.difference).isZero() ? 'ok' : 'bad'}">${D(row.difference).isZero() ? 'مطابق' : `غير مطابق · الفرق <b class="num">${amount(row.difference)}</b>`}</span>`).join('')}</div>` : '';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(`${model.number} ${model.name}`)}</title><style>${css}</style></head><body><section class="page">${header}${identity}${summary}${timeline}${tables}${reconciliation}<div class="grow"></div><div class="sign">${model.signatures.map(label => `<div>${escape(label)}</div>`).join('')}</div><div class="foot"><span>${escape(model.footer)}</span><span class="num">${escape(model.number)}</span></div></section></body></html>`;
}
