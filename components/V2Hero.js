export default function V2Hero({
  language,
  onPostTask,
  onFindJob,
}) {
  return (
    <section className="v2-hero">
      <div className="v2-hero-copy">
        <div className="v2-eyebrow">
          SREDI.ba
        </div>

        <h1>
          {language === "ba" ? (
            <>
              Pronađi pomoć
              <br />
              u svojoj blizini.
            </>
          ) : (
            <>
              Find help
              <br />
              near you.
            </>
          )}
        </h1>

        <p>
          {language === "ba"
            ? "Brzo. Jednostavno. Pouzdano."
            : "Fast. Simple. Local."}
        </p>

        <div className="v2-hero-actions">
          <button
            type="button"
            className="v2-primary"
            onClick={onPostTask}
          >
            {language === "ba"
              ? "Objavi zadatak"
              : "Post a task"}
          </button>

          <button
            type="button"
            className="v2-secondary"
            onClick={onFindJob}
          >
            {language === "ba"
              ? "Pronađi posao"
              : "Find a job"}
          </button>
        </div>
      </div>

      <div className="v2-hero-art" aria-hidden="true">
        <div className="v2-person person-one">
          <div className="person-head" />
          <div className="person-body" />
        </div>

        <div className="v2-person person-two">
          <div className="person-head" />
          <div className="person-body" />
        </div>

        <div className="v2-hero-orb orb-one" />
        <div className="v2-hero-orb orb-two" />
      </div>
    </section>
  );
}
