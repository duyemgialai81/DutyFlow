import { lazy, Suspense, useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { AuthContext } from "./state/AppProviders";
import { Skeleton } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ForbiddenPage, NetworkErrorPage, NotFoundPage, ServerErrorPage } from "./pages/ErrorPages";

const OverviewPage = lazy(() => import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const DutyCalendarPage = lazy(() => import("./pages/DutyCalendarPage").then((m) => ({ default: m.DutyCalendarPage })));
const MyDutySchedulePage = lazy(() => import("./pages/MyDutySchedulePage").then((m) => ({ default: m.MyDutySchedulePage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ShiftsPage = lazy(() => import("./pages/ShiftsPage").then((m) => ({ default: m.ShiftsPage })));
const RequestsPage = lazy(() => import("./pages/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function PageFallback() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function App() {
  const auth = useContext(AuthContext);

  if (!auth || !auth.user) {
    return (
      <ErrorBoundary>
        <LoginPage />
      </ErrorBoundary>
    );
  }

  const isEmployee = !auth.isAdmin && !auth.isLeader;
  const canManage = auth.isAdmin || auth.isLeader;

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppShell>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/duty/calendar" element={<DutyCalendarPage />} />
              <Route path="/my-duty" element={isEmployee ? <MyDutySchedulePage /> : <Navigate to="/duty/calendar" replace />} />
              <Route path="/users" element={auth.isAdmin ? <UsersPage /> : <ForbiddenPage />} />
              <Route path="/shifts" element={canManage ? <ShiftsPage /> : <ForbiddenPage />} />
              <Route path="/requests" element={<RequestsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/reports" element={canManage ? <ReportsPage /> : <ForbiddenPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Các tuyến đường trang báo lỗi chuyên dụng */}
              <Route path="/error/403" element={<ForbiddenPage />} />
              <Route path="/error/500" element={<ServerErrorPage />} />
              <Route path="/error/503" element={<NetworkErrorPage />} />
              <Route path="/error/network" element={<NetworkErrorPage />} />
              <Route path="/error/404" element={<NotFoundPage />} />

              {/* Mọi đường dẫn không xác định tự động chuyển sang trang 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
