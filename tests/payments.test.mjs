/**
 * Payment rule and money-math tests.
 *
 * Run with: npm test
 *
 * These cover the logic that must not regress and that cannot be checked by a
 * successful build: currency conversion, commission and commitment-fee maths,
 * and every authorization rule guarding the movement of money.
 *
 * They deliberately do NOT cover the Stripe API round-trip or the database —
 * those need a live test-mode key and a Supabase connection. See docs/audit.md
 * for the manual acceptance test that covers them.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  kmToStripeMinorUnits,
  commissionMinorUnits,
  commitmentFeeKm,
  KM_PER_EUR,
} from "../lib/money.js";

import {
  canPayForJob,
  canApplyWithCommitment,
  canAcceptCashOffer,
  canReleaseEscrow,
} from "../lib/paymentRules.js";

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

test("KM converts to EUR minor units at the fixed peg, not 1:1", () => {
  process.env.STRIPE_CURRENCY = "eur";

  // The original bug: 100 KM was charged as EUR 100 (~196 KM).
  const minor = kmToStripeMinorUnits(100);

  assert.equal(minor, Math.round((100 / KM_PER_EUR) * 100));
  assert.equal(minor, 5113);
  assert.notEqual(minor, 10000, "100 KM must not be charged as EUR 100");
});

test("KM maps 1:1 to minor units when charging in BAM", () => {
  process.env.STRIPE_CURRENCY = "bam";

  assert.equal(kmToStripeMinorUnits(100), 10000);
  assert.equal(kmToStripeMinorUnits(35.5), 3550);
});

test("an unsupported currency is rejected rather than silently mischarged", () => {
  process.env.STRIPE_CURRENCY = "usd";

  assert.throws(() => kmToStripeMinorUnits(100), /Unsupported STRIPE_CURRENCY/);

  process.env.STRIPE_CURRENCY = "eur";
});

test("non-positive and non-numeric amounts are rejected", () => {
  process.env.STRIPE_CURRENCY = "bam";

  for (const bad of [0, -1, null, undefined, "abc", NaN]) {
    assert.throws(() => kmToStripeMinorUnits(bad), /Invalid amount/);
  }
});

test("commission is 10% and stays an integer", () => {
  assert.equal(commissionMinorUnits(10000), 1000);
  assert.equal(commissionMinorUnits(5113), 511);
  assert.equal(Number.isInteger(commissionMinorUnits(3333)), true);
});

test("commitment fee is exactly 10% of the offered price (Ch.10.3)", () => {
  // The two worked examples given in the blueprint.
  assert.equal(commitmentFeeKm(100), 10);
  assert.equal(commitmentFeeKm(35), 3.5);

  assert.equal(commitmentFeeKm(99.99), 10);
  assert.throws(() => commitmentFeeKm(0), /Invalid offered price/);
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOMER = "cust-1";
const HELPER = "help-1";

const openSecureJob = {
  id: "job-1",
  owner_id: CUSTOMER,
  status: "open",
  price: 100,
  payment_type: "secure",
  selected_helper_id: null,
};

const openCashJob = { ...openSecureJob, payment_type: "cash" };

const pendingApplication = {
  id: "app-1",
  job_id: "job-1",
  helper_id: HELPER,
  offered_price: 120,
  status: "pending",
};

const payableHelper = {
  id: HELPER,
  is_helper: true,
  is_blocked: false,
  stripe_account_id: "acct_123",
  stripe_payouts_enabled: true,
};

// ---------------------------------------------------------------------------
// Secure payment: hiring
// ---------------------------------------------------------------------------

test("a valid secure hire is allowed and prices from the offer, not the job", () => {
  const verdict = canPayForJob({
    job: openSecureJob,
    application: pendingApplication,
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, true);
  // 120 from the offer, not 100 from the job budget.
  assert.equal(verdict.amountKm, 120);
});

test("only the task owner can pay", () => {
  const verdict = canPayForJob({
    job: openSecureJob,
    application: pendingApplication,
    helperProfile: payableHelper,
    actorId: "someone-else",
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 403);
});

test("a job that is already assigned cannot be paid for again (Ch.10.6)", () => {
  for (const job of [
    { ...openSecureJob, status: "assigned" },
    { ...openSecureJob, selected_helper_id: HELPER },
    { ...openSecureJob, status: "completed" },
  ]) {
    const verdict = canPayForJob({
      job,
      application: pendingApplication,
      helperProfile: payableHelper,
      actorId: CUSTOMER,
    });

    assert.equal(verdict.ok, false, `expected refusal for status ${job.status}`);
  }
});

test("stale offers cannot be accepted server-side (Ch.30.4)", () => {
  for (const status of ["withdrawn", "rejected", "expired", "accepted", "pending_payment"]) {
    const verdict = canPayForJob({
      job: openSecureJob,
      application: { ...pendingApplication, status },
      helperProfile: payableHelper,
      actorId: CUSTOMER,
    });

    assert.equal(verdict.ok, false, `expected refusal for offer status ${status}`);
  }
});

test("an offer belonging to a different job is refused", () => {
  const verdict = canPayForJob({
    job: openSecureJob,
    application: { ...pendingApplication, job_id: "other-job" },
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 404);
});

test("a helper who cannot receive payouts cannot be hired (Ch.8.3)", () => {
  const verdict = canPayForJob({
    job: openSecureJob,
    application: pendingApplication,
    helperProfile: { ...payableHelper, stripe_payouts_enabled: false },
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
  assert.match(verdict.error, /Stripe verification/);
});

test("a blocked helper cannot be hired", () => {
  const verdict = canPayForJob({
    job: openSecureJob,
    application: pendingApplication,
    helperProfile: { ...payableHelper, is_blocked: true },
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
});

test("a cash job cannot be paid through the secure checkout", () => {
  const verdict = canPayForJob({
    job: openCashJob,
    application: pendingApplication,
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
});

test("a job with no usable price is refused rather than charged zero", () => {
  const verdict = canPayForJob({
    job: { ...openSecureJob, price: null },
    application: { ...pendingApplication, offered_price: null },
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
});

// ---------------------------------------------------------------------------
// Cash payment: applying and accepting
// ---------------------------------------------------------------------------

test("a helper can apply to an open cash task", () => {
  const verdict = canApplyWithCommitment({
    job: openCashJob,
    helperProfile: payableHelper,
    actorId: HELPER,
  });

  assert.equal(verdict.ok, true);
});

test("you cannot apply to your own task", () => {
  const verdict = canApplyWithCommitment({
    job: openCashJob,
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 403);
});

test("a non-helper account cannot apply (Ch.30.1 server-side gate)", () => {
  const verdict = canApplyWithCommitment({
    job: openCashJob,
    helperProfile: { ...payableHelper, is_helper: false },
    actorId: HELPER,
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 403);
});

test("no commitment fee applies on a secure task", () => {
  const verdict = canApplyWithCommitment({
    job: openSecureJob,
    helperProfile: payableHelper,
    actorId: HELPER,
  });

  assert.equal(verdict.ok, false);
});

test("an unpaid (pending_payment) offer cannot be accepted on a cash task", () => {
  const verdict = canAcceptCashOffer({
    job: openCashJob,
    application: { ...pendingApplication, status: "pending_payment" },
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, false);
});

test("a paid, pending offer can be accepted on a cash task", () => {
  const verdict = canAcceptCashOffer({
    job: openCashJob,
    application: pendingApplication,
    helperProfile: payableHelper,
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, true);
});

test("a cash helper does not need Stripe payouts enabled — they are paid in cash", () => {
  const verdict = canAcceptCashOffer({
    job: openCashJob,
    application: pendingApplication,
    helperProfile: { id: HELPER, is_blocked: false },
    actorId: CUSTOMER,
  });

  assert.equal(verdict.ok, true);
});

// ---------------------------------------------------------------------------
// Escrow release — the rules that guard money leaving the platform
// ---------------------------------------------------------------------------

const completedJob = { ...openSecureJob, status: "completed" };

const succeededPayment = {
  id: "pay-1",
  status: "Succeeded",
  amount_minor: 5113,
  commission_minor: 511,
  currency: "eur",
  payee_id: HELPER,
};

test("the customer releases escrow after confirming completion", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: succeededPayment,
    helperProfile: payableHelper,
    actor: { id: CUSTOMER },
  });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.payoutMinor, 4602);
});

test("escrow is NOT released while the job is merely assigned (Ch.10.2)", () => {
  for (const status of ["open", "assigned", "in_progress"]) {
    const verdict = canReleaseEscrow({
      job: { ...openSecureJob, status },
      payment: succeededPayment,
      helperProfile: payableHelper,
      actor: { id: CUSTOMER },
    });

    assert.equal(verdict.ok, false, `escrow must not release on status ${status}`);
  }
});

test("a stranger cannot release someone else's escrow", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: succeededPayment,
    helperProfile: payableHelper,
    actor: { id: "attacker" },
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 403);
});

test("a finance admin can release on an uncompleted job (dispute resolution)", () => {
  const verdict = canReleaseEscrow({
    job: { ...openSecureJob, status: "in_progress" },
    payment: succeededPayment,
    helperProfile: payableHelper,
    actor: { id: "admin-1", admin_role: "finance_admin" },
  });

  assert.equal(verdict.ok, true);
});

test("support agents and moderators cannot move money (Ch.35.1)", () => {
  for (const role of ["support_agent", "moderator", "", null]) {
    const verdict = canReleaseEscrow({
      job: { ...openSecureJob, status: "in_progress" },
      payment: succeededPayment,
      helperProfile: payableHelper,
      actor: { id: "admin-1", admin_role: role },
    });

    assert.equal(verdict.ok, false, `role ${role} must not release funds`);
  }
});

test("release is idempotent — an already-released payment is a no-op", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: { ...succeededPayment, status: "Released" },
    helperProfile: payableHelper,
    actor: { id: CUSTOMER },
  });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.alreadyReleased, true);
});

test("a refunded or disputed payment cannot be released", () => {
  for (const status of ["Refunded", "Disputed", "Failed", "Pending", "Cancelled"]) {
    const verdict = canReleaseEscrow({
      job: completedJob,
      payment: { ...succeededPayment, status },
      helperProfile: payableHelper,
      actor: { id: CUSTOMER },
    });

    assert.equal(verdict.ok, false, `must not release a ${status} payment`);
  }
});

test("funds are not released to a helper Stripe cannot pay", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: succeededPayment,
    helperProfile: { ...payableHelper, stripe_payouts_enabled: false },
    actor: { id: CUSTOMER },
  });

  assert.equal(verdict.ok, false);
});

test("a missing payment is reported rather than transferring zero", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: null,
    helperProfile: payableHelper,
    actor: { id: CUSTOMER },
  });

  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 404);
});

test("commission never exceeds the amount, so payout is never negative", () => {
  const verdict = canReleaseEscrow({
    job: completedJob,
    payment: { ...succeededPayment, amount_minor: 500, commission_minor: 500 },
    helperProfile: payableHelper,
    actor: { id: CUSTOMER },
  });

  assert.equal(verdict.ok, false);
});
