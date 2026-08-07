# Egyptian Property Construction-Layering System — AI Agent Build Plan

**Purpose of this document:** a self-contained execution spec for an AI coding agent to build a cascading, fast-entry construction/finishing detail system for Egyptian residential properties. This is a subsystem that plugs into the admin dashboard of the real estate site (see the separate site build plan) — it replaces a flat "describe your property in one text box" admin experience with a structured, tappable, per-zone finishing spec, without turning listing entry into a 40-field slog.

**Design philosophy the agent must hold onto throughout:** the admin is not a construction engineer filling out a spec sheet — he is a developer/agent who needs to describe a real unit in under two minutes for most properties, with the option to go deep when it actually matters (e.g. a fully-finished villa where finish quality is the whole sales pitch). Every design decision below is in service of that speed/depth balance. If a design choice makes fast entry slower to make thoroughness possible, that's the wrong tradeoff — thoroughness is opt-in, speed is default.

---

## 0. What this system is, in one paragraph

A property has a **Type** (apartment, villa, building, tower, garage...). Each Type has a fixed set of **Zones** (rooms/spatial areas — e.g. an apartment has a Reception, a Master Bedroom, a Kitchen...). Each Zone has a fixed set of **Trades** (plumbing, electrical, flooring, walls, carpentry, HVAC — the actual construction work done in that zone). Each Trade has a **Status** (how far along/finished it is) and a small set of **Attributes** (specific choices like tile material or door type). The admin picks a Type, gets every Zone and Trade for that Type pre-populated at a sensible default via a **Global Finishing State** shortcut, and only edits what's actually different about this specific unit. No furniture, no appliances, no loose decor — fixed construction and finishes only, per your explicit constraint.

---

## 1. Reconciling the two source documents (context for the agent, not a build step)

Two rough source documents were provided and both had real value but needed filtering:

- **Source A** (property structure JSON) is strong on *what zones exist per property type* and the correct Arabic/English terminology — villa sub-types (standalone/twin house/townhouse), the ground/first-floor/roof layout logic for villas, the basement/typical-floor/roof logic for buildings and towers, and duplex/triplex/penthouse variants. It is weak as a data model: it mixes prose description into what should be schema, and doesn't define trades/finishing-status at all.
- **Source B** (cascading system prompt) is strong on *shape* — the Level 1 → 2 → 3 cascade, the Global Finishing State auto-populate shortcut (Red Brick / Semi-Finished / Fully Finished), and trade-level status enums with real Egyptian-market attributes (concealed cistern, smart-home prep, tile grade/فرز). It is incomplete on coverage — missing the kitchen as its own zone, missing corridors/balconies as a zone, missing the roof annex, and missing several villa-specific zones (garden/fence, pool) that source A implies.

This document merges them: **Source A's zone coverage + Source B's trade/status/attribute shape**, extended to close the gaps in both, restructured into a schema an agent can implement directly (tables, enums, UI flow) rather than a narrative spec.

---

## 2. The four-level hierarchy

```
Level 0: Property Type       (Apartment, Villa, Building, Tower, Garage Unit)
   └─ Level 1: Zone           (Reception, Master Bedroom, Kitchen, Basement Garage...)
        └─ Level 2: Trade      (Plumbing, Electrical, Flooring, Walls, Carpentry, HVAC...)
             └─ Level 3: Attributes  (Status enum + a handful of specific fixed-construction fields)
```

This is a strict tree: every Zone belongs to exactly one Property Type template; every Trade belongs to exactly one Zone; every Attribute belongs to exactly one Trade. The admin never freely invents new zones or trades — the tree is fixed by the system (per Property Type), and the admin's job is only to fill in Level 3 values. This constraint is what keeps data consistent enough to eventually power structured search/filtering (e.g. "villas with a private pool and finished HVAC") — free-text zone names would break that.

---

## 3. Level 0 — Property Types

Each Property Type is a fixed template defining which Zones it contains. Five Property Types, matching the real Egyptian market and your stated scope:

| Property Type | Arabic | Notes |
|---|---|---|
| Apartment | شقة | Includes Duplex, Triplex, and Penthouse as **sub-type variants** of Apartment — see 3.1, not separate top-level types, since they share ~90% of the same zone set with one structural difference (multi-level). |
| Villa | فيلا | Includes Standalone / Twin House / Townhouse as sub-type variants — see 3.1. |
| Residential Building | عمارة | The whole low/mid-rise building as a sellable/describable unit (e.g. if Zakaria is listing an entire building, not just one flat in it). |
| Tower | برج | High-rise, 10+ floors — distinct from Building because of the added infrastructure zones (multi-level basement, service core, advanced fire safety). |
| Garage Unit | جراج | A standalone parking unit sold/rented separately — simple, from Source B, kept as-is since it's already minimal. |

### 3.1 Sub-type variants (not separate trees — modifiers on Apartment/Villa)

Rather than building six near-duplicate trees for Apartment/Duplex/Triplex/Penthouse and three more for Villa/Twin House/Townhouse, model sub-type as a **field on the property**, not a separate template:

- **Apartment sub-types:** Standard, Duplex, Triplex, Penthouse.
  - Standard = single-level zone set (3.2).
  - Duplex/Triplex = the same zone set, but the admin assigns each Zone to a **Level** (e.g. "Master Bedroom → Upper Level", "Reception → Lower Level") using the `level_label` field described in 4.1. The system doesn't need a different zone list — it needs an extra grouping field on each zone instance.
  - Penthouse = Standard zone set + one extra zone: **Open Terrace** (تراس مكشوف), auto-added when this sub-type is selected.
- **Villa sub-types:** Standalone, Twin House, Townhouse. All three share the exact same zone list (3.3) — the difference between them (fully detached vs. shared walls vs. row house) is descriptive/marketing metadata, not a construction-layering difference, so it does **not** change the trade tree. Store it as a simple enum field on the property, unrelated to this layering system.

This keeps the tree count at five real templates (Apartment, Villa, Building, Tower, Garage) instead of eleven, which is a meaningfully simpler system to build and for the admin to reason about, while still capturing every distinction in Source A.

### 3.2 Apartment — Zone list

1. Reception (الاستقبال / الريسبشن)
2. Master Bedroom (غرفة نوم رئيسية) — includes its en-suite bathroom as a sub-zone, see 3.6
3. Standard Bedroom (غرفة نوم) — **repeatable zone**, admin sets a count (1–4 typical) and each instance can optionally be edited individually or left at the default
4. Main Bathroom (الحمام الرئيسي)
5. Guest Bathroom (حمام ضيوف) — optional, not all apartments have one
6. Kitchen (المطبخ)
7. Balcony / Terrace (التراس / البلكونة) — repeatable if there's more than one
8. Corridors (طرق توزيع) — single zone, minor trade set (see 3.6)
9. *(Penthouse only)* Open Terrace (تراس مكشوف)

### 3.3 Villa — Zone list

1. Exterior / Garden & Fence (الحديقة والسور) — includes pool if present, see attributes in 3.6
2. Ground Floor (الدور الأرضي) — a *floor-level container*, not a trade zone itself; contains its own sub-zones: Entrance Hall, Reception(s), Dining, Guest Powder Room, Main Kitchen (same trade sets as the apartment equivalents)
3. First Floor (الدور الأول) — sub-zones: Master Suite (+ en-suite + walk-in closet as attributes, not separate zones), Standard Bedrooms (repeatable), Family Living Room, Main Bathrooms
4. Basement (البدروم) — **optional zone**, only shown if the admin indicates the villa has one; sub-zones: Garage, Entertainment/Game Room, Driver/Nanny Room + en-suite, Storage/Laundry
5. Roof Level (الرووف) — sub-zones: Roof Annex/Guest Suite (optional), Outdoor Terrace

*(This nesting — Floor containing Zones containing Trades — is the one place the tree grows a level for villas specifically, because Source A's villa layout is genuinely floor-organized. See Section 4.3 for how the schema handles this without breaking the general 4-level model.)*

### 3.4 Residential Building — Zone list

1. Basement Garage (البدروم والجراج)
2. Ground Floor & Lobby (الدور الأرضي والمدخل)
3. Typical Floors & Stairwell (الأدوار المتكررة والسلم) — describes the shared/common-area finish level across repeated floors, not any single unit
4. Roof & Utilities (السطح)

### 3.5 Tower — Zone list

1. Multi-Level Basement (بدروم متعدد المستويات)
2. Commercial Mezzanine (الميزانين التجاري)
3. Typical Floors (الأدوار المتكررة)
4. Service / Emergency Core (نواة الخدمة والطوارئ)
5. Advanced Safety Systems (أنظمة السلامة) — towers only, per Source B

### 3.6 Garage Unit — Zone list

1. Access Ramp (الرامب)
2. Parking Bay (باكية الجراج)

---

## 4. Level 2 — Trades, and Level 3 — Attributes, per zone category

Rather than defining trades separately for all ~25 zones above (massive duplication), zones fall into a small number of **zone categories** that share the same trade set. Define the trade set once per category, then map every zone in Section 3 to a category.

### 4.1 Category: "Wet Room" (Bathrooms, Kitchens)

Trades: Plumbing, Electrical, Walls & Tiling, Flooring, Carpentry (for kitchen cabinetry frame-outs only — no actual cabinets, per no-furniture rule), HVAC (kitchen extraction only, where relevant).

| Trade | Status Enum | Attributes |
|---|---|---|
| Plumbing (السباكة) | NotStarted → RoughIn → Finished | `piping_brand` (text), `pressure_tested` (bool), `concealed_cistern` (bool, بathrooms only), `shower_type` (Walk-in / Bathtub / None, bathrooms only), `water_heater_provision` (Gas / Electric / Solar / None) |
| Electrical (الكهرباء) | NotStarted → ConduitsOnly → Wired → Finished | `wiring_brand` (text), `heavy_duty_outlets` (bool) |
| Walls & Tiling (الحوائط والبلاط) | RedBrick → Plastered → Tiled → Finished | `wall_tile_height` (Full Ceiling / Half / None) |
| Flooring (الأرضيات) | SandBed → Tiled → Finished | `material` (Ceramic / Porcelain / Marble / Epoxy), `grade` (First Choice فرز أول / Second Choice فرز ثاني) |
| HVAC — kitchen extraction only | NotStarted → Installed | *(no sub-attributes needed)* |

### 4.2 Category: "Living Space" (Reception, Bedrooms, Living Room, Dining)

Trades: Electrical, Walls & Painting, Flooring, Carpentry (openings only), HVAC.

| Trade | Status Enum | Attributes |
|---|---|---|
| Electrical (الكهرباء) | NotStarted → ConduitsOnly → Wired → Finished | `wiring_brand`, `smart_home_prepped` (bool) |
| Walls & Painting (الحوائط والدهانات) | RedBrick → Plastered → Putty → FinalPaint | `gypsum_board` (bool, أسقف معلقة) |
| Flooring (الأرضيات) | SandBed → Tiled/Parqueted → Finished | `material` (Ceramic / Porcelain / Marble / HDF), `grade` (First Choice / Second Choice) |
| Carpentry & Openings (النجارة والألوميتال) | None → SubFrames → Installed | `window_profile` (PS / Jumbo / Standard), `glazing` (Single / Double Glass) — *and for the zone's main entry point if applicable:* `main_door_type` (Armored مصفح / Wood) |
| HVAC (التكييفات) | NotStarted → CopperPrep → Installed | `copper_piping_brand` (text) |

### 4.3 Category: "Transit / Minor" (Corridors, Balconies, Terraces)

Trades: Electrical, Walls & Painting, Flooring only — lighter than living spaces, no HVAC/carpentry needed by default (carpentry only if the balcony has an enclosure, as an optional toggle).

| Trade | Status Enum | Attributes |
|---|---|---|
| Electrical | NotStarted → Wired → Finished | *(no sub-attributes)* |
| Walls & Painting | RedBrick → Plastered → FinalPaint | *(no sub-attributes)* |
| Flooring | SandBed → Tiled → Finished | `material`, `grade` |

### 4.4 Category: "Exterior / Garden" (Villa garden & fence zone only)

Trades: Landscaping, Fence & Gate, Pool (optional, toggle-activated).

| Trade | Status Enum | Attributes |
|---|---|---|
| Landscaping (تنسيق الحديقة) | NotStarted → Rough → Finished | `irrigation_system` (bool) |
| Fence & Gate (السور والبوابة) | NotStarted → Built → Finished | `gate_type` (Automatic Remote / Manual) |
| Pool (المسبح) — *only shown if admin toggles "Has Pool"* | NotStarted → Shell → Tiled → Finished | `pool_type` (Skimmer / Overflow), `heated` (bool) |

### 4.5 Category: "Building/Tower Infrastructure" (shared zones in Building/Tower types)

This category has more variance per zone than the residential categories, so trades are defined directly per zone rather than shared — matching Source B's approach, which was already correct here.

**Basement Garage:**
| Trade | Attributes |
|---|---|
| Ramp & Access | `ramp_gradient_type` (text), `automatic_remote_gate` (bool) |
| Parking Infrastructure | `parking_bay_count` (int), `numbered_slots` (bool) |
| Drainage | `sump_pump_installed` (bool, طلمبة غاطسة) |

**Ground Floor & Lobby:**
| Trade | Attributes |
|---|---|
| Lobby Finish | `lobby_finish_material` (Marble / Granite / Ceramic) |
| Security & Access | `concierge_room` (bool), `intercom_system` (Audio / Video / None) |
| Elevator Infrastructure | `elevator_count` (int), `capacity_kg` (int), `motor_brand` (text), `service_elevator_dedicated` (bool, towers/large buildings) |

**Typical Floors & Stairwell:**
| Trade | Attributes |
|---|---|
| Common Area Finish | `stairwell_finish_material` (text), `landing_finish` (text) |

**Roof & Utilities:**
| Trade | Attributes |
|---|---|
| Insulation & Waterproofing | `thermal_insulation` (bool), `waterproofing_bitumen` (bool) |
| Water Systems | `central_water_motor` (bool), `water_tank_count` (int) |

**Commercial Mezzanine** (Tower only):
| Trade | Attributes |
|---|---|
| Retail Shell Finish | `shell_finish_level` (Core & Shell / Fitted) |

**Service / Emergency Core** (Tower only):
| Trade | Attributes |
|---|---|
| Emergency Systems | `emergency_stairs_pressurized` (bool), `garbage_chutes` (bool) |

**Advanced Safety** (Tower only):
| Trade | Attributes |
|---|---|
| Fire & Backup Systems | `fire_suppression_sprinklers` (bool), `backup_generator` (bool), `cctv_surveillance` (bool) |

### 4.6 Category: "Garage Unit" (standalone garage listings)

| Zone | Trade | Attributes |
|---|---|---|
| Access Ramp | Ramp Construction | `ramp_gradient_type`, `automatic_remote_gate` (bool) |
| Parking Bay | Bay Finish | `bay_size_sqm` (numeric), `numbered` (bool), `covered` (bool) |

---

## 5. Global Finishing State — the speed shortcut

This is the single most important UX mechanism in the system and must be implemented exactly as Source B specified, extended to cover the fuller trade set above.

When the admin adds a new property and picks its Type, before touching any individual zone, he picks **one Global Finishing State**:

| Global State | Arabic | Auto-sets every applicable trade's Status to: |
|---|---|---|
| 🧱 Red Brick | طوب أحمر | Plumbing: NotStarted · Electrical: NotStarted · Walls: RedBrick · Carpentry: None · Flooring: SandBed · HVAC: NotStarted |
| 🏗️ Semi-Finished | نص تشطيب | Plumbing: RoughIn · Electrical: ConduitsOnly · Walls: Plastered · Carpentry: SubFrames · Flooring: SandBed · HVAC: NotStarted |
| ✨ Fully Finished | تشطيب كامل | Every trade's status set to its final/finished value |

**Behavior:** selecting a Global State instantly sets every Trade's Status across every Zone in the property to the mapped value. It does **not** touch the Attribute fields (brand, material, grade, etc.) — those stay empty/default until the admin explicitly fills them in, because attributes are optional detail, not part of the fast-path. This means a property can be published with just: Type → Sub-type → Global State → a few key photos and headline attributes (e.g. flooring material, since buyers care about that one a lot) — genuinely under two minutes for a simple case, exactly matching your speed requirement.

After picking a Global State, the admin lands on a **zone-by-zone review screen** (not a blank form) where every zone already shows its auto-populated status, and he can drill into any specific zone to override its status or add attribute detail — most commonly for the one or two rooms that are actually the sales pitch (e.g. "kitchen has full porcelain flooring, first choice grade" on an otherwise semi-finished apartment).

---

## 6. Data model (extends the property schema from the site build plan)

```sql
-- property_type_templates (seed data, not admin-editable via UI — system-defined)
id            text primary key         -- 'apartment' | 'villa' | 'building' | 'tower' | 'garage'
label_en      text not null
label_ar      text not null

-- zone_templates (seed data — the fixed tree per property type)
id                 text primary key    -- e.g. 'apartment.reception', 'villa.ground.reception'
property_type_id   text references property_type_templates(id)
parent_zone_id     text references zone_templates(id)   -- nullable; used for Villa's floor-container nesting (Section 3.3/7.1)
label_en           text not null
label_ar           text not null
category           text not null       -- 'wet_room' | 'living_space' | 'transit' | 'exterior' | 'infrastructure' | 'garage'
is_repeatable      bool default false  -- true for Standard Bedroom, Balcony
is_optional        bool default false  -- true for Guest Bathroom, Basement, Roof Annex, Pool
default_count      int default 1       -- for repeatable zones, how many instances to pre-create
sort_order         int not null

-- trade_templates (seed data — fixed per category, per Section 4)
id            text primary key         -- e.g. 'plumbing', 'electrical', 'walls_tiling'
category      text not null            -- matches zone_templates.category
label_en      text not null
label_ar      text not null
status_enum_values  jsonb not null     -- ordered list, e.g. ["NotStarted","RoughIn","Finished"]
sort_order    int not null

-- attribute_templates (seed data — fixed per trade, per Section 4)
id                text primary key     -- e.g. 'plumbing.concealed_cistern'
trade_id          text references trade_templates(id)
label_en          text not null
label_ar          text not null
data_type         text not null        -- 'boolean' | 'text' | 'enum' | 'integer' | 'numeric'
enum_values        jsonb               -- if data_type = 'enum'
applies_to_zone_categories  jsonb      -- e.g. concealed_cistern only shows for bathroom zone instances, not kitchen — a category-level trade can still have zone-specific attribute visibility
sort_order        int not null

-- === Per-property instance data (admin-editable) ===

-- property_zone_instances
id            uuid primary key default gen_random_uuid()
property_id   uuid references properties(id) on delete cascade
zone_template_id  text references zone_templates(id)
instance_label     text              -- for repeatable zones, e.g. "Bedroom 2"; null for singular zones
level_label         text             -- Duplex/Triplex only: "Upper Level" / "Lower Level" / "Ground" etc — see Section 7.1
sort_order    int not null

-- property_trade_instances
id                       uuid primary key default gen_random_uuid()
property_zone_instance_id  uuid references property_zone_instances(id) on delete cascade
trade_template_id       text references trade_templates(id)
status                  text not null       -- one of trade_template's status_enum_values
updated_at               timestamptz default now()

-- property_attribute_values
id                        uuid primary key default gen_random_uuid()
property_trade_instance_id  uuid references property_trade_instances(id) on delete cascade
attribute_template_id    text references attribute_templates(id)
value                    jsonb           -- stores bool/text/enum-string/int per the attribute's data_type
```

**Why templates are separate tables from instances:** this is what makes the Global Finishing State shortcut and the fixed-tree constraint from Section 2 actually enforceable in code, and it means extending the system later (e.g. adding a new Property Type, or a new attribute to an existing trade) is a seed-data change, not a schema migration or a rebuild of existing property records.

---

## 7. Admin UX flow (what the agent actually builds on screen)

### 7.1 Add Property flow

1. **Basics step** (existing, from the site plan): title, price, location, description, sub-type.
2. **Property Type + sub-type selection**: choosing Apartment/Villa/Building/Tower/Garage here determines which zone tree loads. Choosing an Apartment sub-type of Duplex/Triplex additionally prompts: "How many levels?" (2 or 3) and lets the admin type a short label per level (defaults to "Lower Level"/"Upper Level" or "Level 1/2/3") — this populates `level_label` on each zone instance as it's created, satisfying the duplex/triplex requirement from Source A without a separate zone tree.
3. **Global Finishing State picker**: three large tappable cards (🧱 / 🏗️ / ✨) with a one-line description each. Selecting one instantly generates every `property_zone_instance` and `property_trade_instance` row for this property from the templates, with statuses pre-filled per Section 5. *(For repeatable zones like Standard Bedroom, pre-create `default_count` instances — admin can add/remove instances afterward, e.g. "this apartment actually has 3 bedrooms not 2.")*
4. **Zone review screen**: a collapsed accordion/list of every zone (grouped by floor, for Villas — see below), each showing a compact summary chip of its trades' statuses (e.g. "Kitchen — Plumbing: Rough-in, Electrical: Wired, Flooring: Not started"). Tapping a zone expands it to show each Trade as a row with its Status as a segmented control/dropdown, and a "show details" toggle to reveal that trade's Attribute fields. **Most zones, most of the time, the admin does not open at all** — he trusts the Global State default and moves on. This screen must make it visually obvious which zones (if any) he's manually overridden, so he isn't guessing what he already touched.
5. For Villas specifically, the zone-review list is a **two-level accordion**, mirroring the Floor → Zone data hierarchy from Section 3.3 rather than flattening it: the outer level is Floor headers (Ground Floor / First Floor / Basement / Roof) — collapsed by default, tap to expand; expanding a floor reveals its Zones (Reception, Kitchen, Master Suite, etc.) as a second accordion level, each showing the same compact trade-status summary chip as non-villa zones; expanding a Zone reveals its Trades as before. This keeps a 15+ zone villa list navigable by letting the admin ignore whole floors he doesn't need to touch (e.g. collapse Basement entirely if the Global State default is fine there) while still drilling all the way to a single trade's status when something is genuinely different. Non-villa Property Types keep the single-level zone accordion from step 4 — this two-level pattern is villa-specific, matching where the data model actually has the extra Floor layer.
6. **Publish**: same as before — the property can be saved as draft or published; publishing does not require every zone to be filled, only the Basics step fields are mandatory (finishing detail is enrichment, not a blocker).

### 7.2 Public-facing display — full revamp

**This section replaces an earlier implementation that shipped and did not work.** Before specifying the replacement, it's worth being explicit about why the previous version failed, so the agent doesn't quietly reintroduce the same mistakes under a new visual skin:

**Diagnosis of the previous implementation:**
1. **It doesn't show the actual data.** The cards ("Bedrooms Suite," "Bathrooms & Washrooms") open a lightbox containing a generic photo and a single marketing sentence ("153 sqm, private dressing room, en-suite marble bath, and balcony"). None of the structured data this system exists to capture — trade status, attribute values, per-zone finish level — appears anywhere. It's a photo gallery wearing this system's card labels, not a display of this system's data.
2. **It groups by the wrong axis.** "Bedrooms Suite" as one card covering both Master Bedroom and Secondary Bedrooms conflates two different zones with different trade sets and different finish levels into one card, which is precisely the kind of ungrounded grouping Section 2's fixed-tree constraint exists to prevent. The grouping should follow the Zone tree from Sections 3–4, not a furniture-category instinct layered on top of it.
3. **It flattens the villa floor hierarchy.** "Floor Level & Building Access" appears as one card among four peers, when Floor is structurally a container *above* zones like Bedrooms and Bathrooms in the villa data model (Section 3.3), not a sibling category to them. A buyer looking at this card list has no way to tell that Ground Floor contains the Reception, First Floor contains the Master Suite — the spatial logic of the actual villa is invisible.
4. **The lightbox pattern buries information behind clicks a buyer has no reason to make.** Every card requires: click card → modal opens → click sub-tab → read one sentence → maybe open a second lightbox for the photo. For someone comparing finish quality across zones (which is the entire value proposition of this system, per Zakaria's "no middleman, see everything" trust pitch), that's far more friction than scanning a page.
5. **No connection between the photo and the finish data.** The photos in the lightbox appear to be generic stock/marketing shots unrelated to the actual zone's actual finish attributes — there's no way for a buyer to trust that "premium finishing" claim against anything concrete.

**The replacement structure — three layers, visible progressively, not hidden behind modals:**

**Layer 1 — Zone Overview Grid (default, always visible, no click required). Revised — see 7.2.1 for why and exactly what changes.**
A responsive grid of zone cards — one card per Zone (or per **repeatable-zone group**, see 7.2.1 rule 1), not per invented category — each showing: zone name (bilingual), a single representative photo *if the admin uploaded zone-specific photos* (optional; falls back to a subtle icon if none — never a generic stock photo standing in for the real unit), and a **finish-level badge, shown only when it adds information** (see 7.2.1 rule 2 — do not badge every card uniformly). This is the entire "headline picture at a glance" from the original spec, but now it actually reflects real per-zone data instead of a flat marketing sentence, and every zone is distinguishable — Master Bedroom and Standard Bedrooms are visibly separate categories, because they are separate zones with potentially different finish levels, without requiring five near-identical cards to say so.

For Villas: the grid is grouped under **Floor section headers** (Ground Floor / First Floor / Basement / Roof) matching the admin's two-level accordion from 7.1 step 5 — the floor structure that was invisible in the old flat card layout is now the primary visual organization, exactly mirroring how the admin entered the data and how a buyer actually thinks about a villa's layout.

*Finish-level badge computation:* if every trade in a zone shares the same status tier (e.g. all trades at their "Finished" equivalent), show that tier's label. If trades are mixed, show "Mixed" with a muted color rather than picking one status arbitrarily — showing a false single-status badge would misrepresent the property, which matters more here than a tidy badge. **This computation is unchanged from before — what changes in 7.2.1 is only whether the resulting badge is displayed on the card, not how it's computed.**

### 7.2.1 Decluttering Layer 1 — this corrects a real implementation that shipped, was structurally correct, and still read as cluttered and dated

A build following the Layer 1 description above shipped with genuinely correct data (per-zone, not merged) but produced a 12-card grid where every card was the same size, same weight, and displayed an identical "Mixed" badge — visually indistinguishable from a spreadsheet rendered as boxes, with a header-overlap layout bug on top. The fix here is not "add more visual polish" — it's specifically about reducing the number of same-weight things competing for attention at once. Three precise rules, in order of impact:

**Rule 1 — Collapse repeatable zones into one card with a count, expandable to individuals.**
`is_repeatable` zones (Standard Bedroom, Balcony/Terrace — per Section 6's `zone_templates.is_repeatable` flag) render as **one Layer-1 card**, not one card per instance: e.g. "Standard Bedrooms (5)" as a single card. This single card's badge reflects the *group's* aggregate finish state using the same Fully Finished / Semi-Finished / Mixed computation as any other zone, just aggregated across all instances in the group instead of within one instance's trades. Clicking this card expands to Layer 2 exactly as any zone would, but the expanded view shows each instance (Standard Bedroom 1 through 5) as its own sub-row within that single expanded card — the individual-instance detail still exists and is still reachable, it just isn't five separate top-level cards competing for grid space before anyone has asked for that level of detail. This alone takes a 12-card grid down to roughly 8 for a typical apartment, and is a more honest representation besides: five badges all reading "Mixed" conveyed nothing that one "Mixed" badge on a grouped card doesn't already say.

**Rule 2 — Suppress the badge on cards that match the property's overall default state; only badge exceptions.**
Compute the property's dominant/default finish tier (whichever tier the Global Finishing State was set to at creation, per Section 5 — e.g. if the admin picked ✨ Fully Finished for the whole property). Any zone card whose computed badge matches that dominant tier **does not render a badge at all** — the absence of a badge communicates "this room matches what you'd expect for this property," which is the correct default assumption for a buyer. Only render a visible badge on cards that **differ** from the dominant tier — a zone that's Semi-Finished inside an otherwise Fully-Finished property, or a zone the admin marked Mixed because they genuinely edited some trades and not others. This is the single highest-leverage change here: in the screenshot that prompted this revision, every one of 12 cards said "Mixed," which is not a real signal a buyer can act on and is almost certainly a computation or seed-data issue in its own right (a genuinely Fully-Finished property should not be showing Mixed everywhere) — worth the agent double-checking rule 2's implementation actually surfaces real exceptions rather than revealing that every zone actually is inconsistently filled in, which would be a data problem, not a display problem, and should be reported back rather than silently hidden.

**Rule 3 — One visual anchor per card, not two competing chrome elements.**
Each card gets exactly one small identifying mark in its top area — either the zone-type icon (bed, bathtub, kitchen, etc.) at a subdued/muted weight, or the badge when Rule 2 says one should show — not both an icon box and a badge pill fighting for the same visual corner as in the flagged screenshot. The zone name itself, set in the site's existing Playfair Display heading style at a clearly larger weight than any chrome element, is what should carry primary visual weight on the card — the card should read "room name first, everything else secondary," not "icon, pill, and text all shouting at once."

**Supporting layout adjustments (secondary to the three rules above, but part of the same pass):**
- Reduce to 2–3 columns on desktop (not a tight 3-up grid edge-to-edge) with genuinely generous gutters and card padding — the goal is a grid that feels curated and breathable, not dense.
- Fix the sticky-header/page-title overlap as a plain layout bug, unrelated to the density work but should be corrected in the same pass since it's visible in the same screenshot.
- Do not achieve "decluttered" by shrinking padding, font size, or card size uniformly — that reduces the symptom's visibility without reducing the actual number of competing elements, and will read as cramped rather than clean. The fix is fewer, better-differentiated cards (rules 1–2), not smaller versions of the same 12 cards.



**Layer 2 — Zone Detail (inline expansion, not a modal).**
Clicking a Layer-1 card expands it **in place** (accordion-style, pushing surrounding cards down) rather than opening a lightbox that obscures the rest of the grid — a buyer comparing "how finished is the kitchen vs. the master bathroom" needs to be able to open both without losing their place. Expanded view shows:
- Every Trade in that zone as a row: trade name + its status, rendered as a small progress indicator (e.g. a 3-step dot/bar matching the trade's status enum position — "Plastered" showing as step 2 of 4) rather than a bare text label, so a buyer can see at a glance how far along a trade is even without reading the Arabic/English status word.
- Below the trade rows, the zone's filled-in Attributes as a simple label/value list (e.g. "Flooring Material: Porcelain," "Grade: First Choice," "Concealed Cistern: Yes") — only attributes the admin actually filled in are shown; empty attributes are omitted entirely rather than shown as "Not specified," keeping the section honest and uncluttered.
- Zone-specific photos, if the admin uploaded any, as a small inline gallery strip within the expanded card — connecting the visual proof directly to the data it's illustrating, rather than a disconnected lightbox photo.
- A **zone-specific WhatsApp inquiry button** ("Ask about the Kitchen finish") pre-filled with the zone name, giving a genuinely interested buyer a low-friction way to ask a specific follow-up — this is a real improvement over the old lightbox's generic "Inquire about X" button, because it routes the actual question (finish detail on this exact zone) straight into the conversation Zakaria will have anyway.
- **For a Rule-1 grouped card** (e.g. "Standard Bedrooms (5)"), the expansion shows each instance (Bedroom 1–5) as its own labeled sub-section within the single expanded card, each with its own trade rows/attributes/WhatsApp button as above — the group collapses at Layer 1 for scannability, but nothing is lost once a buyer actually opens it.

**Layer 3 — Full Breakdown (optional, for buyers who want everything at once).**
A single "View complete finishing specification" link/button at the bottom of the Zone Overview Grid, for the minority of buyers (or Zakaria's own use, e.g. printing/sharing a spec sheet) who want the entire tree in one continuous read rather than clicking through cards individually. This renders every Zone → Trade → Attribute in a plain, dense, printable list format — grouped by Floor for villas — and should genuinely be usable as a reference document, not just a dumping ground. This is the same content as Layer 2 exposed all at once; it does not need new data, just a different render mode.

**Placement and default state:** the whole three-layer block sits on the property detail page (Section 2.3 of the site plan) after Amenities and before Location, same placement as before. Layer 1 is always visible with no interaction required — this is the actual fix for "not intuitive": the previous version required a click before showing anything at all, and the replacement shows real information immediately, with depth available on demand rather than gated behind it.

**Do not expose:** internal-only fields the admin marks private via the `admin_only` boolean from the data model (Section 6) — this still applies unchanged; the default without it is "everything filled in is public."

---

## 7.3 Summary of the two corrections in this document, for quick agent reference

If picking this document up mid-project rather than reading start to end: Section 7.2 corrected a version that displayed no real data at all (fake lightbox content). Section 7.2.1 corrects a *later* version that displayed correct data but was visually cluttered (12 same-weight cards, badges with no signal value, competing chrome). These are two separate, sequential fixes to two separate problems — verify which one applies before making changes; if the data is already correct and per-zone, only 7.2.1's three rules need implementing, and the data-fetching logic from 7.2 should not be touched.

---

## 8. What NOT to build (keep this system from scope-creeping into something unmanageable)

- **No admin-defined custom zones or trades.** The tree is fixed by the system templates. If Zakaria needs a zone type that doesn't exist (e.g. a home office), that's a template addition the agent makes to seed data, not a feature for the admin to self-serve — keeping the tree closed is what keeps the data structured enough to be useful later (filtering, comparison), and an open-ended custom-field system is a much bigger build for marginal benefit here.
- **No furniture, appliances, or loose decor fields anywhere in this system** — per your explicit constraint, this covers only fixed construction and finishes. If Zakaria wants to note "kitchen comes with built-in appliances" that's a plain-text mention in the general property description, not a layering-system field.
- **No per-trade cost/budget tracking.** This system describes finish *state*, not construction *cost* — a cost-estimation module is a different (and much bigger) tool; do not add cost fields to attributes even though a real contractor's system might.
- **No versioning/history of finishing-state changes over time.** Track current state only; a full audit trail of "this property was Red Brick in March, Semi-Finished in June" is out of scope.
- **No separate zone trees for Duplex/Triplex/Penthouse/Twin House/Townhouse.** Per Section 3.1, these are sub-type modifiers on the two base trees (Apartment, Villa), not new trees — building six-plus near-duplicate trees is exactly the kind of complexity this plan is designed to avoid.

---

## 9. Build phases (append to the site plan's phases — this slots in around Phase 4)

### Phase 4a — Template seed data
- Implement the `property_type_templates`, `zone_templates`, `trade_templates`, `attribute_templates` tables per Section 6.
- Seed all five Property Types and their full zone/trade/attribute trees per Sections 3–4. This is a large, mechanical data-entry task — the agent should generate it directly from this document's tables rather than reinterpreting them.
- Write a small internal seed-verification script/page (dev-only) that renders the full tree for each Property Type as a nested list, so the coverage can be visually sanity-checked against Sections 3–4 before building UI on top of it.
- **Definition of done:** all five trees exist in the database exactly matching Sections 3–4's coverage, including repeatable/optional zone flags and the villa floor-nesting via `parent_zone_id`.

### Phase 4b — Global Finishing State + zone review UI
- Build the Property Type + sub-type + level-count step (7.1 steps 1–2).
- Build the Global Finishing State picker and its auto-populate logic (Section 5) — this is the highest-value piece of this entire subsystem and deserves the most testing: verify every trade in every zone actually gets set correctly for all three states, across all five Property Types.
- Build the zone review accordion (7.1 step 4), including the villa floor-grouping (7.1 step 5) and the repeatable-zone instance add/remove control.
- **Definition of done:** adding a new Villa, picking "Semi-Finished," and publishing without touching a single zone manually takes under two minutes and produces a fully-populated, correct finishing tree in the database.

### Phase 4c — Public finishing-details display (revised — see Section 7.2 for full diagnosis and spec)
- Build Layer 1 (the always-visible Zone Overview Grid with computed finish-level badges, floor-grouped for villas), Layer 2 (inline accordion zone expansion with trade progress indicators, filled-attributes-only list, zone photos, and the zone-specific WhatsApp CTA), and Layer 3 (the full printable breakdown) exactly per Section 7.2.
- Specifically verify the finish-level badge computation handles the "Mixed" case correctly — this is the one piece of display logic (not just a template render) in this phase, and it's easy to get subtly wrong (e.g. picking the first trade's status instead of actually checking for consistency across all trades in the zone).
- Confirm Layer 2's inline expansion does not collapse sibling cards or lose scroll position — the whole point of choosing accordion-in-place over a modal is that a buyer can have two zones open at once to compare them; a naive accordion implementation that only allows one open card at a time silently reintroduces the old lightbox's comparison problem.
- Verify Arabic/RTL rendering of every zone/trade/attribute label and of the trade-status progress indicators specifically (a left-to-right progress bar needs to visually mirror in RTL, not just have its text flipped) — this section has more text-heavy bilingual content than most of the site, so it's a likely place for RTL layout bugs to hide.
- **Definition of done:** a buyer lands on the finishing section and sees real per-zone finish data with zero clicks (Layer 1); can open two or more zones side by side to compare finish level without losing either (Layer 2); and can access a complete, readable spec-sheet view for the whole property in one place (Layer 3) — all rendering correctly in both locales.

### Phase 4d — Layer 1 decluttering pass (corrects a shipped build — see Section 7.2.1)
- Implement Rule 1 (collapse repeatable-zone instances into one grouped card with an aggregate badge, expandable to per-instance sub-rows at Layer 2), Rule 2 (suppress badges on cards matching the property's dominant finish tier; only badge genuine exceptions), and Rule 3 (one visual anchor per card — icon or badge, never both) exactly per 7.2.1.
- Before styling anything, verify Rule 2's badge computation actually surfaces real exceptions on a property known to be uniformly finished — if a Fully-Finished property still shows "Mixed" on every card after this fix, that is a data/seed problem (likely in how Global Finishing State populated trade statuses, or a broken join in the badge computation), not a display problem, and must be reported rather than papered over with a suppressed badge.
- Fix the sticky-header/page-title overlap bug in the same pass.
- Reduce grid density to 2–3 columns with genuinely generous spacing — verify by checking actual computed card count on a typical apartment (should drop from ~12 to ~7-8 after Rule 1 alone) and confirm the fix was not achieved by uniformly shrinking padding/font size.
- **Definition of done:** a typical apartment's Layer 1 grid shows roughly 7–9 visually distinct cards (not 12 near-identical ones), badges appear only where a zone genuinely differs from the property's overall finish level, each card has exactly one chrome element plus its name, and the header overlap bug is gone.

---

## 10. Open items to confirm while building

- Whether Zakaria wants the `admin_only` private-notes option from Section 7.2, or whether "everything filled in is public" is fine as the simpler default.
- Confirm the repeatable-zone default counts feel right in practice (e.g. does "Standard Bedroom × 2" as the default make sense, or should the admin always be prompted for bedroom count during the Basics step and have that count drive the default instead of a flat template default) — this is a small UX judgment call best validated once the flow is actually clickable.