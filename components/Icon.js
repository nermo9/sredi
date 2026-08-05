"use client";

/**
 * Shared icon set. Extracted from app/page.js unchanged.
 */
export default function Icon({
  name,
  size = 20,
  className = "",
  filled = false,
}) {
  const paths = {
    cleaning: (
      <>
        <path d="M7 3h10" />
        <path d="M9 3v5" />
        <path d="M15 3v5" />
        <path d="M7 8h10l1 12H6L7 8Z" />
        <path d="M9 14h6" />
      </>
    ),

    moving: (
      <>
        <path d="M4 7 12 3l8 4-8 4-8-4Z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </>
    ),

    garden: (
      <>
        <path d="M12 21V9" />
        <path d="M12 13c-4 0-7-2.5-7-6 4 0 7 2 7 6Z" />
        <path d="M12 10c3.8 0 6-2.2 6-5-3.8 0-6 2.2-6 5Z" />
      </>
    ),

    tools: (
      <>
        <path d="m14 6 4-4 4 4-4 4" />
        <path d="m16 8-9.5 9.5a2.12 2.12 0 1 1-3-3L13 5" />
      </>
    ),

    car: (
      <>
        <path d="M5 17h14" />
        <path d="M6 17 4 13l2-6h12l2 6-2 4" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M5 13h14" />
      </>
    ),

    hand: (
      <>
        <path d="M8 11V6a2 2 0 0 1 4 0v5" />
        <path d="M12 10V5a2 2 0 0 1 4 0v7" />
        <path d="M16 10V7a2 2 0 0 1 4 0v7c0 5-3 7-7 7h-1c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l2 2" />
      </>
    ),

    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10" />
        <path d="M9 21v-6h6v6" />
      </>
    ),

    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
      </>
    ),

    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2" />
        <path d="M9 10h6" />
        <path d="M9 14h6" />
      </>
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V4h8v3" />
        <path d="M3 12h18" />
      </>
    ),

    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),

    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),

    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),

    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    ),

    check: <path d="m5 12 4 4L19 6" />,

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
  award: (
  <>
    <circle cx="12" cy="8" r="5" />
    <path d="M8.5 12 7 22l5-3 5 3-1.5-10" />
    <path d="m10 8 1.3 1.3L14 6.5" />
  </>
),
  };

  return (
    <span
      className={`ui-icon ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={name === "star" && filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths[name] || paths.grid}
      </svg>
    </span>
  );
}
