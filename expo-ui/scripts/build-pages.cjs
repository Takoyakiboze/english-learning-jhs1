const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const suppliedPath = process.argv[2] ?? process.env.PAGES_BASE_PATH;
if (suppliedPath === undefined || (suppliedPath !== '' && !/^\/(?:[A-Za-z0-9._-]+)?$/.test(suppliedPath))) {
  console.error('Usage: npm run build:pages -- /repository-name (use / for a domain root)');
  process.exit(1);
}
const basePath = suppliedPath === '/' ? '' : suppliedPath;
const projectRoot = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [
  require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist-pages',
], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, PAGES_BASE_PATH: basePath },
});
if (result.error) console.error(result.error.message);
if (result.status !== 0) process.exit(result.status ?? 1);
// Jekyll otherwise skips Expo's _expo directory when serving a branch.
fs.writeFileSync(path.join(projectRoot, 'dist-pages', '.nojekyll'), '');
fs.copyFileSync(path.join(projectRoot, 'LICENSE'), path.join(projectRoot, 'dist-pages', 'LICENSE.txt'));
console.log(`Pages files: dist-pages/ — serve at ${basePath || ''}/`);
