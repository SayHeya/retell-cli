#!/bin/bash

# Push 1000 agents to staging with 1s rate limiting
# Expected time: ~17 minutes

AGENTS_DIR="./agents"
WORKSPACE="staging"
DELAY=1
TOTAL=1000

echo "========================================="
echo "Pushing 1000 agents to $WORKSPACE"
echo "Rate limit: ${DELAY}s delay"
echo "Expected time: ~17 minutes"
echo "========================================="
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0
START_TIME=$(date +%s)

for i in $(seq 1 $TOTAL); do
  # Format with leading zeros for agent name
  AGENT_NUM=$(printf "%03d" $i)
  AGENT_NAME="agent-$AGENT_NUM"
  AGENT_PATH="$AGENTS_DIR/$AGENT_NAME"
  
  if [ ! -d "$AGENT_PATH" ]; then
    echo "[$i/$TOTAL] ⚠️  Skipped $AGENT_NAME (not found)"
    ((SKIPPED++))
    continue
  fi
  
  echo -n "[$i/$TOTAL] Pushing $AGENT_NAME... "
  
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
  
  # Progress summary every 50 agents
  if [ $((i % 50)) -eq 0 ]; then
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    RATE=$(echo "scale=2; $i / ($ELAPSED / 60)" | bc)
    echo ""
    echo "--- Progress: $i/$TOTAL ---"
    echo "✅ Success: $SUCCESS | ❌ Failed: $FAILED | ⏭️  Skipped: $SKIPPED"
    echo "⏱️  Elapsed: ${ELAPSED}s | Rate: ${RATE} agents/min"
    echo ""
  fi
  
  # Rate limiting (skip delay on last iteration)
  if [ $i -lt $TOTAL ]; then
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
echo "📈 Average rate: $(echo "scale=2; $TOTAL / ($TOTAL_TIME / 60)" | bc) agents/min"
echo "========================================="
