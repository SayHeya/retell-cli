/**
 * Push command - Push local agent configs to Retell workspace.
 * This is a thin wrapper around the AgentController.
 */

import { Command } from 'commander';
import { AgentController } from '@heya/retell.controllers';
import type { WorkspaceType } from '@heya/retell.controllers';
import { handleError } from '../errors/cli-error-handler';

export const pushCommand = new Command('push')
  .description('Push local agent configuration to Retell workspace')
  .argument('<agent-name>', 'Name of the agent to push')
  .option('-w, --workspace <workspace>', 'Target workspace (staging or production)', 'staging')
  .option('-f, --force', 'Force push even if already in sync', false)
  .option('-p, --path <path>', 'Path to agents directory', './agents')
  .option('--prompts <path>', 'Path to prompts directory', './prompts')
  .action(async (agentName: string, options: PushOptions) => {
    try {
      await executePush(agentName, options);
    } catch (error) {
      handleError(error);
    }
  });

type PushOptions = {
  workspace: WorkspaceType;
  force: boolean;
  path: string;
  prompts: string;
};

async function executePush(agentName: string, options: PushOptions): Promise<void> {
  console.log(`\nPushing agent '${agentName}' to ${options.workspace}...\n`);

  const controller = new AgentController();
  const result = await controller.push(agentName, {
    workspace: options.workspace,
    force: options.force,
    agentsPath: options.path,
    promptsPath: options.prompts,
  });

  if (!result.success) {
    // The handleError function will format and display the error
    throw result.error;
  }

  const { agentId, llmId, configHash, syncedAt, created } = result.value;

  if (created) {
    console.log(`\n✓ Push to ${options.workspace} completed successfully!`);
  } else {
    console.log(`\n✓ Agent is already in sync with ${options.workspace}`);
  }

  console.log(`  Agent ID: ${agentId}`);
  console.log(`  LLM ID: ${llmId}`);
  console.log(`  Config hash: ${configHash.substring(0, 16)}...`);
  console.log(`  Synced at: ${syncedAt}`);
}
