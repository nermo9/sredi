import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const {
      amount,
      stripeAccountId,
      jobId,
      applicationId,
    } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Sredi Task",
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],

      success_url: `http://localhost:3003/payment-success?job=${jobId}&application=${applicationId}`,
      cancel_url: "http://localhost:3003/payment-cancel",

      payment_intent_data: {
        application_fee_amount: Math.round(Number(amount) * 100 * 0.1),

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
    console.error(err);

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