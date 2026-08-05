import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";

/**
 * Releases held escrow funds to the helper — Blueprint Ch.8.2 step 3 and
 * Ch.10.2.
 *
 * This is the second half of the escrow model started in /api/stripe/checkout.
 * The customer's money is sitting on the platform account under the job's
 * transfer_group; this route creates the Transfer to the helper's connected
 * account, minus the platform commission.
 *
 * Release is only ever valid when the customer has confirmed completion, or
 * when an administrator resolves a dispute in the helper's favour (Ch.10.2).
 * Acceptance alone never releases funds.
 */
export async function POST(request) {
  const { user, supabase, error: authError } = await requireUser(request);

  if (authError) return authError;

  let body;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.");
  }

  const { jobId } = body || {};

  if (!jobId) return apiError("Missing task reference.");

  try {
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, owner_id, status, selected_helper_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) return apiError("Could not load the task.", 500, jobError);

    if (!job) return apiError("Task not found.", 404);

    const { data: actor } = await supabase
      .from("profiles")
      .select("id, admin_role")
      .eq("id", user.id)
      .maybeSingle();

    // Ch.35.1: finance actions are restricted to the finance and super admin
    // roles — a Support Agent or Moderator must not be able to move money.
    const isFinanceAdmin = ["finance_admin", "super_admin"].includes(
      actor?.admin_role || ""
    );

    if (job.owner_id !== user.id && !isFinanceAdmin) {
      return apiError("You are not allowed to release this payment.", 403);
    }

    if (job.status !== "completed" && !isFinanceAdmin) {
      return apiError(
        "Funds are released once the task is confirmed completed.",
        409
      );
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("job_id", job.id)
      .eq("type", "secure_payment")
      .in("status", ["Succeeded", "Released"])
      .maybeSingle();

    if (paymentError) {
      return apiError("Could not load the payment.", 500, paymentError);
    }

    if (!payment) {
      return apiError("No captured payment found for this task.", 404);
    }

    // Idempotent by design: a second call after a successful release is a
    // no-op rather than a second transfer (Ch.8.4).
    if (payment.status === "Released") {
      return NextResponse.json({ released: true, alreadyReleased: true });
    }

    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("id, stripe_account_id, stripe_payouts_enabled")
      .eq("id", payment.payee_id || job.selected_helper_id)
      .maybeSingle();

    if (!helperProfile?.stripe_account_id) {
      return apiError("The helper has no connected Stripe account.", 409);
    }

    if (!helperProfile.stripe_payouts_enabled) {
      return apiError(
        "The helper's Stripe verification is incomplete, so funds cannot be released yet.",
        409
      );
    }

    const payoutMinor = payment.amount_minor - payment.commission_minor;

    if (payoutMinor <= 0) {
      return apiError("Nothing to release on this payment.", 409);
    }

    const transfer = await getStripe().transfers.create(
      {
        amount: payoutMinor,
        currency: payment.currency,
        destination: helperProfile.stripe_account_id,
        transfer_group: `job_${job.id}`,
        metadata: {
          jobId: job.id,
          paymentId: payment.id,
          releasedBy: user.id,
        },
      },
      { idempotencyKey: `release_${payment.id}` }
    );

    await supabase
      .from("payments")
      .update({
        status: "Released",
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Ch.10.8: append-only financial audit trail.
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_type: isFinanceAdmin && job.owner_id !== user.id ? "admin" : "user",
      action: "payment.released",
      entity_type: "payment",
      entity_id: payment.id,
      after: { transfer_id: transfer.id, amount_minor: payoutMinor },
    });

    return NextResponse.json({ released: true, transferId: transfer.id });
  } catch (err) {
    console.error("[sredi:release]", err.type, err.code, err.message);

    return apiError("Could not release the payment.", 500);
  }
}
