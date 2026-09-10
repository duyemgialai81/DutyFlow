import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bell, CheckCheck, Clock3, RefreshCw, Send, XCircle } from "lucide-react";
import { useNotifications, useNotificationMutations, useUnreadCount } from "../../hooks/useNotifications";
import { useToast } from "../../state/AppProviders";
import { cx, timeAgo } from "../../lib/utils";
import type { AppNotification } from "../../types/duty";

function DeliveryIcon({ n }: { n: AppNotification }) {
  if (n.status === "SENT") return <Send className="h-3.5 w-3.5 text-green-600" />;
  if (n.status === "FAILED") return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  if (n.status === "RETRYING" || n.status === "PROCESSING" || n.status === "PENDING")
    return <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />;
  return <Clock3 className="h-3.5 w-3.5 text-gray-400" />;
}
function deliveryLabel(n: AppNotification) {
  switch (n.status) {
    case "SENT": return "Đã gửi Zalo";
    case "FAILED": return "Gửi thất bại";
    case "RETRYING": return `Đang gửi lại (${n.retryCount}/3)`;
    default: return "Đang gửi...";
  }
}

export function NotificationBell() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unread } = useUnreadCount();
  const { data: list } = useNotifications(false);
  const mut = useNotificationMutations();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = (list ?? []).slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-[10px] p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-800"
        aria-label="Thông báo"
        aria-expanded={open}
      >
        <Bell className="h-[19px] w-[19px]" />
        {!!unread && unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-pop absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-edge bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between border-b border-edgesoft px-4 py-3">
            <h3 className="text-[14px] font-bold text-ink">Thông báo</h3>
            {items.length > 0 && (
              <button
                onClick={() => mut.markAllRead.mutate(undefined, { onSuccess: () => push("success", "Đã đánh dấu tất cả là đã đọc.") })}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-brand-600 transition-colors hover:bg-blue-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-[13.5px] font-semibold text-gray-700">Chưa có thông báo</p>
                <p className="mt-0.5 text-[12px] text-sub">Bạn sẽ nhận thông báo khi được phân ca trực.</p>
              </div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => mut.markRead.mutate(n.id)}
                className={cx(
                  "flex w-full items-start gap-3 border-b border-edgesoft px-4 py-3 text-left transition-colors last:border-0 hover:bg-gray-50",
                  !n.read && "bg-blue-50/40",
                )}
              >
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-gray-200" : "bg-brand-600")} />
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[13px]", n.read ? "font-medium text-gray-600" : "font-bold text-ink")}>{n.title}</span>
                  <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-[12px] leading-snug text-sub">{n.content}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <DeliveryIcon n={n} /> {deliveryLabel(n)} · {timeAgo(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-edgesoft bg-gray-50/70 px-4 py-2.5 text-[12.5px] font-semibold text-brand-600 transition-colors hover:bg-blue-50"
          >
            Xem tất cả <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
