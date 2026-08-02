import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request) {
  try {
    const {
      amount,
      stripeAccountId,
      jobId,
      applicationId,
    } = await request.json();

    console.log("Stripe key:", JSON.stringify(process.env.STRIPE_SECRET_KEY));
    console.log("Stripe account:", stripeAccountId);

    if (!amount) {
      return NextResponse.json(
        { error: "Missing amount." },
        { status: 400 }
      );
    }

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "Missing Stripe Account ID." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.sredi.ba";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(Number(amount) * 100),
            product_data: {
              name: "Sredi Task",
            },
          },
        },
      ],

      success_url: `${baseUrl}/payment-success?job=${jobId}&application=${applicationId}`,

      cancel_url: `${baseUrl}/payment-cancel`,

      payment_intent_data: {
        application_fee_amount: Math.round(
          Number(amount) * 100 * 0.1
        ),

        transfer_data: {
          destination: stripeAccountId,
        },
      },

      metadata: {
        jobId,
        applicationId,
      },
    });

    return NextResponse.json({
      url: session.url,
    });

  } catch (err) {
    console.error("Stripe checkout error:", err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}