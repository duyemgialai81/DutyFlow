import { useState } from "react";
import { Check, Copy, Plug, PlugZap, ShieldAlert, Unplug, ExternalLink, Workflow, FlaskConical } from "lucide-react";
import { useZaloStatus, useZaloEmployees, useZaloDevFailure, useZaloMutations } from "../hooks/useZalo";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { Avatar, Button, Card, ConfirmDialog, Modal, Skeleton, Toggle } from "../components/ui";
import { cx, fmtDateTime, maskZaloId } from "../lib/utils";

function ZaloLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <rect width="48" height="48" rx="11" fill="#0068FF" />
      <path d="M13 15.5h8.2c2.5 0 4 1.5 4 3.7 0 1.6-.8 2.7-2.1 3.2l2.5 6.1h-3.4l-2.2-5.5h-3.7v5.5H13v-13Zm3.3 2.7v4.9h4.6c1 0 1.6-.7 1.6-1.6v-1.6c0-1-.6-1.7-1.6-1.7h-4.6ZM26.6 15.5h3.2l5.6 8v-8h3.2v13h-3.2l-5.6-8v8h-3.2v-13Z" fill="#fff" />
      <path d="M13 32.5h22" stroke="#4DA3FF" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

const OAUTH_STEPS = [
  ["Frontend", "Bấm “Kết nối Zalo”"],
  ["Backend", "GET /api/integrations/zalo/connect → trả OAuth URL"],
  ["Zalo", "Người dùng đăng nhập & đồng ý quyền"],
  ["Backend", "GET /callback?code=… → exchange access_token"],
  ["Backend", "Lưu ZaloMapping (token mã hoá, không trả về frontend)"],
];

export function ZaloIntegrationPage() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const { data: status, isLoading } = useZaloStatus();
  const { data: employees } = useZaloEmployees();
  const { data: devFailure } = useZaloDevFailure();
  const mut = useZaloMutations();

  const [authOpen, setAuthOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const startConnect = async () => {
    try {
      const res = await mut.connect.mutateAsync();
      setAuthUrl(res.authorizationUrl);
      setAuthOpen(true);
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const completeConnect = async () => {
    try {
      await mut.completeConnect.mutateAsync();
      setAuthOpen(false);
      push("success", "Đã kết nối Zalo thành công. Từ giờ bạn sẽ nhận thông báo ca trực qua Zalo.");
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const togglePref = async (v: boolean) => {
    try {
      await mut.setPreferences.mutateAsync(v);
      push("success", v ? "Đã bật nhận thông báo lịch trực qua Zalo." : "Đã tắt nhận thông báo — bạn vẫn thấy thông báo trong ứng dụng.");
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const copyId = async () => {
    if (!status?.zaloUserId) return;
    try {
      await navigator.clipboard.writeText(status.zaloUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      push("info", `Zalo User ID: ${status.zaloUserId}`);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-56 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* card kết nối */}
      <Card className="anim-rise overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 bg-[#0068FF] px-6 py-6 text-white">
          <ZaloLogo className="h-16 w-16 shadow-lg ring-4 ring-white/20" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold">Kết nối Zalo</h2>
            <p className="mt-0.5 text-[13.5px] text-blue-100">
              Nhận thông báo phân ca, đổi lịch, hủy ca trực tiếp qua Zalo cá nhân.
            </p>
          </div>
          {status?.connected ? (
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13px] font-bold ring-1 ring-white/30">
              <span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-300" /> Đã kết nối Zalo
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-bold text-blue-100 ring-1 ring-white/20">
              Chưa kết nối
            </span>
          )}
        </div>

        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          {status?.connected ? (
            <>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Zalo User ID</div>
                <button
                  onClick={copyId}
                  className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-[13px] font-semibold text-ink transition-colors hover:border-[#0068FF]/50"
                >
                  {maskZaloId(status.zaloUserId)}
                  {copied ? <Check className="h-4 w-4 text-ok-600" /> : <Copy className="h-4 w-4 text-muted" />}
                </button>
                <div className="mt-2 text-[12px] text-muted">
                  Kết nối lúc {status.connectedAt ? fmtDateTime(status.connectedAt) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Nhận thông báo lịch trực</div>
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
                  <Toggle checked={status.receiveNotifications} onChange={togglePref} label="Nhận thông báo" />
                  <span className="text-[13px] font-semibold text-inksoft">
                    {status.receiveNotifications ? "Đang bật — gửi qua Zalo" : "Đang tắt"}
                  </span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setDisconnectOpen(true)}>
                    <Unplug className="h-4 w-4" /> Ngắt kết nối
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              {!isAdmin ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg" className="bg-[#0068FF] hover:bg-[#0057d6]" onClick={startConnect} loading={mut.connect.isPending}>
                    <Plug className="h-5 w-5" /> Kết nối Zalo
                  </Button>
                  <p className="max-w-sm text-[12.5px] leading-snug text-muted">
                    Backend sẽ điều hướng bạn tới trang uỷ quyền của Zalo, sau đó lưu mapping an toàn — frontend không bao giờ giữ token.
                  </p>
                </div>
              ) : (
                <p className="text-[13px] text-muted">
                  Tài khoản quản trị không nhận ca trực — xem trạng thái kết nối của nhân viên ở bảng dưới. Chuyển sang phiên nhân viên để tự kết nối.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* luồng OAuth */}
      <Card className="anim-rise p-5">
        <h3 className="font-display flex items-center gap-2 text-[15px] font-bold text-ink">
          <Workflow className="h-4 w-4 text-pine-600" /> Luồng OAuth 2.0 (Social API)
        </h3>
        <ol className="mt-3 grid gap-2">
          {OAUTH_STEPS.map(([who, what], i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-linesoft bg-paper/60 px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-800 font-mono text-[11px] font-bold text-white">{i + 1}</span>
              <span className="rounded bg-pine-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-pine-800">{who}</span>
              <span className="text-[12.5px] text-inksoft">{what}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warn-600/25 bg-warn-100/60 px-3 py-2.5 text-[12px] leading-snug text-warn-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Lưu ý giới hạn Zalo:</b> Social API gửi tin nhắn cá nhân cần ứng dụng được Zalo duyệt quyền; với Zalo OA cần OA xác thực và dùng OA Message API.
            Backend tách kênh gửi qua interface <code className="rounded bg-white/70 px-1 font-mono">NotificationChannel</code> nên có thể thay provider (Zalo OA, ZNS, SMS…) mà không đổi nghiệp vụ.
          </span>
        </div>
      </Card>

      {/* bảng nhân viên (admin) */}
      {isAdmin && (
        <Card className="anim-rise overflow-hidden">
          <div className="border-b border-linesoft px-5 py-3.5">
            <h3 className="font-display text-[15px] font-bold text-ink">Kết nối của nhân viên</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-linesoft bg-paper/70 text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-bold">Nhân viên</th>
                  <th className="px-3 py-2.5 font-bold">Zalo User ID</th>
                  <th className="px-3 py-2.5 font-bold">Trạng thái</th>
                  <th className="px-5 py-2.5 text-right font-bold">Nhận TB</th>
                </tr>
              </thead>
              <tbody>
                {(employees ?? []).map((e) => (
                  <tr key={e.employeeId} className="border-b border-linesoft transition-colors last:border-0 hover:bg-pine-50/40">
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={e.employeeName} size="sm" />
                        <span>
                          <span className="block font-bold text-ink">{e.employeeName}</span>
                          <span className="block font-mono text-[11px] text-muted">{e.employeeCode}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-inksoft">{e.connected ? maskZaloId(e.zaloUserId) : "—"}</td>
                    <td className="px-3 py-2.5">
                      {e.connected ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-ok-100 px-2 py-0.5 text-[11.5px] font-bold text-ok-700">
                          <PlugZap className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        <span className="rounded-md bg-linesoft px-2 py-0.5 text-[11.5px] font-semibold text-muted">Chưa kết nối</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={cx(
                        "rounded-md px-2 py-0.5 text-[11.5px] font-bold",
                        e.connected && e.receiveNotifications ? "bg-pine-100 text-pine-800" : "bg-linesoft text-muted",
                      )}>
                        {e.connected && e.receiveNotifications ? "Bật" : "Tắt"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* dev tools */}
      <Card className="anim-rise border-dashed p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-night-100 text-night-600"><FlaskConical className="h-4.5 w-4.5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13.5px] font-bold text-ink">Giả lập Zalo API lỗi (chỉ demo)</h3>
            <p className="text-[12px] text-muted">Bật để xem pipeline retry 3 lần + idempotency của NotificationService.</p>
          </div>
          <Toggle
            checked={devFailure?.enabled ?? false}
            onChange={(v) => mut.setDevFailure.mutate(v, {
              onSuccess: () => push("info", v ? "Đã bật giả lập lỗi — thông báo mới sẽ retry 3 lần rồi FAILED." : "Đã tắt giả lập lỗi Zalo."),
            })}
            label="Giả lập lỗi"
          />
        </div>
      </Card>

      {/* modal uỷ quyền */}
      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title="Ủy quyền Zalo" width="max-w-md">
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center gap-3">
            <ZaloLogo className="h-11 w-11" />
            <div>
              <p className="text-[13.5px] font-bold text-ink">TrựcCa yêu cầu quyền:</p>
              <p className="text-[12px] text-muted">Gửi tin nhắn thông báo tới tài khoản của bạn</p>
            </div>
          </div>
          <div className="mt-3 break-all rounded-lg border border-line bg-white px-3 py-2 font-mono text-[10.5px] leading-relaxed text-muted">
            {authUrl} <ExternalLink className="inline h-3 w-3" />
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-muted">
            Môi trường demo mô phỏng màn hình đồng ý. Với backend thật, bạn được chuyển hướng tới URL này và backend nhận <code className="font-mono">code</code> qua callback.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAuthOpen(false)}>Từ chối</Button>
          <Button className="bg-[#0068FF] hover:bg-[#0057d6]" onClick={completeConnect} loading={mut.completeConnect.isPending}>
            Cho phép
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={() => mut.disconnect.mutate(undefined, {
          onSuccess: () => { setDisconnectOpen(false); push("info", "Đã ngắt kết nối Zalo. Bạn vẫn xem được thông báo trong ứng dụng."); },
        })}
        title="Ngắt kết nối Zalo"
        danger
        confirmLabel="Ngắt kết nối"
        loading={mut.disconnect.isPending}
        message="Sau khi ngắt, bạn sẽ không nhận thông báo ca trực qua Zalo cho tới khi kết nối lại."
      />
    </div>
  );
}
