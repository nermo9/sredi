import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Webhook signature failed",
      },
      {
        status: 400,
      }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const jobId = session.metadata.jobId;
    const applicationId = session.metadata.applicationId;

    const { data: application } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (application) {
      await supabase
        .from("jobs")
        .update({
          selected_helper_id: application.helper_id,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabase
        .from("applications")
        .update({
          status: "accepted",
        })
        .eq("id", applicationId);

      await supabase
        .from("applications")
        .update({
          status: "rejected",
        })
        .eq("job_id", jobId)
        .neq("id", applicationId);
    }
  }

  return NextResponse.json({
    received: true,
  });
}
