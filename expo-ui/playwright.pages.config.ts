import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const prefix = process.env.PAGES_BASE_PATH || '/english-learning-jhs1';
if (!/^\/(?:[A-Za-z0-9._-]+)?$/.test(prefix)) throw new Error('Invalid PAGES_BASE_PATH');
const baseURL = `http://127.0.0.1:8090${prefix === '/' ? '' : prefix}/`;

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: {
    command: `node scripts/serve-pages.cjs ${prefix}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
