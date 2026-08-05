import Stripe from "stripe";

let client = null;

/**
 * Lazily constructed Stripe client.
 *
 * Constructing it at module scope made the whole production build fail whenever
 * STRIPE_SECRET_KEY was absent from the build environment ("Neither apiKey nor
 * config.authenticator provided"), because Next.js evaluates route modules while
 * collecting page data. Creating it on first use keeps the build independent of
 * runtime secrets while still failing loudly on a real request if the key is
 * missing.
 */
export function getStripe() {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  // Guards against the malformed-key incident in docs/handoff.md §3.3, where a
  // stray newline pasted into the Vercel env var produced an opaque
  // "Invalid character in header content [Authorization]" error at request time.
  const trimmed = key.trim();

  if (trimmed !== key) {
    console.warn(
      "[sredi:stripe] STRIPE_SECRET_KEY contained leading/trailing whitespace and was trimmed."
    );
  }

  client = new Stripe(trimmed, {
    apiVersion: "2025-06-30.basil",
  });

  return client;
}
