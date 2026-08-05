# Sredi.ba — Codebase Audit vs. Blueprint

Reconciles `docs/blueprint.md` (Chapter 62 roadmap) and `docs/handoff.md`
(§3.5 Stripe steps) against the **actual repository** and the **live Stripe
account**, per the working principle that the blueprint is a hypothesis until
checked against reality.

Audited: 2026-08-05, against commit `ea7b5bd` on `main`.

---

## 1. What the real codebase actually was

| Blueprint assumption | Reality |
|---|---|
| Next.js + React + **TypeScript** + Tailwind, folder structure `components/ features/ hooks/ lib/ pages/ styles/ types/ utils/` (Ch.3.1) | Next.js 14 App Router, **plain JavaScript, no TypeScript, no Tailwind**. Structure is `app/ components/ lib/` only. The entire customer/helper app is one 3,900-line client component, `app/page.js`. |
| Business logic in Supabase Edge Functions (Ch.5) | No Edge Functions. Server logic is Next.js route handlers under `app/api/`. |
| `payments`, `refunds`, `audit_logs`, `admin_logs`, `notifications`, `reports`, `favorites`, `verification_badges`, `categories`, `support_tickets`, … (Ch.4) | Only `profiles`, `jobs`, `applications`, `reviews` are referenced anywhere in the code. **No payments table existed at all.** |
| Cash Payment flow with 10% commitment fee (Ch.9) | **Did not exist.** No `payment_type` column, no fee, no refunds. Every job was implicitly Secure Payment. |
| Escrow: funds held until completion (Ch.10.2) | **Not implemented.** See §2.4. |
| 8-state payment enum (Ch.10.5) | No payment records at all, so no states. |
| Admin roles: Support Agent / Moderator / Finance Admin / Super Admin (Ch.35.1) | **No admin concept in the code whatsoever** — no admin flag, no admin screens, no moderation queue. |
| Chat, notifications, disputes, support tickets, verification badges | None of these exist in the codebase. |

The gap between blueprint and reality is much larger than "a few CRITICAL fixes."
The blueprint describes a mature marketplace; the repository is an early
single-file marketplace with a partially wired Stripe integration. This audit
therefore only claims to have closed the **payment and payment-security** gap.

---

## 2. Confirmed defects found and fixed

### 2.1 The Stripe secret key was logged in plain text — CRITICAL

`app/api/stripe/checkout/route.js:13` ran

```js
console.log("Stripe key:", JSON.stringify(process.env.STRIPE_SECRET_KEY));
```

on every checkout request. In live mode this writes a full live secret key into
Vercel's runtime logs, readable by anyone with log access.

**Fixed:** removed. Nothing in the payment routes logs secrets any more.

> **Action required by the site owner: roll the Stripe secret key.** It has been
> exposed in logs; removing the line does not un-log what was already written.
> Roll it at dashboard.stripe.com/apikeys, then update `STRIPE_SECRET_KEY` in
> Vercel and redeploy. This is separate from the malformed-key issue in
> handoff §3.3.

### 2.2 The payment endpoints had no authentication — CRITICAL

Neither `/api/stripe/checkout` nor `/api/stripe/connect` authenticated the
caller. Checkout accepted `amount`, `stripeAccountId`, `jobId` and
`applicationId` straight from the request body, so anyone could `curl` the
endpoint and create a Checkout session for any amount paid to any connected
account. Connect accepted a `userId`, so anyone could create a Stripe account
attached to anyone's profile.

**Fixed:** `lib/apiAuth.js` verifies the caller's Supabase JWT on every payment
route. The checkout route now derives the amount, the helper and the destination
from the database rather than the request, and verifies that the caller owns the
job (Ch.3.2, Ch.7).

### 2.3 Prices were charged in EUR while displayed in KM — CRITICAL

The UI formats every price as `"… KM"` (`formatPrice`, `app/page.js`), but the
checkout route sent that same number to Stripe with `currency: "eur"` at 1:1.
A 100 KM job charged the customer **EUR 100 ≈ 195.58 KM** — close to double.

**Fixed:** `lib/money.js` converts explicitly, at the legally fixed peg of
1 EUR = 1.95583 KM. `STRIPE_CURRENCY` selects what is actually charged: set it
to `bam` if the Stripe account supports BAM as a presentment currency, otherwise
leave it as `eur` and amounts are converted.

> **Decision needed:** confirm which currency the Stripe account should settle
> in. Until `STRIPE_CURRENCY` is set, the code defaults to `eur` **with correct
> conversion**, which is right but means customers see a euro amount at Stripe
> Checkout for a KM-priced task.

### 2.4 There was no escrow — CRITICAL

Blueprint Ch.10.2 states escrow is required behaviour: helpers never receive
money immediately on acceptance. The old checkout used a **destination charge**
(`payment_intent_data.transfer_data.destination`), which transfers the funds to
the helper the instant the charge succeeds. The customer's money was gone before
any work happened, and there was nothing to refund from if the job went wrong.

**Fixed:** switched to separate charges and transfers. The charge now lands on
the platform account under `transfer_group: job_<id>`, and the new
`POST /api/stripe/release` creates the Transfer to the helper — only once the
job is `completed`, or when a finance/super admin resolves a dispute. Release is
idempotent and refuses to run twice.

### 2.5 The webhook had no idempotency and wrote no payment records — CRITICAL

The old webhook processed `checkout.session.completed` and nothing else, with no
dedup. Stripe retries deliveries; a redelivery re-ran the job assignment. No
`payments` row was ever written, so there was no financial record on the
platform at all.

**Fixed:** `stripe_events` (primary key = Stripe event id) makes duplicate
delivery a no-op; the insert itself is the lock. The handler now writes the full
8-state enum from Ch.10.5 and also handles `checkout.session.expired`,
`payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created` and
`account.updated`. On handler failure the dedup row is released so Stripe's
retry can reprocess.

### 2.6 Every successful payment landed on a 404 — CRITICAL

`success_url` pointed at `/payment-success` and `cancel_url` at
`/payment-cancel`. **Neither route existed in the app.** Every customer who
completed a payment was redirected to a 404 page.

**Fixed:** both pages added, with the confirmation/summary/next-action structure
required by Ch.26.3 and Ch.59, and copy stating explicitly that money is held
until completion.

### 2.7 Debug dialogs blocked the hiring flow

`chooseHelper` in `app/page.js` contained two `alert()` calls — one dumping the
helper's raw profile JSON, one reading `"Lige før fetch"` — that fired on every
attempt to hire, in production.

**Fixed:** removed, along with the raw-Stripe-error leakage from the connect
route (Ch.26.3: technical errors must never reach the user).

### 2.8 A new Stripe account was created on every button click

The connect route called `stripe.accounts.create` unconditionally, and the
**browser** then wrote `stripe_account_id` and `stripe_connected: true` to the
profile. Two consequences: repeated clicks orphaned Connect accounts, and a
helper was marked "connected" before Stripe had verified anything.

**Fixed:** the route reuses the stored account, writes it server-side, and
`stripe_connected` now means Stripe reports `payouts_enabled` — kept in sync by
`account.updated` and by a status pull when the helper returns from onboarding
(Ch.8.3).

### 2.9 Helpers could be hired before they could be paid

Nothing checked `charges_enabled` / `payouts_enabled` before taking the
customer's money (roadmap HIGH). With the old destination charge this would fail
at charge time, after the customer had entered their card.

**Fixed:** checkout refuses to create a session for a helper whose Stripe
verification is incomplete, and says so in plain language.

### 2.10 Stale offers could be accepted

Nothing verified application state server-side; the UI simply hid non-pending
offers (roadmap CRITICAL, Ch.30.4). A stale tab or a direct API call could
accept a withdrawn or already-rejected offer.

**Fixed:** both accept paths verify the job is still open, the offer is still
`pending`, and the helper is not blocked. The migration also enforces the
illegal transitions at database level via triggers (Ch.46).

### 2.11 The production build depended on runtime secrets

`lib/stripe.js` and `lib/supabase.js` both constructed clients at module scope,
so `next build` failed outright without env vars present
(`Neither apiKey nor config.authenticator provided`, `supabaseUrl is required`).
This is very likely part of the "failed builds" history in handoff §3.

**Fixed:** both are constructed lazily on first use. The build no longer needs
secrets; a genuinely missing key still fails loudly on the first real request.
`lib/stripe.js` also trims the key and warns — the exact failure mode from
handoff §3.3 (`Invalid character in header content [Authorization]`).

---

## 3. Live Stripe findings (read via the Stripe API, live mode)

Account `acct_1TzcBIQPiiDypE16` ("sredi.ba").

### 3.1 Connect appears to be enabled — but nothing has ever onboarded

`GET /v1/accounts` succeeds and returns an **empty list**. Connect is signed up
for (handoff §3.1 resolved), but **zero connected accounts exist in live mode**,
so no helper has ever completed onboarding end-to-end. Handoff §3.5's acceptance
test has not passed yet.

### 3.2 The live webhook endpoints point at the wrong application — CRITICAL

Two live-mode webhook endpoints are registered, and **both point at a Lovable
preview URL, not at sredi.ba**:

```
we_1U072OQPiiDypE16lfNhVosv  checkout.session.completed
we_1U0766QPiiDypE168q1RmEcP  account.updated
   → https://project--fe68345d-…-dev.lovable.app/api/public/stripe-webhook
```

No live endpoint points at `https://www.sredi.ba/api/stripe/webhook`. As things
stand, a successful live payment would never assign the job, never update a
payment record, and never release funds — the money would be taken and the
platform would not react.

> **Action required by the site owner** (cannot be done from the codebase):
> 1. Add a live webhook endpoint at `https://www.sredi.ba/api/stripe/webhook`
>    subscribed to: `checkout.session.completed`, `checkout.session.expired`,
>    `payment_intent.payment_failed`, `charge.refunded`,
>    `charge.dispute.created`, `account.updated`.
> 2. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.
> 3. Decide whether the two Lovable endpoints should be deleted — they belong to
>    a different application and are currently receiving this account's live
>    events.

### 3.3 Accounts v1 vs v2 (handoff §3.2) — still unresolved

The connect route still uses the v1 API (`stripe.accounts.create`). Whether that
works depends on a dashboard toggle that cannot be read from the API, and no
account has been created to prove it either way. The route now detects both
failure modes and returns an actionable message naming the exact dashboard
setting instead of a raw Stripe error. Migrating to `POST /v2/core/accounts` is
still the eventual proper fix, as handoff §3.2 says.

---

## 4. Roadmap items NOT addressed — and why

Honest scope statement. These are Chapter 62 items that remain open:

| Item | Status |
|---|---|
| RLS correct on every table (CRITICAL) | **Cannot verify from the repo.** RLS lives in the Supabase project, not in Git. The migration enables RLS on the new tables only. The existing `profiles`/`jobs`/`applications`/`reviews` policies still need checking in the dashboard. |
| Admin roles, 2FA on admins (CRITICAL) | **Not built.** There is no admin surface at all. The migration adds an `admin_role` column with the four Ch.35.1 tiers and the release route honours it, but the admin app itself is a large separate project. |
| Job lifecycle orphan/stuck states (CRITICAL) | Partly: DB triggers now reject illegal transitions. No sweeper exists for jobs stuck in `assigned`, and `EXPIRED` after 14 days is not implemented (needs a scheduled function). |
| Double-blind ratings (HIGH) | **Open question in the blueprint itself** (Ch.13) — needs a product decision before it can be built. Currently only customer→helper reviews exist; helper→customer does not. |
| Contact-info filtering on applications (HIGH) | Not implemented. |
| Support tickets, ToS versioning, reports RLS, SPF/DKIM/DMARC (HIGH) | Not implemented / infrastructure-side. |
| Everything under MEDIUM and LOW | Not started. |

---

## 5. What must happen before going live

In order. Steps 1–4 are the site owner's; nothing in the code can do them.

1. **Roll the Stripe secret key** (§2.1) and re-paste it cleanly into Vercel.
2. **Run the migration** `supabase/migrations/20260805_payments_escrow.sql` in
   the Supabase SQL editor. Read its header first — it assumes `uuid` primary
   keys and tells you how to check.
3. **Register the live webhook endpoint** at `https://www.sredi.ba/api/stripe/webhook`
   and set `STRIPE_WEBHOOK_SECRET` (§3.2).
4. **Set the remaining env vars** in Vercel: `SUPABASE_SERVICE_ROLE_KEY`
   (required — the webhook and every payment route need it),
   `NEXT_PUBLIC_SITE_URL=https://www.sredi.ba`, and `STRIPE_CURRENCY` (§2.3).
5. **Run the full test-mode acceptance test** from handoff §3.5, in test mode,
   with test keys: helper onboarding → Connect verification → post a Secure
   Payment task → apply → hire and pay → confirm completion → verify the
   transfer lands on the helper's account. Then the same for a Cash task,
   verifying that rejected applicants' commitment fees are refunded
   automatically.
6. Only then switch to live keys.

Note that steps 2–4 must be done **before** the new code is exercised: the
payment routes now write to tables that do not exist until the migration runs.
