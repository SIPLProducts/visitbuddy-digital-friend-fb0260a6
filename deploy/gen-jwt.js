#!/usr/bin/env node
// Generate Supabase anon + service_role JWTs from a JWT_SECRET.
// Usage: node gen-jwt.js <JWT_SECRET>
const crypto = require('crypto');
const secret = process.argv[2];
if (!secret) { console.error('Usage: gen-jwt.js <JWT_SECRET>'); process.exit(1); }

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years
const anon = sign({ role: 'anon', iss: 'supabase', iat, exp });
const service = sign({ role: 'service_role', iss: 'supabase', iat, exp });
console.log(JSON.stringify({ anon, service_role: service }));