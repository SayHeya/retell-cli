# Testing Workspace Agent Limits

This directory contains scripts for creating and pushing multiple agents to test Retell AI workspace limits.

## Overview

We want to determine how many agents can fit in a Retell AI workspace. These scripts help create and deploy 100 test agents to find out.

## Scripts

### 1. `create-100-agents.sh` (Recommended)

Bash script that creates 100 test agent directories with config files.

**Usage:**
```bash
npm run create-100-agents
# or
./scripts/create-100-agents.sh
```

**What it does:**
- Creates `test-agents-100/` directory
- Generates 100 agent folders: `test-agent-001` through `test-agent-100`
- Each agent has:
  - `agent.json` - Agent configuration
  - `staging.json` - Staging metadata (empty stub)
  - `production.json` - Production metadata (empty stub)
  - `knowledge/` - Empty knowledge base directory

**Duration:** ~1 second

### 2. `create-100-agents.ts`

TypeScript version of the agent creation script with better error handling.

**Usage:**
```bash
npm run create-100-agents:ts
# or
ts-node scripts/create-100-agents.ts
```

**Features:**
- Progress tracking
- Error reporting
- Summary statistics

### 3. `push-agents-with-rate-limit.sh` (Smart Pusher)

Pushes agents to Retell with built-in rate limiting to avoid API errors.

**Usage:**
```bash
npm run push-100-agents
# or
./scripts/push-agents-with-rate-limit.sh [agents-dir] [workspace] [delay]

# Examples:
./scripts/push-agents-with-rate-limit.sh test-agents-100 staging 2
./scripts/push-agents-with-rate-limit.sh test-agents-100 staging 5  # Slower, safer
```

**Parameters:**
- `agents-dir` - Directory containing agents (default: `test-agents-100`)
- `workspace` - Workspace to push to (default: `staging`)
- `delay` - Seconds to wait between pushes (default: `2`)

**Features:**
- ✅ Confirmation prompt before pushing
- ⏱️ Configurable delay between pushes (avoid rate limits)
- 🔄 Automatic 10s wait if rate limit detected
- 📊 Progress tracking and summary
- ❌ Error handling and retry capability

**Duration:**
- ~5-10 minutes for 100 agents (with 2s delay)
- ~10-15 minutes for 100 agents (with 5s delay - safer)

## Complete Workflow

### Step 1: Create Test Agents

```bash
npm run create-100-agents
```

Output:
```
✅ Created 10/100 agents
✅ Created 20/100 agents
...
✅ Successfully created: 100/100 agents
📁 Location: test-agents-100
```

### Step 2: Configure Workspace

Make sure you have a workspace configured:

```bash
retell workspace add staging YOUR_API_KEY
```

### Step 3: Push Agents (with rate limiting!)

```bash
npm run push-100-agents
```

The script will:
1. Show you how many agents will be pushed
2. Ask for confirmation
3. Push each agent with 2-second delays
4. Detect rate limits and wait if needed
5. Show final summary

### Step 4: Monitor Results

Watch for:
- ✅ How many agents successfully created
- ❌ Any errors (especially workspace limit errors)
- 📊 Check your Retell dashboard for all agents

## Expected Outcomes

### Scenario 1: No Limit Reached
- All 100 agents push successfully
- You might want to create more agents to find the limit

### Scenario 2: Limit Reached
- Pushes start failing at some point
- Error messages may indicate workspace limit
- Count how many succeeded to know the limit

### Scenario 3: Rate Limited
- You'll see `429` or "rate limit" errors
- The script automatically waits 10 seconds when detected
- You can increase the delay parameter for safer pushing

## Rate Limiting Tips

Retell AI may have rate limits. To be safe:

1. **Start with higher delay:**
   ```bash
   ./scripts/push-agents-with-rate-limit.sh test-agents-100 staging 5
   ```

2. **Push in batches:**
   ```bash
   # Push first 25 agents
   for i in {001..025}; do
     retell push test-agents-100/test-agent-$i -w staging -y
     sleep 3
   done
   ```

3. **Monitor the output:**
   - If you see rate limit errors, stop and increase delay
   - Wait a few minutes before retrying

## Cleaning Up

### Remove Local Test Agents
```bash
rm -rf test-agents-100
```

### Delete Agents from Retell (if needed)
You'll need to use the Retell API or dashboard to delete agents remotely.

Example API approach (not yet implemented in CLI):
```bash
# Future CLI command (not implemented yet)
# retell agent delete test-agent-001 -w staging
```

## Troubleshooting

### "Template file not found"
Make sure you're running from the project root directory:
```bash
cd /path/to/retell-dev
npm run create-100-agents
```

### "retell command not found"
Build and link the CLI first:
```bash
npm run build
npm link
```

### Rate limit errors
Increase the delay between pushes:
```bash
./scripts/push-agents-with-rate-limit.sh test-agents-100 staging 10
```

### Some agents fail to push
Re-run the push script - it will skip already-pushed agents and retry failed ones.

## Contributing

Feel free to modify these scripts for your needs:
- Change the number of agents
- Customize agent configurations
- Adjust rate limiting strategies
- Add more sophisticated error handling

## Notes

- These are **test agents** - don't use in production
- Each agent uses the simple template from `tests/fixtures/agents/valid-simple-agent.json`
- Agents are numbered `001-100` for easy identification
- The scripts handle errors gracefully and provide summaries
