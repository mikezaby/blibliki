#!/bin/bash
# Run the test suite N times (P in parallel) and report pass/fail per run.
# Usage: ./stress-test.sh [runs] [parallel]
# Defaults: 20 runs, 2 parallel workers.
# Note: audio tests create real AudioContexts — values above 4 cause contention
# and spurious timeouts. 2 is the recommended maximum on most machines.

RUNS=${1:-20}
PARALLEL=${2:-2}

TMPDIR_BASE=$(mktemp -d)
PASS_FILE="$TMPDIR_BASE/pass"
FAIL_FILE="$TMPDIR_BASE/fail"
touch "$PASS_FILE" "$FAIL_FILE"

run_once() {
  local i=$1
  local result
  result=$(pnpm test --run 2>&1)
  if echo "$result" | grep -q "Tests.*failed\|Test Files.*failed"; then
    echo "FAIL $i/$RUNS"
    echo "$result" | grep -E "FAIL |Error:|Timed out" | head -5
    echo "---"
    echo "$i" >> "$FAIL_FILE"
  else
    echo "OK   $i/$RUNS"
    echo "$i" >> "$PASS_FILE"
  fi
}

export -f run_once
export RUNS PASS_FILE FAIL_FILE

seq 1 "$RUNS" | xargs -P "$PARALLEL" -I{} bash -c 'run_once "$@"' _ {}

PASSED=$(wc -l < "$PASS_FILE" | tr -d ' ')
FAILED=$(wc -l < "$FAIL_FILE" | tr -d ' ')
rm -rf "$TMPDIR_BASE"

echo ""
echo "Result: $PASSED/$RUNS passed ($FAILED failed)"

[ "$FAILED" -eq 0 ]
