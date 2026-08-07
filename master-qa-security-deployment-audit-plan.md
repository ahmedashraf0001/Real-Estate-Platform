# Zakaria Farid Real Estate — Master QA, Security & Deployment-Readiness Plan

**Purpose of this document:** this sits above the four existing specs (site build plan, layering-system plan, admin dashboard overhaul plan, bilingual QA + demo data plan) as a single pre-launch audit — the pass that checks whether everything built so far actually holds together as one shippable product, not just whether each individual feature works in isolation. Where the other four documents specify *what to build*, this document specifies *how to verify it's actually correct, secure, and ready*. Do not duplicate work already scoped in those documents (e.g. the bilingual correctness pass is Task 1 of the bilingual/data plan, not restated here) — this document references them and adds the categories they don't cover: security, cross-document consistency, and deployment readiness.

**Why this needs to exist as its own pass, not just "more phases" tacked onto the other docs:** every previous document in this project was written and built one feature at a time, and — as the last several rounds of screenshots showed — a feature built correctly in isolation (real per-zone data, a working pipeline board) can still ship with a problem that only shows up when you look at the *whole* product at once: inconsistent Arabic terms across two different screens, a Supabase table that got RLS-enabled for `properties` but not for the newer `leads.stage` column's related policies, a Cloudflare env var that works locally but was never set in the dashboard. This document is that whole-product look.

---

## 1. How this audit is organized

Four categories, run in this order, because later categories assume earlier ones are already true:

1. **Functional correctness** — does every feature from the four prior documents actually do what its spec says, using real data, with no leftover placeholder/mock content. (This category mostly *references* work already scoped elsewhere rather than re-specifying it — see 1.1.)
2. **UI/design consistency** — does the whole product, across every screen in both languages, actually read as one coherent brand, not four separately-styled subsystems bolted together.
3. **Security** — the category with zero coverage anywhere in the project so far. This is the one most likely to contain a real, serious gap, because nothing else in this project has explicitly checked it.
4. **Deployment readiness** — is the actual hosting/environment configuration correct, not just "does it run in local dev."

### 1.1 What functional correctness re-uses vs. adds here

The bilingual/data plan's Task 1 (content correctness) and Task 2 (demo data) already fully specify the functional-correctness work for content and data. This document does not repeat those — it adds one thing they don't cover: **a feature-by-feature trace against every prior spec's own "Definition of done" line**, treating those definitions as the actual acceptance criteria rather than trusting a build summary that says a phase is complete (see the site-plan/dashboard history in this project — an agent's own summary of what it built has already proven unreliable at least once). Concretely: go through every "Definition of done" bullet across the site plan, the layering-system plan, and the dashboard plan, and verify each one directly against the running app — not against what the agent reports.

---

## 2. UI/Design consistency audit

This is the cross-document check none of the four prior documents can do on their own, since each was written and built as its own pass.

### 2.1 Cross-surface brand consistency

Place the public site, the property detail page's finishing-details section, and the admin dashboard side by side (literally — three browser tabs) and check:
- Same color tokens used identically (not "close to" the charcoal/green/gold — the exact hex values from the site plan's Section 4.1, reused verbatim, not re-approximated by whichever agent session styled that particular screen).
- Same type pairing (Playfair Display headings / Plus Jakarta Sans body) applied with the same weight/size logic across all three surfaces — check specifically that the admin's Section 2.5 visual pass (from the dashboard plan) didn't invent a slightly different heading scale than the public site uses.
- Same card-depth/shadow language, same badge/chip styling, same button styles — spot-check that the finishing-details Layer 1 cards (layering plan, Section 7.2.1) and the admin's stat cards (dashboard plan, Section 2.5) actually match each other, not just each independently matching a text description of the brand.

### 2.2 RTL consistency, re-verified as a cross-cutting concern

The site plan's Section 5 and the bilingual plan's Section 1.3 both already call for RTL verification within their own scope. This audit's job is narrower and specific: verify RTL rendering **at the seams between subsystems** — e.g. does the admin sidebar (built in the dashboard overhaul) mirror correctly when a user has the site set to Arabic, given that the admin was likely built and screenshotted in English throughout the iteration process shown in this project's history. Seams between independently-built subsystems are exactly where a "we already checked RTL" assumption is most likely to be wrong, because each subsystem's RTL check happened in isolation.

### 2.3 Animation/motion consistency

Per the site plan's Section 4.2 animation direction: verify the finishing-details accordion (layering plan Layer 2) and the admin pipeline board (dashboard plan Section 3.2) use comparable transition timing/easing to the rest of the site, not a different motion feel introduced independently during their own build passes. Motion inconsistency is a subtler version of the same "four subsystems, one product" problem as the color/type check above.

### 2.4 No leftover "obviously AI-generated" tells

Re-run the specific anti-pattern checklist from the site plan's Section 4.3 (default shadcn styling used unmodified, generic stock imagery, purple-blue gradients, icon-in-circle grids, emoji-as-icons) against **every screen built since that section was written** — the admin dashboard and the finishing-details display were both built after that checklist existed but were not explicitly checked against it during their own iteration, based on the screenshots reviewed so far in this project (the original dashboard screenshot's plain stat-card-plus-gray-icon-chip pattern is a mild example of exactly what 4.3 warns against).

---

## 3. Security audit

**This category has had zero explicit coverage anywhere in the project so far** — none of the four prior documents include a security review, which is a real gap given the stack (Supabase + Next.js + Cloudflare) has well-documented, common, serious failure modes specific to exactly this combination. Current guidance on Supabase-backed apps is direct on this point: a single missing or misconfigured RLS policy is the dominant real-world failure mode for AI-built Supabase applications specifically — one such gap compiled cleanly, passed manual review, and affected over 170 production apps built with AI coding tools before being caught. Given this entire project has been implemented by an AI coding agent across many iterative passes, this exact failure mode is the single highest-priority thing to check, not a generic checklist item among many.

### 3.1 Row Level Security — the highest-priority check

- **Verify RLS is enabled on every table**, not just the ones explicitly discussed in the original schema sections: `properties`, `property_images`, `leads` (site plan Section 3), plus every table added since — `zone_templates`, `trade_templates`, `attribute_templates`, `property_zone_instances`, `property_trade_instances`, `property_attribute_values` (layering plan Section 6). The template tables (`zone_templates`, `trade_templates`, `attribute_templates`) are system-defined seed data, not user data, but still need RLS enabled with a public-read/no-write policy — an RLS-disabled table is a flagged risk regardless of whether its content is sensitive, because "this table doesn't contain sensitive data so it doesn't need RLS" is exactly the reasoning that produces the class of gap described above.
- **Test policies from the actual client SDK the app uses, not from the Supabase SQL editor** — the SQL editor bypasses RLS entirely, so a policy that looks correct when queried there can still be broken for real app traffic. Specifically test: can an unauthenticated visitor read `leads` (should be insert-only, never read — site plan Section 3 already specifies this correctly; verify it was actually implemented, not just specified); can an unauthenticated visitor write to `properties`, `property_zone_instances`, or any other admin-only table (should always fail); can an authenticated non-admin read another concept's private data (not applicable with a single admin user today, but verify the policy is written as "authenticated admin role" and not simply "any authenticated user," so this doesn't silently become a gap if a second admin account is ever added later).
- **Verify the `admin_only` attribute-value flag from the layering plan's Section 7.2 actually enforces at the RLS/query level**, not just at the UI-rendering level — if this field was implemented as "hide it in the component" rather than "the anon-role query itself excludes rows where `admin_only = true`," it is not actually private, it's just not displayed by the one client that respects the flag; anyone querying the public API directly would still see it.

### 3.2 Storage bucket configuration

- Property photo buckets are correctly public-read (this is intentional and correct for this use case — listing photos are meant to be publicly viewable, this is not a misconfiguration), but **verify upload/write access is still restricted to the authenticated admin role** — a public-read bucket with public-write is a real vulnerability (anyone could upload arbitrary files to Zakaria's storage), whereas public-read with admin-only-write is the correct, intended configuration.
- Verify signed-URL or equivalent access control if any zone-specific "admin-only" photos exist per the layering plan's optional private-notes feature — if that feature was built, its photos (if any) need the same admin-only enforcement as its text data.

### 3.3 Secrets and environment variables

- **Verify the Supabase service role key is never exposed client-side** — only the anon key (which is safe to expose, since it's what RLS is designed to gate) should appear in any `NEXT_PUBLIC_`-prefixed variable or in any client-bundled code. The service role key bypasses RLS entirely, so its exposure would undo every RLS policy audited in 3.1 regardless of how correctly those policies are written.
- Verify no API keys, database URLs, or secrets exist hardcoded in the repository (grep the codebase, not just check the `.env.example` looks right) — a key committed to git history even briefly remains recoverable from that history indefinitely, so this needs a direct search, not an assumption based on current file contents.
- Verify environment variables are actually set in the Cloudflare Pages dashboard's "Environment Variables" / "Build variables and secrets" section for the production environment specifically — a common, well-documented gap with this exact deployment target is an app that works in local dev (reading `.env.local`) but breaks or silently falls back to wrong values in production because the Cloudflare dashboard's own environment variable configuration was never set, since Cloudflare does not read a project's `.env` file at deploy time the way local dev does.

### 3.4 Authentication hardening

- Confirm Supabase Auth email confirmation is enabled and one-time-password/magic-link expiry is set to a short window (an hour or less) rather than left at a longer default — minor for a single-admin-account use case, but a near-zero-cost check worth doing anyway since it's a standard item in current Supabase production guidance.
- Confirm the admin login route actually redirects unauthenticated visitors away from every `/admin/*` route (not just the dashboard home) — verify this by directly navigating to a specific admin sub-route (e.g. the leads pipeline URL) in a logged-out browser session, not just checking that the login page itself exists.

### 3.5 Input validation

- Confirm the public contact form and any other public-facing input (the lead capture form, specifically) validates input server-side, not only client-side — a client-side-only check can be trivially bypassed by anyone calling the underlying API route directly, which matters here because the leads table is one of the few write paths exposed to unauthenticated visitors at all.
- Confirm phone numbers and other form inputs are checked for reasonable format/length before being stored or used to construct a `wa.me` link, since malformed input here could produce a broken or malicious link, not just bad data.

---

## 4. Deployment readiness audit

### 4.1 Cloudflare-specific configuration

- Confirm the `nodejs_compat` compatibility flag is enabled in the Cloudflare Pages project settings — this is a commonly missed step specific to Next.js-on-Cloudflare deployments and causes real runtime failures if skipped, not a cosmetic setting.
- Confirm the production deployment was actually tested via Cloudflare's `wrangler`/preview flow (which runs the real `workerd` runtime) at least once before considering deployment "done," not only verified via `next dev` locally — the two runtimes have real behavioral differences, and a page that works in local dev can still fail once actually running on Cloudflare's edge runtime.
- Confirm the custom domain (if Zakaria has one, or will) is correctly attached and SSL is provisioned — if no custom domain exists yet, confirm the `*.pages.dev` URL is at least functional and known.

### 4.2 Build and CI verification

- Confirm the GitHub-to-Cloudflare-Pages CI pipeline actually triggers a fresh build and deploy on push to `main` (not just that it worked once during initial setup in Phase 0 of the site plan) — re-verify this is still functioning after all the subsequent feature work, since deployment configuration can silently drift or break across a long build process.
- Confirm the production build completes with no build-time errors or warnings that were being silently ignored in local dev.

### 4.3 Performance baseline

- Run a Lighthouse (or equivalent) pass on the live production deployment specifically — not a local dev build, which can report misleadingly different performance numbers — covering the homepage, a property detail page (the heaviest page, given the finishing-details Layer 1/2/3 content), and the admin dashboard.
- Confirm images are actually serving optimized/resized versions in production (per the site plan's Section 1.4 image-handling decision), not full-resolution originals — this is easy to silently regress if the resize step was only wired up for local testing.

### 4.4 Final content/data check (cross-reference only — full spec lives in the bilingual/data plan)

- Confirm the bilingual/data plan's Task 2 has actually completed — no dummy properties from the original placeholder set remain live — before considering the site launch-ready. This audit does not re-specify that work, only confirms its completion gate is satisfied.
- Confirm the site plan's Section 6 content checklist (real WhatsApp number, real About content, real social links or their removal) is fully resolved, not partially — a mix of real and placeholder content across different sections is a worse look than either being fully placeholder or fully real.

---

## 5. Output format for this audit

Unlike the four prior documents (which specify features to build), this document's output when executed should be a **findings report**, structured as:

```
## Category: [Functional / UI Consistency / Security / Deployment]
### Check: [specific check from this document]
- Status: Pass / Fail / Partial
- Evidence: [what was actually observed — a screenshot, a query result, a direct test — not a self-report]
- If Fail/Partial: what's actually wrong, and which prior document's section governs the correct fix
```

This mirrors the same principle already established in this project after the finishing-details display incident: **a build agent's own narrative summary of what it did is not sufficient evidence that it did it** — every check above should be verified against the actual running system (the real render, the real database query, the real production URL), the same standard already applied when the "Mixed" badge and `liv.walls.details` issues were caught by looking at the actual screenshot rather than trusting the summary.

---

## 6. Build/execution order

1. Confirm Task 1 and Task 2 of the bilingual/data plan are complete (Section 4.4 here is a gate, not new work).
2. Run Section 1.1's Definition-of-done trace across all three feature documents.
3. Run Section 2 (UI consistency) — do this before security/deployment since it's the fastest category to check and likely to surface the most familiar-looking issues given this project's history.
4. Run Section 3 (security) — highest-priority category given zero prior coverage; do not skip or abbreviate this even though it's less visually obvious than Section 2's findings.
5. Run Section 4 (deployment readiness) last, since it depends on the app actually being feature-complete and secure first — no point verifying production deployment config for a build that still has open security findings.
6. Produce the findings report per Section 5, and route each Fail/Partial finding back to whichever prior document governs the fix — this document should not itself contain feature-build instructions, only findings and pointers.
