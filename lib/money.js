/**
 * Money handling for Sredi.ba.
 *
 * Blueprint Ch.4.1: every monetary column is an integer in minor units
 * (fenings/cents), never a float. Blueprint Ch.10.9: the platform currency
 * is KM (Bosnian Convertible Mark) and must not be hardcoded in a way that
 * blocks adding EUR/USD later.
 *
 * IMPORTANT — the bug this module exists to prevent:
 * the UI has always displayed prices as "KM", but the checkout route used to
 * send those same numbers to Stripe as EUR at 1:1. A 100 KM job therefore
 * charged the customer EUR 100 (~196 KM). Prices are now converted explicitly.
 *
 * STRIPE_CURRENCY selects the currency actually charged. Set it to "bam" if
 * the Stripe account supports BAM as a presentment currency; otherwise leave
 * it as "eur" and the KM amount is converted at the pegged rate below.
 * KM is pegged to the euro by law at 1 EUR = 1.95583 KM, so this is a fixed
 * constant, not a live FX rate.
 */

export const DISPLAY_CURRENCY = "KM";

export const KM_PER_EUR = 1.95583;

export const PLATFORM_COMMISSION_RATE = 0.1;

export const COMMITMENT_FEE_RATE = 0.1;

export function getStripeCurrency() {
  return (process.env.STRIPE_CURRENCY || "eur").toLowerCase();
}

/**
 * Convert a KM amount (as entered by users and displayed in the UI) into the
 * integer minor units of the currency Stripe will actually charge.
 */
export function kmToStripeMinorUnits(amountKm) {
  const km = Number(amountKm);

  if (!Number.isFinite(km) || km <= 0) {
    throw new Error("Invalid amount.");
  }

  const currency = getStripeCurrency();

  if (currency === "bam") {
    return Math.round(km * 100);
  }

  if (currency === "eur") {
    return Math.round((km / KM_PER_EUR) * 100);
  }

  throw new Error(
    `Unsupported STRIPE_CURRENCY "${currency}" — expected "bam" or "eur".`
  );
}

/**
 * Platform commission on a Secure Payment job, in the same minor units.
 * Blueprint Ch.2.3 / Ch.8.1.
 */
export function commissionMinorUnits(totalMinorUnits) {
  return Math.round(totalMinorUnits * PLATFORM_COMMISSION_RATE);
}

/**
 * Commitment fee on a Cash Payment job: exactly 10% of the helper's own
 * offered price, always computed server-side (Blueprint Ch.10.3).
 */
export function commitmentFeeKm(offeredPriceKm) {
  const km = Number(offeredPriceKm);

  if (!Number.isFinite(km) || km <= 0) {
    throw new Error("Invalid offered price.");
  }

  return Math.round(km * COMMITMENT_FEE_RATE * 100) / 100;
}

export function formatKm(amountKm) {
  return `${Number(amountKm).toLocaleString("bs-BA")} ${DISPLAY_CURRENCY}`;
}
