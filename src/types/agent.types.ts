/**
 * Agent-related type definitions
 */

import type { Brand, Hash, Timestamp } from './common.types';

/**
 * Branded types for IDs
 */
export type AgentId = Brand<string, 'AgentId'>;
export type LlmId = Brand<string, 'LlmId'>;
export type KnowledgeBaseId = Brand<string, 'KnowledgeBaseId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;

/**
 * Helper functions to create branded IDs
 */
export const createAgentId = (id: string): AgentId => id as AgentId;
export const createLlmId = (id: string): LlmId => id as LlmId;
export const createKnowledgeBaseId = (id: string): KnowledgeBaseId => id as KnowledgeBaseId;
export const createWorkspaceId = (id: string): WorkspaceId => id as WorkspaceId;

/**
 * Workspace type
 */
export type WorkspaceType = 'staging' | 'production';

/**
 * Metadata file structure (staging.json / production.json)
 */
export type MetadataFile = {
  readonly workspace: WorkspaceType;
  readonly agent_id: AgentId | null;
  readonly llm_id: LlmId | null;
  readonly kb_id: KnowledgeBaseId | null;
  readonly last_sync: Timestamp | null;
  readonly config_hash: Hash | null;
  readonly retell_version: number | null;
};

/**
 * Prompt configuration - composable prompts
 */
export type PromptConfig = {
  readonly sections?: ReadonlyArray<string>;
  readonly overrides?: Readonly<Record<string, string>>;
  readonly variables?: Readonly<Record<string, string>>;
  readonly dynamic_variables?: Readonly<
    Record<
      string,
      {
        readonly type: 'string' | 'number' | 'boolean' | 'json';
        readonly description: string;
      }
    >
  >;
};

/**
 * LLM configuration
 */
export type LlmConfig = {
  readonly model: string;
  readonly temperature?: number;
  readonly prompt_config?: PromptConfig;
  readonly general_prompt?: string;
  readonly begin_message?: string;
  readonly tools?: ReadonlyArray<unknown>; // TODO: Define strict tool types
};

/**
 * Agent configuration (agent.json)
 * This is OUR protocol - not Retell's
 */
export type AgentConfig = {
  readonly agent_name: string;
  readonly voice_id: string;
  readonly voice_speed?: number;
  readonly voice_temperature?: number;
  readonly interruption_sensitivity?: number;
  readonly responsiveness?: number;
  readonly language: string;
  readonly enable_backchannel?: boolean;
  readonly backchannel_frequency?: number;
  readonly ambient_sound?: 'office' | 'cafe' | 'none';
  readonly boosted_keywords?: ReadonlyArray<string>;
  readonly pronunciation_dictionary?: ReadonlyArray<{
    readonly word: string;
    readonly pronunciation: string;
  }>;
  readonly normalize_for_speech?: boolean;
  readonly webhook_url?: string;
  readonly llm_config: LlmConfig;
  readonly post_call_analysis_data?: ReadonlyArray<{
    readonly name: string;
    readonly type: 'string' | 'number' | 'boolean';
    readonly description: string;
  }>;
};

/**
 * Variable types for prompt system
 */
export type StaticVariable = {
  readonly type: 'static';
  readonly name: string;
  readonly value: string;
};

export type OverrideVariable = {
  readonly type: 'override';
  readonly name: string;
};

export type DynamicVariable = {
  readonly type: 'dynamic';
  readonly name: string;
  readonly valueType: 'string' | 'number' | 'boolean' | 'json';
  readonly description: string;
};

export type SystemVariable = {
  readonly type: 'system';
  readonly name: string;
};

export type Variable = StaticVariable | OverrideVariable | DynamicVariable | SystemVariable;

/**
 * Variable summary - categorized variables
 */
export type VariableSummary = {
  readonly static: ReadonlyArray<StaticVariable>;
  readonly override: ReadonlyArray<OverrideVariable>;
  readonly dynamic: ReadonlyArray<DynamicVariable>;
  readonly system: ReadonlyArray<SystemVariable>;
};

/**
 * Sync status between file and workspace
 */
export type SyncStatus =
  | { readonly status: 'in_sync'; readonly lastSync: Timestamp }
  | { readonly status: 'out_of_sync'; readonly reason: OutOfSyncReason }
  | { readonly status: 'never_synced' };

export type OutOfSyncReason =
  | { readonly type: 'local_changes'; readonly hash: Hash; readonly lastModified: Timestamp }
  | { readonly type: 'remote_changes'; readonly hash: Hash }
  | { readonly type: 'both_changed'; readonly localHash: Hash; readonly remoteHash: Hash };
