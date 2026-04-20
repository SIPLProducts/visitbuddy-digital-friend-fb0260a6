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

// On Windows, Node's spawnSync refuses to execute .cmd / .bat files unless
// shell:true is set (otherwise it throws EINVAL). We intentionally use
// shell:true on Windows and invoke the bare command "npx" — the shell
// resolves npx -> npx.cmd correctly. On macOS/Linux we keep shell:false.
const result = spawnSync(
  'npx',
  ['puppeteer', 'browsers', 'install', 'chrome'],
  { stdio: 'inherit', env: process.env, shell: isWindows },
);

if (result.error) {
  console.error('[install-chrome] failed to spawn npx:', result.error);
  console.error('[install-chrome] fallback: try running manually from this folder:');
  console.error('  npx puppeteer browsers install chrome');
  process.exit(1);
}

if ((result.status ?? 0) === 0) {
  console.log('[install-chrome] ✓ Chrome installed under', cacheDir);
  console.log('[install-chrome] You can now run: node run.js');
}
process.exit(result.status ?? 0);