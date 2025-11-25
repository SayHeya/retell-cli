# GitOps Workflows

This document covers the GitOps methodology, GitHub Actions workflows, and the `retell workflows` command for managing Retell AI agents through version control.

## GitOps Methodology

### Overview

The Retell CLI implements a GitOps workflow where:
- Git is the single source of truth for agent configurations
- All changes flow through Git (branches, PRs, merges)
- Deployments are automated via GitHub Actions
- Staging is always deployed before production

### Branch Structure

```
development (default branch)
  └── staging
       └── production
```

- **development**: Active development branch
- **staging**: Staging environment deployments
- **production**: Production environment deployments

### Workflow

```
1. Create feature branch from development
2. Make changes to agent configs
3. Open PR to staging → Validation runs
4. Merge to staging → Deploys to staging workspace
5. Test in staging environment
6. Open PR from staging to production → Validation runs
7. Merge to production → Deploys to production + creates release
```

## GitHub Actions Workflows

### Setup Command

Generate GitHub Actions workflow files:

```bash
retell workflows init
```

This creates:
- `.github/workflows/retell-validate.yml`
- `.github/workflows/retell-deploy-staging.yml`
- `.github/workflows/retell-deploy-production.yml`
- `.github/workflows/retell-drift-detection.yml`

### Required Secrets

Configure these in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `RETELL_STAGING_API_KEY` | API key for staging workspace |
| `RETELL_PRODUCTION_API_KEY` | API key for production workspace |

### Workflow Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `retell-validate.yml` | PR to staging/production | Validate configs, check conflicts |
| `retell-deploy-staging.yml` | Push to staging | Deploy to staging workspace |
| `retell-deploy-production.yml` | Push to production | Deploy, create release, sync branches |
| `retell-drift-detection.yml` | Scheduled (6h) | Detect console modifications |

### Validation Workflow

**Trigger:** Pull requests to `staging` or `production` branches

**Process:**
1. Detects which agents changed in the PR
2. Validates agent configurations (schema, prompts, variables)
3. Checks for conflicts with target workspace using `retell diff`
4. Posts PR comment with results

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

### Resolution Required

1. **Keep your changes** (overwrite remote):
   retell diff <agent> -w staging --resolve use-local

2. **Accept remote changes** (update your PR):
   retell diff <agent> -w staging --resolve use-remote
```

### Staging Deployment Workflow

**Trigger:** Push to `staging` branch (via merged PR)

**Process:**
1. Detects changed agents in the merge commit
2. Deploys only changed agents using `retell push <agent> -w staging`
3. Updates metadata files with GitOps annotations
4. Commits metadata updates back to repository

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

### Production Deployment Workflow

**Trigger:** Push to `production` branch (via merged PR from staging)

**Jobs:**

1. **Validate Trigger**: Requires typing "PRODUCTION" for manual dispatches
2. **Deploy to Production**: Deploys agents, updates metadata
3. **Create Release**: Generates version tag `v{YYYY.MM.DD}-{run_number}`, creates zip archive
4. **Sync Branches**: Merges production → development and production → staging

### Drift Detection Workflow

**Trigger:** Every 6 hours (scheduled) or manual dispatch

**Purpose:** Detects when someone modifies agents via Retell Console

**Creates GitHub Issue:**
```markdown
## Configuration Drift Detected

The following agents have been modified outside of Git:

### staging workspace
- customer-service-agent

### Resolution
retell diff <agent> -w <workspace> --resolve use-remote
# or
retell diff <agent> -w <workspace> --resolve use-local
```

## Branch Protection (Recommended)

**staging branch:**
- Require pull request reviews
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

**production branch:**
- Require pull request reviews (2+ approvals recommended)
- Require status checks: "Validate & Check Conflicts"
- Require branches to be up to date

## Conflict Resolution

### Using the Diff Command

Compare local configuration with remote workspace:

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
```bash
# Option 1: Keep your changes
retell diff sales-agent -w staging --resolve use-local
git push

# Option 2: Accept remote changes
retell diff sales-agent -w staging --resolve use-remote
git add agents/sales-agent
git commit -m "chore: pull remote changes"
git push
```

**Scenario 2: Drift detected (someone edited in Retell Console)**
```bash
# Pull remote changes to local
retell diff my-agent -w staging --resolve use-remote
git add agents/my-agent
git commit -m "chore: sync with Retell console changes"
git push
```

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
1. Check for merge conflicts
2. Verify workflow has `contents: write` permission
3. Check if branch protection blocks bot commits
