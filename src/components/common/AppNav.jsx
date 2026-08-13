import { NavLink } from "react-router-dom";

function AppNav() {
  return (
    <nav className="app-nav" aria-label="Primary">
      <NavLink to="/today">Today</NavLink>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/analytics">Analytics</NavLink>
    </nav>
  );
}

export default AppNav;
