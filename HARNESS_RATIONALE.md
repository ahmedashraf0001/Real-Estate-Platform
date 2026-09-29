# Harness Rationale: Zakaria Farid Real Estate ERP (v3.0.0)

## 1. Track Derivation & Risk Architecture

The engineering harness is derived directly from codebase reality, Egyptian real estate statutory accounting rules, FIN-OS design invariants, and user-confirmed operational requirements.

| Track Name | Risk Classification | Assigned Role | Verification Command | Pre-Gate | Post-Gate | Breaker Ceiling |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **`WORKFLOW_AUDIT`** | Dual-Gated (Non-Invariant) | Workflow Simulator & Auditor | `npm test && npx tsc --noEmit` | Required | Required | 3 (hard ceiling) |
| **`FINANCIAL_CORE`** | Dual-Gated (Hard Invariants) | Financial Calculation Engineer | `npm test && npx tsc --noEmit` | Required | Required | 3 (hard ceiling) |
| **`SURFACE_UI`** | Single-Gated (Low Risk) | Executive UI/UX Engineer | `npx tsc --noEmit` | N/A | Required | 5 |
| **`DATABASE_SCHEMA`** | Dual-Gated (Hard Invariants) | Database Custodian | `npx tsc --noEmit && npm test` | Required | Required | 3 (hard ceiling) |

### Dual-Gated Non-Invariant Track Provenance: `WORKFLOW_AUDIT`
- **Classification**: `dual-gated: non-invariant`.
- **Human's Stated Reason**: The business owner explicitly mandated an intensive automated simulation and stress-testing program to audit calculation precision, verify user journey fluidity, and rank UI ergonomics (Easy/Hard/Incomprehensible/Erroneous/Impossible) before production deployment. Dual-gating ensures every simulated journey is pre-audited and post-verified.

---

## 2. Hard Invariants & Provenance Record

| Invariant Code | Title | Provenance Tag | Enforcing Track | Mechanical Enforcement Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **`INV-0.5`** | Zero Floating-Point Currency Math (`BigInt Decimal`) | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` + `.git/hooks/pre-commit` |
| **`INV-4.1`** | Double-Entry Balance ($\Sigma Dr == \Sigma Cr$) | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-0.6`** | Schedule Immutability Trigger Contract | `[code-evidence + confirmed]` | `DATABASE_SCHEMA` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-4.9`** | Paid Tranches Untouched During Escalation | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-4.10`** | Configurable Rescission Penalty & Forfeiture Floor | `[user-confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-4.17`** | Model B Handover Net Recognition | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-14.B`** | 100% Partner Equity & Cash-Gated Payout | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-FOUNDER-PERMANENCE`** | Mandatory Founder Equity Retention | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-0.9`** | Closed Accounting Period Lock | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-SIM`** | Automated Simulation & Ergonomics Ranking | `[user-confirmed]` | `WORKFLOW_AUDIT` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-SEC-RLS`** | 16-Table RLS Lockdown & Anon Isolation | `[code-evidence + confirmed]` | `DATABASE_SCHEMA` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-COST-ATOMIC`** | Atomic Dual-Write for Site Expenses | `[near-miss-derived]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-NO-SYNTHETIC-DATA`** | Zero Fabricated Multipliers in Dashboards | `[near-miss-derived]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-NO-COGS-GUESSING`** | Handover Cost Allocation Mandatory | `[near-miss-derived]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-TRUE-LIQUID-CASH`** | Available Cash Verified Liquid Trial Balance | `[near-miss-derived]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-DUAL-TIER-DROPDOWN`** | Dual-Tier Dropdown Native Filter vs Custom | `[user-confirmed]` | `SURFACE_UI` | `.agents/scripts/verify_gates.sh` (`npx tsc --noEmit`) |
| **`INV-CURATED-PALETTES`** | 8 Curated Presets Contrast Protection | `[user-confirmed]` | `SURFACE_UI` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-FINOS-DESIGN-SYSTEM`** | FIN-OS Strict Design System Invariants | `[code-evidence + confirmed]` | `SURFACE_UI` | `.agents/scripts/verify_gates.sh` (`npx tsc --noEmit` & layout tests) |
| **`INV-AP-PRIORITY-SORT`** | AP 4-Tier Deterministic Priority Sorting & Inspection | `[code-evidence + confirmed]` | `FINANCIAL_CORE` & `SURFACE_UI` | `.agents/scripts/verify_gates.sh` (`npm test`) |

---

## 3. Complexity Budget Pass (Decision Procedure 4h)

- **Total Tracks Derived**: 4 (`WORKFLOW_AUDIT`, `FINANCIAL_CORE`, `SURFACE_UI`, `DATABASE_SCHEMA`).
- **Total Roles Derived**: 4.
- **Complexity Assessment**:
  - The project comfortably satisfies the single-project threshold ($\le 8$ tracks, $\le 5$ roles).
  - Attempted consolidation: Considered merging `WORKFLOW_AUDIT` and `FINANCIAL_CORE`, but kept separate because `WORKFLOW_AUDIT` is an exploratory end-to-end user-journey simulation and ergonomics track focusing on sequential branching, UI flow ergonomics, and extreme system stress testing, whereas `FINANCIAL_CORE` is a strict, localized mathematical and statutory calculation engine.
  - Considered merging `SURFACE_UI` and `WORKFLOW_AUDIT`, but kept separate because `SURFACE_UI` is single-gated (cosmetic/presentation edits) while `WORKFLOW_AUDIT` is dual-gated (verifies end-to-end accounting state continuity and workflow usability).

---

## 4. Mechanical Enforcement Protocol Ownership Mapping (Decision Procedure 4i)

Every Hard Invariant and dual-gated track is mechanically backed by:
1. **Host Lifecycle Hook**: `.agents/hooks.json` invoking `.agents/scripts/verify_gates.sh` on git commit tool executions.
2. **Git Pre-Commit Hook**: `.git/hooks/pre-commit` running `bash .agents/scripts/verify_gates.sh` before allowing commits. Exits with code `2` on invariant or typecheck failure (fail-closed).
3. **Automated Gatekeeper (`.agents/scripts/verify_gates.sh`)**:
   - **Gate 1 (Global Baseline)**: `npx tsc --noEmit` (TypeScript strict typecheck executed on all commits).
   - **Gate 2 (Path-Aware Financial Invariants & Security Suite)**: `npm test` (`npx tsx --test src/lib/erp/__tests__/**/*.test.ts` - verifying 244 tests across 66 suites covering all financial invariants, notifications, payables sorting, simulations, and RLS security).
     - *Path-Aware Filtering*: Gate 2 is triggered whenever staged changes touch domain, financial, notification, payables, or security paths (`src/lib/erp/`, `supabase/`, `accounting/`, `notificationEngine.ts`, `propertyCostEngine.ts`, `canonicalMetrics.ts`, `math.ts`, `ledger.ts`, `invariants.ts`, `erpPalettePresets.ts`). For purely cosmetic/UI changes (`SURFACE_UI`), Gate 2 is bypassed so UI edits are not blocked by heavy invariant test runs.
     - *Inner vs. Outer Loop*: During work orders, the `SURFACE_UI` subagent verifies its changes using `npx tsc --noEmit`. The git pre-commit hook serves as the fail-closed outer barrier for repository integrity.
4. **Zero Absolute Paths & Strict Portability**:
   All scripts derive paths dynamically using `REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"` and `APP_DIR="${REPO_ROOT}/zakaria-farid"`. No hardcoded `/home/` or user paths exist.

---

## 5. Tool Scope Justifications (Decision Procedure 4f)

- **`Workflow Simulator & Auditor`**:
  - `read_file`, `view_file`, `list_dir`, `grep_search`: Inspect UI views, state hooks, and database schemas (Justification: 4a self-verification of multi-step user journeys and UI components).
  - `run_command`: Execute test suites and simulated dry-run journeys (Justification: 4a execution of `npm test` and stress simulations).
  - `ask_question`: Escalate discovered UX friction, confusing workflows, or ambiguous requirements to user (Justification: 4a interactive resolution of ergonomics blockers).
- **`Financial Calculation Engineer`**:
  - `read_file`, `view_file`, `replace_file_content`, `write_to_file`: Edit calculation engines in `src/lib/erp/` (Justification: 4a domain calculation refinement).
  - `run_command`: Run `npm test` and `npx tsc --noEmit` to verify mathematical exactness (Justification: 4a self-verification of BigInt math, payables priority sorting, notifications, and all invariants).
- **`Executive UI/UX Engineer`**:
  - `read_file`, `view_file`, `replace_file_content`, `write_to_file`: Edit UI components in `src/components/admin/erp/v2/` and `src/app/fin-os/` (Justification: 4a frontend component authoring).
  - `run_command`: Run `npx tsc --noEmit` to verify JSX/TSX syntax. (Shell and DB access strictly restricted).
- **`Database Custodian`**:
  - `read_file`, `view_file`, `replace_file_content`, `write_to_file`: Create and edit SQL migrations in `supabase/migrations/` (Justification: 4a schema and trigger maintenance).
  - `call_mcp_tool` (Supabase MCP): Apply migrations, verify RLS advisors, and test triggers (Justification: 4a database inspection and migration verification).

---

## 6. Knowledge Graph Architecture & Continuous AST Sync (`graphify`)
- **Querying & Topology Search**:
  - `graphify query "<question>"` is provisioned as the primary architectural discovery tool for the orchestrator and all specialized subagents (Justification: 4a dependency and topology inspection prior to modification, with zero LLM token cost).
  - Traces AST relationships (imports, calls, community clusters) across ~60,000 nodes in milliseconds.
- **Continuous Synchronization**:
  - Backed mechanically by `.agents/scripts/sync_graph.sh` and `verify_gates.sh --sync-graph`.
  - Incremental AST extraction updates `graphify-out/graph.json` upon task completion in ~9 seconds, keeping the repository graph perpetually fresh.

---

## 7. Native Antigravity Re-Anchoring & Host Purge

- **Pure Antigravity Primitives**:
  - Subagent Delegation: Exclusively `invoke_subagent` with `TypeName: "self"`, assigned specialist `Role`, and strictly `Model: "flash"`.
  - Subagent Communication: Native `send_message` with unique `conversationId`.
  - Lifecycle Management: Native `manage_subagents`.
  - Interactive Resolution: Native `ask_question` modal blocks for human clarification and circuit-breaker escalations.
  - Asynchronous Tasks & Reminders: Native `schedule` and background tasks with reactive wakeups (no polling loops).
- **Permanent Pro-Tier Ban**: The `pro` model is banned across all tracks in favor of `flash`. Current Flash models demonstrate unmatched instruction adherence, zero-regression tool reliability, and instant execution speeds.
- **Preserved Core Protections**: Zero Direct Application Writes for the orchestrator, dual-gated accounting invariants (`INV-0.5` through `INV-SEC-RLS`, `INV-COST-ATOMIC` through `INV-AP-PRIORITY-SORT`), git pre-commit mechanical enforcement, circuit breaker retry ceilings ($\le 3$), and automated AST knowledge graph sync (`graphify`).
