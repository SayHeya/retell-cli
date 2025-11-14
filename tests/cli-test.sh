#!/bin/bash

# CLI Integration Tests
# Tests the actual compiled CLI binary to ensure it works end-to-end

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
CLI_BIN="$PROJECT_ROOT/bin/retell.js"
FIXTURE_DIR="$PROJECT_ROOT/tests/fixtures/complete-project"

echo -e "${YELLOW}Running CLI Integration Tests${NC}\n"

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((TESTS_PASSED++))
  ((TESTS_RUN++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  echo -e "  ${RED}Error: $2${NC}"
  ((TESTS_FAILED++))
  ((TESTS_RUN++))
}

test_command() {
  local description="$1"
  local command="$2"
  local expected_exit_code="${3:-0}"

  eval "$command" > /dev/null 2>&1
  actual_exit_code=$?

  if [ "$actual_exit_code" -eq "$expected_exit_code" ]; then
    pass "$description"
  else
    fail "$description" "Expected exit code $expected_exit_code, got $actual_exit_code"
  fi
}

test_output_contains() {
  local description="$1"
  local command="$2"
  local expected_string="$3"

  output=$(eval "$command" 2>&1)

  if echo "$output" | grep -q "$expected_string"; then
    pass "$description"
  else
    fail "$description" "Output does not contain '$expected_string'"
    echo -e "  ${YELLOW}Output:${NC}"
    echo "$output" | head -5
  fi
}

# Ensure CLI is built
echo "Building CLI..."
cd "$PROJECT_ROOT"
npm run build > /dev/null 2>&1

echo -e "\n${YELLOW}Testing CLI Help Commands${NC}"
test_command "CLI shows help" "node '$CLI_BIN' --help"
test_command "CLI shows version" "node '$CLI_BIN' --version"
test_output_contains "Help shows push command" "node '$CLI_BIN' --help" "push"
test_output_contains "Help shows pull command" "node '$CLI_BIN' --help" "pull"
test_output_contains "Help shows status command" "node '$CLI_BIN' --help" "status"
test_output_contains "Help shows list command" "node '$CLI_BIN' --help" "list"

echo -e "\n${YELLOW}Testing Push Command${NC}"
test_command "Push command shows help" "node '$CLI_BIN' push --help"
test_output_contains "Push help shows workspace option" "node '$CLI_BIN' push --help" "workspace"
test_output_contains "Push help shows force option" "node '$CLI_BIN' push --help" "force"

echo -e "\n${YELLOW}Testing Pull Command${NC}"
test_command "Pull command shows help" "node '$CLI_BIN' pull --help"
test_output_contains "Pull help shows workspace option" "node '$CLI_BIN' pull --help" "workspace"

echo -e "\n${YELLOW}Testing Status Command${NC}"
test_command "Status command shows help" "node '$CLI_BIN' status --help"
test_output_contains "Status help shows path option" "node '$CLI_BIN' status --help" "path"

# Test status with fixture data
cd "$FIXTURE_DIR"
test_command "Status runs with fixture data" "node '$CLI_BIN' status --path agents"
test_output_contains "Status shows customer-service agent" "node '$CLI_BIN' status --path agents" "customer-service"
test_output_contains "Status shows sales-agent" "node '$CLI_BIN' status --path agents" "sales-agent"
test_output_contains "Status shows staging workspace" "node '$CLI_BIN' status --path agents" "Staging"
test_output_contains "Status shows production workspace" "node '$CLI_BIN' status --path agents" "Production"
test_output_contains "Status shows sync status" "node '$CLI_BIN' status --path agents" "Status:"

# Test status with specific agent
test_command "Status runs for specific agent" "node '$CLI_BIN' status customer-service --path agents"
test_output_contains "Status shows only requested agent" "node '$CLI_BIN' status customer-service --path agents" "customer-service"

echo -e "\n${YELLOW}Testing List Command${NC}"
test_command "List command shows help" "node '$CLI_BIN' list --help"
test_output_contains "List help shows workspace option" "node '$CLI_BIN' list --help" "workspace"

echo -e "\n${YELLOW}Testing Error Cases${NC}"
test_output_contains "Status handles non-existent path gracefully" "node '$CLI_BIN' status --path /nonexistent/path" "No agents found"

# Summary
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
