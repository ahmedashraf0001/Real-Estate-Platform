export type MarkdownAction = 'bold' | 'italic' | 'list' | 'ordered' | 'heading';

export function insertMarkdown(text: string, start: number, end: number, action: MarkdownAction) {
  if (action === 'bold' || action === 'italic') {
    const marker = action === 'bold' ? '**' : '*';
    return { text: text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end), start: start + marker.length, end: end + marker.length };
  }
  const first = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  const boundary = text.indexOf('\n', Math.max(start, end - 1));
  const last = boundary < 0 ? text.length : boundary;
  const lines = text.slice(first, last).split('\n');
  const replacement = lines.map((line, i) => (action === 'heading' ? '### ' : action === 'ordered' ? `${i + 1}. ` : '- ') + line).join('\n');
  return { text: text.slice(0, first) + replacement + text.slice(last), start: first, end: first + replacement.length };
}
