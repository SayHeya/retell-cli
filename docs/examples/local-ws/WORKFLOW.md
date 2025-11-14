# Retell CLI Workflow Test

This document guides you through testing the full workflow in this environment.

## Environment Setup

```
/tmp/proper/
├── agents/
│   └── test-agent/
│       └── agent.json          # Fresh test agent (NOT yet synced)
└── prompts/
    ├── base/                   # Shared prompt sections
    │   ├── greeting.txt
    │   ├── instructions.txt
    │   └── ...
    └── ...
```

## CLI Commands Available

```bash
# From /tmp/proper/ directory:
CLI="/home/suisuss/obsidian/.programming/work/heya/repos/retell-dev/bin/retell.js"

# Status - check sync state
node $CLI status test-agent --path agents

# Push - sync to workspace
node $CLI push test-agent --path agents --prompts prompts --workspace staging
node $CLI push test-agent --path agents --prompts prompts --workspace production

# Push with force (bypass sync check)
node $CLI push test-agent --path agents --prompts prompts --workspace staging --force
```

## Workflow Steps

### 1. Check Initial Status
```bash
cd /tmp/proper
node $CLI status test-agent --path agents
```
**Expected:** Shows "NOT SYNCED" for both staging and production

### 2. Push to Staging (First Time)
```bash
node $CLI push test-agent --path agents --prompts prompts --workspace staging
```
**Expected:**
- Creates new agent in Retell staging workspace
- Returns agent ID
- Creates `agents/test-agent/staging.json` metadata file

### 3. Check Status After First Push
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "IN SYNC" with agent ID
- Production: "NOT SYNCED"

### 4. Make Local Changes
```bash
# Change temperature
sed -i 's/"temperature": 0.7/"temperature": 0.8/' agents/test-agent/agent.json

# Change company name
sed -i 's/"Test Company"/"Updated Test Company"/' agents/test-agent/agent.json
```

### 5. Check Status After Changes
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "OUT OF SYNC" (hash mismatch)
- Production: "NOT SYNCED"

### 6. Push Changes to Staging
```bash
node $CLI push test-agent --path agents --prompts prompts --workspace staging
```
**Expected:**
- Updates existing agent (not create)
- New hash in staging.json

### 7. Check Status
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "IN SYNC"
- Production: "NOT SYNCED"

### 8. Push to Production
```bash
node $CLI push test-agent --path agents --prompts prompts --workspace production
```
**Expected:**
- Creates new agent in production workspace
- Creates `agents/test-agent/production.json`

### 9. Check Status (All Synced)
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "IN SYNC"
- Production: "IN SYNC"

### 10. Make More Changes
```bash
# Change responsiveness
sed -i 's/"responsiveness": 0.8/"responsiveness": 0.9/' agents/test-agent/agent.json
```

### 11. Check Status
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "OUT OF SYNC"
- Production: "OUT OF SYNC"

### 12. Push to Staging Only
```bash
node $CLI push test-agent --path agents --prompts prompts --workspace staging
```

### 13. Final Status Check
```bash
node $CLI status test-agent --path agents
```
**Expected:**
- Staging: "IN SYNC"
- Production: "OUT OF SYNC" (still has old version)

## Verification Points

✓ Agent creation in Retell
✓ Agent update in Retell
✓ Hash-based change detection
✓ Independent workspace management
✓ Metadata file creation and updates
✓ Sync status tracking

## Files to Inspect

```bash
# View agent config
cat agents/test-agent/agent.json

# View staging metadata
cat agents/test-agent/staging.json

# View production metadata
cat agents/test-agent/production.json

# View generated prompt (what gets sent to Retell)
# This is calculated during push, combining sections with variables
```

## Notes

- The push command performs variable substitution for STATIC variables only
- OVERRIDE and dynamic variables remain as `{{tags}}` for Retell runtime
- Each workspace maintains independent agent IDs and versions
- The CLI prevents accidental pushes when already in sync (use --force to override)
