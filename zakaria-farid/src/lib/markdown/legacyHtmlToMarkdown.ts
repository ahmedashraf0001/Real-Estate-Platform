const legacyTag = /<\/?(?:p|h[1-6]|hr|ul|ol|li|strong|b|em|i|br|blockquote|script|style|iframe)\b[^>]*>/i;

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  // Bounded multi-pass decoding handles older double-escaped descriptions.
  for (let pass = 0; pass < 3; pass++) {
    const next = text.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, (entity, name: string) => {
      const key = name.toLowerCase();
      if (key[0] !== '#') return named[key];
      const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
    });
    if (next === text) break;
    text = next;
  }
  return text;
}

/** Read compatibility for legacy Tiptap HTML. Produces only text/limited Markdown, never DOM. */
export function legacyHtmlToMarkdown(input: string): string {
  if (!legacyTag.test(input)) return input;
  const html = input.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const tags = /<\/?([a-z][a-z\d]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  const lists: string[] = [];
  let blocked: string | null = null;
  let result = '', previous = 0, itemDepth = 0;
  const breakLine = (count: number) => {
    result = result.replace(/[ \t]+$/, '');
    const trailing = result.match(/\n*$/)![0].length;
    if (result && trailing < count) result += '\n'.repeat(count - trailing);
  };
  const text = (value: string) => {
    const decoded = decodeEntities(value);
    // Escaped legacy tags normalize too; other escaped angle-bracket text stays literal.
    return legacyTag.test(decoded) ? legacyHtmlToMarkdown(decoded) : decoded.replace(/\s+/g, ' ');
  };
  for (const match of html.matchAll(tags)) {
    if (!blocked) result += text(html.slice(previous, match.index));
    previous = match.index! + match[0].length;
    const tag = match[1].toLowerCase();
    const closing = match[0].startsWith('</');
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (blocked) {
      if (closing && blocked === tag) blocked = null;
      continue;
    }
    if (tag === 'script' || tag === 'style' || tag === 'iframe') {
      if (!closing && !selfClosing) blocked = tag;
      continue;
    }
    if (tag === 'strong' || tag === 'b') result += '**';
    else if (tag === 'em' || tag === 'i') result += '*';
    else if (tag === 'br') result = result.replace(/[ \t]+$/, '') + '\n';
    else if (/^h[1-6]$/.test(tag)) {
      breakLine(2);
      if (!closing) result += Number(tag[1]) <= 2 ? '## ' : Number(tag[1]) === 3 ? '### ' : '#### ';
    } else if (tag === 'hr' && !closing) {
      breakLine(2); result += '---'; breakLine(2);
    } else if (tag === 'ul' || tag === 'ol') {
      breakLine(itemDepth ? 1 : 2);
      if (closing) lists.pop(); else lists.push(tag);
    } else if (tag === 'li') {
      breakLine(1);
      if (closing) itemDepth = Math.max(0, itemDepth - 1);
      else { itemDepth++; result += lists[lists.length - 1] === 'ol' ? '1. ' : '- '; }
    } else if (tag === 'p') {
      // Tiptap wraps every list item's text in <p>; keep it on the marker's line.
      if (!itemDepth) breakLine(2);
    } else if (tag === 'blockquote') breakLine(2);
    // Other tags and all attributes disappear; their text is retained.
  }
  if (!blocked) result += text(html.slice(previous));
  return result.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
