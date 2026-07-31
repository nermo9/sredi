export default function MobileNav({
  activeView,
  onNavigate,
  onPostTask,
}) {
  return (
    <nav className="v2-mobile-nav">
      <button
        type="button"
        className={activeView === "home" ? "active" : ""}
        onClick={() => onNavigate("home")}
      >
        <span>⌂</span>
        <small>Home</small>
      </button>

      <button
        type="button"
        className={activeView === "jobs" ? "active" : ""}
        onClick={() => onNavigate("jobs")}
      >
        <span>⌕</span>
        <small>Jobs</small>
      </button>

      <button
        type="button"
        className="v2-mobile-create"
        onClick={onPostTask}
        aria-label="Post task"
      >
        ＋
      </button>

      <button
        type="button"
        className={activeView === "myTasks" ? "active" : ""}
        onClick={() => onNavigate("myTasks")}
      >
        <span>▣</span>
        <small>My Tasks</small>
      </button>

      <button
        type="button"
        className={activeView === "profile" ? "active" : ""}
        onClick={() => onNavigate("profile")}
      >
        <span>♙</span>
        <small>Profile</small>
      </button>
    </nav>
  );
}
