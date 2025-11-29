/**
 * Workspace list command - List all configured workspaces
 */

import { Command } from 'commander';
import { WorkspaceController } from '@heya/retell.controllers';
import { handleError } from '../errors/cli-error-handler';

export const workspaceListCommand = new Command('list')
  .description('List all configured workspaces')
  .action(async () => {
    try {
      await executeWorkspaceList();
    } catch (error) {
      handleError(error);
    }
  });

async function executeWorkspaceList(): Promise<void> {
  console.log('\nConfigured workspaces:\n');

  const controller = new WorkspaceController();

  // Get mode
  const modeResult = await controller.getMode();
  if (!modeResult.success) {
    throw modeResult.error;
  }

  console.log(`Mode: ${modeResult.value}\n`);

  // List workspaces
  const result = await controller.list();
  if (!result.success) {
    throw result.error;
  }

  const workspaces = result.value;

  // Print table header
  console.log('┌───────────────────────────────────┬─────────────┬───────────────────────────────┬───────────┐');
  console.log('│ Name                              │ Type        │ Base URL                      │ API Key   │');
  console.log('├───────────────────────────────────┼─────────────┼───────────────────────────────┼───────────┤');

  for (const ws of workspaces) {
    const name = ws.name.padEnd(33);
    const type = ws.type.padEnd(11);
    const baseUrl = ws.baseUrl.substring(0, 29).padEnd(29);
    const hasKey = ws.hasApiKey ? '✓' : '✗';
    const indexStr = ws.index !== undefined ? ` [${ws.index}]` : '';

    console.log(`│ ${name} │ ${type}${indexStr.padEnd(11 - type.length)} │ ${baseUrl} │ ${hasKey.padEnd(9)} │`);
  }

  console.log('└───────────────────────────────────┴─────────────┴───────────────────────────────┴───────────┘');
  console.log(`\nTotal: ${workspaces.length} workspace(s)\n`);
}
