# Zakaria Farid Real Estate ERP — Multi-Agent Engineering Harness (v3.0.0)

## Delegation & Execution Policy
Delegation hierarchy, direct edit tiers (Tier A vs Tier B), subagent leaf execution, and brief templates follow the authoritative Delegation Policy in Section 6 of `/home/lyr1csan/project/AGENTS.md#6-delegation-policy`. (Applies to: all)
- When work qualifies as Tier A (at most 2 files, no codebase exploration, diff of about 40 lines or fewer, at most one `npx tsc --noEmit` and one targeted test run), the orchestrator edits directly in the root session.
- When work qualifies as Tier B (exceeds Tier A limits, needs >15k disposable tokens, repeated verify-and-fix cycles, or browser automation), the orchestrator delegates to ONE leaf subagent using the brief template with the `ROLE: LEAF` marker.
- Leaf subagents execute directly and do not call `invoke_subagent`.

---

## 1. Triage & Routing Matrix

| Task Characteristics | Target Track | Assigned Subagent Role | Model Policy | Gating |
| :--- | :--- | :--- | :---: | :---: |
| End-to-end user journeys, branch testing, UI ergonomics & flow audits | `WORKFLOW_AUDIT` | `Workflow Simulator & Auditor` | `flash` | Dual-Gated |
| Double-entry journals, math, calculations, revenue recognition, partner splits, canonical metrics | `FINANCIAL_CORE` | `Financial Calculation Engineer` | `flash` | Dual-Gated |
| FIN-OS workstation views, public catalog, responsive styling, RTL localization, shared primitives | `SURFACE_UI` | `Executive UI/UX Engineer` | `flash` | Single-Gated |
| Supabase migrations, RLS policies, trigger immutability, performance indexes | `DATABASE_SCHEMA` | `Database Custodian` | `flash` | Dual-Gated |

---

## 1.5. Codebase Querying & Topology Search Protocol (`graphify`)
To ensure rapid, accurate structural exploration and prevent blind file browsing or excessive token expenditure:
1. **Primary Exploration Tool**: Orchestrator and specialized subagents MUST query the knowledge graph first for codebase architecture, module dependencies, caller/callee paths, and symbol topology:
   ```bash
   graphify query "<question>"
   ```
2. **Deep-Dive Traversal**: Use `--dfs` for tracing execution call stacks (`graphify query "<question>" --dfs`) or `graphify path "<source>" "<target>"` for shortest paths between concepts.
3. **Targeted Fallback**: Ripgrep (`grep_search`) is preserved as a targeted secondary fallback for exact regexes or literal string/content lookups when graph nodes do not provide the exact line text.
4. **Continuous Graph Synchronization**: The knowledge graph MUST be updated with each code change. Upon completing any work order or commit, execute:
   ```bash
   bash .agents/scripts/sync_graph.sh
   # or directly: graphify extract zakaria-farid --code-only --out .
   ```
   This performs an incremental AST extraction (~9s, 0 token cost) keeping `graphify-out/graph.json` continuously in sync with code edits.

---

## 2. Simulation & Ergonomics Ranking Protocol (`WORKFLOW_AUDIT`)
The user has mandated an intensive simulation and stress-testing program prior to production deployment.
Every major workflow audit conducted by `Workflow Simulator & Auditor` must execute:
1. **Mathematical Accuracy Audit**: Stress-test calculation edge cases, currency conversions, decimal precision, and debit=credit balance across synthetic transaction batches.
2. **UI/UX Journey Simulation**: Walk through the user flow from beginning to end as a client/staff member.
3. **Ergonomics Categorization**: Rank every step and action into one of 5 clear categories:
   - **`Easy (سهل)`**: Smooth, intuitive, zero friction.
   - **`Moderate/Hard (صعب)`**: Requires excessive clicks, unclear steps, or slow response.
   - **`Incomprehensible (غير مفهوم)`**: Ambiguous labels, missing guides, confusing feedback.
   - **`Erroneous (خاطئ)`**: Generates runtime errors, crashes, or produces invalid states.
   - **`Currently Impossible (لا يمكن تنفيذه)`**: Broken links, missing API endpoints, dead-ends.
4. **Stress Testing**: Simulate high-concurrency transactions, bulk installment payments, and rapid state transitions.

---

## 3. Halt-on-Ambiguity Protocol
When a request is ambiguous on any dimension touching financial calculations, legal terms, contract cancellation penalties, statutory revenue recognition, or domain invariants:
1. **DO NOT GUESS** or make assumptions.
2. Immediately invoke the interactive `ask_question` tool to solicit explicit clarification from the user before writing code.
3. Record the user's decision in `PROJECT_SPEC.md` or `HARNESS_RATIONALE.md` with the provenance tag `[user-confirmed]`.

---

## 4. Resume Protocol (Platform Disconnection & Cutoff Recovery)
On receiving `"continue"`, `"resume"`, `"proceed"`, `"كمل"`, or recovering from a server restart:
1. **Inspect Before Acting**: Read `.agents/checkpoint.json` and `git status -s` before executing any commands.
2. **No Blind Restarts**: Never restart a task from the beginning.
3. **Partial Work Sanity Check**: Verify whether partial changes on disk pass typecheck (`npx tsc --noEmit`).
4. **Interrupted-Attempt Handling**:
   - If disconnected during a gate attempt, run the verification command against existing partial work.
   - If it passes: gate is satisfied; no attempt is consumed.
   - If it fails: record the failure in `.agents/checkpoint.json` and increment the circuit breaker counter.
5. Reconnect to or spawn a successor subagent scoped solely to the remaining incomplete work.

---

## 5. Circuit Breaker Protocol (Failure-Loop Defense)
Before dispatching a subagent for a gate retry on an existing work order:
1. Read the work order's attempt counter from `.agents/checkpoint.json`.
2. If the counter is at or above the track's stated ceiling:
   - `WORKFLOW_AUDIT`: 3 attempts (hard ceiling floor)
   - `FINANCIAL_CORE`: 3 attempts (hard ceiling floor)
   - `SURFACE_UI`: 5 attempts
   - `DATABASE_SCHEMA`: 3 attempts (hard ceiling floor)
3. **On Breach**:
   - **HALT** all further automated attempts on this work order.
   - Write a breach record to `.agents/checkpoint.json` containing the work order, track, gate, failed command output, and timestamp.
   - Escalate to the human via `ask_question` (or log to open questions), explaining the root cause.
4. If under the ceiling, dispatch the subagent, and increment the counter **ONLY after a verification result is observed** (never on unverified self-report). Pre-gate and post-gate counters are tracked independently.

---

## 6. Mandatory Reporting Contract
Subagent completion reports must strictly follow the 5-line report contract in Section 6 of `/home/lyr1csan/project/AGENTS.md#report-contract`. (Applies to: all)
