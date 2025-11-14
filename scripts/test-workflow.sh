#!/bin/bash

# Test Full Workflow Script
# Walks through: create agent -> push staging -> modify -> check diff -> push staging -> push production

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
CLI="$PROJECT_ROOT/bin/retell.js"

echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Retell CLI - Full Workflow Test${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}\n"

# Step 1: Setup environment
echo -e "${YELLOW}[Step 1]${NC} Setting up test environment..."
bash "$SCRIPT_DIR/setup-test-env.sh"
cd /tmp/proper

echo -e "\n${BLUE}Press Enter to continue to Step 2...${NC}"
read -r

# Step 2: Check initial status
echo -e "\n${YELLOW}[Step 2]${NC} Checking initial status (should show NOT SYNCED)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to push to staging...${NC}"
read -r

# Step 3: Push to staging
echo -e "\n${YELLOW}[Step 3]${NC} Pushing agent to STAGING workspace..."
node "$CLI" push test-agent --path agents --prompts prompts --workspace staging

echo -e "\n${BLUE}Press Enter to check status after first push...${NC}"
read -r

# Step 4: Check status after push
echo -e "\n${YELLOW}[Step 4]${NC} Checking status (should show IN SYNC with staging)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to make local changes...${NC}"
read -r

# Step 5: Modify local config
echo -e "\n${YELLOW}[Step 5]${NC} Making local changes..."
echo -e "  - Changing temperature from 0.7 to 0.8"
echo -e "  - Changing company_name variable"

# Update temperature
sed -i 's/"temperature": 0.7/"temperature": 0.8/' agents/test-agent/agent.json

# Update company name
sed -i 's/"company_name": "Test Company"/"company_name": "Updated Test Company"/' agents/test-agent/agent.json

echo -e "${GREEN}✓${NC} Local changes made"

echo -e "\n${BLUE}Press Enter to check status after changes...${NC}"
read -r

# Step 6: Check status after modification
echo -e "\n${YELLOW}[Step 6]${NC} Checking status (should show OUT OF SYNC with staging)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to push changes to staging...${NC}"
read -r

# Step 7: Push updated config to staging
echo -e "\n${YELLOW}[Step 7]${NC} Pushing updated config to STAGING..."
node "$CLI" push test-agent --path agents --prompts prompts --workspace staging

echo -e "\n${BLUE}Press Enter to check status...${NC}"
read -r

# Step 8: Check status
echo -e "\n${YELLOW}[Step 8]${NC} Checking status (staging IN SYNC, production OUT OF SYNC)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to push to production...${NC}"
read -r

# Step 9: Push to production
echo -e "\n${YELLOW}[Step 9]${NC} Pushing agent to PRODUCTION workspace..."
node "$CLI" push test-agent --path agents --prompts prompts --workspace production

echo -e "\n${BLUE}Press Enter to check status...${NC}"
read -r

# Step 10: Check status (all in sync)
echo -e "\n${YELLOW}[Step 10]${NC} Checking status (both workspaces IN SYNC)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to make more changes...${NC}"
read -r

# Step 11: Make another local change
echo -e "\n${YELLOW}[Step 11]${NC} Making more local changes..."
echo -e "  - Changing responsiveness from 0.8 to 0.9"

sed -i 's/"responsiveness": 0.8/"responsiveness": 0.9/' agents/test-agent/agent.json

echo -e "${GREEN}✓${NC} Local changes made"

echo -e "\n${BLUE}Press Enter to check final status...${NC}"
read -r

# Step 12: Final status check
echo -e "\n${YELLOW}[Step 12]${NC} Checking final status (both OUT OF SYNC)..."
node "$CLI" status test-agent --path agents

echo -e "\n${BLUE}Press Enter to push to staging only...${NC}"
read -r

# Step 13: Push to staging only
echo -e "\n${YELLOW}[Step 13]${NC} Pushing to STAGING only..."
node "$CLI" push test-agent --path agents --prompts prompts --workspace staging

echo -e "\n${BLUE}Press Enter to see final state...${NC}"
read -r

# Step 14: Final state
echo -e "\n${YELLOW}[Step 14]${NC} Final status (staging IN SYNC, production OUT OF SYNC)..."
node "$CLI" status test-agent --path agents

echo -e "\n${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Workflow Test Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Summary:${NC}"
echo -e "  ✓ Created agent from template"
echo -e "  ✓ Pushed to staging (new agent)"
echo -e "  ✓ Made local changes"
echo -e "  ✓ Detected OUT OF SYNC status"
echo -e "  ✓ Pushed changes to staging (update)"
echo -e "  ✓ Pushed to production"
echo -e "  ✓ Made more changes"
echo -e "  ✓ Pushed to staging only"
echo -e "  ✓ Verified different sync states between workspaces"

echo -e "\n${BLUE}Test environment preserved at: /tmp/proper/${NC}"
echo -e "${BLUE}You can continue testing manually or run this script again.${NC}\n"
