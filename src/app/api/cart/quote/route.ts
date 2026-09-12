import { apiError, ok, readJson } from "@/lib/api";
import { priceCart, type CartLineInput } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-prices a cart without placing an order, so the cart and checkout pages
 * show the same numbers the server will actually charge — including the
 * delivery fee and any item that went out of stock since it was added.
 */
export async function POST(req: Request) {
  try {
    const { lines } = await readJson<{ lines?: CartLineInput[] }>(req);
    const quote = await priceCart(lines ?? []);
    return ok(quote);
  } catch (err) {
    return apiError(err);
  }
}
