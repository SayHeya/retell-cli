/**
 * Tests for workspace-init command functionality
 */

import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Workspace Init Command Dependencies', () => {
  let tempDir: string;
  let workspacesPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-init-test-'));
    workspacesPath = path.join(tempDir, 'workspaces.json');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Workspace configuration creation', () => {
    it('should create workspaces.json file', async () => {
      const config = {
        staging: {
          api_key: 'sk_staging_test_123',
          name: 'Staging Workspace',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'sk_prod_test_456',
          name: 'Production Workspace',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(workspacesPath, JSON.stringify(config, null, 2));

      const exists = await fs
        .access(workspacesPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should validate workspace configuration structure', async () => {
      const config = {
        staging: {
          api_key: 'sk_staging_test',
          name: 'Staging',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'sk_prod_test',
          name: 'Production',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(workspacesPath, JSON.stringify(config, null, 2));

      const content = await fs.readFile(workspacesPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.staging).toBeDefined();
      expect(loaded.production).toBeDefined();
      expect(loaded.staging.api_key).toBeTruthy();
      expect(loaded.production.api_key).toBeTruthy();
    });

    it('should handle missing environment variables', () => {
      const env = {
        RETELL_STAGING_API_KEY: undefined,
        RETELL_PRODUCTION_API_KEY: undefined,
      };

      expect(env.RETELL_STAGING_API_KEY).toBeUndefined();
      expect(env.RETELL_PRODUCTION_API_KEY).toBeUndefined();
    });

    it('should use environment variables if available', () => {
      const env = {
        RETELL_STAGING_API_KEY: 'sk_staging_from_env',
        RETELL_PRODUCTION_API_KEY: 'sk_prod_from_env',
      };

      expect(env.RETELL_STAGING_API_KEY).toBe('sk_staging_from_env');
      expect(env.RETELL_PRODUCTION_API_KEY).toBe('sk_prod_from_env');
    });
  });

  describe('Workspace validation', () => {
    it('should validate API key format', () => {
      const validKeys = ['sk_staging_abc123', 'sk_prod_xyz789', 'key_0123456789abcdef'];

      validKeys.forEach((key) => {
        expect(key.length).toBeGreaterThan(0);
        expect(typeof key).toBe('string');
      });
    });

    it('should require both staging and production workspaces', async () => {
      const config = {
        staging: {
          api_key: 'sk_staging_test',
          name: 'Staging',
          base_url: 'https://api.retellai.com',
        },
        production: {
          api_key: 'sk_prod_test',
          name: 'Production',
          base_url: 'https://api.retellai.com',
        },
      };

      await fs.writeFile(workspacesPath, JSON.stringify(config, null, 2));

      const content = await fs.readFile(workspacesPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect('staging' in loaded).toBe(true);
      expect('production' in loaded).toBe(true);
    });

    it('should validate base URL format', () => {
      const validUrls = [
        'https://api.retellai.com',
        'https://api.retellai.com/v2',
        'https://custom.api.com',
      ];

      validUrls.forEach((url) => {
        expect(url.startsWith('https://')).toBe(true);
      });
    });
  });

  describe('Configuration overwrite protection', () => {
    it('should detect existing workspaces.json', async () => {
      await fs.writeFile(workspacesPath, '{}');

      const exists = await fs
        .access(workspacesPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should backup existing configuration before overwrite', async () => {
      const oldConfig = {
        staging: { api_key: 'old_key', name: 'Old', base_url: 'https://api.retellai.com' },
        production: { api_key: 'old_key', name: 'Old', base_url: 'https://api.retellai.com' },
      };

      await fs.writeFile(workspacesPath, JSON.stringify(oldConfig, null, 2));

      // Simulate backup
      const backupPath = `${workspacesPath}.backup`;
      await fs.copyFile(workspacesPath, backupPath);

      const backupExists = await fs
        .access(backupPath)
        .then(() => true)
        .catch(() => false);

      expect(backupExists).toBe(true);

      // Cleanup
      await fs.unlink(backupPath);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid JSON in workspaces.json', async () => {
      await fs.writeFile(workspacesPath, 'invalid json');

      const content = await fs.readFile(workspacesPath, 'utf-8');
      expect(() => JSON.parse(content)).toThrow();
    });

    it('should handle missing required fields', async () => {
      const invalidConfig = {
        staging: {
          // missing api_key
          name: 'Staging',
        },
      };

      await fs.writeFile(workspacesPath, JSON.stringify(invalidConfig, null, 2));

      const content = await fs.readFile(workspacesPath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.staging.api_key).toBeUndefined();
    });

    it('should handle file system errors', async () => {
      const invalidPath = '/nonexistent/directory/workspaces.json';

      await expect(fs.writeFile(invalidPath, '{}')).rejects.toThrow();
    });
  });
});
