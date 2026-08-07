# Property Details Revamp — Full Plan

Replaces the previous prompt. Goal: property-type-aware layout with layered,
expandable specs — driven entirely by real per-property data, never by fixed
template categories.

---

## 1. Data model changes (build this first — layout depends on it)

Add a `spec_layers` JSONB column to `properties` (simplest option — avoids a
new table + joins for what is fundamentally a flexible, per-property shape).

Shape:

```json
[
  {
    "layer_key": "bedrooms",
    "layer_label_en": "Bedrooms",
    "layer_label_ar": "غرف النوم",
    "items": [
      {
        "label_en": "Master Suite",
        "label_ar": "الغرفة الرئيسية",
        "details_en": "22 sqm, en-suite bathroom, walk-in closet",
        "details_ar": "٢٢ متر مربع، حمام خاص، خزانة ملابس",
        "image_ids": ["img_012", "img_013"]
      },
      {
        "label_en": "Bedroom 2",
        "label_ar": "غرفة النوم ٢",
        "details_en": "14 sqm, built-in wardrobe",
        "details_ar": "١٤ متر مربع، دولاب مدمج",
        "image_ids": ["img_014"]
      }
    ]
  }
]
```

Rules for the agent:
- `layer_key` is one of a fixed enum (`bedrooms`, `bathrooms`, `floor_layout`,
  `finishing_view`) so the frontend knows which icon/section styling to apply —
  but the **items inside each layer are fully free-form**, entered by Zakaria,
  never auto-generated or template-filled.
- A layer with zero items simply doesn't render. No empty-state accordions.
- `image_ids` reference the existing `property_images` table — reuse it,
  don't create a second image store per spec item.
- Keep the existing flat fields (`bedrooms: 5`, `bathrooms: 3`, etc.) on
  `properties` as-is — they still drive the overview grid, search filters,
  and card chips. `spec_layers` is additive detail, not a replacement.

### Property type → which layers are relevant

- **Apartment / Duplex / Chalet:** bedrooms, bathrooms, finishing_view layers
  typically populated; floor_layout layer shows floor level + lobby/parking
  if provided.
- **Villa / Building:** floor_layout layer becomes more structural (multiple
  floors, internal layout description) rather than just "floor number."
- **Building listings specifically** — confirm with Zakaria before building:
  does "building" mean one listing with aggregate stats (current assumption),
  or a parent listing containing multiple distinct unit types for sale
  separately? This changes the data model materially. Don't guess — ask,
  then encode the answer as either a single `properties` row or a
  `property_units` child table.

---

## 2. Admin dashboard changes (build alongside the display, not after)

Zakaria needs a way to actually enter this data, or every property ships
with empty layers.

- On the property edit form, add a "Detailed Specs" section below the
  existing fields.
- For each `layer_key`, an "Add item" button that opens a small inline form:
  label (EN + AR), details text (EN + AR), and an image picker scoped to
  images already uploaded for that property (checkbox-select from the
  existing gallery, not a new upload flow).
- Items within a layer should be drag-reorderable (reuse `@dnd-kit/core`,
  already in the stack for image reordering).
- Layers with no items yet should show a collapsed "no items added" state
  *in the admin only* — the public page never shows this, only admin does,
  so Zakaria knows what's left to fill in.

---

## 3. Public-facing layout

### Overview grid (top of page, above the layered specs)
Keep the type-aware highlight logic from the original walkthrough — this
part was fine:
- Villa/Building: Property Type badge, Total Area, Bedroom count
- Apartment/Duplex/Chalet: Bedrooms, Bathrooms, Area, Floor Level badge

### Layered spec accordions
- Render only layers that have `items.length > 0`.
- Each layer header shows: icon (per `layer_key`), label, and item count
  (e.g. "Bedrooms (3)") so the user knows what's inside before opening.
- Expand animation: Framer Motion `AnimatePresence` with an auto-height
  layout animation — no instant show/hide, matches the site's existing
  "no jarring cuts" rule.
- Mobile: accordion behavior, one layer open at a time.
- Desktop: multiple layers can be open simultaneously — more screen space,
  no need to force single-open.
- Inside an expanded layer, items render as a simple list/grid of cards
  (label + details text + thumbnail if `image_ids` present).
- "Inspect Photos" on an item opens the **existing** lightbox/gallery
  component (already built for the main property gallery), pre-filtered to
  that item's `image_ids`. Do not build a second gallery component.

### Fallback for properties with minimal data
If a property only has flat fields and no `spec_layers` entries at all
(e.g. Zakaria hasn't gotten to it yet, or it's a simple listing that
doesn't need this level of detail), the page falls back cleanly to the
current flat details table — the layered section simply doesn't appear.
This must not look like a broken/incomplete page; it's a valid, complete
state.

---

## 4. RTL and QA checklist (verify, don't just claim)

Before calling this done, manually check on `/ar`:
- Accordion expand icon direction flips correctly (chevron points the
  correct way for RTL reading direction).
- Text inside expanded items is right-aligned, not left-aligned Arabic text.
- Drag-reorder in the admin still works correctly in RTL (this is a common
  break point for `@dnd-kit`).
- Lightbox launched from within a layer item opens with correct RTL nav
  arrow direction (should match the main gallery's existing RTL behavior).

Also verify:
- `npm run build` passes with zero TypeScript errors (as before).
- A property with zero `spec_layers` renders the fallback cleanly.
- A property with only one layer populated (e.g. just bedrooms, no
  bathrooms layer) doesn't show an empty bathrooms accordion.

---

## 5. Explicit instruction to the agent

Before implementation, have the agent show you the actual `spec_layers`
JSON shape it plans to use and one example admin form screenshot, before
writing the full display component — confirm the data is genuinely
per-property and free-text, not hardcoded categories like "Master Suite /
Secondary Bedroom / Guest Powder Room" baked into the component itself.