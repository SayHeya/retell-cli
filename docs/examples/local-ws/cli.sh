#!/bin/bash
# Helper script to run CLI commands easily

CLI="../../../bin/retell.js"
AGENT="test-agent"

case "$1" in
  status)
    node "$CLI" status $AGENT --path agents
    ;;
  push-staging)
    node "$CLI" push $AGENT --path agents --prompts prompts --workspace staging
    ;;
  push-production)
    node "$CLI" push $AGENT --path agents --prompts prompts --workspace production
    ;;
  push-staging-force)
    node "$CLI" push $AGENT --path agents --prompts prompts --workspace staging --force
    ;;
  show-config)
    cat agents/$AGENT/agent.json | jq .
    ;;
  show-staging)
    cat agents/$AGENT/staging.json 2>/dev/null | jq . || echo "No staging metadata yet"
    ;;
  show-production)
    cat agents/$AGENT/production.json 2>/dev/null | jq . || echo "No production metadata yet"
    ;;
  *)
    echo "Usage: $0 {status|push-staging|push-production|push-staging-force|show-config|show-staging|show-production}"
    echo ""
    echo "Examples:"
    echo "  ./cli.sh status              # Check sync status"
    echo "  ./cli.sh push-staging        # Push to staging"
    echo "  ./cli.sh push-production     # Push to production"
    echo "  ./cli.sh show-config         # View agent config"
    echo "  ./cli.sh show-staging        # View staging metadata"
    exit 1
    ;;
esac
