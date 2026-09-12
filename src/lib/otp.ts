import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./supabase";
import { toWhatsAppId } from "./phone";

/**
 * Login is a 6-digit one-time code delivered over WhatsApp.
 *
 * `OTP_PROVIDER=dev` short-circuits delivery and hands the code back to the
 * caller so the whole flow is testable before Meta approves your WhatsApp
 * sender. Switching to `whatsapp` changes nothing else in the app.
 *
 * Codes are stored as a salted SHA-256 hash, never in plaintext.
 */

const TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;
/** Per number, per hour — blunt but effective against SMS-pumping. */
const MAX_SENDS_PER_HOUR = 6;

export class OtpError extends Error {}

function hashCode(phone: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${phone}:${code}:${secret}`).digest("hex");
}

export interface RequestOtpResult {
  /** Only populated in dev mode — the UI shows it so you can sign in. */
  devCode?: string;
  expiresInSeconds: number;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const supabase = db();
  const nowIso = new Date().toISOString();

  // Cooldown + hourly cap
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await supabase
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false });

  if (recent && recent.length) {
    const lastAt = new Date(recent[0].created_at as string).getTime();
    const since = (Date.now() - lastAt) / 1000;
    if (since < RESEND_COOLDOWN_SECONDS) {
      throw new OtpError(
        `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - since)}s before requesting another code.`,
      );
    }
    if (recent.length >= MAX_SENDS_PER_HOUR) {
      throw new OtpError("Too many codes requested. Please try again in an hour.");
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  // Invalidate any outstanding codes for this number.
  await supabase
    .from("otp_codes")
    .update({ consumed_at: nowIso })
    .eq("phone", phone)
    .is("consumed_at", null);

  const { error } = await supabase.from("otp_codes").insert({
    phone,
    code_hash: hashCode(phone, code),
    expires_at: expiresAt,
  });
  if (error) throw error;

  const provider = (process.env.OTP_PROVIDER ?? "dev").toLowerCase();
  if (provider === "whatsapp") {
    await sendWhatsAppOtp(phone, code);
    return { expiresInSeconds: TTL_SECONDS };
  }

  // dev: never send, always reveal.
  console.info(`[otp] ${phone} → ${code} (dev mode, not delivered)`);
  return { devCode: code, expiresInSeconds: TTL_SECONDS };
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const supabase = db();

  const { data: row } = await supabase
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw new OtpError("No active code. Request a new one.");

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    throw new OtpError("That code has expired. Request a new one.");
  }
  if ((row.attempts as number) >= MAX_ATTEMPTS) {
    await supabase
      .from("otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    throw new OtpError("Too many incorrect attempts. Request a new code.");
  }

  const expected = Buffer.from(row.code_hash as string, "hex");
  const actual = Buffer.from(hashCode(phone, code.trim()), "hex");
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!ok) {
    await supabase
      .from("otp_codes")
      .update({ attempts: (row.attempts as number) + 1 })
      .eq("id", row.id);
    const left = MAX_ATTEMPTS - (row.attempts as number) - 1;
    throw new OtpError(
      left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code.",
    );
  }

  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
}

// ── WhatsApp Cloud API ──────────────────────────────────────────────────

/**
 * Sends an authentication-category template message.
 *
 * Meta requires OTPs to go through a pre-approved template in the
 * AUTHENTICATION category — a plain text message will be rejected. The
 * template must have exactly one body variable (the code) and, if you used
 * the copy-code button variant, one button variable with the same value.
 */
async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const template = process.env.WHATSAPP_OTP_TEMPLATE ?? "shreyas_kitchen_otp";
  const lang = process.env.WHATSAPP_OTP_TEMPLATE_LANG ?? "en";

  if (!phoneNumberId || !token) {
    throw new OtpError(
      "WhatsApp is selected as the OTP provider but WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN are not set.",
    );
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toWhatsAppId(phone),
      type: "template",
      template: {
        name: template,
        language: { code: lang },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[otp] WhatsApp send failed", res.status, body);
    throw new OtpError("Could not send the code over WhatsApp. Please try again.");
  }
}
