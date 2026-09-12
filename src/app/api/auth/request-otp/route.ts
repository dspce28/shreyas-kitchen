import { apiError, ok, readJson } from "@/lib/api";
import { normalisePhone } from "@/lib/phone";
import { requestOtp } from "@/lib/otp";
import { isAdminPhone } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { phone } = await readJson<{ phone?: string }>(req);
    const e164 = normalisePhone(phone ?? "");
    const result = await requestOtp(e164);

    return ok({
      phone: e164,
      isAdmin: isAdminPhone(e164),
      expiresInSeconds: result.expiresInSeconds,
      // Present only when OTP_PROVIDER=dev. The login screen shows it so the
      // flow is usable before the WhatsApp sender is approved.
      devCode: result.devCode,
      delivery: result.devCode ? "dev" : "whatsapp",
    });
  } catch (err) {
    return apiError(err);
  }
}
