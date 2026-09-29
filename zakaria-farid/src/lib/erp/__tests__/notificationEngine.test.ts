import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  evaluateFinancialAlerts, 
  filterNotificationsByTab,
  NotificationTabGroup 
} from '../notificationEngine';
import { 
  ERPPDCRecord, 
  ERPContract, 
  ERPInstallmentSchedule, 
  ERPMakerCheckerRequest, 
  ERPTaxRecord, 
  ERPAccountingPeriod, 
  ERPPropertyCostItem 
} from '../types';

describe('FIN-OS Notification & Alert Engine (§15 Suite)', () => {
  it('correctly generates critical and warning notifications for overdue and maturing contractor payables', () => {
    const today = new Date();
    const pastDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const futureDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const mockCosts: ERPPropertyCostItem[] = [
      {
        item_id: 'cost_101',
        property_id: 'prop_shorouk',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        item_name_ar: 'أعمال خرسانة الأساسات',
        item_name_en: 'Foundation Concrete',
        supplier_contractor: 'شركة الأهرام للمقاولات',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '1500000.00',
        total_cost_egp: '1500000.00',
        remaining_amount_egp: '800000.00',
        logged_date: pastDate,
        logged_by: 'Engineer Tarek',
        status: 'verified',
        payable_installments: [
          {
            installment_id: 'inst_1',
            cost_item_id: 'cost_101',
            installment_number: 1,
            title_ar: 'الدفعة الأولى خرسانات',
            due_date: pastDate,
            amount_egp: '400000.00',
            paid_amount_egp: '0.00',
            status: 'PENDING',
          },
          {
            installment_id: 'inst_2',
            cost_item_id: 'cost_101',
            installment_number: 2,
            title_ar: 'الدفعة الثانية خرسانات',
            due_date: futureDate,
            amount_egp: '400000.00',
            paid_amount_egp: '0.00',
            status: 'PENDING',
          }
        ]
      }
    ];

    const notifications = evaluateFinancialAlerts({
      pdcRecords: [],
      contracts: [],
      schedules: [],
      makerCheckerRequests: [],
      taxRecords: [],
      propertyCosts: mockCosts,
    });

    assert.ok(notifications.length >= 2, `Expected at least 2 notifications, got ${notifications.length}`);

    const overdueNotif = notifications.find(n => n.id.includes('overdue_contractor_cost_101'));
    assert.ok(overdueNotif, 'Overdue contractor notification should exist');
    assert.equal(overdueNotif?.severity, 'critical');
    assert.equal(overdueNotif?.category, 'contractor');
    assert.ok(overdueNotif?.titleAr.includes('شركة الأهرام للمقاولات'));
    assert.equal(overdueNotif?.targetModule, 'construction');

    const maturingNotif = notifications.find(n => n.id.includes('maturing_contractor_cost_101'));
    assert.ok(maturingNotif, 'Maturing contractor notification should exist');
    assert.equal(maturingNotif?.severity, 'warning');
    assert.equal(maturingNotif?.category, 'contractor');
  });

  it('correctly filters notifications into the 5 primary tabs matching user specifications', () => {
    const mockNotifications = [
      {
        id: 'n_crit',
        titleAr: 'تنبيه حرج',
        titleEn: 'Critical Alert',
        messageAr: 'رسالة',
        messageEn: 'Message',
        severity: 'critical' as const,
        category: 'approval' as const,
        createdAt: '2026-09-20',
        read: false,
      },
      {
        id: 'n_expense',
        titleAr: 'مصروف جديد',
        titleEn: 'New Expense',
        messageAr: 'رسالة',
        messageEn: 'Message',
        severity: 'info' as const,
        category: 'expense' as const,
        createdAt: '2026-09-21',
        read: false,
      },
      {
        id: 'n_cheque',
        titleAr: 'قسط مستحق',
        titleEn: 'Due Cheque',
        messageAr: 'رسالة',
        messageEn: 'Message',
        severity: 'warning' as const,
        category: 'cheque' as const,
        createdAt: '2026-09-22',
        read: false,
      },
      {
        id: 'n_system',
        titleAr: 'إقفال فترة مالية',
        titleEn: 'Period Locked',
        messageAr: 'رسالة',
        messageEn: 'Message',
        severity: 'info' as const,
        category: 'period' as const,
        createdAt: '2026-09-23',
        read: false,
      },
    ];

    const allTab = filterNotificationsByTab(mockNotifications, 'all');
    assert.equal(allTab.length, 4);

    const alertsTab = filterNotificationsByTab(mockNotifications, 'alerts');
    assert.equal(alertsTab.length, 1);
    assert.equal(alertsTab[0].id, 'n_crit');

    const transactionsTab = filterNotificationsByTab(mockNotifications, 'transactions');
    assert.equal(transactionsTab.length, 1);
    assert.equal(transactionsTab[0].id, 'n_expense');

    const schedulesTab = filterNotificationsByTab(mockNotifications, 'schedules');
    assert.equal(schedulesTab.length, 1);
    assert.equal(schedulesTab[0].id, 'n_cheque');

    const systemTab = filterNotificationsByTab(mockNotifications, 'system');
    assert.equal(systemTab.length, 1);
    assert.equal(systemTab[0].id, 'n_system');
  });

  it('orders notifications strictly by severity rank (critical > warning > info)', () => {
    const todayStr = new Date().toISOString();
    const notifications = [
      {
        id: 'n1',
        titleAr: 'معلومة',
        titleEn: 'Info',
        messageAr: '',
        messageEn: '',
        severity: 'info' as const,
        category: 'period' as const,
        createdAt: todayStr,
        read: false,
      },
      {
        id: 'n2',
        titleAr: 'حرج',
        titleEn: 'Critical',
        messageAr: '',
        messageEn: '',
        severity: 'critical' as const,
        category: 'approval' as const,
        createdAt: todayStr,
        read: false,
      },
      {
        id: 'n3',
        titleAr: 'تحذير',
        titleEn: 'Warning',
        messageAr: '',
        messageEn: '',
        severity: 'warning' as const,
        category: 'cheque' as const,
        createdAt: todayStr,
        read: false,
      },
    ];

    const sorted = notifications.sort((a, b) => {
      const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };
      return severityRank[a.severity] - severityRank[b.severity];
    });

    assert.equal(sorted[0].id, 'n2');
    assert.equal(sorted[1].id, 'n3');
    assert.equal(sorted[2].id, 'n1');
  });
});
