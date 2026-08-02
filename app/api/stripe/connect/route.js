import { NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";

export async function POST(request) {
  try {
    const { userId } = await request.json();

    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      metadata: {
        userId,
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://www.sredi.ba?view=profile&stripe=refresh",
      return_url: "https://www.sredi.ba?view=profile&stripe=success",
      type: "account_onboarding",
    });

    return NextResponse.json({
      accountId: account.id,
      url: accountLink.url,
    });
  } catch (err) {
    console.error("========== STRIPE ERROR ==========");
    console.error("Message:", err.message);
    console.error("Type:", err.type);
    console.error("Code:", err.code);
    console.error("Raw:", err.raw);
    console.error("Full error:", err);

    return NextResponse.json(
      {
        error: err.message,
        type: err.type,
        code: err.code,
        raw: err.raw,
      },
      {
        status: 500,
      }
    );
  }
}