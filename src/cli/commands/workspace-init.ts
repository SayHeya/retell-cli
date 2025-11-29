/**
 * Workspace init command - Generate workspaces.json from environment variables
 */

import { Command } from 'commander';
import { WorkspaceController } from '@heya/retell.controllers';
import { handleError } from '../errors/cli-error-handler';

export const workspaceInitCommand = new Command('init')
  .description('Generate workspaces.json from environment variables')
  .option('-f, --force', 'Overwrite existing workspaces.json', false)
  .action(async (options: WorkspaceInitOptions) => {
    try {
      await executeWorkspaceInit(options);
    } catch (error) {
      handleError(error);
    }
  });

type WorkspaceInitOptions = {
  force: boolean;
};

async function executeWorkspaceInit(options: WorkspaceInitOptions): Promise<void> {
  console.log('\nGenerating workspaces.json from environment variables...\n');

  const controller = new WorkspaceController();

  // Check if file exists and force not set
  const exists = await controller.exists();
  if (exists && !options.force) {
    console.error('workspaces.json already exists. Use --force to overwrite.');
    process.exit(1);
  }

  // If force, remove existing file
  if (exists && options.force) {
    console.log('Overwriting existing workspaces.json...\n');
    const fs = await import('fs/promises');
    const path = await import('path');
    const workspacesPath = path.resolve(process.cwd(), 'workspaces.json');
    await fs.unlink(workspacesPath);
  }

  // Generate from environment
  const result = await controller.init({ force: options.force });

  if (!result.success) {
    throw result.error;
  }

  console.log('✓ Successfully created workspaces.json\n');
  console.log('Workspace configuration:');
  console.log('  - staging: Uses RETELL_STAGING_API_KEY');
  console.log('  - production: Uses RETELL_PRODUCTION_API_KEY');

  console.log('\nNote: API keys are now referenced by environment variable name.');
  console.log('      The workspaces.json file can be safely committed to git.');
  console.log('');
}
