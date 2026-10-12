import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { legacyHtmlToMarkdown } from '../../markdown/legacyHtmlToMarkdown';
import { miniMarkdown, stripMarkdown } from '../../markdown/miniMarkdown';
import { adaptProperty } from '../../utils/propertyAdapter';
import { adminHarness, nodes } from './adminWizardHarness';
import { matchesSmartQuery } from '../../utils/searchUtils';

const ar = '<h2>تفاصيل العقار</h2><p>وصف <strong>عريض <em>ومائل</em></strong><br>سطر ثان</p><ul><li><p>إطلالة</p></li><li><p>مدخل</p></li></ul><h5>المرافق</h5><ol><li><p>مصعد</p></li><li><p>جراج</p></li></ol>';
const arMarkdown = '### تفاصيل العقار\n\nوصف **عريض *ومائل***\nسطر ثان\n\n- إطلالة\n- مدخل\n\n#### المرافق\n\n1. مصعد\n1. جراج';
const en = '<h1>Estate &amp; details</h1><p>A <b>bold <i>italic</i></b> brief.</p><p>Second paragraph.</p><h4>Features</h4><blockquote><p>Quiet &quot;home&quot;</p></blockquote><ul><li>View</li><li>Entrance</li></ul>';
const enMarkdown = '### Estate & details\n\nA **bold *italic*** brief.\n\nSecond paragraph.\n\n#### Features\n\nQuiet "home"\n\n- View\n- Entrance';

test('legacy Tiptap Arabic and English blocks, nested inline and list paragraphs become Markdown', () => {
  assert.equal(legacyHtmlToMarkdown(ar), arMarkdown);
  assert.equal(legacyHtmlToMarkdown(en), enMarkdown);
  assert.equal(legacyHtmlToMarkdown('<h3>A</h3><h6>B</h6><p>C</p>'), '### A\n\n#### B\n\nC');
});
test('legacy conversion decodes named/numeric entities and drops other tags but retains text', () => {
  assert.equal(legacyHtmlToMarkdown('<p>&amp; &lt;safe&gt; &quot;x&quot; &#39;y&#39;&nbsp;&#65; &#x1F3E0;</p><div>Keep <a href="x">link</a> text</div>'), '& <safe> "x" \'y\' A 🏠\n\nKeep link text');
});
test('script/style/iframe content, attributes and comments are removed without execution', () => {
  const result = legacyHtmlToMarkdown('<p onclick="evil()">Safe</p><script>globalThis.legacyExecuted=true</script><style>body{display:none}</style><iframe src="javascript:evil()"><p>unsafe frame</p></iframe><p>After<img onerror="evil()" src="x"></p><!--secret-->');
  assert.equal(result, 'Safe\n\nAfter');
  assert.equal(legacyHtmlToMarkdown('<script>evil()</script>'), '');
  assert.equal(legacyHtmlToMarkdown('<p>Before</p><style>unclosed'), 'Before');
  assert.doesNotMatch(result, /evil|legacyExecuted|display|unsafe|secret|onerror/);
});
test('plain/Markdown text is byte-identical and converted legacy content is idempotent', () => {
  for (const input of ['', 'Plain\r\ntext', '### عنوان\n\n**عريض** و *مائل*\n- بند', '&amp; plain', '1 < 2', '<unknown>literal</unknown>']) assert.equal(legacyHtmlToMarkdown(input), input);
  for (const input of [ar, en, '<p>A</p>\n\n\n<p>B</p>', '<p>&lt;p&gt;Escaped&lt;/p&gt;</p>']) {
    const once = legacyHtmlToMarkdown(input);
    assert.equal(legacyHtmlToMarkdown(once), once);
    assert.doesNotMatch(once, /\n{3}/);
  }
});
test('public renderer, excerpts and adapter normalize stored descriptions through the real converter', () => {
  const rendered = renderToStaticMarkup(createElement('div', {}, miniMarkdown(ar)));
  assert.match(rendered, /<h3 dir="auto">تفاصيل العقار<\/h3>/);
  assert.match(rendered, /<strong>عريض <em>ومائل<\/em><\/strong>/);
  assert.doesNotMatch(rendered, /&lt;p&gt;|&lt;strong&gt;/);
  assert.equal(stripMarkdown(ar), 'تفاصيل العقار وصف عريض ومائل سطر ثان إطلالة مدخل المرافق مصعد جراج');
  const adapted = adaptProperty({ slug: 'test', description_ar: ar, description_en: en } as any, 'ar');
  assert.equal(adapted.description_ar, arMarkdown);
  assert.equal(adapted.description_en, enMarkdown);
  assert.equal(adapted.narrative, stripMarkdown(ar));
  assert.equal(matchesSmartQuery({ description_en: '<p>A <strong>panoramic</strong> view</p>' }, 'panoramic'), true);
  assert.equal(matchesSmartQuery({ description_en: '<p>A <strong>panoramic</strong> view</p>' }, 'strong'), false);
});
test('real admin initial AR/EN state converts legacy HTML and subsequent edits remain independent', () => {
  const h = adminHarness('AdminPropertyForm', '?step=3');
  const props = { property: { description_ar: ar, description_en: en, type: 'building' }, isAr: true };
  try {
    let tree = h.render(props);
    const editor = nodes(tree).find(n => n.type === 'MarkdownDescriptionEditor');
    assert.equal(editor.props.value, arMarkdown);
    editor.props.onChange('**تعديل**');
    tree = h.render(props);
    assert.equal(nodes(tree).find(n => n.type === 'MarkdownDescriptionEditor').props.value, '**تعديل**');
  } finally { h.cleanup(); }
});
