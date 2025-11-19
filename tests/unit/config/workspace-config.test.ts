import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { WorkspaceConfigLoader } from '@config/workspace-config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('WorkspaceConfigLoader', () => {
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
    it('should load workspace configs from workspaces.json file', async () => {
      // Create workspaces.json
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

      const result = await WorkspaceConfigLoader.load();

      expect(result.success).toBe(true);
      const config = (result as { success: true; value: unknown }).value;
      expect(config).toMatchObject({
        staging: {
          name: 'staging',
          apiKey: 'staging_key_123',
          baseUrl: 'https://api.retellai.com',
        },
        production: {
          name: 'production',
          apiKey: 'prod_key_456',
          baseUrl: 'https://api.retellai.com',
        },
      });
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

      const result = await WorkspaceConfigLoader.load();

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
      const result = await WorkspaceConfigLoader.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: Error }).error;
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

      const result = await WorkspaceConfigLoader.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: Error }).error;
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

      const result = await WorkspaceConfigLoader.load();

      expect(result.success).toBe(false);
      const error = (result as { success: false; error: Error }).error;
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
      const result = await WorkspaceConfigLoader.getWorkspace('staging');

      expect(result.success).toBe(true);
      const config = (result as { success: true; value: unknown }).value;
      expect(config).toMatchObject({
        name: 'staging',
        apiKey: 'staging_key_123',
      });
    });

    it('should get production workspace config', async () => {
      const result = await WorkspaceConfigLoader.getWorkspace('production');

      expect(result.success).toBe(true);
      const config = (result as { success: true; value: unknown }).value;
      expect(config).toMatchObject({
        name: 'production',
        apiKey: 'prod_key_456',
      });
    });

    it('should return error when workspaces.json is missing', async () => {
      // Remove workspaces.json
      await fs.unlink(path.join(tempDir, 'workspaces.json'));

      const result = await WorkspaceConfigLoader.getWorkspace('staging');

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

      const result = await WorkspaceConfigLoader.generateFromEnv();

      expect(result.success).toBe(true);

      // Verify file was created
      const fileExists = await WorkspaceConfigLoader.exists();
      expect(fileExists).toBe(true);

      // Verify content
      const loadResult = await WorkspaceConfigLoader.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.staging.apiKey).toBe('staging_key_123');
        expect(loadResult.value.production.apiKey).toBe('prod_key_456');
      }
    });

    it('should use custom base URL from env if provided', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';
      process.env['RETELL_BASE_URL'] = 'https://custom.retell.com';

      const result = await WorkspaceConfigLoader.generateFromEnv();

      expect(result.success).toBe(true);

      const loadResult = await WorkspaceConfigLoader.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.value.staging.baseUrl).toBe('https://custom.retell.com');
        expect(loadResult.value.production.baseUrl).toBe('https://custom.retell.com');
      }
    });

    it('should return error if staging API key is missing', async () => {
      process.env['RETELL_PRODUCTION_API_KEY'] = 'prod_key_456';
      delete process.env['RETELL_STAGING_API_KEY'];

      const result = await WorkspaceConfigLoader.generateFromEnv();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('RETELL_STAGING_API_KEY');
      }
    });

    it('should return error if production API key is missing', async () => {
      process.env['RETELL_STAGING_API_KEY'] = 'staging_key_123';
      delete process.env['RETELL_PRODUCTION_API_KEY'];

      const result = await WorkspaceConfigLoader.generateFromEnv();

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

      const result = await WorkspaceConfigLoader.generateFromEnv();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('already exists');
      }
    });
  });
});
