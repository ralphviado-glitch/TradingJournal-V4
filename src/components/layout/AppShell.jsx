import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/authState";
import Button from "../ui/Button";
import { navItems } from "./appNavigation";

function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");
    const { error } = await signOut();

    if (error) {
      setLogoutError(error.message || "Logout failed.");
      setIsLoggingOut(false);
      return;
    }

    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="app-brand">
          <span className="app-brand-mark">TJ</span>
          <div>
            <strong>Trading Journal</strong>
            <span>{user?.email}</span>
          </div>
        </div>

        <nav className="app-shell-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-shell-footer">
          {logoutError ? <p className="status-message error">{logoutError}</p> : null}
          <Button variant="secondary" isLoading={isLoggingOut} onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar">
          <div className="app-brand">
            <span className="app-brand-mark">TJ</span>
            <strong>Trading Journal</strong>
          </div>
          <Button variant="secondary" isLoading={isLoggingOut} onClick={handleLogout}>
            Logout
          </Button>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default AppShell;
