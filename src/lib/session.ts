import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./supabase";

/**
 * Sessions are a signed, httpOnly cookie. We do not use Supabase Auth: the
 * login factor is a WhatsApp OTP we send ourselves, so we own the whole
 * handshake and Supabase is used purely as the database.
 */

const COOKIE = "sk_session";
const ADMIN_COOKIE = "sk_admin";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (need ≥32 chars). Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return new TextEncoder().encode(s);
}

export interface Session {
  customerId: string;
  phone: string;
}

export interface AdminSession {
  phone: string;
}

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

// ── Customer session ────────────────────────────────────────────────────

export async function createSession(customerId: string, phone: string) {
  const jwt = await sign({ customerId, phone });
  (await cookies()).set(COOKIE, jwt, cookieOpts);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.customerId || !payload.phone) return null;
    return { customerId: String(payload.customerId), phone: String(payload.phone) };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
  c.delete(ADMIN_COOKIE);
}

/** Throws a 401-shaped error for route handlers that require a customer. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new UnauthorisedError("Please sign in to continue.");
  return s;
}

// ── Admin session ───────────────────────────────────────────────────────

export function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export const isAdminPhone = (phone: string) => adminPhones().includes(phone);

export async function createAdminSession(phone: string) {
  const jwt = await sign({ phone, admin: true });
  (await cookies()).set(ADMIN_COOKIE, jwt, cookieOpts);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.admin || !payload.phone) return null;
    // Re-check against the env list on every request, so removing a phone
    // from ADMIN_PHONES revokes access immediately rather than at expiry.
    const phone = String(payload.phone);
    if (!isAdminPhone(phone)) return null;
    return { phone };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const a = await getAdminSession();
  if (!a) throw new UnauthorisedError("Admin sign-in required.");
  return a;
}

// ── Customer record ─────────────────────────────────────────────────────

export async function upsertCustomer(phone: string): Promise<string> {
  const supabase = db();
  const { data: existing } = await supabase
    .from("customers")
    .select("id, is_blocked")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    if (existing.is_blocked) throw new ForbiddenError("This number has been blocked.");
    await supabase
      .from("customers")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ phone })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ── Error types route handlers translate into status codes ──────────────

export class UnauthorisedError extends Error {}
export class ForbiddenError extends Error {}
