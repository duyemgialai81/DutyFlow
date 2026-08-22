import { useState } from "react";
import { Bell, CheckCheck, RefreshCw, Send, XCircle, MessageSquare, Hourglass } from "lucide-react";
import { useNotifications, useNotificationMutations } from "../hooks/useNotifications";
import { useAuth, useToast } from "../state/AppProviders";
import { Card, EmptyState, Skeleton } from "../components/ui";
import { cx, fmtDateTime, timeAgo } from "../lib/utils";
import type { AppNotification } from "../types/duty";

function StatusPill({ n }: { n: AppNotification }) {
  const map: Record<AppNotification["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    SENT: { label: "Đã gửi", cls: "bg-ok-100 text-ok-700", icon: <Send className="h-3 w-3" /> },
    RETRYING: { label: `Đang gửi lại ${n.retryCount}/3`, cls: "bg-warn-100 text-warn-700", icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    PROCESSING: { label: "Đang xử lý", cls: "bg-info-100 text-info-700", icon: <Hourglass className="h-3 w-3" /> },
    PENDING: { label: "Chờ gửi", cls: "bg-linesoft text-muted", icon: <Hourglass className="h-3 w-3" /> },
    FAILED: { label: "Thất bại", cls: "bg-danger-100 text-danger-700", icon: <XCircle className="h-3 w-3" /> },
  };
  const m = map[n.status];
  return <span className={cx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold", m.cls)}>{m.icon}{m.label}</span>;
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
  const retrying = list.filter((n) => n.status === "RETRYING" || n.status === "PROCESSING" || n.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && (
          <div className="flex rounded-xl border border-line bg-white p-1 shadow-sm">
            {([["mine", "Của tôi"], ["log", "Nhật ký gửi (tất cả)"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cx(
                  "rounded-lg px-4 py-2 text-[13px] font-bold transition-all",
                  tab === key ? "bg-pine-800 text-white shadow" : "text-inksoft hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 text-[12px] text-muted">
          {retrying > 0 && <span className="rounded-md bg-warn-100 px-2 py-1 font-bold text-warn-700">{retrying} đang gửi</span>}
          {failed > 0 && <span className="rounded-md bg-danger-100 px-2 py-1 font-bold text-danger-700">{failed} thất bại</span>}
          {!all && list.length > 0 && (
            <button
              onClick={() => mut.markAllRead.mutate(undefined, { onSuccess: () => push("success", "Đã đánh dấu tất cả là đã đọc.") })}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 font-bold text-pine-700 shadow-sm transition-colors hover:bg-pine-50"
            >
              <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={all ? "Chưa có bản ghi gửi nào" : "Chưa có thông báo"}
          message={all ? "Thông báo sẽ xuất hiện khi có nhân viên được phân ca." : "Bạn sẽ nhận thông báo khi được phân công ca trực."}
        />
      ) : (
        <div className="stagger space-y-2.5">
          {list.map((n) => (
            <Card key={n.id} className={cx("px-4 py-3.5 transition-all hover:shadow-[var(--shadow-pop)]", !n.read && !all && "border-gold-300/70 bg-gold-100/20")}>
              <button
                className="flex w-full items-start gap-3 text-left"
                onClick={() => { if (!n.read && !all) mut.markRead.mutate(n.id); }}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-100 text-pine-700">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cx("text-[14px]", n.read ? "font-semibold text-inksoft" : "font-extrabold text-ink")}>{n.title}</span>
                    {all && <span className="rounded bg-linesoft px-1.5 py-0.5 text-[10.5px] font-bold text-inksoft">→ {n.employeeName}</span>}
                    <span className="ml-auto whitespace-nowrap text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="mt-1 block whitespace-pre-line text-[12.5px] leading-relaxed text-muted">{n.content}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#e8f2fd] px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-[#1a73c8]">Zalo</span>
                    <StatusPill n={n} />
                    {n.sentAt && <span className="text-[11px] text-muted">gửi {fmtDateTime(n.sentAt)}</span>}
                    {n.externalMessageId && <code className="rounded bg-linesoft px-1.5 py-0.5 font-mono text-[10.5px] text-inksoft">{n.externalMessageId}</code>}
                    {n.retryCount > 0 && <span className="text-[11px] font-bold text-warn-700">retry {n.retryCount}/3</span>}
                  </span>
                  {n.lastError && n.status === "FAILED" && (
                    <span className="mt-1.5 block rounded-md bg-danger-100 px-2 py-1 font-mono text-[11px] text-danger-700">{n.lastError}</span>
                  )}
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
