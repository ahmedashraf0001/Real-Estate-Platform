# Admin Dashboard Overhaul — AI Agent Build Plan

**Purpose of this document:** a self-contained execution spec for an AI coding agent to overhaul the admin dashboard from a static counts-and-lists landing page into an actual working tool for running a one-person real estate business day to day. This extends the site build plan and the layering-system plan — it does not replace either; it specifically targets the `/admin` dashboard home and the Leads section.

---

## 0. What's wrong with the current dashboard, specifically

The current implementation (4 stat cards: Total Properties, Active Listings, Featured, Total Leads; a Recent Properties list; a Recent Leads list) is not broken — the data is real and the layout is clean — but it only answers "how many things exist." It does not answer the two questions Zakaria actually needs answered every time he opens this page: **"which lead do I need to talk to right now?"** and **"how is my business actually doing?"** Every feature below exists to answer one of those two questions. Nothing in this plan is decoration.

## 1. Grounding this in how real estate businesses actually run (not guessed)

Before specifying features, it's worth being explicit about the two things that consistently separate a working agent tool from a glorified contact list, since Zakaria's brief didn't specify this and it shouldn't be guessed at randomly:

1. **A visual pipeline beats a flat leads list.** A lead sitting in a table with a timestamp tells you nothing about where it stands in the actual sales process — new inquiry, contacted, viewing scheduled, negotiating, closed, or dead. Every serious real estate tool organizes leads by pipeline stage, not by arrival date, because "how many leads do I have" is a far less useful question than "which stage is each deal stuck at."
2. **Speed-to-lead is the single highest-leverage metric in this business** — a large share of real estate deals are lost specifically because of slow follow-up on a fresh inquiry, and a dashboard that doesn't surface "this lead came in 4 hours ago and hasn't been touched" is missing the one thing most likely to actually cost Zakaria a sale.

Everything in Section 3 (pipeline) and Section 4 (financial overview) follows from those two points, applied to a solo owner-operator rather than a team — so no team-management, role-assignment, or multi-agent features, which the CRM research above treats as standard but which are the wrong shape for a one-person business and would only add clutter Zakaria has no use for.

---

## 2. Scope boundary — what this document covers vs. defers

**In scope now:** the lead pipeline (Section 3), the dashboard home overhaul (Section 5), and the data model changes needed to support both. **Financial/cashflow calculations are explicitly scoped down for now** per your note that the client hasn't specified what he actually wants calculated — Section 4 below builds only the parts of a "financial overview" that don't require guessing at business logic Zakaria hasn't confirmed (a portfolio value rollup from data that already exists, and a lead-source/conversion view), and explicitly flags the parts that do need his input before being built (see 4.3). This avoids two bad outcomes: shipping nothing useful while waiting on him, and shipping a guessed-at cashflow calculator that computes the wrong thing and quietly misleads him about his own business.

---

## 3. Lead Pipeline (the highest-leverage addition)

### 3.1 Pipeline stages

Add a `stage` field to the `leads` table (extending the schema from the site plan's Section 3) with a fixed, small set of stages — small on purpose, since an overly granular pipeline is exactly the kind of complexity a solo operator abandons within a week:

```
new → contacted → viewing_scheduled → negotiating → closed_won → closed_lost
```

`new` is the default on insert (whether from the contact form or a WhatsApp-originated inquiry Zakaria logs manually — see 3.4). `closed_lost` is a real, trackable outcome, not just a deletion — knowing *why* deals fall through (see `lost_reason` below) is exactly the kind of thing a solo agent forgets to ever look back on unless the tool captures it in the moment.

### 3.2 Pipeline view (replaces/extends the current "Leads" nav section)

A kanban-style board — one column per stage, lead cards within each column, drag-and-drop (or, if drag-and-drop is skipped for time, a simple "move to next stage" button on each card is an acceptable minimum) to move a lead between stages. Each lead card shows: name, phone, which property they inquired about, and **time since last activity** — this last field is the speed-to-lead signal from Section 1, and it should be visually prominent (e.g. a card that's sat in `new` for over 24 hours gets a visible warm-colored indicator) rather than buried in a timestamp column, because the entire point is that Zakaria should be able to glance at the board and immediately see which lead is going stale.

Clicking a lead card opens its detail: full contact info, the property inquired about (linked), a free-text notes field (so Zakaria can jot "wants a payment plan, following up Thursday" — critical for a solo operator's memory across dozens of leads), a `lost_reason` field (free text or a short fixed list — price, financing, chose competitor, went cold, other) that only appears once a lead is moved to `closed_lost`, and the one-tap WhatsApp action already speced in the earlier plan.

### 3.3 Lead source tracking

Extend the `leads.source_page` field (already in the site plan's schema) into a slightly richer `source` concept: which property page, or general contact page, or — if a future WhatsApp-first flow is added — direct WhatsApp click with no form fill. This is what eventually answers "which properties/pages actually generate real inquiries," which matters more to Zakaria's marketing effort than raw lead count does. No new infrastructure needed — this is just making sure `source_page` is actually captured consistently everywhere a lead can originate, since the value here is entirely in the data being complete, not in any new UI.

### 3.4 Manual lead entry

A "+ Add Lead" action on the pipeline view, for the reality that a serious chunk of Zakaria's actual leads will come from a phone call or an in-person conversation that never touches the website's contact form at all. Same fields as a form-originated lead (name, phone, property if applicable, notes), just entered directly by Zakaria rather than by a website visitor. Without this, the pipeline only reflects a fraction of his real pipeline and he'll stop trusting it within a month.

---

## 4. Financial / business overview — the parts that don't require guessing, plus what's deferred

### 4.1 Portfolio value rollup (buildable now — no new business logic to confirm)

A simple summary card: total listed value of active inventory (sum of `price_egp` across `status = 'active'` properties), broken down by property type or by status (active / under offer / sold) if there's more than a couple of properties — this is a pure aggregation of data that already exists in the `properties` table from the site plan, so it's safe to build without waiting on Zakaria for anything.

### 4.2 Lead-to-close conversion view (buildable now, once 3.1's stages exist)

A simple funnel visualization: count of leads at each pipeline stage, and (once there's a few months of data) a rough conversion rate from `new` to `closed_won`. This answers "is my lead flow actually working" without requiring any cashflow/income modeling — it's a count-and-percentage of data the pipeline itself already produces.

### 4.3 Deferred — do not build yet, and do not guess at the business logic

**Cashflow / income-outcome calculation is explicitly deferred**, per your note that Zakaria hasn't specified what he needs calculated. Do not build a guessed-at version of this — a plausible-looking financial calculator that computes the wrong thing (wrong commission structure, wrong cost basis, wrong installment-plan math) is worse than no calculator at all, because it looks authoritative and Zakaria has no way to know it's wrong. Before this gets built, the following needs to come from Zakaria directly, and should be asked as a short, concrete set of questions rather than an open-ended "what do you need":

- Does he earn a commission/margin per sale (as an agent), or is the "income" here his own developer profit margin per unit (cost basis vs. sale price, since he's listed as the direct owner/developer)? These are fundamentally different calculations.
- Does he need per-property cost tracking (construction cost, land cost) to compute margin, or does he just want to track sale price against listing price?
- Are any of his sales on installment plans (the data model already has a `payment_option` field for this) — if so, does he want to track expected incoming installment cashflow over time, which is a meaningfully more complex feature than a single-transaction profit calculation?

Once these are answered, this becomes a well-scoped follow-up addendum to this document — it should not be improvised into the current build.

---

## 5. Dashboard home — revised layout

Keep the four stat cards from the current build (they're fine), but make the page actually actionable rather than purely observational:

1. **Stat row** (existing: Total Properties, Active Listings, Featured, Total Leads) — add a fifth: **Leads needing attention** (count of leads in `new` stage older than a configurable threshold, e.g. 24 hours) styled with the same warm-indicator treatment as the pipeline card, since this is the single number most likely to actually change what Zakaria does when he opens the dashboard.
2. **Pipeline snapshot** — a compact version of the Section 3.2 kanban (stage columns with counts, not full cards) as a dashboard widget, linking through to the full pipeline view — this replaces the current flat "Recent Leads" list, which conveys arrival order but nothing about what needs action.
3. **Portfolio value card** from 4.1, alongside the existing Recent Properties list (keep Recent Properties as-is — it's a reasonable, simple view of what's live).
4. Do not add the deferred financial section (4.3) to this layout until it's actually specified — an empty/placeholder "Cashflow" card that does nothing yet would just be visual clutter promising a feature that isn't there.

---

## 6. Data model additions

```sql
-- extends the `leads` table from the site plan's Section 3
alter table leads add column stage text not null default 'new';
   -- 'new' | 'contacted' | 'viewing_scheduled' | 'negotiating' | 'closed_won' | 'closed_lost'
alter table leads add column notes text;
alter table leads add column lost_reason text;
alter table leads add column stage_updated_at timestamptz default now();
alter table leads add column source text;  -- richer version of source_page, see 3.3
alter table leads add column entry_method text default 'form';  -- 'form' | 'manual' — see 3.4
```

`stage_updated_at` is what powers the "time since last activity" staleness indicator from 3.2 — update it on every stage change, not just on creation.

---

## 7. What NOT to build (keeping this from becoming a bloated CRM clone)

- **No AI lead scoring, no predictive analytics, no automated follow-up sequences/drip email/SMS campaigns.** These are real 2026 CRM-market features, but they're built for teams managing lead volume at a scale Zakaria doesn't have as a solo operator — they'd add real complexity (background jobs, third-party sending services, likely paid tiers) for a use case that doesn't need automation yet. Revisit only if lead volume genuinely grows to the point manual tracking becomes the bottleneck.
- **No multi-agent/team assignment, no role-based views, no broker-vs-agent permission tiers.** Single admin user, per the existing site plan — this entire category of CRM feature doesn't apply.
- **No calendar/appointment-scheduling system.** "Viewing Scheduled" is a pipeline stage the admin sets manually when he schedules something over WhatsApp/phone — building an actual scheduling/calendar-sync tool is a materially bigger feature than this brief calls for right now.
- **No cashflow/commission calculator** until Section 4.3's open questions are answered — do not improvise the business logic.
- **No email integration.** Leads are phone/WhatsApp-first per the whole site's design; don't add an email inbox/tracking feature nothing else in the project uses.

---

## 8. Build phases

### Phase A — Pipeline data model + kanban view
- Implement the `leads` table additions from Section 6.
- Build the kanban pipeline view (3.2) with drag-or-button stage transitions, the staleness indicator, and the lead detail panel (notes, lost_reason, WhatsApp action).
- Build manual lead entry (3.4).
- **Definition of done:** Zakaria can see every lead organized by real sales stage, immediately spot which fresh lead hasn't been touched, move a lead through stages as he actually works it, and log a phone-originated lead that never touched the website.

### Phase B — Dashboard home revision
- Implement the revised layout from Section 5: the fifth stat card, the pipeline snapshot widget, the portfolio value card (4.1), and the conversion funnel (4.2).
- **Definition of done:** opening `/admin` immediately surfaces "what needs my attention today," not just "how many things exist" — the dashboard home should answer a question, not just report a count.

### Phase C — deferred, blocked on client input
- Do not start until Section 4.3's questions are answered. Once they are, this becomes its own short addendum spec, scoped to whichever calculation (commission-based agent income vs. developer margin vs. installment cashflow projection) Zakaria actually confirms he needs.

---

## 9. Open items to confirm with the client before Phase C

- The three questions in Section 4.3 — commission vs. margin model, whether per-property cost tracking is wanted, and whether installment cashflow projection is needed.
- Whether a 24-hour staleness threshold for "needs attention" feels right for how Zakaria actually works, or whether he'd want that configurable.