import type { WorkspaceType } from '../types/agent.types';
import type { Result } from '../types/common.types';
import { Ok, Err } from '../types/common.types';

/**
 * Workspace configuration with API credentials
 */
export type WorkspaceConfig = {
  readonly name: WorkspaceType;
  readonly apiKey: string;
  readonly baseUrl: string;
};

/**
 * All workspace configurations
 */
export type WorkspacesConfig = {
  readonly staging: WorkspaceConfig;
  readonly production: WorkspaceConfig;
};

/**
 * Configuration loader for workspace settings.
 * Reads from environment variables.
 */
export class WorkspaceConfigLoader {
  private static readonly DEFAULT_BASE_URL = 'https://api.retellai.com';

  /**
   * Load workspace configurations from environment variables.
   *
   * Expected environment variables:
   * - RETELL_STAGING_API_KEY
   * - RETELL_PRODUCTION_API_KEY
   * - RETELL_BASE_URL (optional, defaults to https://api.retellai.com)
   *
   * @returns Result containing workspace configs or error
   */
  static load(): Result<WorkspacesConfig, Error> {
    try {
      const stagingApiKey = process.env['RETELL_STAGING_API_KEY'];
      const productionApiKey = process.env['RETELL_PRODUCTION_API_KEY'];
      const baseUrl = process.env['RETELL_BASE_URL'] ?? this.DEFAULT_BASE_URL;

      if (!stagingApiKey) {
        return Err(
          new Error(
            'RETELL_STAGING_API_KEY environment variable is not set. Please add it to your .env file.'
          )
        );
      }

      if (!productionApiKey) {
        return Err(
          new Error(
            'RETELL_PRODUCTION_API_KEY environment variable is not set. Please add it to your .env file.'
          )
        );
      }

      const config: WorkspacesConfig = {
        staging: {
          name: 'staging',
          apiKey: stagingApiKey,
          baseUrl,
        },
        production: {
          name: 'production',
          apiKey: productionApiKey,
          baseUrl,
        },
      };

      return Ok(config);
    } catch (error) {
      return Err(
        error instanceof Error
          ? error
          : new Error('Failed to load workspace configuration')
      );
    }
  }

  /**
   * Get configuration for a specific workspace.
   *
   * @param workspace - Workspace type (staging or production)
   * @returns Result containing workspace config or error
   */
  static getWorkspace(
    workspace: WorkspaceType
  ): Result<WorkspaceConfig, Error> {
    const configResult = this.load();
    if (!configResult.success) {
      return configResult;
    }

    return Ok(configResult.value[workspace]);
  }
}
