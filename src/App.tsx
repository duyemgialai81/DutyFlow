import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { DutyCalendarPage } from "./pages/DutyCalendarPage";
import { MyDutySchedulePage } from "./pages/MyDutySchedulePage";
import { UsersPage } from "./pages/UsersPage";
import { ShiftsPage } from "./pages/ShiftsPage";
import { RequestsPage } from "./pages/RequestsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/duty/calendar" element={<DutyCalendarPage />} />
          <Route path="/my-duty" element={<MyDutySchedulePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
