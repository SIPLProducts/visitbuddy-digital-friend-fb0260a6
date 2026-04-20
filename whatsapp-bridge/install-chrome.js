// Cross-platform Chrome installer for Puppeteer.
// Resolves an ABSOLUTE cache dir (Puppeteer requires this on Windows) and then
// shells out to `puppeteer browsers install chrome`. Works on Windows, macOS,
// Linux, and Render — no shell-specific syntax.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDir = path.resolve(__dirname, '.puppeteer-cache');
process.env.PUPPETEER_CACHE_DIR = cacheDir;

console.log('[install-chrome] PUPPETEER_CACHE_DIR =', cacheDir);

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

const result = spawnSync(
  cmd,
  ['puppeteer', 'browsers', 'install', 'chrome'],
  { stdio: 'inherit', env: process.env, shell: false },
);

if (result.error) {
  console.error('[install-chrome] failed to spawn npx:', result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);