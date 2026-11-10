// REVIEW-ONLY DRAFT — not deployed. Source baseline copied from the existing capture function.
// Records a visitor's privacy-notice acknowledgement + handwritten signature.
// mode "self_service": public kiosk/mobile – creates the visitor, then signature + agreement.
// mode "staff":        signed-in staff – attaches signature to a visitor they just created.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { PNG } from "npm:pngjs@7.0.0";
import { Buffer } from "node:buffer";

const ALLOWED_ORIGINS = new Set([
  "https://vms.resustainability.com",
  "https://visiguard.sharvisoftwareservices.com",
  "https://visitbuddy-digital-friend.lovable.app",
  "https://id-preview--ba1ec3a1-5305-43f4-8938-2533af93857d.lovable.app",
  "https://ba1ec3a1-5305-43f4-8938-2533af93857d.lovableproject.com",
  "http://localhost:8080",
]);

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

const MAX_B64 = 700_000;          // ~512 KB decoded
const MIN_W = 150, MIN_H = 60, MAX_W = 2400, MAX_H = 1200;
const MIN_INK_PIXELS = 150;

const uuid = z.string().uuid();
const optText = (n: number) => z.string().trim().max(n).optional().nullable();

const VisitorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,18}$/),
  email: z.string().trim().email().max(150),
  company: optText(100),
  purpose: optText(300),
  department_id: uuid.optional().nullable(),
  host_id: uuid.optional().nullable(),
  gate_id: uuid,
  vehicle_type: z.enum(["by_walk", "two_wheeler", "four_wheeler", "other"]).default("by_walk"),
  vehicle_number: optText(20),
  has_laptop: z.boolean().default(false),
  laptop_brand: optText(60),
  laptop_serial: optText(60),
  accompanying_count: z.number().int().min(0).max(50).default(0),
  photo_url: z.string().url().max(500).optional().nullable(),
}).strict();

const BodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("self_service"),
    visitor: VisitorSchema,
    notice_id: uuid,
    acknowledgements: z.tuple([z.literal(true), z.literal(true), z.literal(true), z.literal(true)]),
    signature_png: z.string().min(100).max(MAX_B64),
  }).strict(),
  z.object({
    mode: z.literal("staff"),
    visitor_id: uuid,
    notice_id: uuid,
    acknowledgements: z.tuple([z.literal(true), z.literal(true), z.literal(true), z.literal(true)]),
    signature_png: z.string().min(100).max(MAX_B64),
  }).strict(),
]);

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Decode, check and re-encode the PNG so only clean pixel data is stored. */
function sanitizeSignature(b64: string): { bytes: Uint8Array; width: number; height: number } {
  const clean = b64.replace(/^data:image\/png;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(clean)) throw new Error("Signature is not valid image data.");
  const raw = Buffer.from(clean, "base64");
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (raw.length < 100 || magic.some((m, i) => raw[i] !== m)) throw new Error("Signature must be a PNG image.");
  let png: PNG;
  try { png = PNG.sync.read(raw); } catch { throw new Error("Signature image could not be read."); }
  const { width, height, data } = png;
  if (width < MIN_W || height < MIN_H || width > MAX_W || height > MAX_H) throw new Error("Signature image size is not allowed.");
  let ink = 0, minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const a = data[i + 3], lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (a > 40 && lum < 200) { ink++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (ink < MIN_INK_PIXELS || maxX - minX < 40 || maxY - minY < 10) throw new Error("Signature is empty or too small. Please sign again.");
  const out = new PNG({ width, height });
  data.copy(out.data);
  const encoded = PNG.sync.write(out, { colorType: 6 });
  return { bytes: new Uint8Array(encoded), width, height };
}

function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(403, { error: "Origin not allowed" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let json: unknown;
  try { json = await req.json(); } catch { return reply(400, { error: "Invalid request body" }); }
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return reply(400, { error: "Please complete all required fields, the acknowledgement and the signature.", details: parsed.error.flatten().fieldErrors });
  const body = parsed.data;

  // ---- Who is calling ----
  let staffUserId: string | null = null;
  if (body.mode === "staff") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply(401, { error: "Sign in required" });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return reply(401, { error: "Sign in required" });
    staffUserId = data.user.id;
  }

  // ---- Rate limiting (fails closed) ----
  const ipKey = await sha256Hex("dpdp-sig:" + clientIp(req));
  const rlKey = body.mode === "staff" ? `staff:${staffUserId}` : `ip:${ipKey}`;
  const { data: allowed, error: rlErr } = await admin.rpc("dpdp_check_rate_limit", {
    _key: rlKey, _max: body.mode === "staff" ? 120 : 30, _window_seconds: 600,
  });
  if (rlErr) { console.error("rate limit error", rlErr.message); return reply(503, { error: "Service busy, please try again shortly." }); }
  if (allowed !== true) return reply(429, { error: "Too many attempts. Please wait a few minutes and try again." });

  // ---- Signature ----
  let sig: { bytes: Uint8Array; width: number; height: number };
  try { sig = sanitizeSignature(body.signature_png); } catch (e) { return reply(400, { error: (e as Error).message }); }
  const signatureHash = await sha256Hex(sig.bytes);

  // ---- Resolve location ----
  let locationId: string | null = null;
  let visitorId: string;
  let createdVisitor: { id: string; visitor_id: string } | null = null;

  if (body.mode === "staff") {
    const { data: loc } = await admin.rpc("visitor_location_id", { _visitor_id: body.visitor_id });
    locationId = (loc as string | null) ?? null;
    if (!locationId) return reply(422, { error: "Visitor has no valid location." });
    const { data: ok } = await admin.rpc("can_access_location", { _user_id: staffUserId, _location_id: locationId });
    if (ok !== true) return reply(403, { error: "You are not authorised for this visitor's location." });
    const { data: existing } = await admin.from("visitor_agreements").select("id")
      .eq("visitor_id", body.visitor_id).eq("agreement_type", "privacy_notice").maybeSingle();
    if (existing) return reply(409, { error: "A signature is already recorded for this visitor and cannot be replaced." });
    visitorId = body.visitor_id;
  } else {
    const v = body.visitor;
    const { data: gate } = await admin.from("gates").select("id, location_id, status").eq("id", v.gate_id).maybeSingle();
    if (!gate || gate.status !== "active" || !gate.location_id) return reply(422, { error: "Selected gate is not available." });
    const { data: loc } = await admin.from("locations").select("id, status").eq("id", gate.location_id).maybeSingle();
    if (!loc || loc.status !== "active") return reply(422, { error: "This location is not accepting visitors." });
    locationId = gate.location_id;
    if (v.department_id) {
      const { data: d } = await admin.from("departments").select("location_id").eq("id", v.department_id).maybeSingle();
      if (!d || (d.location_id && d.location_id !== locationId)) return reply(422, { error: "Department does not belong to this location." });
    }
    if (v.host_id) {
      const { data: h } = await admin.from("employees").select("location_id, department_id, is_host").eq("id", v.host_id).maybeSingle();
      if (!h || !h.is_host || (h.location_id && h.location_id !== locationId) || (v.department_id && h.department_id && h.department_id !== v.department_id)) {
        return reply(422, { error: "Selected host is not valid for this location." });
      }
    }
    visitorId = ""; // set after insert
  }

  // ---- Notice: must be active and for this location (or global) ----
  const { data: notice } = await admin.from("dpdp_privacy_notices")
    .select("id, location_id, language, version, title, body, acknowledgement_1_text, acknowledgement_2_text, acknowledgement_3_text, acknowledgement_4_text, privacy_policy_url, terms_of_service_url, is_active")
    .eq("id", body.notice_id).maybeSingle();
  const requiredNoticeCopy = notice ? [
    notice.acknowledgement_1_text, notice.acknowledgement_2_text,
    notice.acknowledgement_3_text, notice.acknowledgement_4_text,
  ] : [];
  if (!notice || !notice.is_active || (notice.location_id && notice.location_id !== locationId)
      || requiredNoticeCopy.length !== 4 || requiredNoticeCopy.some((text) => !text?.trim())
      || notice.privacy_policy_url !== "https://re.one/privacy-policy/"
      || notice.terms_of_service_url !== "https://re.one/terms-of-service/") {
    return reply(422, { error: "The privacy notice has changed or is incomplete. Please reload and review it again." });
  }

  // ---- Create visitor (self-service only) ----
  if (body.mode === "self_service") {
    const v = body.visitor;
    const { data, error } = await admin.from("visitors").insert({
      name: v.name, phone: v.phone, email: v.email.toLowerCase(),
      company: v.company || null, purpose: v.purpose || null,
      department_id: v.department_id || null, host_id: v.host_id || null, gate_id: v.gate_id,
      vehicle_type: v.vehicle_type,
      vehicle_number: v.vehicle_type !== "by_walk" ? v.vehicle_number || null : null,
      has_laptop: v.has_laptop,
      laptop_brand: v.has_laptop ? v.laptop_brand || null : null,
      laptop_serial: v.has_laptop ? v.laptop_serial || null : null,
      accompanying_count: v.accompanying_count,
      photo_url: v.photo_url || null,
      status: "pending_approval",
    }).select("id, visitor_id").single();
    if (error || !data) { console.error("visitor insert", error?.message); return reply(500, { error: "Could not register the visit. Please try again." }); }
    createdVisitor = data;
    visitorId = data.id;
  }

  const storagePath = `${visitorId}/privacy-notice-${crypto.randomUUID()}.png`;
  const acknowledgementAt = new Date().toISOString();
  let uploaded = false;
  try {
    const { error: upErr } = await admin.storage.from("visitor-signatures")
      .upload(storagePath, sig.bytes, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error("upload: " + upErr.message);
    uploaded = true;

    const ua = req.headers.get("user-agent");
    const { error: agErr } = await admin.from("visitor_agreements").insert({
      visitor_id: visitorId,
      agreement_type: "privacy_notice",
      agreement_text: [
        notice.title,
        notice.body,
        ...requiredNoticeCopy,
        notice.privacy_policy_url,
        notice.terms_of_service_url,
      ].join("\n\n"),
      notice_id: notice.id,
      notice_version: notice.version,
      notice_language: notice.language,
      acknowledged: true,
      acknowledgement_1: body.acknowledgements[0],
      acknowledgement_1_at: acknowledgementAt,
      acknowledgement_2: body.acknowledgements[1],
      acknowledgement_2_at: acknowledgementAt,
      acknowledgement_3: body.acknowledgements[2],
      acknowledgement_3_at: acknowledgementAt,
      acknowledgement_4: body.acknowledgements[3],
      acknowledgement_4_at: acknowledgementAt,
      storage_path: storagePath,
      signature_hash: signatureHash,
      hash_algorithm: "SHA-256",
      signature_width: sig.width,
      signature_height: sig.height,
      user_agent: ua ? ua.slice(0, 300) : null,
      captured_by_user_id: staffUserId,
      capture_channel: body.mode === "staff" ? "staff_desk" : "self_service",
      signed_at: new Date().toISOString(),
    });
    if (agErr) throw new Error("agreement: " + agErr.message);
  } catch (e) {
    console.error("signature capture failed, cleaning up:", (e as Error).message);
    if (uploaded) {
      const { error } = await admin.storage.from("visitor-signatures").remove([storagePath]);
      if (error) console.error("CLEANUP FAILED (orphan file):", storagePath, error.message);
    }
    if (createdVisitor) {
      const { error } = await admin.from("visitors").delete().eq("id", createdVisitor.id);
      if (error) console.error("CLEANUP FAILED (orphan visitor):", createdVisitor.id, error.message);
    }
    return reply(500, { error: "Could not save the signature. Please try again." });
  }

  if (createdVisitor && body.mode === "self_service" && body.visitor.host_id) {
    admin.functions.invoke("notify-host", { body: { visitorId: createdVisitor.id } })
      .catch((e) => console.error("notify-host", e));
  }

  return reply(200, {
    success: true,
    id: visitorId,
    visitor_id: createdVisitor?.visitor_id ?? null,
    notice_version: notice.version,
    signature_hash: signatureHash,
  });
});
