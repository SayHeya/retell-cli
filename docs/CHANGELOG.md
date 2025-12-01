# Changelog

All notable changes to the Retell CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.4] - 2025-12-01

### Fixed
- Updated controllers submodule with conflict detection fix

## [1.4.3] - 2025-11-30

### Fixed
- Calculate `config_hash` from local `agent.json` in sync command for accurate change detection

## [1.4.2] - 2025-11-29

### Added
- Support for both `api_key` and `api_key_env` in workspace configuration
  - Legacy format with raw `api_key` still supported
  - New format with `api_key_env` references environment variables

## [1.4.1] - 2025-11-28

### Fixed
- Multi-production support for `status`, `diff`, and `sync` commands
- Proper metadata handling for multi-production workspace arrays

### Added
- CLI version validation on startup

## [1.3.1] - 2025-11-27

### Added
- **Delete by ID**: `delete` command now supports deleting by agent ID
  - Use `--id` flag to specify agent ID directly
  - Useful when agent name is ambiguous

### Fixed
- Multi-production push now correctly handles workspace arrays

## [1.3.0] - 2025-11-26

### Added
- **Orchestration mode-aware metadata**: CLI now adapts to workspace mode
  - Single-production: `production.json` is an object
  - Multi-production: `production.json` is an array of entries

## [1.2.1] - 2025-11-25

### Fixed
- Consistent hash calculation in pull command and tests
- Hash now calculated identically across push, pull, and status commands

## [1.2.0] - 2025-11-24

### Added
- **Multi-production metadata schema**: Support for array-based `production.json`
- **Rollback improvements**: Warning displayed when `response_engine` is skipped during rollback

### Fixed
- Metadata schema properly handles multi-production workspace arrays

## [1.1.0] - 2025-11-22

### Added
- **Multi-production workspace support**: Deploy to multiple production workspaces
  - Configure multiple production workspaces in `workspaces.json`
  - `--workspace-id` flag to target specific production workspace
  - Array-based metadata tracking in `production.json`

### Fixed
- `model_temperature` field properly handled in agent configuration

## [Unreleased]

### Added

#### Test Migration to Controllers Package
- **Core Tests Moved**: Migrated core logic tests from `tests/unit/core/` to `packages/controllers/`
- **Controllers Package Tests**: 8 test suites with 113 tests (Vitest)
- **CLI Tests**: 16 test suites with 128 tests (Jest)

### Changed

#### Monorepo Architecture with @heya/retell.controllers Package
- **Package Extraction**: Core functionality extracted into `packages/controllers/` npm package
  - Controllers orchestrate business operations (AgentController, WorkspaceController, VersionController)
  - Services wrap external integrations (RetellClientService, WorkspaceConfigService)
  - Core modules handle business logic (HashCalculator, MetadataManager, etc.)

- **Structured Error Handling**: New `RetellError` system with error codes
  - 40+ error codes covering workspace, agent, sync, API, validation, and file operations
  - CLI maps errors to user-friendly messages with hints

#### Production Push Protection
- **Staging-First Workflow**: Enforced staging deployment before production
  - Cannot push to production unless agent exists in staging
  - Local version must match staging version (same config hash)
  - `--force` flag available to override (not recommended)

#### Bulk Agent Creation
- **`bulk-create` Command**: Create multiple agents from templates (1-10000 agents)
  - Automatic sequential naming, template-based generation
  - Options: `--count`, `--template`, `--prefix`, `--path`, `--yes`

## [1.0.0] - 2025-11-18

### Added

#### Workspace Configuration & Validation
- **Required `workspaces.json`**: All CLI operations now require a `workspaces.json` file
  - Prevents accidental operations without explicit workspace configuration
  - No silent fallback to environment variables
  - Clear error messages guide users to solutions

- **`workspace init` Command**: New command to generate `workspaces.json` from environment variables
  - Reads `RETELL_STAGING_API_KEY` and `RETELL_PRODUCTION_API_KEY` from `.env`
  - Creates properly formatted `workspaces.json` with both staging and production workspaces
  - Supports `--force` flag to overwrite existing configuration
  - Validates environment variables before generation

- **Comprehensive Workspace Validation**:
  - File existence validation
  - JSON format validation
  - Required workspace validation (both staging and production)
  - API key validation (non-empty)
  - Base URL defaults to `https://api.retellai.com`

#### Testing & Documentation
- **Workspace Limit Testing**: Comprehensive testing of Retell AI workspace limits
  - Created and tested 100 agents successfully
  - No hard limit encountered
  - Zero failures or rate limiting issues
  - Results documented in `WORKSPACE_LIMIT_TEST_RESULTS.md`

- **Testing Scripts**:
  - `scripts/create-100-agents.sh`: Generate 100 test agent directories
  - `scripts/create-100-agents.ts`: TypeScript version with error handling
  - `scripts/push-all-100.sh`: Smart push script with rate limiting
  - `scripts/push-agents-with-rate-limit.sh`: Generic rate-limited push script
  - `scripts/README.md`: Complete documentation for all testing scripts

- **Documentation Updates**:
  - Enhanced `README.md` with Quick Start guide and comprehensive documentation
  - Updated `docs/SPECIFICATION.md` with workspace configuration requirements
  - Updated `docs/TECHNICAL_SPECIFICATION.md` with validation implementation details
  - Added `WORKSPACE_VALIDATION.md` for workspace configuration guide
  - Added `WORKSPACE_LIMIT_TEST_RESULTS.md` for testing findings
  - Updated `.gitignore` to include test agent directories

### Changed

#### Breaking Changes
- **`WorkspaceConfigLoader.load()`** is now async (returns `Promise<Result<...>>`)
  - Updated `push` command to use `await`
  - Updated `list` command to use `await`
  - All workspace operations now properly validate before execution

- **Environment Variable Fallback Removed**:
  - Previous behavior: Would silently fall back to environment variables if `workspaces.json` not found
  - New behavior: Requires `workspaces.json` to exist, fails with helpful error message

#### Improvements
- **Error Messages**: All workspace-related errors now include solution instructions
  - Missing file: Suggests running `retell workspace init`
  - Missing workspace: Suggests running `retell workspace init --force`
  - Invalid API key: Suggests checking `.env` and regenerating

- **Type Safety**: All workspace configuration loading is now properly typed and validated

### Fixed
- Metadata schema validation now properly requires `workspace` field to be `'staging'` or `'production'` (not `null`)

### Security
- Reinforced `.gitignore` patterns for sensitive files
- Added explicit documentation about never committing API keys
- Workspace validation prevents operations with incomplete configuration

---

## Version History

### Initial Development (Pre-1.0.0)
- Core CLI structure with Commander.js
- Agent push/pull/status commands
- Composable prompt system
- Hash-based sync tracking
- Metadata management
- Integration with Retell SDK

---

## Upgrade Guide

### Upgrading to 1.0.0

**Required Steps:**

1. **Ensure `.env` file exists** with required environment variables:
   ```env
   RETELL_STAGING_API_KEY=key_xxx
   RETELL_PRODUCTION_API_KEY=key_yyy
   ```

2. **Generate `workspaces.json`**:
   ```bash
   npm run build
   node bin/retell.js workspace init
   ```

3. **Verify configuration**:
   ```bash
   cat workspaces.json
   ```

4. **Test with a command**:
   ```bash
   node bin/retell.js list -w staging
   ```

**Migration Notes:**
- If you were using environment variables directly, they will still be read by `workspace init`
- Existing metadata files (`staging.json`, `production.json`) are compatible
- No changes required to agent configurations

**Rollback:**
If you need to rollback to pre-1.0.0 behavior, checkout the previous commit before the workspace validation changes.

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Create an issue](https://github.com/SayHeya/retell-dev/issues)
- Documentation: See `README.md` and `docs/` directory
