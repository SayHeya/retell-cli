import type { RetellError, RetellErrorCode } from '@heya/retell.controllers';

/**
 * CLI-specific error with formatted output
 */
export class CLIError extends Error {
  readonly exitCode: number;
  readonly hint?: string;

  constructor(message: string, exitCode = 1, hint?: string) {
    super(message);
    this.name = 'CLIError';
    this.exitCode = exitCode;
    this.hint = hint;
  }

  /**
   * Create CLIError from RetellError
   */
  static fromRetellError(error: RetellError): CLIError {
    const mapped = mapRetellErrorToCLI(error);
    return new CLIError(mapped.message, mapped.exitCode, mapped.hint);
  }
}

/**
 * Mapped CLI error details
 */
type CLIErrorDetails = {
  message: string;
  hint?: string;
  exitCode: number;
};

/**
 * Map RetellError to CLI-specific error details
 */
function mapRetellErrorToCLI(error: RetellError): CLIErrorDetails {
  const code = error.code as RetellErrorCode;

  switch (code) {
    // Workspace errors
    case 'WORKSPACE_NOT_FOUND':
      return {
        message: error.message,
        hint: "Check your workspaces.json file or run 'retell workspace init'",
        exitCode: 1,
      };

    case 'WORKSPACE_CONFIG_MISSING':
      return {
        message: error.message,
        hint: "Run 'retell workspace init' to create workspaces.json from your .env file",
        exitCode: 1,
      };

    case 'WORKSPACE_API_KEY_INVALID':
      return {
        message: error.message,
        hint: 'Check your .env file has RETELL_STAGING_API_KEY and RETELL_PRODUCTION_API_KEY set',
        exitCode: 1,
      };

    case 'WORKSPACE_INVALID':
      return {
        message: error.message,
        hint: "Run 'retell workspace init --force' to regenerate workspaces.json",
        exitCode: 1,
      };

    // Agent errors
    case 'AGENT_NOT_FOUND':
      return {
        message: error.message,
        hint: 'Check the agent name and ensure it exists in your agents directory',
        exitCode: 1,
      };

    case 'AGENT_ALREADY_EXISTS':
      return {
        message: error.message,
        hint: 'Use a different agent name or delete the existing agent first',
        exitCode: 1,
      };

    case 'AGENT_CONFIG_INVALID':
      return {
        message: error.message,
        hint: 'Check your agent.json file for syntax errors or invalid values',
        exitCode: 1,
      };

    case 'AGENT_NOT_SYNCED':
      return {
        message: error.message,
        hint: 'Push the agent to the workspace first',
        exitCode: 1,
      };

    // Sync errors
    case 'SYNC_CONFLICT':
      return {
        message: `Sync conflict: ${error.message}`,
        hint: error.details?.['suggestion'] as string | undefined,
        exitCode: 1,
      };

    case 'SYNC_STAGING_REQUIRED':
      return {
        message: `Production push blocked: ${error.message}`,
        hint: error.details?.['suggestion'] as string | undefined,
        exitCode: 1,
      };

    case 'SYNC_DRIFT_DETECTED':
      return {
        message: `Drift detected: ${error.message}`,
        hint: 'Use retell diff to see changes and resolve conflicts',
        exitCode: 1,
      };

    // Validation errors
    case 'VALIDATION_ERROR':
    case 'SCHEMA_VALIDATION_ERROR':
      return {
        message: `Validation error: ${error.message}`,
        hint: 'Check your configuration files for errors',
        exitCode: 1,
      };

    case 'PROMPT_VALIDATION_ERROR':
      return {
        message: `Prompt validation error: ${error.message}`,
        hint: 'Check your prompt sections and variables',
        exitCode: 1,
      };

    // File system errors
    case 'FILE_NOT_FOUND':
      return {
        message: error.message,
        hint: 'Check the file path and ensure it exists',
        exitCode: 1,
      };

    case 'FILE_READ_ERROR':
      return {
        message: `Failed to read file: ${error.message}`,
        hint: 'Check file permissions and path',
        exitCode: 1,
      };

    case 'FILE_WRITE_ERROR':
      return {
        message: `Failed to write file: ${error.message}`,
        hint: 'Check file permissions and disk space',
        exitCode: 1,
      };

    case 'DIRECTORY_NOT_FOUND':
      return {
        message: error.message,
        hint: 'Create the directory or check the path',
        exitCode: 1,
      };

    // API errors
    case 'API_ERROR':
      return {
        message: `API error: ${error.message}`,
        hint: 'Check your network connection and API key',
        exitCode: 2,
      };

    case 'API_UNAUTHORIZED':
      return {
        message: `Authentication failed: ${error.message}`,
        hint: 'Check your API key in workspaces.json or .env file',
        exitCode: 2,
      };

    case 'API_RATE_LIMITED':
      return {
        message: `Rate limited: ${error.message}`,
        hint: 'Wait a moment and try again',
        exitCode: 2,
      };

    case 'API_NOT_FOUND':
      return {
        message: `Not found: ${error.message}`,
        hint: 'The resource may have been deleted from Retell',
        exitCode: 2,
      };

    case 'API_CONNECTION_ERROR':
      return {
        message: `Connection error: ${error.message}`,
        hint: 'Check your network connection',
        exitCode: 2,
      };

    // Prompt errors
    case 'PROMPT_SECTION_NOT_FOUND':
      return {
        message: error.message,
        hint: 'Create the prompt section file or update your agent.json',
        exitCode: 1,
      };

    case 'PROMPT_VARIABLE_UNDEFINED':
      return {
        message: error.message,
        hint: 'Define the variable in your agent.json prompt_config',
        exitCode: 1,
      };

    case 'PROMPT_BUILD_ERROR':
      return {
        message: `Failed to build prompt: ${error.message}`,
        hint: 'Check your prompt sections and variables',
        exitCode: 1,
      };

    // General errors
    case 'UNKNOWN_ERROR':
    default:
      return {
        message: error.message,
        exitCode: 1,
      };
  }
}

/**
 * Handle RetellError and exit with appropriate message
 */
export function handleRetellError(error: RetellError): never {
  const cliError = CLIError.fromRetellError(error);

  console.error(`\n❌ ${cliError.message}`);

  if (cliError.hint) {
    console.error(`\n   Hint: ${cliError.hint}`);
  }

  process.exit(cliError.exitCode);
}

/**
 * Handle any error (RetellError or other) and exit
 */
export function handleError(error: unknown): never {
  if (isRetellError(error)) {
    handleRetellError(error);
  }

  if (error instanceof CLIError) {
    console.error(`\n❌ ${error.message}`);
    if (error.hint) {
      console.error(`\n   Hint: ${error.hint}`);
    }
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`\n❌ ${error.message}`);
    process.exit(1);
  }

  console.error(`\n❌ An unexpected error occurred: ${String(error)}`);
  process.exit(1);
}

/**
 * Type guard for RetellError
 */
function isRetellError(error: unknown): error is RetellError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as RetellError).code === 'string' &&
    typeof (error as RetellError).message === 'string'
  );
}
