import { createClient } from '@supabase/supabase-js';
import { buildZoneInstances } from '../src/lib/layering/instances';

const SUPABASE_URL = 'https://lybkeycbiposjkjkyjlh.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_euJWBvU0hgJFcdrlPyCR9Q_gjO6trMU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEMO_PROPERTIES = [
  {
    slug: 'ultra-luxury-modern-smart-mansion',
    title_en: 'Ultra-Luxury Modern Smart Mansion in Allegria',
    title_ar: 'قصر عصري ذكي فائقة الفخامة في كمبوند اليجريا',
    description_en: '<p>An architectural masterpiece nestled in the premier Allegria Golf Community. Features double-height ceilings, floor-to-ceiling panoramic glass walls, full smart-home automation by Crestron, private elevator, heated infinity pool with jacuzzi, and imported Italian Greco marble throughout.</p>',
    description_ar: '<p>تحفة معمارية في قلب كمبوند أليجريا الجولف بالشيخ زايد. تتميز بأسقف مزدوجة الارتفاع، واجهات زجاجية بانورامية، نظام تكييف مركزي VRV، مصعد كهربائي بانورامي، حمام سباحة إنفنيتي ساخن مع جاكوزي، وتشطيبات رخام كالاكاتا إيطالي فاخر.</p>',
    price_egp: 45000000,
    bedrooms: 6,
    bathrooms: 7,
    area_sqm: 950,
    type: 'villa',
    location: 'Allegria, Sheikh Zayed',
    latitude: 30.0444,
    longitude: 30.9833,
    completion_status: 'ready',
    listing_status: 'active',
    is_featured: true,
    view: 'Golf Course & Private Lake',
    floor_number: 0,
    global_finishing: 'fully_finished',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Smart Home Automation',
      'Private Heated Infinity Pool',
      'Glass Passenger Elevator',
      'Landscaped Tropical Garden',
      'Underground Garage (4 Cars)',
      'Maid & Driver Suites',
      'VRV Central Air Conditioning',
      'Italian Calacatta Marble'
    ]
  },
  {
    slug: 'grand-mediterranean-palace-beverly-hills',
    title_en: 'Grand Mediterranean Palace in Beverly Hills',
    title_ar: 'فيلا مستقلة طراز متوسطي فاخر في بيفرلي هيلز',
    description_en: '<p>Expansive Mediterranean standalone estate overlooking manicured parks. Designed with custom handcrafted wrought iron gates, Spanish tile roofs, grand reception hall, master suite with private sauna, and private landscaped garden.</p>',
    description_ar: '<p>فيلا فاخرة بتصميم متوسطي ساحر في بيفرلي هيلز الشيخ زايد، إطلالة مباشرة على الحدائق. تتكون من ٥ غرف نوم رئيسية، ريسيبشن واسع يتسع لـ ٤ قطع، حمام سباحة خاص، غرف خادمة وسائق، وتجهيزات تكييف وإنذار حريق كاملة.</p>',
    price_egp: 38500000,
    bedrooms: 5,
    bathrooms: 6,
    area_sqm: 780,
    type: 'villa',
    location: 'Beverly Hills, Sheikh Zayed',
    latitude: 30.0512,
    longitude: 30.9678,
    completion_status: 'off_plan',
    listing_status: 'active',
    is_featured: true,
    view: 'Landscape Gardens & Greenery',
    floor_number: 0,
    global_finishing: 'semi_finished',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Private Swimming Pool',
      'Private Landscaped Garden',
      'Double Height Grand Reception',
      'Rooftop Terrace & BBQ Area',
      'Driver & Guard Quarters',
      'Surveillance & Perimeter Security'
    ]
  },
  {
    slug: 'skyline-penthouse-residence-katameya-dunes',
    title_en: 'Skyline Penthouse Residence in Katameya Dunes',
    title_ar: 'بنتهاوس فاخر بإطلالة بانورامية في قطامية ديونز',
    description_en: '<p>Ultra-exclusive top-floor penthouse with private rooftop swimming pool and direct views of Katameya Golf Course. Modern minimalistic architecture, German Poggenpohl kitchen, concealed slot diffuser AC units, and hardwood parquet floors.</p>',
    description_ar: '<p>بنتهاوس استثنائي في أرقى كمبوندات التجمع الخامس (قطامية ديونز). روف خاص يضم حمام سباحة وتراس للشواء، مطبخ ألماني مجهز، تكييفات كونسيلد مخفاة، وأرضيات باركيه طبيعي مع مواصفات تشطيب فائقة الجودة.</p>',
    price_egp: 22000000,
    bedrooms: 4,
    bathrooms: 4,
    area_sqm: 420,
    type: 'apartment',
    location: 'Katameya Dunes, New Cairo',
    latitude: 30.0125,
    longitude: 31.4367,
    completion_status: 'ready',
    listing_status: 'active',
    is_featured: true,
    view: 'Championship Golf Course',
    floor_number: 4,
    global_finishing: 'fully_finished',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Panoramic Golf Views',
      'Private Rooftop Pool & Jacuzzi',
      '24/7 Concierge & Security',
      '2 Underground Garage Spaces',
      'Underfloor Heating in Master Bath',
      'Triple-Glazed Soundproof Glass'
    ]
  },
  {
    slug: 'sunlit-sea-front-luxury-chalet-sidi-abdel-rahman',
    title_en: 'Direct Sea-Front Luxury Chalet in Sidi Abdel Rahman',
    title_ar: 'شاليه فاخر صف أول على البحر في سيدي عبد الرحمن',
    description_en: '<p>First-row beach chalet step away from crystal turquoise waters of Sidi Abdel Rahman, North Coast. Open-concept living room, private wooden deck with infinity plunge pool, full climate control, and designer coastal furniture.</p>',
    description_ar: '<p>شاليه صف أول مباشر على البحر في أفضل شواطئ سيدي عبد الرحمن بالساحل الشمالي. يمتد التراس الخاص على حمام سباحة إنفنيتي وجاردن خاصة، مفروش بالكامل بأرقى الأثاث الساحلي ومجهز بجميع الأجهزة والتكييفات.</p>',
    price_egp: 18500000,
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 230,
    type: 'chalet',
    location: 'Sidi Abdel Rahman, North Coast',
    latitude: 30.9312,
    longitude: 28.7215,
    completion_status: 'ready',
    listing_status: 'active',
    is_featured: true,
    view: 'Direct Mediterranean Sea View',
    floor_number: 0,
    global_finishing: 'fully_finished',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Direct Sand Beach Access',
      'Private Plunge Pool & Deck',
      'Fully Furnished & Air Conditioned',
      'German Fitted Kitchen Appliances',
      'Access to Luxury Resort Facilities',
      'Gated Beach Community Security'
    ]
  },
  {
    slug: 'contemporary-parkside-townhouse-westown',
    title_en: 'Contemporary Parkside Townhouse in Westown',
    title_ar: 'تاون هاوس عصري يطل على النادي في ويست تاون',
    description_en: '<p>Sleek modern townhouse featuring spacious private garden, open-plan reception, master suite with walk-in dressing room, rooftop pavilion, and dedicated solar power roof panels.</p>',
    description_ar: '<p>تاون هاوس كورنر في موقع مميز بـ ويست تاون الشيخ زايد. تصميم مودرن بحديقة خاصة واسعة، روف لاندسكيب، ٤ غرف نوم (منها ٢ ماستر)، تجهيزات الطاقة الشمسية وشبكة الاتصالات والألياف الضوئية الفائقة السرعة.</p>',
    price_egp: 16800000,
    bedrooms: 4,
    bathrooms: 4,
    area_sqm: 310,
    type: 'townhouse',
    location: 'Westown, Sheikh Zayed',
    latitude: 30.0489,
    longitude: 30.9754,
    completion_status: 'ready',
    listing_status: 'active',
    is_featured: false,
    view: 'Central Park & Clubhouse View',
    floor_number: 0,
    global_finishing: 'fully_finished',
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Private Landscaped Corner Garden',
      'Rooftop Pergola & Entertainment Area',
      'Solar Panel Energy Unit',
      'High-Speed Fiber Optic Internet',
      'Storage Room & Laundry Bay',
      'Covered Double Parking Space'
    ]
  },
  {
    slug: 'executive-duplex-residence-golden-square',
    title_en: 'Executive Duplex Residence in Golden Square',
    title_ar: 'دوبلكس فاخر بمدخل خاص في الجولدن سكوير',
    description_en: '<p>Spacious ground & first floor duplex with double-height ceiling reception, floor-to-ceiling glass sliding doors opening onto private garden patio, maid quarter, and pre-wired infrastructure.</p>',
    description_ar: '<p>دوبلكس أرضي وأول بمدخل خاص وحديقة خاصة في أرقى مناطق الجولدن سكوير بالتجمع الخامس. ريسيبشن ٥ قطع مع واجهة زجاجية، ٤ حمامات، جناح ماستر، وموقع قريب جداً من النوادي والخدمات الأساسية.</p>',
    price_egp: 14200000,
    bedrooms: 3,
    bathrooms: 4,
    area_sqm: 290,
    type: 'duplex',
    location: 'Golden Square, New Cairo',
    latitude: 30.0256,
    longitude: 31.4789,
    completion_status: 'off_plan',
    listing_status: 'active',
    is_featured: false,
    view: 'Main Boulevard & Gardens',
    floor_number: 0,
    global_finishing: 'semi_finished',
    images: [
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=85&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=85&w=1920&auto=format&fit=crop'
    ],
    amenities: [
      'Double-Height Living Room',
      'Private Entrance & Garden Patio',
      'Maid Suite & Laundry Room',
      'Underground Basement Parking',
      'CCTV & Smart Access System'
    ]
  }
];

async function seedDatabase() {
  console.log('🗑️  Deleting existing properties, images, and amenities...');
  
  // Clean tables
  const { error: delAmErr } = await supabase.from('property_amenities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delAmErr) console.warn('Amenities clear:', delAmErr.message);

  const { error: delImgErr } = await supabase.from('property_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delImgErr) console.warn('Images clear:', delImgErr.message);

  const { error: delPropErr } = await supabase.from('properties').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delPropErr) console.warn('Properties clear:', delPropErr.message);

  console.log('🌱  Seeding 6 showcase luxury properties with full spec layers...');

  for (const item of DEMO_PROPERTIES) {
    // Generate full spec_layers from architecture engine
    const specLayers = buildZoneInstances(
      item.type as any,
      item.global_finishing as any,
      item.bedrooms
    );

    const propPayload = {
      slug: item.slug,
      title_en: item.title_en,
      title_ar: item.title_ar,
      description_en: item.description_en,
      description_ar: item.description_ar,
      price_egp: item.price_egp,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      area_sqm: item.area_sqm,
      type: item.type,
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      completion_status: item.completion_status,
      listing_status: item.listing_status,
      is_featured: item.is_featured,
      finishing: item.global_finishing,
      furnishing: 'unfurnished',
      view: item.view,
      floor_number: item.floor_number,
      spec_layers: specLayers
    };

    const { data: prop, error: insErr } = await supabase
      .from('properties')
      .insert(propPayload)
      .select('id, slug')
      .single();

    if (insErr) {
      console.error(`❌ Failed to insert ${item.slug}:`, insErr.message);
      continue;
    }

    console.log(`✅ Inserted property: ${item.title_en} (ID: ${prop.id})`);

    // Insert property images
    if (item.images && item.images.length > 0) {
      const imgRows = item.images.map((url, idx) => ({
        property_id: prop.id,
        url,
        alt_text_en: `${item.title_en} Photo ${idx + 1}`,
        alt_text_ar: `${item.title_ar} صورة ${idx + 1}`,
        sort_order: idx
      }));

      const { error: imgErr } = await supabase.from('property_images').insert(imgRows);
      if (imgErr) console.error(`   ❌ Failed images for ${item.slug}:`, imgErr.message);
      else console.log(`   📸 Added ${item.images.length} images`);
    }

    // Insert property amenities
    if (item.amenities && item.amenities.length > 0) {
      const amRows = item.amenities.map((a) => ({
        property_id: prop.id,
        amenity_en: a,
        amenity_ar: a
      }));

      const { error: amErr } = await supabase.from('property_amenities').insert(amRows);
      if (amErr) console.error(`   ❌ Failed amenities for ${item.slug}:`, amErr.message);
      else console.log(`   ✨ Added ${item.amenities.length} amenities`);
    }
  }

  console.log('🎉  Database seed finished successfully!');
}

seedDatabase().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
