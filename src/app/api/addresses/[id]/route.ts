import { apiError, ok, readJson } from "@/lib/api";
import { requireSession, ForbiddenError } from "@/lib/session";
import { db } from "@/lib/supabase";
import { CartError } from "@/lib/pricing";
import { ADDRESS_SELECT, addressSchema, assertDeliverable, clearDefault } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function assertOwned(customerId: string, id: string) {
  const { data } = await db()
    .from("addresses")
    .select("id")
    .eq("id", id)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new ForbiddenError("That address does not exist.");
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await assertOwned(session.customerId, id);

    const parsed = addressSchema.partial().safeParse(await readJson(req));
    if (!parsed.success) {
      throw new CartError(parsed.error.issues[0]?.message ?? "Check the address fields.");
    }
    const body = parsed.data;
    if (body.pincode) assertDeliverable(body.pincode);

    if (body.is_default) await clearDefault(session.customerId);

    const { data, error } = await db()
      .from("addresses")
      .update(body)
      .eq("id", id)
      .select(ADDRESS_SELECT)
      .single();
    if (error) throw error;

    return ok({ address: data });
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Soft delete. Past orders reference the address row for their snapshot's
 * provenance, so the row must survive even after the customer removes it.
 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await assertOwned(session.customerId, id);

    const supabase = db();
    const { data: removed } = await supabase
      .from("addresses")
      .update({ deleted_at: new Date().toISOString(), is_default: false })
      .eq("id", id)
      .select("is_default")
      .maybeSingle();

    // Never leave a customer with addresses but no default.
    const { data: remaining } = await supabase
      .from("addresses")
      .select("id, is_default")
      .eq("customer_id", session.customerId)
      .is("deleted_at", null)
      .order("created_at");

    if ((remaining?.length ?? 0) > 0 && !remaining!.some((a) => a.is_default)) {
      await supabase.from("addresses").update({ is_default: true }).eq("id", remaining![0].id);
    }
    void removed;

    return ok({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
