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

      refresh_url: "http://localhost:3001?view=profile&stripe=refresh",

      return_url: "http://localhost:3001?view=profile&stripe=success",

      type: "account_onboarding",
    });

    return NextResponse.json({
      accountId: account.id,
      url: accountLink.url,
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