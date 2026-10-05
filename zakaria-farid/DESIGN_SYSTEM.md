# FIN-OS Design System Specification (v2.0)
*Single Source of Truth for Enterprise SaaS Workstation UI*

This document defines the binding visual, structural, and interaction design standards for FIN-OS and associated administrative surfaces. It must be consulted before implementing or styling any new page, component, modal, table, or chart.

---

## 1. Color Palette & Roles

The system uses a disciplined, low-saturation enterprise SaaS palette: **predominantly white and neutral slate, with exactly one dominant accent color (`#2563eb`)**. Gradients, multi-color badges, and decorative background color blocks are strictly banned.

### A. Core Tokens

| Role | Token / Variable | Hex Value | Purpose & Where Applied |
| :--- | :--- | :--- | :--- |
| **Primary Accent** | `--erp-accent` | `#2563eb` | Primary filled buttons (`+ طلب جديد`, `Clock In`), outline button borders/text (`Clock Out`, `صرف دفعة / مستخلص`), active nav indicators & leading bar, sidebar section titles (`.groupLabel`), table column header text (`th`), active calendar tab border, calendar selection highlight text/borders, time telemetry (`09:00 - 18:00`), Series 1 chart lines. |
| **Accent Hover** | `--erp-accent-hover` | `#1d4ed8` | Hover state for primary buttons and interactive accent elements. |
| **Accent Subtle** | `--erp-accent-subtle` | `#eff6ff` | Light tinted icon circle backgrounds (quick actions, active status pills). |
| **Accent Tint** | `--erp-accent-tint` | `rgba(37, 99, 235, 0.06)` | Table column header background shade (`0.06`), calendar day selection highlight wash (`0.12`), outline button hover wash (`0.06`), focus rings. |
| **Canvas Background** | `--erp-bg-canvas` | `#f1f5f9` | Application root body, workstation canvas, backdrop behind panels. Soft cool neutral canvas. |
| **Panel / Surface** | `--erp-bg-panel` | `#ffffff` | All cards, headers, tables, modals, flyouts, and content containers. Crisp floating pure white surfaces. |
| **Surface Raised** | `--zf2-bg-surface-raised` | `#f1f5f9` | Inactive table header cells, secondary tab bars, code blocks. |
| **Subtle Hover** | `--erp-bg-hover` | `#f8fafc` | Row hover in data tables, neutral button hover. |
| **Active Surface** | `--zf2-bg-surface-active` | `#e2e8f0` | Pressed button states, active split toggles. |

> [!IMPORTANT]
> **Semantic Accent Distinction Rule**:
> The system accent is strictly applied to **operational triggers** (filled and outline buttons), **navigation taxonomy** (active items, leading bars, and sidebar section titles), **telemetry data** (working hours/time info), and **tabular headers** (`th` text and background tint).
> Conversely, the **sidebar user profile card (`.profileCard`) and avatar (`.profileAvatar`) MUST remain purely neutral** (`#ffffff` card, `#f1f5f9` avatar background, `#cbd5e1` border, `#475569` text) with **zero accent tinting**. The user profile represents operator identity, which must never be confused with system actions or navigational states.

> [!CAUTION]
> **Strict Invariant — Ban Tinted Surfaces & Color-Coded Card Backgrounds**:
> Do not use pastel, low-opacity, or colored background fills (e.g. `bg-red-50`, `bg-emerald-50`, `#fef2f2`, `#fffbeb`, `#ecfdf5`). All containers, modal cards, and KPI panels must have a neutral background (`#ffffff !important;` white, dark neutral, or transparent). Never tint the entire card container to reflect a state, severity, or status. Statuses, alerts, and metrics must be communicated via semantic Lucide icons in 28×28px squircles (`#f8fafc` surface with `#e2e8f0` border), dark neutral value typography (`#0f172a`), and soft micro-pills (`.statusPill`), never by washing the card surface.

### B. Borders & Dividers

The system enforces a strict two-tier line-driven blueprint contrast hierarchy:

| Role | Token / Variable | Hex Value | Application |
| :--- | :--- | :--- | :--- |
| **Primary Structural Line** | `--erp-border` | `#cbd5e1` | 1px primary structural outline for all cards, top header bottom border, table outer boundaries, input borders, quick action modules, and discrete stat cards. Ensures modules feel distinctly carved out and legible. |
| **Subtle Divider** | `--erp-border-subtle` | `#f1f5f9` | 1px internal divider reserved strictly for secondary/internal dividers (table row dividers, sub-tab dividers). Prevents global visual darkening. |
| **Card Border Hairline** | `--erp-card-border` | `#e2e8f0` | 1px clean structural border for floating white cards and panels against the `#f1f5f9` canvas. |
| **Border Hover** | `--erp-border-hover` | `#94a3b8` | Hover state on select dropdowns, search boxes, and secondary buttons. |


### C. Typography Colors

| Role | Token / Variable | Hex Value | Application |
| :--- | :--- | :--- | :--- |
| **Title / Headings** | `--erp-text-title` | `#0f172a` | Page titles, stat big numbers, card headings, modal titles. |
| **Body Text** | `--erp-text-body` | `#334155` | Table cell data, input values, primary labels. |
| **Muted Text** | `--erp-text-muted` | `#64748b` | Field labels, breadcrumbs, stat descriptions, secondary metadata. |
| **Subtle / Placeholder** | `--erp-text-subtle` | `#94a3b8` | Input placeholders, info icons, disabled items, breadcrumb slashes. |
| **Inverse Text** | `--zf2-text-inverse` | `#ffffff` | Text on solid primary buttons (`#2563eb`) and solid badges. |

### D. Semantic Financial State & Status Micro-Pills

> [!IMPORTANT]
> **Status Micro-Pill Standards**:
> All status badges across tables, cards, and drawers must be rendered as **Soft Pastel Micro-Pills** (`.statusPill` with 9999px pill geometry).
> - **Strict Negative Invariant**: Solid saturated color blocks (e.g. garish neon buttons or harsh solid red/green badges) are **strictly banned**.
> - **Strict Negative Invariant**: Plain unstyled text without the soft pastel background wash is **strictly banned**. Every status must have its calibrated soft wash background and subtle 20% border.

| Semantic State | Text / Icon Hex | Wash Background | Subtle Border | Class Name | Used For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Positive / Active / Approved** | `#16a34a` | `#ecfdf5` | `rgba(22, 163, 74, 0.20)` | `.statusPillGreen` | Active contracts (`ساري التعاقد`), Approved expenses, Settled payables (`مسدد`), Completed milestones. |
| **Pending / Warning / Due** | `#d97706` | `#fffbeb` | `rgba(217, 119, 6, 0.20)` | `.statusPillAmber` | Pending approvals, Due today (`مستحق اليوم`), Under review, Scheduled dues, Low stock. |
| **Danger / Overdue / Declined** | `#dc2626` | `#fef2f2` | `rgba(220, 38, 38, 0.20)` | `.statusPillRed` | Overdue installments, Delayed payables (`متأخر`), Declined requests, Rescinded contracts (`فسخ واسترداد`). |
| **Informational / Operating / Draft** | `#2563eb` | `#eff6ff` | `rgba(37, 99, 235, 0.20)` | `.statusPillBlue` | Draft state, In-progress operations, Operating account, Active filter selection. |
| **Neutral / Archived** | `#64748b` | `#f1f5f9` | `rgba(100, 116, 139, 0.20)` | `.statusPillNeutral` | Archived records, Cancelled items, Historical snapshots. |

### E. Dynamic Palette Customizer & Token Reactivity

FIN-OS features a runtime customizable theme architecture (`ZFPaletteCustomizer`) supporting 8 curated enterprise-grade palettes. All accent tokens across the application are reactive:

- **Reactive System Accent Tokens**:
  - `--erp-accent`: Active theme primary accent (default `#2563eb`). Used for primary buttons, active navigation indicators, active tabs, telemetry highlights, and ApexCharts primary series.
  - `--erp-accent-hover`: Hover state for primary interactive elements (e.g. `#1d4ed8`).
  - `--erp-accent-subtle`: Calibrated soft background wash (e.g. `#eff6ff`) for icon squircles, active pill indicators, and subtle badge highlights.
  - `--erp-accent-tint`: Lightweight translucent tint (e.g. `rgba(37, 99, 235, 0.08)`) for table header accents, selection outlines, and focus rings.
  - **ApexCharts Primary Series Binding**: Line and bar chart primary series automatically bind to `currentAccent` (`activePreset?.accent`), live-updating synchronously when switching presets in `ZFPaletteCustomizer`.
- **Strict Prohibition on Hardcoded Theme Hexes**:
  - Hardcoding `#2563eb` or `#eff6ff` in components, icons, badges, or chart series where the system accent is intended is **strictly banned**. Always consume CSS variables `var(--erp-accent)`, `var(--erp-accent-hover)`, `var(--erp-accent-subtle)`, and `var(--erp-accent-tint)`.
- **Permanent Neutrality of Operator Profile Identity**:
  - The sidebar user profile card (`.profileCard`) and avatar (`.profileAvatar`) **MUST remain purely neutral slate** (`#ffffff` card, `#f1f5f9` avatar background, `#cbd5e1` border, `#475569` text) with **zero accent tinting**. The user profile represents human operator identity, which must never be confused with system actions, status states, or navigational accents.

---

## 2. Typography Standards

- **Primary Font Stack**: `'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Arabic Typography Constraint**: The app is strictly Arabic-first (RTL). Arabic letter spacing must remain normal (`0`), line heights generous (`1.4 - 1.6`).
- **Tabular Numbers Invariant**: `font-variant-numeric: tabular-nums` (or CSS class `.tabularNums`) is **mandatory** for every financial number, currency value, percentage, date, and metric counter to prevent layout jitter and ensure vertical decimal alignment.

### Type Scale Hierarchy

| Element | Size | Weight | Color | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Page Greeting / Major Title** | `1.35rem - 1.45rem` (22-23px) | `700` | `#0f172a` | Personal greeting (`مرحباً، زكريا فريد`) or view title. |
| **Stat Big Value** | `1.45rem` (23px) | `700` | `#0f172a` | Numeric KPI with `letter-spacing: -0.02em` + `tabular-nums`. |
| **Card / Section Heading** | `0.86rem - 0.88rem` (14px) | `600` | `#0f172a` | Titles inside card headers. |
| **Navigation Dock Item** | `0.82rem` (13px) | `500` (600 active) | `#334155` (`#2563eb` active) | Dock module links. |
| **Table Header (`th`)** | `0.68rem` (11px) | `600` | `#64748b` | Uppercase/prominent, `#f8fafc` background. |
| **Table Cell (`td`)** | `0.76rem - 0.78rem` (12-12.5px) | `400 - 500` | `#334155` | Standard cell content. |
| **Stat / Input Label** | `0.74rem - 0.75rem` (12px) | `500` | `#64748b` | Field labels, stat block titles. |
| **Delta / Helper Line** | `0.72rem` (11.5px) | `500` | `#16a34a` or `#dc2626` | Plain text under stat values. |
| **Micro Badge / Status Pill** | `0.70rem` (11px) | `600` | Semantic text | Inside status pills. |

---

## 3. Spacing, Geometry & Shadows

### Spacing Scale
- **Micro Gaps**: `0.25rem` (4px), `0.35rem` (5-6px), `0.45rem` (7px), `0.5rem` (8px) — Used for icon-label gaps, breadcrumb dividers, quick actions row, and button internals.
- **Form / Control Padding**: `0.4rem 0.75rem` (buttons, 34-38px height), `0 0.65rem` (inputs).
- **Card Padding (Tight Enterprise Composition)**: `0.75rem 1rem` (12px 16px) — Standard across unified stat cards, chart cards, data table header/footer, and widget cards.
- **Section Stack Gap**: `0.75rem - 0.85rem` (12px - 14px) — Tightened vertical spacing between major sections, shell containers, and column layouts to eliminate dead white space.

### Border Radius Scale
- `4px - 6px`: Small action buttons, sub-item bullets, calendar nav buttons.
- `6px - 7px`: Filter selects, search boxes, quick action buttons, mobile menu button.
- `8px`: Top navbar icon buttons, custom chart tooltip cards.
- `12px`: **Standard Card Radius** (unified stat card, data table card, chart card, widget card).
- `9999px`: Fully rounded pill buttons (`.pillBtnSolid`, `.pillBtnOutline`), status pills.
- `50%`: Circular icon containers, user avatar, selected calendar date.

### Shadow Policy: Hairlines Over Shadows
- **Cards**: `box-shadow: none !important; border: 1px solid var(--erp-border, #cbd5e1);`
- **Dividers**: `1px solid var(--erp-border-subtle, #f1f5f9);`
- **Where Shadows ARE Allowed**:
  - Floating Tooltips: `0 4px 12px rgba(15, 23, 42, 0.08)`
  - Active Switcher Thumb: `0 1px 2px rgba(0, 0, 0, 0.04)`
  - Floating Drawers / Modals: Soft background veil with `rgba(15, 23, 42, 0.35)` + `backdrop-filter: blur(2px)`.

### RTL Whitespace Uniformity & 100vw Prohibition

Workstation shells operate in strict Arabic-first (RTL) mode. To ensure flawless geometric symmetry across all desktop operating systems and browsers, the following whitespace invariants are strictly enforced:

- **The Desktop Browser RTL Scrollbar-Gutter Bug**:
  In modern Chromium, WebKit, and Gecko desktop browsers, combining `100vw` or `scrollbar-gutter: stable` with `dir="rtl"` causes an asymmetrical layout bug. The browser allocates a vertical gutter on the left edge while expanding `100vw` beyond the inner window boundary, pushing the right/left outer margins off-screen and crushing padding to ~2px.
- **Strict Ban on `100vw` Root Sizing**:
  Root layout containers (`.shell`, `.workspaceRow`, `.stageContainer`) must **never** declare `width: 100vw`. They must use:
  ```css
  width: 100%;
  max-width: 100vw;
  min-width: 0;
  box-sizing: border-box;
  ```
- **Scoped Document Root Rules**:
  To prevent double-scrollbar tracks and browser-level gutter shifts, `html` and `body` are scoped when mounted in FIN-OS:
  ```css
  html[data-erp-workstation-root],
  body:has([data-erp-workstation-root]) {
    scrollbar-gutter: auto !important;
    overflow: hidden !important;
  }
  ```
- **Docked Edge-to-Edge Workstation Rhythm**:
  The enterprise workstation enforces a flush edge-to-edge docked layout:
  - Outer margins of the shell: `0` (`padding: 0;`).
  - Inter-column gutters between Sidebar, Middle Subpage, and Side Widgets: `0` (`gap: 0;`).
  - Reclaims ~78px of horizontal width and 24px of vertical height across all FIN-OS views.
- **Seamless Zero-Track Scrolling**:
  All interior scrolling stages and side widget columns must suppress visible browser scrollbar gutters (`scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }`), ensuring clean scrolling without jitter.

---

## 4. Layout Architecture & Structural Patterns

### A. The Shell Layout Architecture: Docked Edge-to-Edge Enterprise Workstation Architecture

FIN-OS employs an expansive, edge-to-edge docked 3-column / 2-column enterprise workstation architecture:

1. **Docked 100vh Navigation Sidebar (`ZFNavigationDock`)**:
   - Pinned to the leading edge (right in RTL, left in LTR) rendered as a **docked 100vh enterprise rail** (`height: 100vh; border-radius: 0 !important; border: none !important; background: #ffffff !important; overflow: hidden;`).
   - Cleanly separated from the workspace by a single flush vertical hairline divider (`border-left: 1px solid var(--erp-border, #cbd5e1) !important;` in RTL, `border-right` in LTR). Box shadow is eliminated (`none !important;`).
   - Header is flush at `50px` height with bottom hairline divider aligned with the top header.
2. **Middle Subpage Container (`.middleSection`)**:
   - The middle section is **no longer framed as a floating card**. Floating card borders, 12px outer card radius, and outer box shadows are eliminated.
   - Renders flush edge-to-edge with `background: var(--erp-bg-canvas, #f8fafc) !important;`, `border: none !important;`, and `border-radius: 0 !important;`.
   - **Unified Clean Surface Invariant**: Clean `#f8fafc` canvas background underpins the stage, while interior KPI cards, data tables, and headers maintain crisp `#ffffff` panel brightness.
   - **Container Queries Standard**: `.middleSection` MUST declare container query context:
     ```css
     .middleSection {
       container-type: inline-size;
       container-name: middleSection;
     }
     ```
     Interior multi-column elements respond directly to container width:
     - Below 820px (`@container middleSection (max-width: 820px)`): analytical dual charts stack into a single column.
     - Below 860px (`@container middleSection (max-width: 860px)`): quick shortcuts wrap into a 2×2 grid.
   - **Flush Chrome Top Header (`ZFWorkstationHeader`)**:
     - Sits flush at the top of the middle section with `height: 50px; min-height: 50px;`, `border-radius: 0 !important;`, `background: #ffffff !important;`, and bottom hairline divider (`border-bottom: 1px solid var(--erp-border, #cbd5e1) !important;`).
     - Never spans across companion side widgets or the sidebar.
   - **Expansive Stage (`.stage`)**:
     - Stage area features `padding: 0.85rem 1.15rem 2rem 1.15rem;` against the `#f8fafc` canvas, giving analytical views like the General Ledger and Cockpit maximum width and breathing room.
3. **Flush Side Widgets Container (`.sideWidgetsContainer`)**:
   - Distinct companion column on the trailing edge (left side in RTL) docking flush from top to bottom (`height: 100%; border-radius: 0 !important; border: none !important; background: #ffffff !important;`).
   - Delimited by a single vertical hairline divider (`border-right: 1px solid var(--erp-border, #cbd5e1) !important;` in RTL, `border-left` in LTR).
   - Side widgets header is flush at `50px` height with `border-radius: 0 !important;`.
   - **Page-Dependent Presence**:
     - **Companion Views (3-Column)**: Cockpit and Daily Operations render the companion side widgets (`350px`).
     - **Dense Analytical Views (2-Column)**: General Ledger, Cost Allocation RSV, Feasibility Calculator, Contracts Registry, Taxes, Rescissions, and Partners Management omit companion widgets, allowing the middle section and stage to expand to 100% full width (`.middleSectionFullWidth`).

### B. Top Navbar Pattern
- **Dimensions**: Fixed `height: 50px`, `padding: 0 1.25rem`, `background: #ffffff`, `border-bottom: 1px solid var(--erp-border, #cbd5e1)`, `border-radius: 0 !important;`.
- **Bounded Scope**: Strictly confined to the top of the Middle Subpage Container. Does not extend over the side widgets or sidebar.
- **Leading Edge**: Hamburger button (mobile only) + Home icon (`17px`) + `/` divider + Breadcrumb title (`.headerTitle`).
- **Trailing Edge**: Formatted business date (`١٦ سبتمبر ٢٠٢٦` / `Sep 16, 2026`) + divider + Curated Accent Palette Customizer (`ZFPaletteCustomizer`) + Notifications bell button with count badge + Messages/Chat icon button (`MessageSquare` / `💬`).
- **Negative Rule**: **NO search bar, NO profile avatar, NO decorative tabs in the top bar.** The top bar remains strictly minimal chrome.

### C. Sidebar (ZFNavigationDock) Pattern
- **Docked 100vh Architecture**: Full-bleed docked navigation dock (`height: 100vh; border: none !important; border-radius: 0 !important; background: #ffffff !important; overflow: hidden;`), replacing the congested floating card layout. Flush vertical hairline divider (`border-left` in RTL, `border-right` in LTR).
- **Header & Navbar Alignment**: Fixed `50px` header flush with top of dock, terminating at a 1px divider aligned with the middle section top navbar.
- **Component Spacing Rhythm**:
  - Brand Header $\rightarrow$ User Profile Card: `0.55rem` (9px)
  - User Profile Card $\rightarrow$ Primary CTA Button: `0.55rem` (9px)
  - Primary CTA Button $\rightarrow$ First Navigation Group: `0.75rem` (12px)
  - Navigation Groups Vertical Gap: `0.55rem` (9px)
- **Collapsed Dock Standard**: Pinned at `width: 68px` with matching `0` border radius, centered controls, and icon-only tooltips.
- **Top Block**: Brand emblem logo + Title: **آل زكريا** (`Al Zakaria`) + Subtitle: **للتطوير والاستثمار العقاري** + collapse toggle button.
- **User Profile Block**: Positioned directly below brand header; clean neutral white card (`border-radius: 10px; background: #ffffff !important; border: 1px solid var(--erp-border, #cbd5e1); padding: 0.55rem 0.75rem;`) with neutral circular avatar (`32px`, `background: #f1f5f9 !important; border: 1px solid #cbd5e1 !important; color: #475569 !important; font-weight: 700;`, initials "ف.ز"). Strictly neutral — zero accent tinting on the user identity block. User name (**فريد زكريا**, `0.82rem`, weight 700), and role label (**المطور العقاري**, `0.70rem`, `#64748b`).
- **Primary CTA**: Full-width solid accent button (`+ طلب جديد` / `+ New Request`) in `var(--erp-accent, #2563eb)` with **full pill geometry** (`border-radius: 9999px !important; height: 38px; font-weight: 600; font-size: 0.82rem;`).
- **Nav Groups**: Uppercase section titles (`0.68rem`, weight 700, color `var(--erp-accent, #2563eb) !important; letter-spacing: 0.04em; text-transform: uppercase;`). Section titles take the active accent color to establish clear categorical hierarchy. Dropdown sub-menus closed by default on initial load.
- **Active Nav Item**: Indicated purely by accent text highlight (`color: var(--erp-accent, #2563eb); font-weight: 700;`) and a **3px solid vertical bar** on the leading edge (`inset-inline-start: 0; top: 3px; bottom: 3px;` - right in RTL, left in LTR) with **transparent background** (zero container pill wash). Badges anchor to uniform trailing position (left edge in RTL) with tabular-nums.
- **Footer**: Return to admin link (`لوحة العقارات العامة ↗`).

### D. Top-of-Page Anatomy & Quick Actions Policy

> **Implementation (2026-10-05):** every page header is `<ZFPageHeader title subtitle actions />` from `v2/common/ZFPageHeader.tsx` (1.35rem/700 title, one muted line with no account codes or bold spans, trailing actions with at most one `btnPrimary`). No in-page breadcrumb (the top bar already shows it), no badges beside the title, no two-tone titles. Cards use `ZFPanel`; page-level mode toggles use `ZFSegmented`; buttons use the shell classes `btnPrimary` / `btnSecondary` / `btnDanger` / `btnGhost` (+ `btnSm`), 34px tall. Inline gradients and card shadows are not allowed; accent colors come only from `--erp-accent*` tokens (use `color-mix(in srgb, var(--erp-accent) N%, transparent)` for tints).

All primary FIN-OS workstations must strictly follow the top-of-page anatomy established in the canonical ERP blueprint (`erp-dashboard.png`):

```
1. Chrome Top Navbar (Breadcrumb, Global Notifications, Messages, Business Date)
   ↓
2. Page Greeting & Subtitle (`.greetingHeader` with `h1.greetingTitle` + `p.greetingSub`)
   ↓
3. Section Header Bar (Title e.g. "المؤشرات المالية الرئيسية" + Native Pill Filter Selects on trailing edge)
   ↓
4. 4 Discrete Floating KPI Cards (`ZFKpiGrid` / `.discreteKpiGrid`)
   ↓
5. Workspace Grid (Main Column + Secondary Column Heuristic or Full Width)
```

- **Strict Ban on `.quickActionsHeaderCard` Banners**:
  The horizontal quick action header strip (`.quickActionsHeaderCard` with boxed shortcut buttons) is **deprecated and strictly banned** across all FIN-OS screens. It was a legacy artifact that created visual clutter and pushed key financial indicators down the viewport.
- **Primary CTA Placement**:
  The primary operational CTA (`+ طلب جديد` / `+ عقد جديد` / `+ Request`) belongs **exclusively in the primary sidebar (ZFNavigationDock)** or as a top toolbar button in dedicated sub-pages. It must never appear as a redundant massive banner above KPI metrics.
- **Secondary Actions**:
  Module-specific operational actions belong in the secondary companion column (e.g. Fast-Action Cash Desk `.launchpadCard`) or in dedicated modal dialogs, preserving an uncluttered reading flow from greeting directly to KPIs.


### E. Discrete Floating Stat Cards Pattern (`ZFKpiCard` & `.discreteKpiGrid`)

- **Architecture**: **4 discrete floating pure white panels (`#ffffff`)** arranged in a responsive grid (`repeat(4, 1fr)`). Never cram metrics into a single monolithic card with internal hairline dividers.
- **Grid Container (`.discreteKpiGrid`)**:
  - Desktop (`> 1100px`): `display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; width: 100%;`
  - Tablet (`768px - 1100px`): `grid-template-columns: repeat(2, 1fr); gap: 0.85rem;`
  - Mobile (`< 768px`): `grid-template-columns: 1fr; gap: 0.75rem;`
- **Card Styling (`.discreteKpiCard` / `ZFKpiCard`)**:
  - Surface: `background: #ffffff; border: 1px solid var(--erp-border, #cbd5e1); border-radius: 12px; padding: 1.15rem 1.25rem;`
  - Box Shadow: `box-shadow: none !important;` (Clean 1px blueprint hairlines over heavy drop shadows).
  - Hover: `border-color: #94a3b8; transition: border-color 0.15s ease;`
- **Semantic Icon Squircles & Dynamic Accent Reactivity**:
  - Every discrete KPI card must feature a distinct contextual semantic Lucide icon (e.g. `Wallet`, `FileText`, `HardHat`, `Receipt`, `Coins`).
  - Squircles are 28×28px (`width: 28px; height: 28px; border-radius: 7px; border: 1px solid rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center;`).
  - Dynamic Accent Support: Icon squircles dynamically consume `var(--erp-accent-subtle)` for the background wash and `var(--erp-accent)` for the glyph color when `accentColor="accent"`, updating synchronously with `ZFPaletteCustomizer`. Semantic colors (`emerald` / `amber` / `purple`) are preserved for non-theme specific operational indicators.
- **Anatomy**:
  1. **Top Header Row**: Metric label (`font-size: 0.76rem; font-weight: 600; color: #64748b;`) paired with the 28×28px semantic icon squircle on the leading edge + subtle info icon `(i)` (`color: #94a3b8; width: 14px; height: 14px;`) or trailing badge on the trailing edge.
  2. **Primary Metric Value**: Large bold number (`font-size: 1.55rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; line-height: 1.2; margin: 0.35rem 0 0.25rem 0;`) paired with currency symbol (`font-size: 0.82rem; font-weight: 600; color: #64748b;`).
  3. **Footer Row**:
     - **Delta Percentage**: Plain colored text with trend indicator (e.g. `▲ +14.2% مقارنة بالفترة السابقة` in `#16a34a` or `▼ -2.1%` in `#dc2626`, `font-size: 0.74rem; font-weight: 600;`). **NO badge/pill background on stat deltas.**
     - **OR Embedded Mini Sparkline**: Subtle SVG curve rendered on the trailing edge for financial trajectory visualization.
- **Strict Prohibition on Color-Coded Card Fills**:
  - Never tint the card container background to reflect an alert or status (e.g. no pink `#fef2f2`, amber `#fffbeb`, or light green `#ecfdf5` card surfaces).
  - All stat cards must maintain pure white `#ffffff !important;` surfaces.
  - Statuses and alerts must be communicated via the 28×28px semantic squircle icon badge on the leading edge, dark neutral `#0f172a` typography, and soft micro-pills (`.statusPill`) on the trailing edge.

### F. Canonical Data Table Pattern & Navigation Tabs (`media_1789554942416.png` Blueprint)

All enterprise data tables across FIN-OS must strictly adhere to the canonical table blueprint:

- **Canonical Classes Hierarchy**:
  - Container: `.canonicalTableCard` (`.dataTableCard`)
  - Header Controls Bar: `.canonicalTableHeader` (`.dataTableTabsHeader`)
  - Navigation Tabs: `.canonicalTabsUnderline` (`.tableTabsUnderline`)
  - Individual Tabs: `.canonicalUnderlineTab` (`.underlineTab`), `.canonicalUnderlineTabActive` (`.underlineTabActive`)
  - Filter Selects: `.canonicalFilterSelect` (`.tableSelect`)
  - Search Input: `.canonicalSearchBox` / `ZFSearchBar`
  - Table: `.canonicalTable` (`.minimalTable`)
  - Thead: `.canonicalThead`
  - Th: `.canonicalTh`
  - Column Content: `.canonicalThContent` (`.thContent`)
  - Sort Chevrons: `.canonicalSortIcon` (`.thSortIcon`)
  - Table Row: `.canonicalRow` (`.clickableTableRow`)
  - Table Cell: `.canonicalTd`
  - Footer Bar: `.canonicalTableFooter` (`.tableFooterRow`)
  - Footer Record Count: `.canonicalFooterCount` (`.tableFooterCount`)
  - Pagination Controls: `.canonicalPaginationGroup`, `.canonicalPaginationBtn`, `.canonicalPaginationBtnActive`

- **Card Container (`.canonicalTableCard`)**:
  - `background: #ffffff; border: 1px solid var(--erp-border, #cbd5e1); border-radius: 12px; overflow: hidden; box-shadow: none !important; width: 100%;`

- **Single-Row Controls Header (`.canonicalTableHeader`)**:
  - Single horizontal bar (`display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; padding: 0 1.25rem; min-height: 54px; border-bottom: 1px solid var(--erp-border, #cbd5e1); background: #ffffff;`).
  - **Leading Edge (RTL right)**: Underline tabs (`.canonicalTabsUnderline`):
    - Active tab (`.canonicalUnderlineTabActive`): `color: #0f172a; font-weight: 700; border-bottom: 2.5px solid var(--erp-accent, #2563eb);` sitting flush at bottom edge.
    - Inactive tab (`.canonicalUnderlineTab`): `color: #64748b; font-weight: 500; border-bottom: 2.5px solid transparent;`
  - **Trailing Edge (RTL left)**: Filter controls (`.canonicalHeaderControls`):
    - Clean pill filter select (`.canonicalFilterSelect`): `height: 34px; padding: 0 12px; border: 1px solid var(--erp-border, #cbd5e1); border-radius: 8px; background: #ffffff; font-size: 0.78rem; color: #475569;`
    - Search input (`.canonicalSearchBox` / `ZFSearchBar`): `height: 34px; padding: 0 12px; border: 1px solid var(--erp-border, #cbd5e1); border-radius: 8px; background: #ffffff; font-size: 0.78rem; color: #475569;` with magnifying glass icon `🔍`.

- **Table Header (`.canonicalThead` & `.canonicalTh`)**:
  - **Strict Invariant**: Dark grayish/teal header background wash is **strictly eliminated**.
  - Header Surface: `background: #fafbfc !important; border-bottom: 1px solid var(--erp-border, #cbd5e1);`
  - Typography: `color: #64748b; font-size: 0.75rem; font-weight: 600; padding: 0.85rem 1.25rem; text-align: start; letter-spacing: 0.02em;`
  - Sort Chevrons: Column label pairs with subtle `ChevronsUpDown` (size 12, color `#94a3b8`) positioned on the trailing edge of the label text.

- **Table Rows & Click Targets (`.canonicalRow` & `.canonicalTd`)**:
  - Row height: generous ~54-58px per row with airy padding `padding: 0.95rem 1.25rem;`.
  - Row dividers: subtle hairline `border-bottom: 1px solid #f1f5f9;`.
  - Hover state: `.canonicalRow:hover td { background-color: #f8fafc !important; }`.
  - Full-Row Click Target: the entire row is interactive (`cursor: pointer; transition: background-color 0.12s ease;`), triggering slide-over drawer inspection on click. Repetitive per-row action buttons are strictly banned.
  - Primary Entity column: bold typography (`font-size: 0.85rem; font-weight: 700; color: #0f172a;`).
  - Secondary detail column: muted body text (`font-size: 0.80rem; font-weight: 400; color: #64748b;`).
  - Monetary columns: bold tabular numbers (`font-variant-numeric: tabular-nums; font-weight: 700; color: #0f172a; font-size: 0.85rem;`), with currency `ج.م` in smaller muted font (`0.75rem`, `#64748b`).

- **Soft Pastel Micro-Pills (`.statusPill`)**:
  - Clean rounded pill (`border-radius: 6px; padding: 3px 10px; font-size: 0.72rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; line-height: 1.2;`):
    - **Green (`.statusPillGreen`)**: `background: #ecfdf5; color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.15);` — Active (`ساري التعاقد`), Approved (`معتمد`), Cleared (`محصل`).
    - **Amber (`.statusPillAmber`)**: `background: #fffbeb; color: #d97706; border: 1px solid rgba(217, 119, 6, 0.15);` — In Safe (`في الخزنة`), Pending review.
    - **Red (`.statusPillRed`)**: `background: #fef2f2; color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.15);` — Rescinded (`فسخ واسترداد`), Bounced (`مرتد`), Overdue.
    - **Blue (`.statusPillBlue`)**: `background: #eff6ff; color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.15);` — Delivered (`تم التسليم`), Deposited in bank (`مودع بالبنك`).
    - **Neutral (`.statusPillNeutral`)**: `background: #f1f5f9; color: #64748b; border: 1px solid rgba(100, 116, 139, 0.15);` — Archived (`مؤرشف`), Cancelled.

- **Footer & Pagination Bar (`.canonicalTableFooter`)**:
  - Background: clean `#ffffff`, `padding: 0.75rem 1.25rem; border-top: 1px solid var(--erp-border, #cbd5e1);`
  - Leading edge (RTL right): Record summary `عرض 1 - 5 من أصل 11 سجل` (`font-size: 0.75rem; color: #64748b; font-weight: 500; font-variant-numeric: tabular-nums;`).
  - Trailing edge (RTL left): Page size select + Clean pagination buttons `<` `[1]` `[2]` `[3]` `>` (`border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; min-width: 30px; height: 30px;`) with active page highlighted in `var(--erp-accent, #2563eb)` + optional trailing deep link to full registry.

### G. Canonical Modal Shell Pattern (`ZFModalShell`)
- **Overlay / Backdrop**: `position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(2px); z-index: 1000;`
- **Modal Card**:
  - Max width: `min(94vw, 680px)` (standard) or `min(96vw, 960px)` (wide / multi-column wizards).
  - Background: `#ffffff`, Border: `1px solid var(--erp-border, #cbd5e1)`, Border-radius: `12px`, Elevation: `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08)`.
- **Header**:
  - Padding: `0.95rem 1.25rem`, Border-bottom: `1px solid var(--erp-border, #cbd5e1)`.
  - Icon badge: 32px circle with `background: #eff6ff; color: #2563eb;`
  - Title: `font-size: 0.92rem; font-weight: 700; color: #0f172a;`
  - Subtitle: `font-size: 0.74rem; color: #64748b; margin-top: 2px;`
  - Close button: 28px square button with subtle hover background (`#f8fafc`).
- **Body**: Scrollable (`max-height: calc(90vh - 120px); overflow-y: auto; padding: 1.25rem 1.35rem;`).
- **Sticky Footer Action Bar**:
  - Padding: `0.85rem 1.25rem`, Border-top: `1px solid var(--erp-border, #cbd5e1)`, Background: `#ffffff`.
  - Buttons: Secondary cancel button (`.pillBtnOutline`) + Primary submit button (`.pillBtnSolid` in `#2563eb`).

### H. Canonical Slide-over Drawer Shell Pattern (`ZFDrawerShell`)
- **Overlay**: `rgba(15, 23, 42, 0.35)` with `backdrop-filter: blur(4px)`.
- **Panel Dimensions**: Max width `min(92vw, 460px)`, `height: 100vh`, `position: fixed; top: 0; bottom: 0; background: #ffffff; z-index: 1010;`
- **Directional Slide-in Animation**:
  - **RTL**: Pinned to the left (`left: 0; border-right: 1px solid var(--erp-border, #cbd5e1); animation: slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1);`)
  - **LTR**: Pinned to the right (`right: 0; border-left: 1px solid var(--erp-border, #cbd5e1); animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1);`)
- **Header**: Compact header with icon badge, title, record identifier pill, and close button.
- **Body**: Smooth scrolling container with tabbed filters and collapsible detail cards.

### I. Dual-Tier Dropdown Standard (Native Select vs. ZFCustomSelect)
- **Tier 1: Simple Static Filters (`.filterSelect`)**:
  - Period, project, and status filters across table filter bars MUST remain native `<select>` elements styled with `.filterSelect`.
  - **Do NOT convert these to heavy custom comboboxes.**
  - Tokens: `height: 32px; padding: 0 0.65rem; border: 1px solid var(--erp-border, #cbd5e1); border-radius: 6px; background: #ffffff; color: #334155; font-size: 0.75rem; font-family: inherit; cursor: pointer; outline: none;`
  - Hover: `border-color: var(--erp-border-hover, #94a3b8);` Focus: `border-color: #2563eb;`
- **Tier 2: Rich / Searchable Comboboxes (`ZFCustomSelect`)**:
  - Used exclusively for complex entity pickers: partner allocation, unit selection, searchable contractor pickers, multi-field dropdowns with badges and secondary prices.
  - Must use `DESIGN_SYSTEM.md` tokens: white panel, 1px `var(--erp-border, #cbd5e1)` border, active item highlight `#eff6ff` with `#2563eb` text and leading indicator. Zero legacy gold (`#946f23`) tokens allowed.

### J. Enterprise Toast Notification Standard (`ZFToaster`)
- **Library**: Sonner.
- **Position**: `bottom-left` consistently in both RTL and LTR viewports.
- **Card Tokens**:
  - Background: `#ffffff` (crisp white, never default saturated solid color cards).
  - Border: `1px solid var(--erp-border, #cbd5e1)`.
  - Radius: `8px`.
  - Box Shadow: `0 4px 12px rgba(15, 23, 42, 0.08)`.
  - Typography: `'ThmanyahSans', 'Cairo', sans-serif` with `font-variant-numeric: tabular-nums`.
- **Status Indicators**:
  - Subtle colored icon + text: Success (`#16a34a`), Error (`#dc2626`), Info (`#2563eb`).
  - Close button on trailing edge with clean `#94a3b8` color.

### K. Action Launchpad Card Pattern
- **Container**: Contiguous secondary-column card (`border: 1px solid var(--erp-border, #cbd5e1); border-radius: 12px; background: #ffffff; padding: 1.1rem;`).
- **Header**: Icon badge (`32px` circle with `background: #eff6ff; color: #2563eb`), bold title (`0.88rem`, weight 700, `#0f172a`), and helper subtitle (`0.74rem`, `#64748b`).
- **Action Buttons**: List of full-width action triggers (`.actionBtnClean`):
  - Border: `1px solid var(--erp-border, #cbd5e1); border-radius: 8px; background: #ffffff;`
  - Hover: `background: #f8fafc; border-color: var(--erp-border-hover, #94a3b8);`
  - Leading Icon: 32px circular icon badge (`background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center;`).
  - Text: Label (`font-size: 0.80rem; font-weight: 600; color: #1e293b;`) and sub-description (`0.70rem; color: #64748b;`).
  - Trailing: Subtle directional chevron (`ChevronLeft` for RTL, `ChevronRight` for LTR).

### L. Collapsible Urgent Alert Widget Pattern
- **Purpose**: Highlight critical operational or financial anomalies (e.g. overdue installment collections, bounced cheques, critical liquidity thresholds) in the secondary companion column without causing permanent screen clutter.
- **Container**: Card with soft red wash background (`background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 0.9rem 1rem;`).
- **Header (`.urgentAlertHeader`)**:
  - Alert icon (`AlertTriangle` in `#dc2626`).
  - Alert title (`font-size: 0.82rem; font-weight: 700; color: #991b1b;`).
  - Count & Exposure Badge (`background: #fee2e2; color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 9999px; padding: 2px 8px; font-weight: 700; font-size: 0.72rem;`).
  - Toggle Chevron (`ChevronDown` / `ChevronUp` in `#dc2626`, cursor: pointer).
- **Collapsible Body (`.urgentAlertBody`)**:
  - Smooth collapse/expand state (`overflow: hidden; transition: max-height 0.2s ease-in-out;`).
  - Total exposure summary in `font-variant-numeric: tabular-nums`.
  - Itemized rows displaying unit reference, client name, days overdue indicator, and direct collection trigger shortcut ("تحصيل الآن" / Collect Now).

### M. Side Widgets Real Data & Navigation Protocol

The Side Widgets Container (`#zf-workstation-side-widgets`) serves as the operational copilot for high-frequency financial workflows. To ensure enterprise integrity, it operates under two strict engineering mandates:

1. **Zero Fake Static Data Policy**:
   - Every metric, alert count, exposure figure, calendar agenda item, and completion percentage MUST derive 100% from live store props (`pdcRecords`, `propertyCosts`, `schedules`, `properties`).
   - Hardcoded fallback constants (`: 7;`, `: 1,850,000`, `: 3`, `: 2,420,000`), fake supplier strings (e.g. "النيل للمقاولات العمومية"), and mock progress percentages are **strictly banned**.
   - If no records exist for an alert or agenda window, widgets must render honest zero-states (`0`, `0.00 ج.م`, or clean empty states such as "لا توجد استحقاقات مجدولة لهذا الأسبوع").
2. **Interactive Affordance & Direct Module Routing**:
   - Alert items must feature explicit pointer affordance (`cursor: pointer !important;`) and trailing navigation glyphs (`ChevronLeft` in RTL, `ChevronRight` in LTR).
   - Clicking an alert item routes directly to the dedicated module or registry tab:
     - Cheque alerts $\rightarrow$ `onNavigateTab('pdc')`
     - Contractor payables $\rightarrow$ `onNavigateTab('construction')`
     - Journal imbalances $\rightarrow$ `onNavigateTab('ledger')`
   - Calendar agenda dues open instant slide-over inspection drawers (`onInspectCheque`, `onInspectContract`) rather than remaining inert text blocks.

### N. Quick Shortcuts Operational Standards (`.quickShortcutsGrid`)

Positioned directly below the dual analytical charts and above the canonical data table, the Quick Shortcuts row provides 4 high-frequency operational triggers. Every button MUST trigger a distinct, high-value modal or workflow:

1. **عقد جديد (New Contract)**:
   - Icon: `<FilePlus size={18} />` in `var(--erp-accent-subtle)` / `var(--erp-accent)` badge.
   - Action: `onOpenNewContract` $\rightarrow$ triggers `handleOpenGenericNewContract` to launch the multi-tier contract creation wizard.
2. **مصروف جديد (New Expense)**:
   - Icon: `<Wallet size={18} />` in soft amber badge (`background: #fffbeb; color: #d97706;`).
   - Action: `onOpenQuickTransaction` $\rightarrow$ launches `QuickTransactionModal` for double-entry site expense / voucher posting.
3. **تحصيل الأقساط (Collect Installments)**:
   - Icon: `<Coins size={18} />` in soft green badge (`background: #ecfdf5; color: #16a34a;`).
   - Action: `handleOpenInstallmentCollection` $\rightarrow$ queries active/due PDCs (`In Safe`, `Pending`, `Bounced`) and triggers `onCollectItem(target)`, launching `HandCollectionModal`.
4. **سداد مستحقات مقاول (Pay Contractor)**:
   - Icon: `<Building2 size={18} />` (or `<CreditCard size={18} />`) in soft purple badge (`background: #f5f3ff; color: #7c3aed;`).
   - Action: `onOpenNewCheque || onOpenQuickTransaction` $\rightarrow$ launches `NewChequeModal` for contractor invoice disbursements.

> [!WARNING]
> **Strict Anti-Duplicate Modal Invariant**:
> Binding multiple shortcut buttons to the same dialog (e.g. mapping both "مصروف جديد" and "سند قبض فوري" to `QuickTransactionModal`) is **strictly banned**. Each card in the 4-shortcut row must lead to an independent, dedicated operational workflow.

### O. Fast-Action Cash Desk & Calendar Strip Widget Patterns
- **Fast-Action Cash Desk Widget (Daily Cash Desk)**:
  - **Telemetry Metadata Row (`.widgetMetaRow`)**: Displays current formatted business date (`.widgetDateText`, `0.74rem`, weight 600, `#64748b`) paired with working time telemetry (`.widgetTimeInfo`, `0.76rem`, weight 700, tabular-nums, `color: var(--erp-accent, #2563eb)`).
  - **Operational Action Buttons**:
    - **Filled Primary Action (`.pillBtnSolid`)**: High-priority operational trigger (`+ طلب جديد` / `+ تحصيل أقساط`). Background `var(--erp-accent, #2563eb)`, color `#ffffff`, weight 600, border-radius `8px`.
    - **Unfilled Outline Action (`.pillBtnOutline`)**: Secondary/exit operational action (`صرف دفعة / مستخلص` / Clock Out). Pure crisp white surface (`background: #ffffff`), accent border (`1px solid var(--erp-accent, #2563eb)`), and accent text (`color: var(--erp-accent, #2563eb)`). On hover, soft accent tint wash (`var(--erp-accent-tint, rgba(37, 99, 235, 0.06))`). Never generic gray outlines.
- **Calendar Strip Selection Highlight (`.calendarDayTileActive`)**:
  - Selected day in the weekly/monthly calendar strip uses a lightweight accent selection wash:
    - Background: `var(--erp-accent-tint, rgba(37, 99, 235, 0.12))`.
    - Border: `1px solid var(--erp-accent, #2563eb)`.
    - Text & Number: `color: var(--erp-accent, #2563eb)`.
    - Prohibited: Heavy solid blue blocks (`#2563eb` fill) that overpower adjacent telemetry.
  - **Calendar Tab Strip (`.calendarTabActive`)**: Active tab (e.g. Schedule vs Tasks) uses `color: var(--erp-accent, #2563eb)` with a `2px solid var(--erp-accent, #2563eb)` bottom indicator bar.

## 5. ApexCharts Theming Standards

All charts must use the shared wrapper component [`ERPApexChart.tsx`](file:///home/lyr1csan/project/Real-Estate-Platform/zakaria-farid/src/components/admin/erp/v2/charts/ERPApexChart.tsx).

- **Colors**:
  - Series 1 (Primary): `#2563eb` (Royal Blue)
  - Series 2 (Secondary): `#334155` (Slate Navy)
  - Series 3 (Tertiary): `#0d9488` (Teal)
  - Series 4 (Quaternary): `#f59e0b` (Amber)
- **Stroke**: `curve: 'smooth'`, width `[3.5, 2.5]` for multi-series area/line charts.
- **Fill**: Area charts use gradient fill (`opacityFrom: 0.35`, `opacityTo: 0.02`, `stops: [0, 95, 100]`).
- **Grid (Full Cartesian Technical Grid)**:
  - Full blueprint Cartesian grid: both horizontal and vertical grid lines enabled (`xaxis: { lines: { show: true } }`, `yaxis: { lines: { show: true } }`).
  - Grid line styling: `borderColor: '#e2e8f0'`, `strokeDashArray: 2`.
  - Axis border and tick markers: `color: '#cbd5e1'`.
  - Yields high-precision technical CAD/blueprint alignment across financial telemetry and cash flow projections.
- **Tooltips**: Custom HTML tooltip card (`#ffffff` background, `1px solid var(--erp-border, #cbd5e1)` border, `8px` radius, `0 4px 12px rgba(15, 23, 42, 0.08)` shadow, RTL alignment, circular dot indicators, and tabular number formatting).
- **Animations**:
  ```ts
  animations: {
    enabled: true,
    easing: 'easeinout',
    speed: 600,
    animateGradually: { enabled: true, delay: 150 },
    dynamicAnimation: { enabled: true, speed: 350 },
  }
  ```
- **Negative Rule**: Never render default unstyled ApexCharts with black floating tooltips or harsh polygonal step lines.

---

## 6. RTL & Localization Rules

1. **Root Configuration**: FIN-OS is strictly RTL by default (`dir="rtl"`). All CSS flex/grid layouts must support native mirroring.
2. **Logical Alignment**: Use `text-align: inherit` or flex `justify-content: space-between`. Never hardcode `text-align: left` unless specifically styling code or LTR numbers.
3. **Border Dividers**: Stat block vertical dividers must attach to `border-left` in RTL and `border-right` in LTR.
4. **Directional Glyphs**:
   - Next / Forward: `ChevronLeft` in RTL, `ChevronRight` in LTR.
   - Return / Back: Arrows must point backwards relative to the reading direction.
5. **Chart Y-Axis**: Set `yaxis.opposite: isAr` so that financial value scales render on the right edge in Arabic.

---

## 7. Responsive Breakpoints

- **Mobile (`< 768px`)**:
  - Sidebar hidden off-canvas into a slide-over drawer triggered by header hamburger.
  - Stat cards stack into a single vertical column.
  - Two-column layout stacks vertically (main column first, secondary column below).
  - Data tables scroll horizontally inside `.tableContainer`.
- **Tablet (`768px - 1100px`)**:
  - Sidebar remains collapsible.
  - Stat cards render as a 2x2 grid.
  - Two-column layout collapses to a single stacked column.
- **Desktop (`> 1100px`)**:
  - Full two-column grid (`1fr + 340px`).
  - Stat cards render in 4 horizontal columns separated by vertical dividers.

---

## 8. Explicit "Don't Repeat This" Invariants

These negative constraints reflect explicit corrections made during previous design audits and must never be reintroduced:

1. **DON'T render legacy `.quickActionsHeaderCard` shortcut strips**: Massive horizontal boxed quick action strips at the top of views (e.g. `.quickActionsHeaderCard`) are **strictly banned**. They clutter the workstation header, displace critical financial KPIs downward, and duplicate navigation already cleanly provided by the sidebar and primary CTA (`+ طلب جديد`).
2. **DON'T duplicate actions between overlapping UI elements**: Avoid placing identical triggers (e.g. "+ عقد جديد") in three adjacent spots on the same screen without clear contextual differentiation.
3. **DON'T use monolithic cramped single-block KPI cards**: Always render KPI metrics as **4 discrete floating white cards** (`.discreteKpiCard` inside `.discreteKpiGrid`) with 1px structural borders (`#e2e8f0` / `#cbd5e1`). Monolithic single-card stat blocks with internal vertical hairlines are deprecated and forbidden.
4. **DON'T put badge/pill backgrounds on stat percentage deltas**: Deltas must be clean, plain colored text (`#16a34a` or `#dc2626`) with a trend arrow, or paired with a mini sparkline.
5. **DON'T use solid saturated badges or unstyled plain status text**: All statuses in tables must use **soft pastel micro-pills** (`.statusPill` with `#ecfdf5`/`#fffbeb`/`#fef2f2` wash). Saturated solid color blocks and plain unstyled text are both strictly prohibited.
6. **DON'T clutter data table rows with bloated action buttons**: Table rows must be clean, uncluttered, and clickable (`.clickableTableRow`). Inspection details belong in slide-over drawers, not inline repetitive buttons.
7. **DON'T hardcode colors outside the defined palette (especially `#000`/black)**: Use system tokens (`#0f172a` for titles, `#334155` for body, `#64748b` for muted, `#cbd5e1` / `#e2e8f0` for borders, `#f1f5f9` for canvas).
8. **DON'T reuse legacy pre-overhaul components restyled in place**: Verify components are canonical primitives (`ZFKpiCard`, `ZFModalShell`, `ZFDrawerShell`, `ZFCustomSelect`), not restyled legacy lookalikes with gold variables or old bento layouts.
9. **DON'T use default ApexCharts styles or remove Cartesian grid lines**: Always wrap charts with `ERPApexChart` using the CAD/blueprint technical grid (`xaxis.lines.show: true`, `yaxis.lines.show: true`, `borderColor: '#e2e8f0'`, `strokeDashArray: 2`).
10. **DON'T force two-column layouts on dense data screens**: General Ledger, Cost Allocation Matrix, and Feasibility Calculator must occupy full 100% viewport width.
11. **DON'T format currency as plain strings**: Always apply `font-variant-numeric: tabular-nums` to numbers and align decimals.
12. **DON'T deviate from canonical accounting math**: Never touch GL posting rules, debit/credit invariants, or test assertions. Financial values must derive from `canonicalMetrics.ts` only.
13. **DON'T break Arabic / RTL alignment**: App is strictly `dir="rtl"`. Logical margins and padding must mirror correctly.
14. **DON'T use `100vw` in RTL workstation shells (100vw Prohibition)**: `100vw` causes browser-level scrollbar-gutter horizontal overflow in RTL desktops, crushing padding and margins. Use `width: 100%; max-width: 100vw; min-width: 0;` and uniform `12px` (`0.75rem`) outer margins.
15. **DON'T render the sidebar as a full-bleed window edge rail**: The navigation dock must be a discrete floating white card (`12px` radius, `1px` `#cbd5e1` border, `#ffffff`), matching Middle and Side Widgets containers in geometry, radius, and elevation.
16. **DON'T introduce mismatched column brightness (Unified Pure White Triptych)**: All 3 workstation columns (`.sidebar`, `.middleSection` / `.stage`, `.sideWidgetsContainer`) must share `#ffffff !important;` panel background brightness against the `#f1f5f9` canvas. Dim or dark middle section canvas treatments are prohibited.
17. **DON'T use window viewport `@media` queries for subpage interior layouts**: Interior components must use container queries (`@container middleSection`) on `.middleSection` (chart stacking below 820px container width; shortcut wrapping below 860px container width) rather than viewport media queries that fail on multi-column workstations.
18. **DON'T inject fake static fallback data (Zero Fake Static Data Policy)**: Hardcoded numeric fallbacks (`: 7;`, `: 1,850,000`, `: 3`, `: 2,420,000`) and mock agenda strings are strictly banned. Every metric and list item must derive 100% from live store props or render an honest zero-state.
19. **DON'T render non-interactive inert alert items**: Urgent alert items must have explicit `cursor: pointer !important;`, directional chevrons (`ChevronLeft` in RTL), and route directly to dedicated modules (`onNavigateTab('pdc')`, `'construction'`, `'ledger'`).
20. **DON'T bind duplicate modals to quick shortcut buttons**: Every card in `.quickShortcutsGrid` must trigger a distinct operational workflow (1. `عقد جديد` New Contract, 2. `مصروف جديد` QuickTransactionModal, 3. `تحصيل الأقساط` HandCollectionModal, 4. `سداد مستحقات مقاول` NewChequeModal). Mapping multiple buttons to the same modal is strictly banned.
21. **DON'T use tinted surfaces or color-coded card backgrounds (Ban Tinted Surfaces)**: Strictly banned: Do not use pastel, low-opacity, or colored background fills (e.g. `bg-red-50`, `bg-emerald-50`, `#fef2f2`, `#fffbeb`, `#ecfdf5`). All containers, modal cards, and KPI panels must have a neutral background (`#ffffff !important;` white, dark neutral, or transparent). Never tint the entire card container to reflect a state, severity, or status. Statuses, alerts, and metrics must be communicated via semantic Lucide icons in 28×28px squircles (`#f8fafc` surface with `#e2e8f0` border), dark neutral value typography (`#0f172a`), and soft micro-pills (`.statusPill`), never by washing the card surface.
22. **DON'T use legacy gold or brass tokens (`#946f23`, `#d4af37`, `#b8903e`, `#c5a059`)**: The FIN-OS design system strictly bans hardcoded legacy gold palettes. All action triggers, badges, and highlights must dynamically consume the active system accent (`var(--erp-accent)`, `var(--erp-accent-subtle)`, `var(--erp-accent-tint)`) or neutral slate tokens.
23. **DON'T calculate financial formulas inline (Single Source of Truth Invariant)**: Operating cash figures, A/R, WIP, partner contributions, and operating assets must be imported directly from `src/lib/erp/canonicalMetrics.ts` (`CanonicalMetrics`). Inline mathematical approximations or custom fallbacks are strictly prohibited.

---

## 9. Curated Accent Palette Customization System (FIN-OS + Admin)

One stored choice drives **both FIN-OS and the Admin dashboard** (`useAccentPreset` in `src/lib/theme/accentPalette.ts`; Admin applies it through `AdminAccentBridge` with per-preset dark-mode values). Operators can personalize the platform's primary accent color from a curated set of 8 pre-verified, enterprise-grade palettes.

### 9.A. No Open Color Picker Invariant
To guarantee WCAG AA accessibility, contrast legibility (≥ 4.5:1 against white backgrounds and white button text), and institutional dignity, **freeform/arbitrary color pickers are strictly banned**. Only the 8 hand-verified presets below may be selected.

### 9.B. Curated Presets & Precomputed Tokens

| Preset ID | Name (EN / AR) | `--erp-accent` (Base) | `--erp-accent-hover` | `--erp-accent-subtle` | `--erp-accent-tint` | Contrast Ratio |
|---|---|---|---|---|---|---|
| `royal_blue` (Default) | Royal Blue / الأزرق الملكي | `#2563eb` | `#1d4ed8` | `#eff6ff` | `rgba(37, 99, 235, 0.08)` | 5.17:1 (Pass) |
| `midnight_navy` | Midnight Navy / الكحلي الداكن | `#1e3a8a` | `#172554` | `#f0f4f8` | `rgba(30, 58, 138, 0.08)` | 10.36:1 (Pass) |
| `steel_slate` | Institutional Slate / الرمادي الفولاذي | `#334155` | `#1e293b` | `#f1f5f9` | `rgba(51, 65, 85, 0.08)` | 10.35:1 (Pass) |
| `deep_emerald` | Deep Teal / الزمردي التيل | `#0f766e` | `#115e59` | `#f0fdfa` | `rgba(15, 118, 110, 0.08)` | 5.47:1 (Pass) |
| `sovereign_indigo` | Sovereign Indigo / النيلي الوقور | `#4338ca` | `#3730a3` | `#eef2ff` | `rgba(67, 56, 202, 0.08)` | 7.90:1 (Pass) |
| `deep_bordeaux` | Deep Bordeaux / الخمري الرصين | `#991b1b` | `#7f1d1d` | `#fef2f2` | `rgba(153, 27, 27, 0.08)` | 8.31:1 (Pass) |
| `corporate_bronze` | Warm Bronze / البرونزي المكتبي | `#854d0e` | `#713f12` | `#fefce8` | `rgba(133, 77, 14, 0.08)` | 6.85:1 (Pass) |
| `obsidian_charcoal` | Obsidian Charcoal / الفحمي الأوبسيديان | `#18181b` | `#09090b` | `#f4f4f5` | `rgba(24, 24, 27, 0.08)` | 17.50:1 (Pass) |

### 9.C. Permanent Semantic Status Lock
Semantic status colors must **never** shift with the accent palette. The following tokens remain permanently fixed across all themes:
- **Success / Positive Delta**: `#16a34a` (green)
- **Danger / Negative Delta / Void**: `#dc2626` (red)
- **Warning / Pending / Overdue**: `#d97706` (amber)
- **Informational / Neutral Telemetry**: `#0284c7` (sky blue)

### 9.D. Runtime Injection & Persistence
1. **Persistence**: Choice is saved in `localStorage` under key `fin_os_accent_preset_v1`.
2. **CSS Variable Scope**: Injected on the root workstation container `<div data-erp-workstation="true" ...>` and `document.documentElement` scoped to `/fin-os`.
3. **ApexCharts Alignment**: `ERPApexChart` automatically synchronizes its primary series color (`colors[0]`) to `--erp-accent`, preserving visual cohesion between charts and the shell theme.

---

## 10. Client Operating Cash & Balance Sheet Metrics Specification

FIN-OS enforces a strict, centralized metrics framework defined in [`canonicalMetrics.ts`](file:///home/lyr1csan/project/Real-Estate-Platform/zakaria-farid/src/lib/erp/canonicalMetrics.ts). All financial dashboards and operational views must bind to these canonical getters:

### 10.A. Canonical Metrics Table

| Metric Name (AR / EN) | Canonical Function | Accounting Source & CoA Code | Formula / Inclusion Rules |
| :--- | :--- | :--- | :--- |
| **Net Cash Balance**<br>صافي السيولة النقدية المتاحة | `getAvailableCash()` | Operating Safe (`101000`) + Operating Bank (`102000`) | Sum of Debits minus Credits across liquid cash accounts. Excludes restricted maintenance escrow (`102100`) and uncollected checks (`104000`). |
| **Partner Financing**<br>تمويل ورأس مال الشركاء المضخوخ | `getPartnerFinancing()` | Partner Contributed Capital (`301000`) / Partner Calls | Sum of capital injections (`CAPITAL_INJECTION`) and funded partner capital calls. Debits decrease, credits increase equity. |
| **Partner Drawings**<br>مسحوبات وتوزيعات أرباح الشركاء | `getPartnerDrawings()` | Partner Distributions Paid (`303000`) | Sum of paid profit distributions (`PROFIT_DISTRIBUTION`). Contra-equity account reducing net partner balance. |
| **Accounts Receivable (A/R)**<br>أقساط العملاء والتعاقدات المستحقة | `getAccountsReceivable()` | Contract Notes Receivable (`103000`) / Contracts Registry | `Sum(gross_contract_value - total_cash_collected)` across all active, non-rescinded contracts. Clamped to $\ge 0$. |
| **Construction WIP**<br>تكاليف ومواد البناء المنفذة | `getConstructionWIP()` | Projects Under Construction (`105000`, `150000`–`153000`) | Tiered data-availability resolution: Approved RSV Allocations $\rightarrow$ Real-time Property Costs (net of refunds/adjustments) $\rightarrow$ GL WIP debits minus credits. |
| **Payables & Loans (A/P)**<br>التزامات المقاولين والضرائب | `getPayablesAndLoans()` | Trade Payables (`201000`) + Tax Liabilities (`taxRecords`) | Remaining unpaid contractor installments + pending unremitted sales/commercial taxes. |
| **Operating Assets (Formula)**<br>إجمالي أصول ومحفظة التشغيل | `getOperatingAssets()` | Direct Composite Metric | **Canonical Client Formula:**<br>$\text{Operating Assets} = \text{Cash} + \text{A/R} + \text{WIP}$ |

### 10.B. Operating Cash Suite Getter
Callers can query the entire coordinated balance sheet telemetry via a single invocation:
```ts
import { getOperatingCashMetrics } from '@/lib/erp/canonicalMetrics';

const metrics = getOperatingCashMetrics({
  journalEntries: data.journalEntries,
  contracts: data.contracts,
  propertyCosts: data.propertyCosts,
  costAllocations: data.costAllocations,
  partnerCalls: data.partnerCalls,
  partnerTransactions: partnerTransactions,
  taxRecords: data.taxRecords
});
```

---

## 11. AI Agent Operating Protocol & Skill Orchestration Matrix

When an AI agent is tasked with creating, refactoring, or reviewing any FIN-OS surface, **improvisation is strictly prohibited**. The agent must operate through the **4-Gate Skill Pipeline** using the complete catalog of specialized skills installed in the workspace:

### 11.A. Skill Orchestration Matrix by Architectural Component & Layer

| Component / Layer | Primary Skills | Secondary Skills | Mandatory Enforcements & Invariants |
| :--- | :--- | :--- | :--- |
| **Discovery & Workflow Scoping** | `brainstorming`, `using-superpowers` | `dispatching-parallel-agents`, `find-skills` | Explore operator intent, state machines, and UX requirements before drafting solutions. Use parallel subagents for independent sub-views. Ban premature code generation. |
| **Plan Formulation & Execution** | `writing-plans`, `executing-plans` | `subagent-driven-development` | Break large refactors into bite-sized, verifiable tasks. Dispatch specialized isolated subagents for subtasks without context pollution. |
| **High-Density Workstation Shell** | `fin-os-erp-design`, `better-ui` | `adapt`, `modern-web-guidance` | 3-column / 2-column Floating Triptych. Bounded navbar inside `.middleSection`. Symmetrical 12px outer rhythm. Strict RTL ban on `100vw`. Container queries for subpage responsiveness. |
| **Diagnostic UI & Audit** | `design-review`, `critique` | `improve-ui`, `improve`, `ui-ux-pro-max` | Heuristic evaluation (Nielsen 1-10), cognitive load assessment (≤4 items per decision point), P0-P3 defect taxonomy, and anti-template enforcement. |
| **High-Level Financial Metrics** | `fin-os-erp-design`, `better-typography` | `beautiful-shadows`, `ui-ux-pro-max` | 4 discrete floating white cards (`.discreteKpiCard`). Dynamic accent squircle badges (28×28px). Tabular numbers (`font-variant-numeric: tabular-nums`). Zero monolithic cramped KPI cards. |
| **Canonical Data Tables** | `better-interface`, `improve-ui` | `better-ui`, `accessibility` | Airy rows (~54-58px), near-white header (`#fafbfc`), full-row clickable targets (`.clickableTableRow`). Slide-over drawer inspection over inline clutter. Clean numeric pagination `< [1] [2] [3] >`. |
| **Financial Statuses & Badges** | `fin-os-erp-design`, `colorize` | `accessibility` | Soft pastel micro-pills (`.statusPill` with `#ecfdf5`/`#fffbeb`/`#fef2f2`). Saturated solid blocks and plain unstyled text are strictly banned. |
| **Typography & Number Alignment** | `better-typography` | `anti-ai-slop-writing` | Strict type scale hierarchy. `tabular-nums` on all currencies, dates, and percentages. Plain domain-expert Arabic copy (no robotic translations or marketing buzzwords). |
| **Interactive Modals & Drawers** | `interaction-design`, `animation-systems` | `animation-vocabulary`, `improve-animations` | Hairlines over heavy shadows (`#cbd5e1`). Smooth 200-300ms cubic-bezier transitions. Precise motion terms (`drawer glide`, `spring popover`). Esc dismiss, backdrop blur (2px), autofocus on primary input. |
| **Analytical & CAD Charts** | `fin-os-erp-design` | `ERPApexChart` | Wrapped strictly with `ERPApexChart`. CAD technical grid enabled (`xaxis.lines.show: true`, `yaxis.lines.show: true`, `strokeDashArray: 2`). Series 1 dynamically binds to `--erp-accent`. |
| **Web Quality, Standards & A11y** | `accessibility`, `best-practices` | `a11y-debugging`, `web-design-guidelines` | WCAG 2.2 AA contrast compliance (≥ 4.5:1), keyboard focus indicators (`:focus-visible`), aria semantics, and modern web API standards. |
| **Verification & Root Cause Debugging** | `verification-before-completion`, `systematic-debugging` | `chrome-devtools`, `playwright` | Zero completion claims without objective proof. Root cause investigation without symptom masking. TypeScript zero-error lock and viewport visual screenshots. |

### 11.B. The 4-Gate Execution Protocol

Every design or refactor task must progress through these four sequential gates:

1. **Gate 1: Audit & Critique (`design-review`, `critique`, `better-interface`, `improve-ui`, `brainstorming`)**:
   - The agent MUST inspect the target file/screen against Section 8 (Negative Invariants).
   - Evaluate cognitive load, visual clutter, and layout sameness.
   - Produce a P0-P3 prioritized defect list before writing or modifying any code.
2. **Gate 2: Structural Blueprint & Token Lock (`fin-os-erp-design`, `better-ui`, `better-typography`, `adapt`, `beautiful-shadows`)**:
   - Verify layout adheres to the Floating Pure White Triptych.
   - Enforce discrete 4-card KPI grids, hairline borders (`#cbd5e1`), and zero colored container washes (`#ffffff !important`).
   - Adapt layout cleanly between wide desktop (1750px) and compact laptop (1341px) via container queries.
   - Derive all financial figures from `canonicalMetrics.ts` and lock `tabular-nums`.
3. **Gate 3: Polish, Motion & Copywriting (`interaction-design`, `animation-systems`, `animation-vocabulary`, `anti-ai-slop-writing`)**:
   - Implement micro-interactions (hover states, drawer transitions) with exact easing curves and durations.
   - Ensure clean, native Arabic financial terminology without robotic AI translation slop.
4. **Gate 4: Accessibility & Verification (`accessibility`, `a11y-debugging`, `best-practices`, `web-design-guidelines`)**:
   - Run type checks (`npx tsc --noEmit`) and verify 0 errors.
   - Confirm WCAG 2.2 AA contrast compliance (≥ 4.5:1 for body and buttons) and keyboard tab navigation.
   - Take full-resolution visual verification screenshots at `1750×924` and `1341×924`.


