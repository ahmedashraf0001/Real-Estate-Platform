// Lists src files that no other src file imports (UNUSED) or that only tests import (TEST-ONLY).
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2]), src = path.join(root, 'src');
const norm = p => p.split(path.sep).join('/');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mjs|cjs|css)$/.test(f.name)) files.push(p);
  }
})(src);
const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '/index.ts', '/index.tsx', '/index.js'];
const importedBy = {};
const re = /(?:from\s*|import\s*\(\s*|require\(\s*|import\s+|@import\s+(?:url\()?)['"]([^'"]+)['"]/g;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(t))) {
    const s = m[1];
    let base;
    if (s.startsWith('@/')) base = path.join(src, s.slice(2));
    else if (s.startsWith('.')) base = path.resolve(path.dirname(f), s);
    else continue;
    for (const e of exts) {
      const c = path.normalize(base + e);
      if (fs.existsSync(c) && fs.statSync(c).isFile()) { (importedBy[c] = importedBy[c] || []).push(f); break; }
    }
  }
}
const isEntry = f => {
  const n = norm(f);
  if (/\/src\/app\//.test(n) && /\/(page|layout|route|loading|error|not-found|template|default|global-error|opengraph-image|sitemap|robots|manifest)\.(tsx?|js)$/.test(n)) return true;
  return /\/src\/(middleware|proxy|instrumentation)\.ts$/.test(n) || /\/src\/i18n\//.test(n) || /globals\.css$/.test(n);
};
const isTest = f => /__tests__|\.test\./.test(norm(f));
for (const f of files) {
  if (isEntry(f) || isTest(f)) continue;
  const by = importedBy[f] || [];
  const kind = by.length === 0 ? 'UNUSED' : by.every(isTest) ? 'TEST-ONLY' : null;
  if (kind) console.log(kind + '\t' + fs.readFileSync(f, 'utf8').split('\n').length + '\t' + norm(path.relative(root, f)));
}
