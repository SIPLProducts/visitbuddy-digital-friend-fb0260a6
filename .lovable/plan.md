

User wants to abandon Render and host the bridge locally on their laptop with ngrok. The whatsapp-bridge folder already supports this — README mentions it. I just need to give a clean step-by-step plan that reuses existing code, no code changes.

Verify by checking the bridge code & README quickly. Already in context — `server.js`, `package.json`, `README.md` all support local mode. `PUPPETEER_EXECUTABLE_PATH` is auto-detected from `.puppeteer-cache`, `SESSION_PATH` defaults to `./wweb-session`, `BRIDGE_API_KEY` env var is read.

The two Lovable secrets `WHATSAPP_BRIDGE_URL` and `WHATSAPP_BRIDGE_API_KEY` already exist (Render uses them) — we just point them at the ngrok URL instead.

Keep concise: prerequisites, exact commands, secret update, verify.

