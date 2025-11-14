#!/bin/bash

# Setup Test Environment in /tmp/proper/
# Copies fixtures structure and creates a clean test agent

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
FIXTURES_DIR="$PROJECT_ROOT/tests/fixtures/complete-project"

echo -e "${BLUE}Setting up test environment in /tmp/proper/${NC}\n"

# Clean and create directory
rm -rf /tmp/proper
mkdir -p /tmp/proper

# Copy fixtures structure (prompts and directory layout)
echo -e "Copying prompts from fixtures..."
cp -r "$FIXTURES_DIR/prompts" /tmp/proper/

# Create agents directory
mkdir -p /tmp/proper/agents

# Remove old agents from fixtures (we'll create a fresh one)
echo -e "Creating fresh test agent..."

# Create test-agent directory
mkdir -p /tmp/proper/agents/test-agent

# Create a simple agent config (similar to customer-service but simpler)
cat > /tmp/proper/agents/test-agent/agent.json << 'EOF'
{
  "agent_name": "Test Support Agent",
  "voice_id": "11labs-Adrian",
  "language": "en-US",
  "responsiveness": 0.8,
  "interruption_sensitivity": 0.5,
  "enable_backchannel": true,
  "llm_config": {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "prompt_config": {
      "sections": [
        "base/greeting",
        "base/instructions"
      ],
      "variables": {
        "company_name": "Test Company",
        "support_hours": "9am-5pm EST"
      },
      "dynamic_variables": {
        "customer_name": {
          "type": "string",
          "description": "Name of the customer calling"
        },
        "account_type": {
          "type": "string",
          "description": "Type of customer account"
        }
      }
    },
    "begin_message": "Hello! Thanks for calling. How can I help you today?"
  }
}
EOF

echo -e "${GREEN}✓${NC} Copied prompts from fixtures"
echo -e "${GREEN}✓${NC} Created fresh agent: test-agent"
echo -e "\n${YELLOW}Test environment ready at: /tmp/proper/${NC}"
echo -e "\nDirectory structure:"
tree /tmp/proper 2>/dev/null || {
  echo "/tmp/proper/"
  echo "├── agents/"
  echo "│   └── test-agent/"
  echo "│       └── agent.json"
  echo "└── prompts/"
  echo "    ├── base/"
  find /tmp/proper/prompts -type f -name "*.txt" | sed 's|/tmp/proper/prompts/|    │   |'
}

echo -e "\n${BLUE}Agent config preview:${NC}"
cat /tmp/proper/agents/test-agent/agent.json | head -15
echo "  ..."

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. cd /tmp/proper"
echo -e "  2. Run workflow test: bash $SCRIPT_DIR/test-workflow.sh"
echo -e "  3. Or manually test with: node $PROJECT_ROOT/bin/retell.js"
