# Feature Specification: Egyptian Real Estate Construction Layering & Finishing System

## 1. Overview & Objective

Implement a property construction layering and finishing specification system tailored for the Egyptian real estate market. The system manages 3 property types (**Apartments**, **Buildings**, and **Garages**) across 3 standard Egyptian finishing levels (**Red Brick**, **Semi-Finished**, and **Fully Finished**), covering the underlying data model, administrative builder tools, and customer-facing interactive components.

---

## 2. Supported Property Types & Structure

### A. Apartment (`apartment`)
- **Subtypes**:
  - `standard`: Single-floor apartment.
  - `ground`: Ground-floor unit with private entrance/garden.
  - `duplex`: Two-story apartment with an internal staircase.
  - `roof`: Penthouse flat featuring a private open-air roof terrace.
- **Structural Rules**:
  - Single-level apartments contain a flat list of zones.
  - Duplexes group zones into 2 discrete floor levels (Level 1: Lower Floor and Level 2: Upper Floor), each with its own independent finishing status and zone layout.
- **Standard Default Zones**:
  - Living / Reception (الصالة والاستقبال)
  - Master Bedroom (غرفة النوم الرئيسية)
  - Master Bathroom (الحمام الملحق)
  - Standard Bedrooms (غرف نوم إضافية — count driven by the bedroom input)
  - Main Family Bathroom (الحمام الرئيسي)
  - Kitchen (المطبخ)
  - Balcony / Terrace (البلكونة / التراس)
  - Internal Corridor (الردهة الداخلية والموزع)
  - *Optional additions*: Guest Toilet (حمام ضيوف), Laundry / Storage Room (غرفة غسيل ومخزن), Dressing Room (غرفة ملابس).

### B. Building (`building`)
- **Subtypes**:
  - `residential`: Residential apartment building.
  - `mixed`: Mixed-use building with ground commercial units and upper residential floors.
- **Structural Rules**:
  - Contains **Shared Building Infrastructure** plus **Floor Units**.
  - Shared infrastructure zones:
    - Basement / Underground Parking (البدروم وجراج السيارات)
    - Ground Floor & Main Entrance (الدور الأرضي ومدخل العمارة)
    - Typical Floors & Stairwell (الأدوار المتكررة وبئر السلم والمصعد)
    - Roof Terrace & Water Tank Area (السطح وخزانات المياه)
  - Multi-Unit Floor Templating:
    - Define floor templates once for repeated typical floors.
    - Each typical floor can host multiple independent units side by side (e.g., Unit A: 3-Bedroom, Unit B: 2-Bedroom).
    - Individual units can have specific finishing level overrides (e.g., Unit 2A is Semi-Finished while Unit 2B is Fully Finished).

### C. Garage (`garage`)
- **Structure**: Standalone commercial parking or dedicated basement parking property.
- **Standard Default Zones**:
  - Vehicle Ramp & Automatic Gate (الرامب والبوابة)
  - Parking Bays with Floor Coating (باكيات الاصطفاف)
  - Electrical Box, Industrial Lighting & Emergency (لوحة الكهرباء والإنارة)
  - *Optional additions*: Security Booth (كابينة حراسة وأمن), Storage Room (مخزن ملحق).

---

## 3. Egyptian Finishing Levels & Automation

Selecting an overall finishing tier automatically configures the status of all trade items across every zone:

### 1. Red Brick / طوب أحمر
- Bare structural red brick walls and concrete slab.
- Trades default to:
  - Plumbing: Not Started
  - Electrical: Not Started
  - Walls: Red Brick
  - Flooring: Sand Bed
  - Carpentry: None
  - HVAC: Not Started

### 2. Semi-Finished / نص تشطيب (محارة وحلوق)
- Rough-in infrastructure installed, ready for cosmetic finishes.
- Trades default to:
  - Plumbing: Rough-In (تمديدات مواسير التغذية والصرف)
  - Electrical: Conduits Only (خراطيم وبواطات الحوائط)
  - Walls: Plastered (محارة أسمنتية)
  - Flooring: Sand Bed (فرش رملة)
  - Carpentry: Sub-Frames (حلوق خشب للشبابيك والأبواب)
  - HVAC: Copper Prep (تمديدات مواسير النحاس والصرف)

### 3. Fully Finished / تشطيب كامل (سوبر لوكس)
- Turnkey state ready for occupancy.
- Trades default to:
  - Plumbing: Finished (أطقم صحية وخلاطات كاملة)
  - Electrical: Finished (أسلاك، مفاتيح، لوحات قواطع)
  - Walls: Final Paint (معجون ودهان نهائي)
  - Flooring: Finished (سيراميك / بورسلين / HDF / رخام)
  - Carpentry: Installed (أبواب داخلية مصفحة/خشب وشبابيك ألوميتال)
  - HVAC: Installed (أجهزة تكييف راكبة)

---

## 4. Technical Data Schema

```typescript
export type PropertyTypeId = 'apartment' | 'building' | 'garage';
export type GlobalFinishingState = 'red_brick' | 'semi_finished' | 'fully_finished';

export interface AttributeValue {
  attribute_template_id: string;
  value: boolean | string | number | null;
}

export interface TradeInstance {
  id: string;
  trade_template_id: string;
  status: string;
  attributes: AttributeValue[];
}

export interface ZoneSpatialLayout {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  length_m: number;
  width_m: number;
  sqm: number;
  ceiling_height: string;
}

export interface ZoneInstance {
  id: string;
  zone_template_id: string;
  instance_label?: string;
  level_label?: string;
  sort_order: number;
  trades: TradeInstance[];
  children?: ZoneInstance[];
  images?: string[];
  spatial?: ZoneSpatialLayout;
}
```

---

## 5. User Workflows

### Admin Creation Workflow
1. **Property Basics (Step 1)**: User selects property type (`apartment`, `building`, or `garage`). System automatically generates the matching default zone hierarchy and trade structure.
2. **Floor Plans & CAD Metrology (Step 3)**: Interactive visual layout showing room boundaries. Users can click any room to adjust dimensions (length, width, ceiling height) or add property-specific rooms (e.g. Ramp for garages, Bedrooms for apartments). Added rooms automatically receive their standard trade definitions.
3. **Layered Engineering Specs (Step 4)**: Global Finishing State selector immediately updates trade statuses. Users can fine-tune specific items (e.g. changing wire brand to Elsewedy, wall tile height to Full Height, or uploading photos per room).
4. **Summary & Verification (Step 5)**: Complete multi-layer summary displaying physical dimensions and finishing specifications prior to publishing.

### Customer-Facing View
- **Interactive Layer Switcher**: View specifications organized either by Engineering System (Electrical, Plumbing, HVAC, Finishes) or by Room/Zone.
- **Bilingual Status Indicators**: Displays clear labels in Arabic and English with associated visual icons (🧱 Red Brick, 🏗️ Semi-Finished, ✨ Fully Finished).
- **Physical Room Details**: Shows real-world dimensions (Length × Width, Ceiling Height, and calculated Area in SQM).
- **Zone Galleries**: Inline photo carousel for room progress images.
