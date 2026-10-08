#!/usr/bin/env bash
# agy implements only (Codex review paused by user 2026-10-08). Claude checks gates and commits.
# Usage (from repo root): bash .agents/agy-impl.sh <task-id>
set -u
ID="$1"
REPO="$(git -c safe.directory='*' rev-parse --show-toplevel)"
B="$REPO/.agents/briefs"; RUN="$REPO/.agents/runs/$ID"
AGY="$HOME/.claude/skills/agy-delegate/scripts/relay.mjs"
mkdir -p "$RUN/shots"
DIRTY=$(git -c safe.directory='*' -C "$REPO" status --porcelain --untracked-files=no -- . ":(exclude).agents")
[ -n "$DIRTY" ] && { echo "PREFLIGHT FAILED: dirty tree"; echo "$DIRTY" | head; exit 2; }
sed -e "s#<TASK_ID>#$ID#g" -e "s#<RUN_DIR>#$RUN#g" "$B/_agy-header.txt" | cat - "$B/$ID-body.txt" > "$B/$ID-agy.txt"
BRIEF="$B/$ID-agy.txt"
[ "$(wc -c < "$BRIEF")" -gt 20000 ] && { printf 'Read %s IN FULL and execute it exactly. Return the REPORT it requires.\n' "$BRIEF" > "$RUN/stub.txt"; BRIEF="$RUN/stub.txt"; }
touch "$RUN/.start"
node "$AGY" --brief "$BRIEF" --cd "$REPO" --new-project --effort high --print-timeout 90m --dangerously-skip-permissions --out-dir "$RUN/agy0" > "$RUN/agy0.log" 2>&1
echo "agy exit $?"
grep -qE 'RESOURCE_EXHAUSTED|UNAVAILABLE \(code 503\)|429|not logged in' "$RUN/agy0.log" && echo "AGY QUOTA/OUTAGE/LOGIN in log"
git -c safe.directory='*' -C "$REPO" status --porcelain -- zakaria-farid | grep -v '.wrangler' | head -30
