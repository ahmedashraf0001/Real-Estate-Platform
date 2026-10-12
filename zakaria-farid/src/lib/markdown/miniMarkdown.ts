import { legacyHtmlToMarkdown } from './legacyHtmlToMarkdown';
import { createElement as h, Fragment, type ReactNode } from 'react';

type Inline = string | { tag: 'strong' | 'em'; children: Inline[] };
type Block = { tag: 'p' | 'h3' | 'h4' | 'ul' | 'ol'; lines: Inline[][] };

function inline(text: string): Inline[] {
  function parse(start: number, stop?: string): { nodes: Inline[]; end: number; closed: boolean } {
    const nodes: Inline[] = [];
    let i = start;
    const literal = (value: string) => {
      if (typeof nodes[nodes.length - 1] === 'string') nodes[nodes.length - 1] += value;
      else nodes.push(value);
    };
    while (i < text.length) {
      if (stop && text.startsWith(stop, i) && (stop !== '*' || !text.startsWith('**', i) || text.startsWith('***', i))) return { nodes, end: i + stop.length, closed: true };
      // Unsupported constructs remain literal, including any markers inside them.
      const protectedText = text.slice(i).match(/^(?:\[[^\]\n]*\]\([^\)\n]*\)|`[^`\n]*`|<[^>\n]*>)/)?.[0];
      if (protectedText) { literal(protectedText); i += protectedText.length; continue; }
      if (text[i] === '*') {
        const marker = text.startsWith('**', i) ? '**' : '*';
        const child = parse(i + marker.length, marker);
        if (child.closed && child.nodes.length) {
          nodes.push({ tag: marker === '**' ? 'strong' : 'em', children: child.nodes });
          i = child.end; continue;
        }
        literal(marker); i += marker.length; continue;
      }
      literal(text[i++]);
    }
    return { nodes, end: i, closed: false };
  }
  return parse(0).nodes;
}

function blocks(text: string): Block[] {
  const result: Block[] = [];
  for (const line of legacyHtmlToMarkdown(text).replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { result.push({ tag: 'p', lines: [] }); continue; }
    const heading = line.match(/^(#{3,4})\s+(.+)$/);
    const list = line.match(/^\s*(?:([-*])\s+|(\d+)\.\s+)(.*)$/);
    const tag = heading ? heading[1].length === 3 ? 'h3' : 'h4' : list ? list[1] ? 'ul' : 'ol' : 'p';
    const content = inline(heading ? heading[2] : list ? list[3] : line);
    const previous = result[result.length - 1];
    if (previous?.tag === tag && previous.lines.length && (tag === 'p' || tag === 'ul' || tag === 'ol')) previous.lines.push(content);
    else result.push({ tag, lines: [content] });
  }
  return result.filter(b => b.lines.length);
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, key) => typeof node === 'string' ? node : h(node.tag, { key }, renderInline(node.children)));
}

/** Safe, limited Markdown: React escapes every literal, including raw HTML. */
export function miniMarkdown(text: string): ReactNode[] {
  return blocks(text).map((block, key) => h(block.tag, { key, dir: 'auto' },
    block.tag === 'ul' || block.tag === 'ol'
      ? block.lines.map((line, i) => h('li', { key: i, dir: 'auto' }, renderInline(line)))
      : block.lines.flatMap((line, i) => [...(i ? [h('br', { key: `br-${i}` })] : []), h(Fragment, { key: i }, renderInline(line))])
  ));
}

/** Same grammar as the renderer; unsupported syntax remains plain text. */
export function stripMarkdown(text: string): string {
  const plain = (nodes: Inline[]): string => nodes.map(n => typeof n === 'string' ? n : plain(n.children)).join('');
  return blocks(text).flatMap(b => b.lines.map(plain)).join(' ').replace(/\s+/g, ' ').trim();
}
