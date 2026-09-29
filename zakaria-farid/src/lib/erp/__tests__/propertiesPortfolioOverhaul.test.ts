import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  categorizeFloor, 
  groupUnitsByFloor, 
  calculateAnalyticsBreakdown, 
  calculateProjectCardMetrics, 
  paginateProjects,
  PROJECTS_PER_ROW,
  FlatInventoryUnit 
} from '../propertiesPortfolioCalculations';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '../types';

describe('Properties Portfolio Overhaul & Invariants Suite', () => {
  const mockProperty: Property = {
    id: 'prop-building-1',
    slug: 'andalus-residence',
    title_ar: 'عمارة الأندلس التجمع الخامس',
    title_en: 'Andalus Residence New Cairo',
    description_ar: 'عمارة سكنية فاخرة',
    description_en: 'Luxury residential building',
    type: 'building',
    price_egp: 25000000,
    area_sqm: 1200,
    bedrooms: 12,
    bathrooms: 10,
    location: 'التجمع الخامس - القاهرة الجديدة',
    latitude: 30.0131,
    longitude: 31.4913,
    completion_status: 'ready',
    completion_percentage: 75,
    listing_status: 'active',
    is_featured: true,
    created_at: new Date().toISOString(),
    building_units: [
      {
        unit_id: 'u-ground-1',
        unit_number: 'شقة 1 (أرضي بحديقة)',
        floor: 0,
        area_sqm: 140,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 2800000,
        tax_amount_egp: 50000,
        status: 'contracted'
      },
      {
        unit_id: 'u-ground-2',
        unit_number: 'شقة 2 (أرضي)',
        floor: 0,
        area_sqm: 130,
        bedrooms: 2,
        bathrooms: 2,
        price_egp: 2600000,
        status: 'available'
      },
      {
        unit_id: 'u-first-1',
        unit_number: 'شقة 101',
        floor: 1,
        area_sqm: 160,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3200000,
        status: 'available'
      },
      {
        unit_id: 'u-second-1',
        unit_number: 'شقة 201',
        floor: 2,
        area_sqm: 160,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3300000,
        status: 'reserved'
      },
      {
        unit_id: 'u-roof-1',
        unit_number: 'بنتهاوس مع روف',
        floor: 99,
        area_sqm: 220,
        bedrooms: 4,
        bathrooms: 3,
        price_egp: 4800000,
        status: 'available'
      }
    ]
  };

  const mockFlatUnits: FlatInventoryUnit[] = (mockProperty.building_units || []).map((u) => ({
    id: u.unit_id,
    propertyId: mockProperty.id,
    projectTitle: mockProperty.title_ar,
    unitType: u.unit_number.includes('بنتهاوس') ? 'بنتهاوس' : 'شقة سكنية',
    unitNumber: u.unit_number,
    floor: u.floor,
    areaSqm: u.area_sqm,
    totalPrice: u.price_egp + (u.tax_amount_egp || 0),
    downPayment: Math.round((u.price_egp + (u.tax_amount_egp || 0)) * 0.2),
    monthlyInstallment: Math.round(((u.price_egp + (u.tax_amount_egp || 0)) * 0.8) / 36),
    status: u.status,
    location: mockProperty.location,
    property: mockProperty,
    buildingUnit: u
  }));

  const mockIndexedUnits = mockFlatUnits.map((u, i) => ({
    unit: u,
    globalIndex: i + 1
  }));

  describe('1. Floor Categorization & Sub-Sectioning (§Feedback 6)', () => {
    it('correctly maps floor 0 or label with أرضي to Ground Floor', () => {
      const cat0 = categorizeFloor(0, 'شقة 1', 'شقة سكنية', true);
      assert.equal(cat0.key, 'ground');
      assert.equal(cat0.label, 'الدور الأرضي');
      assert.equal(cat0.order, 0);

      const catLabel = categorizeFloor(undefined, 'أرضي بمدخل خاص', 'شقة سكنية', true);
      assert.equal(catLabel.key, 'ground');
    });

    it('correctly maps floor 1 and 2 to specific floor sub-headers', () => {
      const cat1 = categorizeFloor(1, '101', 'شقة سكنية', true);
      assert.equal(cat1.key, 'first');
      assert.equal(cat1.label, 'الدور الأول');
      assert.equal(cat1.order, 1);

      const cat2 = categorizeFloor(2, '201', 'شقة سكنية', true);
      assert.equal(cat2.key, 'second');
      assert.equal(cat2.label, 'الدور الثاني');
      assert.equal(cat2.order, 2);
    });

    it('correctly maps floor 3 to third floor and floors >= 4 to typical floor', () => {
      const cat3 = categorizeFloor(3, '301', 'شقة سكنية', true);
      assert.equal(cat3.key, 'third');
      assert.equal(cat3.label, 'الدور الثالث');
      assert.equal(cat3.order, 3);

      const cat4 = categorizeFloor(4, '401', 'شقة سكنية', true);
      assert.equal(cat4.key, 'typical-4');
      assert.equal(cat4.label, 'الدور المتكرر (4)');
      assert.equal(cat4.order, 4);
    });

    it('correctly maps roof/penthouse keywords to Roof Floor', () => {
      const catRoof = categorizeFloor(99, 'بنتهاوس مع روف', 'بنتهاوس', true);
      assert.equal(catRoof.key, 'roof');
      assert.equal(catRoof.label, 'الرووف / البنتهاوس');
      assert.equal(catRoof.order, 999);

      const catRoofByWord = categorizeFloor(undefined, 'رووف فيلا', 'فيلا', true);
      assert.equal(catRoofByWord.key, 'roof');
    });

    it('correctly maps typical and basement text keywords when floor number is null', () => {
      const catTypical = categorizeFloor(undefined, 'شقة 5 متكرر', 'شقة سكنية', true);
      assert.equal(catTypical.key, 'typical');
      assert.equal(catTypical.label, 'الدور المتكرر');

      const catBasement = categorizeFloor(undefined, 'مخزن بدروم', 'مخزن', true);
      assert.equal(catBasement.key, 'basement-1');
      assert.equal(catBasement.label, 'البدروم');
    });

    it('groups units by floor in strictly ascending architectural sequence', () => {
      const groups = groupUnitsByFloor(mockIndexedUnits, true);
      assert.equal(groups.length, 4); // Ground, 1st, 2nd, Roof
      assert.equal(groups[0].floorKey, 'ground');
      assert.equal(groups[0].totalUnits, 2);
      assert.equal(groups[0].contractedUnits, 1);
      assert.equal(groups[0].availableUnits, 1);

      assert.equal(groups[1].floorKey, 'first');
      assert.equal(groups[1].totalUnits, 1);
      assert.equal(groups[1].availableUnits, 1);

      assert.equal(groups[2].floorKey, 'second');
      assert.equal(groups[2].totalUnits, 1);
      assert.equal(groups[2].reservedUnits, 1);

      assert.equal(groups[3].floorKey, 'roof');
      assert.equal(groups[3].totalUnits, 1);
      assert.equal(groups[3].availableUnits, 1);
    });
  });

  describe('2. Table Default Shrink & Collapse State (§Feedback 7)', () => {
    it('verifies that empty expanded state represents fully collapsed default setting', () => {
      const expandedState: Record<string, boolean> = {};
      const isExpanded = (id: string) => !!expandedState[id];

      assert.equal(isExpanded(mockProperty.id), false, 'Default building state must be collapsed');
      assert.equal(isExpanded('standalone_properties'), false, 'Standalone group must be collapsed by default');
    });

    it('toggles single building state cleanly', () => {
      let expandedState: Record<string, boolean> = {};
      // User clicks expand on building
      expandedState = { ...expandedState, [mockProperty.id]: !expandedState[mockProperty.id] };
      assert.equal(expandedState[mockProperty.id], true);

      // User clicks collapse on building
      expandedState = { ...expandedState, [mockProperty.id]: !expandedState[mockProperty.id] };
      assert.equal(expandedState[mockProperty.id], false);
    });

    it('implements expand all and collapse all contracts', () => {
      const allProps = [mockProperty, { ...mockProperty, id: 'prop-2' }];
      
      // Expand all
      const expandedAll: Record<string, boolean> = {};
      allProps.forEach(p => { expandedAll[p.id] = true; });
      expandedAll['standalone_properties'] = true;

      assert.equal(expandedAll['prop-building-1'], true);
      assert.equal(expandedAll['prop-2'], true);
      assert.equal(expandedAll['standalone_properties'], true);

      // Collapse all
      const collapsedAll: Record<string, boolean> = {};
      assert.equal(Object.keys(collapsedAll).length, 0);
    });
  });

  describe('3. Executive Card Grid: 3-per-Row Contract (§Feedback 4 & 5)', () => {
    it('enforces PROJECTS_PER_ROW is strictly 3', () => {
      assert.equal(PROJECTS_PER_ROW, 3, 'Must be strictly 3 per row for visual breathing room');
    });

    it('correctly paginates projects in batches of 3', () => {
      const testList = Array.from({ length: 8 }).map((_, i) => ({
        ...mockProperty,
        id: `prop-${i + 1}`
      }));

      const page0 = paginateProjects(testList, 0, 3);
      assert.equal(page0.pageProjects.length, 3);
      assert.equal(page0.totalPages, 3);
      assert.equal(page0.pageProjects[0].id, 'prop-1');
      assert.equal(page0.pageProjects[2].id, 'prop-3');

      const page1 = paginateProjects(testList, 1, 3);
      assert.equal(page1.pageProjects.length, 3);
      assert.equal(page1.pageProjects[0].id, 'prop-4');

      const page2 = paginateProjects(testList, 2, 3);
      assert.equal(page2.pageProjects.length, 2);
      assert.equal(page2.pageProjects[0].id, 'prop-7');
      assert.equal(page2.pageProjects[1].id, 'prop-8');
    });

    it('calculates rich metrics for the 3-per-row showcase card', () => {
      const contracts: ERPContract[] = [];
      const metrics = calculateProjectCardMetrics(mockProperty, contracts);

      assert.equal(metrics.totalUnitsCount, 5);
      assert.equal(metrics.contractedUnitsCount, 1);
      assert.equal(metrics.availableUnitsCount, 4);
      assert.equal(metrics.completionPct, 75);
      assert.equal(metrics.minArea, 130);
      assert.equal(metrics.maxArea, 220);
    });

    it('preserves honest 0% completion rate without inflating to defaults (Zero Fake Data)', () => {
      const zeroProp: Property = {
        ...mockProperty,
        id: 'prop-zero-completion',
        completion_status: 'off_plan',
        completion_percentage: 0,
      };
      const metrics = calculateProjectCardMetrics(zeroProp, []);
      assert.equal(metrics.completionPct, 0, 'Zero percent must remain 0%');
    });

    it('identifies property as building when building_units are present even if type is apartment', () => {
      const aptBuilding: Property = {
        ...mockProperty,
        id: 'apt-with-units',
        type: 'apartment',
      };
      const metrics = calculateProjectCardMetrics(aptBuilding, []);
      assert.equal(metrics.totalUnitsCount, 5);
      assert.equal(metrics.availableUnitsCount, 4);
    });
  });

  describe('4. Portfolio Analytics Engine (CAD Reference Blueprint §Feedback 2)', () => {
    it('aggregates status breakdown accurately with zero NaN', () => {
      const analytics = calculateAnalyticsBreakdown(mockFlatUnits, [mockProperty], true);
      const { statusBreakdown } = analytics;

      assert.equal(statusBreakdown.total, 5);
      assert.equal(statusBreakdown.contracted, 1);
      assert.equal(statusBreakdown.available, 3);
      assert.equal(statusBreakdown.reserved, 1);
      assert.equal(statusBreakdown.contractedPct, 20);
      assert.equal(statusBreakdown.availablePct, 60);
      assert.equal(statusBreakdown.reservedPct, 20);
    });

    it('aggregates units by project stacked bars', () => {
      const analytics = calculateAnalyticsBreakdown(mockFlatUnits, [mockProperty], true);
      const { projectStacks } = analytics;

      assert.equal(projectStacks.length, 1);
      assert.equal(projectStacks[0].contracted, 1);
      assert.equal(projectStacks[0].available, 3);
      assert.equal(projectStacks[0].reserved, 1);
    });

    it('distributes units into area histogram buckets correctly', () => {
      const analytics = calculateAnalyticsBreakdown(mockFlatUnits, [mockProperty], true);
      const { areaHistogram } = analytics;

      // Units areas: 140 (100-150), 130 (100-150), 160 (150-200), 160 (150-200), 220 (200-300)
      assert.equal(areaHistogram[0].count, 0, '< 100 m²');
      assert.equal(areaHistogram[1].count, 2, '100 - 150 m² (units 130, 140)');
      assert.equal(areaHistogram[2].count, 2, '150 - 200 m² (units 160, 160)');
      assert.equal(areaHistogram[3].count, 1, '200 - 300 m² (unit 220)');
      assert.equal(areaHistogram[4].count, 0, '> 300 m²');
    });

    it('calculates average price per m² benchmarks with zero division protection', () => {
      const analytics = calculateAnalyticsBreakdown(mockFlatUnits, [mockProperty], true);
      const { averagePricePerType } = analytics;

      assert.ok(averagePricePerType.length > 0);
      averagePricePerType.forEach(item => {
        assert.ok(!isNaN(item.avgPricePerSqm));
        assert.ok(item.avgPricePerSqm > 0);
      });
    });

    it('handles empty inventory gracefully with honest zero states (FIN-OS Invariant)', () => {
      const emptyAnalytics = calculateAnalyticsBreakdown([], [], true);
      assert.equal(emptyAnalytics.statusBreakdown.total, 0);
      assert.equal(emptyAnalytics.statusBreakdown.contracted, 0);
      assert.equal(emptyAnalytics.projectStacks.length, 0);
      assert.equal(emptyAnalytics.unitTypesDistribution.length, 0);
      assert.equal(emptyAnalytics.areaHistogram.every(b => b.count === 0), true);
      assert.equal(emptyAnalytics.averagePricePerType.length, 0);
    });
  });

  describe('6. ERP Portfolio Map Modal Geographic & Inventory Contracts', () => {
    const { 
      getPropertyCoordinates, 
      getPropertyStats, 
      getCuratedProjectImage 
    } = require('../propertiesPortfolioCalculations');

    it('prioritizes explicit property latitude and longitude', () => {
      const explicitProp: Property = {
        ...mockProperty,
        latitude: 29.9876,
        longitude: 31.4321,
      };
      const coords = getPropertyCoordinates(explicitProp, 0);
      assert.equal(coords.lat, 29.9876);
      assert.equal(coords.lng, 31.4321);
    });

    it('accurately resolves regional cluster coordinates for all Egyptian real estate hubs', () => {
      const zayedProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'الشيخ زايد - محور البستان' };
      const cairoProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'التجمع الخامس - القاهرة الجديدة' };
      const sahelProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'الساحل الشمالي - هاسيندا واترز' };
      const gounaProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'الجونة - مارينا أبو تيج' };
      const sokhnaProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'العين السخنة - جبل الجلالة' };
      const capitalProp: Property = { ...mockProperty, latitude: null, longitude: null, location: 'العاصمة الإدارية الجديدة' };

      const zayedCoords = getPropertyCoordinates(zayedProp, 0);
      const cairoCoords = getPropertyCoordinates(cairoProp, 1);
      const sahelCoords = getPropertyCoordinates(sahelProp, 2);
      const gounaCoords = getPropertyCoordinates(gounaProp, 3);
      const sokhnaCoords = getPropertyCoordinates(sokhnaProp, 4);
      const capitalCoords = getPropertyCoordinates(capitalProp, 5);

      // Verify each is within Egyptian territory
      [zayedCoords, cairoCoords, sahelCoords, gounaCoords, sokhnaCoords, capitalCoords].forEach(c => {
        assert.ok(c.lat >= 22.0 && c.lat <= 32.5, `Lat ${c.lat} should be in Egypt`);
        assert.ok(c.lng >= 25.0 && c.lng <= 37.0, `Lng ${c.lng} should be in Egypt`);
      });

      // Verify specific regional anchors
      assert.ok(sahelCoords.lng < 30.0, 'Sahel is west of 30°E');
      assert.ok(gounaCoords.lat < 28.5, 'El Gouna is south of 28.5°N');
      assert.ok(gounaCoords.lng > 33.0, 'El Gouna is on Red Sea east of 33°E');
    });

    it('calculates inventory availability accurately for multi-unit buildings', () => {
      const stats = getPropertyStats(mockProperty, []);
      // mockProperty has 5 units: 1 contracted (ground-1), 1 reserved (second-1), 3 available
      assert.equal(stats.total, 5);
      assert.equal(stats.contracted, 1);
      assert.equal(stats.available, 4);
      assert.equal(stats.isSoldOut, false);
    });

    it('calculates inventory availability accurately for standalone sold properties', () => {
      const soldStandalone: Property = {
        ...mockProperty,
        type: 'villa',
        building_units: [],
        listing_status: 'sold',
      };
      const stats = getPropertyStats(soldStandalone, []);
      assert.equal(stats.total, 1);
      assert.equal(stats.contracted, 1);
      assert.equal(stats.available, 0);
      assert.equal(stats.isSoldOut, true);
    });

    it('guarantees prominent curated image thumbnail URL for every property', () => {
      const img1 = getCuratedProjectImage(mockProperty, 0);
      assert.ok(typeof img1 === 'string' && img1.startsWith('http'), 'Should return a valid image URL');

      const villaProp: Property = { ...mockProperty, type: 'villa', title_ar: 'فيلا فاخرة' };
      const imgVilla = getCuratedProjectImage(villaProp, 0);
      assert.ok(typeof imgVilla === 'string' && imgVilla.startsWith('http'), 'Villa should return valid image URL');
    });
  });
});

