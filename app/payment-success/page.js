"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Blueprint Ch.26.3: every payment needs an explicit success confirmation, and
 * Ch.59: every completed workflow ends with a confirmation, a summary and a
 * clear next action.
 *
 * This route previously did not exist at all — Stripe's success_url pointed
 * here, so every completed payment landed on a 404.
 *
 * Ch.10.11: the state change itself comes from the webhook, not from this page.
 * The page only reports; it never writes.
 */
function PaymentSuccessContent() {
  const params = useSearchParams();

  const isCommitment = params.get("kind") === "commitment";

  return (
    <main className="payment-result">
      <div className="payment-result-card">
        <div className="payment-result-icon payment-result-icon--success" aria-hidden="true">
          ✓
        </div>

        <h1>{isCommitment ? "Uplata primljena" : "Plaćanje uspješno"}</h1>

        <p className="payment-result-lead">
          {isCommitment
            ? "Tvoja obaveza od 10% je naplaćena i tvoja ponuda je poslana naručiocu. Ako ne budeš izabran/a, iznos ti se automatski vraća u cijelosti."
            : "Hvala. Iznos je sigurno zadržan kod Sredi.ba i bit će isplaćen izvođaču tek kada potvrdiš da je posao završen."}
        </p>

        <p className="payment-result-sub" lang="en">
          {isCommitment
            ? "Your 10% commitment fee has been charged and your offer is now visible to the customer. If you are not selected, it is refunded in full automatically."
            : "The amount is held securely by Sredi.ba and is paid out to the helper only once you confirm the task is complete."}
        </p>

        <div className="payment-result-actions">
          <Link className="btn btn-dark" href="/?view=myTasks">
            Moji zadaci / My tasks
          </Link>

          <Link className="btn" href="/">
            Početna / Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="payment-result" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
