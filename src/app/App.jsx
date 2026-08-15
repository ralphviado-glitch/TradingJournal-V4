import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "../context/AuthProvider";
import ProtectedRoute from "../components/common/ProtectedRoute";
import PublicOnlyRoute from "../components/common/PublicOnlyRoute";
import AppShell from "../components/layout/AppShell";
import LoginPage from "../pages/login/LoginPage";
import SignupPage from "../pages/signup/SignupPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import TodayPage from "../pages/today/TodayPage";
import SettingsPage from "../pages/settings/SettingsPage";
import OverviewPage from "../pages/dashboard/OverviewPage";
import PlansPage from "../pages/plans/PlansPage";
import CalendarPage from "../pages/calendar/CalendarPage";

const AnalyticsPage = lazy(() => import("../pages/analytics/AnalyticsPage"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/today" element={<Navigate to="/pre-market-plan" replace />} />
              <Route path="/pre-market-plan" element={<TodayPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/journal" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/dashboard" element={<OverviewPage />} />
              <Route path="/analytics" element={<Suspense fallback={<p className="status-message loading">Loading analytics...</p>}><AnalyticsPage /></Suspense>} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
