import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Property } from '@/lib/supabase/types';
import { ERPPartnerTransaction } from '../types';
import { 
  computeDynamicBuildingCapital,
  executeFullInternalBuyout,
  executePartialSale,
  executeFullSubstitution,
  normalizePropertySplits
} from '../partnersEngine';
import { PRIMARY_DEVELOPER_NAME } from '../partnersDirectory';

describe('Partnership Management & Reallocation Workflows (§14.C & INV-4.2)', () => {
  
  // Helper to generate a valid building property
  const createMockBuilding = (overrides: Partial<Property> = {}): Property => ({
    id: 'prop-building-001',
    slug: 'prop-building-001',
    title_ar: 'عمارة الفردوس 101',
    title_en: 'Al-Fardous Building 101',
    description_ar: 'عمارة الفردوس',
    description_en: 'Al-Fardous Building',
    price_egp: 25000000,
    bedrooms: 20,
    bathrooms: 20,
    area_sqm: 1200,
    type: 'building',
    location: 'التجمع الخامس - النرجس',
    latitude: null,
    longitude: null,
    completion_status: 'ready',
    listing_status: 'active',
    is_featured: false,
    created_at: '2026-01-01T00:00:00Z',
    target_budget_egp: 20000000,
    partner_splits: [
      { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
      { partner_name: 'م. أحمد الشريف', share_percentage: 30 },
      { partner_name: 'د. هاني المنياوي', share_percentage: 20 }
    ],
    ownership_history: [],
    ...overrides
  } as Property);

  // --------------------------------------------------------------------------
  // 1. SCOPE RESTRICTION: BUILDINGS ONLY
  // --------------------------------------------------------------------------
  describe('Scope Restriction (Buildings Only)', () => {
    it('should reject reallocation operations on non-building properties (e.g. type === "villa")', () => {
      const villaProp: Property = createMockBuilding({
        id: 'prop-villa-001',
        title_ar: 'فيلا مستقلة النرجس',
        type: 'villa',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60 },
          { partner_name: 'م. أحمد الشريف', share_percentage: 40 }
        ]
      });

      assert.throws(() => {
        executeFullInternalBuyout({
          property: villaProp,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: PRIMARY_DEVELOPER_NAME,
          effectiveDate: '2026-03-15'
        });
      }, /only supported for building properties/);

      assert.throws(() => {
        executePartialSale({
          property: villaProp,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: 'د. هاني المنياوي',
          soldSharePct: 10,
          effectiveDate: '2026-03-15'
        });
      }, /only supported for building properties/);

      assert.throws(() => {
        executeFullSubstitution({
          property: villaProp,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: 'مستثمر جديد',
          transferArrears: false,
          effectiveDate: '2026-03-15'
        });
      }, /only supported for building properties/);
    });

    it('should reject reallocation operations on single unit properties (type === "apartment")', () => {
      const unitProp: Property = createMockBuilding({
        id: 'prop-unit-001',
        title_ar: 'شقة فاخرة 102',
        type: 'apartment',
        partner_splits: [
          { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 50 },
          { partner_name: 'م. أحمد الشريف', share_percentage: 50 }
        ]
      });

      assert.throws(() => {
        executeFullInternalBuyout({
          property: unitProp,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: PRIMARY_DEVELOPER_NAME,
          effectiveDate: '2026-03-15'
        });
      }, /only supported for building properties/);
    });
  });

  // --------------------------------------------------------------------------
  // 2. FOUNDER PERMANENCE
  // --------------------------------------------------------------------------
  describe('Founder Permanence (حتمية بقاء الشريك المؤسس زكريا فريد)', () => {
    it('should reject full internal buyout when the seller is the primary founder', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executeFullInternalBuyout({
          property: building,
          fromPartnerName: PRIMARY_DEVELOPER_NAME,
          toPartnerName: 'م. أحمد الشريف',
          effectiveDate: '2026-03-15'
        });
      }, /Founder Zakaria Farid cannot be bought out/);
    });

    it('should reject full substitution when the exiting partner is the primary founder', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executeFullSubstitution({
          property: building,
          fromPartnerName: PRIMARY_DEVELOPER_NAME,
          toPartnerName: 'مستثمر بديل',
          transferArrears: false,
          effectiveDate: '2026-03-15'
        });
      }, /Founder Zakaria Farid cannot be substituted or removed/);
    });

    it('should reject partial sale if the founder attempts to sell 100% of their share', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executePartialSale({
          property: building,
          fromPartnerName: PRIMARY_DEVELOPER_NAME,
          toPartnerName: 'م. أحمد الشريف',
          soldSharePct: 50, // All 50%
          effectiveDate: '2026-03-15'
        });
      }, /Percentage to transfer.*must be strictly less than seller's current share/);
    });

    it('should allow the founder to sell a partial share if remaining share is strictly positive', () => {
      const building = createMockBuilding();
      const updated = executePartialSale({
        property: building,
        fromPartnerName: PRIMARY_DEVELOPER_NAME,
        toPartnerName: 'م. أحمد الشريف',
        soldSharePct: 15,
        effectiveDate: '2026-03-15'
      });

      const splits = normalizePropertySplits(updated).filter(s => !s.is_archived);
      const founderSplit = splits.find(s => s.partner_name === PRIMARY_DEVELOPER_NAME);
      const buyerSplit = splits.find(s => s.partner_name === 'م. أحمد الشريف');

      assert.strictEqual(founderSplit?.share_percentage, 35);
      assert.strictEqual(buyerSplit?.share_percentage, 45);

      const totalPct = splits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalPct, 100);
    });
  });

  // --------------------------------------------------------------------------
  // 3. DYNAMIC CAPITAL DERIVATION & ARREARS CALCULATION
  // --------------------------------------------------------------------------
  describe('Dynamic Capital Derivation & Matching Arrears', () => {
    it('should accurately compute implied total capital and proportional arrears based on founder injection', () => {
      const building = createMockBuilding(); // 50% Founder, 30% Ahmed, 20% Hany
      
      // Founder injected 5,000,000 EGP into this building
      // Implied Total Capital = 5,000,000 / 0.50 = 10,000,000 EGP
      // Ahmed's required = 10,000,000 * 30% = 3,000,000 EGP
      // Hany's required  = 10,000,000 * 20% = 2,000,000 EGP
      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-001',
          transaction_number: 'PT-2026-001',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: building.id,
          property_title: building.title_ar,
          type: 'CAPITAL_INJECTION',
          amount: '5000000.00',
          payment_method: 'CASH_101000',
          date: '2026-02-01',
          status: 'COMPLETED',
          memo: 'ضخ دفعة أولى لرأس مال العمارة'
        },
        // Ahmed paid 2,000,000 EGP (Arrears = 1,000,000 EGP)
        {
          id: 'tx-002',
          transaction_number: 'PT-2026-002',
          partner_name: 'م. أحمد الشريف',
          property_id: building.id,
          property_title: building.title_ar,
          type: 'CAPITAL_INJECTION',
          amount: '2000000.00',
          payment_method: 'INSTAPAY_102000',
          date: '2026-02-15',
          status: 'COMPLETED',
          memo: 'مساهمة جزئية'
        },
        // Hany paid 2,000,000 EGP (Arrears = 0.00)
        {
          id: 'tx-003',
          transaction_number: 'PT-2026-003',
          partner_name: 'د. هاني المنياوي',
          property_id: building.id,
          property_title: building.title_ar,
          type: 'CAPITAL_INJECTION',
          amount: '2000000.00',
          payment_method: 'CASH_101000',
          date: '2026-02-20',
          status: 'COMPLETED',
          memo: 'سداد كامل الحصة المطلوبة'
        }
      ];

      const capInfo = computeDynamicBuildingCapital(building, transactions);

      assert.strictEqual(capInfo.founderInjectedEgp, '5000000.00');
      assert.strictEqual(capInfo.founderSharePct, 50);
      assert.strictEqual(capInfo.impliedTotalCapitalEgp, '10000000.00');
      assert.strictEqual(capInfo.totalActualInjectedEgp, '9000000.00');
      assert.strictEqual(capInfo.fundingRatioPct, 90);

      // Check Ahmed's status
      const ahmedStatus = capInfo.partnerStatuses.find(p => p.partnerName === 'م. أحمد الشريف');
      assert.ok(ahmedStatus);
      assert.strictEqual(ahmedStatus.requiredContributionEgp, '3000000.00');
      assert.strictEqual(ahmedStatus.paidContributionEgp, '2000000.00');
      assert.strictEqual(ahmedStatus.arrearsEgp, '1000000.00');
      assert.strictEqual(ahmedStatus.hasArrears, true);

      // Check Hany's status
      const hanyStatus = capInfo.partnerStatuses.find(p => p.partnerName === 'د. هاني المنياوي');
      assert.ok(hanyStatus);
      assert.strictEqual(hanyStatus.requiredContributionEgp, '2000000.00');
      assert.strictEqual(hanyStatus.paidContributionEgp, '2000000.00');
      assert.strictEqual(hanyStatus.arrearsEgp, '0.00');
      assert.strictEqual(hanyStatus.hasArrears, false);
    });

    it('should dynamically scale implied total capital when founder injects additional capital', () => {
      const building = createMockBuilding();
      const transactions: ERPPartnerTransaction[] = [
        {
          id: 'tx-001',
          transaction_number: 'PT-2026-001',
          partner_name: PRIMARY_DEVELOPER_NAME,
          property_id: building.id,
          property_title: building.title_ar,
          type: 'CAPITAL_INJECTION',
          amount: '10000000.00', // 10M from founder (50%) -> Implied total = 20M
          payment_method: 'CASH_101000',
          date: '2026-03-01',
          status: 'COMPLETED',
          memo: 'زيادة رأس المال'
        }
      ];

      const capInfo = computeDynamicBuildingCapital(building, transactions);
      assert.strictEqual(capInfo.impliedTotalCapitalEgp, '20000000.00');

      const ahmedStatus = capInfo.partnerStatuses.find(p => p.partnerName === 'م. أحمد الشريف');
      assert.strictEqual(ahmedStatus?.requiredContributionEgp, '6000000.00');
      assert.strictEqual(ahmedStatus?.arrearsEgp, '6000000.00');
    });
  });

  // --------------------------------------------------------------------------
  // 4. WORKFLOW 1: FULL INTERNAL BUYOUT (البيع الكامل لشريك قائم)
  // --------------------------------------------------------------------------
  describe('Workflow 1: Full Internal Buyout', () => {
    it('should transfer 100% of seller share to buyer, archive seller, and preserve 100% equity balance', () => {
      const building = createMockBuilding(); // Founder 50, Ahmed 30, Hany 20
      
      // Hany (20%) buys out Ahmed (30%) completely
      const updated = executeFullInternalBuyout({
        property: building,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: 'د. هاني المنياوي',
        transferValueEgp: '4500000.00',
        effectiveDate: '2026-03-15',
        notes: 'تخارج كامل بالاتفاق الودي'
      });

      const splits = normalizePropertySplits(updated);
      const activeSplits = splits.filter(s => !s.is_archived);
      const archivedSplits = splits.filter(s => s.is_archived);

      // Seller should be archived
      assert.strictEqual(archivedSplits.length, 1);
      assert.strictEqual(archivedSplits[0].partner_name, 'م. أحمد الشريف');
      assert.strictEqual(archivedSplits[0].share_percentage, 0);

      // Active splits should now be Founder 50% + Hany 50% = 100%
      assert.strictEqual(activeSplits.length, 2);
      const hanySplit = activeSplits.find(s => s.partner_name === 'د. هاني المنياوي');
      assert.strictEqual(hanySplit?.share_percentage, 50);

      const totalActivePct = activeSplits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalActivePct, 100);

      // Audit log entry must be present
      assert.ok(updated.ownership_history && updated.ownership_history.length === 1);
      const log = updated.ownership_history[0];
      assert.strictEqual(log.action_type, 'FULL_INTERNAL_BUYOUT');
      assert.strictEqual(log.from_partner_name, 'م. أحمد الشريف');
      assert.strictEqual(log.to_partner_name, 'د. هاني المنياوي');
      assert.strictEqual(log.transferred_share_pct, 30);
      assert.strictEqual(log.transfer_value_egp, '4500000.00');
    });

    it('should reject full internal buyout if buyer is not an existing active partner', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executeFullInternalBuyout({
          property: building,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: 'شريك غير مسجل إطلاقاً',
          effectiveDate: '2026-03-15'
        });
      }, /Buyer.*is not an active partner/);
    });
  });

  // --------------------------------------------------------------------------
  // 5. WORKFLOW 2: PARTIAL SALE (البيع الجزئي)
  // --------------------------------------------------------------------------
  describe('Workflow 2: Partial Sale', () => {
    it('should execute partial sale to an existing partner without archiving the seller', () => {
      const building = createMockBuilding(); // Founder 50, Ahmed 30, Hany 20
      
      // Ahmed (30%) sells 10% to Hany (20%)
      const updated = executePartialSale({
        property: building,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: 'د. هاني المنياوي',
        soldSharePct: 10,
        transferValueEgp: '1500000.00',
        effectiveDate: '2026-03-15'
      });

      const activeSplits = normalizePropertySplits(updated).filter(s => !s.is_archived);
      assert.strictEqual(activeSplits.length, 3);

      const ahmedSplit = activeSplits.find(s => s.partner_name === 'م. أحمد الشريف');
      const hanySplit = activeSplits.find(s => s.partner_name === 'د. هاني المنياوي');

      assert.strictEqual(ahmedSplit?.share_percentage, 20); // 30 - 10
      assert.strictEqual(hanySplit?.share_percentage, 30);  // 20 + 10

      const totalPct = activeSplits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalPct, 100);

      assert.strictEqual(updated.ownership_history?.[0].action_type, 'PARTIAL_SALE');
      assert.strictEqual(updated.ownership_history?.[0].transferred_share_pct, 10);
    });

    it('should execute partial sale to a NEW incoming partner, creating their split entry', () => {
      const building = createMockBuilding(); // Founder 50, Ahmed 30, Hany 20
      
      // Ahmed (30%) sells 12% to a new partner "المستشار كريم عبد العزيز"
      const updated = executePartialSale({
        property: building,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: 'المستشار كريم عبد العزيز',
        soldSharePct: 12,
        transferValueEgp: '2000000.00',
        effectiveDate: '2026-03-15'
      });

      const activeSplits = normalizePropertySplits(updated).filter(s => !s.is_archived);
      assert.strictEqual(activeSplits.length, 4);

      const ahmed = activeSplits.find(s => s.partner_name === 'م. أحمد الشريف');
      const newPartner = activeSplits.find(s => s.partner_name === 'المستشار كريم عبد العزيز');

      assert.strictEqual(ahmed?.share_percentage, 18); // 30 - 12
      assert.strictEqual(newPartner?.share_percentage, 12);

      const totalPct = activeSplits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalPct, 100);
    });

    it('should reject partial sale when percentage to transfer is greater than or equal to seller share', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executePartialSale({
          property: building,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: 'د. هاني المنياوي',
          soldSharePct: 30, // Ahmed has only 30%
          effectiveDate: '2026-03-15'
        });
      }, /Percentage to transfer.*must be strictly less than seller's current share/);
    });
  });

  // --------------------------------------------------------------------------
  // 6. WORKFLOW 3: FULL SUBSTITUTION (الإحلال الكامل لشريك جديد)
  // --------------------------------------------------------------------------
  describe('Workflow 3: Full Substitution', () => {
    it('should replace exiting partner 100% with new incoming partner, archiving exiting partner', () => {
      const building = createMockBuilding(); // Founder 50, Ahmed 30, Hany 20
      
      // Ahmed (30%) exits and is replaced by new incoming partner "د. طارق السعيد"
      const updated = executeFullSubstitution({
        property: building,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: 'د. طارق السعيد',
        transferValueEgp: '5000000.00',
        effectiveDate: '2026-03-15',
        transferArrears: true,
        transferredArrearsEgp: '300000.00',
        notes: 'إحلال بموجب تنازل رسمي مسجل'
      });

      const splits = normalizePropertySplits(updated);
      const activeSplits = splits.filter(s => !s.is_archived);
      const archivedSplits = splits.filter(s => s.is_archived);

      // Ahmed is archived
      assert.strictEqual(archivedSplits.length, 1);
      assert.strictEqual(archivedSplits[0].partner_name, 'م. أحمد الشريف');

      // Active splits: Founder 50, Hany 20, Tariq 30
      assert.strictEqual(activeSplits.length, 3);
      const tariq = activeSplits.find(s => s.partner_name === 'د. طارق السعيد');
      assert.strictEqual(tariq?.share_percentage, 30);

      const totalPct = activeSplits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalPct, 100);

      // Audit log entry
      const log = updated.ownership_history?.[0];
      assert.ok(log);
      assert.strictEqual(log.action_type, 'FULL_SUBSTITUTION');
      assert.strictEqual(log.from_partner_name, 'م. أحمد الشريف');
      assert.strictEqual(log.to_partner_name, 'د. طارق السعيد');
      assert.strictEqual(log.transferred_share_pct, 30);
      assert.strictEqual(log.transferred_arrears_flag, true);
      assert.strictEqual(log.transferred_arrears_egp, '300000.00');
    });

    it('should reject full substitution if incoming partner is already an active partner', () => {
      const building = createMockBuilding();
      assert.throws(() => {
        executeFullSubstitution({
          property: building,
          fromPartnerName: 'م. أحمد الشريف',
          toPartnerName: 'د. هاني المنياوي', // Already exists! Should use full internal buyout instead
          transferArrears: false,
          effectiveDate: '2026-03-15'
        });
      }, /Incoming partner.*is already an active partner/);
    });
  });

  // --------------------------------------------------------------------------
  // 7. SEQUENTIAL REALLOCATION AUDIT LOG IMMUTABILITY
  // --------------------------------------------------------------------------
  describe('Sequential Audit Log Immutability', () => {
    it('should preserve chronological audit trail across multiple reallocation steps', () => {
      let current = createMockBuilding(); // Founder 50, Ahmed 30, Hany 20

      // Step 1: Ahmed sells 5% to Hany
      current = executePartialSale({
        property: current,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: 'د. هاني المنياوي',
        soldSharePct: 5,
        effectiveDate: '2026-03-10'
      });

      // Step 2: Hany exits and sells all 25% to incoming partner "المستثمر الجديد"
      current = executeFullSubstitution({
        property: current,
        fromPartnerName: 'د. هاني المنياوي',
        toPartnerName: 'المستثمر الجديد',
        transferArrears: false,
        effectiveDate: '2026-03-12'
      });

      // Step 3: Ahmed (now 25%) sells all 25% to Founder
      current = executeFullInternalBuyout({
        property: current,
        fromPartnerName: 'م. أحمد الشريف',
        toPartnerName: PRIMARY_DEVELOPER_NAME,
        effectiveDate: '2026-03-15'
      });

      // Verify log count
      assert.strictEqual(current.ownership_history?.length, 3);
      assert.strictEqual(current.ownership_history[0].action_type, 'FULL_INTERNAL_BUYOUT');
      assert.strictEqual(current.ownership_history[1].action_type, 'FULL_SUBSTITUTION');
      assert.strictEqual(current.ownership_history[2].action_type, 'PARTIAL_SALE');

      // Final active splits: Founder 75%, New Partner 25% = 100%
      const activeSplits = normalizePropertySplits(current).filter(s => !s.is_archived);
      assert.strictEqual(activeSplits.length, 2);
      const founder = activeSplits.find(s => s.partner_name === PRIMARY_DEVELOPER_NAME);
      const newPart = activeSplits.find(s => s.partner_name === 'المستثمر الجديد');
      assert.strictEqual(founder?.share_percentage, 75);
      assert.strictEqual(newPart?.share_percentage, 25);

      const totalPct = activeSplits.reduce((sum, s) => sum + s.share_percentage, 0);
      assert.strictEqual(totalPct, 100);
    });
  });

});
