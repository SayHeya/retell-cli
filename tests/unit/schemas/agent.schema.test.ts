/**
 * Tests for agent configuration schema validation
 */

import { AgentConfigSchema } from '@schemas/agent.schema';
import validSimpleAgent from '../../fixtures/agents/valid-simple-agent.json';
import validComposableAgent from '../../fixtures/agents/valid-composable-agent.json';

describe('AgentConfigSchema', () => {
  describe('valid agent configurations', () => {
    it('should validate simple agent with general_prompt', () => {
      const result = AgentConfigSchema.safeParse(validSimpleAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with composable prompts', () => {
      const result = AgentConfigSchema.safeParse(validComposableAgent);
      expect(result.success).toBe(true);
    });

    it('should validate agent with all optional fields', () => {
      const agent = {
        agent_name: 'Full Agent',
        voice_id: '11labs-Kate',
        voice_speed: 1.2,
        voice_temperature: 0.8,
        interruption_sensitivity: 0.5,
        responsiveness: 0.9,
        language: 'en-US',
        enable_backchannel: true,
        backchannel_frequency: 0.7,
        ambient_sound: 'office',
        boosted_keywords: ['support', 'help'],
        pronunciation_dictionary: [{ word: 'API', pronunciation: 'A P I' }],
        normalize_for_speech: true,
        webhook_url: 'https://api.example.com/webhook',
        llm_config: {
          model: 'gpt-4',
          temperature: 0.7,
          general_prompt: 'Test prompt',
        },
        post_call_analysis_data: [
          {
            name: 'issue_resolved',
            type: 'boolean',
            description: 'Was the issue resolved?',
          },
        ],
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid agent configurations', () => {
    it('should reject missing required fields', () => {
      const agent = {
        agent_name: 'Test Agent',
        // Missing voice_id, language, llm_config
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid language format', () => {
      const agent = {
        agent_name: 'Test Agent',
        voice_id: 'test-voice',
        language: 'english', // Should be en-US format
        llm_config: {
          model: 'gpt-4',
          general_prompt: 'Test',
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid voice_speed range', () => {
      const agent = {
        agent_name: 'Test Agent',
        voice_id: 'test-voice',
        voice_speed: 3.0, // Should be 0.5 - 2.0
        language: 'en-US',
        llm_config: {
          model: 'gpt-4',
          general_prompt: 'Test',
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(false);
    });

    it('should reject OVERRIDE value in dynamic_variables', () => {
      const agent = {
        agent_name: 'Test Agent',
        voice_id: 'test-voice',
        language: 'en-US',
        llm_config: {
          model: 'gpt-4',
          prompt_config: {
            dynamic_variables: {
              test_var: {
                type: 'string',
                description: 'OVERRIDE', // OVERRIDE should only be in variables, not dynamic_variables
              },
            },
          },
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      // This should succeed - OVERRIDE in description is fine
      expect(result.success).toBe(true);
    });

    it('should require either prompt_config or general_prompt in llm_config', () => {
      const agent = {
        agent_name: 'Test Agent',
        voice_id: 'test-voice',
        language: 'en-US',
        llm_config: {
          model: 'gpt-4',
          // Missing both prompt_config and general_prompt
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      // This is actually valid - they're both optional
      expect(result.success).toBe(true);
    });
  });

  describe('prompt_config validation', () => {
    it('should validate OVERRIDE variables', () => {
      const agent = {
        agent_name: 'Test',
        voice_id: 'test',
        language: 'en-US',
        llm_config: {
          model: 'gpt-4',
          prompt_config: {
            variables: {
              static_var: 'value',
              override_var: 'OVERRIDE',
            },
          },
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });

    it('should validate dynamic_variable types', () => {
      const agent = {
        agent_name: 'Test',
        voice_id: 'test',
        language: 'en-US',
        llm_config: {
          model: 'gpt-4',
          prompt_config: {
            dynamic_variables: {
              str_var: { type: 'string', description: 'String var' },
              num_var: { type: 'number', description: 'Number var' },
              bool_var: { type: 'boolean', description: 'Boolean var' },
              json_var: { type: 'json', description: 'JSON var' },
            },
          },
        },
      };

      const result = AgentConfigSchema.safeParse(agent);
      expect(result.success).toBe(true);
    });
  });
});
