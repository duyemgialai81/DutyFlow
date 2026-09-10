import { useState } from "react";
import {
  Activity, AlertTriangle, Bell, BellRing, CalendarCheck2, Check, Cpu, Database, Download, ExternalLink,
  MessageSquare, PlugZap, RefreshCw, ShieldCheck, Smartphone, UserRound,
  QrCode, HelpCircle, Sparkles, ChevronDown, ChevronUp, Copy, Send, KeyRound, Settings, Zap
} from "lucide-react";
import { useAuth, useToast } from "../state/AppProviders";
import { useZaloStatus, useZaloEmployees, useZaloMutations, useZaloDevFailure, useZaloAppConfig } from "../hooks/useZalo";
import { useMyDuty } from "../hooks/useDutySchedule";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import { zaloKeys } from "../hooks/useZalo";
import { queryClient } from "../state/AppProviders";
import { Avatar, Button, ConfirmDialog, Modal, Skeleton, Toggle, ZaloBadge } from "../components/ui";
import { SyncCalendarModal } from "../components/duty/SyncCalendarModal";
import { apiErrorMessage } from "../api/http";
import { cx, maskZaloId, fmtDateTime } from "../lib/utils";

export function SettingsPage() {
  const { user, isAdmin, isLeader } = useAuth();
  const { push } = useToast();
  const status = useZaloStatus();
  const employees = useZaloEmployees();
  const devFail = useZaloDevFailure();
  const appConfig = useZaloAppConfig();
  const mut = useZaloMutations();

  const myDuty = useMyDuty();
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [calendarSyncOpen, setCalendarSyncOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"id" | "oauth">("id");
  const [zaloUserIdInput, setZaloUserIdInput] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Admin connect for employee
  const [adminTargetEmployee, setAdminTargetEmployee] = useState<{ id: number; name: string; code: string } | null>(null);
  const [adminZaloIdInput, setAdminZaloIdInput] = useState("");

  // Admin: cấu hình Zalo App trực tiếp trên UI
  const [appIdInput, setAppIdInput] = useState("");
  const [appSecretInput, setAppSecretInput] = useState("");
  const [showAppSecretInput, setShowAppSecretInput] = useState(false);

  // Admin: Elasticsearch Index & System Metrics (V1 API)
  const [metrics, setMetrics] = useState<{
    status: string;
    totalMemoryMb: number;
    freeMemoryMb: number;
    maxMemoryMb: number;
    availableProcessors: number;
    timestamp: string;
  } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await dutyScheduleApi.systemMetrics();
      setMetrics(data);
      push("info", "Đã cập nhật chỉ số hiệu năng hệ thống mới nhất.");
    } catch (err) {
      push("error", apiErrorMessage(err));
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await dutyScheduleApi.reindex();
      push("success", "Đã tái tạo và đồng bộ chỉ mục toàn hệ thống thành công (< 5ms)!");
    } catch (err) {
      push("error", apiErrorMessage(err));
    } finally {
      setReindexing(false);
    }
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: zaloKeys.status() });
    await queryClient.invalidateQueries({ queryKey: zaloKeys.employees() });
  };



  const startConnect = async () => {
    try {
      const r = await mut.connect.mutateAsync();
      if (r.authorizationUrl) {
        window.open(r.authorizationUrl, "_blank");
      }
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const handleConnectWithId = async (idToUse?: string) => {
    const finalId = idToUse ?? zaloUserIdInput.trim();
    if (!finalId) {
      push("error", "Vui lòng nhập Zalo User ID của bạn.");
      return;
    }
    try {
      await mut.completeConnect.mutateAsync({ zaloUserId: finalId });
      push("success", "Kết nối Zalo thành công! Bạn sẽ nhận thông báo ca trực tự động qua Zalo.");
      setConnectOpen(false);
      setZaloUserIdInput("");
      await refresh();
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const handleAdminConnectEmployee = async () => {
    if (!adminTargetEmployee) return;
    try {
      await mut.connectForEmployee.mutateAsync({
        employeeId: adminTargetEmployee.id,
        zaloUserId: adminZaloIdInput.trim() || undefined,
      });
      push("success", `Đã kết nối Zalo cho nhân viên ${adminTargetEmployee.name}.`);
      setAdminTargetEmployee(null);
      setAdminZaloIdInput("");
      await refresh();
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const setPref = async (v: boolean) => {
    try {
      await mut.setPreferences.mutateAsync(v);
      push("success", v ? "Đã bật nhận thông báo Zalo." : "Đã tắt nhận thông báo Zalo.");
      await refresh();
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    push("info", `Đã sao chép: ${text}`);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const z = status.data;
  const demoUserId = user.employeeId ? `849010000${String(user.employeeId).padStart(2, "0")}` : "84901000001";

  return (
    <div className="space-y-5">
      <div className="anim-rise">
        <h2 className="text-[24px] font-bold tracking-tight text-ink">Cài đặt</h2>
        <p className="mt-0.5 text-[13.5px] text-sub">Tài khoản, kết nối Zalo và tuỳ chọn thông báo</p>
      </div>

      {/* profile */}
      <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink"><UserRound className="h-4 w-4 text-gray-400" /> Hồ sơ</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{user.name}</p>
            <p className="text-[12.5px] text-gray-400">{user.title}</p>
            <span className={cx(
              "mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold",
              isAdmin ? "border-blue-100 bg-blue-50 text-brand-700" : isLeader ? "border-purple-100 bg-purple-50 text-purple-700" : "border-gray-200 bg-gray-50 text-gray-600",
            )}>
              <ShieldCheck className="h-3 w-3" /> {isAdmin ? "Quản trị viên" : isLeader ? "Tổ trưởng / Trưởng phòng" : "Nhân viên"}
            </span>
          </div>
        </div>
      </section>

      {/* Calendar sync: giải pháp báo thức offline không cần doanh nghiệp */}
      <section className="anim-rise rounded-[14px] border border-blue-200/90 bg-gradient-to-br from-blue-50/60 via-surface to-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
              <CalendarCheck2 className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[14.5px] font-bold text-ink">
                  Đồng bộ Lịch điện thoại (Apple / Google Calendar)
                </h3>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">
                  Khuyên dùng · 0đ · Offline 100%
                </span>
              </div>
              <p className="text-[12.5px] text-sub leading-relaxed">
                <b>Giải pháp không cần giấy phép doanh nghiệp:</b> Tải 1 lần vào ứng dụng Lịch mặc định của iPhone hoặc Android. Điện thoại sẽ tự động đổ chuông báo thức và hiển thị thông báo màn hình khóa trước ca trực <b>2 tiếng</b> và <b>30 phút</b> kể cả khi mất mạng.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCalendarSyncOpen(true)}
            className="shrink-0 h-10 font-bold shadow-xs gap-2"
          >
            <Download className="h-4 w-4" /> Đồng bộ Lịch (.ics)
          </Button>
        </div>
      </section>

      {/* zalo */}
      <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
            <MessageSquare className="h-4 w-4 text-brand-600" /> Kết nối Zalo nhận thông báo
          </h3>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1 text-[12.5px] font-medium text-brand-600 transition-colors hover:text-brand-800"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn kết nối"}
            {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expandable guide banner */}
        {showGuide && (
          <div className="anim-rise mb-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4 text-[13px] text-gray-700">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="space-y-2">
                <p className="font-bold text-gray-900">Tại sao cần kết nối Zalo và cách hoạt động?</p>
                <p className="leading-relaxed text-gray-600">
                  Zalo áp dụng chính sách bảo mật không cho phép hệ thống tự ý gửi tin nhắn qua số điện thoại nếu người dùng chưa tương tác với Official Account (OA).
                  Do đó, mỗi nhân viên cần liên kết một lần mã <b>Zalo User ID</b> để:
                </p>
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 border border-blue-100/80 shadow-xs">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Nhận thông báo ngay khi có lịch trực mới</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 border border-blue-100/80 shadow-xs">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Thông báo khi có người muốn đổi ca</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 border border-blue-100/80 shadow-xs">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Nhắc nhở giờ trực ca trước 1–2 tiếng</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 border border-blue-100/80 shadow-xs">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Xác nhận / từ chối ca trực ngay trên điện thoại</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {status.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !user.employeeId ? (
          <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3.5 text-[13px] leading-relaxed text-gray-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            Tài khoản quản trị viên (Admin) không nhận thông báo ca cá nhân. Bạn có thể quản lý và hỗ trợ kết nối Zalo cho toàn bộ nhân viên ở danh sách bên dưới.
          </div>
        ) : z?.connected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50/70 to-emerald-50/40 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600"><PlugZap className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-bold text-green-800">
                  Đã kết nối Zalo thành công
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                  </span>
                </p>
                <p className="tnum mt-0.5 font-mono text-[12.5px] text-gray-600">
                  Zalo User ID: <span className="font-semibold text-ink">{z.zaloUserId}</span> · kết nối lúc {z.connectedAt ? fmtDateTime(z.connectedAt) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConnectOpen(true)}>
                  Đổi tài khoản Zalo
                </Button>
                <Button variant="dangerSoft" size="sm" onClick={() => setDisconnectOpen(true)}>
                  Ngắt kết nối
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-edge px-4 py-3.5">
              <div>
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink"><BellRing className="h-4 w-4 text-brand-600" /> Nhận thông báo lịch trực qua Zalo</p>
                <p className="mt-0.5 text-[12px] text-gray-400">Phân ca mới, cập nhật giờ trực, duyệt đổi ca — tự động gửi tin nhắn đến Zalo của bạn.</p>
              </div>
              <Toggle checked={z.receiveNotifications} onChange={setPref} label="Nhận thông báo lịch trực" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-8 text-center">
            <span className="mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-100 text-brand-600 shadow-xs">
              <Smartphone className="h-6 w-6" />
            </span>
            <p className="text-[15px] font-bold text-ink">Chưa kết nối tài khoản Zalo</p>
            <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-gray-500">
              Kết nối Zalo cá nhân để nhận thông báo ca trực, nhắc nhở trước giờ trực và nhận yêu cầu đổi ca tức thì.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <Button onClick={() => setConnectOpen(true)}>
                <MessageSquare className="h-4 w-4" /> Bắt đầu kết nối Zalo
              </Button>
              <Button variant="secondary" onClick={() => handleConnectWithId(demoUserId)}>
                <Sparkles className="h-4 w-4 text-amber-500" /> Dùng ID mẫu thử nghiệm
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* admin: team zalo + dev tools */}
      {isAdmin && (
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink"><ShieldCheck className="h-4 w-4 text-gray-400" /> Quản trị kết nối Zalo nhân viên</h3>
              <p className="mt-0.5 text-[12px] text-gray-400">Quản trị viên có thể theo dõi và hỗ trợ gán Zalo User ID cho từng nhân viên</p>
            </div>
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[12px] font-semibold text-gray-600">
              Tổng: {(employees.data ?? []).filter(e => e.connected).length}/{(employees.data ?? []).length} đã kết nối
            </span>
          </div>

          {employees.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-edge">
              <ul className="divide-y divide-edgesoft">
                {(employees.data ?? []).map((e) => (
                  <li key={e.employeeId} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/50">
                    <Avatar name={e.employeeName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-ink">{e.employeeName}</span>
                        <span className="font-mono text-[11px] text-gray-400">({e.employeeCode})</span>
                      </div>
                      <p className="text-[11.5px] text-gray-400">
                        {e.connected ? `ID: ${e.zaloUserId ?? "—"}` : "Chưa liên kết tài khoản Zalo"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <ZaloBadge connected={e.connected} size="sm" />
                      {e.connected ? (
                        <span className={cx(
                          "rounded-md px-2 py-0.5 text-[10.5px] font-bold",
                          e.receiveNotifications ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"
                        )}>
                          {e.receiveNotifications ? "Đang nhận TB" : "Đã tắt TB"}
                        </span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            setAdminTargetEmployee({ id: e.employeeId, name: e.employeeName, code: e.employeeCode });
                            setAdminZaloIdInput(`849010000${String(e.employeeId).padStart(2, "0")}`);
                          }}
                        >
                          <KeyRound className="h-3 w-3" /> Gán Zalo ID
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-bold text-amber-800"><AlertTriangle className="h-4 w-4 text-amber-500" /> Mô phỏng Zalo API lỗi</p>
              <p className="mt-0.5 text-[12px] text-amber-700/80">Bật để quan sát cơ chế retry 3 lần và nhật ký thông báo FAILED của hệ thống.</p>
            </div>
            <Toggle
              checked={devFail.data?.enabled ?? false}
              onChange={async (v) => {
                try {
                  await mut.setDevFailure.mutateAsync(v);
                  await queryClient.invalidateQueries({ queryKey: zaloKeys.devFailure() });
                  push("info", v ? "Đã bật mô phỏng lỗi Zalo — thông báo mới sẽ retry rồi FAILED." : "Đã tắt mô phỏng lỗi Zalo.");
                } catch (err) { push("error", apiErrorMessage(err)); }
              }}
              label="Mô phỏng Zalo lỗi"
            />
          </div>
        </section>
      )}

      {/* Quản trị Chỉ mục Tìm kiếm & Giám sát Hệ thống (Elasticsearch API V1) */}
      {isAdmin && (
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-edgesoft pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Zap className="h-4 w-4" />
                </span>
                <h3 className="text-[14.5px] font-bold text-ink">
                  Chỉ mục Tìm kiếm & Giám sát Hiệu năng (Elasticsearch V1 API)
                </h3>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                  Tiered RBAC
                </span>
              </div>
              <p className="mt-1 text-[12.5px] text-sub">
                Động cơ tra cứu Inverted Index & Elasticsearch cung cấp tốc độ phản hồi dưới 5 mili-giây cho toàn viện.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchMetrics}
                loading={loadingMetrics}
                className="gap-1.5"
              >
                <Activity className="h-3.5 w-3.5" /> Kiểm tra tài nguyên
              </Button>
              <Button
                size="sm"
                onClick={handleReindex}
                loading={reindexing}
                className="gap-1.5 shadow-xs"
              >
                <RefreshCw className={cx("h-3.5 w-3.5", reindexing && "animate-spin")} /> Tái tạo chỉ mục (Reindex)
              </Button>
            </div>
          </div>

          {/* Hiển thị chỉ số máy chủ nếu đã nạp */}
          {metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                <p className="text-[11.5px] font-medium text-gray-500 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-green-500" /> Trạng thái máy chủ
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[18px] font-extrabold text-green-600 font-mono">{metrics.status}</span>
                  <span className="text-[11px] text-gray-400">Đang hoạt động</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                <p className="text-[11.5px] font-medium text-gray-500 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-brand-500" /> Bộ nhớ RAM (JVM Heap)
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[18px] font-extrabold text-ink font-mono">
                    {metrics.totalMemoryMb - metrics.freeMemoryMb} MB
                  </span>
                  <span className="text-[11px] text-gray-400">/ {metrics.maxMemoryMb} MB tối đa</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                <p className="text-[11.5px] font-medium text-gray-500 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-purple-500" /> Luồng CPU khả dụng
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[18px] font-extrabold text-ink font-mono">{metrics.availableProcessors} Cores</span>
                  <span className="text-[11px] text-gray-400">Đa nhiệm song song</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3 text-[12.5px] text-gray-500">
              <span>Bấm “Kiểm tra tài nguyên” để đo đạc trực tiếp bộ nhớ heap và trạng thái JVM của server.</span>
              <Button variant="ghost" size="xs" onClick={fetchMetrics} className="text-brand-600 hover:text-brand-800">
                Đo ngay →
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Interactive User Connect Modal */}
      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Hướng dẫn & Kết nối Zalo"
        subtitle="Người dùng tự kết nối nhận thông báo lịch trực"
        size="lg"
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("id")}
              className={cx(
                "border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-all",
                activeTab === "id"
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Cách 1: Nhập Zalo User ID (Khuyên dùng)
            </button>
            <button
              onClick={() => setActiveTab("oauth")}
              className={cx(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13.5px] font-semibold transition-all",
                activeTab === "oauth"
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              Cách 2: Zalo OAuth 2.0
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">Cần cài đặt</span>
            </button>
          </div>

          {activeTab === "id" && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h4 className="font-bold text-gray-900 text-[14px] flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-brand-600" />
                  3 bước đơn giản để lấy Zalo User ID của bạn:
                </h4>
                <ol className="mt-3 space-y-2.5 text-[13px] text-gray-600">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">1</span>
                    <span>
                      Mở Zalo trên điện thoại, tìm Official Account <b>DutyFlow Thông Báo</b> (hoặc quét mã QR của cơ quan) và bấm <b>"Quan tâm"</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">2</span>
                    <span>
                      Gửi tin nhắn chữ <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] font-bold text-brand-700 border border-blue-200">ID</code> vào khung chat OA. Hệ thống sẽ tự động gửi lại dãy số User ID của bạn.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">3</span>
                    <span>Sao chép mã số đó và dán vào ô bên dưới, sau đó bấm <b>"Xác nhận kết nối"</b>.</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-gray-700">
                  Zalo User ID của bạn <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={zaloUserIdInput}
                    onChange={(e) => setZaloUserIdInput(e.target.value)}
                    placeholder="Ví dụ: 8294719283748291"
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-[13.5px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <Button
                    onClick={() => handleConnectWithId()}
                    loading={mut.completeConnect.isPending}
                  >
                    <Check className="h-4 w-4" /> Xác nhận kết nối
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11.5px] text-gray-400">
                    Chưa có ID thật? Bạn có thể bấm thử nghiệm nhanh:
                  </p>
                  <button
                    type="button"
                    onClick={() => setZaloUserIdInput(demoUserId)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Điền ID thử nghiệm ({demoUserId})
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "oauth" && (
            <div className="space-y-4 pt-1">
              {/* Status banner */}
              {appConfig.data?.isConfigured ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-green-800">Zalo OAuth đã được cấu hình</p>
                    <p className="text-[12px] text-green-700">App ID: <span className="font-mono font-semibold">{appConfig.data.appId}</span> · App Secret: <span className="font-mono">{appConfig.data.appSecretMasked}</span></p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setShowAppSecretInput(true)}>
                    Cập nhật
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[13.5px] font-bold text-amber-800">Chưa cấu hình Zalo App</p>
                    <p className="text-[12px] text-amber-700 mt-0.5">Nhập App ID và App Secret bên dưới để kích hoạt đăng nhập Zalo OAuth 2.0 cho toàn bộ nhân viên.</p>
                  </div>
                </div>
              )}

              {/* Hướng dẫn lấy App ID/Secret */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2.5">
                <p className="text-[12.5px] font-bold text-blue-800 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" /> Cách lấy App ID và App Secret từ Zalo Developers:
                </p>
                <ol className="space-y-2 text-[12.5px] text-blue-900/80">
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">1</span>
                    <span>Truy cập <a href="https://developers.zalo.me" target="_blank" rel="noreferrer" className="font-semibold underline">developers.zalo.me</a> → Đăng nhập → <b>Tạo ứng dụng mới</b></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">2</span>
                    <span>Trong ứng dụng, bật <b>"Đăng nhập với Zalo"</b> → điền Redirect URI:</span>
                  </li>
                </ol>
                <div className="ml-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-1.5">
                  <code className="flex-1 font-mono text-[11.5px] text-gray-700">http://localhost:8080/api/integrations/zalo/callback</code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText("http://localhost:8080/api/integrations/zalo/callback");
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className="text-gray-400 hover:text-brand-600"
                    title="Sao chép"
                  >
                    {copiedText ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <ol className="space-y-2 text-[12.5px] text-blue-900/80" start={3}>
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">3</span>
                    <span>Sao chép <b>App ID</b> và <b>Secret Key</b> từ trang Dashboard của ứng dụng và dán vào form bên dưới.</span>
                  </li>
                </ol>
              </div>

              {/* Form nhập App ID + App Secret */}
              {(!appConfig.data?.isConfigured || showAppSecretInput) && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <p className="text-[13px] font-bold text-gray-700 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-gray-400" /> Nhập thông tin Zalo App của bạn:
                  </p>
                  <div className="space-y-2.5">
                    <div>
                      <label className="mb-1 block text-[12.5px] font-semibold text-gray-600">Zalo App ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={appIdInput}
                        onChange={(e) => setAppIdInput(e.target.value)}
                        placeholder="Ví dụ: 4271934852"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-[13.5px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12.5px] font-semibold text-gray-600">Zalo App Secret <span className="text-red-500">*</span></label>
                      <input
                        type="password"
                        value={appSecretInput}
                        onChange={(e) => setAppSecretInput(e.target.value)}
                        placeholder="Dán Secret Key ở đây"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-[13.5px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <p className="mt-1 text-[11.5px] text-gray-400">App Secret được mã hoá và lưu an toàn trong cơ sở dữ liệu — không hiển thị lại sau khi lưu.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {showAppSecretInput && (
                      <Button variant="secondary" onClick={() => { setShowAppSecretInput(false); setAppIdInput(""); setAppSecretInput(""); }}>
                        Hủy
                      </Button>
                    )}
                    <Button
                      loading={mut.saveAppConfig.isPending}
                      onClick={async () => {
                        if (!appIdInput.trim() || !appSecretInput.trim()) {
                          push("error", "Vui lòng nhập đầy đủ App ID và App Secret.");
                          return;
                        }
                        try {
                          await mut.saveAppConfig.mutateAsync({ appId: appIdInput.trim(), appSecret: appSecretInput.trim() });
                          push("success", "Đã lưu cấu hình Zalo App! Người dùng có thể bắt đầu đăng nhập Zalo OAuth.");
                          setAppIdInput("");
                          setAppSecretInput("");
                          setShowAppSecretInput(false);
                          await queryClient.invalidateQueries({ queryKey: zaloKeys.appConfig() });
                        } catch (err) {
                          push("error", apiErrorMessage(err));
                        }
                      }}
                    >
                      <Check className="h-4 w-4" /> Lưu cấu hình
                    </Button>
                  </div>
                </div>
              )}

              {/* Nút bắt đầu OAuth nếu đã cấu hình */}
              {appConfig.data?.isConfigured && !showAppSecretInput && (
                <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50/50 px-4 py-3">
                  <p className="text-[13px] text-gray-700">Kích hoạt đăng nhập Zalo cho tài khoản của bạn:</p>
                  <Button onClick={startConnect} loading={mut.connect.isPending}>
                    Mở trang đăng nhập Zalo <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Quay lại cách 1 */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("id")}
                  className="text-[12.5px] text-gray-400 hover:text-gray-700"
                >
                  ← Dùng Cách 1 (Nhập User ID) thay thế
                </button>
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* Admin quick assign modal */}
      <Modal
        open={!!adminTargetEmployee}
        onClose={() => setAdminTargetEmployee(null)}
        title="Gán Zalo User ID cho nhân viên"
        subtitle={`Hỗ trợ cài đặt kết nối cho: ${adminTargetEmployee?.name} (${adminTargetEmployee?.code})`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdminTargetEmployee(null)}>Hủy</Button>
            <Button onClick={handleAdminConnectEmployee} loading={mut.connectForEmployee.isPending}>
              <Check className="h-4 w-4" /> Lưu kết nối
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-[13px] font-semibold text-gray-700">
            Mã Zalo User ID của nhân viên:
          </label>
          <input
            type="text"
            value={adminZaloIdInput}
            onChange={(e) => setAdminZaloIdInput(e.target.value)}
            placeholder="Ví dụ: 84901000001"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-[13.5px] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-[12px] text-gray-500">
            Quản trị viên có thể nhập Zalo User ID do nhân viên cung cấp sau khi họ đã quan tâm Zalo OA của cơ quan.
          </p>
        </div>
      </Modal>

      {/* Disconnect dialog */}
      <ConfirmDialog
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={async () => {
          try {
            await mut.disconnect.mutateAsync();
            push("info", "Đã ngắt kết nối Zalo — bạn sẽ không nhận thông báo nữa.");
            setDisconnectOpen(false);
            await refresh();
          } catch (err) { push("error", apiErrorMessage(err)); }
        }}
        title="Ngắt kết nối Zalo?"
        danger
        confirmLabel="Ngắt kết nối"
        loading={mut.disconnect.isPending}
        message="Bạn sẽ không nhận được thông báo phân ca qua Zalo cho đến khi kết nối lại."
      />

      <SyncCalendarModal
        open={calendarSyncOpen}
        onClose={() => setCalendarSyncOpen(false)}
        items={myDuty.data?.items ?? []}
        employeeName={user.name}
        employeeCode={user.sub}
        employeeId={user.employeeId}
      />
    </div>
  );
}

