<!--
HOW TO USE THIS FILE

1. Save this file as `docs/blueprint.md` inside your sredi.ba repository
   (create the `docs/` folder if it doesn't exist).
2. Open Claude Code in that repository.
3. Start with a prompt like:

   "Read docs/blueprint.md. It's the full technical and business
   specification for this platform. Start by auditing the codebase
   against Chapter 62 (Prioritized Implementation Roadmap) — go
   through the CRITICAL items first, confirm whether each one is
   actually a problem in this codebase, and report back before
   changing anything."

4. Work through it one item at a time from there — Claude Code will
   fix confirmed issues, then move to HIGH, then MEDIUM, then LOW,
   per the working principles on the first page below.
-->

# SREDI.BA PLATFORM BLUEPRINT

### Volume 2 – Technical Architecture & Master Blueprint

Prepared as the engineering companion to Volume 1 (Executive & Business Blueprint). This document describes the target-state architecture for the live sredi.ba platform (existing Next.js/React frontend, Supabase backend, Stripe Connect payments, GitHub-hosted codebase). It is written to be reconciled against the actual repository and database — not to replace what already works.

Working principles for all engineering work on this platform, stated up front and binding for every change proposed in this document or afterward:

- Never replace working functionality without a specific, named technical reason.
- Never redesign a working system component purely for aesthetic or preference reasons.
- Fix confirmed bugs before adding new features.
- Implement one feature at a time, verify it, then move to the next.
- Treat this document as a hypothesis about the current system until checked against the real repo, schema, and Stripe/Supabase dashboards.
### Revision Note

Rev. 2: incorporates Chapter 2 (Complete Business Rules) as the authoritative source for job lifecycle, application rules, and the cash payment flow — job status names and the direction of the cash commitment fee were corrected to match it.

Rev. 3: incorporates Chapter 3 (System Architecture & Technical Requirements) — the database table list (Chapter 4), tech stack and folder structure (Chapter 3), webhook idempotency and payment status enum (Chapter 8), and security controls (Chapter 15) were corrected or expanded to match it, and four new chapters were added (Search Architecture, Logging, Monitoring, Backup Strategy, Development Standards).

Rev. 4: incorporates Chapter 4 (UX & UI Standards) as a new Chapter 26. One item remains an open question rather than an assumption (rating visibility timing, Chapter 13).

Rev. 5: incorporates Chapter 5 (Payments, Escrow, Refunds & Financial Rules) as a new Chapter 10, inserted after Cash Payment Flow — all later chapters shifted by one. This corrected the payment status enum to 8 states (was 5), made escrow timing and automatic refunds mandatory rather than recommended, and added payment-type locking, fraud detection, financial audit trail, invoicing, and payment edge cases.

Rev. 6: adds Chapter 27 (complete Screen & Page Inventory across Customer, Helper, and Admin apps) and Chapter 28 (concrete API Endpoint Specification for everything that needs server-side logic beyond direct RLS-governed reads/writes) — these turn the preceding business/UX rules into a buildable list.

Rev. 7: adds Chapter 29 (Jobs, Categories & Marketplace Rules — Detailed), incorporating Chapter 7 of the source material: the 20-item category taxonomy, budget types, the two-tier location-privacy model (approximate vs. exact address), urgency levels and the "Help Now" fast path, job renewal, an estimated-completion-time field on applications, and a reliability score distinct from star ratings. The Chapter 4 database schema was amended accordingly.

Rev. 8: adds Chapter 30 (Applications, Assignment & Hiring Workflow — Detailed), incorporating Chapter 8 of the source material: a corrected 5-state application enum (added EXPIRED), verification-required-to-apply as a server-side gate, the Compare Helpers and Hire Again screens, trust-indicator badges (distinct from verification_badges), a reconciled application-sorting list, and extending contact-info filtering to application messages, not just chat.

Rev. 9: adds Chapter 31 (Chat — Detailed), Chapter 32 (Notifications — Detailed), and Chapter 33 (Reviews, Ratings & Reputation — Detailed), incorporating Chapters 9–11 of the source material. Three corrections of note: (1) contact-info filtering was mis-located in the original chat chapter — chat only exists post-acceptance, so that filtering actually belongs at the application stage; (2) Sent/Delivered/Read message status is current scope, not future, as originally drafted; (3) SMS was originally scoped as a current notification channel and is corrected to future-only (in-app + email are current). The separate "reliability_score" from Chapter 29.11 was also reconciled into one unified reputation_score.

Rev. 10: adds ten new chapters (35–44) covering Chapters 12–21 of the source material: Admin Dashboard detail (Ch.35 — corrects the admin role model from 2 tiers to 4: Support Agent/Moderator/Finance Administrator/Super Administrator, and confirms 2FA is required now for admins, not future), Customer Support & Ticketing (Ch.36, entirely new subsystem), Search & Matching (Ch.37 — the final reconciliation of the sort-option lists drafted three times previously, split cleanly into job-sort vs. helper-sort), Security additions (Ch.38), Analytics & BI (Ch.39), expanded Internationalization (Ch.40), Legal/Compliance/GDPR (Ch.41, entirely new), concrete SEO/Performance targets (Ch.42), a Production Readiness launch checklist (Ch.43), and the long-term product vision (Ch.44, kept distinct from the near-term implementation roadmap).

Rev. 11: adds nine chapters (46–54) covering Volume 3 (Chapters 22–31 of the source material — Database, API, RLS, Stripe Connect [confirmed, no changes], Realtime, Storage, Email, Logging/Monitoring, Deployment) and the start of Volume 4 (Design System). Notably: several tables referenced earlier as "new" (support_tickets, saved_searches) had never actually been added to the master Chapter 4 schema — fixed, along with newly-introduced tables (audit_logs as distinct from admin_logs, ticket_messages, system_settings, countries/cities, languages/translations). Also added: a standardized API response envelope, database-level rejection of invalid state transitions, dedicated Realtime and Storage chapters, concrete infrastructure claims (Vercel/Supabase/Stripe) to verify against reality, and an expanded design-token/component system.

Rev. 12: adds six chapters (56–61) covering the remainder of Volume 4 and the closing chapters of the source material (Chapters 32–40): a full screen specification (Ch.56, adding a Dashboard/Home screen, error/success pages, and Delete Account), an expanded component library (Ch.57, including a new presence/status-indicator system and dark mode as future scope), a detailed mobile UX spec (Ch.58, reconciling the 5-tab bottom nav with the fuller 7-item navigation), confirmed user journeys (Ch.59), a new Testing & QA chapter specifying required test types (Ch.60), and a capstone Platform Manifest (Ch.61) marked "END OF PLATFORM BIBLE v1.0" in the source — this may mark the end of the source specification. The Vercel/Supabase/Stripe/GitHub infrastructure claim from Rev. 11 was independently confirmed by a second source chapter. This document remains a baseline to verify against the live codebase — not a description of confirmed current behavior — until reconciled against real repository access.

*Note on chapter numbering: chapter numbers 34, 45, and 55 were consumed by intermediate drafts (the Roadmap chapter moved twice as material was inserted before it) and are not reused. Numbering is otherwise sequential and every cross-reference in this document points to the correct chapter as currently numbered.*

## CHAPTER 2 — Business Architecture

This section translates the business model in Volume 1 into concrete system-level obligations. Every downstream architecture decision (database, payments, notifications) exists to serve one of these obligations.

### 2.1 Core Business Entities

- Customer — posts jobs, receives offers, pays, rates helpers.
- Helper — browses jobs, submits offers, gets assigned, gets paid, is rated.
- Job (task) — the unit of work; has a lifecycle, a category, a location, a budget, a payment type (Secure Payment or Cash Payment).
- Application — a helper's single submission to a job; has offered price, optional message, timestamp. One application per helper per job — this is a single-accept model, not an open bidding war.
- Payment — either a Secure Payment via Stripe Checkout (platform commission on the full job amount, released to the helper via Stripe Connect on completion) or a Cash Payment (platform charges the HELPER a 10% commitment fee to apply; job amount itself is paid customer-to-helper in cash, outside the platform).
- Admin — moderates, resolves disputes, manages platform health, can refund payments and cancel assigned jobs.
### 2.2 Job Lifecycle (state machine)

Canonical states, per Chapter 2 business rules — every job has exactly one status at all times, and only the listed transitions are valid:

- DRAFT → OPEN → ASSIGNED → IN_PROGRESS → COMPLETED → ARCHIVED
- Branches: OPEN → CANCELLED (customer, pre-acceptance) · OPEN → EXPIRED (automatic, 14 days with no accepted helper) · ASSIGNED → CANCELLED (admin approval required once a helper is assigned)
- No other transitions are valid — e.g. a job cannot move directly from OPEN to COMPLETED, and ARCHIVED/CANCELLED/EXPIRED are terminal.
Every transition must be logged with actor, timestamp, and reason where applicable (see Chapter 14 Admin Architecture / audit log). This is what makes disputes resolvable and analytics trustworthy.

### 2.3 Revenue Model → System Requirements

- Commission on completed Secure Payment jobs → Stripe Checkout collects the full job amount up front; commission is retained via application_fee_amount and the remainder transferred to the helper's Connect account on completion (see Chapter 8).
- 10% commitment fee on Cash Payment jobs → charged to the HELPER at the moment they submit an application, not to the customer, and not a percentage of an eventual final price since none is guaranteed on-platform (see Chapter 9). Automatically refunded if that helper's application is rejected.
- Future: featured listings, subscriptions, premium helper accounts → requires a generic "entitlements" table now, even before these features ship, so job/search ranking logic has one place to check paid status.
## CHAPTER 3 — System Architecture

Per Chapter 3 (System Architecture & Technical Requirements): security-first, mobile-first, API-first, performance-first, scalability-first, maintainability-first. Every component has a single responsibility and is loosely coupled; no business logic exists only in the frontend; critical operations are always validated server-side.

### 3.1 High-Level Components

- Frontend — Next.js, React, TypeScript, Tailwind CSS. Responsive, component-based, reusable UI components, lazy loading, optimized images, SEO-optimized pages, WCAG accessibility.
- Folder structure (as specified): components/, features/, hooks/, lib/, pages/, public/, styles/, types/, utils/ — no duplicated components, no duplicated business logic. This should be checked against the live repo rather than assumed to already match exactly.
- Supabase — Postgres database, Auth, Storage (photos/attachments), Realtime (chat, live job/application updates), Row Level Security, Edge Functions.
- Stripe — Secure Checkout, refunds, Stripe Connect payouts, commitment fees, webhook processing.
- Email services, analytics, and storage sit alongside these as independent, loosely coupled services — none should hold business logic that the API layer doesn't also enforce.
### 3.2 Request Flow Principle

Anything that touches money, changes authorization state, or must be trusted (commission calculation, payout release, dispute resolution) must run server-side — in a Supabase Edge Function or equivalent server route — never purely in client code with Row Level Security as the only guard. RLS protects data access; it does not replace business-logic validation.

### 3.3 Environments

- local — developer machines, local Supabase or a shared dev project, Stripe test mode.
- staging — mirrors production schema, Stripe test mode, used for QA and client demos.
- production — live sredi.ba, Stripe live mode, real user data.
Migrations must be scripted (Supabase CLI migration files committed to Git) and applied in the same order to staging then production — never edited by hand directly in the production dashboard.

## CHAPTER 4 — Database Architecture

Table list below is the canonical set named in Chapter 3 (System Architecture) — profiles, jobs, applications, messages, notifications, reviews, payments, refunds, categories, reports, favorites, verification_badges, admin_logs — plus tables introduced later as chapters required them (audit_logs, support_tickets, ticket_messages, saved_searches, system_settings, countries/cities, languages/translations — Chapter 22.4 confirms this fuller list), with likely key fields added based on the business rules in Chapter 2. This is a baseline to reconcile against the existing schema; the exact columns are inferred, not confirmed, and should be checked against a real schema export.

| Table | Purpose | Key Fields / Notes |
|---|---|---|
| profiles | One row per authenticated person; role flag (customer / helper / admin). | auth.users (Supabase-managed) + public.profiles (display name, phone, verification status, avatar, role, locale, reputation_score — one unified internal trust score per Chapter 33.3, not a separate reliability_score) |
| categories | Service categories (cleaning, moving, repairs, etc.). | slug, name_bs, name_en, icon, parent_id (for subcategories) — seed list in Chapter 29.2 |
| jobs | Core task entity. Note: per Ch.2, the accepted helper is likely tracked directly on this table (e.g. selected_helper_id) rather than a separate assignments table — confirm against the real schema. | customer_id, category_id, title (max 100 chars), description (max 2000 chars), location_approx (city/neighbourhood, public), location_exact (revealed only to selected_helper_id — see Chapter 29.4), budget_type (fixed/negotiable/range), budget_min, budget_max, urgency (flexible/scheduled/today/tomorrow/urgent), preferred_date, photo_urls (max 10), visibility (public/hidden/invite_only — public only in current scope), payment_type (secure/cash), status (DRAFT/OPEN/ASSIGNED/IN_PROGRESS/COMPLETED/ARCHIVED/CANCELLED/EXPIRED), selected_helper_id, timestamps per state |
| applications | One helper's single application to a job. | job_id, helper_id, offered_price, message, estimated_completion_time (Chapter 29.10), status (pending/accepted/rejected/withdrawn/expired — 5 states, see Chapter 30.2), created_at — unique constraint on (job_id, helper_id) |
| payments | Every payment the platform processes — both Secure Payment job amounts and Cash-job 10% commitment fees, distinguished by a type column. | job_id, application_id (for commitment fees), type (secure_payment/commitment_fee), stripe_checkout_session_id, stripe_payment_intent_id, amount, commission_amount, status (Pending/Processing/Succeeded/Failed/Cancelled/Refunded/Released/Disputed — see Chapter 10.5) |
| refunds | Refund records — e.g. automatic commitment-fee refunds for rejected cash applicants, or admin-issued refunds on disputes. | payment_id, amount, reason, initiated_by (system/admin), stripe_refund_id, status |
| messages | Chat messages, scoped per job. | job_id, sender_id, body, attachment_url, created_at, flagged |
| reviews | Post-completion ratings (customer↔helper, mutual). | job_id, rater_id, ratee_id, stars, comment, completion_date, job_category, reviewer_display_name (first name only, public — see Chapter 33.2), created_at, immutable (no edits — Chapter 33.1) — visibility timing (blind vs immediate) is still an open question, see Chapter 13 |
| reports | User-submitted reports (per Ch.2: customers can report helpers, helpers can report customers) — likely also covers disputes rather than a separate disputes table. | job_id, message_id (optional, for a report scoped to one chat message — Chapter 31.5), reported_by, reported_user_id, reason, status, resolution, admin_id |
| favorites | Saved/favorited helpers or jobs. | user_id, target_type (helper/job), target_id, created_at |
| verification_badges | Identity/skill verification badges shown on helper profiles. | helper_id, badge_type, status, issued_at, reviewed_by |
| notifications | In-app + email delivery log. | user_id, title, description, type (per role — Chapter 32.2), related_job_id, related_user_id, action_url, read_status (unread/read/archived — 3 states, Chapter 32.3), priority (low/medium/high/critical), channel (email/in_app — SMS/push are future, Chapter 32.1), created_at |
| admin_logs | Every admin action across the platform — the audit trail referenced throughout this document. | actor_id (admin), action, entity_type, entity_id, before/after, created_at |
| audit_logs | Broader system-wide audit trail per Chapter 22.18 — distinct from admin_logs, which is admin-actions only. Covers profile updates, payment updates, refunds, job assignments, role changes, and authentication events regardless of actor. | actor_id, actor_type (user/admin/system), action, entity_type, entity_id, before/after, ip_address, created_at — append-only, same standard as admin_logs (Chapter 10.8) |
| support_tickets | Customer support tickets — see Chapter 36.2. | user_id, subject, message, job_id/payment_id/category (optional), status, priority, assigned_agent_id, created_at, updated_at, resolution_notes |
| ticket_messages | Message thread within a support ticket, distinct from job chat (messages table). | ticket_id, sender_id (user or agent), body, created_at |
| saved_searches | User-saved search criteria — see Chapter 37.3. | user_id, filter_criteria (JSON), created_at, last_notified_at |
| system_settings | Platform-wide configuration editable by Super Admin without a deploy (feature flags, commission rate, commitment-fee percentage, etc.). | key, value, updated_by, updated_at |
| countries / cities | Geographic reference data — supports the current BiH city list (Volume 1 §1.7) and future multi-country expansion (Chapter 25). | countries: code, name_bs, name_en, currency, is_active; cities: country_id, name_bs, name_en, lat/lng |
| languages / translations | Backs the i18n content-without-code-changes requirement (Chapter 40). | languages: code, name, is_active; translations: language_code, key, value — covers category names, static content, email templates |

### 4.1 Design Rules

- Every table includes id, created_at, updated_at (per Chapter 3); soft delete where appropriate rather than hard-deleting disputable records.
- Every monetary column is an integer in minor units (fenings/cents), never a float.
- Indexes on every foreign key and on frequently-queried columns (status, category_id, city, created_at) — confirm against real query patterns, not assumption.
- Foreign keys are enforced at the database level, not just application level.
- RLS is enabled on every table by default; access is opt-in per policy, not opt-out.
## CHAPTER 5 — API Architecture

- Primary data access via Supabase's auto-generated REST/PostgREST + client SDK, governed entirely by RLS policies — fine for reads and simple writes.
- Server-side logic (payments, payouts, dispute resolution, commission calculation, sending notifications) lives in Supabase Edge Functions, called from the client but executing with service-role privileges server-side.
- Webhooks (Stripe) land on a dedicated Edge Function endpoint, never processed client-side.
- Versioning: prefix edge function routes (e.g. /functions/v1/...) so breaking changes can ship a v2 without breaking the live mobile/web client mid-release.
- Rate limiting: apply at the edge/CDN layer for public endpoints (job search, public profiles) to prevent scraping and abuse; apply per-user limits on offer submission and messaging to prevent spam.
## CHAPTER 6 — Authentication

- Supabase Auth as the identity provider: email + password as baseline, phone/SMS OTP recommended given the BiH market's high phone-verification trust, optional social login (Google) for lower signup friction.
- Every account must reach a minimum verification level (verified email or phone) before it can submit an offer or post a job with online payment.
- Session tokens (JWT) short-lived with refresh token rotation; Supabase handles this by default — confirm current expiry settings match risk tolerance for a payments platform (shorter than default is reasonable).
- Helper identity verification (ID document upload) is a distinct, stronger tier above basic auth — gates ability to receive payouts (see Chapter 9) and is required before Stripe Connect account activation.
## CHAPTER 7 — Authorization

- Roles: customer, helper (note: same person can hold both roles simultaneously — do not model as mutually exclusive), admin, super_admin.
- Row Level Security policies per table, e.g.: a job row is readable by anyone if status = open, but only writable by its customer_id or an admin; messages in a job's chat are readable only by that job's customer, assigned helper, and admins.
- Admin actions (refunds, dispute resolution, account suspension) must additionally check role in the Edge Function itself, not rely on RLS alone, because these actions run with elevated service-role credentials that bypass RLS.
- Principle: RLS protects normal user-to-user data access; explicit role checks in server functions protect privileged operations.
## CHAPTER 8 — Stripe Connect Architecture

### 8.1 Account Model

- Helpers are onboarded as Stripe Connect Express accounts (lowest friction, Stripe-hosted onboarding UI, suits a marketplace of individual/small-business helpers).
- Platform (Sredi.ba) is the Connect platform account; customer payments are collected on the platform account and split via destination charges with application_fee_amount, OR collected then transferred separately — pick one pattern and use it consistently (destination charges are simpler and recommended if not already implemented differently).
### 8.2 Payment Flow (online jobs)

- 1. Customer accepts an offer → Payment Intent created for full job amount, with transfer_data.destination = helper's connected account and application_fee_amount = platform commission.
- 2. Funds captured on job assignment or on completion, depending on business decision — recommend capturing on assignment and releasing transfer on completion to protect customers (acts as a soft escrow).
- 3. On job completion confirmation (by customer, or auto-confirmed after N days of no response), the held transfer to the helper is released.
- 4. Stripe webhooks (payment_intent.succeeded, transfer.created, account.updated, payout.paid, charge.dispute.created) are the single source of truth for updating the payments table — never trust client-reported success.
### 8.3 Onboarding & Compliance

- Helper cannot receive payouts until Stripe reports charges_enabled and payouts_enabled = true on their connected account.
- Platform must handle the account.updated webhook to reflect verification status in the helper's dashboard (e.g. "complete your Stripe verification to get paid").
- KYC/AML is handled by Stripe for connected accounts, but the platform is still responsible for its own dispute/chargeback handling and for BiH-specific tax/invoicing questions — flag this for legal review, not an engineering assumption.
### 8.4 Webhook Reliability (per Chapter 3.8)

- Every webhook must verify the Stripe signature before processing — an unverified payload is never trusted, full stop.
- Every webhook handler must be idempotent: Stripe can and will redeliver the same event. Store processed Stripe event IDs (e.g. a stripe_events table keyed on event.id) and short-circuit on a duplicate before touching the payments table — duplicate webhook events must never duplicate a payment, a refund, or a payout.
- Every payment row must always be in one of the eight states listed in Chapter 10.5 (Pending, Processing, Succeeded, Failed, Cancelled, Refunded, Released, Disputed) — no payment should ever be left in an undefined or missing status.
## CHAPTER 9 — Cash Payment Flow

Canonical flow per Chapter 2 business rules — note the fee is charged to the HELPER, not the customer, and is charged to apply, not to be assigned:

- 1. Customer creates a job with payment_type = Cash.
- 2. A helper who wants to apply must first pay a 10% commitment fee (10% of their own offered_price) via Stripe — this is a standard Payment Intent to the platform account, not a Connect transfer, since no job funds are moving through the platform.
- 3. Only once that payment succeeds is the application row created and visible to the customer.
- 4. Customer reviews applications and selects one helper → job becomes ASSIGNED, private chat opens.
- 5. All other applicants on that job who already paid the commitment fee must be automatically refunded via Stripe and notified — this refund is not optional and should be triggered synchronously with the rejection, not left to an admin.
- 6. Customer and helper transact in cash outside the platform; customer marks the job COMPLETED; platform keeps the 10% commitment fee as its only revenue on this job.
- No escrow exists for the job amount itself — this must be clearly disclosed in-app so users don't assume the cash amount is protected the way a Secure Payment job is.
- Disputes on cash jobs are inherently harder to resolve (no platform record of the final cash amount paid) — the admin dispute console should visibly flag cash jobs differently so admins know financial evidence is limited to the chat log, the original offered_price, and both parties' statements.
## CHAPTER 10 — Payments, Escrow & Refunds (Detailed Rules)

Per Chapter 5 (Payments, Escrow, Refunds & Financial Rules) — this is now the authoritative detail layer on top of Chapters 8 and 9, and corrects/extends a few things stated more loosely there.

### 10.1 Payment Type Lock

- A job's payment_type (Secure Payment vs Cash Payment) is fixed at creation and becomes immutable the moment the first application is received — this must be enforced at the database/API level, not just hidden in the UI.
### 10.2 Escrow Model (Secure Payment)

- Secure Payment is explicitly an escrow: the customer's payment is captured at Stripe Checkout, but that money is not releasable to the helper immediately on acceptance — it remains held until either the customer confirms COMPLETED, or an administrator resolves a dispute in the helper's favor.
- This corrects the softer wording used in Chapter 8.2 — capturing on assignment and holding until completion is not just a recommended pattern, it is the required behavior. Helpers never receive money immediately after being accepted.
### 10.3 Commitment Fee Calculation

- Commitment fee = exactly 10% of the helper's own offered_price, always computed automatically server-side, never entered manually by the helper or admin (e.g. 100 KM offer → 10 KM fee; 35 KM offer → 3.50 KM fee).
### 10.4 Automatic Refund Triggers

- The commitment fee must be automatically and fully (100%) refunded to the original payment method, with no admin step required, when: the application is rejected, the job is cancelled before acceptance, the payment failed, a Stripe error occurred, or a duplicate payment is detected.
- This is stricter than Chapter 9's description — refunds here are a guaranteed system behavior, not a best-effort admin action.
### 10.5 Payment States

- Canonical payment status enum (per Chapter 5.9, superseding the shorter list in Chapter 8.4): Pending, Processing, Succeeded, Failed, Cancelled, Refunded, Released, Disputed. Every payment row is always in exactly one of these eight states — the DB schema in Chapter 4 and the webhook handlers in Chapter 8 should be updated to this full set rather than the 5-state version drafted earlier.
- Released is distinct from Succeeded: Succeeded means the customer's charge cleared; Released means the held escrow funds have actually been transferred to the helper's Connect account after completion. Conflating these two is a likely source of "the helper says they weren't paid but Stripe shows succeeded" support tickets.
### 10.6 Failed & Duplicate Payments

- On a failed payment: the job stays OPEN, the application is unchanged, no helper is assigned, the customer is informed, and a retry is offered — a failed payment must never silently assign a helper or move the job forward.
- Duplicate payment attempts must be detected and the second charge attempt ignored (idempotency keys on the Stripe Checkout session, per Chapter 8.4), the incident logged, an administrator notified, and an automatic refund issued if a duplicate charge did go through.
### 10.7 Fraud Detection

- Signals to actively monitor: duplicate accounts, repeated refunds from the same user, fake/spam applications, chargebacks, suspicious payment patterns, multiple cards on one account, VPN abuse, repeated last-minute cancellations. Flag high-risk accounts for admin review rather than silent auto-banning, given the cost of a false positive on a trust marketplace.
### 10.8 Financial Audit Trail

- Every financial action (payment, refund, payout, admin override) is logged with: who initiated it, timestamp, IP address, payment ID, refund ID, job ID, and, if an admin acted, which admin. These logs must be append-only — never editable, even by an admin — which is a stronger requirement than the general admin_logs table in Chapter 4 and should be modeled as its own protected table or a write-once constraint.
### 10.9 Invoices, Currency & Tax

- Invoices/receipts are auto-generated and downloadable as PDF: a receipt for the customer, a payout confirmation for the helper.
- Current currency is KM (Bosnian Convertible Mark), displayed consistently across jobs, applications, checkout, invoices, and emails; the schema and pricing logic should avoid hardcoding KM in a way that blocks adding EUR/USD/GBP later (per the multi-country expansion in Chapter 25).
- VAT and country-specific tax rules are future scope, but invoice generation should be structured now so tax fields can be added without reworking the invoice model later.
- No hidden fees: the customer always sees job price, platform fee, and total; the helper always sees the amount they receive, the platform commission, and the estimated payout.
### 10.10 Financial Data Security

- Never store card numbers, CVV, or other sensitive Stripe data on the platform's own database — only payment IDs, customer IDs, and transaction references. Stripe is the system of record for anything card-related, reinforcing Chapter 15's secrets-handling rules.
### 10.11 Edge Cases

- Customer closes the browser mid-payment → the Stripe webhook still completes the payment server-side and the system updates the job/application state from that webhook, not from the client having stayed on the page.
- A helper deletes their account while assigned to a job → that job's state is locked (not silently reassigned or auto-cancelled) and an administrator is notified to resolve it manually.
- A webhook is delayed → retry automatically, and rely on the idempotency handling from Chapter 8.4 to guarantee the delayed retry can never duplicate-process the same event.
- A refund attempt fails → retry, and notify an administrator if retries are exhausted; a failed refund must never be silently dropped.
## CHAPTER 11 — Notifications

- Central notifications table decouples "an event happened" from "how it was delivered" — one event can fan out to email + push + in-app.
- Trigger events: new offer received, offer accepted/rejected, payment succeeded, job completed, new chat message (if recipient not currently active in that chat), dispute opened, verification approved/rejected, payout sent.
- Delivery channels: in-app feed (always), push (if opted in), email (for anything requiring action or a receipt), SMS (reserved for OTP and time-critical alerts only, to control cost).
- Preference center: users must be able to control channel preferences per notification category, with transactional/security notifications (OTP, payment receipts) exempt from opt-out.
## CHAPTER 12 — Chat Architecture

- Chat is created only after a successful Secure Payment OR an accepted Cash application (per Chapter 2) — never before assignment, and never accessible to applicants who were not selected.
- Chat is scoped per job, not a general inbox — a message row always has a job_id; this keeps authorization simple (RLS: only customer + assigned helper + admins can read).
- Chat becomes read-only once the job is COMPLETED — messages are preserved for dispute purposes but no new messages are accepted.
- Applications list (pre-assignment) must be sortable by the customer: newest, highest rating, lowest price, closest distance — this is customer-facing UI logic, not a fixed backend order.
- Realtime delivery via Supabase Realtime (Postgres logical replication over websockets) — no polling.
- Attachments stored in Supabase Storage under a job-scoped path, with signed URLs rather than public buckets.
- Note: chat only ever exists after acceptance, so there is no pre-assignment chat to moderate for contact info — that filtering happens at the application stage instead (see Chapter 31.1 for the correction). Ongoing fraud/abuse monitoring within chat is still a Chapter 15 concern, but is a different mechanism serving a different purpose.
- Chat history retained after job completion for dispute-resolution purposes; deletion policy should follow data-retention rules set in Chapter 15 (Security).
## CHAPTER 13 — Ratings & Reviews

- Per Chapter 2 business rules: after COMPLETED, customer rates helper and helper rates customer, 1–5 stars plus an optional written review; average rating updates automatically.
**OPEN QUESTION — needs a decision, not an assumption: **the business rules don't specify whether both ratings are visible immediately on submission, or held back until both sides have rated ("double-blind"). Immediate visibility is simpler but allows retaliatory ratings (a helper waits to see the customer's rating before submitting a bad one back). This needs a real answer from whoever owns the current implementation before it's documented as fact — flagging rather than assuming either way.

- Rating affects a helper's visibility in search/ranking but should not be the only signal — factor in completion rate and response time too, to prevent early-stage helpers with zero ratings from being invisible.
- Disputed jobs should not silently allow a rating until the dispute is resolved, to avoid a rating being used as leverage during an active dispute — confirm this against current behavior rather than assuming it's already enforced.
## CHAPTER 14 — Admin Architecture

- Moderation queue: new helper verifications, flagged chat messages, reported profiles/jobs — one unified queue, not scattered admin pages.
- Dispute console: shows job timeline (from audit_log), full chat transcript, payment/commitment status, and lets an admin apply one of a small set of defined resolutions (refund customer, release to helper, partial split, ban user) — every resolution writes to audit_log with the admin's id.
- Analytics dashboard: the Year One metrics from Volume 1 (registered users, completed jobs, average rating, payment success rate, uptime) should be live-queryable, not a manual spreadsheet exercise.
- Category & content management: categories, homepage content, and featured listings (future) editable without a code deploy.
- Every admin action is logged with actor, action, target, and reason — this is both a security requirement and a dispute-defensibility requirement.
## CHAPTER 15 — Security

- RLS enabled on 100% of tables containing user data; explicit test suite that asserts a customer cannot read another customer's private data (job drafts, payment details, phone numbers) even via direct API calls.
- Secrets (Stripe secret key, service-role key, SMS/email provider keys) live only in server-side environment variables / Supabase Edge Function secrets — never shipped to the client bundle.
- PII minimization: phone numbers and exact addresses are visible only to the counterpart on an assigned job, never in public listings (public job posts show city/neighbourhood, not exact address).
- BiH operates under the Law on Protection of Personal Data, broadly GDPR-aligned — data retention limits, right to deletion/export, and a documented lawful basis for processing should be treated as real compliance requirements, and reviewed with legal counsel rather than assumed from this document.
- Fraud/abuse patterns to actively monitor: repeated off-platform payment solicitation in chat, fake completion confirmations, review manipulation (helper and customer accounts controlled by the same person), card testing on the payment endpoint.
- Webhook endpoints must verify Stripe's signature on every event — never process an unverified webhook payload.
### 15.1 Additional Controls (per Chapter 3.16)

- HTTPS only, everywhere, with no mixed-content exceptions.
- CSRF protection on all state-changing requests.
- Rate limiting on auth endpoints (login, password reset), application submission, and messaging.
- SQL injection protection — parameterized queries only; Supabase's client libraries do this by default, but any raw SQL in Edge Functions must be checked explicitly.
- XSS protection and input sanitization on every field that renders user-generated content (job descriptions, messages, review text).
- Encrypted secrets, environment variables only — never committed to the repo, never in client-side code.
## CHAPTER 16 — Search Architecture

Per Chapter 3.14. This governs how customers find helpers and how helpers find jobs.

- Filterable by: keyword, category, city, budget, rating, distance, urgency.
- Sortable by: distance, newest, highest rating, lowest price — user-selectable, not a fixed default (consistent with the application-sorting rule in Chapter 2.5).
- Postgres full-text search (tsvector/tsquery) on title/description is very likely sufficient at current and near-term scale — a dedicated search service (Elasticsearch/Algolia/Meilisearch) is only worth the operational overhead once keyword-search quality is a measured, specific complaint, not a default architecture choice.
- Distance sorting requires PostGIS or equivalent geo-indexing on job/profile location columns — confirm this is already enabled on the Postgres instance.
## CHAPTER 17 — Performance

Explicit targets per Chapter 3.15 — these are measurable acceptance criteria, not aspirations:

- Initial page load: under 2 seconds.
- API response time: under 500ms.
- Database indexes on every foreign key and every column used in search/filter (category_id, city, status, created_at) — verify against actual query patterns using Postgres EXPLAIN, not guesswork.
- CDN caching for static assets and for public, cacheable pages (category pages, public helper profiles) with short TTLs; authenticated views bypass cache.
- Image optimization (job photos, profile photos, verification documents) — resize/compress on upload rather than serving originals.
- Pagination (cursor-based, not offset-based) on job listings and chat history to keep performance flat as data grows into the "millions of jobs" target from Volume 1.
- Avoid unnecessary queries — every added query on a hot path (job listing, chat) should be justified against the 500ms budget above.
## CHAPTER 18 — Logging

Per Chapter 3.17.

- Log: errors, payments, refunds, assignments, authentication events, admin actions.
- Logs must never expose sensitive data — no full card numbers, no raw passwords, no full phone numbers/addresses in plaintext log lines; redact or hash before writing.
- Payment and refund logs should be cross-referenced with the payments/refunds tables and Stripe's own event log, so a discrepancy between "what we logged" and "what Stripe recorded" is detectable.
## CHAPTER 19 — Monitoring

Per Chapter 3.18.

- Monitor: server uptime, database health, Stripe webhook failures, failed logins, API latency, payment failures, realtime connection health.
- Critical failures (payment webhook failures, database unavailability, a spike in failed logins suggesting credential stuffing) must page an administrator immediately — a dashboard nobody is watching is not monitoring.
## CHAPTER 20 — Backup Strategy

Per Chapter 3.19.

- Daily backups, with automatic recovery tested — not just configured and assumed to work.
- Point-in-time recovery enabled on the production database, given this is a payments platform where losing even a few hours of transaction data is unacceptable.
- A written disaster recovery plan, and a rule that no production deployment proceeds without a verified, recent, restorable backup.
## CHAPTER 21 — Development Standards

Per Chapter 3.20 — binding for all future work on this platform, not just new features:

- Every feature must be documented, tested, reviewed, secure, scalable, localized, responsive, and production-ready before it ships.
- Never introduce technical debt without explicit justification recorded at the time.
- Always fix root causes instead of symptoms.
- Always preserve backward compatibility whenever possible — this reinforces the standing instruction not to redesign working functionality without a specific technical reason.
## CHAPTER 22 — SEO

- Public, indexable pages (category pages, city pages, individual job listings while open, public helper profiles) should be server-rendered or statically generated — not client-side-only rendered — so search engines see full content.
- Structured data (schema.org Service / LocalBusiness / Review markup) on category and profile pages to earn rich results.
- Localized URL structure reflecting Bosnian city names and category slugs (e.g. /sarajevo/ciscenje-stanova/) rather than generic query-string URLs — matches how BiH users actually search.
- XML sitemap auto-generated and resubmitted as new categories/cities launch; canonical tags to avoid duplicate-content issues between city/category filter combinations.
## CHAPTER 23 — Internationalization

- Bosnian is the primary language; English is secondary (for eventual regional expansion and international users) — content, not just UI strings, needs a translation workflow (category names, email templates, notification copy).
- i18n routing: locale-prefixed paths or a locale cookie/header strategy — pick one consistently; mixing both causes duplicate-content and caching bugs.
- Database content that varies by language (category names, admin-authored content) should be modelled as explicit name_bs / name_en columns (as in the schema in Chapter 4), not a separate translation microservice, given current scale.
- Plan ahead for the Volume 1 expansion markets (Croatia, Serbia, Montenegro, North Macedonia, Slovenia, Kosovo) — Serbian/Croatian/Montenegrin are close enough to Bosnian that a shared base translation with per-market review is realistic; Slovenian and Macedonian are not, and will need full translation.
## CHAPTER 24 — Deployment

- CI/CD via GitHub Actions (or existing equivalent): lint + type-check + test on every pull request; deploy to staging automatically on merge to a develop/staging branch; deploy to production only on a tagged release or merge to main, with a manual approval gate given this is a payments platform.
- Database migrations are version-controlled files (Supabase CLI), applied via the pipeline, never edited by hand in the Supabase dashboard on production.
- Environment variables/secrets managed per environment in the hosting provider and Supabase project settings — audited so staging Stripe keys can never leak into production config or vice versa.
- Rollback plan: every deploy should be revertible to the previous known-good build within minutes; database migrations should be written to be backward-compatible for at least one release where feasible (additive columns before removing old ones).
- Monitoring/alerting on error rates, webhook failures, and payment failures — these need paging-level alerts, not just dashboards someone checks occasionally.
## CHAPTER 25 — Future Scalability

- The schema and RLS-per-table model in Chapter 4 scales to millions of rows on Postgres with correct indexing; no need for microservices or a different database at current or near-term scale — resist over-engineering this.
- Read replicas for analytics/admin dashboard queries once write load on the primary becomes a concern, so heavy admin reporting queries never compete with live job/payment traffic.
- Multi-country expansion (Volume 1, section 1.3) should be modelled as a country_id / market_id dimension on categories, currency, and tax/commission rules from day one, even while only serving BiH — retrofitting this later is expensive.
- If/when true multi-region latency becomes a problem (serving multiple Balkan countries), Supabase/Postgres read replicas or regional edge functions are the first lever — full service decomposition is a last resort, not a default.
## CHAPTER 26 — UX/UI Standards

Per Chapter 4 (UX & UI Standards). This governs the frontend implementation referenced in Chapter 3 (Next.js/React/TypeScript/Tailwind) — treat conflicts between this chapter and whatever is currently live as things to reconcile deliberately, not silently overwrite, since visual/UX changes are exactly the kind of "redesign a working thing" this project has been told to avoid without a specific reason.

### 26.1 Brand & Visual System

- Primary feeling: trust, then speed, then professionalism — every visual decision should be checked against which of these it serves.
- Color system: blue (primary actions/links), orange (success/brand highlights), green (completed/verified/successful payment), yellow (warnings/pending), red (errors/failed/cancelled/danger), grey (backgrounds/borders/disabled/secondary text). Status badges must always pair color + text label, never color alone (accessibility requirement, not just style).
- Status badge colors specifically: OPEN=blue, ASSIGNED=purple, IN_PROGRESS=orange, COMPLETED=green, ARCHIVED=grey, EXPIRED=dark grey, CANCELLED=red.
- Typography: modern sans-serif; bold/large/high-contrast headings; readable body text with comfortable line spacing; bold buttons with consistent capitalization.
- Spacing: 8px base unit for all margins/padding increments.
### 26.2 Components

- Buttons: primary (filled blue, rounded — Post Job / Pay Now / Accept Helper), secondary (outlined neutral — Cancel / Back / Edit), danger (red, reserved for Delete / Cancel Job / Remove Account). All buttons need a loading state, and must be disabled during submission — double-click must never trigger a duplicate payment.
- Job cards show: title, category, budget, location, time posted, urgency, payment type, application count (distance later). Nothing beyond this list — resist adding fields that don't serve a decision the viewer is making.
- Helper cards show: photo, name, rating, completed jobs, member since, verification badges, average response time, short bio (distance later).
- Application cards show: helper name/photo/rating/completed jobs, offered price, message, apply time, with Accept / Reject / View Profile actions.
- Forms: short, logical, validate immediately, show errors below the specific field, and never clear what the user already typed when validation fails.
### 26.3 States

- Loading: skeleton loaders on every API-backed view, never a blank white screen.
- Empty states (no jobs / messages / applications / notifications): an illustration, an explanation of what to do next, and an action button — not a bare "no results" line.
- Error states: what happened, why, and how to fix it, in plain language — raw technical/stack-trace errors must never reach the user.
- Success states: explicit confirmation after payment success, application submitted, profile updated, review saved, refund processed.
### 26.4 Navigation, Chat & Notifications UX

- Primary navigation: Home, Find Help, Find Work, Messages, Notifications, Profile, Menu — current section always visually highlighted.
- Chat: customer messages align right, helper messages align left; each message shows photo, timestamp, and delivery state — Sent/Delivered/Read is current scope (see Chapter 31.4 correction), only a granular "seen at" timestamp and the typing indicator are future work.
- Notification center: unread badge, categories, mark-all-read, delete, deep link, timestamp, grouped by date.
### 26.5 Mobile-First & Accessibility

- Design and test against 320/375/390/414px before desktop — this platform is mobile-first, not desktop-adapted-to-mobile.
- Accessibility is a requirement, not a nice-to-have: keyboard navigation, screen-reader support, sufficient color contrast, large tap targets, readable font sizes, WCAG compliance.
- Every visible string exists in both Bosnian and English with no mixed-language screens — this includes emails, notifications, and legal pages, not just UI chrome (ties directly to Chapter 23, Internationalization).
- The 3-second test for every screen: can the user tell where they are, what they can do, and what happens next? If not, the screen needs design work before it needs new features.
## CHAPTER 27 — Screen & Page Inventory (Complete Sitemap)

Every screen the platform needs, mapped to the rules already established in Chapters 2–26. This is what turns the business rules and UX standards into a concrete build list. Screens are grouped by app; "Access" states who can reach the screen.

### 27.1 Public (Unauthenticated)

| Screen | Purpose | Key Elements | Access |
|---|---|---|---|
| Homepage | Explain the platform, drive signup, surface popular categories/cities. | Hero, category grid, how-it-works, trust signals (ratings, completed jobs count), CTA to post a job or become a helper. | Public |
| Category page | SEO-indexable listing of open jobs or helpers in a category/city. | Filter/sort bar (Ch.15), job or helper cards (Ch.25.2), pagination. | Public |
| Public helper profile | Build trust before a customer applies/hires. | Photo, rating, completed jobs, verification badges, bio, reviews list. | Public |
| Login / Register | Email+password baseline, phone/social later (Ch.6). | Form, validation, links to password reset. | Public |
| Password reset | Self-service credential recovery. | Email entry → reset link flow. | Public |

### 27.2 Customer App

| Screen | Purpose | Key Elements | Access |
|---|---|---|---|
| Post a Job (wizard) | Create a job per Ch.2.4 fields. | Title, description, category, budget, location, payment type, preferred date, images (optional); step-by-step per Ch.4.8 form rules. | Customer |
| My Jobs (list) | All jobs the customer owns, grouped by status. | Status-filtered tabs matching the lifecycle in Ch.2.3 (Open/Assigned/In Progress/Completed/Archived/Expired/Cancelled). | Customer (own jobs) |
| Job Detail — Applications view | Review and select a helper. | Application cards (Ch.26.2) sortable per Ch.30.8, Accept/Reject actions, link to Compare Helpers (Ch.30.5). | Customer (own job) |
| Compare Helpers | Side-by-side comparison of applicants. | Rating, completed jobs, offer price, verification, response time, member since (Ch.30.5). | Customer (own job) |
| Hire Again | One-click rehire of a previous helper (Ch.30.7). | Prior helper summary, prior chat reference link, starts a new job/application flow. | Customer |
| Checkout (Secure Payment) | Stripe Checkout for the selected helper's price. | Price breakdown (job price, platform fee, total — Ch.10.9), Stripe embedded checkout. | Customer, post-selection |
| Job Detail — Assigned/In Progress | Track an active job. | Status badge (Ch.4.14), helper info, chat entry point, Mark Completed action (with confirmation). | Customer + assigned helper |
| Leave a Review | Rate the helper post-completion. | Star input, optional comment, submit. | Customer, job COMPLETED |
| Payment History | Every payment the customer has made. | Table per Ch.10.9/Ch.4.13 — ID, date, amount, status, refund, invoice download. | Customer (own records) |
| Report / Dispute | Escalate a problem (Ch.5.15). | Reason selector, evidence/description, submit to admin queue. | Customer, on an assigned/completed job |

### 27.3 Helper App

| Screen | Purpose | Key Elements | Access |
|---|---|---|---|
| Browse Jobs | Find work. | Search/filter bar (Ch.15), job cards, distance if enabled. | Helper |
| Job Detail — Apply | Submit an application. | Offered price input, optional message; for Cash jobs, a commitment-fee Stripe Checkout gate before the application is created (Ch.10.3). | Helper, job OPEN |
| My Applications | Track submitted applications. | Status per app (pending/accepted/rejected/withdrawn), withdraw action while pending. | Helper (own applications) |
| Active Job | Work an assigned job. | Chat entry point, job details, cannot mark completed (customer-only action per Ch.2.6/2.7). | Helper, assigned |
| Payouts & Stripe Onboarding | Connect a bank account, track earnings. | Stripe Connect Express onboarding flow (Ch.8.1), payout history, charges_enabled/payouts_enabled status banner. | Helper |
| My Profile (edit) | Manage public-facing profile. | Photo, bio, categories/skills, verification badge status. | Helper (own profile) |

### 27.4 Shared (Both Roles)

| Screen | Purpose | Key Elements | Access |
|---|---|---|---|
| Messages / Chat | Per-job conversation (Ch.12). | Message thread, read-only banner once job is COMPLETED, image support (future). | Customer + assigned helper on that job |
| Notification Center | All notifications (Ch.11/Ch.4.19). | Grouped by date, unread badge, mark-all-read, deep links. | Any authenticated user |
| Account Settings | Profile, security, notification preferences, language. | Email/phone, password change, notification channel toggles, BS/EN switch (Ch.23). | Any authenticated user |

### 27.5 Admin Dashboard

| Screen | Purpose | Key Elements | Access |
|---|---|---|---|
| Overview / Analytics | Year One metrics live (Ch.14, Volume 1 §1.10). | Registered users, completed jobs, avg rating, payment success rate, uptime — charts, not just numbers. | Admin |
| User Management | Suspend/ban, view profile, verification review. | Search/filter users, action buttons, verification document viewer. | Admin |
| Moderation Queue | Unified queue (Ch.14). | Flagged messages, pending verifications, reported profiles/jobs — one list, filterable by type. | Admin |
| Dispute Console | Resolve escalated jobs (Ch.5.15, Ch.10.8). | Job timeline (from admin_logs), full chat transcript, payment/commitment status, resolution actions (refund/release/split/ban), reason field required before submit. | Admin |
| Payments & Refunds | Financial oversight. | Searchable payment log, manual refund action (logged, Ch.10.8), payout status per helper. | Admin |
| Category Management | Edit categories without a deploy (Ch.14). | CRUD on categories, BS/EN name fields, icon, parent category. | Admin |
| Content Management | Homepage content, legal pages. | Rich text or block editor for homepage sections and legal/ToS pages. | Admin |
| Audit Log Viewer | Read-only view of admin_logs. | Filterable by actor, action, entity, date range — read-only, matches the append-only rule in Ch.10.8. | Super Admin |

## CHAPTER 28 — API Endpoint Specification

Concrete endpoint list implementing Chapter 5 (API Architecture). Routes not covered by Supabase's auto-generated PostgREST/client-SDK access (simple reads/writes governed by RLS) are listed here because they require server-side logic, a Stripe call, or a privileged check — i.e. they must be Edge Functions, not direct table access.

### 28.1 Auth & Profile

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/auth/verify-phone | Authenticated | Send/confirm phone OTP (Ch.6). |
| POST | /functions/v1/profile/request-verification | Authenticated (helper) | Submit ID/skill documents for verification_badges (Ch.4). |

### 28.2 Jobs & Applications

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/jobs | Customer | Create a job; enforces payment_type lock rule (Ch.10.1) and initial status = OPEN. |
| POST | /functions/v1/jobs/:id/cancel | Customer (pre-acceptance) or Admin (post-assignment) | Cancel per the rules in Ch.2.11 — admin approval required if ASSIGNED. |
| POST | /functions/v1/applications | Helper | Create an application; for Cash jobs, requires a succeeded commitment-fee payment first (Ch.10.3) — rejected server-side if the payment hasn't cleared. |
| POST | /functions/v1/applications/:id/accept | Customer (job owner) | Accepts one application, auto-rejects the rest, triggers escrow capture or confirms cash acceptance, creates the chat (Ch.2.6/2.7). |
| POST | /functions/v1/applications/:id/reject | Customer (job owner) or system (auto on accept) | Rejects an application; triggers automatic commitment-fee refund for Cash jobs (Ch.10.4). |
| POST | /functions/v1/jobs/:id/complete | Customer (job owner) | Marks COMPLETED; triggers escrow release to helper for Secure Payment jobs (Ch.10.2). |

### 28.3 Payments

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/payments/checkout-session | Customer | Creates a Stripe Checkout session for a Secure Payment job (Ch.8.2). |
| POST | /functions/v1/payments/commitment-fee-session | Helper | Creates a Stripe Checkout session for a Cash-job commitment fee (Ch.10.3). |
| POST | /functions/v1/webhooks/stripe | Stripe only (signature-verified) | Single entry point for all Stripe events; idempotent via stored event IDs (Ch.8.4). |
| GET | /functions/v1/payments/:id/invoice | Owner of the payment, or Admin | Generates/returns the PDF invoice (Ch.10.9). |

### 28.4 Chat & Notifications

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/messages | Customer or assigned helper on that job | Server-side check that the job is not COMPLETED (read-only rule, Ch.12) before allowing an insert. |
| POST | /functions/v1/notifications/mark-read | Authenticated | Bulk or single mark-as-read. |

### 28.5 Ratings & Reports

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/reviews | Customer or helper on a COMPLETED job | Creates a review; enforces the not-during-an-open-dispute rule (Ch.13). |
| POST | /functions/v1/reports | Customer or helper | Creates a report/dispute; lands in the admin moderation queue (Ch.27.5). |

### 28.6 Admin

| Method | Route | Auth / Role | Purpose |
|---|---|---|---|
| POST | /functions/v1/admin/disputes/:id/resolve | Admin | Applies a resolution (refund/release/split/ban); writes to the append-only financial audit trail (Ch.10.8). |
| POST | /functions/v1/admin/users/:id/suspend | Admin | Suspends/bans an account; logged to admin_logs. |
| POST | /functions/v1/admin/refunds | Admin | Manual refund outside the automatic triggers in Ch.10.4. |

Everything not listed above (browsing open jobs, reading a public profile, reading your own job list, reading your own payment history) is a direct Supabase client-SDK read governed by RLS — it does not need a dedicated Edge Function.

## CHAPTER 29 — Jobs, Categories & Marketplace Rules (Detailed)

Per Chapter 7 (Jobs, Categories & Marketplace Workflow) — this is the detail layer on top of the job entity introduced in Chapter 2 and the schema in Chapter 4, in the same way Chapter 10 was the detail layer for payments. Where this adds a new field or rule, the DB schema and screen inventory should be treated as amended accordingly.

### 29.1 Job Creation Fields & Limits

- Required fields: title, description, category, budget, payment type, location, date, time, urgency, contact preferences; photos optional (max 10, see 29.6).
- Title: max 100 characters, must clearly describe the task (e.g. "Assemble IKEA wardrobe", "Garden cleaning").
- Description: max 2,000 characters — what needs to be done, expected outcome, required experience, special instructions. AI-assisted description improvement is future scope, not current.
- Goal (Ch.7.28): a customer should be able to complete job creation in under 2 minutes, and a helper should be able to submit an application in under 30 seconds — these are UX acceptance criteria for the wizard in Chapter 27, not just aspirations.
### 29.2 Category Taxonomy

Initial category list (seed data for the categories table in Chapter 4) — admin-managed, so adding a category is a content change, never a code change:

- Cleaning · Moving · Furniture Assembly · Painting · Gardening · Electrical · Plumbing · Delivery · IT Support · Tutoring · Photography · Car Washing · Pet Care · Cooking · Child Care · Handyman · Shopping Assistance · Event Help · Business Support · Other
### 29.3 Budget Types

- A job's budget is one of three types: Fixed Price (e.g. 100 KM), Negotiable, or a Range (e.g. 300–500 KM) — this is a budget_type field on the job, not just a free-text price, and must always be displayed clearly and consistently with the type chosen.
### 29.4 Location Privacy

- Two-tier location model: an approximate location (city/neighbourhood) is shown to all helpers browsing OPEN jobs; the exact address is revealed only to the helper once assigned. GPS-precise location is future scope.
- This is a meaningful RLS implication for the jobs table in Chapter 4 — it likely needs separate location_approx and location_exact columns (or an exact-address column gated by a policy checking selected_helper_id), not a single address field with app-level hiding, since app-level-only hiding is bypassable via direct API access.
### 29.5 Urgency & "Help Now"

- Urgency options: Flexible, Scheduled (date/time/optional duration), Today, Tomorrow, Urgent ("Help Now").
- Urgent jobs get higher visibility in search ranking (Chapter 16) and should trigger a push notification to nearby/available helpers (Chapter 11) — this is a distinct, faster path: prioritize distance sorting, show only currently-available helpers, and streamline the application flow, since the goal is immediate assistance.
### 29.6 Job Photos

- Max 10 images per job, auto-compressed on upload (per the image storage rules in Chapter 4/Chapter 17), supported formats JPG/PNG/WEBP. Video is future scope.
### 29.7 Job Visibility

- Default and current scope: Public. Hidden and invite-only visibility are future scope and should not block current implementation.
### 29.8 Expiration & Renewal

- Confirms the 14-day OPEN-job expiration rule from Chapter 2.2, and adds: a reminder notification to the customer before expiration, and a Renew action on expired jobs.
- Renewing an expired job updates its publication date, search ranking, and expiration date (effectively a fresh 14-day window) — but previous applications remain archived rather than being revived or resubmitted automatically.
### 29.9 Search & Sort (extends Chapter 16)

- Filters: category, city, budget, urgency, distance, payment type, keyword.
- Sort options: newest, nearest, highest budget, lowest budget, urgency, most applications, and a "recommended" sort — the last of these implies a ranking function (recency + rating + urgency + completion rate) that should be specified concretely before implementation rather than left as a vague "smart sort."
### 29.10 Applications — Additional Field

- Applications include an estimated completion time in addition to offered price and message (Chapter 2.5) — this should be added to the applications table in Chapter 4 and surfaced on the application cards in Chapter 27. Applications remain editable by the helper until the customer decides.
### 29.11 Cancellations' Effect on Reputation

- Repeated cancellations (by either party) should reduce the profile's reputation score — cancellation rate is one input into the single unified reputation_score defined in Chapter 33.3, not a separate stored metric. This should factor into search ranking (29.9) and fraud monitoring (Chapter 10.7) rather than being purely cosmetic.
- Cancellation rules restated: customer may cancel before assignment freely; helper may withdraw before acceptance freely; any cancellation after assignment may require admin review (ties to the ASSIGNED→CANCELLED admin-approval rule in Chapter 2.2).
### 29.12 Marketplace Conduct Rules

- Prohibited: off-platform payment requests, spam, duplicate job postings, fake applications, misleading prices. Violations may result in suspension — these are additional, concrete triggers for the moderation queue and fraud monitoring in Chapters 14 and 10.7, not just abstract policy language.
### 29.13 Future Marketplace Features (not current scope)

- Recurring jobs, team jobs, business accounts, instant booking, AI helper matching, subscription plans, a nearby-helper map, and smart pricing suggestions — noted here so they're not accidentally designed into the current schema prematurely, per the future-scalability principle in Chapter 25 of building for growth without over-engineering ahead of need.
## CHAPTER 30 — Applications, Assignment & Hiring Workflow (Detailed)

Per Chapter 8 of the source material — the detail layer on top of the application rules already established in Chapter 2.5 and the schema in Chapter 4.

### 30.1 Eligibility to Apply

- Only verified helper accounts may apply — this is a stronger gate than previously drafted, where verification only gated payouts (Chapter 8/Stripe). Verification-to-apply must be checked server-side in the application-create endpoint (Chapter 28.2), not just surfaced as a UI warning.
- An application is rejected at creation if: the job is COMPLETED, CANCELLED, or EXPIRED; the job is already ASSIGNED; the helper is blocked or suspended; or the helper already has an active application on that job (the existing unique-constraint rule).
### 30.2 Application Status Lifecycle

- Five states, not four as earlier drafted: PENDING, ACCEPTED, REJECTED, WITHDRAWN, EXPIRED. The applications table in Chapter 4 should be updated to this full enum.
- EXPIRED applications occur when the underlying job expires, is cancelled, or is deleted by the customer while the application is still PENDING — these become read-only, same as the job itself.
### 30.3 Editing & Withdrawal

- A helper may edit offer price, message, and estimated completion time only while status = PENDING; editing is disabled the instant a decision (accept/reject) is made.
- Withdrawal is helper-initiated, sets status = WITHDRAWN, notifies the customer, and is permanent — a withdrawn application cannot be restored or resubmitted; the helper would need to submit a new application if the job is still OPEN.
### 30.4 Acceptance & Automatic Rejection

- The customer selects exactly one application; on acceptance, every other PENDING application on that job is automatically set to REJECTED in the same transaction — not as a separate follow-up step, to avoid a window where two applications could appear accepted.
- The full side-effect list on acceptance: selected_helper_id set on the job, the job removed from public search visibility, all other applications locked, notifications sent to both the accepted and rejected helpers, the chat created, and the job's timeline/audit entry updated (Chapter 10.8).
- The system must refuse to let a customer accept a WITHDRAWN, REJECTED, or EXPIRED application, or one from a since-suspended/blocked helper — this needs a server-side check at accept time, not just filtering what's shown in the UI, since the underlying row could still be reachable via a stale client state or direct API call.
### 30.5 Comparison View

- New screen: Compare Helpers — lets the customer view multiple applicants side by side on one screen (rating, completed jobs, offer price, verification status, response time, experience/member since; distance is future scope). This is additive to the Job Detail — Applications view already listed in Chapter 27.2, not a replacement for it — add it to the screen inventory as a secondary view reachable from that screen.
### 30.6 Trust Indicators

- Computed, display-only badges shown on application/helper cards: Top Rated, Verified, Fast Responder, Repeat Helper, New Helper (Elite Helper is future scope). These are distinct from the verification_badges table in Chapter 4, which represents actual reviewed ID/skill documents — trust indicators are derived at query/render time from rating, response-time, and history data, not stored as their own rows, and should not be confused with the verification system when implemented.
### 30.7 Repeat Hiring

- A one-click "Hire Again" action lets a customer quickly start a new job with a previously-used helper, with prior chat history remaining available for reference. This is a new, additive screen action, not a change to the core hiring flow — the new job still goes through the normal OPEN → application → acceptance path (or, if desired, could pre-fill an application from that helper, but does not skip the flow entirely, to preserve pricing/commitment-fee integrity).
### 30.8 Application Sorting — Reconciled

- The full, reconciled sort option set across the application list and comparison view is: Best Match, Lowest Price, Highest Rating, Fastest Response, Newest, Closest Distance (future, once geolocation is enabled) — this supersedes the shorter list in Chapter 2.5 and should be treated as the canonical set. "Best Match" is the same kind of ranking function flagged as needing a concrete formula in Chapter 29.9 ("Recommended") — the two should likely be unified into one specified ranking algorithm rather than built as two different vague "smart" sorts.
### 30.9 Contact-Info & Off-Platform Filtering

- Automatic filtering must strip or flag phone numbers, email addresses, and external-payment-request language from application messages — this extends the chat-moderation rule in Chapter 12 to apply at application-submission time too, not just in chat. Applications must never reveal personal contact information before acceptance.
### 30.10 Performance Targets

- Application submission: under 2 seconds, consistent with the general API budget in Chapter 17 but called out specifically here since it's core to the 30-second full-application goal in Chapter 29.1.
- New applications must appear to the customer via realtime updates (Supabase Realtime, Chapter 12) rather than requiring a manual refresh.
### 30.11 Future: AI Recommendations (not current scope)

- Recommending helpers to customers based on distance, ratings, category experience, completion rate, availability, past collaboration, and customer preferences — noted for the backlog, not to be designed into the current matching/search logic prematurely (same principle as Chapter 29.13).
## CHAPTER 31 — Chat & Communication System (Detailed)

Per Chapter 9 of the source material — the detail layer on top of Chapter 12 (Chat Architecture). Several points here correct rather than just extend what was drafted earlier.

### 31.1 Correction: Where Contact-Info Filtering Actually Applies

**This corrects a logical inconsistency in the original Chapter 12 draft: **chat is only ever created after acceptance (Ch.9.2), so there is no "chat before assignment" to filter — the filtering described there was really describing the application stage. Contact-info and off-platform-payment filtering (phone numbers, email addresses, social media usernames, external payment requests) applies to the application message before acceptance (Chapter 30.9), not to an in-progress chat. Once the chat exists, both parties are already matched, so this specific filter is not required inside chat — ongoing fraud monitoring (Chapter 10.7) still applies, but it is a different mechanism for a different purpose.

### 31.2 Participants & Admin Access

- Exactly two participants per chat: the customer and the accepted helper. Rejected helpers must never gain access, at any point, including after rejection.
- Administrators may access a chat only for moderation, fraud investigation, or dispute resolution — and every such access must be logged in the audit system (Chapter 10.8), same standard as any other privileged admin action.
### 31.3 Message Features & Ordering

- V1 scope: text messages, timestamps, chronological ordering (newest at bottom), auto-scroll to newest unread message. Image/voice/video/file/location sharing and voice/video calls are explicitly future scope — do not build these into the initial chat implementation.
- Messages are immutable once sent — no user-side editing. Deletion is admin-only, and only for legal or platform-policy reasons, logged the same as any admin action.
### 31.4 Read Status — Correction

**This corrects Chapter 26.4, which listed read state as future work: **per Chapter 9.6, every message has a status of Sent / Delivered / Read, and this is current scope, not future. Only a more granular "seen at" timestamp is future work. The chat UI (Chapter 26.4) and screen inventory (Chapter 27.4) should be treated as amended to include Sent/Delivered/Read now.

### 31.5 Reporting Messages

- Users may report an individual message (not just a whole job/chat) for spam, harassment, fraud, threats, scams, or illegal content — each report creates an admin case. This means the reports table in Chapter 4 likely needs an optional message_id column alongside job_id, since a report can be scoped to one message rather than the whole job.
### 31.6 Search Over Archived Conversations

- Archived chats remain searchable by helper, customer, job title, date, and message text — this is a real search feature (likely Postgres full-text search per Chapter 16), not just "messages are kept." AI-powered search is future scope.
### 31.7 File Sharing (future scope, but specified now)

- When built: photos, videos, documents, PDFs, receipts — with virus scanning, compression, file-type validation, and maximum size limits enforced before upload. Recording these requirements now avoids a rushed, under-specified implementation later.
### 31.8 Performance

- Message delivery target: under 1 second, with reliable delivery even through a temporary connection loss (Supabase Realtime reconnection/backfill, not just "hope the websocket stays up").
## CHAPTER 32 — Notification System (Detailed)

Per Chapter 10 of the source material — the detail layer on top of Chapter 11 (Notifications).

### 32.1 Correction: Current Delivery Channels

**This corrects Chapter 11, which treated SMS as current scope for OTP/critical alerts: **per Chapter 10.3, current scope is in-app and email only. Push notifications and SMS are both future work. Phone/OTP verification (Chapter 6) is a separate mechanism from the notification system and is not affected by this correction — but SMS as a notification delivery channel should not be built into the current scope.

### 32.2 Notification Types by Role

- Customer: new application, application withdrawn, application accepted, payment successful, job assigned, helper started work, job completed, review reminder, refund completed, job expiring.
- Helper: new recommended job, application accepted, application rejected, new message, payment received, commitment fee refunded, review reminder.
- Admin: reports, failed payments, webhook failures, fraud detection, new disputes, platform errors — this is the concrete trigger list for the monitoring/alerting requirements already established in Chapter 19.
### 32.3 Notification Data Model — Amendment

- Concrete fields (amending the notifications table in Chapter 4): notification id, user_id, title, description, type, related_job_id, related_user_id, created_at, read_status, action_url. Every notification must deep-link directly to the relevant screen via action_url, per Chapter 27.
- Read status is three states — Unread, Read, Archived — not a simple boolean read_at. Users can mark one as read, mark all as read, or delete a notification, with the unread badge updating instantly (realtime, consistent with Chapter 12/31's realtime approach).
- Priority levels — Low (informational), Medium (should review), High (action required), Critical (platform/payment issue) — determine notification styling and likely determine which channel(s) a notification goes out on.
### 32.4 Notification Center — Amendment

- Grouped specifically by Today / Yesterday / Earlier (not just "grouped by date" as drafted in Chapter 27.4), newest first, with search, filter, delete, and mark-all-read.
### 32.5 Email Rules

- Emails must be localized (Bosnian/English per Chapter 23), professionally branded, mobile-responsive, and include direct action buttons — not plain text links.
### 32.6 Future (not current scope)

- Push notifications, quiet hours, AI-generated summaries, digest emails, smart recommendations.
## CHAPTER 33 — Reviews, Ratings & Reputation System (Detailed)

Per Chapter 11 of the source material — the detail layer on top of Chapter 13 (Ratings & Reviews). This also reconciles two concepts that were drafted separately and turn out to be the same thing.

### 33.1 Review Immutability & Eligibility

- Reviews cannot be edited after submission — only an administrator may remove one. Only users who completed a verified job may submit a review, which is a concrete fraud-prevention gate (see 33.4) beyond just "job is COMPLETED."
- Review content fields (amending the reviews table in Chapter 4): star rating, written review (optional), completion date, reviewer display name, job category.
### 33.2 Review Visibility

- Public: star rating, written review, date, and the reviewer's first name only — not their full name. Private (admin-only): the internal reputation score (33.3), reports, disputes, and admin notes.
### 33.3 Reconciliation: Reputation Score Supersedes "Reliability Score"

**Chapter 29.11 introduced a "reliability_score" driven narrowly by cancellations. **Chapter 11 of the source material describes a broader internal reputation score composed of completed jobs, review average, cancellation rate, response time, reports, and disputes, and payment reliability. These are the same underlying concept — treat the Chapter 33 version as canonical and the Chapter 29.11 cancellation-driven score as one input into it, not a second, separate stored field. The profiles table (Chapter 4) should have one reputation_score, not two competing scores.

- This score is internal/private — it powers search ranking and future recommendations, but is never shown directly to other users (only its effects, via trust badges and search position, are visible).
### 33.4 Trust Badges — Reconciled List

- Canonical badge list (superseding the shorter set in Chapter 30.6): Top Rated, Fast Responder, Verified Identity, Verified Stripe, Experienced Helper, Repeat Customer, Trusted Business, Elite Helper (future). These are computed/derived at render time, not stored rows, consistent with the distinction already drawn in Chapter 30.6 between trust indicators and the verification_badges table.
### 33.5 Fraud Prevention

- Prevent: self-reviews, duplicate reviews, fake accounts, review exchanges (two accounts trading positive reviews), and review spam. Only a verified, completed job creates review eligibility — this should be a hard server-side check on the review-creation endpoint (Chapter 28.5), not a UI-level assumption.
- Profanity and offensive language in written reviews should be filtered automatically, consistent with the content-moderation approach already established for chat (Chapter 31) and applications (Chapter 30.9).
### 33.6 Future (not current scope)

- Photo/video reviews, AI-generated review summaries, verified work photos, a customer-side recommendation score (the inverse of helper reputation, i.e. helpers rating customers in aggregate).
## CHAPTER 35 — Administration Dashboard (Detailed)

Per Chapter 12 of the source material — the detail layer on top of Chapter 14 (Admin Architecture).

### 35.1 Correction: Four Admin Roles, Not Two

**This corrects Chapter 14/28, which only distinguished Admin and Super Admin: **there are four tiers — Support Agent (reply to users, view reports, handle contact requests), Moderator (suspend users, remove reviews, remove jobs, handle disputes), Finance Administrator (view payments, issue refunds, review Stripe transactions), and Super Administrator (full access to everything). Every admin-only endpoint in Chapter 28 should check against this specific role set, not a single generic "admin" flag.

- 2FA is required for all administrator accounts (not future/optional) — this is stricter than the general user authentication in Chapter 6, where 2FA is future scope for regular users. Admin sessions also need shorter timeouts, IP logging, and confirmation prompts before sensitive actions (refunds, bans, resolutions).
### 35.2 Dashboard Widgets

- Active users, jobs today, payments today, revenue, pending reports, pending refunds, disputes, new registrations, and platform/system health: API status, Stripe status, Supabase status, Realtime status — this is the concrete widget set for the Overview screen in Chapter 27.5.
### 35.3 Expanded Management Capabilities

- User management adds: reactivate (distinct from unsuspend if suspension has a duration), reset verification, and view trust/reputation score (Chapter 33.3) directly on the user record.
- Job management adds: delete fraudulent jobs, restore a deleted job, and feature a job — the last of these is the first concrete admin surface for the "featured listings" future revenue stream noted in Chapter 2.3, so the entitlements/featured concept should be modeled with this admin action in mind even before the feature ships.
- Payment management adds: retry a failed webhook manually — a necessary escape hatch alongside the automatic idempotent retry logic in Chapter 8.4.
- Review moderation is broader than "remove" alone (Chapter 33.1): hide, remove, restore, and flag-for-review, plus visibility into AI spam-detection signals when that exists.
- Content management scope: categories, FAQ, homepage, Terms, Privacy Policy, Help Center, announcements, and featured jobs — all editable without a deploy, consistent with Chapter 14's existing no-code-change principle.
## CHAPTER 36 — Customer Support & Ticketing System

Per Chapter 13 of the source material. This is a new subsystem — none of the preceding chapters modeled a support ticket as its own entity, distinct from a job dispute (Chapter 10.8/14) or a user report (Chapter 30/31.5).

### 36.1 Contact & Routing

- Contact form: name, email, subject, message required; job ID, payment ID, category, attachments optional (attachments are future scope).
- Current routing: all support requests to sredi.ba@outlook.com. A dedicated support platform/inbox is future scope — this is a real current-state detail worth confirming against the live inbox during the codebase audit, not something to silently replace with a new ticketing UI without checking how support is actually staffed today.
### 36.2 Ticket Data Model (new table: support_tickets)

- Fields: ticket id, user_id, subject, message, optional job_id/payment_id/category, status (Open/Waiting for Customer/In Progress/Resolved/Closed), priority (Low/Normal/High/Critical — auto-assigned by issue type), assigned_agent_id, created_at, updated_at, resolution_notes.
- Response-time targets: 24 hours standard, 4 hours for critical payment issues, immediate for platform outages — these are the SLA figures that should drive the priority auto-assignment logic.
### 36.3 Help Center & FAQ

- Help Center article topics: payments, creating jobs, applying, Stripe, cash payment, refunds, chat, reviews, account settings, privacy, safety. Content-managed per Chapter 35.3, no code changes required.
### 36.4 Dispute Handling via Support

- Disputes raised through support (payments, fraud, job quality, abuse, harassment) draw on the same evidence sources already established — chat transcript, payment records, job timeline, review history (Chapter 10.8) — and the decision is permanently logged the same way. This chapter's ticket system is the intake path; Chapter 14's dispute console is where it gets resolved for job-related disputes specifically.
### 36.5 Post-Resolution & KPIs

- After ticket closure, users may rate support 1–5 stars with optional feedback — a distinct rating system from the job reviews in Chapter 33, not to be merged with helper/customer ratings.
- Support KPIs to track: average response time, resolution time, customer satisfaction, reopened-ticket rate, first-contact resolution, agent performance — feed these into the analytics chapter (39).
- Future: live chat, an AI support assistant, voice/video support, screen sharing, automatic translation.
## CHAPTER 37 — Search, Discovery & Matching (Detailed)

Per Chapter 14 of the source material — the detail layer on top of Chapter 16 (Search Architecture), and the point where the sort-option lists drafted three separate times (Chapter 2.5, Chapter 29.9, Chapter 30.8) finally need one canonical answer.

### 37.1 Final Reconciliation: Two Separate Sort Specs, Not One

**The repeated, slightly-different sort lists across this document were actually describing two different things that needed to be told apart: **sorting JOBS (used by helpers browsing for work) and sorting HELPERS/APPLICATIONS (used by customers comparing applicants). Canonical from here on:

- Job sort (helper-facing): Newest, Closest, Highest Budget, Lowest Budget, Urgency, Recommended.
- Helper/application sort (customer-facing): Highest Rating, Most Completed Jobs, Fastest Response, Closest Distance, Lowest Price, Recommended (a.k.a. "Best Match" in Chapter 30.8 — same ranking function, one name going forward).
- The "Recommended" ranking function still needs to be concretely specified (inputs: recency, rating, urgency/response time, completion rate, distance) before implementation — this remains the one open item flagged since Chapter 29.9, now scoped to two ranking functions (job-recommended, helper-recommended) rather than one.
### 37.2 Search & Filters

- Global search: job title, category, keyword, city, helper name, service type (natural-language search, e.g. "I need someone to move my sofa today," is future scope).
- Helper-side job filters: category, budget, distance, urgency, payment type, newest/oldest, location (future: verified/repeat/business customer).
- Customer-side helper filters: category, rating, completed jobs, verification, distance, languages, availability, price, experience. Languages and availability are new profile-level fields not previously specified — profiles likely need a languages array and some availability representation (even a simple weekly-hours field for V1) to support this filter.
### 37.3 Saved Searches (new table: saved_searches)

- Users can save a search and receive notifications when matching jobs appear, new helpers become available, or prices change — this is a genuinely new feature requiring its own table (user_id, filter criteria as JSON, created_at) and a background job to evaluate saved searches against new listings, not just a notification trigger on existing events.
### 37.4 Favorites — Confirmed

- Confirms the favorites table already in Chapter 4: customers save helpers, helpers save jobs, synced across devices (i.e. server-stored, not local-only).
### 37.5 Smart Recommendations (near-term, not deep AI)

- Recommended/Recently Hired/Popular/Nearby/Top Rated helpers for customers; Recommended/Nearby/Urgent/Similar/Recently Viewed jobs for helpers. These read as simpler query-based surfacing (e.g. "recently viewed" is just a view-history table) rather than the deeper AI Matching described in 37.6 — worth building as straightforward queries first rather than waiting on an AI system.
### 37.6 AI Matching (future, not current scope)

- Future recommendation inputs: category experience, ratings, distance, response time, completion rate, cancellation rate, prior collaboration, availability, reputation score (Chapter 33.3). Voice search, an AI search assistant, image search, and predictive search are also future scope.
### 37.7 Search Performance

- Target: under 300ms — tighter than the general 500ms API budget in Chapter 17, since search is the highest-frequency interaction on the platform. Results must paginate and stay fast independent of total database size (Chapter 17's cursor-pagination and indexing rules apply directly here).
## CHAPTER 38 — Security & Fraud Prevention (Additional Rules)

Per Chapter 15 of the source material. Mostly reinforces Chapters 15 (Security) and 10.7 (Fraud Detection) already drafted; genuinely new items only are listed here to avoid repeating what's already covered.

- 2FA, biometric login, and passkeys are future scope for regular user accounts — this is distinct from the admin-only 2FA requirement in Chapter 35.1, which is current scope, not future.
- Additional fraud signals beyond Chapter 10.7's list: rapid account creation (many accounts in a short window from similar signals) and suspicious IP addresses specifically as their own monitored signal, not just folded into "VPN abuse."
- Rate limiting scope confirmed to include registration and support-ticket creation, in addition to login, application submission, and messaging already listed in Chapter 15.
- Prohibited-content enforcement (fake jobs, fake applications, fake reviews, spam messages, harassment, illegal content) triggers administrator alerts — ties directly into the Chapter 35 moderation queue and Chapter 32 admin notification types.
## CHAPTER 39 — Analytics, Reporting & Business Intelligence

Per Chapter 16 of the source material. This is the concrete metrics layer behind the Overview/Analytics screen in Chapter 27.5 and the dashboard widgets in Chapter 35.2 — genuinely new detail, not previously specified at this depth.

### 39.1 Customer & Helper Analytics

- Per-customer: jobs created/completed, average spend, favorite categories, average response time, repeat-helper rate, completion rate, cancelled jobs.
- Per-helper: applications sent, acceptance rate, completed jobs, average rating, revenue earned, average response time, repeat-customer rate, cancellation rate, profile views.
### 39.2 Platform KPIs & Financial Reports

- Platform-wide: MAU, DAU, customer/helper retention, average time-to-assignment, average time-to-completion, revenue per user, platform commission, dispute rate, refund rate.
- Financial reports (daily/weekly/monthly/yearly revenue, Stripe fees, platform commission, refund totals, outstanding payments, invoices, payout reports) should be generated from the payments/refunds tables in Chapter 4, not tracked as a separate parallel ledger.
### 39.3 Marketplace Health & Growth

- Marketplace health: jobs without applications, applications per job, average offer price, most/least popular categories, peak activity hours, highest-demand cities — this is the concrete data behind tuning the category taxonomy (Chapter 29.2) and understanding where the marketplace is thin.
- Growth: registrations, verifications, deleted/suspended accounts, returning users (referral-source tracking is future scope).
### 39.4 Admin Reports & Export

- Exportable reports (fraud, support, disputes, payments, reviews, performance, platform stability) as CSV, Excel, and PDF — an admin-facing export capability distinct from the customer/helper-facing invoice PDFs in Chapter 10.9.
- Future: AI-driven insights — busy-period prediction, revenue forecasting, demand spikes, churn prediction, recommended pricing/categories.
## CHAPTER 40 — Internationalization & Localization (Expanded)

Per Chapter 17 of the source material — the detail layer on top of Chapter 23 (Internationalization).

- Confirmed V1 languages: Bosnian and English only. Expanded future-language list beyond Volume 1's expansion markets: Croatian, Serbian, German, Swedish, Danish, Norwegian, Slovenian — the Scandinavian/German additions reflect the Bosnian diaspora, not just the Balkan expansion geography in Chapter 25/44, worth keeping distinct from the market-expansion phases when prioritizing.
- Language preference is changeable before login, after login, or in settings, and is stored permanently per user — not just a session-level toggle.
- Translation scope is total: navigation, buttons, forms, validation, notifications, emails, errors, chat UI, profile pages, the admin dashboard, Help Center, FAQ, legal documents, payment pages, and support — no partially-translated surface.
- Date/time, not just text, must localize: date format, time format, relative time ("today", "2 hours ago"), and timezone.
- SEO localization per language: URLs, metadata, sitemap, Open Graph tags, and structured data (extends Chapter 22).
- Quality bar: no machine-translated placeholder text ships to production; translations should read as natural to native speakers, with consistent terminology platform-wide.
- Localization must not break accessibility (Chapter 26.5) — labels, screen-reader compatibility, and keyboard navigation must hold in every supported language.
## CHAPTER 41 — Legal, Compliance & GDPR

Per Chapter 18 of the source material. This is a new area — prior chapters mentioned BiH data-protection law in passing (Chapter 15) but did not specify the concrete legal/consent framework. As before: legal compliance items should be reviewed with actual legal counsel, not implemented purely from this document.

### 41.1 Consent & Acceptance

- Every user must accept Terms of Service, Privacy Policy, Cookie Policy, and Community Guidelines, with the acceptance timestamp stored permanently — this needs its own table or columns (e.g. a user_consents table logging which document version was accepted and when), since "accepted ToS" without a version/timestamp is not legally defensible if terms change later.
- Cookie categories: Necessary, Analytics, Marketing (future), Preferences — users choose which non-essential categories to accept.
### 41.2 GDPR / BiH Data Protection Rights

- Users must be able to: export their data, delete their account, update personal data, withdraw consent, manage cookie preferences, and download their account information — these are concrete, user-facing account-settings features, not just backend capabilities.
- Data retention: inactive accounts and financial records retained per applicable legal/tax requirements (specific durations need legal confirmation); deleted-user PII anonymized where legally possible rather than hard-deleted, consistent with the soft-delete design rule in Chapter 4.1.
### 41.3 Platform Liability & Responsibilities

- Sredi.ba is positioned as a marketplace facilitator (discovery, communication, payments, trust) — explicitly not the employer of helpers. This framing has real implications for terms-of-service language and should be reviewed by counsel, not just implemented as-is from this bullet.
- User responsibilities: customers must provide accurate job descriptions, pay agreed amounts, and treat helpers respectfully; helpers must apply honestly, complete agreed work, respect customer property, and follow applicable law.
- Prohibited activities (expanded from Chapter 29.12): fraud, spam, fake jobs/applications, harassment, discrimination, illegal services, off-platform payment solicitation, selling illegal products, money laundering — immediate suspension for severe violations, distinct from the graduated moderation response for lesser violations.
- IP ownership: the Sredi.ba brand/logo/software remain platform property; users retain ownership of content they upload but grant the platform a license to display it (e.g. job photos, profile photos).
- Regular compliance reviews (privacy, security, payment, legal documentation, platform policies) should be a scheduled process, not an ad hoc one.
## CHAPTER 42 — SEO & Performance (Concrete Targets)

Per Chapter 19 of the source material — this sharpens the general performance goals in Chapter 17 and the SEO goals in Chapter 22 into specific, measurable targets.

- Core Web Vitals targets (supersede the general "under 2 seconds" page-load figure in Chapter 17 with the real metrics): Largest Contentful Paint under 2.5s, First Input Delay under 100ms, Cumulative Layout Shift under 0.1, PageSpeed score 90+, mobile performance prioritized over desktop.
- Every public page needs: a unique title, meta description, canonical URL, Open Graph tags, Twitter Card tags, Schema.org structured data, and inclusion in the XML sitemap and robots.txt — this is the concrete per-page SEO checklist behind Chapter 22.
- URL structure examples confirmed: /jobs, /jobs/sarajevo, /jobs/moving, /helpers, /profile, /categories — clean, descriptive, human-readable paths, consistent with the localized-slug approach in Chapter 22.
- Code optimization: minimize JS, code-split, tree-shake, lazy-load, and avoid duplicated components/logic — restates the no-duplication rule from Chapter 3.1 as a performance concern, not just a maintainability one.
- Future: CDN, image CDN, edge caching, predictive loading, offline support, Progressive Web App, native mobile apps.
## CHAPTER 43 — Production Readiness & Launch Checklist

Per Chapter 20 of the source material. This is a pre-launch verification checklist, distinct from the ongoing implementation roadmap in Chapter 62 — the roadmap is about reconciling and fixing the existing live platform; this chapter is what "ready to launch" means for any major release, including the eventual outcome of that roadmap.

### 43.1 Functional, Payment & Security Checklists

- Functional: registration, login, password reset, profile editing, job create/edit/delete, applications, helper selection, Stripe Checkout, cash payment, refunds, Stripe Connect, chat, notifications, ratings, reports, contact form, language switching, search, filters, admin dashboard — every one of these needs an explicit end-to-end test, not just a code-complete status.
- Payment-specific: successful payment, failed payment, cancelled payment, duplicate payment, webhook retry, refund, commitment fee, Stripe Connect payout, dispute, chargeback — this is the acceptance-test list for everything specified in Chapters 8–10.
- Security: RLS policies, authentication, authorization, environment variables/secrets, webhook signatures, rate limiting, input validation, file-upload validation, spam protection — maps directly to Chapters 6, 7, and 15.
### 43.2 Mobile, Performance & SEO Checklists

- Cross-device/browser: iPhone, Android, Safari, Chrome, Edge, Firefox, tablet, desktop, landscape, portrait.
- Performance: page load <2s, API <500ms, search <300ms, chat latency <1s — the consolidated targets from Chapters 17, 37.7, and 31.8.
- SEO: Google Search Console and Bing Webmaster set up, sitemap, robots.txt, structured data, canonical URLs, metadata, Open Graph, favicon, web app manifest.
- Monitoring enabled before launch: analytics, error logging, webhook monitoring, database monitoring, performance monitoring, security alerts — not turned on after the fact.
### 43.3 Launch Strategy

- Staged rollout: soft launch → friends & family → closed beta → public beta → official launch → continuous improvement. Never launch with unfinished payment functionality — this is a hard gate, not a target.
## CHAPTER 44 — Long-Term Product Vision & Roadmap

Per Chapter 21 of the source material. This is the multi-year product/market vision — distinct from Chapter 25 (Future Scalability, a technical-architecture concern) and Chapter 62 (the near-term implementation-priority roadmap for reconciling with the live codebase). None of this should be designed into the current build prematurely; it is listed so future work has a stable reference point.

- Geographic expansion: Phase 1 BiH (current) → Phase 2 Croatia/Serbia/Montenegro → Phase 3 North Macedonia/Slovenia/Kosovo → Phase 4 broader European expansion — consistent with, and slightly extending, the phases in Volume 1 §1.3.
- Mobile apps: native iOS and Android, offline support, push notifications, biometric login, location sharing.
- AI features: job-description generation, helper matching (Chapter 37.6), fraud detection, support assistant (Chapter 36.5), translation, pricing suggestions, search, moderation.
- Business features: business accounts, subscriptions, recurring jobs, invoice management, employee accounts, company verification, business analytics.
- Trust features: identity verification, background checks, insurance verification, professional certifications, an Elite Helper program, a repeat-customer program.
- Financial features: instant payouts, multi-currency (Chapter 10.9), business billing, gift cards, wallet/credits, coupons, campaigns.
- Community features: following helpers, favorite categories, achievements/badges (distinct from the trust badges in Chapter 33.4), a leaderboard, referral program, loyalty rewards.
- Technical roadmap: Progressive Web App, native apps, microservices (only if/when justified per Chapter 25's anti-over-engineering principle), CDN, global scaling, AI infrastructure, advanced monitoring, disaster recovery.
- Additional future category confirmed by a second source chapter (39): Enterprise Features, alongside the business/trust/financial/community features above — kept vague intentionally in the source material, so no specific enterprise capability should be assumed or designed for yet.
## CHAPTER 46 — Database Architecture (Additional Rules)

Per Chapter 22 (Volume 3) — mostly confirms Chapter 4; genuinely new items only, to avoid repetition.

- New tables (audit_logs, support_tickets, ticket_messages, saved_searches, system_settings, countries/cities, languages/translations) have been added directly to the Chapter 4 schema table rather than repeated here.
- Invalid state transitions should be rejected by the database itself where feasible (check constraints or triggers), not just application logic — explicit examples given: a COMPLETED job cannot become OPEN again, a REJECTED application cannot become ACCEPTED, a REFUNDED payment cannot become RELEASED. This is a stronger requirement than "the API validates this" — it means the database is the last line of defense against an invalid state, consistent with the RLS-first philosophy in Chapter 7.
- Concrete scale targets: the schema should support 10 million users, 50 million jobs, and 500 million messages without structural redesign — useful as a sanity check against the indexing and pagination strategy in Chapters 4.1 and 17, not just an aspiration.
## CHAPTER 47 — API Architecture (Additional Rules)

Per Chapter 23 (Volume 3) — the detail layer on top of Chapter 5 and Chapter 28's endpoint list.

- Standardized response envelope (new requirement, apply to every endpoint in Chapter 28): success responses return { success: true, message, data, metadata, timestamp }; failures return { success: false, error_code, error_message, request_id, timestamp }. A request_id on every error response makes support/debugging traceable back to a specific request.
- Additional endpoint capabilities not previously listed: duplicate a job, reopen an archived/expired job, nearby-jobs and recommended-jobs queries (Chapter 37), report a review, get average rating, and admin resolve-report/dashboard-analytics/audit-log endpoints.
- Future API surfaces (not current scope): a dedicated Maps API, Recommendation API, Search API, Business API, Subscription API, Referral API — these track the long-term vision in Chapter 44, not near-term work.
## CHAPTER 48 — Row Level Security & Authorization (Confirmed)

Per Chapter 24 (Volume 3) — this confirms the RLS approach already established in Chapter 7 table-by-table, with one rule not previously stated explicitly:

- A reported user must have zero access to the report filed against them — only the reporter and admins can see it. This should be added explicitly to the reports table RLS policy (Chapter 4), since it's easy to accidentally allow a reported user to see (and potentially retaliate based on) a report through a poorly scoped policy.
- Everything else in Chapter 24 — profiles (read public, write own only), jobs (customer owns, helpers read OPEN only), applications (own only, customer sees own job's applications), messages (customer+accepted helper+admin only), reviews (public read, author create, admin moderate, no edits), payments (own only, admin all), notifications (strictly own), audit logs (admin-only, immutable), and the four-tier admin role hierarchy (Chapter 35.1) — is a direct confirmation of what's already specified, not new.
## CHAPTER 49 — Realtime Architecture

Per Chapter 26 (Volume 3). Realtime was previously mentioned per-feature (chat in Ch.31.8, applications in Ch.30.10) but not consolidated as its own concern — this chapter is that consolidation.

- Full realtime event set: new applications, new messages, notifications, job assignment, payment status changes, refund status changes, review submitted, and profile updates — every one of these should push via Supabase Realtime rather than requiring a manual refresh or poll.
- Principles: low latency, reliable delivery, automatic reconnect after a dropped connection, offline recovery (catching up on missed events once reconnected), and duplicate-event prevention — the last of these is the same idempotency discipline already required for Stripe webhooks (Chapter 8.4), applied to realtime delivery too.
- Future: a live map / helper location tracking, typing indicator (already future scope per Chapter 31.3), presence detection, online status.
## CHAPTER 50 — Storage, Images & File Management

Per Chapter 27 (Volume 3) — concrete detail behind the scattered image-handling rules in Chapters 15 and 29.6.

- Provider: Supabase Storage, encrypted, CDN-enabled, with private buckets where required and automatic backups.
- Bucket structure: avatars/, jobs/, verification/, support/, chat/, documents/ — backups kept separate from production buckets.
- Privacy split: public buckets for profile and job images; private (signed-URL-only) for identity/verification documents, invoices, support attachments, and admin documents. This mirrors the location-privacy split in Chapter 29.4 — public-by-default content vs. content that needs an access check before it's served.
- Processing on upload: resize, compress, optimize, generate thumbnails, convert to WEBP where supported, while retaining the original where required (e.g. verification documents shouldn't be lossy-recompressed).
- Validation: max file size, allowed MIME types, extension check; virus scanning is future scope but file-type/size validation is not — reject malicious uploads at the current stage, don't wait for AV integration to do basic validation.
- Cleanup: automatically remove unused uploads, temporary files, abandoned uploads, and expired verification documents — this needs a scheduled job, not just a manual admin cleanup task.
- Future: AI image moderation, automatic blurring, duplicate detection, OCR, document verification.
## CHAPTER 51 — Email & Communication Services (Detailed)

Per Chapter 28 (Volume 3) — extends the email rules already in Chapter 32.5.

- Fuller email type list, adding two not previously listed: Admin Warning and Account Suspension — both are moderation-triggered emails (Chapter 35) and need their own templates, not a generic "account update" email.
- Branding: logo, platform colors, a clear CTA button, footer, support contact — consistent with the professional-branding requirement already in Chapter 32.5.
- Deliverability infrastructure (new, concrete requirement): SPF, DKIM, and DMARC records configured for the sending domain, plus bounce handling and spam-rate monitoring — without these, transactional email (password resets, payment receipts) risks landing in spam, which is a real trust and functional problem for a payments platform.
- Future: marketing automation, reminder campaigns, AI-assisted email writing, behavior-triggered emails.
## CHAPTER 52 — Logging, Monitoring & Incident Management (Detailed)

Per Chapter 29 (Volume 3) — extends Chapters 18 (Logging) and 19 (Monitoring) with a structured incident-response process that wasn't previously specified.

- Incident levels: Level 1 (informational) through Level 4 (critical outage). Every incident gets an owner, a timeline, a root-cause writeup, a resolution, and a postmortem — this is a real process requirement, not just "log the error."
- Recovery behavior: automatic retry where possible, graceful degradation (the platform stays partially usable during a partial outage rather than failing completely), a manual override path for admins, and an emergency maintenance mode.
- Additional monitored resources beyond Chapter 19: email deliverability, storage health, memory/CPU/disk usage on the application layer itself, not just the managed services (Stripe/Supabase) sitting behind it.
- Future: AI anomaly detection, predictive monitoring, fully automatic recovery.
## CHAPTER 53 — Deployment, Infrastructure & DevOps (Detailed)

Per Chapter 30 (Volume 3) — extends Chapter 24 (Deployment) with concrete infrastructure choices that should be confirmed against the real setup during the codebase audit, not assumed.

- Stated infrastructure: frontend on Vercel, backend on Supabase, payments on Stripe, storage on Supabase Storage — dedicated monitoring integration is future scope. This is a specific, checkable claim — confirm it matches the actual hosting setup rather than assuming it, since a mismatch here would affect several other chapters (CDN behavior, environment variable management, deploy pipeline).
- Environments: Development, Testing, Staging, Production — one more stage (a distinct "Testing" environment between local dev and Staging) than the three-environment model in Chapter 3.3; reconcile which is actually in use.
- Rollback target: under 5 minutes — a concrete SLA on top of the general "revertible within minutes" language in Chapter 24.
- Release process: developer → pull request → review → testing → staging → approval → production → monitoring. This should be the literal gate sequence enforced by branch protection rules, not just a description of intent.
- Future infrastructure: CDN, additional Edge Functions, global regions, microservices, containerization/Kubernetes, a dedicated analytics platform — all consistent with the anti-over-engineering principle in Chapter 25 (don't build these ahead of actual need).
- Independent confirmation (Chapter 38 of the source material, a separate summary chapter): the same stack — Next.js frontend, Vercel hosting, Supabase backend, Stripe payments — plus GitHub as the repository, with SSL and a custom domain as explicit requirements. Two independent chapters agreeing on this stack raises confidence it's accurate, but it is still unverified against the actual live deployment.
## CHAPTER 54 — Design Language & Component System (Detailed)

Per Chapter 31 (Volume 4) — the detail layer on top of Chapter 26 (UX/UI Standards).

- Design priority order, when trade-offs are necessary: Trust, then Usability, then Speed, then Beauty, then Animations — never sacrifice usability for aesthetics. This is a decision-making hierarchy, not just a values statement, and should be the tiebreaker in any design review disagreement.
- Expanded design token set (beyond the color list in Chapter 26.1): primary, secondary, success, warning, danger, info, background, surface, border, text-primary, text-secondary, disabled, hover, focus — these should be centralized (e.g. Tailwind theme config, per the stack in Chapter 3.1) and never hardcoded per-component.
- Border radius, shadows (three elevation levels: small/medium/large, used only to communicate hierarchy, never decoratively), and a responsive 12-column grid with a maximum content width — new concrete layout system detail.
- Icons: a single icon library, consistent size and stroke width, always paired with a label where clarity matters (ties to the accessibility requirement in Chapter 26.5).
- Buttons: the variant set is Primary, Secondary, Ghost, Danger, Success — Ghost and Success are additions to the three variants in Chapter 26.2. Every button needs hover, focus, pressed, disabled, and loading states, not just the loading-state requirement already noted.
- Forms: the full control set is input, textarea, select, checkbox, radio, toggle, date picker, time picker, and image upload — wider than the general "forms are short and validate immediately" rule in Chapter 26.2.
- Navigation: top navigation, bottom navigation (mobile), sidebar (desktop), breadcrumbs, search, profile menu, notification center — reconciles with the simpler nav list in Chapter 26.4 by adding the responsive nav-pattern split (bottom nav on mobile, sidebar on desktop).
- Modals: used only when necessary, never interrupting flow unnecessarily; every modal has a title, description, primary action, secondary action, close button, and ESC-key support.
- Cards now explicitly include Support Tickets as a card type, alongside jobs/helpers/applications/messages/notifications/payments/reviews (Chapter 26.2) — add this to the Chapter 36 support screens.
- Motion: fast, smooth, purposeful, never distracting, with a maximum duration around 300ms — a concrete animation budget where Chapter 26 only said "avoid unnecessary animations."
## CHAPTER 56 — Complete Screen Specification (Detailed)

Per Chapter 32 of the source material — extends the screen inventory in Chapter 27 with page-level detail and a few screens not previously listed.

- Registration uses separate First Name / Last Name fields (not a single display-name field as loosely implied earlier), plus distinct Terms and Privacy checkboxes rather than one combined acceptance — ties to the per-document consent tracking in Chapter 41.1.
- New screen: a Dashboard/Home distinct from the "My Jobs" list — customer dashboard shows active/completed jobs, applications, messages, notifications, payments, reviews, stats, and quick actions in one overview; helper dashboard shows recommended jobs, applications, assigned/completed jobs, revenue, ratings, messages, and stats. Add both to Chapter 27.2/27.3 as the landing screen after login, ahead of the more specific list views.
- Create Job should auto-save the draft every few seconds — a concrete UX requirement for the wizard in Chapter 27.2, not just "has a draft status".
- Job Details adds Share and Save (favorite) actions alongside Apply/Report, confirming the favorites table (Chapter 4) is reachable directly from the job page, not only from a separate favorites list.
- Helper Profile shows availability directly on the profile (ties the availability field added in Chapter 37.2) and exposes Hire Again from the profile itself, not only from job history.
- Settings screen scope confirmed: general, account, notifications, privacy, language, payments, verification, and Delete Account — the last of these is the concrete UI surface for the GDPR account-deletion right in Chapter 41.2, and must actually be reachable from settings, not just technically possible via support request.
- New screens: dedicated error pages (404, 500, Maintenance, Offline, Payment Failed, Unauthorized, Forbidden) and success pages (payment successful, application submitted, profile updated, review submitted, refund completed, verification complete) — every one needs an explanation, a primary action, a return-home option, and (for errors) a contact-support link.
## CHAPTER 57 — UI Component Library (Detailed)

Per Chapter 33 of the source material — extends Chapter 54 with the full component-level detail.

- Buttons add Outline and Warning variants and an Icon Button, alongside the Primary/Secondary/Ghost/Danger/Success set already in Chapter 54; a Floating Action Button is future scope.
- Inputs add currency, search, and autocomplete as distinct input types beyond the general form-control list in Chapter 26.2/54; every input needs validation, error/success states, placeholder, helper text, and a character counter where length limits apply (e.g. the 100/2000-char limits in Chapter 29.1).
- Cards add an Analytics Card to the set already listed in Chapter 26.2/54 (job/helper/application/notification/review/payment/support-ticket).
- Tables (admin-only: payments, users, reports, support tickets, analytics) need sorting, filtering, pagination, search, export, and a responsive layout — export ties directly to the CSV/Excel/PDF requirement in Chapter 39.4.
- Badges consolidate status/trust/verification indicators across the platform into one component family: Verification, Top Rated, Elite Helper, Business, New, Urgent, Completed, Assigned, Cancelled, Expired, Payment Status — color-coded consistently, reusing the status-badge colors already defined in Chapter 26.1 and the trust badges in Chapter 33.4.
- New component family: status indicators (Online, Offline, Busy, Away, Available, Unread, Verified, Payment Pending, Payment Complete), each with an icon, color, and label — this is the concrete UI for the future presence/online-status feature flagged in Chapter 49, so build the component now but gate the online/offline/busy/away states behind that feature shipping.
- Avatars support a profile photo, initials fallback, group avatar, a verified-badge overlay, an online-status ring, and a generic fallback avatar.
- Alerts: success, info, warning, danger, critical — each should explain the issue, offer a next step, and remain dismissible unless it's blocking (e.g. a payment-in-progress warning).
- Progress components add circular progress, upload progress, and payment progress to the skeleton/spinner loading states already specified in Chapter 26.3; timeline components (for job progress, payment progress, support tickets, disputes, and order history) show timestamp, status, description, and the responsible user per event.
- Form-control additions: country/city/language/category selector components — the direct UI for the reference tables added in Chapter 46 (countries/cities/languages/categories).
- Search components add recent searches, suggested searches, search history, and a clear-all action to the saved-searches feature in Chapter 37.3.
- Component-level rule: every new component must support localization, mobile, and accessibility, be reusable/documented/tested, and — as a new, explicitly future requirement — dark mode. No component ships as a one-off; reuse an existing one or extend the shared library.
- Design tokens confirmed to include z-index and breakpoints alongside the color/typography/spacing/shadow/radius/animation-timing tokens already listed in Chapter 54 — every component consumes tokens, never hardcoded values.
## CHAPTER 58 — Mobile UX Specification (Detailed)

Per Chapter 34 of the source material — extends Chapter 26.5's mobile-first requirement with concrete device, gesture, and performance detail.

- Device coverage is more granular than the four breakpoints in Chapter 26.5: iPhone SE/Mini/Standard/Plus/Pro/Pro Max, Android small/medium/large, tablet, both orientations — treat the earlier pixel breakpoints as the technical implementation of this fuller device list, not a competing spec.
**Reconciling the bottom-nav tab count: **the mobile bottom navigation is a condensed 5-tab bar — Home, Jobs, Messages, Notifications, Profile — while the fuller navigation list in Chapter 26.4 (Home, Find Help, Find Work, Messages, Notifications, Profile, Menu) is the complete set. "Find Help"/"Find Work" and secondary items should fold under Home or a Profile/Menu entry point on mobile, rather than the bottom bar trying to carry all seven items.

- Gestures: tap, long-press, pull-to-refresh, swipe-back navigation, pinch-to-zoom on images; swiping between tabs is future scope.
- Mobile forms: correct keyboard type per field (numeric for prices, email keyboard for email, phone keypad for phone numbers), autocomplete enabled, auto-capitalization disabled where it would hurt (e.g. email fields).
- Mobile chat: sticky message input that stays above the keyboard, keyboard-aware layout resizing, an unread-message separator line in the thread.
- Mobile performance target: 60 FPS animations, fast cold-start time, minimal JS payload, background/lazy loading — a stricter, mobile-specific companion to the general Core Web Vitals targets in Chapter 42.
- Offline behavior (future): view cached jobs/messages, automatic reconnect, automatic retry of failed requests, and a visible offline banner — not silent failure.
- Native-app preparation: the current web architecture should not preclude camera access, GPS, biometric login, offline storage, and deep linking later — worth keeping in mind for the native-app phase in Chapter 44, without building any of it prematurely now.
## CHAPTER 59 — User Journeys & Experience Flows (Confirmed)

Per Chapter 35 of the source material. The customer, helper, and cash-payment journeys confirm the flows already specified in Chapters 2.6/2.7 and 8.13 — restated here only where they add something not already captured:

- Review journey confirms that once both parties have rated each other, the reputation score (Chapter 33.3) is recalculated — this is an explicit trigger point worth implementing as a direct consequence of the second review being submitted, not a periodic batch job.
- Support and dispute journeys confirm the ticket/evidence/decision flow already in Chapters 36 and 14 — the contact form creates a ticket, which either resolves directly or escalates to the admin dispute console using the same evidence sources (chat, payments, timeline, review history).
- Notification journey confirms the event → generate → store → realtime deliver → email (if applicable) → read → archive pipeline already specified across Chapters 32 and 49.
- Every completed workflow should end with a confirmation, a summary, and a clear next action — this is the same principle already stated for success screens in Chapter 56, restated here as a cross-cutting UX rule rather than a per-screen one.
## CHAPTER 60 — Testing & Quality Assurance

Per Chapter 37 of the source material — this specifies test TYPES for the first time; Chapter 21 (Development Standards) required that features be tested, but not what kinds of tests that means.

- Required test types: unit tests, integration tests, end-to-end tests, load testing, security testing, payment-specific testing, and regression testing — payment testing should cover the full checklist already in Chapter 43.1, and regression testing exists specifically to catch the "don't break working features" failure mode this document has repeatedly emphasized.
- Standing rule, restated as a testing-specific commitment: critical bugs are always fixed before new features are built, and this is enforced by test suite results blocking a release, not just a stated preference.
## CHAPTER 61 — Platform Manifest & Final Principles

Per Chapter 40 of the source material, marked "END OF PLATFORM BIBLE v1.0" — this appears to be the closing chapter of the full source specification. It restates, as a single authoritative list, principles that have been applied piecemeal throughout this document; captured here as the capstone reference rather than re-derived.

- 25 platform principles (source-numbered): trust before growth; security before convenience; simplicity before complexity; mobile first; performance first; accessibility matters; every feature must solve a real problem; never duplicate functionality; never break existing features; keep the architecture scalable; every payment must be traceable; every important action must be logged; every workflow must have clear user feedback; fix bugs before building new features; reuse existing components whenever possible; maintain a single source of truth for all data; support Bosnian and English everywhere; design for millions of users, not hundreds; prioritize maintainability over shortcuts; always protect user privacy; automate repetitive processes; minimize manual administration; build features that create long-term value; keep the user journey simple; think long-term in every architectural decision.
- Development rules: never redesign a working system without a valid technical reason; preserve backward compatibility whenever possible; database integrity is critical; security is mandatory, not optional; documentation must stay updated; production stability always takes priority over new functionality; code must be readable, modular, and testable; all new functionality must support localization; every release must improve the platform.
**Note on source completeness: **since this chapter is explicitly marked as the end of the source "Platform Bible," this may be the last of the source chapters. If so, this blueprint now reflects the complete specification as provided, reconciled internally chapter-by-chapter — the only remaining step is checking it against the actual live codebase.

## CHAPTER 62 — Prioritized Implementation Roadmap

This roadmap assumes the platform is already live. It is intentionally generic where it must be — the real, ordered task list can only be finalized once this blueprint is reconciled against the actual codebase, schema, and Stripe/Supabase dashboards. Treat this as the shape of the plan, not a substitute for that audit.

### CRITICAL

| Priority | Item | Area | Why |
|---|---|---|---|
| CRITICAL | Reconcile this blueprint against the real repo, schema, and Stripe config | Foundational | Nothing below can be safely sequenced until we know what actually exists vs. what's assumed here |
| CRITICAL | Verify Stripe webhook signature checking is present on every webhook route | Security / Payments | Unverified webhooks are a direct payment-fraud vector |
| CRITICAL | Confirm RLS is enabled and correct on every table holding payment or PII data | Security | A single missing policy can expose all users' data via direct API calls |
| CRITICAL | Audit current job lifecycle for orphaned/stuck states | Business logic | Stuck jobs directly cause disputes and revenue loss |
| CRITICAL | Confirm webhook idempotency (processed-event dedup) is implemented | Payments | A redelivered Stripe event must never double-charge or double-refund |
| CRITICAL | Confirm every payment row maps cleanly to the 8-state enum (Chapter 10.5) with no undefined states | Payments | An undefined payment state is unresolvable from the admin console and a direct source of lost revenue |
| CRITICAL | Confirm escrow release only happens on completion confirmation or admin dispute resolution — never on acceptance | Payments / Escrow | Releasing funds early breaks the core trust guarantee of Secure Payment jobs (Chapter 10.2) |
| CRITICAL | Confirm accept-application endpoint rejects WITHDRAWN/REJECTED/EXPIRED applications and suspended/blocked helpers server-side | Business logic / Security | A stale client or direct API call must not be able to force an invalid acceptance (Chapter 30.4) |
| CRITICAL | Confirm admin permission checks distinguish Support Agent / Moderator / Finance Administrator / Super Administrator, not a single generic admin flag | Security / Admin | A flat admin role would let a Support Agent issue refunds or a Moderator view raw payment data — real privilege-escalation risk (Chapter 35.1) |
| CRITICAL | Confirm 2FA is actually enforced on all administrator accounts | Security | Admin accounts are the highest-value target on the platform; this is stated as required, not optional (Chapter 35.1) |
| CRITICAL | Confirm invalid state transitions (e.g. COMPLETED→OPEN, REJECTED→ACCEPTED, REFUNDED→RELEASED) are rejected at the database level, not just in application code | Data integrity | App-level-only validation is bypassable via direct API/DB access; this needs a check constraint or trigger (Chapter 46) |

### HIGH

| Priority | Item | Area | Why |
|---|---|---|---|
| HIGH | Centralize audit logging for all admin and payment state changes | Admin / Trust & Safety | Required for defensible dispute resolution |
| HIGH | Confirm double-blind rating release logic matches spec | Trust & Safety | Prevents retaliatory reviews, a common early-stage marketplace failure |
| HIGH | Verify cash-job disclosure copy is clear that the job amount is not escrowed | Legal / Trust | Reduces dispute volume and legal exposure |
| HIGH | Confirm helper payout gating on Stripe charges_enabled / payouts_enabled | Payments | Prevents attempting payouts to unverified accounts |
| HIGH | Confirm verification-to-apply is enforced server-side, not just as a UI gate | Security / Trust | An unverified helper applying anyway would undermine the whole verification system (Chapter 30.1) |
| HIGH | Extend contact-info/off-platform-payment filtering to application messages, not just chat | Trust & Safety / Revenue | Applications are an unfiltered text field today per the source spec — a real revenue-leak vector (Chapter 30.9) |
| HIGH | Confirm review eligibility is gated server-side to verified, completed jobs only | Trust & Safety | Prevents fake/self/exchanged reviews from ever being created, not just hidden after the fact (Chapter 33.5) |
| HIGH | Confirm a support-ticket record exists per contact-form submission with SLA-driven priority | Support | Without a ticket entity, response-time SLAs (24h/4h/immediate) are unmeasurable and unenforceable (Chapter 36.2) |
| HIGH | Confirm ToS/Privacy/Cookie acceptance is logged with a document version and timestamp, not a boolean | Legal / Compliance | A boolean "accepted ToS" is not legally defensible once terms change (Chapter 41.1) |
| HIGH | Confirm reported users have zero read access to reports filed against them | Security / Privacy | An easy RLS-policy mistake to make, and one that enables retaliation against the reporter (Chapter 48) |
| HIGH | Confirm SPF/DKIM/DMARC are configured for the sending domain | Deliverability | Without these, password resets and payment receipts risk landing in spam — a functional issue, not just a compliance one (Chapter 51) |

### MEDIUM

| Priority | Item | Area | Why |
|---|---|---|---|
| MEDIUM | Notification preference center | Notifications | Reduces churn from notification fatigue |
| MEDIUM | SEO server-rendering audit on public job/category/profile pages | Growth | Organic acquisition matters for CAC at this stage |
| MEDIUM | Cursor-based pagination on job listings and chat | Performance | Prevents future degradation as volume grows toward Year One targets |
| MEDIUM | Unified moderation queue in admin | Admin | Currently likely scattered; consolidation reduces moderation latency |
| MEDIUM | Audit status badges / empty states / error states against Chapter 26 spec | UX/UI | Cheap, high-visibility fixes that directly affect perceived trust and polish |
| MEDIUM | Reconcile Chapter 27 screen inventory and Chapter 28 API endpoint list against the real app's routes and Edge Functions | Foundational | Identifies missing screens/endpoints and any that exist but aren't in this spec |
| MEDIUM | Implement location_approx / location_exact split with RLS gating exact address to selected_helper_id | Security / Trust | Currently likely a single address field with only app-level hiding, which is bypassable via direct API access (Ch.29.4) |
| MEDIUM | Job renewal flow for expired jobs | Marketplace | Directly affects repeat job-posting rate and customer retention |
| MEDIUM | Add languages and availability fields to helper profiles for search filtering | Search / Profile | Customer-side helper filters can't function without these fields existing (Chapter 37.2) |
| MEDIUM | Verify Core Web Vitals against real targets (LCP<2.5s, FID<100ms, CLS<0.1, PageSpeed 90+) | Performance / SEO | Concrete, measurable targets — worth checking with real tooling rather than assuming they're met (Chapter 42) |
| MEDIUM | Confirm actual hosting matches the stated Vercel/Supabase/Stripe infrastructure | Foundational | Several other chapters (CDN, env-var management, deploy pipeline) depend on this being accurate (Chapter 53) |
| MEDIUM | Set up scheduled cleanup for unused/temporary/abandoned uploads and expired verification documents | Storage | Storage cost and clutter grow unbounded without this (Chapter 50) |
| MEDIUM | Confirm a Delete Account flow exists and is reachable from Settings, not just via support request | Legal / GDPR | This is the concrete UI surface for the account-deletion right in Chapter 41.2 — a real, user-facing gap if missing (Chapter 56) |

### LOW

| Priority | Item | Area | Why |
|---|---|---|---|
| LOW | English localization pass beyond UI strings | i18n | Needed for expansion markets, not urgent for BiH-only phase |
| LOW | Read replica for admin analytics | Scalability | Only matters once write load is measurably impacted |
| LOW | Country/market dimension on categories & commission rules | Future expansion | Cheap to add now, expensive later, but not urgent pre-expansion |
| LOW | Featured listings / entitlements table | Monetization | Future revenue stream per Volume 1, not required for core marketplace function |
| LOW | Unified reputation_score and "Recommended" search-ranking function | Marketplace / Search | Valuable but needs a concretely specified formula before implementation (Ch.33.3, 29.9), not urgent to build first |
| LOW | Dark mode support across the component library | UX/UI | Explicitly future scope in the source material (Chapter 57) — build components token-driven now so this is additive later, not urgent to build first |

### 62.1 Working Method From Here

- Next step: share repo access (via Claude Code with the cloned repository, or by uploading key files/schema exports here) so the CRITICAL items can be audited against reality rather than assumed.
- Once audited, we work one CRITICAL/HIGH item at a time — confirm the bug or gap is real, fix it, verify, then move to the next.
- No existing working feature gets redesigned without a specific technical reason documented at the time.
***END OF VOLUME 2***
