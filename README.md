# Shreya's Kitchen

A premium ordering web app for Shreya's Kitchen — Fortune Business Hub, Ahmedabad.

Customers browse the menu, order, pay by UPI/card or cash, and watch the order
move through the kitchen in real time. The kitchen accepts or rejects each
order from a console on their phone.

**Stack** — Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres) · React Three Fiber / three.js · Framer Motion ·
Razorpay · WhatsApp Cloud API

---

## Read this first: prices are placeholders

The printed menu you supplied carries **no prices** — it says "ask at the
counter". Ordering online needs a number for every dish, so all 49 items and
6 combos were seeded with **plausible placeholder prices**, not quotes.

Set the real ones in **Admin → Menu & prices**. A price you save there is
flagged `price_locked` and will never be overwritten by a later re-seed.

Everything else — names, descriptions, categories, serving windows, "House
Favourite" tags, combo contents — is transcribed verbatim from your PDF.

---

## Quick start

```bash
npm install
```

Then work through the four setup steps below. Until Supabase is connected the
site runs in **preview mode**: the full menu is browsable and the design is
complete, but ordering is switched off.

```bash
npm run dev
```

→ http://localhost:3000

---

## 1. Supabase (required)

The database, and the only piece the app cannot run without.

1. Create a free project at [supabase.com](https://supabase.com). Pick the
   **Mumbai (ap-south-1)** region — it is closest to Ahmedabad.
2. Open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql),
   and run it. It is idempotent, so running it twice is harmless.
3. Go to **Project Settings → API** and copy:
   - the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - the **`service_role`** key → `SUPABASE_SERVICE_ROLE_KEY`

```bash
cp .env.example .env.local   # then fill in the two values above
npm run seed                 # loads the menu from src/data/menu.ts
```

> **The `service_role` key must never be exposed to the browser.** It is read
> only in server code and deliberately has no `NEXT_PUBLIC_` prefix. Every
> table has RLS enabled with no policies, so even if the public key leaked it
> could read nothing.

### Session secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the result in `SESSION_SECRET`. It signs the login cookie and salts the
OTP hashes — changing it logs everyone out and invalidates pending codes.

---

## 2. Login — WhatsApp OTP

Login is a mobile number plus a 6-digit code. No passwords, no email.

### Right now: dev mode

`OTP_PROVIDER=dev` (the default) skips delivery and shows the code on screen.
The entire flow — sign in, save an address, order, track — is testable today.

### Going live on WhatsApp

Meta requires business verification and a pre-approved template, so start
this early; approval takes days, not minutes.

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
   and add the **WhatsApp** product.
2. Complete **Business Verification** and register the sender number.
   ⚠️ Use a number that is **not** already on the WhatsApp consumer app.
3. Create a message template:
   - **Category:** Authentication (a plain text message will be rejected)
   - **Body:** one variable — the code
   - **Button:** "Copy code" (optional but much better UX)
   - Note its name → `WHATSAPP_OTP_TEMPLATE`
4. From **WhatsApp → API Setup**, copy the Phone Number ID and a permanent
   System User access token.
5. Set `OTP_PROVIDER=whatsapp` and restart.

The provider is swapped behind one function, so nothing else changes. If you
would rather use SMS, `sendWhatsAppOtp` in [`src/lib/otp.ts`](src/lib/otp.ts)
is the only place to touch.

### Admin access

```
ADMIN_PHONES=+919601050241
```

Comma-separated, E.164 format. Anyone on this list signs in with the same OTP
flow and gets the kitchen console at `/admin`. Removing a number revokes
access on the next request, not at cookie expiry.

---

## 3. Payments — Razorpay

Cash on delivery works with no setup at all. For online payment:

1. Sign up at [razorpay.com](https://razorpay.com) and complete KYC.
2. **Account & Settings → API Keys** → generate. Use the `rzp_test_*` pair
   while building.
   - Key ID → `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public, safe in the browser)
   - Key Secret → `RAZORPAY_KEY_SECRET` (server only)
3. **Settings → Webhooks → Add New Webhook**
   - URL: `https://your-domain/api/payments/webhook`
   - Events: `payment.captured`, `payment.failed`
   - Secret → `RAZORPAY_WEBHOOK_SECRET`

The webhook is what makes payment reliable. The browser hands back a signed
result after checkout, but a customer who closes the tab mid-redirect never
sends it — the webhook arrives regardless. Both paths verify an HMAC
signature and are idempotent, so whichever lands first wins.

Until `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set, the "Pay online" option is
visibly disabled and only cash on delivery is offered.

---

## 4. Delivery area

```
DELIVERY_FEE_RUPEES=30
FREE_DELIVERY_ABOVE_RUPEES=399
DELIVERY_PINCODES=380015,380051,380054,380059,380060
```

`DELIVERY_PINCODES` is a hard gate — an address outside it is rejected at
checkout. **Leave it empty to accept every pincode.** The two fee values here
are only bootstrap defaults; once seeded, the live figures are edited in
**Admin → Menu & prices**.

---

## How ordering works

```
Customer                          Kitchen
────────                          ───────
browse /menu
add to cart            (browser only — no prices stored)
checkout
  ├── server re-prices every line from the database
  ├── validates serving windows and stock
  ├── snapshots the delivery address onto the order
  └── creates the order as `pending`
                              →   new order chimes in /admin
                                  accept  →  accepted
                                  reject  →  rejected + reason
track /orders/SK-000001
  polls every 6s, shows a live timeline
                                  preparing → ready
                                  → out for delivery → delivered
```

### Order states

`pending → accepted → preparing → ready → out_for_delivery → delivered`

with `rejected` and `cancelled` as exits. Transitions are enforced
server-side in [`transitionOrder`](src/lib/orders.ts) using a compare-and-set
on the current status, so two people tapping "Accept" at once cannot both
apply it, and a stale tab cannot resurrect a finished order.

A customer can cancel only while an order is still `pending`. After that it
is a phone call — food is already being cooked.

### Why the cart holds no prices

The browser sends slugs, quantities and choices. Every price, name and
availability check is resolved server-side in
[`priceCart`](src/lib/pricing.ts), and the name and price are snapshotted onto
the order row. A tampered client can change *what* it asks for, never *what
it pays*, and editing a menu price tomorrow does not rewrite yesterday's
receipts.

Money is stored in **paise as integers** throughout. No floats, anywhere.

---

## The 3D hero

A procedural porcelain cup — `LatheGeometry` revolved from a hand-tuned
profile, a brass rim, GPU-driven steam and drifting dust motes. There is no
model file to download and no HDRI fetch; the studio lighting is built from
drei `Lightformer`s in-scene.

Performance guards, because a hero that janks is worse than no hero:

- device pixel ratio capped at 1.6, dropping to 1 if the frame rate sags
- one shadow-casting light at 1024², contact shadows for the rest
- rendering **stops** when the hero scrolls out of view or the tab is hidden
- `prefers-reduced-motion` freezes all idle motion
- the canvas is a lazy client-only chunk with a CSS fallback, so no WebGL —
  or a slow first paint — still shows a finished-looking hero

---

## Project layout

```
src/
  app/
    page.tsx                 landing — static, always renders
    menu/  combos/           browse and add to cart
    checkout/                address, payment, place order
    orders/  orders/[orderNo]  history and live tracking
    account/                 profile and saved addresses
    admin/                   kitchen console (order queue, price editor)
    api/                     all server routes
  components/
    three/                   the WebGL hero
    menu/ orders/ admin/     feature UI
    ui/                      Button, Sheet, Field, Toaster, Reveal
  lib/
    pricing.ts               server-side cart pricing — the money path
    orders.ts                order state machine
    session.ts               signed-cookie sessions, admin gate
    otp.ts                   OTP issue/verify + WhatsApp delivery
    razorpay.ts              order creation, signature verification
  data/menu.ts               the menu, transcribed from the PDF
supabase/schema.sql          database schema
scripts/seed.mjs             loads data/menu.ts into Supabase
```

---

## Deploying to Vercel

```bash
npm i -g vercel && vercel
```

Add every variable from `.env.example` in **Project → Settings → Environment
Variables**, then point the Razorpay webhook at your production URL.

One caveat: order tracking **polls** rather than using Supabase Realtime.
The app authenticates with its own signed cookie, not a Supabase JWT, so a
browser-side subscription would need the anon key plus RLS policies this
design deliberately does not have. A 6-second poll on one small row is cheap,
and it pauses when the tab is hidden.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Load the menu into Supabase (keeps admin-edited prices) |
| `npm run seed -- --force-prices` | Reset **all** prices to the placeholders |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Known limitations

- **Prices are placeholders.** Nothing in the PDF said otherwise. Fix them in
  the admin panel before taking a real order.
- **WhatsApp OTP needs Meta approval.** Dev mode covers the gap; the code
  path for live delivery is written and waiting on credentials.
- **No dish photography.** The menu is typographic by design, which suits the
  printed brand — but photos would lift it further if you have them.
- **Tracking polls, it does not push.** See the deploy note above.
- **Delivery is flat-fee by pincode**, not distance-based.
