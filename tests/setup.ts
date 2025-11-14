/**
 * Jest setup file
 * Runs before all tests
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Set test environment variables
process.env['NODE_ENV'] = 'test';

// Increase test timeout for integration and e2e tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
