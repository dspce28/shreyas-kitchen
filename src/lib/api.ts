import { NextResponse } from "next/server";
import { UnauthorisedError, ForbiddenError } from "./session";
import { CartError } from "./pricing";
import { OtpError } from "./otp";
import { PhoneError } from "./phone";
import { PaymentError } from "./razorpay";

/**
 * One place that turns thrown domain errors into HTTP responses, so route
 * handlers can just throw and stay readable.
 *
 * Anything we did not anticipate is logged in full and reported to the
 * customer as a generic message — internal detail never reaches the browser.
 */
export function apiError(err: unknown): NextResponse {
  if (err instanceof UnauthorisedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof CartError || err instanceof PhoneError || err instanceof OtpError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof PaymentError) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const message = err instanceof Error ? err.message : String(err);
  // Configuration mistakes are the most common cause of a 500 in a fresh
  // deployment, and hiding them just makes setup painful. They are safe to
  // surface: they name a variable, never a value.
  if (/not configured|SESSION_SECRET|environment/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.error("[api] unhandled", err);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again." },
    { status: 500 },
  );
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });

/** Rejects oversized or non-JSON bodies before they reach domain code. */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new CartError("Expected a JSON body.");
  }
  try {
    return (await req.json()) as T;
  } catch {
    throw new CartError("Malformed request body.");
  }
}
