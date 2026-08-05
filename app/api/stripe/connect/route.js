import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { requireUser, apiError } from "../../../../lib/apiAuth";

/**
 * Helper onboarding onto Stripe Connect (Express) — Blueprint Ch.8.1/8.3.
 *
 * Changes from the previous version:
 * - the caller is authenticated instead of trusting a userId from the body,
 *   which previously let anyone create a Connect account attached to any user;
 * - an existing account is reused instead of creating a brand-new Connect
 *   account on every click of the button;
 * - stripe_account_id is written server-side, so a browser that closes during
 *   the redirect can no longer orphan the account;
 * - raw Stripe error objects are no longer returned to the browser.
 */
export async function POST(request) {
  const { user, supabase, error: authError } = await requireUser(request);

  if (authError) return authError;

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_account_id, is_helper")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return apiError("Could not load your profile.", 500, profileError);
    }

    if (!profile) {
      return apiError("Profile not found.", 404);
    }

    let accountId = profile.stripe_account_id || null;

    if (accountId) {
      // Confirm the stored account still exists on this platform before
      // reusing it — a key rotation between test and live mode leaves stale ids.
      try {
        await getStripe().accounts.retrieve(accountId);
      } catch (err) {
        console.error("[sredi:connect] stale account id, recreating", err.code);
        accountId = null;
      }
    }

    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { userId: user.id },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_account_id: accountId,
          stripe_connected: false,
          stripe_charges_enabled: false,
          stripe_payouts_enabled: false,
        })
        .eq("id", user.id);

      if (updateError) {
        // The Stripe account exists but we could not record it. Surface this
        // rather than silently orphaning it.
        return apiError(
          "Your Stripe account was created but could not be saved. Please contact support.",
          500,
          { updateError, accountId }
        );
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.sredi.ba";

    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}?view=profile&stripe=refresh`,
      return_url: `${baseUrl}?view=profile&stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ accountId, url: accountLink.url });
  } catch (err) {
    console.error("[sredi:connect]", err.type, err.code, err.message);

    // Known platform-configuration failures, mapped to actionable messages.
    // These are the two errors documented in docs/handoff.md §3.1 and §3.2.
    if (/signed up for Connect/i.test(err.message || "")) {
      return apiError(
        "Stripe Connect is not enabled on the platform account yet. Enable it at dashboard.stripe.com/connect.",
        503
      );
    }

    if (/Accounts v1/i.test(err.message || "")) {
      return apiError(
        "This Stripe platform requires the v2 Accounts API. Enable Accounts v1 support at dashboard.stripe.com/settings/features, or migrate this route to POST /v2/core/accounts.",
        503
      );
    }

    return apiError("Could not start Stripe onboarding.", 500);
  }
}

/**
 * Reads the live capability status of the caller's connected account and syncs
 * it onto their profile. Blueprint Ch.8.3: a helper cannot receive payouts
 * until Stripe reports charges_enabled and payouts_enabled.
 *
 * This is a pull-based complement to the account.updated webhook, used when the
 * helper returns from Stripe-hosted onboarding.
 */
export async function GET(request) {
  const { user, supabase, error: authError } = await requireUser(request);

  if (authError) return authError;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const account = await getStripe().accounts.retrieve(profile.stripe_account_id);

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);

    await supabase
      .from("profiles")
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_connected: chargesEnabled && payoutsEnabled,
      })
      .eq("id", user.id);

    return NextResponse.json({
      connected: chargesEnabled && payoutsEnabled,
      chargesEnabled,
      payoutsEnabled,
      requirementsDue: account.requirements?.currently_due || [],
    });
  } catch (err) {
    console.error("[sredi:connect:status]", err.message);

    return apiError("Could not read your Stripe status.", 500);
  }
}
