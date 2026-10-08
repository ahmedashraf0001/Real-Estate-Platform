#!/usr/bin/env bash
# Codex implements AND finishes a task (no agy). User choice 2026-10-07: Codex, effort medium.
# Usage (from repo root): [UI=1] [EFFORT=medium] bash .agents/codex-impl.sh <task-id>
# Needs .agents/briefs/_review-header.txt and .agents/briefs/<id>-body.txt. Verdict must be DONE or BLOCKED.
set -u
ID="$1"
REPO="$(git -c safe.directory='*' rev-parse --show-toplevel)"
B="$REPO/.agents/briefs"; RUN="$REPO/.agents/runs/$ID"
CODEX="$HOME/.claude/skills/codex-delegate/scripts/relay.mjs"
mkdir -p "$RUN"
DIRTY=$(git -c safe.directory='*' -C "$REPO" status --porcelain --untracked-files=no -- . ":(exclude).agents")
[ -n "$DIRTY" ] && { echo "PREFLIGHT FAILED: dirty tree"; echo "$DIRTY" | head; exit 2; }
rm -f "$RUN/verdict.txt" "$RUN/final.md"; touch "$RUN/.start"
{ sed -e "s#<TASK_ID>#$ID#g" -e "s#<RUN_DIR>#$RUN#g" "$B/_review-header.txt"
  printf '\nMODE: agy is not used. YOU are the implementer AND finisher for this task. Implement every Required item of the TASK yourself, honouring the quality_rules and PROJECT RULES in .agents/briefs/_agy-header.txt. Write tests RED first. No agy fix rounds exist: the verdict must be DONE or BLOCKED.\n'
  [ "${UI:-0}" = 1 ] && printf 'UI TASK: save fresh 1280 and 390 screenshots under %s/shots and list them in final.md; if capture cannot run, say so.\n' "$RUN"
  printf '\nTASK (written by Claude): %s\n' "$B/$ID-body.txt"
} > "$RUN/codex-impl.txt"
node "$CODEX" --brief "$RUN/codex-impl.txt" --cd "$REPO" --sandbox danger-full-access --effort "${EFFORT:-medium}" --timeout 3h --out-dir "$RUN/impl" > "$RUN/impl.log" 2>&1
echo "codex exit $? verdict: $(head -2 "$RUN/verdict.txt" 2>/dev/null | tr '\n' ' ')"
grep -qiE 'usage limit' "$RUN/impl/events.jsonl" 2>/dev/null && { echo "CODEX LIMITED"; grep -oiE 'try again at [^.]*' "$RUN/impl/events.jsonl" | head -1; }
printf '%s\t%s\t%s\t-\tcodex-impl\t-\t%s\n' "$(date +%F)" "$ID" "$(head -1 "$RUN/verdict.txt" 2>/dev/null)" "$(find "$RUN/shots" -name '*.png' -newer "$RUN/.start" 2>/dev/null | wc -l)" >> "$REPO/.agents/runs/stats.tsv"
