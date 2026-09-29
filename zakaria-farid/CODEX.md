# CODEX.md - Project Directives, Context & Architectural Invariants

Directives and architectural invariants for OpenAI Codex / ChatGPT models working in this workspace.

---

## 1. Quick Orientation & Tech Stack
- **Platform**: Real Estate Platform & FIN-OS Enterprise Resource Planning (ERP).
- **Core App Path**: `/home/lyr1csan/project/Real-Estate-Platform/zakaria-farid`
- **Framework**: Next.js 15 (App Router, Server Actions, React 19).
- **Styling**: Tailwind CSS, CSS Variables for dynamic ERP themes (`var(--erp-accent)`), Lucide React.
- **Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS). Project Ref: `lybkeycbiposjkjkyjlh`.
- **Active MCP Servers Configured in Codex**:
  - `supabase`: PostgreSQL, Auth, Functions, Storage, Branching.
  - `playwright`: Headless browser testing & live visual snapshots.
  - `chrome_devtools`: Accessibility, performance, DevTools inspection.
  - `hypruse`: Desktop/Wayland UI automation.
- **Knowledge Graph**: AST-derived graph at `Real-Estate-Platform/graphify-out/`.
- **Detailed Handoff Dossier**: Consult [`.agents/handoff.md`](file:///home/lyr1csan/project/.agents/handoff.md) for full context, test state, and human taste history.

---

## 2. Human Taste & Learned Negative Constraints (STRICT)

1. **Treasury Methods Invariant**:
   - Strictly 2 operational payment methods: **Cash in Hand (`كاش بالخزينة`)** and **InstaPay (`إنستاباي`)**, both routing to Treasury Account `101000`.
   - **Quarantined**: Cheques, bank clearing transit, and chequebook registers are strictly banned from operational collections and dues. Never re-introduce cheque terminology ("شيك بنكي", "إيداع بالبنك", "محفظة الشيكات").
2. **Zero Dead Buttons Invariant**:
   - Never render placeholder or non-functional buttons. Every rendered action must connect to an authentic modal, route, or backend mutation.
3. **Clean Entity Names in Trees / COA**:
   - In tree views and explorer lists, show the **full clean name** first. Never prepend 6-digit codes that truncate the name.
4. **Header Cleanliness & Side Rail Quick Actions**:
   - Keep stage headers lean. Place frequent operational creation triggers (e.g. `+ تحرير عقد بيع جديد`) in a dedicated `الإجراءات السريعة` widget in the docked side rail.
5. **Matrix Shrink-by-Default Invariant**:
   - Multi-level dense tables (e.g. Building $\rightarrow$ Floor $\rightarrow$ Unit) must initialize in a **collapsed (shrink) state**. Provide one-click toolbar controls (`طي الكل`, `عرض الأدوار`, `توسيع كافة الوحدات`).
6. **Arabic Chart Readability Invariant**:
   - For comparisons involving Arabic entity names (projects, cost centers, contractors), use **horizontal bar charts** (`plotOptions.bar.horizontal: true`) with names in `xaxis.categories` to avoid 45-degree rotation and label truncation.
7. **Donut Geometry Clearance**:
   - Donut charts in side rails must have `size: '76%'` or higher and inner diameter $\ge 140\text{px}$ so center total summaries never collide with the donut ring.
8. **Showcase Cards 3-Column Grid**:
   - Desktop project showcase grids must enforce strictly 3 cards per row (`grid-template-columns: repeat(3, minmax(0, 1fr))`) with 16:10 photo ratio, single status pill, unclipped 2-line title, and 3-metric strip.
9. **Zero Fake Data & Tabular Numerals**:
   - Never use fake mock balances. Render honest zero states (`0`, `0 ج.م`). All financial numbers must use `font-variant-numeric: tabular-nums` with `unicodeBidi: 'isolate'`.
10. **Surfaces**:
    - Panels use `#ffffff !important;` with 1px `#cbd5e1` border and 12px radius against `#f8fafc` canvas. Zero purple accents or AI-slop pastel fills.

---

## 3. Codebase Navigation: Graphify-First
- Run `graphify query "<question>"` to locate call chains and dependencies before grep/glob.
- Run `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for concepts.
- Consult `Real-Estate-Platform/graphify-out/wiki/index.md` for domain navigation.
- Run `graphify update .` after code modifications to sync AST.

---

## 4. Verification Directives
Before declaring any task complete or fixed:
1. `npx tsc --noEmit` (Must be 0 errors)
2. `npm test` (Must pass 561/561 tests)
3. `graphify update .` (Sync knowledge graph)

---

## 5. Skills & Resources
All skills (over 120 specialized skills including `fin-os-erp-design`, `supabase`, `supabase-postgres-best-practices`, `ui-ux-pro-max`, `modern-web-guidance`, etc.) are installed and discoverable in `~/.codex/skills/` and `.codex/skills/`.
