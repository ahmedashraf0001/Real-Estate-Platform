import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { miniMarkdown, stripMarkdown } from '../../markdown/miniMarkdown';
import { insertMarkdown } from '../../markdown/insertMarkdown';
import { PublicStatusBadge } from '../../../components/property/PublicStatusBadge';

const html = (text: string) => renderToStaticMarkup(createElement('div', {}, miniMarkdown(text)));
test('limited Markdown renders Arabic, nested emphasis, blocks and single breaks', () => {
  const out = html('### عنوان\n#### Details\n\nنص **عريض *مائل***\nEnglish\n\n- أول\n* ثان\n\n1. One\n2. Two');
  assert.match(out, /<h3 dir="auto"[^>]*>عنوان<\/h3>/);
  assert.match(out, /<h4 dir="auto"[^>]*>Details<\/h4>/);
  assert.match(out, /<strong>عريض <em>مائل<\/em><\/strong><br\/>English/);
  assert.match(out, /<ul dir="auto"[^>]*><li dir="auto"[^>]*>أول<\/li><li dir="auto"[^>]*>ثان<\/li><\/ul>/);
  assert.match(out, /<ol dir="auto"[^>]*><li dir="auto"[^>]*>One/);
  assert.match(html('*italic **bold***'), /<em>italic <strong>bold<\/strong><\/em>/);
});
test('unsupported Markdown, links and unmatched markers stay literal; dangerous HTML is discarded', () => {
  const out = html('<script>alert(1)</script>\n<img src=x onerror=evil>\n**unfinished\n# title\n[**link**](https://example.com)\n`**code**`');
  assert.doesNotMatch(out, /<script|<img|<a |<h1|<code|<strong>/);
  assert.doesNotMatch(out, /alert\(1\)|&lt;script&gt;/);
  assert.match(out, /\*\*unfinished/);
  assert.match(out, /\[\*\*link\*\*\]\(https:\/\/example.com\)/);
});
test('stripMarkdown produces plain excerpts with safe literal unsupported input', () => {
  assert.equal(stripMarkdown('### عنوان\n\n**عريض** و *مائل*\n- بند\n1. Item'), 'عنوان عريض و مائل بند Item');
  assert.equal(stripMarkdown('**unfinished <unknown>'), '**unfinished <unknown>');
  assert.equal(stripMarkdown('Plain\ntext'), 'Plain text');
});
test('toolbar wraps selected text and retains selection; inserts and prefixes selected lines', () => {
  assert.deepEqual(insertMarkdown('one two', 4, 7, 'bold'), { text: 'one **two**', start: 6, end: 9 });
  assert.deepEqual(insertMarkdown('مرحبا', 0, 5, 'italic'), { text: '*مرحبا*', start: 1, end: 6 });
  assert.deepEqual(insertMarkdown('', 0, 0, 'bold'), { text: '****', start: 2, end: 2 });
  assert.equal(insertMarkdown('a\nb\nc', 2, 3, 'list').text, 'a\n- b\nc');
  assert.equal(insertMarkdown('a\nb', 0, 3, 'ordered').text, '1. a\n2. b');
  assert.equal(insertMarkdown('title', 2, 2, 'heading').text, '### title');
  assert.equal(insertMarkdown('\nhello', 0, 0, 'list').text, '- \nhello');
});
test('public sold and reserved badges use semantic token classes and rosette', () => {
  const sold = renderToStaticMarkup(createElement(PublicStatusBadge, { status: 'sold', isAr: true }));
  assert.match(sold, /public-status-sold/);
  assert.match(sold, /تم البيع/);
  assert.match(sold, /lucide-badge-check/);
  assert.doesNotMatch(sold, /style=|red|#ef4444/);
  assert.match(renderToStaticMarkup(createElement(PublicStatusBadge, { status: 'reserved', isAr: false })), /public-status-reserved.*Reserved/);
});
