export default function SrediLogo({ compact = false }) {
  return (
    <div className={`sredi-logo ${compact ? "sredi-logo-compact" : ""}`}>
      <div className="sredi-logo-symbol">
        <span>S</span>
      </div>

      {!compact && (
        <div className="sredi-logo-word">
          SREDI<span>.ba</span>
        </div>
      )}
    </div>
  );
}
