#!/usr/bin/env bash
# Claude's task brief -> agy implements -> Codex reviews. Codex may send at most MAX_FIX fix rounds
# back to agy; after that (or on small findings) Codex fixes the tree itself. Codex writes the final report.
# Usage (from project root): EFFORT=medium [MAX_FIX=2] [SENSITIVE=1] [UI=1] bash .agents/dispatch3.sh <task-id>
#   SENSITIVE=1  money/auth/licensing/security: adds a fresh read-only Codex audit of the whole diff.
#   UI=1         requires fresh screenshots in .agents/runs/<id>/shots.
# Needs .agents/briefs/_agy-header.txt, .agents/briefs/_review-header.txt and .agents/briefs/<id>-body.txt.
# Run only one dispatch at a time per machine (agy and the working tree are shared).
set -u
ID="$1"
REPO="${REPO:-$(git -c safe.directory='*' rev-parse --show-toplevel 2>/dev/null || pwd)}"
B="$REPO/.agents/briefs"
RUNS="${SCRATCH:-$REPO/.agents/runs}"
RUN="$RUNS/$ID"
MAX_FIX="${MAX_FIX:-2}"
CODEX="${CODEX_RELAY:-$HOME/.claude/skills/codex-delegate/scripts/relay.mjs}"
AGY="${AGY_RELAY:-$HOME/.claude/skills/agy-delegate/scripts/relay.mjs}"
BRIEF_MAX=20000   # agy relay passes the brief on the command line (Windows ~32K cap)
mkdir -p "$RUN"
[ -f "$RUNS/stats.tsv" ] || printf 'date\tid\tverdict\tagy_fix_rounds\ttakeover\tcodex_delta_lines\tshots\n' > "$RUNS/stats.tsv"
G() { git -c safe.directory='*' -C "$REPO" "$@"; }
field() { node -e "try{const r=require(process.argv[1]);console.log(r[process.argv[2]]??'')}catch{console.log('')}" "$1" "$2"; }
sub() { sed -e "s#<TASK_ID>#$ID#g" -e "s#<RUN_DIR>#$RUN#g" "$1"; }
verdict() { head -1 "$RUN/verdict.txt" 2>/dev/null | tr -d '\r '; }
# Tree object of the whole working tree (tracked + untracked, minus .agents) without touching the real index.
snap() {
  local idx="$RUN/.snap-index"
  rm -f "$idx"; GIT_INDEX_FILE="$idx" G add -A -- . ':(exclude).agents' >/dev/null 2>&1
  GIT_INDEX_FILE="$idx" G write-tree; rm -f "$idx"
}

# ---- preflight
# A dirty tree would mix unrelated changes into agy's diff, Codex's review and Claude's commit.
DIRTY=$(G status --porcelain -- . ":(exclude).agents")
if [ -n "$DIRTY" ] && [ "${ALLOW_DIRTY:-0}" != 1 ]; then
  echo "PREFLIGHT FAILED: working tree has uncommitted changes outside .agents (commit or stash them; ALLOW_DIRTY=1 to override):"; echo "$DIRTY" | head -20
  exit 2
fi
# The brief must fit, so a big task fails here instead of going to agy as a stub.
rm -f "$RUN/verdict.txt" "$RUN/final.md" "$RUN/codex-delta.patch" "$RUN/audit.md" "$B/$ID"-fix*.txt
sub "$B/_agy-header.txt" | cat - "$B/$ID-body.txt" > "$B/$ID-agy.txt"
SIZE=$(wc -c < "$B/$ID-agy.txt")
if [ "$SIZE" -gt "$BRIEF_MAX" ]; then
  echo "PREFLIGHT FAILED: $B/$ID-agy.txt is $SIZE bytes (max $BRIEF_MAX). Split the task or trim the body; reference files by path."
  exit 2
fi
touch "$RUN/.start"
BASE=$(snap)

run_agy() { # <brief> <name> <relay flags...>
  local brief="$1" name="$2"; shift 2
  if [ "$(wc -c < "$brief")" -gt "$BRIEF_MAX" ]; then
    printf 'Read %s IN FULL and execute it exactly. Return the REPORT it requires.\n' "$brief" > "$RUN/$name-stub.txt"
    brief="$RUN/$name-stub.txt"
  fi
  node "$AGY" --brief "$brief" --cd "$REPO" "$@" --effort high --print-timeout 90m --dangerously-skip-permissions --out-dir "$RUN/$name" > "$RUN/$name.log" 2>&1
  echo "agy $name exit $? status $(field "$RUN/$name/result.json" status)"
  grep -qE 'RESOURCE_EXHAUSTED|UNAVAILABLE \(code 503\)' "$RUN/$name.log" && echo "agy $name: quota/outage in log"
  tail -40 "$RUN/$name.log" > "$RUN/$name-tail.txt"
}

run_codex() { # <brief> <name> [extra relay flags]
  local brief="$1" name="$2"; shift 2
  node "$CODEX" --brief "$brief" --cd "$REPO" --sandbox danger-full-access --effort "${EFFORT:-medium}" --timeout 2h --out-dir "$RUN/$name" "$@" > "$RUN/$name.log" 2>&1
  echo "codex $name $(field "$RUN/$name/result.json" status) verdict=$(verdict)"
  if [ -z "$(verdict)" ] && grep -qiE 'usage limit|rate limit|429 Too Many' "$RUN/$name.log" "$RUN/$name"/events.jsonl 2>/dev/null; then
    stop "Codex usage limit in $name (see $RUN/$name.log). Tree left as is; re-dispatch after the reset."
  fi
}
stop() { echo "STOPPED: $1"; printf '%s\t%s\tSTOPPED\t-\t-\t-\t-\n' "$(date +%F)" "$ID" >> "$RUNS/stats.tsv"; exit 3; }

# Record exactly what Codex changed on top of agy, so Claude can read Codex's own edits.
codex_delta() { # <tree before codex turn> <label>
  local after; after=$(snap)
  G diff "$1" "$after" > "$RUN/codex-$2.patch"
  [ -s "$RUN/codex-$2.patch" ] && cat "$RUN/codex-$2.patch" >> "$RUN/codex-delta.patch"
  echo "$after"
}

echo "== agy implements"
run_agy "$B/$ID-agy.txt" agy0 --new-project
CONV=$(field "$RUN/agy0/result.json" conversationId)
T=$(snap)
if [ "$T" = "$BASE" ]; then
  grep -qE "RESOURCE_EXHAUSTED|UNAVAILABLE (code 503)|429|not logged in" "$RUN/agy0.log" && stop "agy made no edits and hit quota/outage/login (see $RUN/agy0.log). Re-dispatch after the reset."
  echo "agy made no edits; Codex will implement the task itself."
fi

{ sub "$B/_review-header.txt"
  printf 'TASK (written by Claude): %s\n' "$B/$ID-body.txt"
  [ "${UI:-0}" = 1 ] && printf 'UI TASK: save fresh 1280 and 390 screenshots under %s/shots and list them in final.md.\n' "$RUN"
  printf 'ROUND: first review. agy fix rounds available: %s. If you choose FIX, the fix brief is %s-fix1.txt.\n' "$MAX_FIX" "$B/$ID"
  printf 'agy relay output (tail; full log %s):\n\n' "$RUN/agy0.log"
  cat "$RUN/agy0-tail.txt"; } > "$RUN/review0.txt"
echo "== codex reviews"
run_codex "$RUN/review0.txt" review0
THREAD=$(field "$RUN/review0/result.json" threadId)
T=$(codex_delta "$T" review0)

n=0
while [ "$(verdict)" = "FIX" ] && [ "$n" -lt "$MAX_FIX" ] && [ -s "$B/$ID-fix$((n+1)).txt" ]; do
  n=$((n+1)); left=$((MAX_FIX-n))
  echo "== agy fix round $n ($(grep -cE '^F[0-9]+ \[' "$B/$ID-fix$n.txt") tagged findings)"
  { printf "FIX ROUND %s for task %s. The reviewer may have edited files since your last turn: re-read every file from disk before editing it, edit in place, never restore an older version. Same execution_rules, quality_rules and REPORT as before.

" "$n" "$ID"; cat "$B/$ID-fix$n.txt"; } > "$RUN/fix$n-brief.txt"
  if [ -n "$CONV" ]; then run_agy "$RUN/fix$n-brief.txt" "agy$n" --conversation "$CONV"
  else { cat "$B/$ID-agy.txt"; echo; cat "$RUN/fix$n-brief.txt"; } > "$RUN/fix$n-full.txt"; run_agy "$RUN/fix$n-full.txt" "agy$n" --new-project; fi
  T=$(snap)
  rm -f "$RUN/verdict.txt"
  { printf 'RE-REVIEW after agy fix round %s (brief %s-fix%s.txt). Check ONLY those findings plus regressions this round caused; no new findings on unchanged code.\n' "$n" "$B/$ID" "$n"
    if [ "$left" -gt 0 ]; then
      printf 'agy fix rounds left: %s. If you choose FIX, the fix brief is %s-fix%s.txt. A finding agy has now failed twice: fix it yourself.\n' "$left" "$B/$ID" "$((n+1))"
    else
      printf 'agy fix rounds left: 0. Fix everything still wrong yourself; the verdict must be PASS, DONE or BLOCKED.\n'
    fi
    printf 'agy relay output (tail; full log %s):\n\n' "$RUN/agy$n.log"
    cat "$RUN/agy$n-tail.txt"; } > "$RUN/review$n.txt"
  run_codex "$RUN/review$n.txt" "review$n" --session "$THREAD"
  T=$(codex_delta "$T" "review$n")
done

TAKEOVER=0
if [ "$(verdict)" = "FIX" ] || [ -z "$(verdict)" ]; then
  echo "== codex takes over"
  TAKEOVER=1
  rm -f "$RUN/verdict.txt"
  printf 'No agy fix rounds will run. Fix every remaining finding yourself, finish the task, run the gates, then write verdict.txt (DONE, or BLOCKED + question) and final.md per the protocol.\n' > "$RUN/takeover.txt"
  if [ -n "$THREAD" ]; then run_codex "$RUN/takeover.txt" takeover --session "$THREAD"
  else { sub "$B/_review-header.txt"; printf 'TASK: %s\n' "$B/$ID-body.txt"; cat "$RUN/takeover.txt"; } > "$RUN/takeover-full.txt"; run_codex "$RUN/takeover-full.txt" takeover; fi
  T=$(codex_delta "$T" takeover)
fi

# Independent check of sensitive work: fresh Codex thread, read-only, sees the full diff with no review history.
if [ "${SENSITIVE:-0}" = 1 ] && [ "$(verdict)" != BLOCKED ]; then
  echo "== independent audit"
  G diff "$BASE" "$T" > "$RUN/full.patch"
  printf 'You are an independent auditor (read-only). Task brief: %s. Full diff of the task: %s. Project rules: %s.\nCheck the diff against the task for BLOCKING problems only: unmet requirements, wrong money/auth/licensing/security behaviour, broken invariants, fake tests, hardcoded data. No style notes.\nAnswer: first line OK or ISSUES; then each issue as file:line, problem, required fix. Terse.\n' \
    "$B/$ID-body.txt" "$RUN/full.patch" "$B/_agy-header.txt" > "$RUN/audit-brief.txt"
  node "$CODEX" --brief "$RUN/audit-brief.txt" --cd "$REPO" --read-only --effort high --timeout 1h --out-dir "$RUN/audit" > "$RUN/audit.log" 2>&1
  field "$RUN/audit/result.json" finalMessage > "$RUN/audit.md"
fi

SHOTS=$(find "$RUN/shots" -name '*.png' -newer "$RUN/.start" 2>/dev/null | wc -l)
DELTA=$( [ -s "$RUN/codex-delta.patch" ] && grep -cE '^[+-][^+-]' "$RUN/codex-delta.patch" || echo 0)
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date +%F)" "$ID" "$(verdict)" "$n" "$TAKEOVER" "$DELTA" "$SHOTS" >> "$RUNS/stats.tsv"

echo "== result: verdict=$(verdict) agy_fix_rounds=$n takeover=$TAKEOVER codex_delta_lines=$DELTA run_dir=$RUN"
sed -n 2p "$RUN/verdict.txt" 2>/dev/null
[ "${UI:-0}" = 1 ] && [ "$SHOTS" -eq 0 ] && echo "WARNING: UI task but no fresh screenshots in $RUN/shots"
[ -s "$RUN/codex-delta.patch" ] && echo "codex own edits: $RUN/codex-delta.patch"
[ -s "$RUN/audit.md" ] && { echo "== audit"; cat "$RUN/audit.md"; }
if [ -s "$RUN/final.md" ]; then echo "== final.md"; cat "$RUN/final.md"; else echo "(no final.md)"; fi
