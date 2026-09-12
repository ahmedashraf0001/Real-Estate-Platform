# Harness Rationale: Zakaria Farid Real Estate ERP (v2.1.0)

## 1. Track Derivation & Risk Architecture

The harness is derived from codebase reality, Egyptian real estate domain rules, and user-confirmed operational requirements.

| Track Name | Risk Classification | Assigned Role | Verification Command | Pre-Gate | Post-Gate | Breaker Ceiling |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **`WORKFLOW_AUDIT`** | Dual-Gated (Non-Invariant) | Workflow Simulator & Auditor | `npm test` & scenario simulation | Required | Required | 3 (hard ceiling) |
| **`FINANCIAL_CORE`** | Dual-Gated (Hard Invariants) | Financial Calculation Engineer | `npm test` & `npx tsc --noEmit` | Required | Required | 3 (hard ceiling) |
| **`SURFACE_UI`** | Single-Gated (Low Risk) | Executive UI/UX Engineer | `npx tsc --noEmit` | N/A | Required | 5 |
| **`DATABASE_SCHEMA`** | Dual-Gated (Hard Invariants) | Database Custodian | `npx tsc --noEmit` & SQL check | Required | Required | 3 (hard ceiling) |

### Dual-Gated Non-Invariant Track Provenance: `WORKFLOW_AUDIT`
- **Classification**: `dual-gated: non-invariant`.
- **Human's Stated Reason**: The project has not yet been comprehensively tested or verified in production. The business owner explicitly mandated an intensive automated simulation and stress-testing program to audit calculation precision, verify user journey fluidity, and rank UI ergonomics (Easy/Hard/Incomprehensible/Erroneous/Impossible) before production deployment. Dual-gating ensures every simulated journey is pre-audited and post-verified.

---

## 2. Hard Invariants & Provenance Record

| Invariant Code | Title | Provenance Tag | Enforcing Track | Mechanical Enforcement Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **`INV-0.5`** | Zero Floating-Point Math (`BigInt Decimal`) | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` + `.git/hooks/pre-commit` |
| **`INV-4.1`** | Double-Entry Balance ($\Sigma Dr == \Sigma Cr$) | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-0.6`** | Schedule Immutability Trigger Contract | `[code-evidence + confirmed]` | `DATABASE_SCHEMA` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-4.9`** | Paid Tranches Untouched During Escalation | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-4.10`** | Configurable Rescission Penalty & Forfeiture Floor | `[user-confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-14.B`** | 100% Partner Equity & Cash-Gated Payout | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-0.9`** | Closed Accounting Period Lock | `[code-evidence + confirmed]` | `FINANCIAL_CORE` | `.agents/scripts/verify_gates.sh` (`npm test`) |
| **`INV-SIM`** | Automated Simulation & Ergonomics Ranking | `[user-confirmed]` | `WORKFLOW_AUDIT` | `.agents/scripts/verify_gates.sh` (`npm test`) |

---

## 3. Complexity Budget Pass (Decision Procedure 4h)

- **Total Tracks Derived**: 4 (`WORKFLOW_AUDIT`, `FINANCIAL_CORE`, `SURFACE_UI`, `DATABASE_SCHEMA`).
- **Total Roles Derived**: 4.
- **Complexity Assessment**:
  - The project easily passes the single-project threshold ($\le 8$ tracks, $\le 5$ roles).
  - Attempted consolidation: Considered merging `WORKFLOW_AUDIT` and `FINANCIAL_CORE`, but kept separate because `WORKFLOW_AUDIT` is an exploratory end-to-end user-journey simulation and ergonomics track focusing on sequential branching, UI flow ergonomics, and extreme system stress testing, whereas `FINANCIAL_CORE` is a strict, localized mathematical and statutory calculation engine.
  - Considered merging `SURFACE_UI` and `WORKFLOW_AUDIT`, but kept separate because `SURFACE_UI` is single-gated (cosmetic/presentation edits) while `WORKFLOW_AUDIT` is dual-gated (verifies end-to-end accounting state continuity and workflow usability).

---

## 4. Mechanical Enforcement Protocol Ownership Mapping (Decision Procedure 4i)

Every Hard Invariant and dual-gated track is mechanically backed by:
1. **Host Lifecycle Hook**: `.agents/hooks.json` invoking `.agents/scripts/verify_gates.sh` on git commit and verification tool executions.
2. **Git Pre-Commit Hook**: `.git/hooks/pre-commit` running `bash .agents/scripts/verify_gates.sh` before allowing commits. Exits with code `2` on invariant or typecheck failure (fail-closed).
3. **Automated Gatekeeper (`.agents/scripts/verify_gates.sh`)**:
   - **Gate 1 (Global Baseline)**: `npx tsc --noEmit` (TypeScript strict typecheck executed on all commits).
   - **Gate 2 (Path-Aware Financial Invariants)**: `npm test` (`npx tsx --test src/lib/erp/__tests__/**/*.test.ts` - verifying all 26 financial invariants).
     - *Path-Aware Filtering*: Gate 2 is triggered whenever staged changes touch domain or financial paths (`src/lib/erp/`, `supabase/`, `accounting/`). For purely cosmetic/UI changes (`SURFACE_UI`), Gate 2 is bypassed so UI edits are not blocked by invariant test runs.
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
  - `run_command`: Run `npm test` and `npx tsc --noEmit` to verify mathematical exactness (Justification: 4a self-verification of BigInt math and all 26 invariants).
- **`Executive UI/UX Engineer`**:
  - `read_file`, `view_file`, `replace_file_content`, `write_to_file`: Edit UI components in `src/components/` and `src/app/` (Justification: 4a frontend component authoring).
  - `run_command`: Run `npx tsc --noEmit` to verify JSX/TSX syntax. (Shell and DB access strictly restricted).
- **`Database Custodian`**:
  - `read_file`, `view_file`, `replace_file_content`, `write_to_file`: Create and edit SQL migrations in `supabase/migrations/` (Justification: 4a schema and trigger maintenance).
  - `call_mcp_tool` (Supabase MCP): Apply migrations, verify RLS advisors, and test triggers (Justification: 4a database inspection and migration verification).

---

## 6. Knowledge Graph Architecture & Continuous AST Sync (`graphify`)
- **Querying & Topology Search**:
  - `graphify query "<question>"` is provisioned as the primary architectural discovery tool for the orchestrator and all specialized subagents (Justification: 4a dependency and topology inspection prior to modification, with zero LLM token cost).
  - Traces AST relationships (imports, calls, community clusters) across 12,000+ nodes in milliseconds.
- **Continuous Synchronization**:
  - Backed mechanically by `.agents/scripts/sync_graph.sh` and `verify_gates.sh --sync-graph`.
  - Incremental AST extraction updates `graphify-out/graph.json` upon task completion in ~9 seconds, keeping the repository graph perpetually fresh.
