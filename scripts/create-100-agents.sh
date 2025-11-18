#!/bin/bash
# Script to create 100 test agents for workspace limit testing

set -e

AGENTS_DIR="test-agents-100"
TEMPLATE_FILE="tests/fixtures/agents/valid-simple-agent.json"

echo "🚀 Creating 100 test agents..."
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

# Load template
TEMPLATE=$(cat "$TEMPLATE_FILE")

# Create 100 agents
for i in $(seq -f "%03g" 1 100); do
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

  # Progress indicator every 10 agents
  if [ $((10#$i % 10)) -eq 0 ]; then
    echo "✅ Created $i/100 agents"
  fi
done

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="
echo "✅ Successfully created: 100/100 agents"
echo "📁 Location: $AGENTS_DIR"
echo "=================================================="
echo ""
echo "📝 Next steps:"
echo "  1. Configure your workspace:"
echo "     retell workspace add staging <api-key>"
echo ""
echo "  2. Push all agents (careful - this will create 100 agents!):"
echo "     cd $AGENTS_DIR"
echo "     for dir in test-agent-*/; do"
echo "       echo \"Pushing \$dir...\""
echo "       retell push \"\$dir\" -w staging --skip-prompts -y"
echo "     done"
echo ""
echo "  3. Or push one at a time to test:"
echo "     cd $AGENTS_DIR"
echo "     retell push test-agent-001 -w staging"
echo ""
