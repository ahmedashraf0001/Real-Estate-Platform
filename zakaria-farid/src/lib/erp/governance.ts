/**
 * Zakaria Farid Real Estate ERP — Maker-Checker Governance & Approvals
 * Enforces Spec Section 8: Maker-Checker Threshold Matrix.
 */

import { D, Decimal, generateUUID } from './math';
import { ERPMakerCheckerRequest } from './types';

export interface ApprovalRule {
  mutation_type: string;
  min_amount?: Decimal;
  max_amount?: Decimal;
  primary_role: string;
  secondary_role?: string;
  description: string;
}

export const MAKER_CHECKER_RULES: ApprovalRule[] = [
  {
    mutation_type: 'RESCISSION_REFUND_LOW',
    min_amount: D('0.00'),
    max_amount: D('100000.00'),
    primary_role: 'FINANCE_MANAGER',
    description: 'Rescission refunds up to 100,000 EGP'
  },
  {
    mutation_type: 'RESCISSION_REFUND_MED',
    min_amount: D('100000.01'),
    max_amount: D('500000.00'),
    primary_role: 'CHIEF_FINANCIAL_OFFICER',
    description: 'Rescission refunds between 100,000 and 500,000 EGP'
  },
  {
    mutation_type: 'RESCISSION_REFUND_HIGH',
    min_amount: D('500000.01'),
    primary_role: 'CHIEF_FINANCIAL_OFFICER',
    secondary_role: 'MANAGING_DIRECTOR',
    description: 'Rescission refunds exceeding 500,000 EGP (Dual Approval Required)'
  },
  {
    mutation_type: 'CONTRACT_ESCALATION',
    primary_role: 'COMMERCIAL_DIRECTOR',
    secondary_role: 'CHIEF_FINANCIAL_OFFICER',
    description: 'Price escalation amendments (Commercial Director + CFO Dual Sign-off)'
  },
  {
    mutation_type: 'PERIOD_LOCK',
    primary_role: 'CHIEF_FINANCIAL_OFFICER',
    description: 'Fiscal period lock/close governance'
  },
  {
    mutation_type: 'MANUAL_JOURNAL_HIGH',
    min_amount: D('250000.00'),
    primary_role: 'CHIEF_FINANCIAL_OFFICER',
    secondary_role: 'MANAGING_DIRECTOR',
    description: 'Manual adjusting journal entries > 250,000 EGP'
  }
];

export class GovernanceEngine {
  /**
   * Determine required approvers for a given mutation type and amount.
   */
  static evaluateRequiredApprovers(mutationType: string, amount?: string | Decimal): {
    primary_role: string;
    secondary_role?: string;
    description: string;
  } {
    const amt = amount ? D(amount) : D(0);

    if (mutationType.startsWith('RESCISSION')) {
      if (amt.lessThanOrEqual('100000.00')) {
        return MAKER_CHECKER_RULES[0];
      } else if (amt.lessThanOrEqual('500000.00')) {
        return MAKER_CHECKER_RULES[1];
      } else {
        return MAKER_CHECKER_RULES[2];
      }
    }

    const matched = MAKER_CHECKER_RULES.find(r => r.mutation_type === mutationType);
    if (matched) {
      return matched;
    }

    return {
      primary_role: 'FINANCE_MANAGER',
      description: 'Standard operational approval'
    };
  }

  /**
   * Create a Maker-Checker Pending Request.
   */
  static createApprovalRequest(
    mutationType: string,
    requestedBy: string,
    payload: Record<string, unknown>,
    amount?: string | Decimal
  ): ERPMakerCheckerRequest {
    const reqInfo = this.evaluateRequiredApprovers(mutationType, amount);

    return {
      request_id: generateUUID(),
      mutation_type: mutationType,
      amount: amount ? D(amount).toFixed(2) : undefined,
      requested_by: requestedBy,
      primary_approver: reqInfo.primary_role,
      secondary_approver: reqInfo.secondary_role,
      status: 'Pending',
      payload,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Sign off on a Maker-Checker Request.
   */
  static approveRequest(
    request: ERPMakerCheckerRequest,
    approverRole: string
  ): ERPMakerCheckerRequest {
    // If secondary approver required and not yet satisfied
    if (request.secondary_approver && approverRole === request.primary_approver) {
      return {
        ...request,
        status: 'Pending',
        payload: {
          ...request.payload,
          primary_approved_at: new Date().toISOString(),
          primary_approved_by: approverRole
        }
      };
    }

    return {
      ...request,
      status: 'Approved',
      payload: {
        ...request.payload,
        fully_approved_at: new Date().toISOString(),
        final_approver: approverRole
      }
    };
  }
}
