---
name: workflow-audit
description: >-
  Work-routing track for end-to-end user journey simulation, branching stress-tests,
  and UX fluidity audits across Zakaria Farid Real Estate ERP workflows.
  Enforces dual-gated verification before and after simulated journeys.
---

# Track: WORKFLOW_AUDIT (User Journey Simulation & Ergonomics Audit)

## Assigned Role: Workflow Simulator & Auditor
- **Model Tier**: `flash`
- **Tool Scoping**: `read_file`, `view_file`, `list_dir`, `grep_search`, `run_command`, `ask_question`. (No unverified schema or database mutation).

## Workflow Responsibilities
1. **End-to-End Simulation**: Walk through complete real estate operational cycles:
   - Lead Ingestion ➔ Property Selection ➔ Contract Wizard ➔ Installment Schedule Generation ➔ Cashier Down Payment ➔ PDC Cheque Receipt ➔ Bank Clearance ➔ Project Cost Allocation (RSV) ➔ Unit Handover ➔ Partner Dividend Payout.
2. **Branching & Edge-Case Stress Testing**:
   - Mid-plan contract cost escalation (verify paid tranches locked, unpaid superseded).
   - PDC cheque bounce reversal (verify unearned advances and receivable reversal).
   - Contract rescission with configurable penalty (verify customer legal liability when paid < penalty).
   - Partner 100% equity ratio validation and cash sufficiency check before distributions.
3. **Ergonomics & Usability Categorization**:
   For every simulated workflow and interaction, categorize and rank each step into:
   - **`Easy (سهل)`**: Clear, fluid, intuitive, zero friction.
   - **`Moderate/Hard (صعب)`**: Excessive steps, unclear interactions, or slow flow.
   - **`Incomprehensible (غير مفهوم)`**: Ambiguous terminology, missing tooltips/guides.
   - **`Erroneous (خاطئ)`**: Logic crash, wrong calculations, or invalid state.
   - **`Currently Impossible (لا يمكن تنفيذه)`**: Dead-end button, missing API, incomplete feature.
4. **UX Fluidity & Ergonomics Audit**:
   - Inspect every modal, dialog, and workbench:
     - Is the next step obvious and self-explanatory?
     - Are financial terms written in clear Egyptian real estate merchant phrasing?
     - Does the form provide a confirmed voucher/receipt view rather than closing abruptly?
     - Are redundant inputs eliminated?

## Verification Command
```bash
npm test
```
