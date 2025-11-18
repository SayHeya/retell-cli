#!/bin/bash
# Push all 100 test agents to staging workspace
# With rate limiting to avoid API throttling

set -e

DELAY=${1:-1}  # Delay in seconds (default: 1s for ~60 requests/min)
WORKSPACE="staging"
AGENTS_PATH="test-agents-100"

echo "🚀 Pushing 100 agents to $WORKSPACE workspace"
echo "⏱️  Delay between pushes: ${DELAY}s (max rate: ~60 requests/min)"
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0
START_TIME=$(date +%s)

# Push all agents
for i in $(seq -f "%03g" 1 100); do
  AGENT_NAME="test-agent-$i"

  echo "[$i/100] 📤 Pushing $AGENT_NAME..."

  if node bin/retell.js push "$AGENT_NAME" -w "$WORKSPACE" -p "$AGENTS_PATH" 2>&1 | tee /tmp/retell-push-$i.log; then
    SUCCESS=$((SUCCESS + 1))
    echo "  ✅ Success ($SUCCESS pushed)"
  else
    # Check if already exists (not an error)
    if grep -q "already exists\|in sync" /tmp/retell-push-$i.log; then
      SKIPPED=$((SKIPPED + 1))
      echo "  ⏭️  Skipped (already exists)"
    else
      FAILED=$((FAILED + 1))
      echo "  ❌ Failed ($FAILED errors)"

      # Check for rate limit
      if grep -q "rate limit\|429\|too many" /tmp/retell-push-$i.log; then
        echo "  ⚠️  Rate limit detected! Waiting 60s for rate limit window to reset..."
        sleep 60
      fi

      # Check for workspace limit
      if grep -q "workspace limit\|maximum.*agents\|quota.*exceeded" /tmp/retell-push-$i.log; then
        echo ""
        echo "🛑 WORKSPACE LIMIT REACHED!"
        echo "   Successfully created: $SUCCESS agents"
        echo "   Failed at agent: #$i"
        echo ""
        exit 0
      fi
    fi
  fi

  # Delay before next push (except for last one)
  if [ "$i" != "100" ]; then
    sleep "$DELAY"
  fi

  # Progress update every 10 agents
  if [ $((10#$i % 10)) -eq 0 ]; then
    echo ""
    echo "📊 Progress: $i/100 (✅ $SUCCESS | ❌ $FAILED | ⏭️  $SKIPPED)"
    echo ""
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=================================================="
echo "🎉 Push Complete!"
echo "=================================================="
echo "✅ Successfully pushed: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "⏭️  Skipped (already exists): $SKIPPED"
echo "⏱️  Total time: ${DURATION}s"
echo "📊 Average: $((DURATION / 100))s per agent"
echo "=================================================="
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some agents failed to push."
  echo "   Check logs in /tmp/retell-push-*.log"
else
  echo "🎉 All agents pushed successfully!"
  echo "   Check your Retell dashboard to see all $SUCCESS agents"
fi
