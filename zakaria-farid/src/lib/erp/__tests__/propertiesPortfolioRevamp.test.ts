import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isWholeBuildingSold,
  isUnitSold,
  isBuildingFullySold,
  canSellWholeBuilding,
  getAvailableUnitsForProperty,
  isPropertyAvailableForContract,
  getPropertyInventorySummary,
  categorizeFloor,
  groupUnitsByFloor,
  FlatInventoryUnit
} from '../propertiesPortfolioCalculations';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '../types';

describe('FIN-OS Properties Portfolio & Contract Wizard Revamp Suite', () => {
  // Test fixture: Multi-unit building with 4 units
  const multiUnitBuilding: Property = {
    id: 'prop-andalus-1',
    slug: 'andalus-1',
    title_ar: 'عمارة الأندلس',
    title_en: 'Andalus Building',
    description_en: 'Luxury residential building in New Cairo',
    description_ar: 'عمارة سكنية فاخرة في التجمع الخامس',
    latitude: 30.0123,
    longitude: 31.4567,
    type: 'building',
    price_egp: 20000000,
    area_sqm: 1000,
    bedrooms: 12,
    bathrooms: 8,
    location: 'التجمع الخامس',
    completion_status: 'ready',
    completion_percentage: 100,
    listing_status: 'active',
    is_featured: true,
    created_at: new Date().toISOString(),
    building_units: [
      {
        unit_id: 'u-101',
        unit_number: 'شقة 101',
        floor: 1,
        area_sqm: 150,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3000000,
        status: 'available'
      },
      {
        unit_id: 'u-102',
        unit_number: 'شقة 102',
        floor: 1,
        area_sqm: 150,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3000000,
        status: 'available'
      },
      {
        unit_id: 'u-201',
        unit_number: 'شقة 201',
        floor: 2,
        area_sqm: 150,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3200000,
        status: 'available'
      },
      {
        unit_id: 'u-202',
        unit_number: 'شقة 202',
        floor: 2,
        area_sqm: 150,
        bedrooms: 3,
        bathrooms: 2,
        price_egp: 3200000,
        status: 'available'
      },
    ]
  };

  // Test fixture: Standalone Villa (no building_units)
  const standaloneVilla: Property = {
    id: 'prop-villa-1',
    slug: 'villa-1',
    title_ar: 'فيلا الياسمين',
    title_en: 'Yasmine Villa',
    description_en: 'Modern luxury standalone villa',
    description_ar: 'فيلا مستقلة فاخرة وحديثة',
    latitude: 30.0234,
    longitude: 31.4678,
    type: 'villa',
    price_egp: 15000000,
    area_sqm: 500,
    bedrooms: 5,
    bathrooms: 4,
    location: 'الشيخ زايد',
    completion_status: 'ready',
    completion_percentage: 100,
    listing_status: 'active',
    is_featured: false,
    created_at: new Date().toISOString(),
    building_units: []
  };

  const createMockContract = (overrides: Partial<ERPContract>): ERPContract => ({
    contract_id: overrides.contract_id || 'contract-test',
    contract_number: overrides.contract_number || 'CNT-001',
    property_id: overrides.property_id || 'prop-andalus-1',
    unit_id: overrides.unit_id !== undefined ? overrides.unit_id : (overrides.building_unit_id || 'u-101'),
    buyer_name: overrides.buyer_name || 'أحمد محمود',
    buyer_national_id: overrides.buyer_national_id || '29001011234567',
    buyer_phone: overrides.buyer_phone || '01000000000',
    buyer_email: overrides.buyer_email || 'buyer@test.com',
    gross_contract_value: overrides.gross_contract_value || '3000000',
    currency: overrides.currency || 'EGP',
    exchange_rate: overrides.exchange_rate || '1.0000',
    contract_date: overrides.contract_date || '2026-01-01',
    handover_status: overrides.handover_status || 'Pending',
    total_cash_collected: overrides.total_cash_collected || '600000',
    status: overrides.status || 'Active',
    payment_plan_type: overrides.payment_plan_type || 'INSTALLMENTS',
    base_price: overrides.base_price || '3000000',
    tax_amount: overrides.tax_amount || '0',
    tax_description: overrides.tax_description || '',
    partner_splits: overrides.partner_splits || [],
    ...overrides
  });

  describe('1. Building Absorption Engine & Whole-Building vs Unit Sale', () => {
    it('accurately identifies an entirely unsold building', () => {
      const contracts: ERPContract[] = [];

      assert.strictEqual(isWholeBuildingSold(multiUnitBuilding, contracts), false);
      assert.strictEqual(canSellWholeBuilding(multiUnitBuilding, contracts), true);
      assert.strictEqual(isBuildingFullySold(multiUnitBuilding, contracts), false);
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, contracts), true);

      const available = getAvailableUnitsForProperty(multiUnitBuilding, contracts);
      assert.strictEqual(available.length, 4);
    });

    it('correctly handles sale of a single unit without falsely marking the whole building as sold', () => {
      // Contract for unit u-101 (legacy shape: lacks building_unit_id, but specifies unit_number or unit_id)
      const singleUnitContract = createMockContract({
        contract_id: 'cnt-unit-101',
        property_id: multiUnitBuilding.id,
        unit_id: 'u-101',
        building_unit_number: 'شقة 101',
        is_whole_building_sale: false,
      });

      const contracts = [singleUnitContract];

      // CRITICAL FIX TEST: whole building is NOT sold just because a contract lacks building_unit_id!
      assert.strictEqual(isWholeBuildingSold(multiUnitBuilding, contracts), false);

      // Whole building cannot be sold anymore because constituent unit u-101 is already contracted
      assert.strictEqual(canSellWholeBuilding(multiUnitBuilding, contracts), false);

      // Building is NOT fully sold (3 units remaining)
      assert.strictEqual(isBuildingFullySold(multiUnitBuilding, contracts), false);
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, contracts), true);

      // Only u-101 should be marked sold
      const u101 = multiUnitBuilding.building_units![0];
      const u102 = multiUnitBuilding.building_units![1];
      assert.strictEqual(isUnitSold(multiUnitBuilding, u101, contracts), true);
      assert.strictEqual(isUnitSold(multiUnitBuilding, u102, contracts), false);

      // Available units should be exactly 3
      const available = getAvailableUnitsForProperty(multiUnitBuilding, contracts);
      assert.strictEqual(available.length, 3);
      assert.strictEqual(available.some(u => u.unit_id === 'u-101'), false);
      assert.strictEqual(available.some(u => u.unit_id === 'u-102'), true);
    });

    it('correctly identifies a contract that matched by building_unit_id', () => {
      const contractWithBuildingUnitId = createMockContract({
        contract_id: 'cnt-unit-201',
        property_id: multiUnitBuilding.id,
        building_unit_id: 'u-201',
        is_whole_building_sale: false,
      });

      const contracts = [contractWithBuildingUnitId];

      const u201 = multiUnitBuilding.building_units![2];
      const u202 = multiUnitBuilding.building_units![3];
      assert.strictEqual(isUnitSold(multiUnitBuilding, u201, contracts), true);
      assert.strictEqual(isUnitSold(multiUnitBuilding, u202, contracts), false);

      const available = getAvailableUnitsForProperty(multiUnitBuilding, contracts);
      assert.strictEqual(available.length, 3);
      assert.strictEqual(available.some(u => u.unit_id === 'u-201'), false);
    });

    it('correctly marks building fully sold when all units are contracted individually', () => {
      const allUnitContracts = multiUnitBuilding.building_units!.map((u, idx) => 
        createMockContract({
          contract_id: `cnt-${idx}`,
          property_id: multiUnitBuilding.id,
          unit_id: u.unit_id,
          building_unit_number: u.unit_number,
          is_whole_building_sale: false,
        })
      );

      assert.strictEqual(isWholeBuildingSold(multiUnitBuilding, allUnitContracts), false);
      assert.strictEqual(isBuildingFullySold(multiUnitBuilding, allUnitContracts), true);
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, allUnitContracts), false);
      assert.strictEqual(getAvailableUnitsForProperty(multiUnitBuilding, allUnitContracts).length, 0);

      const summary = getPropertyInventorySummary(multiUnitBuilding, allUnitContracts);
      assert.strictEqual(summary.availableUnits, 0);
      assert.strictEqual(summary.contractedUnits, 4);
      assert.strictEqual(summary.isFullySold, true);
    });

    it('correctly marks building sold when purchased as a whole building', () => {
      const wholeBuildingContract = createMockContract({
        contract_id: 'cnt-whole',
        property_id: multiUnitBuilding.id,
        is_whole_building_sale: true,
        unit_id: undefined,
        building_unit_id: undefined,
        building_unit_number: undefined,
        gross_contract_value: '20000000',
      });

      const contracts = [wholeBuildingContract];

      assert.strictEqual(isWholeBuildingSold(multiUnitBuilding, contracts), true);
      assert.strictEqual(canSellWholeBuilding(multiUnitBuilding, contracts), false);
      assert.strictEqual(isBuildingFullySold(multiUnitBuilding, contracts), true);
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, contracts), false);
      assert.strictEqual(getAvailableUnitsForProperty(multiUnitBuilding, contracts).length, 0);

      // All constituent units should report sold
      for (const u of multiUnitBuilding.building_units!) {
        assert.strictEqual(isUnitSold(multiUnitBuilding, u, contracts), true);
      }
    });

    it('correctly handles standalone villa contracts', () => {
      const contracts: ERPContract[] = [];
      assert.strictEqual(isPropertyAvailableForContract(standaloneVilla, contracts), true);

      const villaContract = createMockContract({
        contract_id: 'cnt-villa',
        property_id: standaloneVilla.id,
        gross_contract_value: '15000000',
      });

      assert.strictEqual(isPropertyAvailableForContract(standaloneVilla, [villaContract]), false);
    });

    it('ignores rescinded contracts and preserves unit availability', () => {
      const rescindedContract = createMockContract({
        contract_id: 'cnt-rescinded',
        property_id: multiUnitBuilding.id,
        building_unit_id: 'u-101',
        status: 'Rescinded',
      });

      const contracts = [rescindedContract];

      const u101 = multiUnitBuilding.building_units![0];
      assert.strictEqual(isUnitSold(multiUnitBuilding, u101, contracts), false);
      assert.strictEqual(canSellWholeBuilding(multiUnitBuilding, contracts), true);
      assert.strictEqual(isBuildingFullySold(multiUnitBuilding, contracts), false);
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, contracts), true);

      const available = getAvailableUnitsForProperty(multiUnitBuilding, contracts);
      assert.strictEqual(available.length, 4);
    });
  });

  describe('2. Contract Wizard Rules & Invariants', () => {
    it('excludes fully sold properties from contract selection list', () => {
      const soldVillaContract = createMockContract({
        contract_id: 'cnt-villa-sold',
        property_id: standaloneVilla.id,
      });

      const contracts = [soldVillaContract];

      // Available property should return true, sold property should return false
      assert.strictEqual(isPropertyAvailableForContract(multiUnitBuilding, contracts), true);
      assert.strictEqual(isPropertyAvailableForContract(standaloneVilla, contracts), false);
    });

    it('excludes already contracted apartments from available building units', () => {
      const u101Contract = createMockContract({
        contract_id: 'cnt-101',
        property_id: multiUnitBuilding.id,
        unit_id: 'u-101',
        building_unit_number: 'شقة 101',
      });

      const available = getAvailableUnitsForProperty(multiUnitBuilding, [u101Contract]);
      const availableIds = available.map(u => u.unit_id);

      assert.strictEqual(availableIds.includes('u-101'), false);
      assert.strictEqual(availableIds.includes('u-102'), true);
      assert.strictEqual(availableIds.includes('u-201'), true);
      assert.strictEqual(availableIds.includes('u-202'), true);
    });
  });

  describe('3. Floor Categorization & Matrix Grouping', () => {
    it('correctly categorizes ground, first, typical, and roof floors', () => {
      const ground = categorizeFloor(0, 'شقة أرضي', 'apartment', true);
      assert.strictEqual(ground.key, 'ground');
      assert.strictEqual(ground.label, 'الدور الأرضي');

      const first = categorizeFloor(1, 'شقة 101', 'apartment', true);
      assert.strictEqual(first.key, 'first');
      assert.strictEqual(first.label, 'الدور الأول');

      const second = categorizeFloor(2, 'شقة 201', 'apartment', true);
      assert.strictEqual(second.key, 'second');
      assert.strictEqual(second.label, 'الدور الثاني');

      const typical = categorizeFloor(5, 'شقة 501', 'apartment', true);
      assert.strictEqual(typical.key.startsWith('typical'), true);

      const roof = categorizeFloor('roof', 'بنتهاوس مع روف', 'penthouse', true);
      assert.strictEqual(roof.key, 'roof');
      assert.strictEqual(roof.label, 'الرووف / البنتهاوس');
    });

    it('groups inventory units by floor with accurate unit counts', () => {
      const flatUnits: { unit: FlatInventoryUnit; globalIndex: number }[] = multiUnitBuilding.building_units!.map((u, idx) => ({
        unit: {
          id: `${multiUnitBuilding.id}-${u.unit_id}`,
          propertyId: multiUnitBuilding.id,
          property: multiUnitBuilding,
          projectTitle: multiUnitBuilding.title_ar,
          location: multiUnitBuilding.location || '',
          unitType: 'شقة',
          unitNumber: u.unit_number,
          floor: u.floor,
          areaSqm: u.area_sqm,
          totalPrice: u.price_egp,
          downPayment: u.price_egp * 0.2,
          monthlyInstallment: (u.price_egp * 0.8) / 24,
          status: idx === 0 ? 'contracted' : 'available',
          completionStatus: 'ready',
          buildingUnit: u
        },
        globalIndex: idx + 1
      }));

      const floorGroups = groupUnitsByFloor(flatUnits, true);
      assert.strictEqual(floorGroups.length, 2); // Floor 1 and Floor 2

      const floor1 = floorGroups.find(f => f.floorKey === 'first');
      assert.ok(floor1);
      assert.strictEqual(floor1.totalUnits, 2);
      assert.strictEqual(floor1.availableUnits, 1);
      assert.strictEqual(floor1.contractedUnits, 1);

      const floor2 = floorGroups.find(f => f.floorKey === 'second');
      assert.ok(floor2);
      assert.strictEqual(floor2.totalUnits, 2);
      assert.strictEqual(floor2.availableUnits, 2);
      assert.strictEqual(floor2.contractedUnits, 0);
    });
  });

  describe('4. Direct vs Hierarchical Pagination Math', () => {
    it('correctly calculates pagination for direct units view', () => {
      const totalUnits = 45;
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(totalUnits / pageSize));
      assert.strictEqual(totalPages, 5);

      const page1Start = (1 - 1) * pageSize;
      const page1End = Math.min(1 * pageSize, totalUnits);
      assert.strictEqual(page1Start, 0);
      assert.strictEqual(page1End, 10);

      const page5Start = (5 - 1) * pageSize;
      const page5End = Math.min(5 * pageSize, totalUnits);
      assert.strictEqual(page5Start, 40);
      assert.strictEqual(page5End, 45);
    });
  });
});
