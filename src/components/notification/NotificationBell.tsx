import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, MessageSquare, Send, RefreshCw, XCircle } from "lucide-react";
import { useNotifications, useNotificationMutations, useUnreadCount } from "../../hooks/useNotifications";
import { useAuth, useToast } from "../../state/AppProviders";
import { cx, timeAgo } from "../../lib/utils";
import type { AppNotification } from "../../types/duty";

function DeliveryIcon({ n }: { n: AppNotification }) {
  if (n.status === "SENT") return <Send className="h-3.5 w-3.5 text-ok-600" />;
  if (n.status === "RETRYING" || n.status === "PROCESSING" || n.status === "PENDING")
    return <RefreshCw className="h-3.5 w-3.5 animate-spin text-warn-600" />;
  if (n.status === "FAILED") return <XCircle className="h-3.5 w-3.5 text-danger-600" />;
  return <MessageSquare className="h-3.5 w-3.5 text-muted" />;
}

export function NotificationBell() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadCount();
  const { data: list } = useNotifications(false);
  const mut = useNotificationMutations();

  const items = (list ?? []).slice(0, 7);

  const markAll = () => {
    mut.markAllRead.mutate(undefined, {
      onSuccess: () => push("success", "Đã đánh dấu tất cả thông báo là đã đọc."),
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-line bg-white p-2.5 shadow-sm transition-all hover:border-pine-300 hover:shadow"
        aria-label="Thông báo"
      >
        <Bell className="h-[18px] w-[18px] text-ink" />
        {!!unread && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="anim-pop absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between border-b border-linesoft bg-pine-50/60 px-4 py-3">
              <h3 className="font-display text-[15px] font-bold text-ink">Thông báo</h3>
              {items.length > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-bold text-pine-700 transition-colors hover:bg-pine-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-6 w-6 text-line" />
                  <p className="text-sm font-semibold text-muted">Chưa có thông báo nào</p>
                  <p className="mt-0.5 text-[12px] text-muted/80">
                    {isAdmin ? "Thông báo sẽ xuất hiện khi nhân viên được phân ca." : "Bạn sẽ nhận thông báo khi được phân ca trực."}
                  </p>
                </div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => mut.markRead.mutate(n.id)}
                  className={cx(
                    "flex w-full items-start gap-3 border-b border-linesoft px-4 py-3 text-left transition-colors last:border-0 hover:bg-pine-50/50",
                    !n.read && "bg-gold-100/30",
                  )}
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: n.read ? "var(--color-line)" : "var(--color-gold-300)" }} />
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate text-[13px]", n.read ? "font-semibold text-inksoft" : "font-bold text-ink")}>{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-[12px] leading-snug text-muted">{n.content}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                      <DeliveryIcon n={n} />
                      <span>{n.status === "SENT" ? "Đã gửi Zalo" : n.status === "FAILED" ? "Gửi thất bại" : n.status === "RETRYING" ? `Đang gửi lại (lần ${n.retryCount}/3)` : "Đang gửi…"}</span>
                      <span>· {timeAgo(n.createdAt)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-linesoft bg-paper px-4 py-2.5 text-center text-[12.5px] font-bold text-pine-700 transition-colors hover:bg-pine-100"
            >
              Xem tất cả
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
