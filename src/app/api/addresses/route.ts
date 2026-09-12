import { apiError, ok, readJson } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { CartError } from "@/lib/pricing";
import { ADDRESS_SELECT, addressSchema, assertDeliverable, clearDefault } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    const { data, error } = await db()
      .from("addresses")
      .select(ADDRESS_SELECT)
      .eq("customer_id", session.customerId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ok({ addresses: data ?? [] });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const parsed = addressSchema.safeParse(await readJson(req));
    if (!parsed.success) {
      throw new CartError(parsed.error.issues[0]?.message ?? "Check the address fields.");
    }
    const body = parsed.data;
    assertDeliverable(body.pincode);

    const supabase = db();
    const { count } = await supabase
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", session.customerId)
      .is("deleted_at", null);

    // The first address a customer saves is their default, whatever they ticked.
    const makeDefault = body.is_default || (count ?? 0) === 0;
    if (makeDefault) await clearDefault(session.customerId);

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...body, customer_id: session.customerId, is_default: makeDefault })
      .select(ADDRESS_SELECT)
      .single();
    if (error) throw error;

    return ok({ address: data }, 201);
  } catch (err) {
    return apiError(err);
  }
}
