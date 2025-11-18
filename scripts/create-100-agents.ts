#!/usr/bin/env ts-node
/**
 * Script to create 100 test agents for workspace limit testing
 *
 * Usage: npm run ts-node scripts/create-100-agents.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const AGENTS_DIR = path.join(process.cwd(), 'test-agents-100');
const TEMPLATE_PATH = path.join(process.cwd(), 'tests/fixtures/agents/valid-simple-agent.json');

interface AgentConfig {
  agent_name: string;
  voice_id: string;
  language: string;
  llm_config: {
    model: string;
    general_prompt: string;
  };
}

async function createAgents() {
  console.log('🚀 Creating 100 test agents...\n');

  // 1. Load template
  let template: AgentConfig;
  try {
    const templateContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    template = JSON.parse(templateContent);
    console.log('✅ Template loaded from', TEMPLATE_PATH);
  } catch (error) {
    console.error('❌ Failed to load template:', error);
    process.exit(1);
  }

  // 2. Create agents directory
  try {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
    console.log(`✅ Created directory: ${AGENTS_DIR}\n`);
  } catch (error) {
    console.error('❌ Failed to create agents directory:', error);
    process.exit(1);
  }

  // 3. Create 100 agents
  const startTime = Date.now();
  const errors: Array<{ agentNum: number; error: unknown }> = [];

  for (let i = 1; i <= 100; i++) {
    const agentName = `test-agent-${String(i).padStart(3, '0')}`;
    const agentPath = path.join(AGENTS_DIR, agentName);

    try {
      // Create agent config
      const agentConfig: AgentConfig = {
        ...template,
        agent_name: `Test Agent ${i}`,
        llm_config: {
          ...template.llm_config,
          general_prompt: `You are Test Agent ${i}. ${template.llm_config.general_prompt}`,
        },
      };

      // Create directory structure
      await fs.mkdir(agentPath, { recursive: true });
      await fs.mkdir(path.join(agentPath, 'knowledge'), { recursive: true });

      // Write agent.json
      await fs.writeFile(
        path.join(agentPath, 'agent.json'),
        JSON.stringify(agentConfig, null, 2) + '\n',
        'utf-8'
      );

      // Write empty metadata files (stubs)
      const emptyMetadata = {
        workspace: null,
        agent_id: null,
        llm_id: null,
        kb_id: null,
        last_sync: null,
        config_hash: null,
        retell_version: null,
      };

      await fs.writeFile(
        path.join(agentPath, 'staging.json'),
        JSON.stringify(emptyMetadata, null, 2) + '\n',
        'utf-8'
      );

      await fs.writeFile(
        path.join(agentPath, 'production.json'),
        JSON.stringify(emptyMetadata, null, 2) + '\n',
        'utf-8'
      );

      // Progress indicator
      if (i % 10 === 0) {
        process.stdout.write(`✅ Created ${i}/100 agents\n`);
      }
    } catch (error) {
      errors.push({ agentNum: i, error });
      console.error(`❌ Failed to create agent ${i}:`, error);
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successfully created: ${100 - errors.length}/100 agents`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log(`⏱️  Time taken: ${duration.toFixed(2)}s`);
  console.log(`📁 Location: ${AGENTS_DIR}`);
  console.log('='.repeat(50));

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ agentNum, error }) => {
      console.log(`  - Agent ${agentNum}:`, error);
    });
  }

  console.log('\n📝 Next steps:');
  console.log('  1. Configure your workspace: retell workspace add staging <api-key>');
  console.log('  2. Push agents to test limit: cd test-agents-100 && for dir in */; do retell push "$dir" -w staging; done');
  console.log('  3. Check workspace limit status\n');
}

// Run the script
createAgents().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
