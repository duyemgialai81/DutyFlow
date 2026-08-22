import { useState } from "react";
import {
  AlertTriangle, BellRing, Check, ExternalLink, MessageSquare, PlugZap, ShieldCheck, Smartphone, UserRound,
} from "lucide-react";
import { useAuth, demoUsers, useToast } from "../state/AppProviders";
import { useZaloStatus, useZaloEmployees, useZaloMutations, useZaloDevFailure } from "../hooks/useZalo";
import { zaloKeys } from "../hooks/useZalo";
import { queryClient } from "../state/AppProviders";
import { Avatar, Button, ConfirmDialog, Modal, Skeleton, Toggle, ZaloBadge } from "../components/ui";
import { apiErrorMessage } from "../api/http";
import { cx, maskZaloId, fmtDateTime } from "../lib/utils";

export function SettingsPage() {
  const { user, isAdmin, switchUser } = useAuth();
  const { push } = useToast();
  const status = useZaloStatus();
  const employees = useZaloEmployees();
  const devFail = useZaloDevFailure();
  const mut = useZaloMutations();

  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [oauthStep, setOauthStep] = useState(0); // 0: giải thích, 1: đã "redirect"

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: zaloKeys.status() });
    await queryClient.invalidateQueries({ queryKey: zaloKeys.employees() });
  };

  const startConnect = async () => {
    try {
      const r = await mut.connect.mutateAsync();
      void r.authorizationUrl; // backend thật: redirect tới URL này
      setOauthStep(1);
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const finishConnect = async () => {
    try {
      await mut.completeConnect.mutateAsync(); // backend thật: exchange code ở /callback
      push("success", "Đã kết nối Zalo — bạn sẽ nhận thông báo lịch trực.");
      setConnectOpen(false);
      setOauthStep(0);
      await refresh();
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const setPref = async (v: boolean) => {
    try {
      await mut.setPreferences.mutateAsync(v);
      push("success", v ? "Đã bật nhận thông báo Zalo." : "Đã tắt nhận thông báo Zalo.");
      await refresh();
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const z = status.data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
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
              isAdmin ? "border-blue-100 bg-blue-50 text-brand-700" : "border-gray-200 bg-gray-50 text-gray-600",
            )}>
              <ShieldCheck className="h-3 w-3" /> {isAdmin ? "Quản trị viên" : "Nhân viên"}
            </span>
          </div>
          <div className="w-full sm:w-56">
            <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-gray-400">Tài khoản demo</label>
            <div className="space-y-1">
              {demoUsers.map((u) => (
                <button
                  key={u.sub}
                  onClick={() => { switchUser(u.sub); push("info", `Đã chuyển sang ${u.name} (${u.role === "ADMIN" ? "quản trị" : "nhân viên"}).`); }}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-[12.5px] font-semibold transition-all",
                    u.sub === user.sub ? "border-blue-200 bg-blue-50/60 text-brand-700" : "border-edge bg-surface text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Avatar name={u.name} size="xs" /> {u.name}
                  {u.sub === user.sub && <Check className="ml-auto h-3.5 w-3.5 text-brand-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* zalo */}
      <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink"><MessageSquare className="h-4 w-4 text-gray-400" /> Kết nối Zalo</h3>
        {status.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !user.employeeId ? (
          <div className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3.5 text-[13px] leading-relaxed text-gray-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            Tài khoản quản trị không nhận thông báo cá nhân — kết nối Zalo áp dụng cho nhân viên. Xem trạng thái kết nối của toàn đội ở mục Quản trị bên dưới.
          </div>
        ) : z?.connected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-green-200 bg-green-50/50 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600"><PlugZap className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-bold text-green-800">
                  Đã kết nối Zalo
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </p>
                <p className="tnum mt-0.5 font-mono text-[12.5px] text-gray-500">
                  Zalo User ID: {maskZaloId(z.zaloUserId)} · kết nối {z.connectedAt ? fmtDateTime(z.connectedAt) : "—"}
                </p>
              </div>
              <Button variant="dangerSoft" size="sm" onClick={() => setDisconnectOpen(true)}>Ngắt kết nối</Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-edge px-4 py-3.5">
              <div>
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink"><BellRing className="h-4 w-4 text-brand-600" /> Nhận thông báo lịch trực</p>
                <p className="mt-0.5 text-[12px] text-gray-400">Phân ca mới, thay đổi lịch, hủy ca — gửi qua Zalo.</p>
              </div>
              <Toggle checked={z.receiveNotifications} onChange={setPref} label="Nhận thông báo lịch trực" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-8 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-brand-600"><Smartphone className="h-6 w-6" /></span>
            <p className="text-[14px] font-bold text-ink">Chưa kết nối Zalo</p>
            <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-gray-500">
              Kết nối để nhận thông báo phân ca, đổi lịch và hủy ca trực tiếp trên Zalo. Token được mã hoá và lưu phía máy chủ — không bao giờ hiển thị ở đây.
            </p>
            <Button className="mt-4" onClick={() => setConnectOpen(true)}>
              <MessageSquare className="h-4 w-4" /> Kết nối Zalo
            </Button>
          </div>
        )}
      </section>

      {/* admin: team zalo + dev tools */}
      {isAdmin && (
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-ink"><ShieldCheck className="h-4 w-4 text-gray-400" /> Quản trị</h3>

          <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-gray-400">Kết nối Zalo của nhân viên</p>
          {employees.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="divide-y divide-edgesoft rounded-xl border border-edge">
              {(employees.data ?? []).map((e) => (
                <li key={e.employeeId} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar name={e.employeeName} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{e.employeeName}</span>
                    <span className="block font-mono text-[11px] text-gray-400">{e.employeeCode}</span>
                  </span>
                  <ZaloBadge connected={e.connected} size="sm" />
                  {e.connected && (
                    <span className={cx("rounded-md px-2 py-0.5 text-[10.5px] font-bold", e.receiveNotifications ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400")}>
                      {e.receiveNotifications ? "Đang nhận TB" : "Đã tắt TB"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-bold text-amber-800"><AlertTriangle className="h-4 w-4 text-amber-500" /> Mô phỏng Zalo API lỗi</p>
              <p className="mt-0.5 text-[12px] text-amber-700/80">Bật để quan sát cơ chế retry 3 lần của pipeline thông báo.</p>
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

      {/* connect modal */}
      <Modal
        open={connectOpen}
        onClose={() => { setConnectOpen(false); setOauthStep(0); }}
        title="Kết nối Zalo"
        subtitle="Quy trình OAuth 2.0 — token chỉ lưu phía máy chủ"
        size="md"
        footer={
          oauthStep === 0 ? (
            <>
              <Button variant="secondary" onClick={() => setConnectOpen(false)}>Hủy</Button>
              <Button onClick={startConnect} loading={mut.connect.isPending}>
                Tiếp tục tới Zalo <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOauthStep(0)}>Quay lại</Button>
              <Button onClick={finishConnect} loading={mut.completeConnect.isPending}>
                <Check className="h-4 w-4" /> Tôi đã cho phép — Hoàn tất
              </Button>
            </>
          )
        }
      >
        <ol className="space-y-3">
          {[
            { t: "Backend tạo URL uỷ quyền", d: "GET /api/integrations/zalo/connect — kèm state chống CSRF.", done: true },
            { t: "Bạn đăng nhập & cho phép trên Zalo", d: "Zalo trả về mã code qua callback của backend.", done: oauthStep === 1, active: oauthStep === 0 },
            { t: "Backend đổi code lấy token", d: "Token mã hoá AES-256-GCM, lưu vào zalo_mapping. Chỉ backend gọi Zalo API.", done: false, active: oauthStep === 1 },
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={cx(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                s.done ? "bg-green-500 text-white" : s.active ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500",
              )}>
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div>
                <p className={cx("text-[13.5px] font-bold", s.done ? "text-green-700" : s.active ? "text-ink" : "text-gray-500")}>{s.t}</p>
                <p className="text-[12px] leading-snug text-gray-400">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        {oauthStep === 1 && (
          <p className="mt-4 rounded-lg bg-blue-50 px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-brand-700">
            Bản demo bỏ qua bước đăng nhập Zalo thật — bấm “Hoàn tất” để backend ghi nhận mapping như khi callback thành công.
          </p>
        )}
      </Modal>

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
    </div>
  );
}
