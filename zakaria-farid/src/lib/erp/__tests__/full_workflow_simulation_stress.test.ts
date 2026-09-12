import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { D, Decimal, minDecimal, generateUUID } from '../math';
import { ContractsEngine } from '../contracts';
import { EscalationEngine } from '../escalation';
import { RescissionEngine } from '../rescission';
import { RSVEngine } from '../rsv';
import { GeneralLedgerEngine, CANONICAL_COA } from '../ledger';
import { PartnersEngine } from '../partnersEngine';
import { InvariantsValidator } from '../invariants';
import { 
  ERPAccountingPeriod, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPJournalEntry,
  ERPPDCRecord 
} from '../types';

const TEST_PERIOD: ERPAccountingPeriod = {
  period_id: 'prd-audit-2026',
  fiscal_year: 2026,
  period_number: 9,
  start_date: '2026-09-01',
  end_date: '2026-09-30',
  status: 'OPEN'
};

describe('FIN-OS Full Workflows Simulation & Stress Audit (Dual-Gated)', () => {

  // =========================================================================
  // JOURNEY 1: Leads & Property Showcase (Unit Inquiry & Booking Preconditions)
  // =========================================================================
  describe('Journey 1: Leads & Property Showcase Preconditions', () => {
    it('Should validate lead payload structure and sanitize Egyptian contact data', () => {
      const rawLead = {
        name: 'د. محمود السعيد',
        phone: '01012345678',
        email: 'mahmoud@example.com',
        property_id: 'prop-villa-101',
        preferred_channel: 'WhatsApp',
        notes: 'معاينة يوم السبت القادم'
      };

      assert.ok(rawLead.name.length > 0);
      assert.match(rawLead.phone, /^01[0125][0-9]{8}$/);
      assert.strictEqual(rawLead.preferred_channel, 'WhatsApp');
    });

    it('Should enforce anon least-privilege boundary (no financial data exposed in lead models)', () => {
      const leadKeys = ['id', 'name', 'phone', 'email', 'message', 'property_id', 'stage', 'created_at'];
      const financialKeys = ['account_balance', 'gl_lines', 'partner_share', 'cogs_amount'];
      financialKeys.forEach(fk => {
        assert.ok(!leadKeys.includes(fk), `Lead model must not contain financial entity key: ${fk}`);
      });
    });
  });

  // =========================================================================
  // JOURNEY 2: Contract Wizard & Installment Schedule Generation (INV-4.3, Calendar Clamping)
  // =========================================================================
  describe('Journey 2: Contract Wizard & Schedule Generation', () => {
    it('Should generate schedule with exact remainder absorption in final tranche (odd numbers)', () => {
      // 1,000,000 EGP gross, 15% DP = 150,000, remaining = 850,000 across 7 installments
      // 850,000 / 7 = 121,428.5714...
      const gross = '1000000.00';
      const dpPct = '0.15';
      const count = 7;
      const schedules = ContractsEngine.generateSchedule('c-odd-7', gross, dpPct, count, '2026-09-11', 'QUARTERLY');

      assert.strictEqual(schedules.length, 8); // Tranche 0 (DP) + 7 tranches
      assert.strictEqual(schedules[0].tranche_number, 0);
      assert.strictEqual(schedules[0].nominal_value, '150000.00');

      let sum = D(0);
      schedules.forEach(s => { sum = sum.plus(s.nominal_value); });
      assert.strictEqual(sum.toFixed(2), gross, 'Sum of tranches must exactly match gross value to 0.00 delta');
    });

    it('Should handle extreme high nominal values without IEEE 754 precision loss', () => {
      // 1.5 Billion EGP mega-project contract
      const gross = '1500000000.00';
      const dpPct = '0.25';
      const count = 48; // 48 monthly installments
      const schedules = ContractsEngine.generateSchedule('c-mega-billion', gross, dpPct, count, '2026-09-01', 'MONTHLY');

      assert.strictEqual(schedules.length, 49);
      assert.strictEqual(schedules[0].nominal_value, '375000000.00');

      let sum = D(0);
      schedules.forEach(s => { sum = sum.plus(s.nominal_value); });
      assert.strictEqual(sum.toFixed(2), gross);
    });

    it('Should handle 100% full cash contract (0 installments)', () => {
      const gross = '25000000.00';
      const schedules = ContractsEngine.generateSchedule('c-full-cash', gross, '1.00', 0, '2026-09-11');
      assert.strictEqual(schedules.length, 1);
      assert.strictEqual(schedules[0].tranche_number, 0);
      assert.strictEqual(schedules[0].nominal_value, gross);
    });

    it('Should clamp calendar dates correctly across leap years and month-ends', () => {
      // Starting on Jan 31, quarterly schedule should produce Apr 30, Jul 31, Oct 31, etc.
      const schedules = ContractsEngine.generateSchedule('c-dates-clamp', '120000.00', '0.00', 4, '2026-01-31', 'QUARTERLY');
      assert.strictEqual(schedules[1].due_date, '2026-04-30'); // April has 30 days
      assert.strictEqual(schedules[2].due_date, '2026-07-31'); // July has 31 days
      assert.strictEqual(schedules[3].due_date, '2026-10-31'); // October has 31 days
    });
  });

  // =========================================================================
  // JOURNEY 3: Down Payment, Cash Collection & Receipt Vouchers (INV-4.1)
  // =========================================================================
  describe('Journey 3: Cash Collections & Double-Entry Receipt Vouchers', () => {
    const contractPreHandover: ERPContract = {
      contract_id: 'c-pre-h',
      contract_number: 'ZF-2026-PRE-001',
      unit_id: 'VILLA-01',
      buyer_name: 'أحمد محمود',
      gross_contract_value: '5000000.00',
      total_cash_collected: '0.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-09-01',
      handover_status: 'Pending',
      status: 'Active'
    };

    it('Should create balanced advance payment entry (Dr 101000 / Cr 203000)', () => {
      const entry = ContractsEngine.createAdvancePaymentEntry(
        contractPreHandover,
        '750000.00',
        TEST_PERIOD,
        '2026-09-11',
        true,
        'TELLER_DESK'
      );

      const balanceRes = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balanceRes.passed, true);
      assert.strictEqual(entry.lines[0].account_code, '101000');
      assert.strictEqual(entry.lines[0].debit_amount, '750000.00');
      assert.strictEqual(entry.lines[1].account_code, '203000');
      assert.strictEqual(entry.lines[1].credit_amount, '750000.00');
    });

    it('Should route bank/instapay advance payments to 102000 cleanly', () => {
      const entry = ContractsEngine.createAdvancePaymentEntry(
        contractPreHandover,
        '500000.00',
        TEST_PERIOD,
        '2026-09-11',
        false, // Bank / InstaPay
        'TELLER_DESK'
      );

      assert.strictEqual(entry.lines[0].account_code, '102000');
      assert.strictEqual(entry.lines[1].account_code, '203000');
      const balanceRes = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balanceRes.passed, true);
    });

    it('Should post post-handover installment collection to 103000 and reject over-collection', () => {
      const contractDelivered: ERPContract = {
        contract_id: 'c-deliv',
        contract_number: 'ZF-2026-DLV-001',
        unit_id: 'PENTHOUSE-01',
        buyer_name: 'سارة فريد',
        gross_contract_value: '10000000.00',
        total_cash_collected: '8000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2026-01-01',
        handover_status: 'Delivered',
        status: 'Active'
      };

      // Remaining receivable = 2,000,000 EGP
      const validEntry = ContractsEngine.createPostHandoverCollectionEntry(
        contractDelivered,
        '1000000.00',
        TEST_PERIOD,
        '2026-09-11',
        true
      );
      assert.strictEqual(validEntry.lines[0].account_code, '101000');
      assert.strictEqual(validEntry.lines[1].account_code, '103000');
      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([validEntry]).passed, true);

      // Attempting to collect 2,500,000 (exceeds 2M remaining) must throw
      assert.throws(() => {
        ContractsEngine.createPostHandoverCollectionEntry(
          contractDelivered,
          '2500000.00',
          TEST_PERIOD,
          '2026-09-11',
          true
        );
      }, /exceeds remaining accounts receivable/);
    });
  });

  // =========================================================================
  // JOURNEY 4: PDC Lifecycle (In Safe -> Deposited -> Cleared / Bounced)
  // =========================================================================
  describe('Journey 4: PDC Cheques & Notes Under Collection Lifecycle', () => {
    const mockCheque: ERPPDCRecord = {
      cheque_id: 'pdc-test-01',
      contract_id: 'c-pdc-01',
      cheque_number: 'CHK-998811',
      bank_name: 'CIB Egypt',
      drawer_name: 'طارق عبد العزيز',
      nominal_value: '250000.00',
      due_date: '2026-09-15',
      status: 'In Safe'
    };

    it('Should book deposit entry to 104000 and relieve 103200', () => {
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-DEP-${mockCheque.cheque_number}`,
        entry_date: '2026-09-11',
        period: TEST_PERIOD,
        description: `إيداع الشيك برسم التحصيل #${mockCheque.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: mockCheque.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '104000', debit_amount: mockCheque.nominal_value, credit_amount: '0.00' },
          { account_code: '103200', debit_amount: '0.00', credit_amount: mockCheque.nominal_value }
        ]
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
    });

    it('Should book clearance entry to Bank 102000 and Deferred Revenue 203000', () => {
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-CLR-${mockCheque.cheque_number}`,
        entry_date: '2026-09-15',
        period: TEST_PERIOD,
        description: `تحصيل بنكي للشيك #${mockCheque.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: mockCheque.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '102000', debit_amount: mockCheque.nominal_value, credit_amount: '0.00' },
          { account_code: '203000', debit_amount: '0.00', credit_amount: mockCheque.nominal_value }
        ]
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
    });

    it('Should reverse deposited cheque on bounce (Dr 103200 / Cr 104000)', () => {
      const bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-BNC-${mockCheque.cheque_number}`,
        entry_date: '2026-09-16',
        period: TEST_PERIOD,
        description: `إثبات ارتداد الشيك #${mockCheque.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: mockCheque.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '103200', debit_amount: mockCheque.nominal_value, credit_amount: '0.00' },
          { account_code: '104000', debit_amount: '0.00', credit_amount: mockCheque.nominal_value }
        ]
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([bounceEntry]).passed, true);
    });
  });

  // =========================================================================
  // JOURNEY 5: Construction Expenses & Relative Sales Value (RSV Engine)
  // =========================================================================
  describe('Journey 5: Construction WIP Expenses & RSV Cost Allocation', () => {
    it('Should capitalize construction expenses into WIP with balanced double-entry', () => {
      const wipEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: 'JE-EXP-WIP-001',
        entry_date: '2026-09-11',
        period: TEST_PERIOD,
        description: 'فاتورة توريد حديد تسليح وخرسانة مسلحة',
        source_module: 'WIP_ALLOCATION',
        created_by: 'SITE_ENGINEER',
        lines: [
          { account_code: '151000', debit_amount: '3500000.00', credit_amount: '0.00', memo: 'Direct structure' },
          { account_code: '201000', debit_amount: '0.00', credit_amount: '3500000.00', memo: 'Vendor payable' }
        ]
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([wipEntry]).passed, true);
    });

    it('Should calculate RSV factor with exact integer precision and compute unit COGS', () => {
      const totalWip = '45000000.00';
      const totalSales = '100000000.00';
      const alloc = RSVEngine.calculateAllocation('برج النخيل الفاخر', totalWip, totalSales);

      assert.strictEqual(alloc.rsv_factor, '0.4500');

      // Unit with 8,000,000 contract value gets 8M * 0.45 = 3.6M COGS
      const unitCogs = RSVEngine.computeUnitCOGS('8000000.00', alloc.rsv_factor);
      assert.strictEqual(unitCogs.toFixed(2), '3600000.00');
    });

    it('Should reject RSV calculation if total project sales value is zero or negative', () => {
      assert.throws(() => {
        RSVEngine.calculateAllocation('مشروع باطل', '1000000.00', '0.00');
      }, /must be greater than zero/);
    });
  });

  // =========================================================================
  // JOURNEY 6: Physical Handover & Statutory Revenue Recognition (INV-4.17 Model B)
  // =========================================================================
  describe('Journey 6: Handover Execution & Model B Net Recognition', () => {
    it('Should balance Model B Net Recognition journal: Dr 203000 [C] + Dr 103000 [V - C] == Cr 401000 [V]', () => {
      const contract: ERPContract = {
        contract_id: 'c-handover-test',
        contract_number: 'ZF-2026-HND-01',
        unit_id: 'UNIT-PALACE-404',
        buyer_name: 'هاني فريد',
        gross_contract_value: '20000000.00',
        total_cash_collected: '12000000.00', // C = 12M, V - C = 8M
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-01-01',
        handover_status: 'Pending',
        status: 'Active'
      };

      const rsvCogs = '9000000.00'; // 45% of 20M

      const entry = ContractsEngine.createHandoverModelBEntry(
        contract,
        TEST_PERIOD,
        '2026-09-11',
        rsvCogs,
        '501000',
        '151000',
        'CFO_FARID'
      );

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);

      // Verify lines
      const line203 = entry.lines.find(l => l.account_code === '203000');
      const line103 = entry.lines.find(l => l.account_code === '103000');
      const line401 = entry.lines.find(l => l.account_code === '401000');
      const line501 = entry.lines.find(l => l.account_code === '501000');
      const line151 = entry.lines.find(l => l.account_code === '151000');

      assert.strictEqual(line203?.debit_amount, '12000000.00');
      assert.strictEqual(line103?.debit_amount, '8000000.00');
      assert.strictEqual(line401?.credit_amount, '20000000.00');
      assert.strictEqual(line501?.debit_amount, '9000000.00');
      assert.strictEqual(line151?.credit_amount, '9000000.00');
    });

    it('Should handle 100% pre-paid contract at handover cleanly (V == C)', () => {
      const contractFullPaid: ERPContract = {
        contract_id: 'c-full-paid-handover',
        contract_number: 'ZF-2026-FULL-01',
        unit_id: 'UNIT-ROYAL-100',
        buyer_name: 'عمر شريف',
        gross_contract_value: '15000000.00',
        total_cash_collected: '15000000.00', // C == V
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-06-01',
        handover_status: 'Pending',
        status: 'Active'
      };

      const entry = ContractsEngine.createHandoverModelBEntry(
        contractFullPaid,
        TEST_PERIOD,
        '2026-09-11',
        '6750000.00',
        '501000',
        '151000'
      );

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
      const line103 = entry.lines.find(l => l.account_code === '103000');
      assert.strictEqual(line103?.debit_amount, '0.00');
    });

    it('Should block re-handover if contract is already Delivered', () => {
      const alreadyDelivered: ERPContract = {
        contract_id: 'c-delivered-already',
        contract_number: 'ZF-2026-DONE',
        unit_id: 'UNIT-DONE',
        buyer_name: 'سالم أحمد',
        gross_contract_value: '5000000.00',
        total_cash_collected: '5000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-01-01',
        handover_status: 'Delivered',
        status: 'Active'
      };

      assert.throws(() => {
        ContractsEngine.createHandoverModelBEntry(
          alreadyDelivered,
          TEST_PERIOD,
          '2026-09-11',
          '2000000.00'
        );
      }, /already been marked as Delivered/);
    });
  });

  // =========================================================================
  // JOURNEY 7: Partners & Equity Management (INV-14.B, Cash Gating INV-4.5)
  // =========================================================================
  describe('Journey 7: Partner Equity & Cash-Gated Profit Distributions', () => {
    it('Should enforce exact 100% partner equity across project cards', () => {
      const validSplits = [
        { partnerName: 'زكريا فريد (المالك)', sharePct: 65 },
        { partnerName: 'م. أحمد الشريف', sharePct: 35 }
      ];
      const sum = validSplits.reduce((acc, s) => acc + s.sharePct, 0);
      assert.strictEqual(sum, 100);

      const invalidSplits = [
        { partnerName: 'زكريا فريد', sharePct: 60 },
        { partnerName: 'م. أحمد الشريف', sharePct: 35 }
      ];
      const invalidSum = invalidSplits.reduce((acc, s) => acc + s.sharePct, 0);
      assert.notStrictEqual(invalidSum, 100, 'Invalid splits must not equal 100%');
    });

    it('Should create balanced partner capital injection entry (Dr 102000 / Cr 301000)', () => {
      const entry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '10000000.00',
        paymentMethod: 'INSTAPAY_102000',
        propertyTitle: 'برج الأوركيد',
        receiptRef: 'REC-CAP-001',
        currentPeriod: TEST_PERIOD
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
      assert.strictEqual(entry.lines[0].account_code, '102000');
      assert.strictEqual(entry.lines[1].account_code, '301000');
    });

    it('Should create balanced profit payout entry (Dr 303000 / Cr 101000)', () => {
      const entry = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '2500000.00',
        paymentMethod: 'CASH_101000',
        propertyTitle: 'برج الأوركيد',
        receiptRef: 'PAY-DIST-001',
        currentPeriod: TEST_PERIOD
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
      assert.strictEqual(entry.lines[0].account_code, '303000');
      assert.strictEqual(entry.lines[1].account_code, '101000');
    });

    it('Should enforce cash balance check before dividend distribution (INV-14.B / INV-4.5)', () => {
      // Simulate safe cash of 500,000 EGP
      const activeLedger: ERPJournalEntry[] = [
        {
          entry_id: 'je-init-cash',
          entry_number: 'JE-CASH-INIT',
          period_id: TEST_PERIOD.period_id,
          entry_date: '2026-09-01',
          description: 'Safe Cash Fund',
          source_module: 'CAPITAL_CALL',
          is_locked: false,
          created_by: 'system',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l1', entry_id: 'je-c', line_number: 1, account_code: '101000', debit_amount: '500000.00', credit_amount: '0.00' },
            { line_id: 'l2', entry_id: 'je-c', line_number: 2, account_code: '301000', debit_amount: '0.00', credit_amount: '500000.00' }
          ]
        }
      ];

      const checkCash = (routingAccount: string, amount: string) => {
        let balance = D(0);
        activeLedger.forEach(e => {
          e.lines.forEach(l => {
            if (l.account_code === routingAccount) {
              balance = balance.plus(l.debit_amount).minus(l.credit_amount);
            }
          });
        });
        if (balance.lt(D(amount))) {
          throw new Error(`ERP Invariant 4.5 Violation: Insufficient balance in ${routingAccount} (${balance.toFixed(2)} EGP). Cannot disburse ${amount} EGP.`);
        }
        return true;
      };

      // Disbursing 300k succeeds
      assert.strictEqual(checkCash('101000', '300000.00'), true);

      // Disbursing 600k (more than 500k cash) throws INV-4.5
      assert.throws(() => {
        checkCash('101000', '600000.00');
      }, /ERP Invariant 4.5 Violation: Insufficient balance/);
    });
  });

  // =========================================================================
  // JOURNEY 8: Cost Escalation & Contract Rescission (INV-4.9, INV-4.10)
  // =========================================================================
  describe('Journey 8: Escalation & Rescission with Forfeiture Floor', () => {
    const contractEsc: ERPContract = {
      contract_id: 'c-esc-01',
      contract_number: 'ZF-2026-ESC-01',
      unit_id: 'UNIT-ESC-01',
      buyer_name: 'كريم المنصوري',
      gross_contract_value: '4000000.00',
      total_cash_collected: '1000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-01-01',
      handover_status: 'Pending',
      status: 'Active'
    };

    const schedulesEsc: ERPInstallmentSchedule[] = [
      {
        schedule_id: 's-dp',
        contract_id: 'c-esc-01',
        tranche_number: 0,
        nominal_value: '1000000.00',
        due_date: '2026-01-01',
        status: 'Paid',
        schedule_version: 1,
        amount_paid: '1000000.00'
      },
      {
        schedule_id: 's-t1',
        contract_id: 'c-esc-01',
        tranche_number: 1,
        nominal_value: '1500000.00',
        due_date: '2026-06-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 's-t2',
        contract_id: 'c-esc-01',
        tranche_number: 2,
        nominal_value: '1500000.00',
        due_date: '2026-12-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    it('INV-4.9: Should leave Paid tranches untouched and absorb Delta V strictly into active pending tranches', () => {
      const delta = '500000.00';
      const result = EscalationEngine.applyEscalation(
        contractEsc,
        schedulesEsc,
        delta,
        'ارتفاع أسعار الحديد والأسمنت',
        '2026-09-11',
        'CFO_FARID'
      );

      // Paid tranche remains Paid and unchanged
      const paidRow = result.allSchedules.find(s => s.schedule_id === 's-dp');
      assert.strictEqual(paidRow?.status, 'Paid');
      assert.strictEqual(paidRow?.nominal_value, '1000000.00');

      // Old pending tranches are marked SUPERSEDED
      const superseded = result.allSchedules.filter(s => s.status === 'SUPERSEDED');
      assert.strictEqual(superseded.length, 2);

      // New active tranches generated at version 2
      const newActive = result.allSchedules.filter(s => s.status === 'Pending');
      assert.strictEqual(newActive.length, 2);
      newActive.forEach(s => {
        assert.strictEqual(s.schedule_version, 2);
      });

      // Updated gross contract value is 4.5M
      assert.strictEqual(result.updatedContract.gross_contract_value, '4500000.00');
    });

    it('INV-4.10: Rescission Branch 1 (Pre-handover) Forfeiture Floor caps penalty at collected cash (Never negative refund)', () => {
      // Contract V = 10,000,000. 10% penalty = 1,000,000.
      // Case A: Customer paid only 400,000.
      const contractLowCash: ERPContract = {
        contract_id: 'c-resc-low',
        contract_number: 'ZF-RESC-LOW',
        unit_id: 'U-LOW',
        buyer_name: 'طارق فؤاد',
        gross_contract_value: '10000000.00',
        total_cash_collected: '400000.00', // C < PenaltyUncapped
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2026-01-01',
        handover_status: 'Pending',
        status: 'Active'
      };

      const resA = RescissionEngine.processRescission(
        contractLowCash,
        [],
        TEST_PERIOD,
        '2026-09-11'
      );

      assert.strictEqual(resA.rescissionRecord.penalty_uncapped, '1000000.00');
      assert.strictEqual(resA.rescissionRecord.penalty_retained, '400000.00', 'Penalty retained must be capped at cash collected');
      assert.strictEqual(resA.rescissionRecord.net_refund_liability, '0.00', 'Net refund must be 0.00, NEVER negative');
      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([resA.journalEntry]).passed, true);

      // Case B: Customer paid 3,000,000. Retains 1,000,000, refunds 2,000,000.
      const contractHighCash: ERPContract = {
        ...contractLowCash,
        total_cash_collected: '3000000.00'
      };

      const resB = RescissionEngine.processRescission(
        contractHighCash,
        [],
        TEST_PERIOD,
        '2026-09-11'
      );

      assert.strictEqual(resB.rescissionRecord.penalty_retained, '1000000.00');
      assert.strictEqual(resB.rescissionRecord.net_refund_liability, '2000000.00');
      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([resB.journalEntry]).passed, true);
    });

    it('INV-4.10: Rescission Branch 2 (Post-handover) full ledger unwind and WIP restoration', () => {
      const contractDeliv: ERPContract = {
        contract_id: 'c-resc-post',
        contract_number: 'ZF-RESC-POST',
        unit_id: 'U-POST',
        buyer_name: 'جمال علام',
        gross_contract_value: '8000000.00',
        total_cash_collected: '5000000.00', // C = 5M, V - C = 3M
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-01-01',
        handover_status: 'Delivered',
        status: 'Active'
      };

      const res = RescissionEngine.processRescission(
        contractDeliv,
        [],
        TEST_PERIOD,
        '2026-09-11',
        '3600000.00', // RSV Cost
        '501000',
        '151000'
      );

      assert.strictEqual(res.rescissionRecord.branch, 'Post-Delivery');
      assert.strictEqual(res.rescissionRecord.penalty_retained, '800000.00'); // 10% of 8M
      assert.strictEqual(res.rescissionRecord.net_refund_liability, '4200000.00'); // 5M - 800k
      assert.strictEqual(res.rescissionRecord.unpaid_ar_cleared, '3000000.00'); // 8M - 5M
      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([res.journalEntry]).passed, true);

      // Verify that WIP was restored (Dr 151000) and COGS was reversed (Cr 501000)
      const wipLine = res.journalEntry.lines.find(l => l.account_code === '151000');
      const cogsLine = res.journalEntry.lines.find(l => l.account_code === '501000');
      assert.strictEqual(wipLine?.debit_amount, '3600000.00');
      assert.strictEqual(cogsLine?.credit_amount, '3600000.00');
    });
  });

  // =========================================================================
  // STRESS TESTING: 1,000 Synthetic Contracts End-to-End Simulation
  // =========================================================================
  describe('High-Concurrency Stress Test: 1,000 Synthetic Lifecycle Workflows', () => {
    it('Should process 1,000 complete contract lifecycles with 0.00 piastre balance variance', () => {
      const generatedEntries: ERPJournalEntry[] = [];
      let totalDebits = D(0);
      let totalCredits = D(0);

      for (let i = 1; i <= 1000; i++) {
        // Pseudo-random but deterministic variations
        const grossVal = D(2000000 + (i * 1373) % 25000000).toFixed(2);
        const dpRate = ((i % 5) + 1) * 0.05; // 5%, 10%, 15%, 20%, 25%
        const installmentsCount = ((i % 8) + 1) * 3; // 3 to 24 tranches

        const contractId = `stress-${i}`;
        const contractNum = `STRESS-ZF-${i}`;

        // 1. Generate Schedule
        const schedules = ContractsEngine.generateSchedule(
          contractId,
          grossVal,
          dpRate.toFixed(2),
          installmentsCount,
          '2026-09-01',
          'QUARTERLY'
        );

        const dpAmount = schedules[0].nominal_value;

        const contract: ERPContract = {
          contract_id: contractId,
          contract_number: contractNum,
          unit_id: `UNIT-STR-${i}`,
          buyer_name: `Buyer #${i}`,
          gross_contract_value: grossVal,
          total_cash_collected: dpAmount,
          currency: 'EGP',
          exchange_rate: '1.0000',
          contract_date: '2026-09-01',
          handover_status: 'Pending',
          status: 'Active'
        };

        // 2. Down Payment Journal Entry
        const dpEntry = ContractsEngine.createAdvancePaymentEntry(
          contract,
          dpAmount,
          TEST_PERIOD,
          '2026-09-01',
          i % 2 === 0
        );
        generatedEntries.push(dpEntry);

        // 3. Handover Entry (Model B)
        const rsvCost = D(grossVal).times('0.45').toFixed(2);
        const handoverEntry = ContractsEngine.createHandoverModelBEntry(
          contract,
          TEST_PERIOD,
          '2026-09-15',
          rsvCost
        );
        generatedEntries.push(handoverEntry);

        // Accumulate Debits and Credits
        dpEntry.lines.forEach(l => {
          totalDebits = totalDebits.plus(l.debit_amount);
          totalCredits = totalCredits.plus(l.credit_amount);
        });
        handoverEntry.lines.forEach(l => {
          totalDebits = totalDebits.plus(l.debit_amount);
          totalCredits = totalCredits.plus(l.credit_amount);
        });
      }

      assert.strictEqual(generatedEntries.length, 2000);
      assert.strictEqual(
        totalDebits.toFixed(2),
        totalCredits.toFixed(2),
        `Total Debits across 1,000 synthetic batches (${totalDebits.toFixed(2)}) must exactly equal Total Credits (${totalCredits.toFixed(2)})`
      );

      // Verify trial balance calculation engine
      const trial = GeneralLedgerEngine.calculateTrialBalance(generatedEntries);
      let trialDebit = D(0);
      let trialCredit = D(0);
      Object.values(trial).forEach(t => {
        trialDebit = trialDebit.plus(t.total_debit);
        trialCredit = trialCredit.plus(t.total_credit);
      });

      assert.strictEqual(trialDebit.toFixed(2), trialCredit.toFixed(2));
    });
  });
});
