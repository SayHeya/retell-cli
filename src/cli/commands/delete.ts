/**
 * Delete command - Delete agent from Retell workspaces and local filesystem.
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import { AgentController, MetadataManager, WorkspaceConfigService, RetellClientService, createAgentId, createLlmId } from '@heya/retell.controllers';
import type { WorkspaceType } from '@heya/retell.controllers';
import { handleError } from '../errors/cli-error-handler';

export const deleteCommand = new Command('delete')
  .description('Delete agent from Retell workspaces and local filesystem')
  .argument('<agent-name-or-id>', 'Name of the agent to delete, or agent ID when using --by-id')
  .option(
    '-w, --workspace <workspace>',
    'Delete from specific workspace only (staging or production). If not specified, deletes from both.'
  )
  .option('-y, --yes', 'Skip confirmation prompt', false)
  .option('--remote-only', 'Delete only from Retell workspaces, keep local files', false)
  .option('--local-only', 'Delete only local files, keep remote agents', false)
  .option('--by-id', 'Treat argument as agent ID instead of agent name (requires -w)', false)
  .option('-p, --path <path>', 'Path to agents directory', './agents')
  .action(async (agentNameOrId: string, options: DeleteOptions) => {
    try {
      if (options.byId) {
        await executeDeleteById(agentNameOrId, options);
      } else {
        await executeDelete(agentNameOrId, options);
      }
    } catch (error) {
      handleError(error);
    }
  });

type DeleteOptions = {
  workspace?: WorkspaceType;
  yes: boolean;
  remoteOnly: boolean;
  localOnly: boolean;
  byId: boolean;
  path: string;
};

async function executeDelete(agentName: string, options: DeleteOptions): Promise<void> {
  console.log(`\nDeleting agent '${agentName}'...\n`);

  // Validate conflicting options
  if (options.remoteOnly && options.localOnly) {
    throw new Error('Cannot specify both --remote-only and --local-only');
  }

  const agentPath = path.resolve(options.path, agentName);

  // Check if agent directory exists
  const agentExists = await checkAgentExists(agentPath);
  if (!agentExists && !options.remoteOnly) {
    throw new Error(
      `Agent directory not found: ${agentPath}\n` +
        'Use --remote-only if you only want to delete from Retell workspaces.'
    );
  }

  // Determine which workspaces to delete from
  const workspacesToDelete: WorkspaceType[] = [];
  if (options.workspace) {
    workspacesToDelete.push(options.workspace);
  } else if (!options.localOnly) {
    workspacesToDelete.push('staging', 'production');
  }

  // Load metadata for each workspace
  const workspaceData: Array<{
    workspace: WorkspaceType;
    agentId: string | null;
    llmId: string | null;
    kbId: string | null;
  }> = [];

  for (const workspace of workspacesToDelete) {
    const metadataResult = await MetadataManager.read(agentPath, workspace);
    if (metadataResult.success) {
      const metadata = metadataResult.value;
      workspaceData.push({
        workspace,
        agentId: metadata.agent_id,
        llmId: metadata.llm_id,
        kbId: metadata.kb_id,
      });
    } else {
      workspaceData.push({
        workspace,
        agentId: null,
        llmId: null,
        kbId: null,
      });
    }
  }

  // Show what will be deleted
  console.log('Deletion Plan:\n');

  if (!options.localOnly) {
    for (const data of workspaceData) {
      console.log(`${data.workspace.toUpperCase()} Workspace:`);
      if (data.agentId) {
        console.log(`  Agent: ${data.agentId}`);
        if (data.llmId) {
          console.log(`  LLM: ${data.llmId} (will NOT be deleted - may be shared)`);
        }
        if (data.kbId) {
          console.log(`  Knowledge Base: ${data.kbId} (will NOT be deleted - may be shared)`);
        }
      } else {
        console.log(`  No agent found in ${data.workspace}`);
      }
      console.log();
    }
  }

  if (!options.remoteOnly && agentExists) {
    console.log('LOCAL Filesystem:');
    console.log(`  Directory: ${agentPath}`);
    console.log(`  All files in directory will be permanently deleted`);
    console.log();
  }

  // Count what will actually be deleted
  const remoteAgentsToDelete = workspaceData.filter((d) => d.agentId !== null);
  const willDeleteLocal = !options.remoteOnly && agentExists;

  if (remoteAgentsToDelete.length === 0 && !willDeleteLocal) {
    console.log('Nothing to delete. Agent not found in any workspace or locally.');
    return;
  }

  // Confirmation prompt
  if (!options.yes) {
    const confirmed = await confirmDeletion(
      agentName,
      remoteAgentsToDelete.length,
      willDeleteLocal
    );
    if (!confirmed) {
      console.log('\nDeletion cancelled.');
      return;
    }
  }

  console.log();

  // Delete from remote workspaces using controller
  const controller = new AgentController();

  if (!options.localOnly) {
    for (const data of workspaceData) {
      if (data.agentId) {
        console.log(`Deleting from ${data.workspace}...`);
        const result = await controller.delete(agentName, {
          workspace: data.workspace,
          agentsPath: options.path,
        });

        if (!result.success) {
          console.error(`  Failed to delete: ${result.error.message}`);
        } else {
          console.log(`  Deleted agent ${result.value.agentId} from ${data.workspace}`);
        }
      }
    }
  }

  // Delete local directory
  if (!options.remoteOnly && agentExists) {
    await deleteLocalAgent(agentPath, agentName);
  }

  console.log('\nDeletion complete!\n');

  if (remoteAgentsToDelete.length > 0 && !options.localOnly) {
    console.log(`Deleted from ${remoteAgentsToDelete.length} workspace(s)`);
  }
  if (willDeleteLocal) {
    console.log('Deleted local agent directory');
  }
}

async function checkAgentExists(agentPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(agentPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function confirmDeletion(
  agentName: string,
  remoteCount: number,
  willDeleteLocal: boolean
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let message = `\nThis will permanently delete agent '${agentName}'`;
    if (remoteCount > 0) {
      message += ` from ${remoteCount} workspace(s)`;
    }
    if (willDeleteLocal) {
      message += remoteCount > 0 ? ' and local files' : ' local files';
    }
    message += '.\nThis action CANNOT be undone.\n\nContinue? (yes/no): ';

    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'yes' || normalized === 'y');
    });
  });
}

async function deleteLocalAgent(agentPath: string, agentName: string): Promise<void> {
  console.log(`Deleting local directory...`);

  try {
    await fs.rm(agentPath, { recursive: true, force: true });
    console.log(`  Deleted directory: ${agentPath}`);
  } catch (error) {
    console.error(
      `  Failed to delete local directory:`,
      error instanceof Error ? error.message : error
    );
    throw new Error(`Failed to delete local agent directory for ${agentName}`);
  }
}

/**
 * Delete an agent directly by its agent ID.
 * This is useful for cleaning up orphan agents that aren't in the local repository.
 */
async function executeDeleteById(agentId: string, options: DeleteOptions): Promise<void> {
  console.log(`\nDeleting agent by ID: '${agentId}'...\n`);

  // Require workspace for delete-by-id
  if (!options.workspace) {
    throw new Error('--workspace (-w) is required when using --by-id');
  }

  // local-only doesn't make sense for delete-by-id
  if (options.localOnly) {
    throw new Error('--local-only cannot be used with --by-id');
  }

  // Get workspace config
  const workspaceConfigResult = await WorkspaceConfigService.getWorkspace(options.workspace);
  if (!workspaceConfigResult.success) {
    throw new Error(`Failed to load workspace config: ${workspaceConfigResult.error.message}`);
  }

  const client = new RetellClientService(workspaceConfigResult.value);

  // Fetch agent info to confirm it exists
  console.log(`Fetching agent info from ${options.workspace}...`);
  const agentResult = await client.getAgent(createAgentId(agentId));

  if (!agentResult.success) {
    throw new Error(`Agent '${agentId}' not found in ${options.workspace} workspace`);
  }

  const agent = agentResult.value;
  const agentName = (agent as Record<string, unknown>)['agent_name'] as string;
  const llmId = ((agent as Record<string, unknown>)['response_engine'] as Record<string, unknown> | undefined)?.['llm_id'] as string | undefined;

  console.log('Deletion Plan:\n');
  console.log(`${options.workspace.toUpperCase()} Workspace:`);
  console.log(`  Agent: ${agentId}`);
  console.log(`  Name: ${agentName}`);
  if (llmId) {
    console.log(`  LLM: ${llmId} (will also be deleted)`);
  }
  console.log();

  // Confirmation prompt
  if (!options.yes) {
    const confirmed = await confirmDeletionById(agentId, agentName, options.workspace);
    if (!confirmed) {
      console.log('\nDeletion cancelled.');
      return;
    }
  }

  console.log();

  // Delete the agent
  console.log(`Deleting agent from ${options.workspace}...`);
  const deleteAgentResult = await client.deleteAgent(createAgentId(agentId));

  if (!deleteAgentResult.success) {
    throw new Error(`Failed to delete agent: ${deleteAgentResult.error.message}`);
  }

  console.log(`  Deleted agent ${agentId}`);

  // Delete the LLM if exists
  if (llmId) {
    console.log(`Deleting LLM...`);
    const deleteLlmResult = await client.deleteLlm(createLlmId(llmId));
    if (!deleteLlmResult.success) {
      console.warn(`  Warning: Failed to delete LLM ${llmId}`);
    } else {
      console.log(`  Deleted LLM ${llmId}`);
    }
  }

  console.log('\nDeletion complete!\n');
}

async function confirmDeletionById(
  agentId: string,
  agentName: string,
  workspace: string
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const message = `\nThis will permanently delete agent '${agentName}' (${agentId}) from ${workspace} workspace.\nThis action CANNOT be undone.\n\nContinue? (yes/no): `;

    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'yes' || normalized === 'y');
    });
  });
}
