# Stripe Integration — Explained Simply

## What Does Stripe Do Here?

Stripe handles **one-time payments** for upgrading user plans:

| Plan | Price | What You Get |
|---|---|---|
| **Free** | $0 | Basic access: 3 PDFs, 3 code files, limited AI |
| **Pro** | $9.99 | 200 PDFs, 200 code files, full AI features, no limits |
| **Institution** | $49.99 | Everything in Pro + create/manage an institution |

> Note: These are **one-time payments**, not subscriptions.

---

## How Payment Works (Step by Step)

### 1. User clicks "Upgrade"

- **Front-end**: `PlanSection.jsx` or `PlansSection.jsx` → calls `createCheckoutSession(plan)`
- **API call**: `POST /api/stripe/create-checkout-session` with `{ plan: "pro" }` or `{ plan: "institution" }`

### 2. Server creates a Stripe Checkout Session

**File**: `Server/src/routes/stripeRoutes.js`
- Reads price from `Server/src/uploads/plan-pricing.json` (e.g. `pro: 999` = $9.99)
- Creates a Stripe Checkout Session with:
  - `mode: "payment"` (one-time)
  - `line_items` with the plan price and quantity `1`
  - `metadata` containing `userId` and `plan` name
- Returns `{ url }` → the Stripe-hosted checkout page

### 3. User is redirected to Stripe

- Stripe handles the credit card form, payment processing, etc.
- On success, Stripe redirects back to the app with: `?stripe_session=cs_live_xxx`
- On cancel, redirects with: `?stripe_cancelled=true`

### 4. App verifies the payment

**Front-end**: `PlanSection.jsx` detects the `stripe_session` param in the URL
- Calls `verifyStripeSession(sessionId)` → `GET /api/stripe/verify/:sessionId`

**Back-end** (`stripeRoutes.js`):
- Retrieves the Stripe Session using `stripe.checkout.sessions.retrieve(sessionId)`
- Checks `payment_status === "paid"`
- Reads `metadata.userId` and `metadata.plan`
- Updates the user in the database: `user.plan = plan`
- Returns success with the new plan

### 5. UI updates

- `PlanSection.jsx` updates the user cookie/context with the new plan
- If plan was "institution", redirects to `/onboarding/institution` to set up the institution profile
- The page re-renders and shows Pro/Institution features unlocked

---

## Server-Side Files

| File | Purpose |
|---|---|
| `Server/src/routes/stripeRoutes.js` | All Stripe endpoints (`/api/stripe/*`) |
| `Server/src/uploads/plan-pricing.json` | Stores prices in cents: `{ pro: 999, institution: 4999 }` |
| `Server/package.json` | Dependencies: `stripe: "^22.1.0"` |

### API Endpoints

| Method | Path | What It Does |
|---|---|---|
| `POST` | `/api/stripe/create-checkout-session` | Creates a Stripe checkout URL to redirect the user to |
| `GET` | `/api/stripe/verify/:sessionId` | Verifies payment was completed, upgrades the user's plan |

### Pricing Endpoint (separate route)

| Method | Path | What It Does |
|---|---|---|
| `GET` | `/api/plan/pricing` | Returns current pricing (used by the plans page) |
| `PUT` | `/api/plan/pricing` | Super admin can update the prices |

---

## Client-Side Files

| File | Purpose |
|---|---|
| `Client/src/components/PlanSection.jsx` | Main plan comparison UI + triggers Stripe checkout + handles redirect verification |
| `Client/src/Home/components/PlansSection.jsx` | Public landing page plans section (marketing) |
| `Client/src/components/Profile.jsx` | Profile page — checks for `stripe_session` param to auto-select the Plan tab |
| `Client/src/Admin/planApi.js` | API helper functions: `createCheckoutSession()`, `verifyStripeSession()` |

---

## Environment Variables

From `Server/.env.example`:
```
STRIPE_SECRET_KEY=sk_test_...
CLIENT_URL=http://localhost:5173
```

`CLIENT_URL` is used as the `success_url` and `cancel_url` when creating the Stripe session, so Stripe knows where to redirect after payment.

---

## Key Code Snippets

### Creating a checkout session (server):
```js
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{ price_data: { currency: "usd", product_data: { name: "Pro Plan" }, unit_amount: 999 }, quantity: 1 }],
  metadata: { userId: req.user.id, plan: "pro" },
  success_url: `${CLIENT_URL}?stripe_session={CHECKOUT_SESSION_ID}`,
  cancel_url: `${CLIENT_URL}?stripe_cancelled=true`,
});
```

### Verifying payment (server):
```js
const session = await stripe.checkout.sessions.retrieve(sessionId);
if (session.payment_status === "paid") {
  await User.update({ plan: session.metadata.plan }, { where: { id: session.metadata.userId } });
}
```

### Triggering from the client:
```js
const { url } = await createCheckoutSession("pro");
window.location.href = url; // redirect to Stripe
```

---

## Testing

Use **Stripe test mode** (default with `sk_test_...` key). Test card numbers:
- `4242 4242 4242 4242` — success
- `4000 0000 0000 0002` — decline
- Any future expiry date, any CVC
