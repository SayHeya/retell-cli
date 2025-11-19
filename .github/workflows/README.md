# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Retell CLI project.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:** Every push and pull request

**Jobs:**
- **Lint**: Runs ESLint on all TypeScript files
- **Format Check**: Verifies code formatting with Prettier
- **Type Check**: Runs TypeScript compiler in check mode
- **Test**: Runs Jest test suite on Node 18.x and 20.x
- **Build**: Builds the CLI and verifies no build errors

**Purpose:** Ensures code quality and prevents breaking changes

### 2. Coverage Workflow (`coverage.yml`)

**Triggers:** Push to main branch and pull requests

**Jobs:**
- **Generate Coverage Report**:
  - Runs tests with coverage enabled
  - Uploads coverage to Codecov
  - Generates coverage summary in GitHub Actions
  - Archives coverage reports as artifacts
  - Comments on PRs with coverage metrics

**Features:**
- Coverage summary in GitHub step summary
- Automatic PR comments with coverage data
- Coverage artifacts stored for 30 days
- Codecov integration for tracking coverage over time

**Metrics Tracked:**
- Line coverage
- Function coverage
- Branch coverage

### 3. Coverage Badge Workflow (`coverage-badge.yml`)

**Triggers:** Push to main branch only

**Jobs:**
- **Update Coverage Badge**:
  - Runs tests with coverage
  - Extracts coverage percentage
  - Updates dynamic badge via Gist (if configured)
  - Updates README.md with latest coverage percentage
  - Auto-commits changes

**Requirements:**
To use the dynamic badge feature, set up these secrets:
- `GIST_SECRET`: GitHub personal access token with gist scope
- `GIST_ID`: The ID of the gist to store badge data

**Badge Colors:**
- 🟢 Bright Green: ≥90%
- 🟢 Green: ≥80%
- 🟡 Yellow: ≥70%
- 🔴 Red: <70%

### 4. Release Workflow (`release.yml`)

**Triggers:** Version tags (v*.*.*)

**Jobs:**
- **Build**: Full CI pipeline + package creation
- **Release**: Creates GitHub release with changelog
- **Publish**: Publishes to NPM (stable releases only)

**Release Types:**
- Stable: `v1.0.0` → Published to NPM
- Pre-release: `v1.0.0-beta.1` → GitHub release only

## Running Workflows Locally

You can test workflows locally using [act](https://github.com/nektos/act):

```bash
# Test CI workflow
act push -W .github/workflows/ci.yml

# Test coverage workflow
act push -W .github/workflows/coverage.yml -j coverage

# Test specific job
act push -W .github/workflows/ci.yml -j lint
```

## Coverage Report

Current coverage metrics:
- **Lines**: 94.11%
- **Statements**: 93.37%
- **Functions**: 91.48%
- **Branches**: 70.47%

All 216 tests passing ✅

## Workflow Dependencies

- Node.js 18.x and 20.x
- npm for package management
- Jest for testing
- ESLint for linting
- Prettier for formatting
- TypeScript for type checking
- Codecov for coverage tracking (optional)

## Maintenance

### Adding New Tests
New tests are automatically picked up by Jest. Ensure they:
- Follow the naming convention `*.test.ts`
- Are placed in the `tests/` directory
- Follow the existing test structure

### Updating Coverage Thresholds
To enforce minimum coverage, add to `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    statements: 90,
    branches: 70,
    functions: 90,
    lines: 90
  }
}
```

### Troubleshooting

**Lint warnings:**
- The CI workflow treats lint warnings as failures
- Run `npm run lint` locally to check for issues
- Use `npm run lint -- --fix` to auto-fix some issues

**Type errors:**
- Run `npm run type-check` locally
- Most errors require manual fixes

**Test failures:**
- Run `npm test` locally to debug
- Use `npm test -- --watch` for interactive mode
- Check test output in CI logs

## Best Practices

1. **Always run tests locally** before pushing
2. **Keep coverage above 90%** for core functionality
3. **Fix lint warnings** before merging PRs
4. **Use conventional commits** for automatic changelog generation
5. **Tag releases** with semantic versioning (v1.2.3)
