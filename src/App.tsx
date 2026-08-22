import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DutyCalendarPage } from "./pages/DutyCalendarPage";
import { DutyScheduleCreatePage } from "./pages/DutyScheduleCreatePage";
import { AutoAssignPage } from "./pages/AutoAssignPage";
import { DutyScheduleDetailPage } from "./pages/DutyScheduleDetailPage";
import { MyDutySchedulePage } from "./pages/MyDutySchedulePage";
import { ZaloIntegrationPage } from "./pages/ZaloIntegrationPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { DayOffsPage } from "./pages/DayOffsPage";

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/duty/calendar" replace />} />
          <Route path="/duty/calendar" element={<DutyCalendarPage />} />
          <Route path="/duty/create" element={<DutyScheduleCreatePage />} />
          <Route path="/duty/auto-assign" element={<AutoAssignPage />} />
          <Route path="/duty-schedules/:id" element={<DutyScheduleDetailPage />} />
          <Route path="/my-duty" element={<MyDutySchedulePage />} />
          <Route path="/day-offs" element={<DayOffsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings/zalo" element={<ZaloIntegrationPage />} />
          <Route path="*" element={<Navigate to="/duty/calendar" replace />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
