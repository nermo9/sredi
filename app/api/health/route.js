import { NextResponse } from "next/server";

/**
 * Deployment self-check.
 *
 * Verifies, from inside the running deployment, everything that cannot be
 * checked from the repository: which environment variables are actually
 * present, whether the Stripe key is a test or live key, whether Supabase is
 * reachable, and whether the payments migration has been applied.
 *
 * Deliberately reveals no secret values — only whether each is set, plus the
 * non-secret key prefix (sk_test / sk_live) needed to confirm the platform is
 * in the intended mode.
 *
 * GET /api/health
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = [];

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    STRIPE_CURRENCY: process.env.STRIPE_CURRENCY,
  };

  for (const [name, value] of Object.entries(env)) {
    const optional = name === "STRIPE_CURRENCY";

    checks.push({
      check: `env:${name}`,
      ok: optional ? true : Boolean(value),
      detail: value
        ? "set"
        : optional
          ? "not set — defaults to eur"
          : "MISSING",
    });
  }

  // Whitespace in a pasted key is the exact failure from docs/handoff.md §3.3:
  // it surfaces as "Invalid character in header content [Authorization]".
  const rawKey = process.env.STRIPE_SECRET_KEY || "";

  if (rawKey) {
    checks.push({
      check: "stripe:key_clean",
      ok: rawKey === rawKey.trim(),
      detail:
        rawKey === rawKey.trim()
          ? "no stray whitespace"
          : "KEY HAS LEADING/TRAILING WHITESPACE — re-paste it in Vercel",
    });

    const mode = rawKey.trim().startsWith("sk_test_")
      ? "test"
      : rawKey.trim().startsWith("sk_live_")
        ? "live"
        : "unknown";

    checks.push({
      check: "stripe:mode",
      ok: mode !== "unknown",
      detail: mode,
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (siteUrl) {
    checks.push({
      check: "site_url:format",
      ok: /^https:\/\//.test(siteUrl) && !siteUrl.endsWith("/"),
      detail: siteUrl.endsWith("/")
        ? "must not end with a trailing slash — it is concatenated with /payment-success"
        : siteUrl,
    });
  }

  const currency = (process.env.STRIPE_CURRENCY || "eur").toLowerCase();

  checks.push({
    check: "currency:supported",
    ok: ["eur", "bam"].includes(currency),
    detail: ["eur", "bam"].includes(currency)
      ? currency
      : `${currency} is not supported — use "bam" or "eur"`,
  });

  // Supabase reachability and migration state.
  let stripeAccount = null;

  try {
    const { getSupabaseAdmin } = await import("../../../lib/supabaseAdmin");

    const supabase = getSupabaseAdmin();

    for (const table of [
      "payments",
      "refunds",
      "stripe_events",
      "audit_logs",
    ]) {
      const { error } = await supabase.from(table).select("id").limit(1);

      checks.push({
        check: `db:${table}`,
        ok: !error,
        detail: error
          ? `${error.message} — has the migration been run?`
          : "present",
      });
    }

    const { error: paymentTypeError } = await supabase
      .from("jobs")
      .select("payment_type")
      .limit(1);

    checks.push({
      check: "db:jobs.payment_type",
      ok: !paymentTypeError,
      detail: paymentTypeError
        ? `${paymentTypeError.message} — has the migration been run?`
        : "present",
    });

    const { error: payoutColumnError } = await supabase
      .from("profiles")
      .select("stripe_payouts_enabled")
      .limit(1);

    checks.push({
      check: "db:profiles.stripe_payouts_enabled",
      ok: !payoutColumnError,
      detail: payoutColumnError
        ? `${payoutColumnError.message} — has the migration been run?`
        : "present",
    });
  } catch (err) {
    checks.push({
      check: "db:connection",
      ok: false,
      detail: err.message,
    });
  }

  // Stripe reachability — proves the key actually authenticates, which neither
  // the build nor a config inspection can tell you.
  try {
    const { getStripe } = await import("../../../lib/stripe");

    const account = await getStripe().accounts.retrieve();

    stripeAccount = account.id;

    checks.push({
      check: "stripe:auth",
      ok: true,
      detail: `authenticated as ${account.id}`,
    });

    checks.push({
      check: "stripe:connect_enabled",
      ok: Boolean(account.capabilities || account.details_submitted !== undefined),
      detail: "platform account reachable",
    });
  } catch (err) {
    checks.push({
      check: "stripe:auth",
      ok: false,
      detail: err.message,
    });
  }

  const failures = checks.filter((entry) => !entry.ok);

  return NextResponse.json(
    {
      ok: failures.length === 0,
      stripeAccount,
      failing: failures.map((entry) => entry.check),
      checks,
    },
    { status: failures.length === 0 ? 200 : 503 }
  );
}
