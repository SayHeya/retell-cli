module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],

  // Transform packages with ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },

  // Module name mapping for path aliases - use both pathsToModuleNameMapper and manual mappings
  moduleNameMapper: {
    // Map to the controllers package
    '^@heya/retell\\.controllers$': '<rootDir>/packages/controllers/src/index',
    '^@heya/retell\\.controllers/(.*)$': '<rootDir>/packages/controllers/src/$1',
    // Legacy path aliases mapped to new locations
    '^@commands/(.*)$': '<rootDir>/src/cli/commands/$1',
    '^@core/(.*)$': '<rootDir>/packages/controllers/src/core/$1',
    '^@api/(.*)$': '<rootDir>/packages/controllers/src/services/$1',
    '^@schemas/(.*)$': '<rootDir>/packages/controllers/src/schemas/$1',
    '^@types/(.*)$': '<rootDir>/packages/controllers/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/packages/controllers/src/services/$1',
  },

  // Tell Jest where to find modules
  modulePaths: ['<rootDir>'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70, // Lower threshold due to defensive error handling
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Test timeout
  testTimeout: 10000,

  // Display configuration
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
