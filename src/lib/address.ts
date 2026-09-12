import { z } from "zod";
import { db } from "./supabase";
import { CartError } from "./pricing";

export const ADDRESS_SELECT =
  "id, label, contact_name, line1, line2, landmark, city, pincode, is_default";

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(24).default("Home"),
  contact_name: z.string().trim().max(80).optional().nullable(),
  line1: z.string().trim().min(4, "Flat / building is required.").max(160),
  line2: z.string().trim().max(160).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2).max(60).default("Ahmedabad"),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits."),
  is_default: z.boolean().optional().default(false),
});

/** Empty DELIVERY_PINCODES means "deliver anywhere". */
export function assertDeliverable(pincode: string) {
  const allowed = (process.env.DELIVERY_PINCODES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(pincode)) {
    throw new CartError(
      `We don't deliver to ${pincode} yet. We currently cover ${allowed.join(", ")}.`,
    );
  }
}

export async function clearDefault(customerId: string) {
  await db()
    .from("addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId)
    .eq("is_default", true);
}
