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
5. For Villas specifically, group the zone-review list under floor headers (Ground Floor / First Floor / Basement / Roof) matching Section 3.3 — this mirrors how buyers actually think about a villa and keeps a 15+ zone list navigable.
6. **Publish**: same as before — the property can be saved as draft or published; publishing does not require every zone to be filled, only the Basics step fields are mandatory (finishing detail is enrichment, not a blocker).

### 7.2 Public-facing display

On the property detail page (Section 2.3 of the site plan), add a new collapsible **"Finishing Details" section**, positioned after Amenities and before Location. Default view: a compact per-zone summary grid (zone name + a 2–3 word finish-level badge, e.g. "Kitchen — Fully Finished," "Master Bathroom — Semi-Finished") — this gives buyers the headline picture at a glance without showing raw internal trade jargon like status enum names. An optional "View full finishing breakdown" expander reveals the full zone → trade → attribute tree for buyers who genuinely want that depth (a meaningful trust signal for a direct-from-owner developer, per the site plan's "no middleman" positioning) — but it must not be forced on every visitor by default, since most buyers just want the headline.

**Do not expose:** internal-only fields like brand names sourced from admin notes if the admin marks them private (add a simple `admin_only` boolean at the attribute-value level so Zakaria can log detail for his own records — e.g. a specific contractor's brand preference — without it necessarily being public-facing marketing copy, if he wants that control). This is optional scope — only build it if the admin dashboard work in Phase 4 of the site plan has room; the default without it is "everything filled in is public," which is also fine.

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

### Phase 4c — Public finishing-details display
- Build the collapsible Finishing Details section on the property detail page per Section 7.2, both the compact summary grid and the full expandable breakdown.
- Verify Arabic/RTL rendering of every zone/trade/attribute label — this section has more text-heavy bilingual content than most of the site, so it's a likely place for RTL layout bugs to hide.
- **Definition of done:** a published property's finishing detail renders correctly and legibly in both locales, the compact summary never overwhelms the page by default, and the full breakdown is genuinely readable (not a raw dump of internal field names) when expanded.

---

## 10. Open items to confirm while building

- Whether Zakaria wants the `admin_only` private-notes option from Section 7.2, or whether "everything filled in is public" is fine as the simpler default.
- Confirm the repeatable-zone default counts feel right in practice (e.g. does "Standard Bedroom × 2" as the default make sense, or should the admin always be prompted for bedroom count during the Basics step and have that count drive the default instead of a flat template default) — this is a small UX judgment call best validated once the flow is actually clickable.