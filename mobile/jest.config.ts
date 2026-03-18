import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    __DEV__: true,
  },
  // Automatically mock these native modules
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
};

export default config;
