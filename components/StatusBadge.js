"use client";

import { normalizeStatus } from "../lib/format";

/**
 * Task status badge — Blueprint Ch.26.1.
 *
 * Two rules from the spec drive this component:
 *
 * 1. Each status has its own colour: OPEN=blue, ASSIGNED=purple,
 *    IN_PROGRESS=orange, COMPLETED=green, ARCHIVED=grey, EXPIRED=dark grey,
 *    CANCELLED=red. Previously every status rendered in the same green, so the
 *    badge carried no information at a glance.
 *
 * 2. Colour is never the only signal — the text label is always rendered
 *    alongside it. That is an accessibility requirement, not a style choice.
 */
export default function StatusBadge({ status, label, demo = false }) {
  if (demo) {
    return <span className="status status--demo">Demo</span>;
  }

  const normalized = normalizeStatus(status);

  return (
    <span className={`status status--${normalized}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
