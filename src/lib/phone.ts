/**
 * Phone handling. The store is in Ahmedabad, so bare 10-digit Indian numbers
 * are the overwhelming default — but we always STORE E.164 so the WhatsApp
 * and Razorpay APIs get what they expect.
 */

export class PhoneError extends Error {}

/** Accepts "9601050241", "09601050241", "+91 96010 50241", "919601050241". */
export function normalisePhone(raw: string): string {
  const digits = (raw ?? "").replace(/[^\d+]/g, "");
  if (!digits) throw new PhoneError("Enter a mobile number.");

  let d = digits.startsWith("+") ? digits.slice(1) : digits;

  // Strip a leading trunk zero: 09601050241 → 9601050241
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);

  if (d.length === 10) d = "91" + d;

  if (!/^91[6-9]\d{9}$/.test(d)) {
    // Allow other countries through if they already look like valid E.164,
    // so the app is not hard-locked to India.
    if (/^[1-9]\d{7,14}$/.test(d) && !d.startsWith("91")) return "+" + d;
    throw new PhoneError("That doesn't look like a valid mobile number.");
  }
  return "+" + d;
}

export function isValidPhone(raw: string): boolean {
  try {
    normalisePhone(raw);
    return true;
  } catch {
    return false;
  }
}

/** +919601050241 → "96010 50241" for display. */
export function prettyPhone(e164: string): string {
  if (e164.startsWith("+91") && e164.length === 13) {
    const n = e164.slice(3);
    return `${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return e164;
}

/** WhatsApp Cloud API wants the number without the leading "+". */
export const toWhatsAppId = (e164: string) => e164.replace(/^\+/, "");
