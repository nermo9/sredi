import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";
import { canReleaseEscrow } from "../../../../lib/paymentRules";

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

    const { data: actor } = await supabase
      .from("profiles")
      .select("id, admin_role")
      .eq("id", user.id)
      .maybeSingle();

    // Ordered newest-first and limited to one row rather than maybeSingle():
    // a job can accumulate more than one payment row (a cancelled attempt
    // followed by a successful one), and maybeSingle() errors outright on
    // multiple matches, which would have blocked the payout entirely.
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("job_id", jobId)
      .eq("type", "secure_payment")
      .in("status", ["Succeeded", "Released"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (paymentError) {
      return apiError("Could not load the payment.", 500, paymentError);
    }

    const payment = payments?.[0] || null;

    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("id, stripe_account_id, stripe_payouts_enabled")
      .eq("id", payment?.payee_id || job?.selected_helper_id || "")
      .maybeSingle();

    const verdict = canReleaseEscrow({
      job,
      payment,
      helperProfile,
      actor: { id: user.id, admin_role: actor?.admin_role },
    });

    if (!verdict.ok) return apiError(verdict.error, verdict.status);

    // Idempotent by design: a second call after a successful release is a
    // no-op rather than a second transfer (Ch.8.4).
    if (verdict.alreadyReleased) {
      return NextResponse.json({ released: true, alreadyReleased: true });
    }

    const { payoutMinor, isFinanceAdmin } = verdict;

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
