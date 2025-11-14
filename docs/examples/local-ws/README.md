# Retell CLI Test Environment

This is a complete test environment set up in `/tmp/proper/` for testing the Retell CLI workflow.

## Quick Start

```bash
cd /tmp/proper

# Check status
./cli.sh status

# Push to staging
./cli.sh push-staging

# Check status again
./cli.sh status

# Make a change
sed -i 's/"temperature": 0.7/"temperature": 0.8/' agents/test-agent/agent.json

# Check status (should show OUT OF SYNC)
./cli.sh status

# Push update to staging
./cli.sh push-staging

# Push to production
./cli.sh push-production
```

## Available Commands

The `./cli.sh` helper script provides:

- `status` - Check sync status across workspaces
- `push-staging` - Push to staging workspace
- `push-production` - Push to production workspace
- `push-staging-force` - Force push to staging (bypass sync check)
- `show-config` - View agent configuration
- `show-staging` - View staging metadata
- `show-production` - View production metadata

## Full Workflow Guide

See [WORKFLOW.md](./WORKFLOW.md) for detailed step-by-step instructions.

## Directory Structure

```
/tmp/proper/
├── cli.sh                      # Helper script for easy CLI access
├── README.md                   # This file
├── WORKFLOW.md                 # Detailed workflow guide
├── agents/
│   └── test-agent/
│       ├── agent.json          # Agent configuration
│       ├── staging.json        # Created after first push to staging
│       └── production.json     # Created after first push to production
└── prompts/
    ├── base/                   # Shared prompt sections
    └── ...                     # Other prompt directories
```

## What Gets Tested

✅ **Agent Creation** - First push creates new agent in Retell
✅ **Agent Updates** - Subsequent pushes update existing agent
✅ **Change Detection** - Hash-based detection of local changes
✅ **Sync Status** - Track IN SYNC / OUT OF SYNC / NOT SYNCED states
✅ **Workspace Independence** - Staging and production managed separately
✅ **Metadata Management** - Automatic creation and updates of metadata files
✅ **Variable Substitution** - Static variables replaced, dynamic/override preserved

## Environment Details

- **Agent**: test-agent (fresh, clean agent)
- **Prompts**: Copied from fixtures (base/greeting.txt, base/instructions.txt, etc.)
- **Workspaces**: Uses API keys from your `.env` file
- **CLI**: Points to your built CLI at `retell-dev/bin/retell.js`

## Making Changes

Edit the agent config:
```bash
vim agents/test-agent/agent.json
# or
code agents/test-agent/agent.json
```

Common changes to test:
- Temperature: `"temperature": 0.7` → `0.8`
- Company name: `"Test Company"` → `"Updated Company"`
- Responsiveness: `"responsiveness": 0.8` → `0.9`
- Voice settings: `"voice_id": "11labs-Adrian"` → other voice

## Expected Behavior

### First Push (Staging)
- Creates new agent in Retell staging workspace
- Returns agent ID (e.g., `agent_abc123...`)
- Creates `agents/test-agent/staging.json` with metadata
- Status shows "IN SYNC" for staging

### After Local Changes
- Status shows "OUT OF SYNC" for staging
- Config hash differs from metadata hash

### Update Push (Staging)
- Updates existing agent (doesn't create new one)
- Uses same agent ID
- Updates hash in `staging.json`
- Status shows "IN SYNC" again

### Production Push
- Independent from staging
- Creates separate agent ID for production
- Creates `agents/test-agent/production.json`
- Can have different versions than staging

## Troubleshooting

**Problem**: Push fails with API error
- Check your `.env` file has valid API keys
- Ensure `RETELL_STAGING_API_KEY` and `RETELL_PRODUCTION_API_KEY` are set

**Problem**: Status shows ERROR
- Check `agent.json` is valid JSON
- Run `cat agents/test-agent/agent.json | jq .` to validate

**Problem**: Can't find CLI
- The helper script uses absolute path
- Or run directly: `node /home/suisuss/obsidian/.programming/work/heya/repos/retell-dev/bin/retell.js`

## Clean Up

To start fresh:
```bash
# Re-run setup script
bash /home/suisuss/obsidian/.programming/work/heya/repos/retell-dev/scripts/setup-test-env.sh
```

## Next Steps

After testing the workflow:
1. Verify agents were created in Retell dashboard
2. Check that agent IDs match between CLI output and dashboard
3. Verify prompt substitution worked correctly
4. Test with your own agent configurations
