import SrediLogo from "./SrediLogo";

export default function Sidebar({
  activeView,
  onNavigate,
  onPostTask,
  notificationCount = 0,
}) {
  const items = [
    { id: "home", icon: "⌂", label: "Home" },
    { id: "jobs", icon: "⌕", label: "Jobs" },
    { id: "myTasks", icon: "▣", label: "My Tasks" },
    { id: "myJobs", icon: "▢", label: "My Jobs" },
    {
      id: "notifications",
      icon: "♢",
      label: "Notifications",
      badge: notificationCount,
    },
    { id: "profile", icon: "♙", label: "Profile" },
  ];

  return (
    <aside className="v2-sidebar">
      <div>
        <button
          type="button"
          className="sidebar-logo-button"
          onClick={() => onNavigate("home")}
        >
          <SrediLogo />
        </button>

        <nav className="v2-sidebar-nav">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`v2-nav-item ${
                activeView === item.id ? "active" : ""
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="v2-nav-icon">{item.icon}</span>

              <span>{item.label}</span>

              {!!item.badge && (
                <span className="v2-nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="v2-post-button"
          onClick={onPostTask}
        >
          <span>＋</span>
          Post task
        </button>
      </div>

      <div className="v2-trust-card">
        <div className="v2-trust-icon">✓</div>

        <div>
          <strong>Local help.</strong>
          <p>Find people nearby and get things done.</p>
        </div>
      </div>

      <div className="v2-sidebar-footer">© 2026 SREDI.ba</div>
    </aside>
  );
}
