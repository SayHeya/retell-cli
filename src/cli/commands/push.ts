/**
 * Push command - Push local agent configs to Retell workspace.
 * This is a thin wrapper around the AgentController.
 */

import { Command } from 'commander';
import { AgentController, VersionController } from '@heya/retell.controllers';
import type { WorkspaceType } from '@heya/retell.controllers';
import { handleError } from '../errors/cli-error-handler';

export const pushCommand = new Command('push')
  .description('Push local agent configuration to Retell workspace')
  .argument('<agent-name>', 'Name of the agent to push')
  .option('-w, --workspace <workspace>', 'Target workspace (staging or production)', 'staging')
  .option('-f, --force', 'Force push even if already in sync', false)
  .option('-p, --path <path>', 'Path to agents directory', './agents')
  .option('--prompts <path>', 'Path to prompts directory', './prompts')
  .option('--publish', 'Publish after pushing (creates immutable version)', false)
  .option('--validate-version', 'Validate version before push (warns on drift)', false)
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
  publish: boolean;
  validateVersion: boolean;
};

async function executePush(agentName: string, options: PushOptions): Promise<void> {
  console.log(`\nPushing agent '${agentName}' to ${options.workspace}...\n`);

  const agentController = new AgentController();
  const versionController = new VersionController();

  // 1. Validate version before push if requested
  if (options.validateVersion) {
    console.log('Validating version...');
    const validationResult = await versionController.validateVersionForPush(agentName, {
      workspace: options.workspace,
      agentsPath: options.path,
    });

    if (!validationResult.success) {
      throw validationResult.error;
    }

    const validation = validationResult.value;

    if (validation.warning) {
      console.log(`\n⚠ Warning: ${validation.warning}`);
      if (!options.force) {
        console.log('  Use --force to push anyway.\n');
      }
    }

    if (!validation.canPush && !options.force) {
      throw new Error('Version validation failed. Use --force to override.');
    }

    if (validation.isNewAgent) {
      console.log('  Creating new agent...');
    } else {
      console.log(`  Remote version: ${validation.currentRemoteVersion ?? 'unknown'}`);
      console.log(`  Local version: ${validation.storedVersion ?? 'not tracked'}`);
    }
    console.log('');
  }

  // 2. Perform the push
  const result = await agentController.push(agentName, {
    workspace: options.workspace,
    force: options.force,
    agentsPath: options.path,
    promptsPath: options.prompts,
  });

  if (!result.success) {
    throw result.error;
  }

  const { agentId, llmId, configHash, syncedAt, created } = result.value;

  if (created) {
    console.log(`✓ Push to ${options.workspace} completed successfully!`);
  } else {
    console.log(`✓ Agent is already in sync with ${options.workspace}`);
  }

  console.log(`  Agent ID: ${agentId}`);
  console.log(`  LLM ID: ${llmId}`);
  console.log(`  Config hash: ${configHash.substring(0, 16)}...`);
  console.log(`  Synced at: ${syncedAt}`);

  // 3. Publish if requested
  if (options.publish) {
    console.log('\nPublishing agent...');
    const publishResult = await versionController.publish(agentName, {
      workspace: options.workspace,
      agentsPath: options.path,
    });

    if (!publishResult.success) {
      console.log(`\n⚠ Push succeeded but publish failed: ${publishResult.error.message}`);
      return;
    }

    const { publishedVersion, newDraftVersion } = publishResult.value;
    console.log(`✓ Published version ${publishedVersion}`);
    console.log(`  New draft version: ${newDraftVersion}`);
  }
}
