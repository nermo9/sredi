"use client";

/**
 * Empty state — Blueprint Ch.26.3.
 *
 * The spec is explicit that an empty list needs an illustration, an explanation
 * of what to do next, and an action button — not a bare "no results" line,
 * which is what the previous `.empty` div rendered.
 */
export default function EmptyState({ icon = "🔍", title, description, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>

      <p className="empty-title">{title}</p>

      {description && <p className="empty-description">{description}</p>}

      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
