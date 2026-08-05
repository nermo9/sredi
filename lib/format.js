import { categories } from "./catalog";

/**
 * Display formatting shared across the app. Extracted from app/page.js.
 *
 * formatPrice renders KM because KM is what users are quoted (Ch.10.9). What
 * Stripe is actually charged is a separate concern handled in lib/money.js —
 * do not conflate the two.
 */
export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "SR";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getCategoryIcon(category) {
  return (
    categories.find((item) => item.name === category)?.icon || "✨"
  );
}

export function formatPrice(price) {
  const number = Number(price);

  if (!Number.isFinite(number)) return "Po dogovoru";

  return `${number.toLocaleString("bs-BA")} KM`;
}

export function normalizeStatus(status) {
  if (!status) return "open";

  const value = String(status).toLowerCase();

  if (["assigned", "accepted"].includes(value)) return "assigned";

  if (["in_progress", "progress", "active"].includes(value)) {
    return "in_progress";
  }

  if (["completed", "done"].includes(value)) return "completed";

  if (["cancelled", "canceled"].includes(value)) {
    return "cancelled";
  }

  return "open";
}

export function getHelperLevel(completedJobs) {
  const count = Number(completedJobs || 0);

  if (count >= 50) {
    return {
      name: "Diamond",
      className: "level-diamond",
    };
  }

  if (count >= 20) {
    return {
      name: "Gold",
      className: "level-gold",
    };
  }

  if (count >= 10) {
    return {
      name: "Silver",
      className: "level-silver",
    };
  }

  if (count >= 5) {
    return {
      name: "Bronze",
      className: "level-bronze",
    };
  }

  return {
    name: "New",
    className: "level-new",
  };
}
