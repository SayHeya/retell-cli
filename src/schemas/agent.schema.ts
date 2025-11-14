/**
 * Zod schema for agent configuration (agent.json)
 * This validates OUR protocol, not Retell's API format
 */

import { z } from 'zod';

/**
 * Prompt configuration schema - for composable prompts
 */
const PromptConfigSchema = z
  .object({
    sections: z.array(z.string()).optional(),
    overrides: z.record(z.string(), z.string()).optional(),
    variables: z.record(z.string(), z.union([z.string(), z.literal('OVERRIDE')])).optional(),
    dynamic_variables: z
      .record(
        z.string(),
        z.object({
          type: z.enum(['string', 'number', 'boolean', 'json']),
          description: z.string(),
        })
      )
      .optional(),
  })
  .strict();

/**
 * LLM configuration schema
 */
const LlmConfigSchema = z
  .object({
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    prompt_config: PromptConfigSchema.optional(),
    general_prompt: z.string().optional(),
    begin_message: z.string().optional(),
    tools: z.array(z.unknown()).optional(), // TODO: Define strict tool schema
  })
  .strict();

/**
 * Agent configuration schema (agent.json)
 */
export const AgentConfigSchema = z
  .object({
    agent_name: z.string().min(1).max(100),
    voice_id: z.string(),
    voice_speed: z.number().min(0.5).max(2.0).optional(),
    voice_temperature: z.number().min(0).max(2).optional(),
    interruption_sensitivity: z.number().min(0).max(1).optional(),
    responsiveness: z.number().min(0).max(1).optional(),
    language: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/), // e.g., en-US
    enable_backchannel: z.boolean().optional(),
    backchannel_frequency: z.number().min(0).max(1).optional(),
    ambient_sound: z.enum(['office', 'cafe', 'none']).optional(),
    boosted_keywords: z.array(z.string()).optional(),
    pronunciation_dictionary: z
      .array(
        z.object({
          word: z.string(),
          pronunciation: z.string(),
        })
      )
      .optional(),
    normalize_for_speech: z.boolean().optional(),
    webhook_url: z.string().url().optional(),
    llm_config: LlmConfigSchema,
    post_call_analysis_data: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(['string', 'number', 'boolean']),
          description: z.string(),
        })
      )
      .optional(),
  })
  .strict();

/**
 * Infer TypeScript type from schema
 */
export type AgentConfigSchemaType = z.infer<typeof AgentConfigSchema>;
export type PromptConfigSchemaType = z.infer<typeof PromptConfigSchema>;
export type LlmConfigSchemaType = z.infer<typeof LlmConfigSchema>;
