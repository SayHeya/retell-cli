#!/bin/bash
# Script to push agents to Retell with rate limiting
# This helps avoid API rate limits when creating many agents

set -e

AGENTS_DIR="${1:-test-agents-100}"
WORKSPACE="${2:-staging}"
DELAY="${3:-1}"  # Delay in seconds between each push (default: 1s for ~60 requests/min)

echo "🚀 Pushing agents to workspace: $WORKSPACE"
echo "📁 Agents directory: $AGENTS_DIR"
echo "⏱️  Delay between pushes: ${DELAY}s"
echo ""

if [ ! -d "$AGENTS_DIR" ]; then
  echo "❌ Directory not found: $AGENTS_DIR"
  exit 1
fi

# Count total agents
TOTAL=$(find "$AGENTS_DIR" -maxdepth 1 -type d -name "test-agent-*" | wc -l)
echo "📊 Found $TOTAL agents to push"
echo ""

# Confirm before proceeding
read -p "⚠️  This will create $TOTAL agents in your $WORKSPACE workspace. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 0
fi

echo ""
echo "Starting push (press Ctrl+C to cancel)..."
echo "=================================================="
echo ""

SUCCESS=0
FAILED=0
START_TIME=$(date +%s)

# Push each agent
for dir in "$AGENTS_DIR"/test-agent-*/; do
  AGENT_NAME=$(basename "$dir")
  echo "📤 Pushing $AGENT_NAME..."

  if retell push "$dir" -w "$WORKSPACE" --skip-prompts -y 2>&1 | tee /tmp/retell-push.log; then
    SUCCESS=$((SUCCESS + 1))
    echo "  ✅ Success ($SUCCESS/$TOTAL)"
  else
    FAILED=$((FAILED + 1))
    echo "  ❌ Failed ($FAILED errors so far)"

    # Check for rate limit error
    if grep -q "rate limit\|429\|too many requests" /tmp/retell-push.log; then
      echo "  ⚠️  Rate limit detected! Waiting 60 seconds for rate limit window to reset..."
      sleep 60
    fi
  fi

  # Add delay between pushes to avoid rate limiting
  if [ $((SUCCESS + FAILED)) -lt "$TOTAL" ]; then
    echo "  ⏳ Waiting ${DELAY}s before next push..."
    sleep "$DELAY"
  fi

  echo ""
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "=================================================="
echo "📊 Final Summary"
echo "=================================================="
echo "✅ Successful pushes: $SUCCESS"
echo "❌ Failed pushes: $FAILED"
echo "⏱️  Total time: ${DURATION}s"
echo "📁 Workspace: $WORKSPACE"
echo "=================================================="
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some pushes failed. Check the errors above."
  echo "   You can re-run this script to retry failed agents."
  exit 1
else
  echo "🎉 All agents pushed successfully!"
  echo ""
  echo "📝 Next steps:"
  echo "  1. Check your Retell dashboard to see all $SUCCESS agents"
  echo "  2. Monitor for any workspace limit warnings"
  echo "  3. Try creating more agents to find the limit!"
fi
