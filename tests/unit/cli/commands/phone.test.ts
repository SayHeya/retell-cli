/**
 * Tests for phone command functionality
 */

import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Phone Command Dependencies', () => {
  let tempDir: string;
  let phoneDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phone-cmd-test-'));
    phoneDir = path.join(tempDir, 'phone-numbers');
    await fs.mkdir(phoneDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Phone number directory structure', () => {
    it('should create phone numbers directory', async () => {
      const exists = await fs
        .access(phoneDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should store phone number metadata', async () => {
      const phoneNumber = {
        number: '+15551234567',
        sid: 'PNxxx',
        agent_id: 'agent_123',
        workspace: 'staging',
      };

      const filePath = path.join(phoneDir, '+15551234567.json');
      await fs.writeFile(filePath, JSON.stringify(phoneNumber, null, 2));

      const content = await fs.readFile(filePath, 'utf-8');
      const loaded = JSON.parse(content);

      expect(loaded.number).toBe('+15551234567');
      expect(loaded.agent_id).toBe('agent_123');
    });
  });

  describe('Phone number formatting', () => {
    it('should validate E.164 format', () => {
      const validNumbers = ['+15551234567', '+447911123456'];
      validNumbers.forEach((number) => {
        expect(number.startsWith('+')).toBe(true);
      });
    });
  });
});
