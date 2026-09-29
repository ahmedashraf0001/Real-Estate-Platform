---
name: surface-ui
description: >-
  Work-routing track for presentation layer, Arabic RTL localization,
  FIN-OS Executive Design System (v2.5), shared primitives, and UI ergonomics.
  Enforces single-gated TypeScript verification upon batch completion.
---

# Track: SURFACE_UI (Presentation, RTL Localization & Ergonomics)

## Assigned Role: Executive UI/UX Engineer
- **Delegation**: Must be invoked via Antigravity `invoke_subagent` with `TypeName: "self"`, `Role: "Executive UI/UX Engineer"`, and strictly `Model: "flash"`. The `pro` model is strictly forbidden.
- **Scoping**: Modifying UI components in `src/components/admin/erp/v2/` and `src/app/fin-os/`. Admin shell (`src/components/admin/AdminSidebar.tsx` and `AdminUniversalHeader.tsx`) is deferred pending dedicated review. Restricted shell and database access.

---

## 🏛️ FIN-OS v2.5 Executive Design System Standard
*(Mandatory reference for all workstation pages, views, and modal dialogs)*

### 1. Pure Enterprise Monochrome + Dominant Accent Palette
- **Canvas Background (`--erp-bg-canvas`)**: `#f8fafc` (Slate-50).
- **Surface / Card Background (`--erp-bg-panel`)**: Pure `#ffffff`.
- **Primary Accent (`--erp-accent`)**: `#2563eb` (Royal Enterprise Blue) by default.
  - Runtime customizer: 8 curated enterprise presets in `src/lib/erp/erpPalettePresets.ts` (all $\ge 5.17:1$ WCAG AA contrast). Freeform color pickers are strictly banned.
- **Borders & Dividers**:
  - Card & Container Borders (`--erp-border`): `1px solid #e2e8f0`.
  - Internal Dividers (`--erp-border-subtle`): `1px solid #f1f5f9`.
  - Drop Shadows: Banned across standard cards. Hairline borders prioritized over drop shadows.

### 2. Universal Shared Primitives
- **Modal Shell (`ZFModalShell`)**:
  - Backdrop blur, pure white card (`12px` radius, `1px solid #e2e8f0`), standard header with icon badge in `#eff6ff` + `#2563eb` icon, title, subtitle, scrollable body, sticky footer.
- **Drawer Shell (`ZFDrawerShell`)**:
  - Slide-over panel (slides from left in RTL, right in LTR), `1px solid #e2e8f0` border, header with icon/title/close.
- **Universal Dropdown Architecture (Dual-Tier Invariant)**:
  - Simple static filter dropdowns (period/project filters) remain native `<select>` elements styled via `.filterSelect`.
  - Searchable / entity-picker dropdowns must use `ZFCustomSelect`.
- **In-Page Filter Search Bar (`ZFSearchBar`)**:
  - Standardized search bar with search icon, clear button, and placeholder.
- **Enterprise Toasts (`ZFToaster`)**:
  - Crisp white card Sonner toasts (`#ffffff`, `1px solid #e2e8f0`, subtle status icons, bottom-left position).

### 3. Anti-AI Slop Rules (Strictly Enforced)
- **NO Saturated Neon Red/Green Blocks**:
  - Financial values use deep executive ink `#0f172a` with `font-variant-numeric: tabular-nums`.
  - Semantic red/green appear only as plain colored text or micro-pills for deltas/status (`#16a34a` / `#dc2626`).
- **NO Raw Accounting Codes in User Badges**:
  - Strip technical numbers like `(101000)` and `(102000)` from UI cards. Use clear executive names: `الخزينة والبنك`.

### 4. Arabic RTL Localization & Bidirectional Isolation
- **BAN `dir="auto"` on Block Elements**:
  - Table cells and row titles must inherit RTL and use `text-align: start; unicode-bidi: isolate;`.
- **Isolate Bidirectional Runs**:
  - Wrap client/person names in `<bdi>{clientName}</bdi>`.
  - Wrap alphanumeric contract codes, cheque IDs, and references in `<bdi dir="ltr">#{code}</bdi>`.

---

## Verification Command
```bash
npx tsc --noEmit
```
