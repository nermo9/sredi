import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";

/**
 * Accepts an offer on a Cash Payment task — Blueprint Ch.9 steps 4 and 5.
 *
 * No job money moves through the platform here, so there is no Checkout step.
 * What this route must guarantee is the part that is easy to get wrong: every
 * other applicant who already paid a commitment fee is refunded in full,
 * automatically and immediately, rather than being left for an admin to notice
 * (Ch.10.4 — this refund is mandatory system behaviour).
 *
 * Assignment runs server-side rather than as a client-side Supabase update so
 * that the refunds cannot be skipped by a client that simply doesn't call them.
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

  const { jobId, applicationId } = body || {};

  if (!jobId || !applicationId) {
    return apiError("Missing job or application reference.");
  }

  try {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, owner_id, status, payment_type, selected_helper_id")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return apiError("Task not found.", 404);

    if (job.owner_id !== user.id) {
      return apiError("Only the task owner can select a helper.", 403);
    }

    if ((job.payment_type || "secure") !== "cash") {
      return apiError("This task requires payment through the platform.", 409);
    }

    if (job.status !== "open" || job.selected_helper_id) {
      return apiError("This task is no longer open for hiring.", 409);
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, job_id, helper_id, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (!application || application.job_id !== job.id) {
      return apiError("Offer not found for this task.", 404);
    }

    // Ch.30.4: only a genuinely pending offer can be accepted. A
    // pending_payment offer has not paid its commitment fee yet.
    if (application.status !== "pending") {
      return apiError("This offer can no longer be accepted.", 409);
    }

    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("id, is_blocked")
      .eq("id", application.helper_id)
      .maybeSingle();

    if (!helperProfile || helperProfile.is_blocked) {
      return apiError("This helper is not available.", 409);
    }

    await supabase
      .from("jobs")
      .update({
        selected_helper_id: application.helper_id,
        status: "assigned",
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", application.id);

    await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("job_id", job.id)
      .neq("id", application.id)
      .in("status", ["pending", "pending_payment"]);

    const refundResults = await refundRejectedCommitmentFees(
      supabase,
      job.id,
      application.id
    );

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_type: "user",
      action: "job.assigned_cash",
      entity_type: "job",
      entity_id: job.id,
      after: {
        application_id: application.id,
        helper_id: application.helper_id,
        refunds_issued: refundResults.refunded,
        refunds_failed: refundResults.failed,
      },
    });

    return NextResponse.json({
      assigned: true,
      refundsIssued: refundResults.refunded,
      refundsFailed: refundResults.failed,
    });
  } catch (err) {
    console.error("[sredi:accept-cash]", err.message);

    return apiError("Could not select this helper.", 500);
  }
}

async function refundRejectedCommitmentFees(supabase, jobId, acceptedApplicationId) {
  const { data: fees } = await supabase
    .from("payments")
    .select("id, stripe_payment_intent_id, application_id")
    .eq("job_id", jobId)
    .eq("type", "commitment_fee")
    .eq("status", "Succeeded")
    .neq("application_id", acceptedApplicationId);

  let refunded = 0;
  let failed = 0;

  for (const fee of fees || []) {
    if (!fee.stripe_payment_intent_id) continue;

    try {
      const refund = await getStripe().refunds.create(
        {
          payment_intent: fee.stripe_payment_intent_id,
          reason: "requested_by_customer",
          metadata: { sredi_reason: "application_rejected", paymentId: fee.id },
        },
        { idempotencyKey: `refund_${fee.id}` }
      );

      await supabase
        .from("payments")
        .update({ status: "Refunded", refunded_at: new Date().toISOString() })
        .eq("id", fee.id);

      await supabase.from("refunds").insert({
        payment_id: fee.id,
        amount_minor: refund.amount,
        reason: "application_rejected",
        initiated_by: "system",
        stripe_refund_id: refund.id,
        status: refund.status,
      });

      refunded += 1;
    } catch (err) {
      console.error("[sredi:accept-cash] refund failed", fee.id, err.message);

      // Ch.10.11: a failed refund is recorded for retry, never dropped.
      await supabase.from("refunds").insert({
        payment_id: fee.id,
        amount_minor: null,
        reason: "application_rejected",
        initiated_by: "system",
        stripe_refund_id: null,
        status: "failed",
        error_message: err.message,
      });

      failed += 1;
    }
  }

  return { refunded, failed };
}
