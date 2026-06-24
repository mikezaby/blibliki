#!/bin/bash
# Run the test suite N times and report pass/fail per run.
# Usage: ./stress-test.sh [runs]
# Default: 20 runs. Exit 1 on first failure (early-return mode).

RUNS=${1:-20}
PASSED=0
FAILED=0

for i in $(seq 1 "$RUNS"); do
  result=$(pnpm test --run 2>&1)
  if echo "$result" | grep -q "Tests.*failed\|Test Files.*failed"; then
    FAILED=$((FAILED + 1))
    echo "FAIL $i/$RUNS"
    echo "$result" | grep -E "FAIL |Error:|Timed out" | head -5
    echo "---"
    exit 1   # early return on first failure
  else
    PASSED=$((PASSED + 1))
    echo "OK   $i/$RUNS"
  fi
done

echo ""
echo "Result: $PASSED/$RUNS passed"
