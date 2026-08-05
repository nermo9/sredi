import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

/**
 * Stripe webhook — the single source of truth for payment state
 * (Blueprint Ch.8.2 step 4).
 *
 * What this route now does that it did not before:
 * - deduplicates redelivered events against a stripe_events table, so a retry
 *   can never double-assign a job or double-refund a fee (Ch.8.4, roadmap
 *   CRITICAL);
 * - writes the payments table using the full 8-state enum from Ch.10.5 instead
 *   of leaving payments unrecorded entirely;
 * - handles the Cash Payment flow: promoting a paid application to visible, and
 *   automatically refunding every rejected applicant's commitment fee
 *   (Ch.9.5 / Ch.10.4 — this refund is mandatory, not an admin action);
 * - handles account.updated so helper payout eligibility stays in sync
 *   (Ch.8.3);
 * - records failures, refunds and disputes rather than silently ignoring them.
 *
 * Note that acceptance assigns the job but never releases money — release is a
 * separate, completion-gated step in /api/stripe/release (Ch.10.2).
 */
export async function POST(request) {
  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[sredi:webhook] signature verification failed", err.message);

    return NextResponse.json(
      { error: "Webhook signature failed" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Ch.8.4: store processed event ids and short-circuit duplicates before
  // touching any payment data. The insert itself is the lock — a duplicate
  // delivery collides on the primary key.
  const { error: dedupError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (dedupError) {
    if (dedupError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.error("[sredi:webhook] dedup insert failed", dedupError);

    // Fail closed: returning a non-2xx makes Stripe retry rather than letting
    // the event be processed without dedup protection.
    return NextResponse.json({ error: "Dedup store unavailable" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;

      case "checkout.session.expired":
        await markPaymentBySession(supabase, event.data.object.id, "Cancelled");
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(supabase, event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object);
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(supabase, event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdated(supabase, event.data.object);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("[sredi:webhook] handler failed", event.type, err);

    // Release the dedup row so Stripe's retry can reprocess this event.
    await supabase.from("stripe_events").delete().eq("id", event.id);

    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(supabase, session) {
  const kind = session.metadata?.paymentKind || "secure_payment";

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  // Ch.10.5: Succeeded means the customer's charge cleared. It explicitly does
  // NOT mean the helper has been paid — that is the separate Released state.
  await supabase
    .from("payments")
    .update({
      status: "Succeeded",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);

  if (kind === "commitment_fee") {
    await handleCommitmentFeePaid(supabase, session);
    return;
  }

  await handleSecurePaymentPaid(supabase, session);
}

/**
 * Secure Payment cleared: the job is assigned and the chosen offer accepted.
 * The money stays held on the platform account until release.
 */
async function handleSecurePaymentPaid(supabase, session) {
  const jobId = session.metadata?.jobId;
  const applicationId = session.metadata?.applicationId;

  if (!jobId || !applicationId) return;

  const { data: application } = await supabase
    .from("applications")
    .select("id, job_id, helper_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return;

  await supabase
    .from("jobs")
    .update({
      selected_helper_id: application.helper_id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await supabase
    .from("applications")
    .update({ status: "accepted" })
    .eq("id", applicationId);

  await rejectOtherApplicants(supabase, jobId, applicationId);

  await supabase.from("audit_logs").insert({
    actor_id: session.metadata?.customerId || null,
    actor_type: "system",
    action: "job.assigned",
    entity_type: "job",
    entity_id: jobId,
    after: { application_id: applicationId, helper_id: application.helper_id },
  });
}

/**
 * Commitment fee cleared: the helper's application becomes a real, visible
 * application (Ch.9 step 3).
 */
async function handleCommitmentFeePaid(supabase, session) {
  const applicationId = session.metadata?.applicationId;

  if (!applicationId) return;

  await supabase
    .from("applications")
    .update({ status: "pending" })
    .eq("id", applicationId)
    .eq("status", "pending_payment");
}

/**
 * Rejects every other applicant and — on Cash Payment tasks — automatically
 * refunds their commitment fees in full. Ch.10.4 makes this a guaranteed system
 * behaviour with no admin step, so a refund failure is escalated rather than
 * dropped (Ch.10.11).
 */
async function rejectOtherApplicants(supabase, jobId, acceptedApplicationId) {
  const { data: others } = await supabase
    .from("applications")
    .select("id, helper_id, status")
    .eq("job_id", jobId)
    .neq("id", acceptedApplicationId);

  if (!others?.length) return;

  await supabase
    .from("applications")
    .update({ status: "rejected" })
    .eq("job_id", jobId)
    .neq("id", acceptedApplicationId)
    .in("status", ["pending", "pending_payment"]);

  const { data: fees } = await supabase
    .from("payments")
    .select("id, stripe_payment_intent_id, status, application_id")
    .eq("job_id", jobId)
    .eq("type", "commitment_fee")
    .eq("status", "Succeeded")
    .neq("application_id", acceptedApplicationId);

  for (const fee of fees || []) {
    await refundCommitmentFee(supabase, fee, "application_rejected");
  }
}

async function refundCommitmentFee(supabase, fee, reason) {
  if (!fee.stripe_payment_intent_id) return;

  try {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: fee.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: { sredi_reason: reason, paymentId: fee.id },
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
      reason,
      initiated_by: "system",
      stripe_refund_id: refund.id,
      status: refund.status,
    });
  } catch (err) {
    console.error("[sredi:webhook] commitment refund failed", fee.id, err.message);

    // Ch.10.11: a failed refund must never be silently dropped.
    await supabase.from("refunds").insert({
      payment_id: fee.id,
      amount_minor: null,
      reason,
      initiated_by: "system",
      stripe_refund_id: null,
      status: "failed",
      error_message: err.message,
    });
  }
}

/**
 * Ch.10.6: on a failed payment the job stays OPEN and no helper is assigned.
 */
async function handlePaymentFailed(supabase, paymentIntent) {
  await supabase
    .from("payments")
    .update({ status: "Failed" })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  const applicationId = paymentIntent.metadata?.applicationId;

  if (applicationId && paymentIntent.metadata?.paymentKind === "commitment_fee") {
    await supabase
      .from("applications")
      .delete()
      .eq("id", applicationId)
      .eq("status", "pending_payment");
  }
}

async function handleChargeRefunded(supabase, charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return;

  await supabase
    .from("payments")
    .update({ status: "Refunded", refunded_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", paymentIntentId);
}

async function handleDisputeCreated(supabase, dispute) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  if (!paymentIntentId) return;

  await supabase
    .from("payments")
    .update({ status: "Disputed" })
    .eq("stripe_payment_intent_id", paymentIntentId);
}

/**
 * Ch.8.3: reflect Stripe's verification status on the helper's profile so the
 * dashboard can prompt them, and so checkout can refuse to hire a helper who
 * cannot be paid out.
 */
async function handleAccountUpdated(supabase, account) {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);

  await supabase
    .from("profiles")
    .update({
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
      stripe_connected: chargesEnabled && payoutsEnabled,
    })
    .eq("stripe_account_id", account.id);
}

async function markPaymentBySession(supabase, sessionId, status) {
  await supabase
    .from("payments")
    .update({ status })
    .eq("stripe_checkout_session_id", sessionId);
}
