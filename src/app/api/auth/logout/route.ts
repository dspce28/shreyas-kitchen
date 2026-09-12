import { apiError, ok } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroySession();
    return ok({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
