// Supervisor for whatsapp-bridge/server.js
// ----------------------------------------
// Spawns `node server.js` as a child process and auto-restarts it if it
// exits. Crash-loop guard: at most 10 restarts in any rolling 60s window —
// after that the supervisor exits so you can investigate.
//
// Usage:
//   node run.js
// Replaces (do NOT also run):
//   node server.js
//
// Forwards stdout / stderr / signals so terminal behaviour is identical to
// running server.js directly, but the bridge now self-heals when
// whatsapp-web.js / puppeteer throws an unrecoverable error and exits.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, 'server.js');

const MAX_RESTARTS = 10;
const WINDOW_MS = 60_000;
const RESTART_DELAY_MS = 2_000;

let child = null;
let shuttingDown = false;
const restartTimes = [];

function pruneOldRestarts() {
  const cutoff = Date.now() - WINDOW_MS;
  while (restartTimes.length && restartTimes[0] < cutoff) restartTimes.shift();
}

function start() {
  if (shuttingDown) return;
  console.log(`[supervisor] starting server.js (pid parent ${process.pid})`);
  child = spawn(process.execPath, [serverPath], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (shuttingDown) return;
    console.warn(`[supervisor] server.js exited code=${code} signal=${signal}`);

    restartTimes.push(Date.now());
    pruneOldRestarts();

    if (restartTimes.length > MAX_RESTARTS) {
      console.error(
        `[supervisor] crash loop detected (${restartTimes.length} restarts in ${WINDOW_MS / 1000}s) — giving up.`,
      );
      process.exit(1);
    }

    console.warn(`[supervisor] restarting in ${RESTART_DELAY_MS}ms (restart #${restartTimes.length} in window)`);
    setTimeout(start, RESTART_DELAY_MS);
  });

  child.on('error', (err) => {
    console.error('[supervisor] failed to spawn server.js:', err);
  });
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[supervisor] received ${signal} — stopping child`);
  if (child) {
    try { child.kill(signal); } catch { /* ignore */ }
    setTimeout(() => process.exit(0), 1500).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();