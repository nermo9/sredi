"use client";

import { formatPrice, getCategoryIcon } from "../lib/format";
import StatusBadge from "./StatusBadge";

/**
 * Task card. Extracted from app/page.js unchanged apart from the imports.
 */
export default function JobCard({
  job,
  t,
  language,
  categoryLabel,
  statusLabel,
  onOpen,
}) {
  return (
    <article className="job-card">
      <div className="job-card-top">
        <div className="job-icon">
          {job.icon || getCategoryIcon(job.category)}
        </div>

        <div className="price">
          {formatPrice(job.price)}
        </div>
      </div>

      <h3>{job.title}</h3>

      <div className="job-meta">
        📍 {job.city} · {categoryLabel(job.category)}
      </div>

      {/* Ch.26.2: a job card carries the payment type. Ch.9 requires the lack
          of escrow on cash tasks to be visible before anyone commits, and
          Ch.26.1 requires colour to be paired with a text label, never used
          alone to convey the difference. */}
      {!job.demo && (
        <div className="job-meta">
          <span
            className={`payment-badge payment-badge--${
              (job.payment_type || "secure") === "cash" ? "cash" : "secure"
            }`}
          >
            {(job.payment_type || "secure") === "cash"
              ? language === "en"
                ? "Cash — not held by Sredi"
                : "Gotovina — Sredi ne zadržava"
              : language === "en"
                ? "Secure Payment"
                : "Sigurno plaćanje"}
          </span>
        </div>
      )}

      <div className="job-description">
        {job.description}
      </div>

      <div className="job-card-bottom">
        <StatusBadge
          status={job.status}
          label={statusLabel(job.status)}
          demo={job.demo}
        />

        <button className="btn" onClick={onOpen}>
          {language === "en"
            ? "View task"
            : "Pogledaj zadatak"}
        </button>
      </div>
    </article>
  );
}
