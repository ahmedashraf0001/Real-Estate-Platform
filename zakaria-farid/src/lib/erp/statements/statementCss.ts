// Approved .agents/mockups/pdf-statements.html typography and A4 layout.
export const statementCss = `
@font-face{font-family:'ThmanyahSans';src:url('__FONT_ORIGIN__/fonts/thmanyahsans-Regular.woff2') format('woff2');font-weight:400}
@font-face{font-family:'ThmanyahSans';src:url('__FONT_ORIGIN__/fonts/thmanyahsans-Medium.woff2') format('woff2');font-weight:500}
@font-face{font-family:'ThmanyahSans';src:url('__FONT_ORIGIN__/fonts/thmanyahsans-Bold.woff2') format('woff2');font-weight:700}
:root{
  --ink:#141a22; --muted:#5d6673; --faint:#8a929d; --rule:#d8dce2; --rule-strong:#141a22;
  --band:#f3f4f6; --accent:#1f3a5f; --ok:#1d6b45; --bad:#a3261b; --warn:#8a5a00;
}
*{box-sizing:border-box}
body{margin:0;background:#e6e8eb;color:var(--ink);font-family:'ThmanyahSans','Cairo','Segoe UI',Tahoma,sans-serif;font-size:10.5pt;line-height:1.5}
.note{max-width:210mm;margin:16px auto 0;padding:10px 14px;background:#fff;border:1px dashed var(--muted);font-size:10pt;color:var(--muted)}
.page{width:210mm;min-height:297mm;margin:16px auto;background:#fff;padding:14mm 14mm 12mm;display:flex;flex-direction:column;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.num,td.n,th.n{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate;text-align:left;white-space:nowrap}
/* letterhead */
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--rule-strong);padding-bottom:8px}
.co{font-weight:700;font-size:13pt}
.co small{display:block;font-weight:400;font-size:8.5pt;color:var(--muted)}
.doc{text-align:left}
.doc .t{font-weight:700;font-size:15pt;color:var(--accent);text-align:right}
.meta{display:grid;grid-template-columns:auto auto;gap:0 10px;font-size:8.5pt;color:var(--muted);margin-top:2px}
.meta b{color:var(--ink);font-weight:500}
/* identity */
.id{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--rule);padding:8px 0;gap:6px 14px;font-size:9pt}
.id div span{display:block;color:var(--muted);font-size:8pt}
.id div b{font-weight:500}
/* summary */
h2{font-size:10.5pt;font-weight:700;margin:14px 0 6px;display:flex;align-items:baseline;gap:8px}
h2 i{font-style:normal;font-weight:400;color:var(--faint);font-size:8.5pt}
.sum{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--rule)}
.sum>div{padding:8px 10px;border-left:1px solid var(--rule)}
.sum>div:last-child{border-left:0}
.sum .k{font-size:8.5pt;color:var(--muted)}
.sum .v{font-size:14pt;font-weight:700}
.sum .s{font-size:8.5pt;color:var(--muted);display:flex;justify-content:space-between;border-top:1px solid var(--rule);margin-top:4px;padding-top:3px}
.sum .s b{font-weight:500;color:var(--ink)}
.sum .s b.bad{color:var(--bad)}
/* tables */
table{width:100%;border-collapse:collapse;font-size:9pt}
th{font-weight:500;color:var(--muted);font-size:8pt;text-align:right;border-bottom:1px solid var(--rule-strong);padding:4px 5px}
td{padding:4px 5px;border-bottom:1px solid var(--rule)}
tfoot td{border-top:1.5px solid var(--rule-strong);border-bottom:0;font-weight:700}
td.ref{font-size:8pt;color:var(--faint);direction:ltr;text-align:right}
.st{font-size:8pt;font-weight:500;white-space:nowrap}
.st.ok{color:var(--ok)} .st.bad{color:var(--bad)} .st.warn{color:var(--warn)} .st.mut{color:var(--faint)}
tr.overdue td{background:#fbf1f0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
/* timeline */
.tl{display:grid;grid-template-columns:repeat(5,1fr);border-top:2px solid var(--accent);margin-top:4px}
.tl div{padding:5px 4px 0;font-size:8.5pt;position:relative}
.tl div:before{content:"";position:absolute;top:-5px;right:4px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.tl div.fut:before{background:#fff;border:2px solid var(--accent)}
.tl b{display:block;font-weight:500}
.tl span{color:var(--muted)}
/* reconciliation */
.rec{border:1px solid var(--rule);padding:6px 10px;font-size:9pt;display:grid;grid-template-columns:1fr auto auto auto;gap:3px 16px;align-items:center}
.rec .h{color:var(--muted);font-size:8pt}
/* footer */
.grow{flex:1}
.sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px;font-size:8.5pt;color:var(--muted)}
.sign div{border-top:1px solid var(--ink);padding-top:4px}
.foot{display:flex;justify-content:space-between;border-top:1px solid var(--rule);margin-top:12px;padding-top:5px;font-size:7.5pt;color:var(--faint)}
.callout{border-right:3px solid var(--accent);background:var(--band);padding:6px 10px;font-size:9pt;margin-top:8px}
.callout b{font-weight:700}
@media print{body{background:#fff}.note{display:none}.page{margin:0;box-shadow:none;page-break-after:always}}
@page{size:A4;margin:0}

/* Long evidence tables use native paged layout, repeating column headings only. */
.empty{color:var(--muted);font-size:9pt;margin:4px 0}
.bad{color:var(--bad)}
.stage-note{display:block;font-size:7.5pt}
.ref{overflow-wrap:anywhere}
.nowrap{white-space:nowrap;overflow-wrap:normal}
thead{display:table-header-group}
tfoot{display:table-row-group}
tr{break-inside:avoid;page-break-inside:avoid}
h2{break-after:avoid;page-break-after:avoid}
.head,.id,.sum,.tl,.rec,.sign,.foot,.callout{break-inside:avoid}
@media screen and (max-width:800px){body{overflow-x:auto}.page{margin:0}}
@media print{.page{display:block;min-height:0;background:transparent;page-break-after:auto;box-decoration-break:clone;-webkit-box-decoration-break:clone}.grow{display:none}h2{margin-top:10px}th,td{padding-top:3px;padding-bottom:3px}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
@page{size:A4;margin:0;@bottom-center{content:"صفحة " counter(page) " من " counter(pages);font-family:'ThmanyahSans';font-size:7.5pt;color:var(--faint);direction:rtl;height:7mm;margin-top:-16mm}}
`;
