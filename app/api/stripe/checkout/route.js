import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";
import {
  kmToStripeMinorUnits,
  commissionMinorUnits,
  getStripeCurrency,
} from "../../../../lib/money";

/**
 * Secure Payment checkout — the customer pays the full job amount up front and
 * the platform holds it until the job is confirmed completed.
 *
 * Blueprint Ch.10.2 (escrow) is the reason this route deliberately does NOT use
 * transfer_data.destination: a destination charge moves the money to the helper
 * the moment the charge succeeds, which is exactly what escrow must prevent.
 * Instead the charge lands on the platform account under a transfer_group, and
 * /api/stripe/release creates the Transfer once the job is completed.
 *
 * Other fixes over the previous version:
 * - the caller is authenticated and must own the job (it was fully open before);
 * - the amount is recomputed server-side from the application row rather than
 *   taken from the request body, which was trivially manipulable;
 * - prices are converted from KM instead of being sent as EUR at 1:1
 *   (see lib/money.js — this was a ~2x overcharge);
 * - the secret key is no longer logged;
 * - an idempotency key prevents a double-click creating two charges (Ch.10.6).
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
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, owner_id, title, status, price, payment_type, selected_helper_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) return apiError("Could not load the task.", 500, jobError);

    if (!job) return apiError("Task not found.", 404);

    if (job.owner_id !== user.id) {
      return apiError("Only the task owner can pay for this task.", 403);
    }

    if ((job.payment_type || "secure") !== "secure") {
      return apiError(
        "This task uses Cash Payment — there is nothing to pay through the platform.",
        409
      );
    }

    // Blueprint Ch.10.6: a job that already has an assigned helper must never
    // be paid for a second time.
    if (job.status !== "open" || job.selected_helper_id) {
      return apiError("This task is no longer open for hiring.", 409);
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .select("id, job_id, helper_id, offered_price, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError) {
      return apiError("Could not load the offer.", 500, applicationError);
    }

    if (!application || application.job_id !== job.id) {
      return apiError("Offer not found for this task.", 404);
    }

    // Blueprint Ch.30.4 / roadmap CRITICAL: withdrawn, rejected and expired
    // offers must be rejected server-side, not just hidden in the UI.
    if (application.status !== "pending") {
      return apiError("This offer can no longer be accepted.", 409);
    }

    const { data: helperProfile, error: helperError } = await supabase
      .from("profiles")
      .select("id, full_name, stripe_account_id, stripe_payouts_enabled, is_blocked")
      .eq("id", application.helper_id)
      .maybeSingle();

    if (helperError) {
      return apiError("Could not load the helper.", 500, helperError);
    }

    if (!helperProfile) return apiError("Helper not found.", 404);

    if (helperProfile.is_blocked) {
      return apiError("This helper is not available.", 409);
    }

    if (!helperProfile.stripe_account_id) {
      return apiError(
        "This helper has not finished setting up payouts yet, so they cannot be hired for a Secure Payment task.",
        409
      );
    }

    // Blueprint Ch.8.3 / roadmap HIGH: never take a customer's money for a
    // helper Stripe cannot pay out to.
    if (!helperProfile.stripe_payouts_enabled) {
      return apiError(
        "This helper still has to complete their Stripe verification before they can be paid.",
        409
      );
    }

    const amountKm = Number(application.offered_price ?? job.price);

    if (!Number.isFinite(amountKm) || amountKm <= 0) {
      return apiError("This offer has no valid price.", 409);
    }

    const currency = getStripeCurrency();
    const amountMinor = kmToStripeMinorUnits(amountKm);
    const commissionMinor = commissionMinorUnits(amountMinor);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sredi.ba";

    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        client_reference_id: job.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountMinor,
              product_data: {
                name: job.title || "Sredi zadatak",
              },
            },
          },
        ],
        success_url: `${baseUrl}/payment-success?job=${job.id}&application=${application.id}`,
        cancel_url: `${baseUrl}/payment-cancel?job=${job.id}`,
        payment_intent_data: {
          // No transfer_data — funds stay on the platform account until
          // release. transfer_group ties the later Transfer to this charge.
          transfer_group: `job_${job.id}`,
          metadata: {
            jobId: job.id,
            applicationId: application.id,
            helperId: application.helper_id,
            paymentKind: "secure_payment",
          },
        },
        metadata: {
          jobId: job.id,
          applicationId: application.id,
          helperId: application.helper_id,
          customerId: user.id,
          paymentKind: "secure_payment",
          amountKm: String(amountKm),
          commissionMinor: String(commissionMinor),
        },
      },
      {
        // Ch.10.6: a repeated submit for the same offer returns the same
        // session instead of charging twice.
        idempotencyKey: `secure_${job.id}_${application.id}`,
      }
    );

    // Ch.8.4: every payment row must exist in a defined state from the start,
    // so a webhook that arrives before the browser returns has a row to update.
    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        job_id: job.id,
        application_id: application.id,
        payer_id: user.id,
        payee_id: application.helper_id,
        type: "secure_payment",
        status: "Pending",
        currency,
        amount_minor: amountMinor,
        commission_minor: commissionMinor,
        amount_km: amountKm,
        stripe_checkout_session_id: session.id,
      },
      { onConflict: "stripe_checkout_session_id" }
    );

    if (paymentError) {
      console.error("[sredi:checkout] payment row", paymentError);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[sredi:checkout]", err.type, err.code, err.message);

    return apiError("Could not start the payment. Please try again.", 500);
  }
}
