import { apiError, ok, readJson } from "@/lib/api";
import { normalisePhone } from "@/lib/phone";
import { verifyOtp } from "@/lib/otp";
import {
  createAdminSession,
  createSession,
  isAdminPhone,
  upsertCustomer,
} from "@/lib/session";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { phone, code, name } = await readJson<{
      phone?: string;
      code?: string;
      name?: string;
    }>(req);

    const e164 = normalisePhone(phone ?? "");
    await verifyOtp(e164, String(code ?? ""));

    // An admin phone gets BOTH sessions: they are also a customer, and it
    // means the admin never has to log in twice to check a real order.
    const customerId = await upsertCustomer(e164);
    await createSession(customerId, e164);

    const admin = isAdminPhone(e164);
    if (admin) await createAdminSession(e164);

    // First-time sign-ups can send a name along with the code.
    const trimmed = (name ?? "").trim();
    if (trimmed) {
      await db().from("customers").update({ name: trimmed.slice(0, 80) }).eq("id", customerId);
    }

    const { data: customer } = await db()
      .from("customers")
      .select("id, phone, name")
      .eq("id", customerId)
      .single();

    return ok({ customer, isAdmin: admin });
  } catch (err) {
    return apiError(err);
  }
}
