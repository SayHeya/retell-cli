# GitHub Workflow Templates

These workflow templates implement GitOps for Retell AI agent management. Export them to your project using `retell workflows init`.

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `retell-validate.yml` | PRs to staging/production | Check conflicts before merge |
| `retell-deploy-staging.yml` | Push to staging | Deploy to staging workspace |
| `retell-deploy-production.yml` | Push to production | Deploy to production workspace |
| `retell-drift-detection.yml` | Every 6 hours | Detect console modifications |
| `retell-release.yml` | GitHub Release | Package agents into archives |

## Required Secrets

Add these to your GitHub repository (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `RETELL_STAGING_API_KEY` | API key for staging workspace |
| `RETELL_PRODUCTION_API_KEY` | API key for production workspace |

## Setup

```bash
# Export workflows to your project
retell workflows init

# Creates:
# .github/workflows/retell-validate.yml
# .github/workflows/retell-deploy-staging.yml
# .github/workflows/retell-deploy-production.yml
# .github/workflows/retell-drift-detection.yml
# .github/workflows/retell-release.yml
```

## Workflow Flow

```
┌─────────────────────────────────┐
│   PR to staging                 │
│   → retell-validate.yml         │
│   → Checks for conflicts        │
└────────────┬────────────────────┘
             │ Merge
             ▼
┌─────────────────────────────────┐
│   Push to staging               │
│   → retell-deploy-staging.yml   │
│   → Deploys changed agents      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   PR to production              │
│   → retell-validate.yml         │
│   → Checks for conflicts        │
└────────────┬────────────────────┘
             │ Merge
             ▼
┌─────────────────────────────────┐
│   Push to production            │
│   → retell-deploy-production.yml│
│   → Deploys changed agents      │
└─────────────────────────────────┘

      ┌─────────────────────┐
      │ Every 6 hours       │
      │ → drift-detection   │
      │ → Creates issue     │
      └─────────────────────┘
```

## GitHub Environments (Recommended)

Create protected environments in Settings → Environments:

**staging**
- No approval required
- Used by: `retell-deploy-staging.yml`

**production**
- Required reviewers: team leads
- Used by: `retell-deploy-production.yml`

## Branch Protection (Recommended)

For `staging` and `production` branches:
- Require pull request reviews
- Require status checks (Validate workflow)
- Require branches to be up to date

## Customization

### Change drift detection schedule

```yaml
# In retell-drift-detection.yml
on:
  schedule:
    - cron: '0 */12 * * *'  # Every 12 hours
```

### Add Slack notifications

```yaml
- name: Notify Slack
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"text":"Deployment failed!"}' \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Deploy specific agents only

```yaml
- name: Deploy
  run: |
    for agent in customer-service sales-agent; do
      retell push "$agent" -w staging
    done
```

## Troubleshooting

### Workflow not triggering
- Check branch names match (`staging`, `production`)
- Verify changes are in `agents/**` or `prompts/**`
- Check secrets are configured

### Permission denied
- Verify API keys are valid
- Check secrets are named correctly
- Review environment protection rules

### Metadata commit fails
- Workflow needs `contents: write` permission
- Branch protection may block bot commits
- Add `github-actions[bot]` to allowed actors
