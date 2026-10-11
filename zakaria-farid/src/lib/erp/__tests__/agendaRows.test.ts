import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { D } from '@/lib/erp/math';
import {
  buildUnifiedAgendaRows,
  filterAgendaRows,
  calculateAgendaChipCounts,
  sortAgendaRows,
  calculateAgendaFooter,
  getCalendarDayBuckets,
  UnifiedAgendaRow,
  AgendaDirectionFilter,
  AgendaMaturityTab
} from '@/lib/erp/agendaRows';
import { ProjectedVaultItem } from '@/lib/erp/installmentsVaultProjection';
import { ProjectedOutflowItem } from '@/lib/erp/financialAgendaProjection';

describe('Unified Financial Agenda Rows Engine (agendaRows)', () => {
  const todayStr = '2026-04-01';

  const mockInflows: ProjectedVaultItem[] = [
    {
      id: 'in-1',
      kind: 'schedule_due',
      contractId: 'cnt-1',
      contractNumber: 'ZF-101',
      buyerName: 'أحمد محمود',
      unitId: 'وحدة 101',
      projectTitle: 'برج النرجس',
      nominalValue: '150000.75',
      amountPaid: '0.00',
      remainingAmount: '150000.75',
      dueDate: '2026-04-01',
      status: 'due_today',
      description: 'قسط 1',
      paymentMethod: 'CASH',
      isDownPayment: false,
      instrumentNumber: 'SND-101',
      bankName: 'N/A'
    },
    {
      id: 'in-2',
      kind: 'schedule_due',
      contractId: 'cnt-1',
      contractNumber: 'ZF-101',
      buyerName: 'أحمد محمود',
      unitId: 'وحدة 101',
      projectTitle: 'برج النرجس',
      nominalValue: '50000.50',
      amountPaid: '0.00',
      remainingAmount: '50000.50',
      dueDate: '2027-02-07',
      status: 'upcoming',
      description: 'قسط 2',
      paymentMethod: 'INSTAPAY',
      isDownPayment: false,
      instrumentNumber: 'SND-102',
      bankName: 'N/A'
    },
    {
      id: 'in-3',
      kind: 'schedule_due',
      contractId: 'cnt-2',
      contractNumber: 'ZF-102',
      buyerName: 'سارة إبراهيم',
      unitId: 'فيلا 5',
      projectTitle: 'الياسمين',
      nominalValue: '200000.00',
      amountPaid: '200000.00',
      remainingAmount: '0.00',
      dueDate: '2026-03-01',
      status: 'cleared',
      description: 'مقدم حجز',
      paymentMethod: 'CASH',
      isDownPayment: true,
      instrumentNumber: 'SND-103',
      bankName: 'N/A'
    }
  ];

  const mockOutflows: ProjectedOutflowItem[] = [
    {
      id: 'out-1',
      costItemId: 'cost-1',
      propertyId: 'prop-1',
      projectTitle: 'برج النرجس',
      beneficiary: 'شركة المقاولات الحديثة',
      costCategory: 'civil_structure',
      description: 'صب أعمدة الدور الأول',
      dueDate: '2026-03-15',
      totalAmount: '75000.20',
      paidAmount: '0.00',
      remainingAmount: '75000.20',
      status: 'overdue',
      paymentMethod: 'CASH',
      rawCostItem: {} as any
    },
    {
      id: 'out-2',
      costItemId: 'cost-2',
      propertyId: 'prop-1',
      projectTitle: 'برج النرجس',
      beneficiary: 'مؤسسة السويدي للكابلات',
      costCategory: 'mep_infrastructure',
      description: 'توريد كابلات',
      dueDate: '2026-03-20',
      totalAmount: '25000.05',
      paidAmount: '0.00',
      remainingAmount: '25000.05',
      status: 'overdue',
      paymentMethod: 'INSTAPAY',
      rawCostItem: {} as any
    },
    {
      id: 'out-3',
      costItemId: 'cost-3',
      propertyId: 'prop-2',
      projectTitle: 'الياسمين',
      beneficiary: 'المهندس للاستشارات',
      costCategory: 'permits_engineering',
      description: 'إشراف هندسي',
      dueDate: '2027-07-07',
      totalAmount: '500000.00',
      paidAmount: '0.00',
      remainingAmount: '500000.00',
      status: 'upcoming',
      paymentMethod: 'CASH',
      rawCostItem: {} as any
    }
  ];

  it('T1. direction in + overdue: when only outflows are overdue, overdue chip count is 0 (old bug: 2)', () => {
    const unified = buildUnifiedAgendaRows(mockInflows, mockOutflows, true);

    // Direction 'in': mockInflows have 0 overdue items
    const inflowCounts = calculateAgendaChipCounts(unified, { direction: 'inflows', todayStr });
    assert.strictEqual(
      inflowCounts.overdue,
      0,
      'When direction is inflows and only outflows are overdue, overdue chip count must strictly be 0'
    );

    // Direction 'outflows': mockOutflows have 2 overdue items
    const outflowCounts = calculateAgendaChipCounts(unified, { direction: 'outflows', todayStr });
    assert.strictEqual(
      outflowCounts.overdue,
      2,
      'When direction is outflows, overdue chip count must reflect the 2 overdue outflows'
    );

    // Direction 'all': across both sets there are 2 overdue items
    const allCounts = calculateAgendaChipCounts(unified, { direction: 'all', todayStr });
    assert.strictEqual(
      allCounts.overdue,
      2,
      'When direction is all, overdue chip count must reflect total overdue items'
    );
  });

  it('T2. count for each chip == length of rows returned for that chip, for every direction (table-driven)', () => {
    const unified = buildUnifiedAgendaRows(mockInflows, mockOutflows, true);
    const directions: AgendaDirectionFilter[] = ['all', 'inflows', 'outflows'];
    const tabs: AgendaMaturityTab[] = ['all', 'overdue', 'due_today', 'due_week', 'upcoming', 'cleared'];

    for (const direction of directions) {
      const counts = calculateAgendaChipCounts(unified, { direction, todayStr });

      for (const tab of tabs) {
        const filteredRows = filterAgendaRows(unified, {
          direction,
          maturityTab: tab,
          todayStr
        });

        assert.strictEqual(
          filteredRows.length,
          counts[tab],
          `Mismatch for direction="${direction}", tab="${tab}": rows length ${filteredRows.length} !== count ${counts[tab]}`
        );
      }
    }
  });

  it('T3. priority sort: overdue, then today, then ascending date (2027-02-07 before 2027-07-07)', () => {
    const testRows: UnifiedAgendaRow[] = [
      {
        id: 'row-cleared',
        direction: 'in',
        dueDate: '2026-01-01',
        party: 'عميل 1',
        projectLabel: 'مشروع أ',
        description: 'دفعة سابقة',
        total: '100000.00',
        paid: '100000.00',
        remaining: '0.00',
        status: 'cleared',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      },
      {
        id: 'row-upcoming-late-date',
        direction: 'out',
        dueDate: '2027-07-07',
        party: 'مقاول كبير',
        projectLabel: 'مشروع أ',
        description: 'مستخلص كبير متأخر تاريخاً',
        costCategory: 'civil_structure',
        costCategoryLabel: 'خرسانات وهيكل إنشائي',
        total: '900000.00',
        paid: '0.00',
        remaining: '900000.00',
        status: 'upcoming',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      },
      {
        id: 'row-upcoming-early-date',
        direction: 'in',
        dueDate: '2027-02-07',
        party: 'عميل صغير',
        projectLabel: 'مشروع ب',
        description: 'قسط عادي',
        total: '50000.00',
        paid: '0.00',
        remaining: '50000.00',
        status: 'upcoming',
        paymentMethod: 'INSTAPAY',
        sourceItem: {} as any
      },
      {
        id: 'row-today',
        direction: 'in',
        dueDate: '2026-04-01',
        party: 'عميل اليوم',
        projectLabel: 'مشروع أ',
        description: 'قسط اليوم',
        total: '200000.00',
        paid: '0.00',
        remaining: '200000.00',
        status: 'due_today',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      },
      {
        id: 'row-overdue',
        direction: 'out',
        dueDate: '2026-03-01',
        party: 'مقاول متأخر',
        projectLabel: 'مشروع أ',
        description: 'مستخلص متأخر',
        costCategory: 'mep_infrastructure',
        costCategoryLabel: 'كهروميكانيك وتأسيسات',
        total: '300000.00',
        paid: '0.00',
        remaining: '300000.00',
        status: 'overdue',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      }
    ];

    const sorted = sortAgendaRows(testRows, 'priority');

    assert.strictEqual(sorted[0].id, 'row-overdue', 'First must be overdue');
    assert.strictEqual(sorted[1].id, 'row-today', 'Second must be due_today');
    assert.strictEqual(
      sorted[3].id,
      'row-upcoming-early-date',
      'Earlier upcoming date precedes later upcoming date even with smaller nominal value'
    );
    assert.strictEqual(
      sorted[4].id,
      'row-upcoming-late-date',
      'Later upcoming date comes last'
    );
    assert.strictEqual(sorted[2].id, 'row-cleared', 'After overdue and today, all statuses sort by ascending date');
  });

  it('T4. footer net = inflow remaining − outflow remaining, exact decimals', () => {
    const unified = buildUnifiedAgendaRows(mockInflows, mockOutflows, true);
    const footer = calculateAgendaFooter(unified);

    // mockInflows remaining: 150000.75 + 50000.50 + 0 = 200001.25
    assert.strictEqual(
      footer.inflowsRemaining.toString(),
      '200001.25',
      'Inflows remaining exact sum'
    );

    // mockOutflows remaining: 75000.20 + 25000.05 + 500000.00 = 600000.25
    assert.strictEqual(
      footer.outflowsRemaining.toString(),
      '600000.25',
      'Outflows remaining exact sum'
    );

    // Net: 200001.25 - 600000.25 = -399999.00
    assert.strictEqual(
      footer.net.toString(),
      '-399999.00',
      'Footer net must match exact decimal difference without JS float errors'
    );
  });

  it('T5. calendar day buckets: a date with one inflow and two overdue outflows yields dots [in, late] and day net correct', () => {
    const targetDate = '2026-10-06';
    const dayRows: UnifiedAgendaRow[] = [
      {
        id: 'in-day',
        direction: 'in',
        dueDate: targetDate,
        party: 'Test Buyer',
        projectLabel: 'عمارة 1',
        description: 'مقدم',
        total: '2083333.00',
        paid: '0.00',
        remaining: '2083333.00',
        status: 'due_today',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      },
      {
        id: 'out-late-1',
        direction: 'out',
        dueDate: targetDate,
        party: 'مقاول خرسانة',
        projectLabel: 'عمارة 1',
        description: 'إنشاءات',
        costCategory: 'civil_structure',
        costCategoryLabel: 'خرسانات وهيكل إنشائي',
        total: '2000000.00',
        paid: '0.00',
        remaining: '2000000.00',
        status: 'overdue',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      },
      {
        id: 'out-late-2',
        direction: 'out',
        dueDate: targetDate,
        party: 'مورد تشطيب',
        projectLabel: 'عمارة 1',
        description: 'بياض ومحارة',
        costCategory: 'finishing_interior',
        costCategoryLabel: 'تشطيبات معمارية وديكور',
        total: '1000000.00',
        paid: '0.00',
        remaining: '1000000.00',
        status: 'overdue',
        paymentMethod: 'CASH',
        sourceItem: {} as any
      }
    ];

    const bucket = getCalendarDayBuckets(dayRows, targetDate, '2026-10-06');

    assert.deepStrictEqual(
      bucket.dots,
      ['in', 'late'],
      'Dots for 1 active inflow and 2 overdue outflows must strictly be [in, late]'
    );

    // Day net: +2083333 - 2000000 - 1000000 = -916667.00
    assert.strictEqual(
      bucket.dayNet.toString(),
      '-916667.00',
      'Day net must be exact decimal signed difference'
    );
    assert.strictEqual(bucket.items.length, 3);
  });
});
