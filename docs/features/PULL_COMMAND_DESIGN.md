# Pull Command Design

## Overview

The `pull` command fetches agent configuration from Retell and offers to overwrite local files. This is the reverse operation of `push`.

## Key Challenge: Reverse Transformation

When we **push**, we transform our custom format → Retell's API format:
- Our `prompt_config.sections` → flattened `general_prompt` string
- Our `prompt_config.variables` → substituted into prompt
- Our `llm_config` and agent fields → split into separate LLM and Agent resources

When we **pull**, we need to reverse this, but **we can't fully reverse it**:

```
LOSSY TRANSFORMATION PROBLEM:

Push:
  prompt_config: {
    sections: ["base/greeting", "base/closing"],
    variables: { company: "Acme" }
  }
  ↓
  general_prompt: "Hello from Acme...\nThanks for calling..."

Pull:
  general_prompt: "Hello from Acme...\nThanks for calling..."
  ↓
  ??? Can't reconstruct sections and variables from flat string ???
```

## Design Decisions

### Option 1: Metadata-Assisted Pull (RECOMMENDED)

**Approach**: Use local metadata to guide reconstruction. Only pull if we previously pushed.

**Pros**:
- Can preserve prompt structure if we stored it
- Safer - won't overwrite working local configs
- Detects drift from expected state

**Cons**:
- Can't pull from agents created in Retell dashboard
- Requires metadata tracking

**Implementation**:
1. Check if metadata exists with `config_hash`
2. Fetch LLM and Agent from Retell
3. Compare fetched data hash with metadata hash
4. If different, show diff and ask user to confirm
5. Update local `agent.json` with fetched values
6. Preserve `prompt_config` structure from local file (only update values)

### Option 2: Best-Effort Reconstruction

**Approach**: Try to detect patterns and reconstruct structure.

**Pros**:
- Can pull any agent, even those created in dashboard
- More flexible

**Cons**:
- Complex heuristics
- May fail or produce incorrect results
- Risky for production use

**Not recommended for v1**

### Option 3: Flatten on Pull

**Approach**: Convert pulled prompt to `general_prompt` (no sections).

**Pros**:
- Simple and always works
- No guessing

**Cons**:
- Loses our custom structure
- Defeats the purpose of composable prompts

**Could be a fallback option**

## Recommended Implementation: Hybrid Approach

### Strategy

```
IF metadata exists AND has our custom structure:
  → Metadata-Assisted Pull (preserve structure, update values)
ELSE:
  → Flatten on Pull (use general_prompt)
  → Warn user that prompt structure may be lost
```

### Pull Command Flow

```
1. Load local metadata for workspace
   ├─ If no metadata → Error: "Agent not yet pushed to this workspace"
   └─ If metadata exists → Continue

2. Fetch Agent and LLM from Retell
   ├─ Use metadata.agent_id and metadata.llm_id
   └─ If fetch fails → Error: "Agent/LLM not found in workspace"

3. Reconstruct local config from Retell data
   ├─ Merge LLM fields + Agent fields
   ├─ IF local config has prompt_config:
   │    → Keep sections structure, update variables
   │    → Compare general_prompt to detect manual edits
   ├─ ELSE:
   │    → Use general_prompt directly
   └─ Construct AgentConfig object

4. Calculate hash of reconstructed config
   ├─ Compare with local config hash
   └─ Compare with metadata.config_hash

5. Show comparison:
   ┌─────────────────────────────────────────┐
   │ Sync Status for 'test-agent' (staging) │
   ├─────────────────────────────────────────┤
   │ Local:  sha256:abc123... (modified)    │
   │ Remote: sha256:def456...               │
   │ Last push: 2025-11-14 04:59:29         │
   ├─────────────────────────────────────────┤
   │ Changes detected:                       │
   │  • temperature: 0.7 → 0.8              │
   │  • responsiveness: 0.8 → 0.9           │
   └─────────────────────────────────────────┘

6. Ask user confirmation:
   "Overwrite local agent.json with remote config? [y/N]"

7. If confirmed:
   ├─ Write new agent.json
   ├─ Update metadata with new hash
   └─ Success message
```

## Implementation Components

### 1. New Transformer Method: `reverseTransformFromRetell()`

```typescript
class AgentTransformer {
  /**
   * Reverse transform: Retell API format → Our AgentConfig
   *
   * @param llmData - LLM data from Retell API
   * @param agentData - Agent data from Retell API
   * @param existingConfig - Optional: preserve structure from existing config
   */
  static reverseTransform(
    llmData: RetellLlmData,
    agentData: RetellAgentData,
    existingConfig?: AgentConfig
  ): Result<AgentConfig, Error>;
}
```

### 2. Pull Command

```typescript
// src/cli/commands/pull.ts

async function executePull(agentName: string, options: PullOptions): Promise<void> {
  // 1. Load metadata
  // 2. Fetch from Retell
  // 3. Reverse transform
  // 4. Compare hashes
  // 5. Show diff
  // 6. Ask confirmation
  // 7. Write local file
}
```

### 3. Config Differ Utility

```typescript
// src/core/config-differ.ts

class ConfigDiffer {
  /**
   * Compare two configs and return human-readable diff
   */
  static diff(config1: AgentConfig, config2: AgentConfig): ConfigDiff;

  /**
   * Format diff for display
   */
  static format(diff: ConfigDiff): string;
}
```

## Edge Cases

### Case 1: Manual edits in Retell dashboard

**Scenario**: User edits prompt directly in Retell UI

**Detection**: Hash of fetched config ≠ metadata.config_hash

**Handling**:
- Show warning: "Remote config has changed since last push"
- Display diff
- Let user decide to pull or not

### Case 2: Local has prompt_config, remote has flat prompt

**Scenario**: Local uses sections, but remote was manually edited

**Handling**:
- Keep local sections structure
- Update variables dictionary to match remote values
- Add warning: "Unable to preserve all remote changes due to structural differences"

### Case 3: Never pushed before

**Scenario**: Metadata doesn't exist

**Handling**:
- Error: "Cannot pull - agent has not been pushed to this workspace yet"
- Suggest: "Use 'retell push <agent> -w <workspace>' first"

### Case 4: Conflicting changes (local modified + remote modified)

**Scenario**: Both local and remote have changed since last sync

**Handling**:
```
⚠ CONFLICT DETECTED
Local:  sha256:aaa... (modified since last sync)
Remote: sha256:bbb... (modified since last sync)
Last sync: sha256:ccc...

You have unpushed local changes AND remote changes.

Options:
[1] Overwrite local with remote (lose local changes)
[2] Keep local (ignore remote changes)
[3] Abort and manually resolve
```

## Testing Strategy

1. **Unit Tests**:
   - Test reverse transformation logic
   - Test hash comparison
   - Test diff generation

2. **Integration Tests**:
   - Pull after push (should be in sync)
   - Pull after manual remote edit (detect drift)
   - Pull with local changes (detect conflict)

3. **E2E Tests**:
   - Full workflow: push → remote edit → pull → verify
   - Conflict resolution workflow

## Future Enhancements

### V2: Smart Prompt Reconstruction

Use AI/LLM to analyze flat prompt and suggest section decomposition:

```typescript
// Future feature
class PromptDecomposer {
  static async suggestSections(
    flatPrompt: string
  ): Promise<PromptSectionSuggestion[]>;
}
```

### V3: Three-Way Merge

Like git, show base → local → remote and attempt automatic merge:

```
BASE:   temperature: 0.7
LOCAL:  temperature: 0.8  (you changed)
REMOTE: temperature: 0.9  (they changed)
→ CONFLICT: manual resolution needed
```

## Security Considerations

- **Confirmation required**: Never auto-overwrite without user approval
- **Backup option**: Optionally backup local file before pull
- **Audit trail**: Log all pull operations with timestamps

## Summary

**For V1**:
- Implement metadata-assisted pull only
- Require prior push before pull
- Preserve local prompt structure when possible
- Show clear diffs and require confirmation
- Handle conflicts gracefully with clear user choices

This approach balances:
- ✅ Safety (won't silently lose data)
- ✅ Usability (works for common workflows)
- ✅ Maintainability (simple, predictable behavior)
