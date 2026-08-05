"use client";

import Link from "next/link";

/**
 * Blueprint Ch.26.3: an error/cancel state must say what happened, why, and how
 * to fix it, in plain language. Ch.10.6: a cancelled payment leaves the task
 * OPEN and assigns nobody, which this copy states explicitly so the user is not
 * left guessing.
 *
 * This route previously did not exist — Stripe's cancel_url returned a 404.
 */
export default function PaymentCancelPage() {
  return (
    <main className="payment-result">
      <div className="payment-result-card">
        <div className="payment-result-icon payment-result-icon--warning" aria-hidden="true">
          !
        </div>

        <h1>Plaćanje je otkazano</h1>

        <p className="payment-result-lead">
          Ništa ti nije naplaćeno. Zadatak je i dalje otvoren i niko nije
          izabran — možeš pokušati ponovo kad god želiš.
        </p>

        <p className="payment-result-sub" lang="en">
          You have not been charged. The task is still open and no helper has
          been assigned, so you can try again whenever you want.
        </p>

        <div className="payment-result-actions">
          <Link className="btn btn-dark" href="/?view=myTasks">
            Nazad na zadatke / Back to tasks
          </Link>

          <Link className="btn" href="/">
            Početna / Home
          </Link>
        </div>
      </div>
    </main>
  );
}
