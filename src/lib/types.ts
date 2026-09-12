export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "rejected"
  | "cancelled";

export type PaymentMethod = "razorpay" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface ApiCategory {
  id: string;
  slug: string;
  name: string;
  blurb: string | null;
  window_label: string | null;
  available_from: number | null;
  available_to: number | null;
  sort_order: number;
  items: ApiMenuItem[];
}

export interface ApiMenuItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  note: string | null;
  options: string[];
  price_paise: number;
  is_favourite: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface ApiComboSlot {
  kind: "fixed" | "choose";
  item?: string;
  label?: string;
  fromCategory?: string;
  fromItems?: string[];
}

export interface ApiCombo {
  id: string;
  slug: string;
  code: string;
  name: string;
  price_paise: number;
  window_label: string | null;
  available_from: number | null;
  available_to: number | null;
  slots: ApiComboSlot[];
  is_available: boolean;
  sort_order: number;
}

export interface Address {
  id: string;
  label: string;
  contact_name: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
  is_default: boolean;
}

export interface OrderLine {
  id: string;
  kind: "item" | "combo";
  ref_slug: string;
  name_snapshot: string;
  detail: string | null;
  unit_paise: number;
  qty: number;
  line_paise: number;
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  actor: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_no: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  ship_name: string | null;
  ship_phone: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_landmark: string | null;
  ship_city: string;
  ship_pincode: string;
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  customer_note: string | null;
  reject_reason: string | null;
  razorpay_order_id: string | null;
  placed_at: string;
  decided_at: string | null;
  completed_at: string | null;
  order_items?: OrderLine[];
  order_events?: OrderEvent[];
}

export interface StoreSettings {
  is_accepting_orders: boolean;
  closed_message: string | null;
  delivery_fee_paise: number;
  free_delivery_above_paise: number;
}

/** Statuses after which nothing more will happen. */
export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "rejected", "cancelled"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting confirmation",
  accepted: "Order accepted",
  preparing: "In the kitchen",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_BLURB: Record<OrderStatus, string> = {
  pending: "Shreya's Kitchen is reviewing your order.",
  accepted: "Your order is confirmed and queued.",
  preparing: "Being cooked fresh right now.",
  ready: "Packed and waiting to leave.",
  out_for_delivery: "On the way to you.",
  delivered: "Delivered. Thank you for ordering.",
  rejected: "This order could not be accepted.",
  cancelled: "This order was cancelled.",
};

/** The happy path, in order, for the tracking timeline. */
export const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

/** Which statuses an admin may move an order to from where it is now. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  rejected: [],
  cancelled: [],
};
