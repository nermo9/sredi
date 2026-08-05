/**
 * Pure payment authorization rules.
 *
 * These are the guard chains that used to live inline in each route handler.
 * Extracted so they can be tested without a database, a Stripe key or a running
 * server — the rules are the part that must not regress, and route handlers are
 * awkward to test directly.
 *
 * Every function takes plain objects and returns { ok } or
 * { ok: false, error, status }. No I/O, no side effects.
 */

export const FINANCE_ROLES = ["finance_admin", "super_admin"];

function deny(error, status = 409) {
  return { ok: false, error, status };
}

const ALLOW = { ok: true };

/**
 * Ch.10.2 / Ch.30.4 — hiring a helper on a Secure Payment task.
 */
export function canPayForJob({ job, application, helperProfile, actorId }) {
  if (!job) return deny("Task not found.", 404);

  if (job.owner_id !== actorId) {
    return deny("Only the task owner can pay for this task.", 403);
  }

  if ((job.payment_type || "secure") !== "secure") {
    return deny(
      "This task uses Cash Payment — there is nothing to pay through the platform."
    );
  }

  if (job.status !== "open" || job.selected_helper_id) {
    return deny("This task is no longer open for hiring.");
  }

  if (!application || application.job_id !== job.id) {
    return deny("Offer not found for this task.", 404);
  }

  if (application.status !== "pending") {
    return deny("This offer can no longer be accepted.");
  }

  if (!helperProfile) return deny("Helper not found.", 404);

  if (helperProfile.is_blocked) return deny("This helper is not available.");

  if (!helperProfile.stripe_account_id) {
    return deny(
      "This helper has not finished setting up payouts yet, so they cannot be hired for a Secure Payment task."
    );
  }

  // Ch.8.3: never take a customer's money for a helper Stripe cannot pay.
  if (!helperProfile.stripe_payouts_enabled) {
    return deny(
      "This helper still has to complete their Stripe verification before they can be paid."
    );
  }

  const amountKm = Number(application.offered_price ?? job.price);

  if (!Number.isFinite(amountKm) || amountKm <= 0) {
    return deny("This offer has no valid price.");
  }

  return { ...ALLOW, amountKm };
}

/**
 * Ch.9 / Ch.30.1 — applying to a Cash Payment task behind the commitment fee.
 */
export function canApplyWithCommitment({ job, helperProfile, actorId }) {
  if (!job) return deny("Task not found.", 404);

  if (job.owner_id === actorId) {
    return deny("You cannot apply to your own task.", 403);
  }

  if (job.status !== "open" || job.selected_helper_id) {
    return deny("This task is no longer open for offers.");
  }

  if ((job.payment_type || "secure") !== "cash") {
    return deny("This task uses Secure Payment — no commitment fee applies.");
  }

  if (!helperProfile?.is_helper) {
    return deny("Only helpers can apply to tasks.", 403);
  }

  if (helperProfile.is_blocked) {
    return deny("Your account cannot apply to tasks right now.", 403);
  }

  return ALLOW;
}

/**
 * Ch.9 steps 4-5 — selecting a helper on a Cash Payment task.
 */
export function canAcceptCashOffer({ job, application, helperProfile, actorId }) {
  if (!job) return deny("Task not found.", 404);

  if (job.owner_id !== actorId) {
    return deny("Only the task owner can select a helper.", 403);
  }

  if ((job.payment_type || "secure") !== "cash") {
    return deny("This task requires payment through the platform.");
  }

  if (job.status !== "open" || job.selected_helper_id) {
    return deny("This task is no longer open for hiring.");
  }

  if (!application || application.job_id !== job.id) {
    return deny("Offer not found for this task.", 404);
  }

  // A pending_payment offer has not paid its commitment fee yet.
  if (application.status !== "pending") {
    return deny("This offer can no longer be accepted.");
  }

  if (!helperProfile || helperProfile.is_blocked) {
    return deny("This helper is not available.");
  }

  return ALLOW;
}

/**
 * Ch.10.2 — releasing held escrow to the helper.
 *
 * The single most consequential rule in the system: money leaves the platform
 * here. Release requires completion confirmed by the customer, or a finance-tier
 * admin resolving a dispute. Acceptance alone never releases funds.
 */
export function canReleaseEscrow({ job, payment, helperProfile, actor }) {
  if (!job) return deny("Task not found.", 404);

  const isFinanceAdmin = FINANCE_ROLES.includes(actor?.admin_role || "");

  if (job.owner_id !== actor?.id && !isFinanceAdmin) {
    return deny("You are not allowed to release this payment.", 403);
  }

  if (job.status !== "completed" && !isFinanceAdmin) {
    return deny("Funds are released once the task is confirmed completed.");
  }

  if (!payment) return deny("No captured payment found for this task.", 404);

  if (payment.status === "Released") {
    return { ok: true, alreadyReleased: true };
  }

  if (payment.status !== "Succeeded") {
    return deny("This payment is not in a releasable state.");
  }

  if (!helperProfile?.stripe_account_id) {
    return deny("The helper has no connected Stripe account.");
  }

  if (!helperProfile.stripe_payouts_enabled) {
    return deny(
      "The helper's Stripe verification is incomplete, so funds cannot be released yet."
    );
  }

  const payoutMinor = payment.amount_minor - payment.commission_minor;

  if (!Number.isFinite(payoutMinor) || payoutMinor <= 0) {
    return deny("Nothing to release on this payment.");
  }

  return { ...ALLOW, payoutMinor, isFinanceAdmin };
}
