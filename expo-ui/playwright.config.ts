import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', use: { baseURL: process.env.EXPO_TEST_URL || 'http://localhost:8082', viewport: { width: 390, height: 844 } }, workers: 1 });
