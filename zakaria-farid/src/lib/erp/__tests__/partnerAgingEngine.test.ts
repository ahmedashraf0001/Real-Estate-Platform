import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePartnerCommitment,
  calculatePartnerAgingReport,
  EvaluatedPartnerCommitment,
  PartnerAgingSummary
} from "../partnerAgingEngine";
import { ERPPartnerCommitment } from "../types";
import { D } from "../math";

describe("Partner Capital Commitments & Milestone Aging Engine", () => {
  const asOf = "2026-09-26";

  const baseCommitment: ERPPartnerCommitment = {
    commitment_id: "comm-101",
    property_id: "prop-andalus",
    partner_name: "أحمد زكريا فريد",
    milestone_name: "صب سقف الدور الثالث",
    milestone_phase: "structural_skeleton",
    committed_amount: "500000.00",
    paid_amount: "0.00",
    due_date: "2026-10-15",
    status: "PENDING"
  };

  describe("1. Individual Commitment Evaluation (evaluatePartnerCommitment)", () => {
    it("evaluates future commitment as CURRENT with 0 days overdue", () => {
      const result = evaluatePartnerCommitment(baseCommitment, asOf);

      assert.equal(result.effectiveStatus, "PENDING");
      assert.equal(result.agingBucket, "CURRENT");
      assert.equal(result.isOverdue, false);
      assert.equal(result.daysOverdue, 0);
      assert.equal(result.committedAmount.toNumber(), 500000);
      assert.equal(result.paidAmount.toNumber(), 0);
      assert.equal(result.unpaidBalance.toNumber(), 500000);
    });

    it("identifies commitments due within 7 days (due soon)", () => {
      const dueSoonComm: ERPPartnerCommitment = {
        ...baseCommitment,
        due_date: "2026-09-30"
      };
      const result = evaluatePartnerCommitment(dueSoonComm, asOf);

      assert.equal(result.effectiveStatus, "PENDING");
      assert.equal(result.agingBucket, "CURRENT");
      assert.equal(result.isDueSoon, true);
      assert.equal(result.isOverdue, false);
    });

    it("evaluates 1-30 days overdue commitment correctly", () => {
      const overdue15Days: ERPPartnerCommitment = {
        ...baseCommitment,
        due_date: "2026-09-11"
      };
      const result = evaluatePartnerCommitment(overdue15Days, asOf);

      assert.equal(result.effectiveStatus, "OVERDUE");
      assert.equal(result.agingBucket, "DAYS_1_30");
      assert.equal(result.isOverdue, true);
      assert.equal(result.daysOverdue, 15);
      assert.equal(result.unpaidBalance.toNumber(), 500000);
    });

    it("evaluates 31-60 days overdue commitment with partial payment", () => {
      const overdue45Days: ERPPartnerCommitment = {
        ...baseCommitment,
        committed_amount: "600000.00",
        paid_amount: "200000.00",
        due_date: "2026-08-12",
        status: "PARTIALLY_PAID"
      };
      const result = evaluatePartnerCommitment(overdue45Days, asOf);

      assert.equal(result.effectiveStatus, "OVERDUE");
      assert.equal(result.agingBucket, "DAYS_31_60");
      assert.equal(result.isOverdue, true);
      assert.equal(result.daysOverdue, 45);
      assert.equal(result.paidAmount.toNumber(), 200000);
      assert.equal(result.unpaidBalance.toNumber(), 400000);
    });

    it("evaluates 60+ days overdue commitment", () => {
      const overdue90Days: ERPPartnerCommitment = {
        ...baseCommitment,
        due_date: "2026-06-28"
      };
      const result = evaluatePartnerCommitment(overdue90Days, asOf);

      assert.equal(result.effectiveStatus, "OVERDUE");
      assert.equal(result.agingBucket, "DAYS_60_PLUS");
      assert.equal(result.isOverdue, true);
      assert.equal(result.daysOverdue, 90);
    });

    it("evaluates fully paid commitment as PAID with zero balance and CURRENT bucket", () => {
      const fullyPaid: ERPPartnerCommitment = {
        ...baseCommitment,
        committed_amount: "500000.00",
        paid_amount: "500000.00",
        due_date: "2026-08-01",
        status: "PAID"
      };
      const result = evaluatePartnerCommitment(fullyPaid, asOf);

      assert.equal(result.effectiveStatus, "PAID");
      assert.equal(result.agingBucket, "CURRENT");
      assert.equal(result.isOverdue, false);
      assert.equal(result.daysOverdue, 0);
      assert.equal(result.unpaidBalance.isZero(), true);
    });

    it("respects CANCELLED status and never marks as overdue", () => {
      const cancelled: ERPPartnerCommitment = {
        ...baseCommitment,
        due_date: "2026-01-01",
        status: "CANCELLED"
      };
      const result = evaluatePartnerCommitment(cancelled, asOf);

      assert.equal(result.effectiveStatus, "CANCELLED");
      assert.equal(result.agingBucket, "CURRENT");
      assert.equal(result.isOverdue, false);
      assert.equal(result.daysOverdue, 0);
    });
  });

  describe("2. Portfolio-Wide Aging Report (calculatePartnerAgingReport)", () => {
    it("renders honest zero states when commitments array is empty", () => {
      const report = calculatePartnerAgingReport([], asOf);

      assert.equal(report.totalCommitmentsCount, 0);
      assert.equal(report.openCommitmentsCount, 0);
      assert.equal(report.overdueCommitmentsCount, 0);
      assert.equal(report.totalCommitted.toNumber(), 0);
      assert.equal(report.totalPaid.toNumber(), 0);
      assert.equal(report.totalOutstanding.toNumber(), 0);
      assert.equal(report.totalOverdue.toNumber(), 0);
      assert.equal(report.agingBuckets.current.count, 0);
      assert.equal(report.agingBuckets.days1_30.count, 0);
      assert.equal(report.agingBuckets.days31_60.count, 0);
      assert.equal(report.agingBuckets.days60Plus.count, 0);
      assert.deepEqual(report.byPartner, {});
      assert.deepEqual(report.byProperty, {});
    });

    it("correctly aggregates mixed commitments across partners and properties", () => {
      const commitments: ERPPartnerCommitment[] = [
        {
          commitment_id: "c1",
          property_id: "prop-1",
          partner_name: "أحمد زكريا فريد",
          milestone_name: "سقف الدور الرابع",
          committed_amount: "500000.00",
          paid_amount: "0.00",
          due_date: "2026-10-30",
          status: "PENDING"
        },
        {
          commitment_id: "c2",
          property_id: "prop-1",
          partner_name: "أحمد زكريا فريد",
          milestone_name: "سقف الدور الثالث",
          committed_amount: "300000.00",
          paid_amount: "100000.00",
          due_date: "2026-09-11",
          status: "PARTIALLY_PAID"
        },
        {
          commitment_id: "c3",
          property_id: "prop-2",
          partner_name: "د. محمد إبراهيم",
          milestone_name: "أعمال المحارة والواجهات",
          committed_amount: "400000.00",
          paid_amount: "0.00",
          due_date: "2026-08-17",
          status: "PENDING"
        },
        {
          commitment_id: "c4",
          property_id: "prop-2",
          partner_name: "د. محمد إبراهيم",
          milestone_name: "الهيكل الخرساني للبدروم",
          committed_amount: "250000.00",
          paid_amount: "0.00",
          due_date: "2026-07-13",
          status: "PENDING"
        },
        {
          commitment_id: "c5",
          property_id: "prop-1",
          partner_name: "أحمد زكريا فريد",
          milestone_name: "شراء مصعد إضافي",
          committed_amount: "200000.00",
          paid_amount: "0.00",
          due_date: "2026-05-01",
          status: "CANCELLED"
        }
      ];

      const report = calculatePartnerAgingReport(commitments, asOf);

      assert.equal(report.totalCommitted.toNumber(), 1450000);
      assert.equal(report.totalPaid.toNumber(), 100000);
      assert.equal(report.totalOutstanding.toNumber(), 1350000);
      assert.equal(report.totalOverdue.toNumber(), 850000);

      assert.equal(report.totalCommitmentsCount, 5);
      assert.equal(report.openCommitmentsCount, 4);
      assert.equal(report.overdueCommitmentsCount, 3);

      assert.equal(report.agingBuckets.current.count, 1);
      assert.equal(report.agingBuckets.current.totalAmount.toNumber(), 500000);

      assert.equal(report.agingBuckets.days1_30.count, 1);
      assert.equal(report.agingBuckets.days1_30.totalAmount.toNumber(), 200000);

      assert.equal(report.agingBuckets.days31_60.count, 1);
      assert.equal(report.agingBuckets.days31_60.totalAmount.toNumber(), 400000);

      assert.equal(report.agingBuckets.days60Plus.count, 1);
      assert.equal(report.agingBuckets.days60Plus.totalAmount.toNumber(), 250000);

      const partnerA = report.byPartner["أحمد زكريا فريد"];
      assert.ok(partnerA);
      assert.equal(partnerA.totalCommitted.toNumber(), 800000);
      assert.equal(partnerA.totalPaid.toNumber(), 100000);
      assert.equal(partnerA.totalOutstanding.toNumber(), 700000);
      assert.equal(partnerA.totalOverdue.toNumber(), 200000);
      assert.equal(partnerA.overdueCount, 1);

      const partnerB = report.byPartner["د. محمد إبراهيم"];
      assert.ok(partnerB);
      assert.equal(partnerB.totalCommitted.toNumber(), 650000);
      assert.equal(partnerB.totalOutstanding.toNumber(), 650000);
      assert.equal(partnerB.totalOverdue.toNumber(), 650000);
      assert.equal(partnerB.overdueCount, 2);

      const prop1 = report.byProperty["prop-1"];
      assert.ok(prop1);
      assert.equal(prop1.totalCommitted.toNumber(), 800000);
      assert.equal(prop1.totalOutstanding.toNumber(), 700000);

      const prop2 = report.byProperty["prop-2"];
      assert.ok(prop2);
      assert.equal(prop2.totalCommitted.toNumber(), 650000);
      assert.equal(prop2.totalOutstanding.toNumber(), 650000);
    });
  });

  describe("3. Strict Negative Invariants", () => {
    it("never computes automatic equity dilution or penalty deductions", () => {
      const delinquentComm: ERPPartnerCommitment = {
        commitment_id: "comm-delinquent",
        property_id: "prop-1",
        partner_name: "شريك متأخر",
        milestone_name: "صب الدور الأرضي",
        committed_amount: "1000000.00",
        paid_amount: "0.00",
        due_date: "2025-01-01",
        status: "PENDING"
      };

      const evaluated = evaluatePartnerCommitment(delinquentComm, asOf);
      const report = calculatePartnerAgingReport([delinquentComm], asOf);

      assert.equal(evaluated.effectiveStatus, "OVERDUE");
      assert.equal(evaluated.agingBucket, "DAYS_60_PLUS");

      assert.equal((evaluated as any).penaltyAmount, undefined);
      assert.equal((evaluated as any).equityDilutionPercent, undefined);
      assert.equal((evaluated as any).reallocatedUnits, undefined);

      assert.equal((report as any).enforcementActions, undefined);
      assert.equal((report as any).dilutedShares, undefined);
    });
  });
});
