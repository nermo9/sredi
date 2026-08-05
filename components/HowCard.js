"use client";

/**
 * Numbered step on the "how it works" section.
 */
export default function HowCard({ number, title, text }) {
  return (
    <div className="how-card">
      <div className="step-number">{number}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
