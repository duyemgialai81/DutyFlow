import { useState } from "react";
import { Bell, CheckCheck, Hourglass, MessageSquare, RefreshCw, Send, XCircle } from "lucide-react";
import { useNotifications, useNotificationMutations } from "../hooks/useNotifications";
import { useAuth, useToast } from "../state/AppProviders";
import { EmptyState, Skeleton } from "../components/ui";
import { cx, fmtDateTime, timeAgo } from "../lib/utils";
import type { AppNotification } from "../types/duty";

function StatusPill({ n }: { n: AppNotification }) {
  const map: Record<AppNotification["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    SENT: { label: "Đã gửi", cls: "bg-green-50 text-green-700 border-green-100", icon: <Send className="h-3 w-3" /> },
    RETRYING: { label: `Đang gửi lại ${n.retryCount}/3`, cls: "bg-amber-50 text-amber-700 border-amber-100", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    PROCESSING: { label: "Đang xử lý", cls: "bg-blue-50 text-blue-700 border-blue-100", icon: <Hourglass className="h-3 w-3" /> },
    PENDING: { label: "Chờ gửi", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: <Hourglass className="h-3 w-3" /> },
    FAILED: { label: "Thất bại", cls: "bg-red-50 text-red-600 border-red-100", icon: <XCircle className="h-3 w-3" /> },
  };
  const m = map[n.status];
  return <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold", m.cls)}>{m.icon}{m.label}</span>;
}

export function NotificationsPage() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState<"mine" | "log">("mine");
  const all = tab === "log" && isAdmin;
  const { data, isLoading } = useNotifications(all);
  const mut = useNotificationMutations();

  const list = data ?? [];
  const failed = list.filter((n) => n.status === "FAILED").length;
  const inFlight = list.filter((n) => ["RETRYING", "PROCESSING", "PENDING"].includes(n.status)).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="anim-rise flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Thông báo</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">Nhật ký gửi thông báo qua Zalo · retry tối đa 3 lần · chống gửi trùng</p>
        </div>
        {isAdmin && (
          <div className="flex rounded-[10px] bg-gray-100 p-0.5">
            {([["mine", "Của tôi"], ["log", "Nhật ký gửi"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cx(
                  "rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold transition-all",
                  tab === key ? "bg-surface text-gray-900 shadow-sm" : "text-gray-500",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {inFlight > 0 && <span className="rounded-md bg-amber-50 px-2 py-1 text-[11.5px] font-bold text-amber-700">{inFlight} đang gửi</span>}
          {failed > 0 && <span className="rounded-md bg-red-50 px-2 py-1 text-[11.5px] font-bold text-red-600">{failed} thất bại</span>}
          {!all && list.length > 0 && (
            <button
              onClick={() => mut.markAllRead.mutate(undefined, { onSuccess: () => push("success", "Đã đánh dấu tất cả là đã đọc.") })}
              className="flex items-center gap-1.5 rounded-[10px] border border-edge bg-surface px-3 py-2 text-[12.5px] font-semibold text-brand-600 shadow-card transition-colors hover:bg-blue-50"
            >
              <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : list.length === 0 ? (
        <div className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<Bell className="h-7 w-7" />}
            title={all ? "Chưa có bản ghi gửi nào" : "Chưa có thông báo"}
            message={all ? "Bản ghi sẽ xuất hiện khi có nhân viên được phân ca." : "Bạn sẽ nhận thông báo khi được phân công ca trực."}
          />
        </div>
      ) : (
        <div className="stagger space-y-2.5">
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => { if (!n.read && !all) mut.markRead.mutate(n.id); }}
              className={cx(
                "w-full rounded-[14px] border bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-lift)]",
                !n.read && !all ? "border-blue-200 bg-blue-50/30" : "border-edge",
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cx(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                  n.status === "FAILED" ? "bg-red-50 text-red-500" : n.status === "SENT" ? "bg-green-50 text-green-600" : "bg-blue-50 text-brand-600",
                )}>
                  <MessageSquare className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cx("text-[13.5px]", n.read ? "font-semibold text-gray-600" : "font-bold text-ink")}>{n.title}</span>
                    {all && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-bold text-gray-500">→ {n.employeeName}</span>}
                    <span className="ml-auto whitespace-nowrap text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="mt-1 block whitespace-pre-line text-[12.5px] leading-relaxed text-gray-500">{n.content}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-blue-600">Zalo</span>
                    <StatusPill n={n} />
                    {n.sentAt && <span className="text-[11px] text-gray-400">gửi {fmtDateTime(n.sentAt)}</span>}
                    {n.externalMessageId && <code className="tnum rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px] text-gray-500">{n.externalMessageId}</code>}
                  </span>
                  {n.lastError && n.status === "FAILED" && (
                    <span className="mt-2 block rounded-lg bg-red-50 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-red-600">{n.lastError}</span>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
