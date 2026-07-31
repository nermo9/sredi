export default function V2Topbar({
  search,
  setSearch,
  language,
  setLanguage,
  user,
  profile,
  onLogin,
  onProfile,
  onLogout,
  notificationCount = 0,
}) {
  const initials =
    profile?.full_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  return (
    <header className="v2-topbar">
      <div className="v2-global-search">
        <span>⌕</span>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            language === "ba"
              ? "Pretraži poslove i usluge..."
              : "Search jobs and services..."
          }
        />
      </div>

      <div className="v2-top-actions">
        <div className="v2-language">
          <button
            type="button"
            className={language === "ba" ? "active" : ""}
            onClick={() => setLanguage("ba")}
          >
            BA
          </button>

          <button
            type="button"
            className={language === "en" ? "active" : ""}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>

        {user && (
          <button
            type="button"
            className="v2-notification-button"
            aria-label="Notifications"
          >
            ♢

            {notificationCount > 0 && (
              <span>{notificationCount}</span>
            )}
          </button>
        )}

        {user ? (
  <>
    <button
      type="button"
      className="v2-user-button"
      onClick={onProfile}
    >
      <span className="v2-avatar">
        {initials}
      </span>

      <span className="v2-user-name">
        {profile?.full_name || "Profile"}
      </span>
    </button>

    <button
      type="button"
      className="v2-login-button"
      onClick={onLogout}
    >
      Log out
    </button>
  </>
) : (
          <button
            type="button"
            className="v2-login-button"
            onClick={onLogin}
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}
