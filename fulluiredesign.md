# PROJECT: Zakaria Farid Real Estate — Full UI Rebuild (RBI Design System Port)

You are rebuilding the entire front-end UI of an existing production real estate platform from scratch, replacing its current visual design with a carbon-copy adaptation of a luxury real-estate reference design ("RBI — The Art of Real Estate"). This is a UI/visual rebuild only — all existing business logic, data models, routing structure, and backend integration points must be preserved and re-skinned, not replaced.

---

## 1. TECH STACK (DO NOT CHANGE)

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** React 19, TypeScript 5
- **Styling:** Vanilla CSS Modules (`Component.module.css`) — **NO Tailwind CSS, ever**
- **Animation:** Framer Motion for entrance/scroll/modal transitions; plain CSS `transition` for simple hover states
- **Database/Auth:** Supabase (PostgreSQL, Auth, Storage) — reuse existing schema and queries
- **i18n:** `next-intl`, English (`en`, LTR) and Arabic (`ar`, RTL) — every screen must work correctly in both, including full RTL mirroring
- **Mapping:** Leaflet / `react-leaflet`
- **Forms:** `react-hook-form` + `zod`
- **UI primitives:** `@radix-ui/*`, `embla-carousel-react` (sliders/carousels), `lucide-react` (icons), `sonner` (toasts), `@dnd-kit` (admin drag-and-drop), `@tiptap/react` (rich text, admin)

Do not introduce new frameworks, CSS approaches, or component libraries outside this list without flagging it explicitly.

---

## 2. NEW DESIGN SYSTEM (replaces old emerald/gold system entirely)

This is a hard visual replacement. Purge the old `#1E4D3D` emerald / `#C9A96A` gold token set and replace with the following, updated in `globals.css` as CSS variables.

### 2.1 Color Palette
Define these as CSS custom properties and use them everywhere — no hardcoded hex in component files:

```css
--color-ivory: #F9F0EC;      /* light section backgrounds, highlight accents */
--color-camel: #AC8054;      /* accent elements, headings, CTAs — the signature accent */
--color-cocoa: #593F36;      /* accentuated blocks, project/section backgrounds */
--color-midnight: #1E2026;   /* base dark background */
--color-text-on-dark: #F9F0EC;
--color-text-on-light: #1E2026;
--color-text-muted: rgba(249, 240, 236, 0.6); /* muted text on dark */
--color-text-muted-light: rgba(30, 32, 38, 0.55); /* muted text on light */
```

Status badges (property availability states — map old Active/Offer/Sold semantics onto the new palette rather than inventing new colors):
- Active/Available → camel `#AC8054` on ivory
- Sold → cocoa `#593F36` on ivory
- Offer/Promotion → camel with lighter tint `#C99B6D`

### 2.2 Typography
- **English headings:** a high-contrast display serif with the character of *History Pro* (Typotheque) — since that exact font is proprietary/paid, substitute the closest available: **"Bodoni Moda"** or **"Playfair Display"** (already in the stack) at high tracking, letter-spacing ~0.02–0.05em, uppercase for hero/section labels.
- **English body:** a clean geometric/humanist sans in the spirit of *Circe* — substitute **"Outfit"** (already installed) or **"Inter"**.
- **Arabic headings:** **Amiri** (already installed) — keep for serif parity.
- **Arabic body:** **Cairo** (already installed).
- Section eyebrow labels (e.g. "ABOUT", "FEATURES", "PROJECT DETAILS") are always: small caps or uppercase, camel color, wide letter-spacing, positioned above the main heading.

### 2.3 Spacing, Radius, Shadow
- Border radius: keep existing scale (`6px` sm / `12px` md / `20px` lg / `9999px` full) — RBI's reference uses soft, generous corner rounding on device-frame containers (24–32px on large image/panel containers).
- Replace glassmorphism-heavy surfaces with **flat, high-contrast dark/light section blocks** — RBI's aesthetic is *not* glassmorphic. Keep `backdrop-filter: blur()` ONLY on: sticky nav bar, floating filter bars, and the mobile bottom-sheet filter modal. Drop glass effects from cards and the comparison tray; use solid ivory/midnight surfaces with soft shadow instead:
```css
  --shadow-card: 0 2px 4px rgba(30,32,38,0.06), 0 8px 24px rgba(30,32,38,0.10);
```
- Alternate full-bleed dark (`midnight`) and light (`ivory`) sections vertically down every page — this alternating rhythm is core to the reference design's identity. Use dark sections for brand storytelling/manifesto content, light sections for transactional/utility content (filters, listings, forms).

---

## 3. LAYOUT & COMPONENT REBUILD SPEC

Rebuild these components to match the reference screenshots pixel-for-pixel in spirit (spacing, hierarchy, proportions), while binding to existing Supabase data.

### 3.1 `Navbar.tsx`
- Dark, semi-transparent sticky bar. Logo left (circular "ز" badge mark for Arabic / wordmark for English — reuse existing brand mark work). Horizontal nav links center/left-of-center in small caps letter-spaced text, with one item styled as a filled camel pill/badge (mirrors RBI's "Real Estate" active-state pill). Right cluster: phone number, wishlist heart icon, account icon.
- On scroll, background solidifies from transparent to solid midnight with a subtle bottom border.

### 3.2 `HeroSection.tsx`
- Full-bleed architectural photography background (use existing property renders/photos).
- Centered or left-aligned massive serif headline in two lines, camel color for one emphasized word.
- Small rotating/scroll-cue circular icon element near the headline (decorative, animated slow rotation).
- A floating promo/content card anchored bottom-right of the hero with a small thumbnail image and 1–2 lines of copy plus prev/next arrows — repurpose as a "Featured Project" spotlight card.
- Retain the `SmartSearchDock` functionally, but re-skin: convert from glassmorphic floating pill to the RBI-style dark filter bar sitting just below the hero fold (see `PropertyFinderFilters` in 3.5) — full-width bar, not floating overlay.
- Keep bouncing scroll-down chevron, restyle to camel/ivory line-art.

### 3.3 `AboutSection.tsx` (homepage brand block)
- Two-column: small eyebrow label "ABOUT" left, right-aligned or full-width paragraph copy, plus a metadata list styled like a project brief (Scope / Industry / Duration / Year → repurpose as Founded / Region / Projects Delivered / Total Units, or similar real metrics).

### 3.4 `TrustPillars.tsx` → rebuild as `BrandStatsSection.tsx`
- Replace the current Bento-grid trust pillars with the RBI stat-card row pattern: 4 cards in a horizontal row, first card visually emphasized (solid camel background, larger number), remaining 3 cards dark/outlined with white numerals and small muted labels underneath. Include a small circular arrow "next" affordance at the row's end (can be non-functional decorative, or wire to a stats carousel if more than 4 stats exist).
- Pair with a full-bleed manifesto slide: large serif statement sentence over a dimmed cocoa-toned architectural photo, small supporting paragraph beside it, "Learn more" ghost button, and slide position indicator (e.g. "2 3").

### 3.5 `PropertyFinderFilters.tsx` (rebuild of existing filter bar)
- Light ivory background bar (this is the one section that breaks dark/light alternation intentionally, matching reference).
- Tab row for property category (Apartments / Apart-units / Parking Spaces / Storage Rooms / Commercial).
- Filter row: Project dropdown, Rooms dropdown, dual-range price slider, dual-range area slider, Completion dropdown, reset icon button, "All Filters" pill button (camel filled).
- Below: sort/group control left, list/map view toggle right, "Booked" visibility toggle.
- Mobile: collapses into a single "Filter" trigger opening a full-screen light modal with stacked dropdowns/sliders and a bottom sticky "Show N projects" camel CTA button.

### 3.6 `PropertyCard.tsx`
- Image top (full-bleed, rounded top corners only), small pill badge top-left overlay ("Sales Start", "Subsidized Mortgage" style — map to real status/promo tags).
- Below image: project name in large serif, district + distance/landmark line with a small pin icon, completion quarter/date right-aligned on same line.
- Bottom row: unit count left, "From $X" price right with a small chevron/expand affordance.
- Hover: subtle scale/lift, no glassmorphism.

### 3.7 `PropertyDetailPage` (`/properties/[slug]`)
Rebuild in this section order, alternating dark/light per RBI pattern:
1. **Interactive site plan (dark section):** aerial/rendered site image with numbered clickable pins per building; clicking a pin opens an inline dark detail card (unit count, completion date, bedroom-type breakdown with starting prices per type).
2. **Project narrative (light/ivory section):** left column = key facts list (Apartments amount, Completion date, Buildings, Apartment area range, Ceiling height); right column = descriptive rich-text copy (from Tiptap content) + "Learn more" ghost button. Below: 3-up row — "Listen to audio guide" tile, "Watch video" tile, "Bird's-eye view" image tile with overlay label — each with a small circular arrow CTA.
3. **Features/Amenities (dark section):** tabbed row (All Features / Amenities / Architecture / Infrastructure / Technology), 3-column image grid below, each tile with a small numbered/expand badge top-right and a caption underneath. Clicking a tile opens a mobile-style slide-in modal (dark) with larger image, category label, headline, and full description — matches reference's phone-mockup modal pattern; on desktop this should be a centered modal, not a literal phone frame.
4. **Art Objects / distinguishing feature slider (if applicable — optional, reuse pattern for any showcase gallery):** eyebrow "ART OBJECTS" + short paragraph left, large dark slider card below with big serif title, object image, caption, and prev/next dot pagination.
5. **Promotions (dark section):** eyebrow "PROMOTIONS" + "All promotions" link top-right, 3-card row (short offer text, days-left label, small circular arrow CTA), carousel arrows at bottom-left, pagination counter.
6. **Gallery/media hero (dark, image-forward):** large architectural photo with centered play-button overlay for a project video, positioned above the Promotions block or as its own section.
7. **Sticky lead-capture form:** keep existing sidebar form functionally, re-skin container to ivory card with camel primary button, subtle card shadow (`--shadow-card`), rounded `--radius-lg`.

### 3.8 `UnitDetailModal` / floor-plan viewer
- Rebuild as an ivory/cocoa two-tone panel: header band in cocoa/dark with unit title ("2-ROOM · 150m²") + unit code, small icon row (share/download/save) top-right.
- Below: left column = price (large serif), payment-method segmented control (100% payment / Mortgage / Installment), key facts list (Project, Completion date, Living area, Building, Floor), feature tag pills (Large kitchen, Loggia, Premium finishing), camel "Reserve" CTA full-width.
- Right column = floor plan SVG/image viewer with tabs (Apartment / Unfurnished / On the floor / View from windows), room dimensions labeled directly on the plan, small compass + sun-position toggle bottom-right, fullscreen expand icon top-right.

### 3.9 `ComparisonTray.tsx`
- Re-skin from glassmorphic to solid midnight bar, camel accent on the "Compare N properties" CTA. Keep functional behavior (up to 3 properties, sticky bottom).

### 3.10 `AboutDeveloperPage` (`/about`)
- Hero: nature/architecture-integrated photo, nav overlaid, large serif "ABOUT" label bottom.
- "30 Years of Turning Architecture Into An [Art]" split section: image + camel CTA tile left, large serif statement right.
- Interactive company history timeline: horizontal scroll or stepped year markers (e.g. 2024, working backward or forward), each year revealing a small image + short copy panel.
- Team section: eyebrow "Our team at [Company]", asymmetric photo grid (group photo + 1-2 individual/pair shots), large serif "Those Who Are Always There" heading right-aligned, supporting paragraph, camel CTA tile ("Learn more about the team").

### 3.11 `MiniMap.tsx` / `FullMap.tsx`
- Restyle Leaflet custom markers: swap current teardrop pins for a minimal circular camel pin with midnight center dot, consistent with the new palette (drop the emerald/gold marker colors).

---

## 4. INTERACTION / MOTION SPEC

- Section entrances: fade + slide-up on scroll into view (Framer Motion `whileInView`), stagger children by ~80–100ms where a section has a grid/row of cards.
- Hero background: slow crossfade between 2–3 images if multiple are available, ~6s interval.
- Stat row circular arrow, carousel arrows, and slider dot pagination: simple opacity/scale hover states, no glass blur.
- Modals (feature detail, floor plan fullscreen): slide up from bottom on mobile, fade+scale from center on desktop.
- Maintain the existing bouncing scroll-chevron pattern from the current hero, restyled to new palette.

---

## 5. RTL REQUIREMENTS (non-negotiable, apply to every rebuilt component)

- All rebuilt layouts must mirror correctly under `[dir="rtl"]`: nav order, card content alignment, filter bar order, floor-plan compass/icon positions, timeline direction, carousel arrow direction.
- Use logical CSS properties (`margin-inline-start/end`, `padding-inline-start/end`, `inset-inline-start/end`) instead of `left/right` wherever feasible; where not feasible, use the established `[dir="rtl"] .myClass` override pattern.
- Icon-direction flips (chevrons, arrows) must invert in RTL.
- Arabic heading font (Amiri) and body font (Cairo) must be applied consistently across every rebuilt component — do not leave any English-only font fallback in RTL mode.

---

## 6. WHAT NOT TO CHANGE

- Do not modify Supabase schema, table structure, or existing query/mutation logic — this is a visual/component rebuild bound to existing data.
- Do not change routing structure (`/[locale]/properties`, `/[locale]/properties/[slug]`, `/[locale]/properties/compare`, `/[locale]/map`, `/[locale]/about`, `/[locale]/contact`, `/admin/[adminLocale]/...`).
- Do not remove any existing functional feature (comparison tray logic, wizard steps, WhatsApp lead capture, RLS-protected admin routes) — only re-skin.
- Preserve all existing `next-intl` translation keys; add new ones only for new copy introduced by the redesign (e.g. new section eyebrow labels), and add both `en` and `ar` values for every new key.

---

## 7. DELIVERY APPROACH

Work in this order and confirm each stage before proceeding to the next:
1. Update `globals.css` design tokens (colors, fonts, radii, shadow) — no component changes yet.
2. Rebuild shared/global components: Navbar, Footer, buttons, form inputs, badges, section-eyebrow label component.
3. Rebuild homepage section-by-section (Hero → About → BrandStats/Manifesto → Featured Properties → Property Finder teaser → CTA band).
4. Rebuild `/properties` catalog + filters.
5. Rebuild `/properties/[slug]` detail page (site plan → narrative → features/amenities → promotions → lead form).
6. Rebuild unit/floor-plan detail view.
7. Rebuild `/properties/compare`.
8. Rebuild `/map`.
9. Rebuild `/about` (developer story, timeline, team).
10. Rebuild `/contact`.
11. Re-skin admin dashboard shell only if requested — otherwise leave admin UI on current design system to avoid breaking the internal team's workflow, and flag this decision back to me rather than assuming.

At each stage, produce actual CSS Module + TSX code, not just descriptions, and note any translation keys added.