# Hero Section — Complete Revision Plan

Replaces the current hero. Goal: cut the current five-competing-elements
layout down to one clear focal point + one action, while folding in the
interactive isometric-render concept discussed earlier as the visual
anchor.

---

## 1. What's being removed from the current hero

- Second CTA button ("Browse Properties") as a competing solid button —
  demoted to a plain text link.
- Search bar's tab switcher ("Instant Search" / "All Types") — removed
  entirely from the hero. Type-filtering belongs on the Properties page.
- Two of the four stat chips — keep the two strongest trust signals only
  (recommend: years of experience + units delivered, or rating + 0%
  commission — confirm with Zakaria which two he'd rather lead with).
  The other two move to the About page stats strip already planned.
- The scrolling area-name ticker — moved out of the hero into its own
  thin section between the hero and the featured-properties block, or
  just above the footer.
- Any visual competition between the language toggle and the WhatsApp
  button — keep the utility row (locale switch + one icon) visually
  quiet, well below the WhatsApp CTA in weight.

---

## 2. Final hero structure (top to bottom, one column of focus)

1. Small eyebrow label — "ZAKARIA FARID REAL ESTATE" (kept, it's doing
   quiet branding work with no visual cost).
2. Headline — one strong line, Arabic-first per the site's primary
   locale, Playfair-Display-equivalent Arabic display weight if available,
   or the existing bold sans as currently used.
3. One-line subtext (kept, already appropriately brief).
4. **One single search input** — placeholder "Search by city or property
   type," one icon, one action. No tabs, no secondary controls.
5. **One CTA** — WhatsApp button, solid, brand green, the only solid
   button in the hero.
6. "Browse all properties" as a plain underlined text link directly
   beside or beneath the CTA — present, but visually secondary.
7. **Two trust stat chips**, smaller and lower-contrast than in the
   current design — quiet supporting detail, not competing boxes.

Everything else (ticker, extra chips, tab switcher) is removed from this
section, not deleted from the site — relocated per Section 1.

---

## 3. Visual treatment — real photo, decluttered

- Keep a real property photo as the background (not the isometric render
  — see Section 4 for how that fits in separately), full-bleed, with a
  gradient overlay: darker at the bottom-left where Arabic RTL text sits
  (text reads right-to-left starting from the right, so ensure the
  overlay is strongest wherever the headline text actually lands — verify
  against the final chosen photo, don't assume a fixed corner).
- Add a subtle text-shadow or a dedicated darker gradient band directly
  behind the headline text specifically, independent of the whole-image
  overlay — this fixes the legibility risk flagged earlier (headline
  sitting over a bright window in the current version) and makes the
  hero robust to future photo swaps.
- Reduce total on-screen elements in the hero to 5 (eyebrow, headline,
  subtext, search bar, CTA-row, stat pair) — count them before shipping;
  if it's still more than that, cut further rather than add.

---

## 4. Where the interactive isometric render fits in

Two options — decide explicitly, don't let both ship at once:

- **(a) Skip it for now.** The decluttered real-photo hero alone already
  solves "modern, premium, trustworthy" without added build complexity.
  Reasonable default given budget/timeline constraints already discussed.
- **(b) Reserve the render for a secondary "brand moment" section**,
  not the hero itself — e.g. directly below the hero, a dedicated
  "Shaping Spaces Around Your Vision"-style section (as seen in the
  earlier reference) using the isometric render with parallax + hotspots,
  positioned as a distinct visual break between the hero and the featured
  properties grid. This keeps the hero itself simple and reserves the
  more elaborate interactive piece for a spot where it doesn't compete
  for attention with the primary CTA.

Recommend (b) if budget allows the render asset — it uses the concept
without reintroducing hero clutter. If budget doesn't allow it, (a) is a
complete, shippable hero on its own with no missing piece.

---

## 5. Search bar behavior specifics

- Single text input, single search icon/button (RTL-correct icon
  placement — verify against the site's other input components rather
  than assuming left/right).
- Submitting free-text search should route to `/properties?q=<value>`
  and reuse the existing property filter/search logic already built for
  the listing page — not a separate parsing system.
- No dropdown/tab UI in the hero itself. If type-ahead suggestions are
  wanted later (e.g. suggesting matching areas as the user types), that's
  a distinct future enhancement, not part of this revision.

---

## 6. Stat chip selection

- Confirm with Zakaria which two of the four current stats (rating, 0%
  commission, units delivered, years of experience) best lead the pitch.
  Default recommendation if no preference given: years of experience +
  units delivered — these are the two hardest to fake and most directly
  support "direct from an established owner," the core brand pitch.
- Chips render smaller and with less visual weight (thinner border,
  smaller type) than the headline — supporting detail, not a fourth
  competing block.
- The two removed chips move to the About page stats strip verbatim —
  no content is lost, just relocated to where it has room to breathe.

---

## 7. Ticker relocation

- Move the scrolling area-name ticker to a standalone thin strip, either:
  - directly beneath the hero as a distinct "browse by area" section, or
  - just above the footer, functioning as a persistent quick-nav
- Each area name in the ticker should link to that area's guide page
  (per the area/neighborhood-guide-pages feature discussed earlier) —
  confirm this linking is wired up now that it has its own dedicated
  section rather than being a decorative-only element in the old hero.
- Check it doesn't visually collide with the floating WhatsApp chat
  bubble wherever it ends up — this was a real overlap issue in the
  current version and needs to not simply move with the same bug intact.

---

## 8. QA checklist before calling this done

- Count on-screen hero elements — should be 5 sections, not more.
- Headline legible against the actual final photo, not just this
  screenshot's fortunate lighting — check on the real chosen image.
- RTL check: search icon position, stat-chip reading order, ticker
  scroll direction (should visually scroll in the reading-appropriate
  direction for Arabic, confirm which direction that actually is with a
  native speaker if unsure — don't assume it mirrors LTR exactly).
- Mobile: headline wraps cleanly, search bar full-width and usable,
  stat chips stack or sit side-by-side without crowding, single CTA
  remains prominent.
- Ticker's new location doesn't overlap the floating chat bubble.
- Single WhatsApp CTA is the only solid-filled button in the hero;
  "browse properties" is confirmed as a text link, not a second button.