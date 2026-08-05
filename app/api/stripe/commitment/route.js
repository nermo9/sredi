import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";
import {
  commitmentFeeKm,
  kmToStripeMinorUnits,
  getStripeCurrency,
} from "../../../../lib/money";
import { canApplyWithCommitment } from "../../../../lib/paymentRules";

/**
 * Cash Payment commitment fee — Blueprint Ch.9 and Ch.10.3.
 *
 * On a Cash Payment task the job amount never moves through the platform. The
 * helper instead pays a commitment fee of exactly 10% of their own offered
 * price in order to apply, and that fee is the platform's only revenue on the
 * task. The fee is charged to the HELPER, not the customer, and it is charged
 * to apply, not to be assigned.
 *
 * This flow did not exist in the codebase at all before — cash jobs had no
 * commercial model implemented.
 *
 * Implementation note on Ch.9 step 3 ("only once that payment succeeds is the
 * application row created and visible to the customer"): the row is inserted
 * immediately with status "pending_payment" and is promoted to "pending" by the
 * webhook when the fee clears. A pending_payment row is never shown to the
 * customer, so the visible behaviour matches the spec, while the unique
 * (job_id, helper_id) constraint still prevents duplicate applications and the
 * Stripe session has a stable row to reference.
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

  const { jobId, offeredPrice, message } = body || {};

  if (!jobId) return apiError("Missing task reference.");

  try {
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, owner_id, title, status, payment_type, selected_helper_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) return apiError("Could not load the task.", 500, jobError);

    // Blueprint Ch.30.1 / roadmap HIGH: verification-to-apply is a server-side
    // gate, not a UI gate.
    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("id, is_helper, is_blocked, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    const verdict = canApplyWithCommitment({
      job,
      helperProfile,
      actorId: user.id,
    });

    if (!verdict.ok) return apiError(verdict.error, verdict.status);

    const feeKm = commitmentFeeKm(offeredPrice);
    const currency = getStripeCurrency();
    const feeMinor = kmToStripeMinorUnits(feeKm);

    const { data: existing } = await supabase
      .from("applications")
      .select("id, status")
      .eq("job_id", job.id)
      .eq("helper_id", user.id)
      .maybeSingle();

    if (existing && existing.status !== "pending_payment") {
      return apiError("You have already applied to this task.", 409);
    }

    let applicationId = existing?.id;

    if (applicationId) {
      await supabase
        .from("applications")
        .update({
          offered_price: Number(offeredPrice),
          message: (message || "").trim(),
        })
        .eq("id", applicationId);
    } else {
      const { data: created, error: createError } = await supabase
        .from("applications")
        .insert({
          job_id: job.id,
          helper_id: user.id,
          offered_price: Number(offeredPrice),
          message: (message || "").trim(),
          status: "pending_payment",
        })
        .select("id")
        .single();

      if (createError) {
        return apiError("Could not save your offer.", 500, createError);
      }

      applicationId = created.id;
    }

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
              unit_amount: feeMinor,
              product_data: {
                name: `Sredi — obaveza 10% / commitment fee (${job.title || "zadatak"})`,
              },
            },
          },
        ],
        success_url: `${baseUrl}/payment-success?job=${job.id}&application=${applicationId}&kind=commitment`,
        cancel_url: `${baseUrl}/payment-cancel?job=${job.id}`,
        payment_intent_data: {
          metadata: {
            jobId: job.id,
            applicationId,
            helperId: user.id,
            paymentKind: "commitment_fee",
          },
        },
        metadata: {
          jobId: job.id,
          applicationId,
          helperId: user.id,
          paymentKind: "commitment_fee",
          amountKm: String(feeKm),
        },
      },
      { idempotencyKey: `commitment_${job.id}_${user.id}` }
    );

    const { error: paymentError } = await supabase.from("payments").upsert(
      {
        job_id: job.id,
        application_id: applicationId,
        payer_id: user.id,
        payee_id: null,
        type: "commitment_fee",
        status: "Pending",
        currency,
        amount_minor: feeMinor,
        commission_minor: feeMinor,
        amount_km: feeKm,
        stripe_checkout_session_id: session.id,
      },
      { onConflict: "stripe_checkout_session_id" }
    );

    if (paymentError) {
      console.error("[sredi:commitment] payment row", paymentError);
    }

    return NextResponse.json({ url: session.url, feeKm });
  } catch (err) {
    console.error("[sredi:commitment]", err.type, err.code, err.message);

    return apiError("Could not start the commitment fee payment.", 500);
  }
}
