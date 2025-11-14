#!/usr/bin/env node

/**
 * Retell CLI entry point.
 * Provides commands for managing Retell agents across staging and production workspaces.
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to find .env file in current directory or parent directories
const findEnvFile = (): string | undefined => {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return undefined;
};

const envPath = findEnvFile();
config({ path: envPath });

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { pushCommand } from './commands/push';
import { pullCommand } from './commands/pull';
import { statusCommand } from './commands/status';
import { listCommand } from './commands/list';

const program = new Command();

program
  .name('retell')
  .description('CLI for managing Retell AI agents across workspaces')
  .version('1.0.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(pushCommand);
program.addCommand(pullCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);

// Parse arguments
program.parse();
