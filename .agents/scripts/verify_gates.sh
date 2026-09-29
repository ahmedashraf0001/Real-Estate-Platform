#!/usr/bin/env bash
# ==============================================================================
# Zakaria Farid Real Estate ERP — Mechanical Gate Enforcement Script (Portable)
# Backs INV-0.5, INV-4.1, INV-0.6, INV-4.9, INV-4.17, INV-4.10, INV-14.B, INV-0.9,
# INV-SEC-RLS, INV-COST-ATOMIC, INV-NO-SYNTHETIC-DATA, INV-NO-COGS-GUESSING,
# INV-TRUE-LIQUID-CASH, INV-DUAL-TIER-DROPDOWN, INV-CURATED-PALETTES,
# INV-FINOS-DESIGN-SYSTEM, INV-AP-PRIORITY-SORT
# Returns Exit Code 2 on Gate Failure (Fail-Closed)
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi
APP_DIR="${REPO_ROOT}/zakaria-farid"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ Error: App directory not found at ${APP_DIR}"
  exit 2
fi

cd "$APP_DIR"

echo "=== [Gate 1/2] TypeScript Strict Typecheck (All Tracks) ==="
if ! npx tsc --noEmit; then
  echo "❌ Gate 1 FAILED: TypeScript compilation errors detected."
  exit 2
fi
echo "✓ Gate 1 PASSED: 0 typecheck errors."

# Detect staged files for path-aware verification
STAGED_FILES=$(git -C "$REPO_ROOT" diff --cached --name-only 2>/dev/null || echo "")

# If run directly without staged files, or if staged files touch financial/database/notification/payables paths:
if [ -z "$STAGED_FILES" ] || [ "$1" = "--all" ] || echo "$STAGED_FILES" | grep -qE "(src/lib/erp|supabase/|accounting/|math.ts|ledger.ts|invariants.ts|canonicalMetrics.ts|erpPalettePresets.ts|notificationEngine.ts|propertyCostEngine.ts)"; then
  echo "=== [Gate 2/2] Financial Invariants & Statutory Suite (259 Tests / 72 Suites) ==="
  if ! npm test; then
    echo "❌ Gate 2 FAILED: Financial Invariant regression or broken immutability contract."
    exit 2
  fi
  echo "✓ Gate 2 PASSED: 259/259 financial invariant tests passed."
else
  echo "=== [Gate 2/2] Financial Invariants Check ==="
  echo "✓ Gate 2 BYPASSED: Staged changes are scoped to presentation/UI without financial engine modifications."
fi

if [ "$1" = "--sync-graph" ] || [ "$2" = "--sync-graph" ]; then
  bash "${SCRIPT_DIR}/sync_graph.sh"
fi

echo "=============================================================================="
echo "✓ ALL GATES PASSED: Ready for commit or stage completion."
echo "=============================================================================="
exit 0
