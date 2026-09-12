#!/usr/bin/env bash
# ==============================================================================
# Zakaria Farid Real Estate ERP — Graphify AST Incremental Sync Script (Portable)
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

cd "$REPO_ROOT"
echo "=== Synchronizing Codebase Knowledge Graph (graphify) ==="
if command -v graphify >/dev/null 2>&1; then
  graphify extract zakaria-farid --code-only --out .
  echo "✓ Graphify knowledge graph synchronized at ${REPO_ROOT}/graphify-out/graph.json"
else
  echo "⚠️ Warning: graphify CLI not found in PATH. Skipping graph sync."
fi
