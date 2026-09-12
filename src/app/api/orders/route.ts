import { apiError, ok, readJson } from "@/lib/api";
import { requireSession, ForbiddenError } from "@/lib/session";
import { db } from "@/lib/supabase";
import { CartError, priceCart, type CartLineInput } from "@/lib/pricing";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay";
import { assertDeliverable } from "@/lib/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PlaceOrderBody {
  addressId?: string;
  paymentMethod?: "razorpay" | "cod";
  lines?: CartLineInput[];
  note?: string;
}

export async function GET() {
  try {
    const session = await requireSession();
    const { data, error } = await db()
      .from("orders")
      .select(
        "id, order_no, status, payment_method, payment_status, total_paise, subtotal_paise, " +
          "delivery_fee_paise, placed_at, ship_line1, ship_pincode, " +
          "order_items(id, kind, ref_slug, name_snapshot, detail, unit_paise, qty, line_paise)",
      )
      .eq("customer_id", session.customerId)
      .order("placed_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return ok({ orders: data ?? [] });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await readJson<PlaceOrderBody>(req);

    const paymentMethod = body.paymentMethod === "razorpay" ? "razorpay" : "cod";
    if (paymentMethod === "razorpay" && !isRazorpayConfigured()) {
      throw new CartError("Online payment is not available right now. Please choose cash on delivery.");
    }

    // Price the cart BEFORE touching anything else: it is the check most
    // likely to fail (sold out, outside serving hours) and it is read-only.
    const quote = await priceCart(body.lines ?? []);

    if (!quote.settings.is_accepting_orders) {
      throw new CartError(
        quote.settings.closed_message ?? "We are not taking orders right now.",
      );
    }

    const supabase = db();
    const { data: address } = await supabase
      .from("addresses")
      .select("id, label, contact_name, line1, line2, landmark, city, pincode")
      .eq("id", body.addressId ?? "")
      .eq("customer_id", session.customerId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!address) throw new ForbiddenError("Choose a delivery address.");
    assertDeliverable(address.pincode as string);

    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", session.customerId)
      .maybeSingle();

    // The address is copied, not referenced, so editing it later cannot
    // rewrite where this order was sent.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: session.customerId,
        payment_method: paymentMethod,
        payment_status: "pending",
        status: "pending",
        address_id: address.id,
        ship_name: address.contact_name ?? customer?.name ?? null,
        ship_phone: session.phone,
        ship_line1: address.line1,
        ship_line2: address.line2,
        ship_landmark: address.landmark,
        ship_city: address.city,
        ship_pincode: address.pincode,
        subtotal_paise: quote.subtotal_paise,
        delivery_fee_paise: quote.delivery_fee_paise,
        total_paise: quote.total_paise,
        customer_note: (body.note ?? "").trim().slice(0, 500) || null,
      })
      .select("id, order_no, total_paise, status, payment_method")
      .single();
    if (orderErr) throw orderErr;

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(quote.lines.map((l) => ({ ...l, order_id: order.id })));
    if (itemsErr) {
      // Never leave a headless order behind if the lines fail to write.
      await supabase.from("orders").delete().eq("id", order.id);
      throw itemsErr;
    }

    await supabase.from("order_events").insert({
      order_id: order.id,
      status: "pending",
      actor: "customer",
      note:
        paymentMethod === "cod"
          ? "Order placed — cash on delivery."
          : "Order placed — awaiting payment.",
    });

    if (paymentMethod === "cod") {
      return ok({ order, payment: null }, 201);
    }

    const rzp = await createRazorpayOrder(quote.total_paise, order.order_no as string, {
      order_no: order.order_no as string,
      phone: session.phone,
    });

    await supabase.from("orders").update({ razorpay_order_id: rzp.id }).eq("id", order.id);

    return ok(
      {
        order,
        payment: {
          provider: "razorpay",
          razorpayOrderId: rzp.id,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rzp.amount,
          currency: rzp.currency,
        },
      },
      201,
    );
  } catch (err) {
    return apiError(err);
  }
}
