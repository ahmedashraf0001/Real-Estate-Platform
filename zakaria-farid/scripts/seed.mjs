/**
 * seed.mjs — Comprehensive Database Reset & Re-seed
 * Run: node scripts/seed.mjs
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Could not load .env.local — checking existing environment variables.');
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── CAD / ZoneInstance Builders ─────────────────────────────────────────────
let _uid = 100;
function uid(prefix = 'z') {
  return `${prefix}-${Date.now().toString(36)}-${(_uid++).toString(36)}`;
}

function trade(id, status) {
  return { id: uid('tr'), trade_template_id: id, status, attributes: [] };
}

function zone(templateId, label, sortOrder, trades, children, spatial, levelLabel) {
  const z = {
    id: uid('zn'),
    zone_template_id: templateId,
    sort_order: sortOrder,
    trades: trades || [],
    instance_label: label,
  };
  if (levelLabel) z.level_label = levelLabel;
  if (children) z.children = children;
  if (spatial) z.spatial = spatial;
  return z;
}

// 1. Standard / Ground Apartment Zones
function buildApartmentZones(state = 'fully_finished', bedrooms = 3, subtype = 'standard') {
  const isFinished = state === 'fully_finished';
  const wetWall = isFinished ? 'Finished' : (state === 'semi_finished' ? 'Plastered' : 'RedBrick');
  const wetPlumb = isFinished ? 'Finished' : (state === 'semi_finished' ? 'RoughIn' : 'NotStarted');
  const livWall = isFinished ? 'FinalPaint' : (state === 'semi_finished' ? 'Plastered' : 'RedBrick');
  const livElec = isFinished ? 'Finished' : (state === 'semi_finished' ? 'ConduitsOnly' : 'NotStarted');
  const floorStat = isFinished ? 'Finished' : 'SandBed';

  const reception = zone(
    'apt.reception',
    'Reception & Living Salon',
    1,
    [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
      trade('liv.carpentry', isFinished ? 'Installed' : 'SubFrames'),
      trade('liv.hvac', isFinished ? 'Installed' : 'CopperPrep'),
    ],
    null,
    { gridX: 0, gridY: 0, gridW: 7, gridH: 5, length_m: 8.5, width_m: 5.5, sqm: 46.75, ceiling_height: '3.1m' }
  );

  const masterBed = zone(
    'apt.master_bed',
    'Master Bedroom Suite',
    2,
    [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
      trade('liv.carpentry', isFinished ? 'Installed' : 'SubFrames'),
    ],
    null,
    { gridX: 7, gridY: 0, gridW: 5, gridH: 5, length_m: 5.5, width_m: 4.8, sqm: 26.4, ceiling_height: '3.1m' }
  );

  const masterBath = zone(
    'apt.master_bath',
    'Master En-Suite Bathroom',
    3,
    [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ],
    null,
    { gridX: 7, gridY: 5, gridW: 5, gridH: 3, length_m: 3.2, width_m: 2.6, sqm: 8.32, ceiling_height: '3.0m' }
  );

  const bedInstances = [];
  for (let i = 0; i < Math.max(1, bedrooms - 1); i++) {
    bedInstances.push(
      zone(
        'apt.std_bed',
        `Bedroom ${i + 2}`,
        4 + i,
        [
          trade('liv.electrical', livElec),
          trade('liv.walls', livWall),
          trade('liv.flooring', floorStat),
        ],
        null,
        { gridX: i * 4, gridY: 8, gridW: 4, gridH: 4, length_m: 4.2, width_m: 3.8, sqm: 15.96, ceiling_height: '3.0m' }
      )
    );
  }

  const mainBath = zone(
    'apt.main_bath',
    'Main Family Bathroom',
    6,
    [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ],
    null,
    { gridX: 8, gridY: 8, gridW: 4, gridH: 4, length_m: 3.0, width_m: 2.5, sqm: 7.5, ceiling_height: '3.0m' }
  );

  const kitchen = zone(
    'apt.kitchen',
    'Kitchen',
    7,
    [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ],
    null,
    { gridX: 0, gridY: 5, gridW: 5, gridH: 3, length_m: 4.5, width_m: 3.2, sqm: 14.4, ceiling_height: '3.0m' }
  );

  const balcony = zone(
    'apt.balcony',
    subtype === 'ground' ? 'Private Garden & Terrace' : 'Front Balcony',
    8,
    [
      trade('trn.electrical', livElec),
      trade('trn.walls', livWall),
      trade('trn.flooring', floorStat),
    ],
    null,
    { gridX: 5, gridY: 5, gridW: 2, gridH: 3, length_m: subtype === 'ground' ? 12.0 : 4.0, width_m: subtype === 'ground' ? 6.0 : 1.8, sqm: subtype === 'ground' ? 72 : 7.2, ceiling_height: '3.0m' }
  );

  const corridor = zone(
    'apt.corridor',
    'Internal Hallway',
    9,
    [
      trade('trn.electrical', livElec),
      trade('trn.walls', livWall),
      trade('trn.flooring', floorStat),
    ],
    null,
    { gridX: 0, gridY: 7, gridW: 12, gridH: 1, length_m: 10.0, width_m: 1.5, sqm: 15.0, ceiling_height: '3.0m' }
  );

  return [reception, masterBed, masterBath, ...bedInstances, mainBath, kitchen, balcony, corridor];
}

// 2. Duplex Apartment Zones (2 levels)
function buildDuplexZones(state = 'fully_finished', bedrooms = 4) {
  const isFinished = state === 'fully_finished';
  const livWall = isFinished ? 'FinalPaint' : 'Plastered';
  const livElec = isFinished ? 'Finished' : 'ConduitsOnly';
  const wetPlumb = isFinished ? 'Finished' : 'RoughIn';
  const wetWall = isFinished ? 'Finished' : 'Plastered';
  const floorStat = isFinished ? 'Finished' : 'SandBed';

  const lowerChildren = [
    zone('apt.reception', 'Grand Double-Height Reception', 1, [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
      trade('liv.hvac', isFinished ? 'Installed' : 'CopperPrep'),
    ], null, { gridX: 0, gridY: 0, gridW: 8, gridH: 6, length_m: 11.5, width_m: 7.2, sqm: 82.8, ceiling_height: '5.8m Double-Height' }, 'Lower Level'),
    zone('apt.kitchen', 'Chef Kitchen & Dining Annex', 2, [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ], null, { gridX: 8, gridY: 0, gridW: 4, gridH: 4, length_m: 5.2, width_m: 4.0, sqm: 20.8, ceiling_height: '3.1m' }, 'Lower Level'),
    zone('apt.guest_bath', 'Guest Powder Room', 3, [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ], null, { gridX: 8, gridY: 4, gridW: 4, gridH: 2, length_m: 2.8, width_m: 2.2, sqm: 6.16, ceiling_height: '3.1m' }, 'Lower Level'),
    zone('apt.balcony', 'Lower Terrace', 4, [
      trade('trn.electrical', livElec),
      trade('trn.walls', livWall),
      trade('trn.flooring', floorStat),
    ], null, { gridX: 0, gridY: 6, gridW: 12, gridH: 2, length_m: 12.0, width_m: 2.5, sqm: 30.0, ceiling_height: '3.0m' }, 'Lower Level'),
  ];

  const upperChildren = [
    zone('apt.master_bed', 'Master Duplex Suite', 1, [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
      trade('liv.carpentry', isFinished ? 'Installed' : 'SubFrames'),
    ], null, { gridX: 0, gridY: 0, gridW: 6, gridH: 6, length_m: 6.8, width_m: 5.5, sqm: 37.4, ceiling_height: '3.2m' }, 'Upper Level'),
    zone('apt.master_bath', 'Master Spa Bathroom', 2, [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ], null, { gridX: 6, gridY: 0, gridW: 6, gridH: 4, length_m: 4.0, width_m: 3.2, sqm: 12.8, ceiling_height: '3.0m' }, 'Upper Level'),
    zone('apt.std_bed', 'Bedroom 2', 3, [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
    ], null, { gridX: 0, gridY: 6, gridW: 4, gridH: 6, length_m: 4.8, width_m: 4.0, sqm: 19.2, ceiling_height: '3.0m' }, 'Upper Level'),
    zone('apt.std_bed', 'Bedroom 3', 4, [
      trade('liv.electrical', livElec),
      trade('liv.walls', livWall),
      trade('liv.flooring', floorStat),
    ], null, { gridX: 4, gridY: 6, gridW: 4, gridH: 6, length_m: 4.8, width_m: 4.0, sqm: 19.2, ceiling_height: '3.0m' }, 'Upper Level'),
    zone('apt.main_bath', 'Upper Family Bathroom', 5, [
      trade('wet.plumbing', wetPlumb),
      trade('wet.electrical', livElec),
      trade('wet.walls', wetWall),
      trade('wet.flooring', floorStat),
    ], null, { gridX: 8, gridY: 6, gridW: 4, gridH: 6, length_m: 3.5, width_m: 2.8, sqm: 9.8, ceiling_height: '3.0m' }, 'Upper Level'),
  ];

  const lowerContainer = {
    id: uid('zn'),
    zone_template_id: 'apt.level',
    instance_label: 'Lower Floor',
    level_label: 'Lower Floor',
    sort_order: 1,
    trades: [],
    children: lowerChildren,
  };

  const upperContainer = {
    id: uid('zn'),
    zone_template_id: 'apt.level',
    instance_label: 'Upper Floor',
    level_label: 'Upper Floor',
    sort_order: 2,
    trades: [],
    children: upperChildren,
  };

  return [lowerContainer, upperContainer];
}

// 3. Full Building Tree (Ground + Typical Floors + Units + Roof)
function buildBuildingZones(totalFloors = 4, unitsPerFloor = 2, state = 'fully_finished') {
  const result = [];
  let sortIdx = 1;

  // Ground Floor Core
  const groundComponents = [
    { tid: 'bld.entrance_gate', label: 'Main Entrance Gate & Steel Fence' },
    { tid: 'bld.entrance_lobby', label: 'Imported Marble Entrance & Grand Lobby' },
    { tid: 'bld.staircase', label: 'Main Granite Staircase' },
    { tid: 'bld.elevator', label: 'Italian High-Speed Elevator (6 Persons)' },
    { tid: 'bld.electric_box', label: 'Central Electrical Meters Cabinet' },
    { tid: 'bld.water_motors', label: 'Italian Water Pumps & Central Filters Room' },
    { tid: 'bld.garage_bays', label: 'Ground Covered Garage Bays' },
    { tid: 'bld.guard_room', label: 'Security & Guard Booth with Private WC' },
  ];

  for (const item of groundComponents) {
    result.push(
      zone(
        item.tid,
        item.label,
        sortIdx++,
        [
          trade('inf.lobby', 'Finished'),
          trade('inf.elevator', 'Installed'),
          trade('inf.security', 'Installed'),
          trade('inf.water_systems', 'Installed'),
        ],
        null,
        undefined,
        'Ground Floor'
      )
    );
  }

  // Typical Floors & Units
  const letters = ['A', 'B', 'C', 'D'];
  for (let f = 1; f <= totalFloors; f++) {
    const levelLabel = `Floor ${f}`;

    result.push(
      zone('bld.central_corridor', `${levelLabel} Marble Corridor`, sortIdx++, [
        trade('inf.common_finish', 'Finished'),
      ], null, undefined, levelLabel)
    );

    for (let u = 0; u < unitsPerFloor; u++) {
      const code = `${f}${letters[u]}`;
      const unitZones = buildApartmentZones(state, 3, 'standard');
      result.push({
        id: uid('zn'),
        zone_template_id: 'bld.unit',
        instance_label: `Flat ${code} (210 m²)`,
        level_label: levelLabel,
        sort_order: sortIdx++,
        trades: [],
        children: unitZones,
      });
    }
  }

  // Roof
  const roofComponents = [
    { tid: 'bld.staircase', label: 'Roof Staircase Penthouse Access' },
    { tid: 'bld.roof_service', label: 'Elevator Machine Room & Water Tanks' },
    { tid: 'bld.roof_terrace', label: 'Panoramic Sky Terrace & Wooden Pergola' },
  ];

  for (const item of roofComponents) {
    result.push(
      zone(
        item.tid,
        item.label,
        sortIdx++,
        [
          trade('inf.insulation', 'Finished'),
          trade('inf.common_finish', 'Finished'),
        ],
        null,
        undefined,
        'Roof Sky Floor'
      )
    );
  }

  return result;
}

// 4. Standalone Garage Unit
function buildGarageZones() {
  return [
    zone('grg.garage', 'Covered Commercial Garage Area', 1, [
      trade('grg.bay_finish', 'Finished'),
      trade('grg.ramp_construction', 'Finished'),
    ], null, { gridX: 0, gridY: 0, gridW: 12, gridH: 8, length_m: 24.0, width_m: 14.0, sqm: 336, ceiling_height: '4.2m Commercial Clearance' }),
    zone('grg.ramp', 'Heavy-Duty Reinforced Concrete Ramp & Electric Shutter', 2, [
      trade('grg.ramp_construction', 'Finished'),
    ]),
    zone('grg.bay', '10 Numbered Vehicle Parking Bays with EV Sockets', 3, [
      trade('grg.bay_finish', 'Finished'),
    ]),
    zone('grg.security_booth', 'Automated Access Control & Security Booth', 4, [
      trade('inf.security', 'Installed'),
    ]),
    zone('grg.storage', 'Private Equipment & Spare Parts Storage Room', 5, [
      trade('liv.walls', 'Finished'),
    ]),
  ];
}

// ─── PROPERTIES DATASET ───────────────────────────────────────────────────────
const PROPERTIES = [
  // ── 1. Luxury Apartment (New Cairo) ─────────────────────────────────────────
  {
    id: 'sodic-east-luxury-residence',
    slug: 'sodic-east-luxury-residence',
    title_en: 'Sodic East Prime Residence',
    title_ar: 'شقة فاخرة بمشروع سوديك إيست – التجمع الخامس',
    description_en: 'A masterfully finished 220 sqm 3-bedroom apartment located in the prime sector of New Cairo. Featuring imported Spanish porcelain flooring, concealed inverter HVAC, and direct open views across manicured landscaped parks.',
    description_ar: 'شقة سكنية فائقة الفخامة بمساحة ٢٢٠ متر مربع، ٣ غرف نوم رئيسية وتشطيب ألترا سوبر لوكس بأرقى مناطق التجمع الخامس. أرضيات بورسلين إسباني، تكييفات كونسيلد، وإطلالة مباشرة مفتوحة على الحدائق والبحيرات.',
    price_egp: 18500000,
    location: 'Sodic East, Fifth Settlement, New Cairo',
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 220,
    type: 'apartment',
    listing_status: 'active',
    is_featured: true,
    completion_status: 'ready',
    latitude: 30.0131,
    longitude: 31.4913,
    view: 'Landscaped Central Park & Water Feature',
    floor_number: 3,
    spec_layers: buildApartmentZones('fully_finished', 3, 'standard'),
  },

  // ── 2. Ground Apartment with Private Garden (Sheikh Zayed) ──────────────────
  {
    id: 'zayed-garden-suite-apartment',
    slug: 'zayed-garden-suite-apartment',
    title_en: 'Zayed Central Park Garden Residence',
    title_ar: 'شقة أرضي بحديقة خاصة – الشيخ زايد',
    description_en: 'An exclusive 260 sqm ground floor residence featuring a 140 sqm private walled garden with an outdoor pergola and barbecue station. Situated within the prime Zayed Central district with private entrance access.',
    description_ar: 'شقة أرضي راقية بمساحة ٢٦٠ متر مربع ملحق بها حديقة خاصة مسورة بمساحة ١٤٠ متر مع برجولا خشبية وجلسة خارجية. تقع في قلب الشيخ زايد بمدخل خاص واستقلالية تامة.',
    price_egp: 22000000,
    location: 'Zayed Central Park Enclave, Sheikh Zayed',
    bedrooms: 3,
    bathrooms: 4,
    area_sqm: 260,
    type: 'apartment',
    listing_status: 'active',
    is_featured: true,
    completion_status: 'ready',
    latitude: 30.0489,
    longitude: 30.9856,
    view: 'Private 140 sqm Walled Garden',
    floor_number: 0,
    spec_layers: buildApartmentZones('fully_finished', 3, 'ground'),
  },

  // ── 3. Sky Duplex Apartment (New Cairo) ──────────────────────────────────────
  {
    id: 'aurum-sky-duplex-cairo',
    slug: 'aurum-sky-duplex-cairo',
    title_en: 'Aurum Tower Sky Duplex',
    title_ar: 'شقة دوبلكس سماوية ببرج أوروم – التجمع الخامس',
    description_en: 'A soaring 380 sqm 4-bedroom duplex occupying the 12th and 13th floors of Aurum Tower. Boasting a double-height 5.8m reception salon, panoramic curtain wall glazing, and dual master suites.',
    description_ar: 'شقة دوبلكس فاخرة بارتفاع طابقين (الدور ١٢ و١٣) بمساحة ٣٨٠ متر مربع و٤ غرف نوم. صالة استقبال مزدوجة الارتفاع بارتفاع ٥.٨ متر مع واجهات زجاجية بانورامية كاملة وجناحين نوم رئيسيين.',
    price_egp: 32000000,
    location: 'Aurum Tower, Fifth Settlement, New Cairo',
    bedrooms: 4,
    bathrooms: 5,
    area_sqm: 380,
    type: 'apartment',
    listing_status: 'active',
    is_featured: true,
    completion_status: 'ready',
    latitude: 30.0050,
    longitude: 31.5200,
    view: 'Panoramic Cityline & Sunset Alignment',
    floor_number: 12,
    spec_layers: buildDuplexZones('fully_finished', 4),
  },

  // ── 4. Full Residential Building (New Cairo) ────────────────────────────────
  {
    id: 'new-cairo-prime-building-estate',
    slug: 'new-cairo-prime-building-estate',
    title_en: 'Al-Narges Prime Residential Building (عمارة كاملة)',
    title_ar: 'عمارة سكنية كاملة فاخرة – حي النرجس التجمع الخامس',
    description_en: 'A pristine full residential building consisting of Ground Floor (Marble Lobby, 4 Garage Bays, Guard Suite) + 4 Typical Floors containing 8 full-floor luxury apartments (210 sqm each) + Finished Panoramic Sky Terrace Roof. Total built-up area 1,920 sqm.',
    description_ar: 'عمارة سكنية متكاملة للبيع بالكامل في أرقى مناطق النرجس بالتجمع الخامس. تتكون من دور أرضي (مدخل وردهة رخام فاخرة، ٤ باكيات جراج، غرفة حارس ومواتير) + ٤ أدوار متكررة تضم ٨ شقق سكنية فاخرة (٢١٠ م للشقة) + روف سماء مجهز ببرجولا. إجمالي المساحة المبنية ١٩٢٠ متر.',
    price_egp: 85000000,
    location: 'Al-Narges Sector 2, New Cairo',
    bedrooms: 24,
    bathrooms: 26,
    area_sqm: 1920,
    type: 'building',
    listing_status: 'active',
    is_featured: true,
    completion_status: 'ready',
    latitude: 30.0215,
    longitude: 31.4670,
    view: 'Wide Corner Boulevard & Open Green Axis',
    floor_number: 5,
    spec_layers: buildBuildingZones(4, 2, 'fully_finished'),
  },

  // ── 5. Mixed-Use Building (Sheikh Zayed) ─────────────────────────────────────
  {
    id: 'zayed-commercial-mixed-building',
    slug: 'zayed-commercial-mixed-building',
    title_en: 'Zayed Horizon Mixed-Use Building (عمارة تجارية وسكنية)',
    title_ar: 'عمارة تجارية وسكنية متكاملة – الشيخ زايد',
    description_en: 'A standalone commercial & residential building on a premier axis in Sheikh Zayed. Ground floor features 2 high-ceiling retail showroom shops, followed by 3 typical floors of executive apartments and a private corporate roof garden.',
    description_ar: 'عمارة متكاملة تجارية وسكنية على محور رئيسي بالشيخ زايد. الدور الأرضي يضم محلين تجاريين بواجهات زجاجية وارتفاعات عالية، يليه ٣ أدوار متكررة تضم ٦ شقق إدارية وسكنية مجهزة مع روف بانورامي.',
    price_egp: 68000000,
    location: 'Al-Bostan Axis, Sheikh Zayed',
    bedrooms: 18,
    bathrooms: 20,
    area_sqm: 1450,
    type: 'building',
    listing_status: 'active',
    is_featured: true,
    completion_status: 'ready',
    latitude: 30.0610,
    longitude: 30.9710,
    view: 'Main Commercial Promenade Axis',
    floor_number: 4,
    spec_layers: buildBuildingZones(3, 2, 'fully_finished'),
  },

  // ── 6. Full Roof Package Apartment (Madinaty) ────────────────────────────────
  {
    id: 'madinaty-panoramic-roof-package',
    slug: 'madinaty-panoramic-roof-package',
    title_en: 'Madinaty Privado Roof Suite & Sky Slab',
    title_ar: 'شقة رووف كاملة مع السطح – مدينتي بريفادو',
    description_en: 'A top-floor residential suite in Privado Madinaty combining a 160 sqm 3-bedroom apartment with a 140 sqm private open rooftop slab terrace. Pre-equipped with electrical and water connections for a private jacuzzi and sky pergola.',
    description_ar: 'شقة سكنية بالطابق الأخير مع الروف الكامل في بريفادو مدينتي. مساحة الشقة ١٦٠ متر (٣ غرف نوم) بالإضافة إلى روف خاص ١٤٠ متر مجهز بتمديدات السباكة والكهرباء لتركيب جاكوزي وبرجولا مظللة.',
    price_egp: 16500000,
    location: 'Privado Gated Sector, Madinaty',
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 300,
    type: 'apartment',
    listing_status: 'active',
    is_featured: false,
    completion_status: 'ready',
    latitude: 30.1250,
    longitude: 31.6250,
    view: 'Privado Lakes & Central Garden',
    floor_number: 6,
    spec_layers: buildApartmentZones('fully_finished', 3, 'standard'),
  },

  // ── 7. Standalone Underground Commercial Garage (New Cairo) ─────────────────
  {
    id: 'new-cairo-commercial-garage-facility',
    slug: 'new-cairo-commercial-garage-facility',
    title_en: 'New Cairo Automated Parking Facility & Garage Bays',
    title_ar: 'جراج تجاري واستثماري خاص – التجمع الخامس',
    description_en: 'A private subterranean commercial garage facility providing 12 dedicated vehicle bays, reinforced access ramp with automatic biometric roller shutter, epoxy flooring, industrial drainage, and 24/7 security booth.',
    description_ar: 'جراج تجاري استثماري خاص متكامل بالتجمع الخامس بمساحة ٣٥٠ متر مربع. يضم ١٢ باكية سيارات مرقمة، رامب خرساني مجهز ببوابة إلكترونية، أرضيات إيبوكسي مقاومة، شبكة صرف صناعي وغرفة أمن وحراسة.',
    price_egp: 14000000,
    location: 'North 90th Commercial District, New Cairo',
    bedrooms: 0,
    bathrooms: 1,
    area_sqm: 350,
    type: 'garage',
    listing_status: 'active',
    is_featured: false,
    completion_status: 'ready',
    latitude: 30.0280,
    longitude: 31.4850,
    view: 'North 90th Subterranean Access',
    floor_number: -1,
    spec_layers: buildGarageZones(),
  },

  // ── 8. Coastal Apartment (Ain Sokhna) ────────────────────────────────────────
  {
    id: 'sokhna-galala-cliff-apartment',
    slug: 'sokhna-galala-cliff-apartment',
    title_en: 'Monte Galala Cliffside Apartment',
    title_ar: 'شقة ساحلية بإطلالة جبلية وبحرية – العين السخنة',
    description_en: 'A contemporary 190 sqm 3-bedroom coastal apartment nestled along the heights of Mount Galala, Ain Sokhna. Features an expansive open terrace overlooking the Gulf of Suez and crystal lagoon access.',
    description_ar: 'شقة مصيفية فاخرة بمساحة ١٩٠ متر مربع في المونت جلالة بالعين السخنة. ٣ غرف نوم، تشطيب كامل بالتكييفات والمطبخ، وتراس واسع مفتوح على مياه خليج السويس واللاجون الجبلي.',
    price_egp: 13500000,
    location: 'Monte Galala Peak, Ain Sokhna',
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 190,
    type: 'apartment',
    listing_status: 'active',
    is_featured: false,
    completion_status: 'ready',
    latitude: 29.6010,
    longitude: 32.3380,
    view: 'Gulf of Suez & Crystal Mountain Lagoon',
    floor_number: 2,
    spec_layers: buildApartmentZones('fully_finished', 3, 'standard'),
  },

  // ── 9. Off-Plan Apartment (North Coast) ─────────────────────────────────────
  {
    id: 'north-coast-hacienda-residence',
    slug: 'north-coast-hacienda-residence',
    title_en: 'Hacienda Waters Luxury Residence (Off-Plan)',
    title_ar: 'شقة فاخرة قيد الإنشاء – هاسيندا ووترز الساحل الشمالي',
    description_en: 'An ultra-prime 205 sqm off-plan apartment in Hacienda Waters, North Coast. Semi-finished with all plumbing, electrical conduits, and AC copper pre-installed. Delivering Q2 2027 with flexible payment plans.',
    description_ar: 'شقة فاخرة تحت الإنشاء بمساحة ٢٠٥ متر مربع في مشروع هاسيندا ووترز بالساحل الشمالي. نصف تشطيب مع تمديدات السباكة ومواسير الكهرباء ونحاس التكييفات. تسليم الربع الثاني ٢٠٢٧.',
    price_egp: 21500000,
    location: 'Hacienda Waters, North Coast',
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 205,
    type: 'apartment',
    listing_status: 'active',
    is_featured: false,
    completion_status: 'off_plan',
    latitude: 30.9333,
    longitude: 28.7500,
    view: 'Mediterranean Sea & Resort Lagoon',
    floor_number: 1,
    spec_layers: buildApartmentZones('semi_finished', 3, 'standard'),
  },

  // ── 10. Whole Residential Building (El Gouna) ───────────────────────────────
  {
    id: 'el-gouna-lagoon-villa-building',
    slug: 'el-gouna-lagoon-villa-building',
    title_en: 'El Gouna Marina Residential Building (عمارة شقق بالجونة)',
    title_ar: 'عمارة سكنية فاخرة مطلة على اللاجون – الجونة البحر الأحمر',
    description_en: 'A premier 3-floor residential boutique building located right on the Abu Tig Lagoon in El Gouna. Comprising a ground lobby, 6 boutique apartments, private boat berthing jetty, and rooftop lounge terrace.',
    description_ar: 'عمارة سكنية متكاملة مطلة مباشرة على لاجون أبو تيج في الجونة. تتكون من ٣ أدوار تضم ٦ شقق فندقية فاخرة ومرسى خاص لليخوت مع روف واستراحة بانورامية على البحر واللاجون.',
    price_egp: 95000000,
    location: 'Abu Tig Marina, El Gouna',
    bedrooms: 16,
    bathrooms: 18,
    area_sqm: 1380,
    type: 'building',
    listing_status: 'under_offer',
    is_featured: false,
    completion_status: 'ready',
    latitude: 27.3949,
    longitude: 33.6765,
    view: 'Direct Abu Tig Lagoon & Yacht Marina',
    floor_number: 3,
    spec_layers: buildBuildingZones(3, 2, 'fully_finished'),
  },
];

// ─── PROPERTY IMAGES ──────────────────────────────────────────────────────────
const PROPERTY_IMAGES = {
  'sodic-east-luxury-residence': [
    { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Main Living Salon', alt_text_ar: 'الصالون الرئيسي', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Dining & Kitchen Area', alt_text_ar: 'منطقة السفرة والمطبخ', sort_order: 1 },
    { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Master Bedroom', alt_text_ar: 'غرفة النوم الرئيسية', sort_order: 2 },
    { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Master Bathroom', alt_text_ar: 'الحمام الرئيسي', sort_order: 3 },
  ],
  'zayed-garden-suite-apartment': [
    { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Private Garden & Terrace', alt_text_ar: 'الحديقة الخاصة والتراس', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Living Room Facing Garden', alt_text_ar: 'غرفة المعيشة المطلة على الحديقة', sort_order: 1 },
    { url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Master Suite', alt_text_ar: 'الجناح الرئيسي', sort_order: 2 },
  ],
  'aurum-sky-duplex-cairo': [
    { url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Double-Height Sky Living', alt_text_ar: 'المعيشة السماوية بارتفاع طابقين', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Upper Gallery & Salon', alt_text_ar: 'الجاليري والبهو العلوي', sort_order: 1 },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Skyline Terrace', alt_text_ar: 'التراس البانورامي', sort_order: 2 },
  ],
  'new-cairo-prime-building-estate': [
    { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Building Façade & Entrance', alt_text_ar: 'واجهة العمارة والمدخل الرئيسي', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Roof Terrace Area', alt_text_ar: 'تراس الروف والسطح', sort_order: 1 },
    { url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Apartment Model Unit', alt_text_ar: 'نموذج الشقة الداخلية', sort_order: 2 },
  ],
  'zayed-commercial-mixed-building': [
    { url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Commercial Façade', alt_text_ar: 'الواجهة التجارية والإدارية', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Interior Office & Residence', alt_text_ar: 'المساحة الداخلية', sort_order: 1 },
  ],
  'madinaty-panoramic-roof-package': [
    { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Panoramic Rooftop Deck', alt_text_ar: 'تراس السطح البانورامي', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Roof Apartment Living Room', alt_text_ar: 'غرفة معيشة شقة الروف', sort_order: 1 },
  ],
  'new-cairo-commercial-garage-facility': [
    { url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Subterranean Parking Bays', alt_text_ar: 'باكيات الجراج تحت الأرض', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Automated Entrance Ramp', alt_text_ar: 'رامب الدخول الإلكتروني', sort_order: 1 },
  ],
  'sokhna-galala-cliff-apartment': [
    { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Sea & Cliff View', alt_text_ar: 'إطلالة البحر والجبل', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Open Living Salon', alt_text_ar: 'الصالون المفتوح', sort_order: 1 },
  ],
  'north-coast-hacienda-residence': [
    { url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Beachfront Residence', alt_text_ar: 'الإطلالة البحرية', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Lagoon Promenade', alt_text_ar: 'ممشى اللاجون', sort_order: 1 },
  ],
  'el-gouna-lagoon-villa-building': [
    { url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1600&q=85', alt_text_en: 'Lagoon Marina Building', alt_text_ar: 'عمارة اللاجون والمرسى', sort_order: 0 },
    { url: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=1200&q=85', alt_text_en: 'Yacht Dock View', alt_text_ar: 'إطلالة مرسى اليخوت', sort_order: 1 },
  ],
};

// ─── PROPERTY AMENITIES ───────────────────────────────────────────────────────
const APARTMENT_AMENITIES = [
  { amenity_en: 'High-Speed Schindler Elevator', amenity_ar: 'مصعد شيندلر عالي السرعة' },
  { amenity_en: 'Imported Marble Lobby & Staircase', amenity_ar: 'مدخل وردهة رخام مستورد فاخر' },
  { amenity_en: 'Private Covered Parking Bay', amenity_ar: 'باكية جراج خاصة مغطاة' },
  { amenity_en: 'Video Intercom & Biometric Access', amenity_ar: 'إنتركم مرئي وتحكم ذكي' },
  { amenity_en: 'Sound & Heat Thermal Insulation', amenity_ar: 'عزل حراري وصوتي مزدوج' },
  { amenity_en: 'Central Water Filter & Booster Pump', amenity_ar: 'مضخة وفلتر مياه مركزي' },
];

const BUILDING_AMENITIES = [
  { amenity_en: '8 Private Residential Units', amenity_ar: '٨ وحدات سكنية كاملة' },
  { amenity_en: 'Full Ground Garage Bays (8 Cars)', amenity_ar: 'جراج أرضي متكامل لـ ٨ سيارات' },
  { amenity_en: 'High-Speed Italian Elevator (6 Persons)', amenity_ar: 'مصعد إيطالي عالي السرعة' },
  { amenity_en: 'Private Guard & Security Suite', amenity_ar: 'غرفة حراسة وأمن مستقلة مع حمام' },
  { amenity_en: 'Water Pumps & Electric Meters Room', amenity_ar: 'غرفة مواتير وعدادات كهرباء متكاملة' },
  { amenity_en: 'Finished Sky Terrace & Pergola', amenity_ar: 'روف مجهز بتراس وبرجولا بانورامية' },
  { amenity_en: 'Reinforced Concrete & Water Insulation', amenity_ar: 'عزل رطوبة ومائي معتمد للسطح والأساسات' },
];

const GARAGE_AMENITIES = [
  { amenity_en: '12 Numbered Vehicle Parking Bays', amenity_ar: '١٢ باكية سيارات مرقمة ومخصصة' },
  { amenity_en: 'Automated Electric Roller Shutter', amenity_ar: 'بوابة إلكترونية أوتوماتيكية سريعة' },
  { amenity_en: 'Industrial Epoxy Flooring', amenity_ar: 'أرضيات إيبوكسي صناعي عالي التحمل' },
  { amenity_en: 'Industrial Drainage & Fire Fighting System', amenity_ar: 'شبكة صرف صناعي ونظام إطفاء حريق' },
  { amenity_en: '24/7 CCTV & Security Command Post', amenity_ar: 'كاميرات مراقبة وكابينة أمن على مدار الساعة' },
];

const AMENITIES_MAP = {
  'sodic-east-luxury-residence': APARTMENT_AMENITIES,
  'zayed-garden-suite-apartment': APARTMENT_AMENITIES,
  'aurum-sky-duplex-cairo': APARTMENT_AMENITIES,
  'new-cairo-prime-building-estate': BUILDING_AMENITIES,
  'zayed-commercial-mixed-building': BUILDING_AMENITIES,
  'madinaty-panoramic-roof-package': APARTMENT_AMENITIES,
  'new-cairo-commercial-garage-facility': GARAGE_AMENITIES,
  'sokhna-galala-cliff-apartment': APARTMENT_AMENITIES,
  'north-coast-hacienda-residence': APARTMENT_AMENITIES,
  'el-gouna-lagoon-villa-building': BUILDING_AMENITIES,
};

// ─── SEED EXECUTION ───────────────────────────────────────────────────────────
async function runSeed() {
  console.log('🚀 Starting Full Database Re-seed (Apartments, Buildings, Garages)...');

  // Step 1: Wipe existing tables in FK-safe order
  console.log('\n🗑️  Step 1: Clearing existing data...');
  const tables = ['property_amenities', 'property_images', 'bookings', 'leads', 'properties'];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      const { error: e2 } = await supabase.from(table).delete().gte('created_at', '2000-01-01');
      if (e2) console.warn(`  ⚠️  Table ${table}: ${e2.message}`);
      else console.log(`  ✅  Cleared ${table}`);
    } else {
      console.log(`  ✅  Cleared ${table}`);
    }
  }

  // Step 2: Insert Properties
  console.log('\n🏗️  Step 2: Inserting real property catalog with CAD spec_layers...');
  for (const prop of PROPERTIES) {
    const { spec_layers, id: _ignoreId, ...rest } = prop;

    let inserted = null;
    let { data: insData, error: propErr } = await supabase
      .from('properties')
      .insert({
        ...rest,
        spec_layers: spec_layers ?? null,
      })
      .select('id')
      .single();

    if (propErr && propErr.message.includes('enum property_type')) {
      // Fallback to 'apartment' if 'building' or 'garage' are not yet in the DB enum
      console.warn(`  ⚠️  [${prop.type}] not yet in Postgres enum — inserting with enum fallback 'apartment'`);
      const fallbackRes = await supabase
        .from('properties')
        .insert({
          ...rest,
          type: 'apartment',
          spec_layers: spec_layers ?? null,
        })
        .select('id')
        .single();
      insData = fallbackRes.data;
      propErr = fallbackRes.error;
    }

    if (propErr) {
      console.error(`  ❌ Failed to insert [${prop.slug}]: ${propErr.message}`);
      continue;
    }

    inserted = insData;
    const propId = inserted.id;
    console.log(`  ✅ [${prop.type.toUpperCase()}] ${prop.title_en} (${propId})`);

    // Insert Images
    const imgs = (PROPERTY_IMAGES[prop.slug] || []).map((img) => ({
      ...img,
      property_id: propId,
    }));
    if (imgs.length > 0) {
      const { error: imgErr } = await supabase.from('property_images').insert(imgs);
      if (imgErr) console.warn(`     ⚠️  Images error: ${imgErr.message}`);
      else console.log(`     🖼️  ${imgs.length} photos linked`);
    }

    // Insert Amenities
    const ams = (AMENITIES_MAP[prop.slug] || []).map((am) => ({
      ...am,
      property_id: propId,
    }));
    if (ams.length > 0) {
      const { error: amErr } = await supabase.from('property_amenities').insert(ams);
      if (amErr) console.warn(`     ⚠️  Amenities error: ${amErr.message}`);
      else console.log(`     ✨  ${ams.length} amenities linked`);
    }
  }

  // Step 3: Insert Realistic Leads
  console.log('\n🌱  Step 3: Inserting sample CRM leads...');
  const sampleLeads = [
    {
      name: 'Eng. Mahmoud El-Sayed',
      email: 'mahmoud.elsayed@eg-capital.com',
      phone: '+20 100 123 4567',
      message: 'Inquiring about purchasing the entire residential building in Al-Narges New Cairo for our corporate housing portfolio.',
      stage: 'qualified',
      source: 'website',
    },
    {
      name: 'Dr. Karim Hassan',
      email: 'dr.karim.hassan@gmail.com',
      phone: '+20 122 987 6543',
      message: 'Looking for a 3-bedroom ground apartment with private garden in Sheikh Zayed.',
      stage: 'contacted',
      source: 'website',
    },
    {
      name: 'Tarek Abdel-Rahman',
      email: 'tarek.abdelrahman@outlook.com',
      phone: '+20 111 456 7890',
      message: 'Interested in the commercial garage facility on North 90th for fleet parking.',
      stage: 'new',
      source: 'referral',
    },
    {
      name: 'Nadine Mansour',
      email: 'nadine.mansour@gmail.com',
      phone: '+20 106 333 4444',
      message: 'Requesting viewing for the Sky Duplex in Aurum Tower Fifth Settlement.',
      stage: 'new',
      source: 'instagram',
    },
  ];

  const { error: leadsErr } = await supabase.from('leads').insert(sampleLeads);
  if (leadsErr) console.warn(`  ⚠️  Leads error: ${leadsErr.message}`);
  else console.log(`  ✅  ${sampleLeads.length} sample CRM leads inserted`);

  console.log('\n🎉  Database refresh successfully completed!');
  console.log('Summary of active types in system:');
  console.log('  • apartment: Standard, Ground Garden, Sky Duplex, Full Roof Suite');
  console.log('  • building: Al-Narges Full 4-Floor Building, Zayed Mixed Commercial Building, El Gouna Marina Building');
  console.log('  • garage: North 90th 12-Bay Commercial Parking Facility');
}

runSeed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
