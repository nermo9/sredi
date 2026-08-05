"use client";

/**
 * Loading placeholder for a task card — Blueprint Ch.26.3: skeleton loaders on
 * every API-backed view, never a blank white screen.
 */
export default function JobCardSkeleton() {
  return (
    <article className="job-card job-card--skeleton" aria-hidden="true">
      <div className="job-card-top">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton skeleton-line skeleton-line--price" />
      </div>

      <div className="skeleton skeleton-line skeleton-line--title" />
      <div className="skeleton skeleton-line skeleton-line--meta" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line skeleton-line--short" />

      <div className="job-card-bottom">
        <div className="skeleton skeleton-line skeleton-line--badge" />
      </div>
    </article>
  );
}
