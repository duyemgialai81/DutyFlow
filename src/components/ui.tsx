import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import { cx } from "../lib/utils";
import type { AssignmentStatus, ScheduleStatus, Shift } from "../types/duty";

/* ================= Button ================= */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "warn" | "dark";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "relative inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-pine-700 text-pine-50 shadow-sm hover:bg-pine-800",
        variant === "dark" && "bg-ink text-paper hover:bg-pine-950",
        variant === "secondary" && "border border-line bg-white text-ink shadow-sm hover:border-pine-300 hover:bg-pine-50",
        variant === "ghost" && "text-inksoft hover:bg-pine-100/70 hover:text-ink",
        variant === "danger" && "bg-danger-600 text-white hover:bg-danger-700",
        variant === "warn" && "border border-warn-600/40 bg-warn-100 text-warn-700 hover:border-warn-600/70",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

/* ================= Card ================= */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-xl border border-line bg-card shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

/* ================= Badges & pills ================= */
export function ScheduleStatusPill({ status }: { status: ScheduleStatus }) {
  const map: Record<ScheduleStatus, { label: string; cls: string }> = {
    DRAFT: { label: "Nháp", cls: "bg-linesoft text-inksoft border-line" },
    CONFIRMED: { label: "Đã xác nhận", cls: "bg-info-100 text-info-700 border-info-600/25" },
    LOCKED: { label: "Đã khóa", cls: "bg-ink text-paper border-ink" },
    CANCELLED: { label: "Đã hủy", cls: "bg-danger-100 text-danger-700 border-danger-600/25" },
  };
  const m = map[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", m.cls)}>
      {status === "LOCKED" && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      )}
      {m.label}
    </span>
  );
}

export function AssignmentStatusPill({ status }: { status: AssignmentStatus }) {
  const map: Record<AssignmentStatus, { label: string; cls: string; dot: string }> = {
    ASSIGNED: { label: "Chờ xác nhận", cls: "bg-warn-100 text-warn-700", dot: "bg-warn-600" },
    CONFIRMED: { label: "Đã xác nhận", cls: "bg-ok-100 text-ok-700", dot: "bg-ok-600" },
    DECLINED: { label: "Từ chối", cls: "bg-danger-100 text-danger-700", dot: "bg-danger-600" },
    CANCELLED: { label: "Đã hủy", cls: "bg-linesoft text-muted", dot: "bg-muted" },
  };
  const m = map[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold", m.cls)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function ShiftChip({ code, name, time, size = "md" }: { code: Shift["code"]; name?: string; time?: string; size?: "sm" | "md" }) {
  const map: Record<Shift["code"], { chip: string; icon: ReactNode; label: string }> = {
    MORNING: {
      chip: "bg-gold-100 text-gold-700 border-gold-300/50",
      label: "Ca sáng",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      ),
    },
    AFTERNOON: {
      chip: "bg-pine-100 text-pine-800 border-pine-300/60",
      label: "Ca chiều",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="14" r="4.5" />
          <path d="M3 20h18M6.5 6.5 5 5M17.5 6.5 19 5M12 2.5V5" />
        </svg>
      ),
    },
    NIGHT: {
      chip: "bg-night-100 text-night-600 border-night-600/25",
      label: "Ca tối",
      icon: (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a7.5 7.5 0 1 0 9.5 9.5Z" />
        </svg>
      ),
    },
  };
  const m = map[code];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border font-bold",
        size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-1 text-[12px]",
        m.chip,
      )}
    >
      {m.icon}
      {name ?? m.label}
      {time && <span className="font-mono font-semibold opacity-80">{time}</span>}
    </span>
  );
}

/* ================= Avatar ================= */
const AV_COLORS = ["bg-pine-600", "bg-gold-500", "bg-info-600", "bg-night-600", "bg-ok-600", "bg-danger-600"];
export function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" }) {
  const initials = name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
  const color = AV_COLORS[(name.charCodeAt(0) + name.length) % AV_COLORS.length];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        size === "xs" && "h-5 w-5 text-[8px]",
        size === "sm" && "h-7 w-7 text-[10px]",
        size === "md" && "h-9 w-9 text-[12px]",
        color,
      )}
      title={name}
    >
      {initials}
    </span>
  );
}

/* ================= Toggle ================= */
export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-pine-600" : "bg-line",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ================= Modal & Confirm ================= */
export function Modal({ open, onClose, title, children, width = "max-w-lg" }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-pine-950/45 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={onClose}>
      <div
        className={cx("anim-pop w-full rounded-2xl border border-line bg-white shadow-[var(--shadow-pop)]", width)}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="flex items-center justify-between border-b border-linesoft px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted transition-colors hover:bg-linesoft hover:text-ink" aria-label="Đóng">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Xác nhận", danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: ReactNode;
  confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={
      <span className="flex items-center gap-2">
        {danger && <AlertTriangle className="h-5 w-5 text-danger-600" />}
        {title}
      </span>
    } width="max-w-md">
      <div className="text-sm leading-relaxed text-inksoft">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ================= Form bits ================= */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-danger-600">{error}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-all placeholder:text-muted/70 focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20 disabled:bg-linesoft disabled:text-muted";

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputCls, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7a72%22 stroke-width=%222.4%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_10px_center] bg-no-repeat pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/* ================= Skeleton / Empty / Error ================= */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-lg", className)} />;
}

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="anim-rise flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-100 text-pine-700">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ================= Stat ================= */
export function Stat({ label, value, tone = "default", sub }: { label: string; value: ReactNode; tone?: "default" | "warn" | "ok" | "dark"; sub?: string }) {
  return (
    <div className={cx(
      "rounded-xl border px-4 py-3 shadow-[var(--shadow-card)]",
      tone === "default" && "border-line bg-white",
      tone === "warn" && "border-warn-600/25 bg-warn-100",
      tone === "ok" && "border-ok-600/25 bg-ok-100",
      tone === "dark" && "border-pine-800 bg-pine-900 text-pine-50",
    )}>
      <div className={cx("text-[11px] font-bold uppercase tracking-wider", tone === "dark" ? "text-pine-200" : "text-muted")}>{label}</div>
      <div className={cx("font-display mt-0.5 text-2xl font-bold leading-tight", tone === "dark" ? "text-white" : "text-ink", tone === "warn" && "text-warn-700")}>
        {value}
      </div>
      {sub && <div className={cx("mt-0.5 text-[11px]", tone === "dark" ? "text-pine-200" : "text-muted")}>{sub}</div>}
    </div>
  );
}
