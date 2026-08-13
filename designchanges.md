# Client Design Feedback — Correction Plan

**Purpose of this document:** a direct, itemized fix list responding to Zakaria's actual feedback on the shipped design. Unlike prior documents in this project, this is not a new feature or a redesign brief — every item below is a specific correction to something already built and specifically disliked. Treat each item as its own small, scoped fix; do not let any of them balloon into a broader redesign pass unless the item itself calls for one.

**One item needs a caveat up front:** item 7 (avoiding "استثمار عقاري") is a copywriting/word-choice instruction the agent can absolutely implement, but neither this document nor the implementing agent can confirm it actually resolves whatever legal concern prompted it — that requires an actual Egyptian real estate lawyer's review, not a wording workaround. See 7.1 for how this is scoped.

---

## 1. TickerWrap — remove entirely

Zakaria doesn't want an improved version — he wants it gone. Do not treat this as a design-polish task; treat it as a removal task.

**Fix:**
- Remove the TickerWrap component from every page it currently appears on — confirm first exactly which pages/sections use it (there may be more than one instance, e.g. a homepage stats strip and a "recent listings" ticker), since a partial removal that leaves one instance behind would still show the disliked element.
- Remove the component's source file(s) and any styles scoped to it, rather than just hiding it with CSS (`display: none`) — this is a genuine removal, not a visual suppression that leaves dead code and an easy path for it to accidentally resurface later.
- Check what layout gap the removal leaves behind on each page it's removed from — a ticker often occupies a horizontal strip between two sections; removing it may leave awkward spacing or a section transition that no longer flows correctly, and that gap needs to be closed properly (adjusted spacing, or if the ticker was actually communicating something useful — e.g. a rotating set of featured listings — a decision on whether that information needs a different, non-ticker home elsewhere on the page, or whether it's fine for that information to simply not appear anymore).
- Confirm removal on both English and Arabic routes, and re-check nothing else on the page was depending on the ticker's presence for layout/spacing reasons.

**Definition of done:** the TickerWrap component and its effects are fully gone from every page, verified via a real screenshot of each affected page before/after, with no leftover layout gap or spacing artifact from its removal.

---

## 2. Accent color `#081410a6` — used too aggressively

**Diagnosis:** this looks like a near-black, semi-transparent (the `a6` alpha suffix) dark overlay color — likely used as a hover state, a card overlay, or a background tint somewhere. "Aggressive" as feedback usually means one of: too high an opacity (the `a6` alpha may be too strong, making it read as a heavy dark wash rather than a subtle tint), used in too many places at once, or used at a scale/area that dominates a section rather than accenting it.

**Fix:**
- Locate every instance of this specific color value across the codebase (a direct search for the hex value, not a guess at which components use it).
- For each instance, evaluate individually whether it should be: reduced in opacity, replaced with a genuinely lighter-weight treatment (e.g. a subtle border or a much lower-alpha tint instead of a heavy overlay), or removed entirely if it's not doing meaningful work in that spot.
- **Do not simply globally reduce the opacity of every instance uniformly** — some uses of this color may be doing legitimate, correctly-weighted work (e.g. a genuine modal backdrop) while others are the actual "aggressive" offenders (e.g. a heavy-handed image overlay on every property card). Fix each instance against its actual context, not with one blanket adjustment.
- This is a good moment to also confirm this color is even one of the project's established brand tokens (charcoal `#2D2D2D` / green `#1E4D3D` / gold `#C9A96A`, per the site plan's Section 4.1) — `#081410` doesn't match any of those three exactly, which raises the question of whether it was introduced ad hoc during a later build pass rather than being a deliberate brand color, which would itself explain why it reads as off/aggressive compared to the rest of the site.

---

## 3. Map pin indicators — "wtf is that, what is it even pointing to"

This is the clearest, most actionable piece of feedback in the whole list — the current map markers are not communicating what they represent at all, which is a real functional failure for a map that's supposed to show property locations, not just a stylistic complaint.

**Fix:**
- Replace the current generic/unclear pin markers with clearly branded, legible markers — at minimum: a marker shape that unambiguously reads as a location pin (not an abstract shape that could be mistaken for a UI glitch or decorative element), styled in the brand's gold `#C9A96A` accent for visual consistency, sized large enough to be tappable/clickable on mobile without ambiguity.
- Add a visible label or price tag directly on or immediately adjacent to each marker (e.g. a small pill showing the price, matching patterns used on real map-based property sites), rather than a bare pin the visitor has to click blind to learn anything about.
- On click/tap, the marker should open a small preview card (photo thumbnail, price, key facts, link to the full listing) — this is standard for a real-estate map and directly resolves "what is it even pointing to," since the answer becomes immediately visible rather than requiring the visitor to guess or navigate away.
- Verify this fix on both the Map/Locations page and any inline maps on individual property detail pages (per the layering plan's Section 2.3 location section) — this feedback likely applies to every map instance across the site, not just one.

---

## 4. Logo — "ZF" needs to be in a circle, and the Arabic version should be "ز" not "ZF"

Two distinct changes, both concrete and low-ambiguity:

- **Shape:** wrap the existing "ZF" monogram in a circular container/badge — confirm the circle uses the brand's established color treatment (likely the gold accent as a ring/fill, consistent with how the badge/finish-tier chips elsewhere in the project already use gold as the accent color) rather than introducing a new, unrelated color choice for the logo specifically.
- **Arabic version:** build a **separate Arabic logo mark using "ز"** (the first letter of "زكريا," Zakaria's name in Arabic) — this is not a translation of "ZF," it's a distinct logo variant for the Arabic locale, styled consistently with the English "ZF" mark (same circular treatment, same color/weight) but using the Arabic letter as its own considered piece of typography, not a rotated or reused Latin glyph. This needs to render correctly and legibly at small sizes (nav bar, favicon-scale contexts) in both locales — test both logo variants at the actual small sizes they'll appear at, not just at a large design-mockup size, since a single Arabic letter can read very differently at 24px than at 200px.
- Confirm both logo variants are wired into the correct locale route (`/en/*` shows "ZF" in a circle, `/ar/*` shows "ز" in a circle) — this is a locale-conditional asset swap, not a CSS-only change, so verify it's actually implemented as such rather than one logo image being used everywhere regardless of locale.

---

## 5. Hero headline copy change

Replace the current hero headline:
- **English:** "Find Your Dream Property in Egypt" → **"We only sell properties we own and develop"**
- **Arabic:** the corresponding Arabic headline → **"لا نعرض إلا ما نملك، ولا نبيع إلا ما نبنيه"**

This is a direct, unambiguous copy swap — it also happens to reinforce the same "direct owner/developer, no middleman" trust positioning that's already the core of the site's About section per the original site plan, so this change is thematically consistent with the brand strategy already established, not a departure from it. Verify the new headline still fits the existing hero layout/typography treatment at both a short viewport (mobile) and the new line's actual character count in Arabic, which may wrap differently than the previous headline did — don't assume the existing hero styling accommodates the new text without checking, since headline length changes can break a layout tuned for the old copy's specific line count.

---

## 6. Typography — client dislikes both the English and Arabic fonts currently used

This is the most open-ended item on this list, since "didn't like the font" doesn't specify what's wrong with it (too plain, too generic, wrong tone, hard to read) — **this needs a follow-up conversation with Zakaria before picking new fonts**, not a guess. Ask him directly: is it that the current fonts (Playfair Display for headings / Plus Jakarta Sans for body, per the site plan's Section 4.1 — or whatever is actually currently implemented, which should be confirmed against the real shipped code rather than assumed to match the original spec, given this project's history of implementation drifting from spec) feel too plain, too generic/AI-templated (the exact concern the brand direction was originally trying to avoid), too hard to read, or simply not to his taste independent of any functional issue? That answer determines whether the fix is "swap to different serif/sans pairing with the same warm-luxury intent" or something more fundamental.

**Once his actual concern is known**, the replacement pairing should still satisfy the original brand brief's constraints (site plan Section 4: not generic/templated-looking, appropriately "established developer" in tone for English, and — critical for Arabic — a proper Arabic-supporting typeface rather than a Latin font's default system fallback, per the site plan's Section 5 i18n guidance, which already flagged this exact risk). If the current Arabic type is in fact falling back to a generic system Arabic font rather than a deliberately chosen one, that alone could explain dissatisfaction with the Arabic side specifically, and is worth checking as a possible root cause before assuming an entirely new typeface search is needed.

**Action:** get Zakaria's specific complaint before selecting replacement fonts; do not guess-and-ship a new pairing speculatively.

---

## 7. Avoid "استثمار عقاري" in all copy — legal concern

### 7.1 Scope of what this document/agent can and cannot do here

This document specifies a **word-choice/copywriting instruction**: remove and avoid the phrase "استثمار عقاري" ("real estate investment") everywhere it currently appears in the site's Arabic copy, and avoid introducing it in any future copy. This is straightforward to execute as a text/content task.

**What this does not do, and should not be assumed to do:** resolve whatever underlying legal concern prompted the request. Avoiding one specific phrase does not necessarily mean the site's broader claims (e.g. "direct owner/developer," implied investment-return framing, any language that could be read as soliciting investment rather than simply marketing property for sale) are free of the same underlying regulatory concern under Egyptian real estate marketing/investment-solicitation rules. **This is a real question for an actual Egyptian lawyer, not something to infer from which specific words are or aren't present.** Recommend to Zakaria that if this concern is significant enough to specifically flag, it's worth a short legal consultation to confirm the site's language is actually compliant, rather than relying on a single-phrase avoidance rule as if it were legal clearance.

### 7.2 Concrete task

- Search the full codebase (all bilingual content files, seed data, layering-system labels, any marketing copy) for the literal phrase "استثمار عقاري" and any close variants — remove or rephrase every instance.
- Review surrounding context in each instance, not just delete-the-phrase-and-move-on — often a phrase like this appears as part of a larger sentence making an investment-framed claim (e.g. "a great investment opportunity"), and the surrounding sentence may need to be reworded as a straightforward property-sale statement, not just have the one flagged phrase stripped out and the rest of the investment-framed sentence left standing.
- Add this to the bilingual QA pass's ongoing checklist (per the bilingual/data QA plan's Task 1) as a standing rule for all future copy — any new content written for the site (new property descriptions, future marketing copy) should be checked against this rule going forward, not just the current backlog of existing copy.

---

## 9. FilterCard — "enhance the design a bit"

The vaguest item on this list, but treat that as a hint about ambition level, not a blank check — "enhance a bit" is asking for a polish pass, not a rebuild.

**Fix, scoped as polish rather than redesign:**
- Confirm the FilterCard (the property search/filter UI on the Properties listing page) uses the same card-depth, spacing, and typography treatment already established elsewhere on the site (per the layering plan's Section 7.2.1 declutter rules and the site plan's Section 4.1 brand direction) — if it's currently using more generic/default form-input styling than the rest of the site, bringing it in line with the established card language is itself a meaningful, correctly-scoped enhancement.
- Consider small interaction polish: smooth transitions when a filter value changes and results update (matching the site's established restrained-motion direction from Section 4.2 of the site plan, not a large new animation feature), clear visual feedback for which filters are currently active (e.g. an active-filter count badge or highlighted state on an applied filter, if not already present), and confirm it works correctly and looks equally considered in both RTL and LTR layouts.
- **Do not** interpret "enhance a bit" as license to add net-new filter functionality, additional fields, or a different filter paradigm (e.g. a sidebar-vs-inline redesign) — that would be new scope, not the polish pass this feedback is actually asking for. If the agent believes a more substantial change is genuinely warranted, that should be proposed back to Zakaria explicitly, not built speculatively under "enhance a bit."

---

## 10. Admin-editable accent color

A new, standalone feature request, distinct from the corrective items above — Zakaria wants to be able to change the site's accent color himself from the admin dashboard, rather than needing a code change every time he wants to adjust it. This is a real settings feature, not a design fix, and needs its own scoped build.

### 10.1 What "accent color" means here — scope this precisely before building

Before implementing, confirm with Zakaria exactly which color this refers to — likely the brand's gold `#C9A96A` (used for badges, CTA highlights, active-state indicators, and the logo's circular treatment from Section 4), not the deep green or charcoal, which function more as structural/background colors than an "accent." Getting this scoped correctly matters because a single "accent color" setting needs to map cleanly onto one specific token already used consistently across the site — if gold is currently hardcoded in many places under slightly different values rather than one consistent token, this feature can't work correctly until that's fixed first (see 10.2).

### 10.2 Precondition — the color must already be a single design token, not scattered hardcoded values

This feature only works cleanly if "the accent color" is genuinely one value referenced everywhere it's used (a CSS custom property / Tailwind theme token), not the same gold hardcoded as a literal hex value in dozens of individual components. If the color audit from item 2 above (checking every use of `#081410a6` and confirming what other colors are hardcoded ad hoc) turns up the accent gold itself being inconsistently applied, **that consolidation needs to happen first** — converting every hardcoded instance to reference one shared token — before an admin control to change "the" accent color would have any real effect. Treat this as a blocking prerequisite, not an optional cleanup.

### 10.3 Feature design

- **Admin dashboard setting:** a new "Site Appearance" or "Branding" section in the admin (a natural addition to the settings/dashboard area already established in the dashboard overhaul plan) with a color picker control for the accent color, plus a live preview showing a few real components (a button, a badge, a card highlight) in the selected color before saving — so Zakaria can see the effect before committing to it, rather than saving blind and checking the live site afterward.
- **Storage:** the selected color value stored in a small `site_settings` table (a single-row or key-value table — this doesn't need the complexity of the property/layering system's schema, it's one persistent setting):
  ```sql
  -- site_settings
  id             uuid primary key default gen_random_uuid()
  key            text unique not null   -- 'accent_color', extensible for future settings
  value          text not null           -- hex value, e.g. '#C9A96A'
  updated_at     timestamptz default now()
  ```
- **Applying the color to the live site:** the stored value needs to actually drive the CSS token every accent-colored element references — the cleanest approach is reading the setting at request/build time and injecting it as a CSS custom property (e.g. `--accent-color`) at the document root, with every accent-colored component already styled against that variable rather than a hardcoded value (per the 10.2 precondition). This means a color change takes effect site-wide the moment it's saved, without needing a code deploy — which is the entire point of this feature existing in the admin in the first place.
- **RLS:** `site_settings` follows the same pattern as every other admin-writable table in the project — public read (the live site needs to read this value to render), write restricted to the authenticated admin role only.

### 10.4 Guardrails — a color picker with no limits can produce a broken-looking site

Zakaria being able to pick literally any color is a real risk to the brand identity this whole project has carefully built — an admin control that lets him accidentally choose a color with poor contrast against the site's backgrounds, or one that clashes badly with the deep green/charcoal palette, could undo a lot of the design work in a single click. Reasonable guardrails, without being paternalistic about it:
- Offer a **curated set of a few pre-approved accent alternatives** (the current gold, plus perhaps 2-3 other tested-good options in a similar warm/luxury register) as the primary, easy path, with a full custom color picker available as a secondary "Advanced" option for Zakaria if he wants complete freedom.
- Run a basic contrast check against the site's actual background colors when a custom color is selected, and show a plain warning (not a hard block — it's his site) if the chosen color would have poor legibility/contrast in its actual usage contexts (e.g. gold text on the off-white background versus gold as a small badge fill are different contrast situations, so check against real usage, not one generic pairing).
- Since this doesn't need to be an unlimited engineering effort, treat the curated-options-plus-advanced-picker approach as the actual target, not a full from-scratch brand-safety validation system — the goal is nudging toward good choices, not preventing every possible bad one.

### 10.5 Build phase

- **Definition of done:** the accent gold used across the site is confirmed to be a single consistent design token (10.2's precondition satisfied); an admin can open the new Branding settings section, see a live preview, select a color (from the curated set or the advanced picker), save it, and see the change reflected across the live site (buttons, badges, active states, logo ring) without a code deploy; the contrast-warning guardrail fires correctly on a genuinely poor-contrast custom choice.

---

## 11. Process note for all items

Per this project's established pattern (repeated across the finishing-details display and maintenance-mode work): **verify every fix against a real screenshot or actual rendered output before reporting it complete, not a text description of what was changed.** Several items on this list (the ticker removal, the map pins, the logo circle, the FilterCard, the accent-color feature) are specifically about visual feel or live-rendered effect — a build summary claiming these are fixed without an actual before/after screenshot should not be accepted at face value, given this exact failure mode has already occurred more than once in this project.

Where an item explicitly requires more input before it can be correctly executed (Section 6's font complaint, Section 7's legal caveat), get that input first rather than guessing and re-doing the work later.