#!/bin/bash
# Script to create 1000 test agents for workspace limit testing

set -e

AGENTS_DIR="test-agents-1000"
TEMPLATE_FILE="tests/fixtures/agents/valid-simple-agent.json"

echo "🚀 Creating 1000 test agents..."
echo ""

# Create agents directory
mkdir -p "$AGENTS_DIR"
echo "✅ Created directory: $AGENTS_DIR"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Template file not found: $TEMPLATE_FILE"
  exit 1
fi

START_TIME=$(date +%s)

# Create 1000 agents
for i in $(seq -f "%04g" 1 1000); do
  AGENT_NAME="test-agent-$i"
  AGENT_PATH="$AGENTS_DIR/$AGENT_NAME"

  # Create directory structure
  mkdir -p "$AGENT_PATH/knowledge"

  # Create agent.json with customized name
  cat > "$AGENT_PATH/agent.json" <<EOF
{
  "agent_name": "Test Agent $i",
  "voice_id": "11labs-Adrian",
  "language": "en-US",
  "llm_config": {
    "model": "gpt-4o-mini",
    "general_prompt": "You are Test Agent $i. You are a helpful assistant."
  }
}
EOF

  # Create empty metadata files
  cat > "$AGENT_PATH/staging.json" <<EOF
{
  "workspace": null,
  "agent_id": null,
  "llm_id": null,
  "kb_id": null,
  "last_sync": null,
  "config_hash": null,
  "retell_version": null
}
EOF

  cat > "$AGENT_PATH/production.json" <<EOF
{
  "workspace": null,
  "agent_id": null,
  "llm_id": null,
  "kb_id": null,
  "last_sync": null,
  "config_hash": null,
  "retell_version": null
}
EOF

  # Progress indicator every 50 agents
  if [ $((10#$i % 50)) -eq 0 ]; then
    echo "✅ Created $i/1000 agents"
  fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="
echo "✅ Successfully created: 1000/1000 agents"
echo "📁 Location: $AGENTS_DIR"
echo "⏱️  Time taken: ${DURATION}s"
echo "=================================================="
echo ""
echo "📝 Next steps:"
echo "  1. Configure your workspace:"
echo "     retell workspace add staging <api-key>"
echo ""
echo "  2. Push all agents with rate limiting:"
echo "     ./scripts/push-1000-agents.sh"
echo ""
echo "  ⚠️  Note: At 60 requests/min, pushing 1000 agents will take ~17 minutes"
echo ""
