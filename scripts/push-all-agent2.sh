#!/bin/bash

# Push all agent2-* agents to staging with 1s rate limiting

AGENTS_DIR="./agents"
WORKSPACE="staging"
DELAY=1

echo "========================================="
echo "Pushing all agent2-* agents to $WORKSPACE"
echo "Rate limit: ${DELAY}s delay"
echo "========================================="
echo ""

# Get list of all agent2-* directories
AGENT_DIRS=($(ls -d $AGENTS_DIR/agent2-* 2>/dev/null | sort))
TOTAL=${#AGENT_DIRS[@]}

if [ $TOTAL -eq 0 ]; then
  echo "❌ No agent2-* directories found in $AGENTS_DIR"
  exit 1
fi

echo "Found $TOTAL agent2-* agents"
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0
START_TIME=$(date +%s)

for i in "${!AGENT_DIRS[@]}"; do
  AGENT_PATH="${AGENT_DIRS[$i]}"
  AGENT_NAME=$(basename "$AGENT_PATH")
  CURRENT=$((i + 1))
  
  echo -n "[$CURRENT/$TOTAL] Pushing $AGENT_NAME... "
  
  OUTPUT=$(node bin/retell.js push "$AGENT_NAME" -w "$WORKSPACE" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    if echo "$OUTPUT" | grep -q "already in sync"; then
      echo "⏭️  Already in sync"
      ((SKIPPED++))
    else
      echo "✅ Success"
      ((SUCCESS++))
    fi
  else
    echo "❌ Failed"
    ((FAILED++))
    echo "   Error: $(echo "$OUTPUT" | tail -1)"
  fi
  
  # Progress summary every 100 agents
  if [ $((CURRENT % 100)) -eq 0 ]; then
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    RATE=$(echo "scale=2; $CURRENT / ($ELAPSED / 60)" | bc -l)
    REMAINING=$((TOTAL - CURRENT))
    ETA=$((REMAINING * DELAY / 60))
    echo ""
    echo "--- Progress: $CURRENT/$TOTAL ---"
    echo "✅ Success: $SUCCESS | ❌ Failed: $FAILED | ⏭️  Skipped: $SKIPPED"
    echo "⏱️  Elapsed: ${ELAPSED}s | Rate: ${RATE} agents/min"
    echo "⏳ ETA: ~${ETA} minutes remaining"
    echo ""
  fi
  
  # Rate limiting (skip delay on last iteration)
  if [ $CURRENT -lt $TOTAL ]; then
    sleep $DELAY
  fi
done

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

echo ""
echo "========================================="
echo "📊 Final Summary"
echo "========================================="
echo "✅ Success:  $SUCCESS/$TOTAL"
echo "❌ Failed:   $FAILED/$TOTAL"
echo "⏭️  Skipped:  $SKIPPED/$TOTAL"
echo "⏱️  Total time: ${MINUTES}m ${SECONDS}s"
if [ $TOTAL_TIME -gt 0 ]; then
  echo "📈 Average rate: $(echo "scale=2; $TOTAL / ($TOTAL_TIME / 60)" | bc -l) agents/min"
fi
echo "========================================="
