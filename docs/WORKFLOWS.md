# GitOps Workflows

This document covers the GitOps methodology, GitHub Actions workflows, and the `retell workflows` command for managing Retell AI agents through version control.

## Table of Contents

- [Overview](#overview)
- [Repository Setup](#repository-setup)
- [Branch Strategy](#branch-strategy)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Workflow Details](#workflow-details)
- [Developer Workflow](#developer-workflow)
- [Conflict Resolution](#conflict-resolution)
- [Multi-Production Mode](#multi-production-mode)
- [Release Management](#release-management)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Retell CLI implements a GitOps workflow where:

- **Git is the single source of truth** for agent configurations
- **All changes flow through Git** (branches, PRs, merges)
- **Deployments are automated** via GitHub Actions
- **Staging is always deployed before production** (staging-first workflow)
- **Drift is automatically detected** when someone edits via Retell Console

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITOPS FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Developer        GitHub Actions           Retell Platform                   │
│  ─────────        ──────────────           ───────────────                   │
│                                                                              │
│  ┌──────────┐     ┌──────────────┐                                          │
│  │  Edit    │────►│   Validate   │                                          │
│  │ agent.json│     │    Syntax    │                                          │
│  └──────────┘     └──────┬───────┘                                          │
│                          │                                                   │
│  ┌──────────┐            ▼                                                   │
│  │ Create   │     ┌──────────────┐         ┌──────────────┐                 │
│  │   PR     │────►│Check Conflicts│────────►│   Staging    │                 │
│  └──────────┘     └──────┬───────┘         │  Workspace   │                 │
│                          │                  └──────────────┘                 │
│  ┌──────────┐            ▼                                                   │
│  │  Merge   │     ┌──────────────┐         ┌──────────────┐                 │
│  │   PR     │────►│    Deploy    │────────►│  Production  │                 │
│  └──────────┘     │   + Publish  │         │  Workspace   │                 │
│                   └──────────────┘         └──────────────┘                 │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  DRIFT DETECTION (Background - Every 6 Hours)                                │
│                                                                              │
│                   ┌──────────────┐         ┌──────────────┐                 │
│                   │   Scheduled  │◄────────│   Retell     │                 │
│                   │    Check     │         │  Workspace   │                 │
│                   └──────┬───────┘         └──────────────┘                 │
│                          │                                                   │
│                          ▼                                                   │
│  ┌──────────┐     ┌──────────────┐                                          │
│  │  Review  │◄────│  Create PR   │                                          │
│  │    PR    │     │  with diff   │                                          │
│  └──────────┘     └──────────────┘                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Setup

### Initialize Workflows

Generate GitHub Actions workflow files:

```bash
retell workflows init
```

This creates:
- `.github/workflows/retell-validate.yml` - PR validation & conflict checking
- `.github/workflows/retell-deploy-staging.yml` - Staging deployment
- `.github/workflows/retell-deploy-production.yml` - Production deployment
- `.github/workflows/retell-drift-detection.yml` - Drift detection & auto-PR

### Repository Structure

```
your-project/
├── agents/
│   └── my-agent/
│       ├── agent.json         # Agent configuration (source of truth)
│       ├── staging.json       # Staging deployment metadata
│       └── production.json    # Production deployment metadata
├── prompts/                   # Shared prompt templates
├── templates/                 # Agent templates for bulk creation
├── workspaces.json           # Workspace configuration (safe to commit)
├── .env                      # API keys (DO NOT commit)
└── .github/
    └── workflows/            # CI/CD workflows
        ├── retell-validate.yml
        ├── retell-deploy-staging.yml
        ├── retell-deploy-production.yml
        ├── retell-drift-detection.yml
        └── retell-release.yml
```

### Required GitHub Secrets

Configure these in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `GH_PAT` | GitHub Personal Access Token (for CLI download) |
| `RETELL_STAGING_API_KEY` | API key for staging workspace |
| `RETELL_PRODUCTION_API_KEY` | API key for production workspace |

### GitHub Environments

Configure protected environments:

| Environment | Purpose | Recommended Protection |
|-------------|---------|------------------------|
| `staging` | Staging deployments | No approval required |
| `production` | Production deployments | Require 1+ approvals |

---

## Branch Strategy

### Three-Branch Model

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `develop` | Active development | None (validation only) |
| `staging` | Pre-production testing | Retell Staging Workspace |
| `production` | Live agents | Retell Production Workspace |

### Branch Flow

```
develop (default branch)
  └── staging
       └── production
```

### Branch Protection (Recommended)

**staging branch:**
- Require pull request before merging
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

**production branch:**
- Require pull request before merging
- Require 2+ approvals
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

---

## GitHub Actions Workflows

### Workflow Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `retell-validate.yml` | PR to staging/production, push to develop | Validate configs, check conflicts |
| `retell-deploy-staging.yml` | Push to staging, manual | Deploy to staging workspace |
| `retell-deploy-production.yml` | Push to production, manual | Deploy, publish versions, sync branches |
| `retell-drift-detection.yml` | Scheduled (6h), manual | Detect console modifications, auto-create PRs |
| `retell-release.yml` | GitHub Release creation | Package agents, create release artifacts |

---

## Workflow Details

### 1. Validation Workflow (`retell-validate.yml`)

**Triggers:**
- Push to `develop` branch (syntax validation only)
- Pull requests to `staging` or `production` (full validation + conflict check)

**Process:**
1. Detects which agents changed in the PR
2. Validates agent configurations (JSON syntax, schema)
3. Checks for conflicts with target workspace using `retell diff`
4. Posts PR comment with results
5. **Blocks merge if conflicts exist**

**Example Success Comment:**
```markdown
## ✅ Validation Passed

Ready to deploy to **staging** workspace.

### Agents to be deployed:
- customer-service-agent
- sales-agent

Merge this PR to trigger deployment.
```

**Example Conflict Comment:**
```markdown
## ⚠️ Conflicts Detected with staging Workspace

The following agents have configurations on Retell that differ from this PR.
This typically means someone modified the agent via the Retell Console.

### Resolution Required

1. **Keep your changes** (overwrite remote):
   ```bash
   retell push <agent> -w staging --force
   ```

2. **Accept remote changes** (update your PR):
   ```bash
   retell pull <agent> -w staging --force
   git add agents/<agent>/
   git commit -m "Pull remote changes"
   git push
   ```
```

### 2. Staging Deployment Workflow (`retell-deploy-staging.yml`)

**Triggers:**
- Push to `staging` branch (via merged PR)
- Manual workflow dispatch (optional: specific agent or deploy all)

**Process:**
1. Detects changed agents from merge commit
2. Deploys each changed agent: `retell push <agent> -w staging`
3. Updates `staging.json` metadata with GitOps annotations
4. Commits metadata updates back to repository

**Metadata Annotations Added:**
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

**Triggers:**
- Push to `production` branch (via merged PR from staging)
- Manual workflow dispatch (requires typing "PRODUCTION" to confirm)

**Process:**
1. **Validate trigger** - Requires confirmation for manual dispatches
2. **Verify staging sync** - Ensures all agents were deployed to staging first
3. **Deploy agents** - `retell push <agent> -w production --force`
4. **Publish versions** - Creates immutable snapshots: `retell version publish <agent> -w production`
5. **Update metadata** - Adds GitOps annotations to `production.json`
6. **Sync branches** - Force-pushes production to staging and develop

**Why Branch Sync?**
After a successful production deployment, the workflow synchronizes all branches to the same commit. This prevents merge conflicts in subsequent PRs by ensuring develop and staging branches have the latest production metadata commits.

### 4. Drift Detection Workflow (`retell-drift-detection.yml`)

**Triggers:**
- Scheduled: Every 6 hours (`0 */6 * * *`)
- Manual workflow dispatch

**Purpose:**
Detects when someone modifies agents via Retell Console instead of Git.

**Process:**
1. Checks all agents for configuration drift using `retell diff`
2. Creates separate PRs for staging and production drift
3. PRs include detailed explanation and resolution options
4. Adds labels: `drift-detection`, `auto-generated`, `needs-attention`

**Auto-Generated PR Example:**
```markdown
## Staging Configuration Drift Detected

This PR contains changes that were made directly in the **Retell Console**.

### Why This Happened

Someone modified agent configuration(s) using the Retell web interface
instead of through Git.

### Affected Agents

- `customer-service-agent`

### Options

1. **Merge this PR** - Accept the remote changes into Git
2. **Close and force push** - Reject remote changes, restore Git version:
   ```bash
   retell push customer-service-agent -w staging --force
   ```
```

### 5. Release Workflow (`retell-release.yml`)

**Triggers:**
- GitHub Release creation
- Manual workflow dispatch

**Process:**
1. Validates all agent configurations
2. Creates `RELEASE_MANIFEST.json` with agent metadata
3. Packages `agents/` directory into archives (`.tar.gz` and `.zip`)
4. Uploads artifacts to GitHub Release
5. Generates release notes with agent inventory

**Release Artifacts:**
- `retell-agents-v1.0.0.tar.gz`
- `retell-agents-v1.0.0.zip`
- `RELEASE_MANIFEST.json`

---

## Developer Workflow

### Making Changes to an Agent

```bash
# 1. Create feature branch from develop
git checkout develop
git pull
git checkout -b feature/update-agent-prompt

# 2. Make changes
vim agents/my-agent/agent.json

# 3. Test locally (optional)
retell diff my-agent -w staging

# 4. Commit and push
git add agents/my-agent/
git commit -m "feat: update my-agent prompt"
git push -u origin feature/update-agent-prompt

# 5. Create PR to develop
# → GitHub Actions validates syntax

# 6. Merge to develop, then create PR from develop → staging
# → GitHub Actions checks for conflicts

# 7. Merge to staging → Deploys to staging workspace

# 8. Test in staging environment

# 9. Create PR from staging → production
# → GitHub Actions validates
# → Requires approval (if configured)

# 10. Merge to production → Deploys + publishes versions
```

### Quick Status Check

```bash
# Check sync status for all agents
retell list

# Check specific agent
retell status my-agent

# Compare local vs remote
retell diff my-agent -w staging
retell diff my-agent -w production
```

---

## Conflict Resolution

### Using the Diff Command

```bash
# Show differences
retell diff <agent> -w staging

# Keep local changes (overwrite remote)
retell diff <agent> -w staging --resolve use-local

# Accept remote changes (update local)
retell diff <agent> -w staging --resolve use-remote
```

### Common Scenarios

**Scenario 1: PR validation shows conflicts**

Someone modified the agent via Retell Console. Choose:

```bash
# Option 1: Keep your PR changes (discard console edits)
retell push my-agent -w staging --force
git push

# Option 2: Accept console changes (update your PR)
retell pull my-agent -w staging --force
git add agents/my-agent
git commit -m "chore: pull remote changes"
git push
```

**Scenario 2: Drift detection creates a PR**

Review the auto-generated PR:

1. **If changes are valid** - Merge the PR to sync Git with Retell
2. **If changes should be reverted** - Close PR and force push:
   ```bash
   retell push my-agent -w staging --force
   ```

**Scenario 3: Production push blocked**

Production push requires matching staging:

```bash
# First push to staging
retell push my-agent -w staging

# Then push to production
retell push my-agent -w production
```

---

## Multi-Production Mode

For organizations with multiple production workspaces (regional deployments, client isolation):

### Configuration

```json
{
  "mode": "multi-production",
  "staging": {
    "api_key_env": "RETELL_STAGING_API_KEY",
    "name": "Staging Workspace"
  },
  "production": {
    "prod-us-east": {
      "api_key_env": "RETELL_PROD_US_EAST_API_KEY",
      "name": "Production US-East"
    },
    "prod-us-west": {
      "api_key_env": "RETELL_PROD_US_WEST_API_KEY",
      "name": "Production US-West"
    },
    "prod-eu": {
      "api_key_env": "RETELL_PROD_EU_API_KEY",
      "name": "Production EU"
    }
  }
}
```

### Usage

```bash
# Push to specific production workspace
retell push my-agent -w prod-us-east
retell push my-agent -w prod-us-west

# Check versions per workspace
retell version list my-agent -w prod-us-east

# Rollback in specific workspace
retell version rollback my-agent -w prod-eu --to 5
```

### Metadata Files

Each workspace gets its own metadata file:
- `staging.json`
- `prod-us-east.json`
- `prod-us-west.json`
- `prod-eu.json`

---

## Release Management

### Creating a Release

1. Create a GitHub Release with a version tag (e.g., `v1.0.0`)
2. The release workflow automatically:
   - Validates all agent configurations
   - Creates a release manifest
   - Packages agents into archives
   - Uploads artifacts to the release

### Restoring from a Release

```bash
# Download and extract
curl -LO https://github.com/your-org/your-repo/releases/download/v1.0.0/retell-agents-v1.0.0.tar.gz
tar -xzvf retell-agents-v1.0.0.tar.gz

# Deploy to staging
retell push my-agent -w staging

# Deploy to production
retell push my-agent -w production
```

---

## Customization

### Change Drift Detection Schedule

```yaml
# .github/workflows/retell-drift-detection.yml
on:
  schedule:
    - cron: '0 */12 * * *'  # Every 12 hours instead of 6
```

### Add Slack Notifications

```yaml
- name: Notify Slack on drift
  if: needs.detect-drift.outputs.staging_drift == 'true'
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{
        "text": "Configuration drift detected in Retell agents!",
        "attachments": [{
          "color": "warning",
          "fields": [
            {"title": "Staging", "value": "${{ needs.detect-drift.outputs.staging_agents }}"}
          ]
        }]
      }' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Skip Certain Agents

Add to workflow:

```yaml
- name: Deploy agents
  run: |
    for agent_dir in agents/*/; do
      agent_name=$(basename "$agent_dir")

      # Skip test agents
      if [[ "$agent_name" == test-* ]]; then
        echo "Skipping test agent: $agent_name"
        continue
      fi

      retell push "$agent_name" -w staging
    done
```

---

## Troubleshooting

### Validation Not Triggering

1. Check branch names match exactly (`develop`, `staging`, `production`)
2. Verify PR changes files in `agents/**` or `prompts/**`
3. Check workflow file syntax in `.github/workflows/`
4. Ensure workflow permissions include `contents: read` and `pull-requests: write`

### Deployment Fails with Permission Error

1. Verify API keys are correct and not expired
2. Check secrets are named exactly as expected
3. Ensure environment protection rules allow the workflow
4. Check that `workspaces.json` is generated correctly

### Conflicts Blocking PR

1. Run `retell diff <agent> -w <workspace>` to see differences
2. Choose resolution: `--resolve use-local` or `--resolve use-remote`
3. Commit and push the resolution
4. Re-run workflow checks

### Branch Sync Fails

1. Check for merge conflicts
2. Verify workflow has `contents: write` permission
3. Check if branch protection blocks bot commits (may need to allow `github-actions[bot]`)
4. Ensure staging and develop branches exist

### Drift Detection Creating Too Many PRs

Someone is frequently editing via Console. Consider:
1. Training team to use Git workflow
2. Restricting Console access for production agents
3. Adjusting drift detection schedule (less frequent)
4. Adding notification before auto-PR creation

---

## Related Documentation

- [SPECIFICATION.md](./SPECIFICATION.md) - Complete CLI command reference
- [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) - Architecture details
- [PHONE_MANAGEMENT.md](./PHONE_MANAGEMENT.md) - Phone number and SIP trunk setup
- [MCP_SETUP.md](./MCP_SETUP.md) - Model Context Protocol configuration
