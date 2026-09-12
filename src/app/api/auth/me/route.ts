import { apiError, ok, readJson } from "@/lib/api";
import { getAdminSession, getSession, requireSession } from "@/lib/session";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return ok({ customer: null, isAdmin: false });

    const { data } = await db()
      .from("customers")
      .select("id, phone, name")
      .eq("id", session.customerId)
      .maybeSingle();

    const admin = await getAdminSession();
    return ok({ customer: data ?? null, isAdmin: Boolean(admin) });
  } catch (err) {
    return apiError(err);
  }
}

/** Update the signed-in customer's display name. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const { name } = await readJson<{ name?: string }>(req);
    const trimmed = (name ?? "").trim().slice(0, 80);

    const { data, error } = await db()
      .from("customers")
      .update({ name: trimmed || null })
      .eq("id", session.customerId)
      .select("id, phone, name")
      .single();
    if (error) throw error;

    return ok({ customer: data });
  } catch (err) {
    return apiError(err);
  }
}
