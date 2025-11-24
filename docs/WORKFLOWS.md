# GitHub Workflows Reference

## Overview

The Retell CLI provides GitHub Actions workflows that implement a complete GitOps pipeline for managing Retell AI agent configurations. These workflows automate validation, deployment, release creation, and branch synchronization.

For the underlying GitOps methodology, see [GITOPS_METHODOLOGY.md](GITOPS_METHODOLOGY.md).
For CLI command details, see [WORKFLOWS_COMMAND.md](WORKFLOWS_COMMAND.md).

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Repository                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   development branch                                            │
│        │                                                        │
│        ▼ (PR)                                                   │
│   ┌─────────────┐                                               │
│   │  Validate   │ ◄── retell-validate.yml                       │
│   └─────────────┘                                               │
│        │                                                        │
│        ▼ (merge)                                                │
│   staging branch ──► retell-deploy-staging.yml                  │
│        │                   │                                    │
│        │                   ▼                                    │
│        │            [Staging Workspace]                         │
│        │                                                        │
│        ▼ (PR)                                                   │
│   ┌─────────────┐                                               │
│   │  Validate   │ ◄── retell-validate.yml                       │
│   └─────────────┘                                               │
│        │                                                        │
│        ▼ (merge)                                                │
│   production branch ──► retell-deploy-production.yml            │
│                               │                                 │
│                               ├──► [Production Workspace]       │
│                               ├──► [Create Release]             │
│                               └──► [Sync Branches]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Workflows Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `retell-validate.yml` | PR to staging/production | Validate configs, check conflicts |
| `retell-deploy-staging.yml` | Push to staging | Deploy to staging workspace |
| `retell-deploy-production.yml` | Push to production | Deploy, create release, sync branches |
| `retell-drift-detection.yml` | Scheduled (6h) | Detect console modifications |

## Workflow Details

### 1. Validation Workflow (`retell-validate.yml`)

**Trigger:** Pull requests to `staging` or `production` branches

**Purpose:** Ensures configurations are valid and no conflicts exist with target workspace

**Process:**
1. Detects which agents changed in the PR
2. Validates agent configurations (schema, prompts, variables)
3. Checks for conflicts with target workspace using `retell diff`
4. Posts PR comment with results

**Outcomes:**
- **No conflicts:** Posts success comment listing agents to be deployed
- **Conflicts found:** Posts detailed conflict report with resolution instructions, blocks merge

**Example PR Comment (Success):**
```markdown
## ✅ Validation Passed

Ready to deploy to **staging** workspace.

### Agents to be deployed:
- customer-service-agent
- sales-agent

Merge this PR to trigger deployment.
```

**Example PR Comment (Conflicts):**
```markdown
## ⚠️ Conflicts Detected with staging Workspace

The following agents have configurations on Retell that differ from this PR.

### Resolution Required

1. **Keep your changes** (overwrite remote):
   ```bash
   retell diff <agent> -w staging --resolve use-local
   ```

2. **Accept remote changes** (update your PR):
   ```bash
   retell diff <agent> -w staging --resolve use-remote
   ```
```

### 2. Staging Deployment Workflow (`retell-deploy-staging.yml`)

**Trigger:** Push to `staging` branch (typically via merged PR)

**Purpose:** Deploys changed agents to the staging Retell workspace

**Process:**
1. Detects which agents changed in the merge commit
2. Deploys only changed agents using `retell push <agent> -w staging`
3. Updates metadata files with GitOps annotations
4. Commits metadata updates back to repository

**Manual Trigger Options:**
- `agent`: Deploy specific agent only
- `deploy_all`: Deploy all agents (ignores change detection)

**Metadata Updates:**
```json
{
  "workspace": "staging",
  "agent_id": "agent_abc123",
  "llm_id": "llm_xyz789",
  "config_hash": "sha256:...",
  "source_commit": "abc123def",
  "source_branch": "staging",
  "deployed_by": "github-actions[bot]",
  "workflow_run_id": "12345678",
  "deployed_at": "2025-11-24T02:30:00Z"
}
```

### 3. Production Deployment Workflow (`retell-deploy-production.yml`)

**Trigger:** Push to `production` branch (typically via merged PR from staging)

**Purpose:** Deploys to production, creates release, syncs branches

**Jobs:**

#### Job 1: Validate Trigger
- For manual dispatches, requires typing "PRODUCTION" to confirm

#### Job 2: Deploy to Production
1. Detects changed agents
2. Verifies all agents have staging deployments (safety check)
3. Deploys using `retell push <agent> -w production --force`
4. Updates metadata with GitOps annotations
5. Commits metadata updates

#### Job 3: Create Release (runs after deploy succeeds)
1. Generates version tag: `v{YYYY.MM.DD}-{run_number}`
2. Creates zip archive of `agents/` and `prompts/` directories
3. Creates GitHub Release with the zip as downloadable asset

**Release Example:**
```
Production Release v2025.11.24-8

## Production Deployment

**Deployed by:** suisuss-heya
**Commit:** abc123def456
**Workflow Run:** 12345678

This release contains the agent configurations deployed to production.

Assets:
- agents-v2025.11.24-8.zip
```

#### Job 4: Sync Branches (runs after deploy succeeds)
1. Merges production → development
2. Merges production → staging
3. All branches now point to the same commit

**Why sync?** Production deployment commits metadata updates. These need to flow back to development and staging to keep branches aligned and prevent merge conflicts.

### 4. Drift Detection Workflow (`retell-drift-detection.yml`)

**Trigger:**
- Scheduled: Every 6 hours
- Manual dispatch

**Purpose:** Detects when someone modifies agents via Retell Console

**Process:**
1. Iterates through all agents
2. Compares local config hash with remote workspace
3. If drift detected, creates/updates GitHub issue

**Issue Format:**
```markdown
## Configuration Drift Detected

The following agents have been modified outside of Git:

### staging workspace
- customer-service-agent

### Resolution
Pull the remote changes or overwrite with local:
```bash
retell diff <agent> -w <workspace> --resolve use-remote
# or
retell diff <agent> -w <workspace> --resolve use-local
```

## Setup Requirements

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `RETELL_STAGING_API_KEY` | API key for staging workspace |
| `RETELL_PRODUCTION_API_KEY` | API key for production workspace |

### Branch Structure

```
development (default branch)
  └── staging
       └── production
```

### Required Permissions

The workflows require these repository permissions:
- `contents: write` - Commit metadata updates
- `pull-requests: write` - Post PR comments
- `issues: write` - Create drift detection issues

### Branch Protection (Recommended)

**staging branch:**
- Require pull request reviews
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

**production branch:**
- Require pull request reviews (2+ approvals recommended)
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

## Flow Examples

### Deploying a New Agent

```bash
# 1. Create feature branch
git checkout -b feature/add-sales-agent

# 2. Create agent
mkdir -p agents/sales-agent
echo '{"agent_name": "Sales Agent", ...}' > agents/sales-agent/agent.json

# 3. Commit and push
git add agents/sales-agent
git commit -m "feat: add sales agent"
git push -u origin feature/add-sales-agent

# 4. Create PR to staging → validation runs
# 5. Merge → staging deployment runs
# 6. Create PR staging → production → validation runs
# 7. Merge → production deployment + release + sync
```

### Handling Conflicts

When validation detects conflicts:

```bash
# Option 1: Keep your changes (overwrite Retell)
retell diff sales-agent -w staging --resolve use-local
git push

# Option 2: Accept Retell changes (update your code)
retell diff sales-agent -w staging --resolve use-remote
git add agents/sales-agent
git commit -m "chore: pull remote changes"
git push
```

### Manual Production Deployment

Via GitHub Actions UI:
1. Go to Actions → "Deploy to Production"
2. Click "Run workflow"
3. Enter options:
   - `agent`: (optional) specific agent name
   - `deploy_all`: check to deploy all agents
   - `confirm`: type "PRODUCTION"
4. Click "Run workflow"

## Customization

### Change Drift Detection Schedule

```yaml
# .github/workflows/retell-drift-detection.yml
on:
  schedule:
    - cron: '0 */12 * * *'  # Every 12 hours
```

### Add Slack Notifications

```yaml
- name: Notify Slack on failure
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"Production deployment failed!"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Change Release Version Format

```yaml
# In retell-deploy-production.yml
- name: Generate version tag
  run: |
    # Semantic versioning based on tags
    VERSION="v1.0.${{ github.run_number }}"
    echo "version=$VERSION" >> $GITHUB_OUTPUT
```

## Troubleshooting

### Validation Not Triggering

1. Check branch names match exactly (`staging`, `production`)
2. Verify PR changes files in `agents/**` or `prompts/**`
3. Check workflow file syntax

### Deployment Fails with Permission Error

1. Verify API keys are correct and not expired
2. Check secrets are named exactly as expected
3. Ensure environment protection rules allow the workflow

### Branch Sync Fails

1. Check for merge conflicts (shouldn't happen if flow is followed)
2. Verify workflow has `contents: write` permission
3. Check if branch protection blocks bot commits

### Release Creation Fails

1. Check if tag already exists (delete or use different format)
2. Verify workflow has permission to create releases
3. Check zip command succeeded (files exist)

## CLI Version

These workflows install the Retell CLI from source:

```yaml
- name: Install Retell CLI from source
  run: |
    git clone --branch v1.0.0 --depth 1 https://github.com/SayHeya/retell-dev.git /tmp/retell-cli
    cd /tmp/retell-cli
    npm ci && npm run build && npm link
```

To update to a newer CLI version, change the `--branch` tag.

## Related Documentation

- [GITOPS_METHODOLOGY.md](GITOPS_METHODOLOGY.md) - GitOps principles and architecture
- [WORKFLOWS_COMMAND.md](WORKFLOWS_COMMAND.md) - `retell workflows` CLI command
- [CONFLICT_RESOLUTION.md](CONFLICT_RESOLUTION.md) - Handling drift and conflicts
- [DIFF_COMMAND.md](DIFF_COMMAND.md) - Diff command reference
