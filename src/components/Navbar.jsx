import { useState } from "react";

export default function Navbar({
  username,
  role,
  onLogout,
  theme,
  setTheme,
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">InventoryPro</h2>
      </div>
      <div className="navbar-right">
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "" : ""}
        </button>

        <div className="profile-wrapper">
          <button className="profile-btn" onClick={() => setOpen(!open)}>
            <div className="avatar">
              {username[0].toUpperCase()}
            </div>
            <div className="profile-text">
              <span className="profile-name">{username}</span>
              <span className="profile-role">{role}</span>
            </div>
          </button>

          {open && (
            <div className="profile-dropdown">
              <button onClick={() => alert("Profile page coming soon")}>
                My Profile
              </button>
              <button onClick={() => alert("Change password from admin panel for now")}>
                Change Password
              </button>
              <div className="dropdown-divider"></div>
              <button className="danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
