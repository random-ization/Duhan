import { beforeAll, afterAll } from 'vitest';

// Global setup for Convex tests
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CONVEX_URL = 'http://localhost:8000';
  process.env.CONVEX_DEPLOYMENT = 'test';
});

afterAll(() => {
  // Cleanup after tests
  delete process.env.NODE_ENV;
  delete process.env.CONVEX_URL;
  delete process.env.CONVEX_DEPLOYMENT;
});
