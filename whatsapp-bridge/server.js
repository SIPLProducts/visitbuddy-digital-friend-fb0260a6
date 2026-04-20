// WhatsApp Web bridge server (DEMO ONLY)
// Hosts a long-lived whatsapp-web.js session and exposes a small HTTP API
// that the Lovable Edge Function `whatsapp-bridge` proxies to.
//
// Run locally:  npm install && node server.js
// Then expose:  ngrok http 3000   (copy the HTTPS URL into WHATSAPP_BRIDGE_URL secret)
//
// SECURITY: every endpoint requires header `x-api-key: <BRIDGE_API_KEY>`.
// WhatsApp ToS: using whatsapp-web.js to automate a personal number is against
// WhatsApp's Terms of Service. Use a dedicated demo SIM. Number can be banned.

import 'dotenv/config';
import express from 'express';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Ensure Puppeteer reads Chrome from the same project-relative folder that
// `postinstall` wrote to. Render wipes ~/.cache between build & runtime, but
// keeps everything under /opt/render/project/src — so we pin the cache there.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.puppeteer-cache');
}

// Detect the actual Chrome binary that `postinstall` downloaded so we can
// pass an explicit `executablePath` to Puppeteer. whatsapp-web.js bundles
// its own puppeteer-core which otherwise looks for a different revision in
// the wrong cache dir on Render.
function findInstalledChrome(cacheDir) {
  try {
    const chromeRoot = path.join(cacheDir, 'chrome');
    if (!fs.existsSync(chromeRoot)) return null;
    const builds = fs
      .readdirSync(chromeRoot)
      .filter((d) => d.startsWith('linux-') || d.startsWith('mac-') || d.startsWith('win'))
      .sort()
      .reverse();
    for (const b of builds) {
      const candidates = [
        path.join(chromeRoot, b, 'chrome-linux64', 'chrome'),
        path.join(chromeRoot, b, 'chrome-linux', 'chrome'),
        path.join(chromeRoot, b, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join(chromeRoot, b, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        // Windows Chrome-for-Testing layouts
        path.join(chromeRoot, b, 'chrome-win64', 'chrome.exe'),
        path.join(chromeRoot, b, 'chrome-win32', 'chrome.exe'),
        path.join(chromeRoot, b, 'chrome-win', 'chrome.exe'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
    }
  } catch (e) {
    console.error('[wweb-bridge] findInstalledChrome error', e);
  }
  return null;
}

if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
  const detected = findInstalledChrome(process.env.PUPPETEER_CACHE_DIR);
  if (detected) {
    process.env.PUPPETEER_EXECUTABLE_PATH = detected;
    console.log('[wweb-bridge] detected Chrome at', detected);
  } else {
    console.warn('[wweb-bridge] no Chrome binary found under', process.env.PUPPETEER_CACHE_DIR);
  }
}

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.BRIDGE_API_KEY || 'change-me';

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- Auth middleware ---
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// --- WhatsApp client state ---
let state = 'disconnected'; // disconnected | qr | authenticated | ready
let lastQrDataUrl = null;

let client = null;

function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.SESSION_PATH || './wweb-session' }),
    puppeteer: {
      headless: true,
      // Honor PUPPETEER_EXECUTABLE_PATH if set (e.g. Docker with system chromium).
      // Otherwise let puppeteer auto-resolve from PUPPETEER_CACHE_DIR.
      ...(process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
        : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  c.on('qr', async (qr) => {
    state = 'qr';
    try {
      lastQrDataUrl = await qrcode.toDataURL(qr, { width: 320, margin: 1 });
      console.log('[wweb] QR generated, scan with WhatsApp app.');
    } catch (e) {
      console.error('[wweb] QR encode failed', e);
    }
  });

  c.on('authenticated', () => {
    state = 'authenticated';
    lastQrDataUrl = null;
    console.log('[wweb] authenticated');
  });

  c.on('ready', () => {
    state = 'ready';
    lastQrDataUrl = null;
    console.log('[wweb] ready — sending enabled');
  });

  c.on('auth_failure', (m) => {
    state = 'disconnected';
    console.error('[wweb] auth_failure', m);
  });

  c.on('disconnected', (reason) => {
    state = 'disconnected';
    lastQrDataUrl = null;
    console.warn('[wweb] disconnected', reason);
  });

  return c;
}

async function ensureClient() {
  if (client) return client;
  client = buildClient();
  client.initialize().catch((e) => console.error('[wweb] init error', e));
  return client;
}

// kick off on boot so QR is ready when /qr is hit
ensureClient();

// --- Endpoints ---
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/status', (_req, res) => {
  res.json({ state, hasQr: !!lastQrDataUrl });
});

app.get('/qr', async (_req, res) => {
  await ensureClient();
  res.json({ state, qr: lastQrDataUrl });
});

app.post('/send', async (req, res) => {
  if (state !== 'ready') {
    return res.status(409).json({ error: 'WhatsApp not ready', state });
  }
  const { phone, message, mediaUrl } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }
  // normalize phone -> E.164 digits, default IN
  let digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  if (digits.startsWith('0')) digits = '91' + digits.slice(1);
  const chatId = `${digits}@c.us`;

  try {
    let result;
    if (mediaUrl) {
      const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
      result = await client.sendMessage(chatId, media, { caption: message });
    } else {
      result = await client.sendMessage(chatId, message);
    }
    res.json({ success: true, id: result.id?._serialized || null });
  } catch (e) {
    console.error('[wweb] send failed', e);
    res.status(500).json({ error: e.message || 'send failed' });
  }
});

app.post('/logout', async (_req, res) => {
  try {
    if (client) {
      await client.logout().catch(() => {});
      await client.destroy().catch(() => {});
    }
    client = null;
    state = 'disconnected';
    lastQrDataUrl = null;
    setTimeout(() => ensureClient(), 1000);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[wweb-bridge] listening on :${PORT}`);
  console.log(`[wweb-bridge] API_KEY set: ${API_KEY !== 'change-me'}`);
  console.log(`[wweb-bridge] PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || '(unset, using default ~/.cache/puppeteer)'}`);
  console.log(`[wweb-bridge] PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH || '(unset, will auto-resolve)'}`);
  console.log(`[wweb-bridge] SESSION_PATH: ${process.env.SESSION_PATH || './wweb-session'}`);
});
