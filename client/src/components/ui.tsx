import { forwardRef, useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import {
  AlertTriangle, Ban, Check, CheckCircle2, Clock3, Loader2, Lock, Minus, Plus, X,
} from "lucide-react";
import { cx } from "../lib/utils";
import type { AssignmentStatus, DayOffStatus, ScheduleStatus, Shift } from "../types/duty";

/* ================= Button ================= */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerSoft";
export function Button({
  variant = "primary", size = "md", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "xs" | "sm" | "md"; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.985]",
        size === "md" && "h-10 px-4 text-[13.5px]",
        size === "sm" && "h-8.5 px-3 text-[12.5px] touch-target",
        size === "xs" && "h-7 px-2.5 text-[12px] touch-target",
        variant === "primary" && "bg-brand-600 text-white shadow-[0_1px_2px_rgb(37_99_235/0.35)] hover:bg-brand-700 active:bg-brand-800",
        variant === "secondary" && "border border-edge bg-surface text-gray-700 shadow-card hover:border-gray-300 hover:bg-gray-50",
        variant === "ghost" && "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        variant === "danger" && "bg-red-500 text-white shadow-[0_1px_2px_rgb(239_68_68/0.3)] hover:bg-red-600",
        variant === "dangerSoft" && "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-edge bg-gray-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-gray-500">
      {children}
    </kbd>
  );
}

/* ================= Shift accent ================= */
export interface ShiftColorMeta {
  label: string;
  dot: string;
  bar: string;
  chipBg: string;
  border: string;
  textColor: string;
  badgeBg: string;
  ringColor: string;
}

export const SHIFT_META: Record<string, ShiftColorMeta> = {
  // S1 -> S10 standard system codes
  S1: { label: "Ca sáng", dot: "bg-amber-500", bar: "bg-amber-500", chipBg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-700", badgeBg: "bg-amber-100 text-amber-800", ringColor: "ring-amber-400" },
  S2: { label: "Ca trưa", dot: "bg-orange-500", bar: "bg-orange-500", chipBg: "bg-orange-50", border: "border-orange-200", textColor: "text-orange-700", badgeBg: "bg-orange-100 text-orange-800", ringColor: "ring-orange-400" },
  S3: { label: "Ca chiều", dot: "bg-blue-600", bar: "bg-blue-600", chipBg: "bg-blue-50", border: "border-blue-200", textColor: "text-blue-700", badgeBg: "bg-blue-100 text-blue-800", ringColor: "ring-blue-400" },
  S4: { label: "Ca tối", dot: "bg-indigo-600", bar: "bg-indigo-600", chipBg: "bg-indigo-50", border: "border-indigo-200", textColor: "text-indigo-700", badgeBg: "bg-indigo-100 text-indigo-800", ringColor: "ring-indigo-400" },
  S5: { label: "Ca đêm 1", dot: "bg-purple-600", bar: "bg-purple-600", chipBg: "bg-purple-50", border: "border-purple-200", textColor: "text-purple-700", badgeBg: "bg-purple-100 text-purple-800", ringColor: "ring-purple-400" },
  S6: { label: "Ca đêm 2", dot: "bg-violet-600", bar: "bg-violet-600", chipBg: "bg-violet-50", border: "border-violet-200", textColor: "text-violet-700", badgeBg: "bg-violet-100 text-violet-800", ringColor: "ring-violet-400" },
  S7: { label: "Ca hành chính", dot: "bg-emerald-600", bar: "bg-emerald-600", chipBg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-700", badgeBg: "bg-emerald-100 text-emerald-800", ringColor: "ring-emerald-400" },
  S8: { label: "Ca tăng cường 1", dot: "bg-teal-600", bar: "bg-teal-600", chipBg: "bg-teal-50", border: "border-teal-200", textColor: "text-teal-700", badgeBg: "bg-teal-100 text-teal-800", ringColor: "ring-teal-400" },
  S9: { label: "Ca tăng cường 2", dot: "bg-cyan-600", bar: "bg-cyan-600", chipBg: "bg-cyan-50", border: "border-cyan-200", textColor: "text-cyan-700", badgeBg: "bg-cyan-100 text-cyan-800", ringColor: "ring-cyan-400" },
  S10: { label: "Ca cuối tuần", dot: "bg-rose-500", bar: "bg-rose-500", chipBg: "bg-rose-50", border: "border-rose-200", textColor: "text-rose-700", badgeBg: "bg-rose-100 text-rose-800", ringColor: "ring-rose-400" },

  // Named code aliases
  MORNING: { label: "Ca sáng", dot: "bg-amber-500", bar: "bg-amber-500", chipBg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-700", badgeBg: "bg-amber-100 text-amber-800", ringColor: "ring-amber-400" },
  AFTERNOON: { label: "Ca chiều", dot: "bg-blue-600", bar: "bg-blue-600", chipBg: "bg-blue-50", border: "border-blue-200", textColor: "text-blue-700", badgeBg: "bg-blue-100 text-blue-800", ringColor: "ring-blue-400" },
  NIGHT: { label: "Ca tối", dot: "bg-indigo-600", bar: "bg-indigo-600", chipBg: "bg-indigo-50", border: "border-indigo-200", textColor: "text-indigo-700", badgeBg: "bg-indigo-100 text-indigo-800", ringColor: "ring-indigo-400" },
};

const DEFAULT_SHIFT_META: ShiftColorMeta = {
  label: "Ca trực",
  dot: "bg-blue-500",
  bar: "bg-blue-500",
  chipBg: "bg-blue-50",
  border: "border-blue-200",
  textColor: "text-blue-700",
  badgeBg: "bg-blue-100 text-blue-800",
  ringColor: "ring-blue-400",
};

export function shiftMeta(code: string): ShiftColorMeta {
  if (!code) return DEFAULT_SHIFT_META;
  const upper = code.trim().toUpperCase();
  if (SHIFT_META[upper]) return SHIFT_META[upper];

  // Map numbered S-codes like S1, S2, S3 or SHIFT_1, SHIFT_2
  const numMatch = upper.match(/(?:S|SHIFT_?)(\d+)/);
  if (numMatch) {
    const key = `S${numMatch[1]}`;
    if (SHIFT_META[key]) return SHIFT_META[key];
  }

  // Keyword matching
  if (upper.includes("SANG") || upper.includes("MORNING")) return SHIFT_META.S1;
  if (upper.includes("TRUA")) return SHIFT_META.S2;
  if (upper.includes("CHIEU") || upper.includes("AFTERNOON")) return SHIFT_META.S3;
  if (upper.includes("TOI")) return SHIFT_META.S4;
  if (upper.includes("DEM 1") || upper.includes("DEM_1")) return SHIFT_META.S5;
  if (upper.includes("DEM 2") || upper.includes("DEM_2") || upper.includes("DEM")) return SHIFT_META.S6;
  if (upper.includes("HANH CHINH") || upper.includes("CHINH")) return SHIFT_META.S7;
  if (upper.includes("TANG CUONG 1") || upper.includes("TANG_CUONG_1")) return SHIFT_META.S8;
  if (upper.includes("TANG CUONG 2") || upper.includes("TANG_CUONG_2") || upper.includes("TANG CUONG")) return SHIFT_META.S9;
  if (upper.includes("CUOI TUAN") || upper.includes("CUOI_TUAN")) return SHIFT_META.S10;

  return DEFAULT_SHIFT_META;
}

export function ShiftTag({ code, time, size = "md" }: { code: Shift["code"]; time?: string; size?: "sm" | "md" }) {
  const m = shiftMeta(code);
  return (
    <span className={cx(
      "inline-flex items-center gap-1.5 rounded-md border font-semibold",
      size === "md" ? "px-2 py-0.5 text-[12px]" : "px-1.5 py-px text-[11px]",
      m.chipBg, m.border, "text-gray-800",
    )}>
      <span className={cx("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
      {time && <span className="tnum font-mono text-[11px] font-medium text-gray-600">{time}</span>}
    </span>
  );
}

/* ================= Status badges ================= */
const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; cls: string; icon: ReactNode }> = {
  DRAFT: { label: "Nháp", cls: "bg-gray-100 text-gray-600 border-gray-200", icon: <Clock3 className="h-3 w-3" /> },
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-blue-50 text-blue-700 border-blue-100", icon: <Check className="h-3 w-3 anim-check-pop" /> },
  LOCKED: { label: "Đã khóa", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: <Lock className="h-3 w-3" /> },
  CANCELLED: { label: "Đã hủy", cls: "bg-red-50 text-red-600 border-red-100", icon: <Ban className="h-3 w-3" /> },
};
const ASSIGNMENT_STATUS: Record<AssignmentStatus, { label: string; cls: string; icon: ReactNode }> = {
  ASSIGNED: { label: "Chờ xác nhận", cls: "bg-blue-50 text-blue-700 border-blue-100", icon: <Clock3 className="h-3 w-3" /> },
  CONFIRMED: { label: "Đã xác nhận", cls: "bg-green-50 text-green-700 border-green-100", icon: <CheckCircle2 className="h-3 w-3 anim-check-pop" /> },
  DECLINED: { label: "Đã từ chối", cls: "bg-red-50 text-red-600 border-red-100", icon: <X className="h-3 w-3" /> },
  CANCELLED: { label: "Đã hủy", cls: "bg-gray-100 text-gray-500 border-gray-200", icon: <Ban className="h-3 w-3" /> },
};

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const m = SCHEDULE_STATUS[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold", m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}
export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const m = ASSIGNMENT_STATUS[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold", m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}
export function DayOffStatusBadge({ status }: { status: DayOffStatus }) {
  const map: Record<DayOffStatus, { label: string; cls: string }> = {
    PENDING: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-100" },
    APPROVED: { label: "Đã duyệt", cls: "bg-green-50 text-green-700 border-green-100" },
    REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-600 border-red-100" },
  };
  const m = map[status];
  return <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold", m.cls)}>{m.label}</span>;
}

/* ================= Avatar ================= */
const AVATAR_TONES = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-violet-100 text-violet-700", "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700", "bg-teal-100 text-teal-700",
];
function initials(name?: string) {
  const safe = String(name ?? "").trim();
  if (!safe) return "DF";
  const parts = safe.split(/\s+/);
  return parts.length >= 2
    ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase()
    : safe.slice(0, 2).toUpperCase();
}
function toneOf(name?: string) {
  const safe = String(name ?? "").trim() || "DutyFlow";
  let h = 0;
  for (const c of safe) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}
export function Avatar({ name, size = "md", ring }: { name?: string; size?: "xs" | "sm" | "md" | "lg"; ring?: boolean }) {
  const safeName = String(name ?? "").trim() || "User";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        size === "xs" && "h-6 w-6 text-[9.5px]",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-9 w-9 text-[12px]",
        size === "lg" && "h-12 w-12 text-[15px]",
        ring && "ring-2 ring-white",
        toneOf(safeName),
      )}
      aria-hidden
    >
      {initials(safeName)}
    </span>
  );
}
export function AvatarStack({ names = [], max = 3, size = "xs" }: { names?: string[]; max?: number; size?: "xs" | "sm" }) {
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((n, i) => (
        <span key={i} style={{ marginLeft: i === 0 ? 0 : -8 }} className="relative" title={n}>
          <Avatar name={n} size={size} ring />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9.5px] font-bold text-gray-500 ring-2 ring-white"
          style={{ marginLeft: -8 }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

/* ================= Tooltip ================= */
export function Tip({ label, children, side = "top" }: { label: string; children: ReactNode; side?: "top" | "bottom" | "right" }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover/tip:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-1.5 -translate-x-1/2 translate-y-0.5 group-hover/tip:-translate-y-0",
          side === "bottom" && "top-full left-1/2 mt-1.5 -translate-x-1/2 -translate-y-0.5 group-hover/tip:translate-y-0",
          side === "right" && "left-full top-1/2 ml-2 -translate-y-1/2 -translate-x-0.5 group-hover/tip:translate-x-0",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ================= Form ================= */
export const inputCls =
  "h-10 w-full rounded-[10px] border border-edge bg-surface px-3 text-[13.5px] text-ink placeholder:text-faint transition-all duration-150 hover:border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-semibold text-gray-700">
        {label}
        {hint && <span className="text-[11px] font-normal text-faint">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </label>
  );
}

export { Select, type SelectOption, type SelectProps } from "./Select";

export function Stepper({ value, onChange, min = 1, max = 8 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex h-10 items-center rounded-[10px] border border-edge bg-surface">
      <button type="button" aria-label="Giảm" onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-full w-10 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40" disabled={value <= min}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="tnum min-w-8 text-center text-[14px] font-bold text-ink">{value}</span>
      <button type="button" aria-label="Tăng" onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-full w-10 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40" disabled={value >= max}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ================= Segmented ================= */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
        opacity: 1,
      });
    }
  }, [value, options]);

  return (
    <div ref={containerRef} className="relative flex items-center rounded-[10px] bg-gray-100 p-0.5" role="tablist">
      <span
        className="pointer-events-none absolute inset-y-0.5 rounded-[8px] bg-surface shadow-[0_1px_3px_rgb(17_24_39/0.1)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
          opacity: pillStyle.opacity,
        }}
        aria-hidden
      />
      {options.map((o) => {
        const isSelected = value === o.value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative z-10 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-brand-500",
              isSelected ? "text-gray-900" : "text-sub hover:text-gray-900",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================= Toggle ================= */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-brand-600" : "bg-gray-200",
      )}
    >
      <span className={cx(
        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
        checked ? "left-[22px]" : "left-0.5",
      )} />
    </button>
  );
}

/* ================= ProgressBar ================= */
export function ProgressBar({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "green" | "amber" | "red" }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={cx(
          "h-full rounded-full transition-all duration-500",
          tone === "brand" && "bg-brand-600", tone === "green" && "bg-green-500",
          tone === "amber" && "bg-amber-500", tone === "red" && "bg-red-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ================= Skeleton & Empty ================= */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="anim-rise flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">{icon}</div>
      <h3 className="text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-sub">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ================= Modal ================= */
export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: ReactNode; footer?: ReactNode; size?: "md" | "lg" | "xl";
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const modalEl = modalRef.current;
    const focusable = modalEl?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable && focusable.length > 0 ? focusable[focusable.length - 1] : undefined;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab" && focusable && focusable.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-gray-900/45" onClick={onClose} />
      <div
        ref={modalRef}
        className={cx(
          "anim-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl",
          size === "md" && "sm:max-w-lg", size === "lg" && "sm:max-w-2xl", size === "xl" && "sm:max-w-4xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-edgesoft px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-sub">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-edgesoft bg-gray-50/70 px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ================= Drawer ================= */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 460 }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: ReactNode; footer?: ReactNode; width?: number;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const drawerEl = drawerRef.current;
    const focusable = drawerEl?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable && focusable.length > 0 ? focusable[focusable.length - 1] : undefined;
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab" && focusable && focusable.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-gray-900/45" onClick={onClose} />
      <div
        ref={drawerRef}
        className="anim-drawer absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-[var(--shadow-pop)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-edgesoft px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-sub">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-edgesoft bg-gray-50/70 px-6 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ================= ConfirmDialog ================= */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Xác nhận", danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string;
  message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className={cx(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          danger ? "bg-red-50 text-red-500" : "bg-blue-50 text-brand-600",
        )}>
          {danger ? <AlertTriangle className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />}
        </span>
        <div className="text-[13.5px] leading-relaxed text-gray-600">{message}</div>
      </div>
    </Modal>
  );
}

/* ================= Zalo badge ================= */
export function ZaloBadge({ connected, size = "md" }: { connected: boolean; size?: "sm" | "md" }) {
  return connected ? (
    <span className={cx(
      "inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 font-semibold text-blue-700",
      size === "md" ? "px-2 py-0.5 text-[11.5px]" : "px-1.5 py-px text-[10.5px]",
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Zalo
    </span>
  ) : (
    <span className={cx(
      "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 font-medium text-gray-400",
      size === "md" ? "px-2 py-0.5 text-[11.5px]" : "px-1.5 py-px text-[10.5px]",
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" /> Chưa kết nối
    </span>
  );
}

/* ================= DatePicker ================= */
export * from "./DatePicker";
