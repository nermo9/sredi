<!--
HOW TO USE THIS FILE

1. Save this as `docs/handoff.md` in your sredi.ba repository, alongside
   `docs/blueprint.md` (the full 62-chapter technical specification from
   an earlier session — if you don't have that file yet, ask for it too).

2. Open Claude Code in the repository, then start with a prompt like:

   "Read docs/handoff.md and docs/blueprint.md. Handoff.md has the
   current live status and what to do first. Blueprint.md is the full
   spec. Start with the 'Immediate Next Steps' section in handoff.md."

3. Claude Code will audit the real codebase against this and report
   back before changing anything — per the working principles below.
-->

# Sredi.ba — Session Handoff for Claude Code

This document summarizes everything established in a prior planning session
(business rules, architecture, and live debugging) so a fresh Claude Code
session can pick up exactly where things left off — without re-discovering
context or re-diagnosing what's already known.

---

## 1. Working Principles (apply to everything below)

- **Audit before changing.** Confirm each item below is still accurate
  against the real code before acting on it — this document describes
  the state as of the last session, not a guarantee of the current state.
- **Never redesign a working system without a specific technical reason.**
- **Fix confirmed bugs before adding new features.**
- **One item at a time — verify, then move to the next.**
- **Preserve backward compatibility.**

---

## 2. Infrastructure Facts (confirmed via live Vercel/Stripe access)

- **Repository:** `nermo9/sredi` on GitHub, `main` branch.
- **Vercel:** Team `nermo9s-projects`. **Two projects exist** —
  - `sredi-v2` (`prj_FILxDElr2rY2RnF0LmlYQa2XwVfV`) — **this is the correct,
    active one.** It has the real custom domains attached:
    `sredi.ba` and `www.sredi.ba`.
  - `sredi` (`prj_9lyKWo4lxUg3AmQ1ahlwsBx0QLpY`) — older project, only has
    `.vercel.app` subdomains, no custom domain. Likely safe to ignore/retire,
    but confirm with the site owner before deleting anything.
- **Domain:** sredi.ba is owned by the site owner and already correctly
  pointed at the `sredi-v2` Vercel project. This part of "going live" is
  done.
- **Deployment protection:** SSO/Vercel Authentication is enabled but scoped
  to `all_except_custom_domains` — meaning the public custom domain
  (sredi.ba) is **not** password/SSO-walled, only the internal
  `*.vercel.app` preview URLs are. This is the correct setup; don't change it.
- **Stripe account:** `acct_1TzcBIQPiiDypE16` ("sredi.ba"), operating in
  **test mode** during this debugging session — no real money was at risk.

---

## 3. Stripe Integration — Debugging History & Current Status

Recent commit history on `main` showed a real struggle getting Stripe
Connect working, including several failed builds ("Fix Stripe checkout",
"Fix Stripe Account ID" both errored at one point) before later commits
("Fix Stripe import", "Debug Stripe", "Debug application") got the build
passing again. A build passing does **not** mean the Stripe flow itself
was working end-to-end — three distinct runtime bugs were found:

### 3.1 Stripe Connect was not enabled on the platform account
**Symptom:** `"You can only create new accounts if you've signed up for
Connect"` error on every attempt to onboard a helper.
**Status: the site owner has since enabled Connect at
dashboard.stripe.com/connect.** Needs re-verification that helper
onboarding now actually completes end-to-end.

### 3.2 Stripe Accounts v1 vs v2 API mismatch
**Symptom:** `"Stripe no longer recommends Accounts v1 for new Connect
integrations"` — the codebase creates Connect accounts using the older
v1 API (`stripe.accounts.create`), but new Stripe platforms default to
requiring v2.
**Status: UNRESOLVED.** Two options, in order of effort:
  - **Quick fix:** enable "Accounts v1 support" at
    `dashboard.stripe.com/settings/features/feat_accounts_v1_support` —
    unblocks the existing v1 code immediately.
  - **Proper fix (do this eventually, not necessarily now):** migrate the
    Connect account-creation code to the v2 Accounts API
    (`POST /v2/core/accounts`). This is real code work — locate the
    account-creation route (likely something like
    `app/api/stripe/connect/route.js` or similar) and update it.
  - **Action for Claude Code:** find the relevant file(s), check whether
    v1 support was enabled as a stopgap, and if not, prioritize doing so
    (or migrating the code) before testing further.

### 3.3 Malformed `STRIPE_SECRET_KEY` environment variable
**Symptom:** `"An error occurred with our connection to Stripe... Invalid
character in header content [Authorization]"` on the checkout route —
classic symptom of a stray whitespace/newline in the env var value.
**Status: the site owner has since deleted and re-pasted the key cleanly
in Vercel, and redeployed.** Needs re-verification.

### 3.4 A separate, already-fixed build error (for reference only)
One earlier deployment (`dpl_9JNNvj4vqoQsqt6wbf9ZQM196y4A`, commit "Fix
Stripe Account ID") failed to build due to a plain JavaScript syntax
error in `app/page.js` — a missing/misplaced closing brace before a
`const { data: helperProfile } = await supabase...` statement. This was
superseded by later successful commits, so it's very likely already
fixed — just worth a quick look if `app/page.js` still shows anything
odd near a Supabase helper-profile lookup.

### 3.5 Immediate next steps for Stripe
1. Confirm the three fixes above (3.1, 3.3) actually took effect — check
   the latest deployment's runtime logs for the same error signatures.
2. Resolve 3.2 (v1/v2 Accounts API) if not already done.
3. Run a full test-mode helper onboarding end-to-end: create application →
   commitment fee checkout → Connect account creation → verification →
   payout eligibility. This is the real acceptance test — passing the
   build is not enough.
4. Only after test-mode works cleanly: consider flipping to live Stripe
   keys, following the launch checklist in blueprint.md Chapter 43.

---

## 4. Design / Frontend Status

A homepage redesign (real photography via Higgsfield, live job feed,
scroll animations, a video hero moment) was built and delivered **as a
standalone HTML mockup file** during the planning session. It was
**never integrated into the actual Next.js codebase** — it exists only
as a reference/inspiration file, not as deployed code.

**If the site owner wants this design live:** it needs to be translated
into the actual Next.js components in this repo (matching the existing
component structure, replacing or extending whatever the current homepage
route renders) — this is a real, from-scratch implementation task, not a
copy-paste, since the mockup was plain HTML/CSS/JS and this app is Next.js.
Ask the site owner whether this is in scope for the current work, or a
later task.

---

## 5. Reference: Full Specification

`docs/blueprint.md` (62 chapters, provided separately) is the complete
business/technical specification for the platform — database schema, API
architecture, payment flows, admin dashboard, UX standards, and a
prioritized CRITICAL→LOW implementation roadmap in its final chapter.
Treat it as the target-state spec to reconcile the real codebase against,
not as a description of confirmed current behavior.

**Recommended order of work:**
1. Do the Stripe verification steps in Section 3.5 above first — that's
   the most time-sensitive, already-diagnosed issue.
2. Then move to `blueprint.md`'s final chapter (Prioritized Implementation
   Roadmap), starting with CRITICAL items, auditing each against the real
   code before making changes.
3. Revisit the homepage design (Section 4) only once the above is stable,
   and only if the site owner confirms it's wanted now.
