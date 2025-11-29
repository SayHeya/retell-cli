import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { WorkspaceConfigService, type RetellError } from '@heya/retell.controllers';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('WorkspaceConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let tempDir: string;

  beforeEach(async () => {
    // Save original env and cwd
    originalEnv = { ...process.env };
    originalCwd = process.cwd();

    // Create temp directory and change to it
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-test-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Restore original env and cwd
    process.env = originalEnv;
    process.chdir(originalCwd);

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should load workspace configs from workspaces.json file (legacy format)', async () => {
      // Create workspaces.json in legacy format
      const workspacesConfig = {
        staging: {
          api_key: 'staging_key_123',
          name: 'Staging',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'prod_key_456',
          name: 'Production',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mode).toBe('single-production');
      expect(result.value.staging.apiKey).toBe('staging_key_123');
      if (result.value.mode === 'single-production') {
        expect(result.value.production.apiKey).toBe('prod_key_456');
      }
    });

    it('should load workspace configs with new api_key_env format', async () => {
      // Set environment variables
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_from_env';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_from_env';

      const workspacesConfig = {
        mode: 'single-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key_env: 'RETELL_PRODUCTION_API_KEY',
          name: 'WORKSPACE_1_PRODUCTION',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mode).toBe('single-production');
      expect(result.value.staging.apiKey).toBe('staging_key_from_env');
      expect(result.value.staging.name).toBe('WORKSPACE_STAGING');
      if (result.value.mode === 'single-production') {
        expect(result.value.production.apiKey).toBe('prod_key_from_env');
      }
    });

    it('should return error when api_key_env env var is not set', async () => {
      // Clear env vars
      delete process.env['RETELL_STAGING_API_KEY'];

      const workspacesConfig = {
        mode: 'single-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key_env: 'RETELL_PRODUCTION_API_KEY',
          name: 'WORKSPACE_1_PRODUCTION',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('RETELL_STAGING_API_KEY');
    });

    it('should use custom base URL if provided in file', async () => {
      const workspacesConfig = {
        staging: {
          api_key: 'staging_key_123',
          name: 'Staging',
          base_url: 'https://custom.retell.com',
        },
        production: {
          api_key: 'prod_key_456',
          name: 'Production',
          base_url: 'https://custom.retell.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(true);
      const config = (result as { success: true; value: unknown }).value;
      expect(config).toMatchObject({
        staging: {
          baseUrl: 'https://custom.retell.com',
        },
        production: {
          baseUrl: 'https://custom.retell.com',
        },
      });
    });

    it('should return error if workspaces.json is missing', async () => {
      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: RetellError }).error;
      expect(error.message).toContain('workspaces.json not found');
    });

    it('should return error if staging workspace is missing from file', async () => {
      const workspacesConfig = {
        production: {
          api_key: 'prod_key_456',
          name: 'Production',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: RetellError }).error;
      expect(error.message).toContain('staging');
    });

    it('should return error if production workspace is missing from file', async () => {
      const workspacesConfig = {
        staging: {
          api_key: 'staging_key_123',
          name: 'Staging',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: RetellError }).error;
      expect(error.message).toContain('production');
    });
  });

  describe('getWorkspace', () => {
    beforeEach(async () => {
      const workspacesConfig = {
        staging: {
          api_key: 'staging_key_123',
          name: 'Staging',
        },
        production: {
          api_key: 'prod_key_456',
          name: 'Production',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );
    });

    it('should get staging workspace config', async () => {
      const result = await WorkspaceConfigService.getWorkspace('staging');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.name).toBe('Staging');
        expect(result.value.apiKey).toBe('staging_key_123');
      }
    });

    it('should get production workspace config', async () => {
      const result = await WorkspaceConfigService.getWorkspace('production');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.name).toBe('Production');
        expect(result.value.apiKey).toBe('prod_key_456');
      }
    });

    it('should return error when workspaces.json is missing', async () => {
      // Remove workspaces.json
      await fs.unlink(path.join(tempDir, 'workspaces.json'));

      const result = await WorkspaceConfigService.getWorkspace('staging');

      expect(result.success).toBe(false);

      // Assert result is failure before accessing error
      if (result.success === true) {
        throw new Error('Expected result to be failure');
      }

      expect(result.error.message).toContain('workspaces.json not found');
    });
  });

  describe('generateFromEnv', () => {
    it('should generate workspaces.json from environment variables', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';

      const result = await WorkspaceConfigService.generateFromEnv();

      expect(result.success).toBe(true);

      // Verify file was created
      const fileExists = await WorkspaceConfigService.exists();
      expect(fileExists).toBe(true);

      // Verify content
      const loadResult = await WorkspaceConfigService.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.staging.apiKey).toBe('staging_key_123');
        if (loadResult.value.mode === 'single-production') {
          expect(loadResult.value.production.apiKey).toBe('prod_key_456');
        }
      }
    });

    it('should use custom base URL from env if provided', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';
      process.env['RETELL_BASE_URL'] = 'https://custom.retell.com';

      const result = await WorkspaceConfigService.generateFromEnv();

      expect(result.success).toBe(true);

      const loadResult = await WorkspaceConfigService.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.staging.baseUrl).toBe('https://custom.retell.com');
        if (loadResult.value.mode === 'single-production') {
          expect(loadResult.value.production.baseUrl).toBe('https://custom.retell.com');
        }
      }
    });

    it('should return error if staging API key is missing', async () => {
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';
      delete process.env['RETELL_STAGING_API_KEY'];

      const result = await WorkspaceConfigService.generateFromEnv();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('RETELL_STAGING_API_KEY');
      }
    });

    it('should return error if production API key is missing', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      delete process.env['RETELL_PRODUCTION_API_KEY'];

      const result = await WorkspaceConfigService.generateFromEnv();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('RETELL_PRODUCTION_API_KEY');
      }
    });

    it('should return error if workspaces.json already exists', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';

      // Create file first
      await fs.writeFile(path.join(tempDir, 'workspaces.json'), '{}');

      const result = await WorkspaceConfigService.generateFromEnv();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('already exists');
      }
    });

    it('should generate multi-production config when mode is specified', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';

      const result = await WorkspaceConfigService.generateFromEnv({
        mode: 'multi-production',
        productionWorkspaces: [
          { id: 'ws_prod_1', name: 'WORKSPACE_1_PRODUCTION', envVar: 'RETELL_PRODUCTION_1_API_KEY' },
        ],
      });

      expect(result.success).toBe(true);

      const loadResult = await WorkspaceConfigService.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.mode).toBe('multi-production');
        if (loadResult.value.mode === 'multi-production') {
          expect(loadResult.value.production).toHaveLength(1);
          expect(loadResult.value.production[0]?.apiKey).toBe('prod_key_1');
        }
      }
    });
  });

  describe('multi-production mode', () => {
    it('should load multi-production config', async () => {
      // Set environment variables
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';
      process.env['RETELL_PRODUCTION_2_API_KEY'] = 'prod_key_2';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            id: 'ws_prod_1',
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
          {
            id: 'ws_prod_2',
            api_key_env: 'RETELL_PRODUCTION_2_API_KEY',
            name: 'WORKSPACE_2_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.value.mode).toBe('multi-production');
      if (result.value.mode === 'multi-production') {
        expect(result.value.production).toHaveLength(2);
        expect(result.value.production[0]?.apiKey).toBe('prod_key_1');
        expect(result.value.production[0]?.id).toBe('ws_prod_1');
        expect(result.value.production[1]?.apiKey).toBe('prod_key_2');
      }
    });

    it('should get production workspace by index in multi-production mode', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';
      process.env['RETELL_PRODUCTION_2_API_KEY'] = 'prod_key_2';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            id: 'ws_prod_1',
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
          {
            id: 'ws_prod_2',
            api_key_env: 'RETELL_PRODUCTION_2_API_KEY',
            name: 'WORKSPACE_2_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      // Get first production workspace
      const result0 = await WorkspaceConfigService.getWorkspace('production', 0);
      expect(result0.success).toBe(true);
      if (result0.success) {
        expect(result0.value.apiKey).toBe('prod_key_1');
        expect(result0.value.name).toBe('WORKSPACE_1_PRODUCTION');
      }

      // Get second production workspace
      const result1 = await WorkspaceConfigService.getWorkspace('production', 1);
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.value.apiKey).toBe('prod_key_2');
        expect(result1.value.name).toBe('WORKSPACE_2_PRODUCTION');
      }
    });

    it('should return error for invalid production index', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            id: 'ws_prod_1',
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getWorkspace('production', 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return error when mode says multi-production but production is not array', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key_env: 'RETELL_PRODUCTION_API_KEY',
          name: 'WORKSPACE_1_PRODUCTION',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.load();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('must be an array');
      }
    });
  });

  describe('getProductionWorkspaces', () => {
    it('should return array with single workspace in single-production mode', async () => {
      const workspacesConfig = {
        mode: 'single-production',
        staging: {
          api_key: 'staging_key',
          name: 'Staging',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'prod_key',
          name: 'Production',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getProductionWorkspaces();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.apiKey).toBe('prod_key');
      }
    });

    it('should return array of workspaces in multi-production mode', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';
      process.env['RETELL_PRODUCTION_2_API_KEY'] = 'prod_key_2';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            id: 'ws_prod_1',
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
          {
            id: 'ws_prod_2',
            api_key_env: 'RETELL_PRODUCTION_2_API_KEY',
            name: 'WORKSPACE_2_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getProductionWorkspaces();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.apiKey).toBe('prod_key_1');
        expect(result.value[1]?.apiKey).toBe('prod_key_2');
      }
    });
  });

  describe('getAllWorkspaces', () => {
    it('should return all workspaces with type info', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';
      process.env['RETELL_PRODUCTION_2_API_KEY'] = 'prod_key_2';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            id: 'ws_prod_1',
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
          {
            id: 'ws_prod_2',
            api_key_env: 'RETELL_PRODUCTION_2_API_KEY',
            name: 'WORKSPACE_2_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getAllWorkspaces();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(3);

        // Check staging
        expect(result.value[0]?.type).toBe('staging');
        expect(result.value[0]?.apiKey).toBe('staging_key');

        // Check production workspaces
        expect(result.value[1]?.type).toBe('production');
        expect(result.value[1]?.index).toBe(0);
        expect(result.value[2]?.type).toBe('production');
        expect(result.value[2]?.index).toBe(1);
      }
    });
  });

  describe('getMode', () => {
    it('should return single-production mode', async () => {
      const workspacesConfig = {
        mode: 'single-production',
        staging: {
          api_key: 'staging_key',
          name: 'Staging',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'prod_key',
          name: 'Production',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getMode();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('single-production');
      }
    });

    it('should return multi-production mode', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';

      const workspacesConfig = {
        mode: 'multi-production',
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getMode();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('multi-production');
      }
    });

    it('should auto-detect mode from production array', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key';
      process.env['RETELL_PRODUCTION_1_API_KEY'] = 'prod_key_1';

      // No explicit mode, but production is array
      const workspacesConfig = {
        staging: {
          api_key_env: 'RETELL_STAGING_API_KEY',
          name: 'WORKSPACE_STAGING',
          base_url: 'https://api.retellai.com',
        },
        production: [
          {
            api_key_env: 'RETELL_PRODUCTION_1_API_KEY',
            name: 'WORKSPACE_1_PRODUCTION',
            base_url: 'https://api.retellai.com',
          },
        ],
      };

      await fs.writeFile(
        path.join(tempDir, 'workspaces.json'),
        JSON.stringify(workspacesConfig, null, 2)
      );

      const result = await WorkspaceConfigService.getMode();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('multi-production');
      }
    });
  });
});
