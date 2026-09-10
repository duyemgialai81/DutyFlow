import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cx, fmtDate, monthMatrix, parseISO, todayISO, weekdayShort } from "../lib/utils";

export interface DatePickerProps {
  value?: string; // ISO date: YYYY-MM-DD
  onChange?: (date: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  clearable?: boolean;
  showWeekday?: boolean;
}

const DOW_VN = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DatePicker({
  value = "",
  onChange,
  min,
  max,
  placeholder = "Chọn ngày",
  disabled = false,
  className,
  id,
  name,
  clearable = false,
  showWeekday = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Parse view date (month/year displayed)
  const initialDate = useMemo(() => {
    if (value) {
      const parsed = parseISO(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (min) {
      const parsedMin = parseISO(min);
      if (!isNaN(parsedMin.getTime())) return parsedMin;
    }
    return new Date();
  }, [value, min]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Sync view when value changes from outside
  useEffect(() => {
    if (value) {
      const parsed = parseISO(value);
      if (!isNaN(parsed.getTime())) {
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    }
  }, [value]);

  // Update floating popover position (fixed to viewport, immune to modal overflow-hidden/auto)
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePos = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 310;
      const popoverHeight = 325;

      // Vertical: default below, flip up if near bottom of viewport
      let top = rect.bottom + 6;
      if (top + popoverHeight > window.innerHeight && rect.top - popoverHeight > 10) {
        top = Math.max(10, rect.top - popoverHeight - 6);
      }

      // Horizontal: default align left with trigger, align right if overflows screen
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, rect.right - popoverWidth);
      }

      setPopoverPos({ top, left });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  // Click outside to close (checks both trigger container and portal popover)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => monthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (iso: string) => {
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange?.(iso);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  const today = todayISO();
  const isTodayDisabled = Boolean((min && today < min) || (max && today > max));

  const handleTodayClick = () => {
    if (isTodayDisabled) return;
    onChange?.(today);
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cx("relative w-full", className)}>
      {/* Hidden input for standard forms / accessibility */}
      <input type="hidden" name={name} id={id} value={value} />

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `Ngày đã chọn: ${fmtDate(value)}` : placeholder}
        className={cx(
          "group flex h-10 w-full items-center justify-between rounded-[10px] border bg-surface px-3 text-left transition-all duration-150",
          open
            ? "border-brand-500 ring-2 ring-brand-500/25"
            : "border-edge hover:border-gray-300 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25",
          disabled && "cursor-not-allowed opacity-50 bg-gray-50",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <CalendarIcon className="h-4 w-4 shrink-0 text-sub transition-colors group-hover:text-brand-600" />
          {value ? (
            <span className="tnum truncate font-mono text-[13.5px] font-medium text-ink">
              {fmtDate(value)}
              {showWeekday && (
                <span className="ml-1.5 font-sans text-[12px] font-normal text-sub">
                  ({weekdayShort(value)})
                </span>
              )}
            </span>
          ) : (
            <span className="text-[13.5px] text-faint">{placeholder}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pl-1">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClear(e as any); }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Xóa ngày"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </button>

      {/* Popover Calendar rendered via Portal to prevent any modal/drawer clipping */}
      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Chọn ngày trực"
          style={{
            position: "fixed",
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            zIndex: 99999,
          }}
          className="anim-scale-in w-[310px] rounded-2xl border border-edge bg-surface p-3.5 shadow-[var(--shadow-overlay)]"
        >
          {/* Header navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-[13.5px] font-bold text-ink">
              Tháng {viewMonth + 1}, {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sub transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              aria-label="Tháng tiếp theo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {DOW_VN.map((dow, i) => (
              <span
                key={dow}
                className={cx(
                  "py-1 text-[11px] font-bold tracking-wider",
                  i >= 5 ? "text-amber-600" : "text-sub"
                )}
              >
                {dow}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso) => {
              const cellYear = Number(iso.slice(0, 4));
              const cellMonth = Number(iso.slice(5, 7)) - 1;
              const isCurrentMonth = cellYear === viewYear && cellMonth === viewMonth;
              const dayNum = parseInt(iso.slice(8, 10), 10);
              const isSelected = value === iso;
              const isCellToday = today === iso;
              const isDisabled = Boolean((min && iso < min) || (max && iso > max));

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(iso)}
                  className={cx(
                    "tnum font-mono relative flex h-8 w-8 items-center justify-center mx-auto rounded-lg text-[12.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    isSelected && "bg-brand-600 font-bold text-white shadow-sm hover:bg-brand-700",
                    !isSelected && isCellToday && "border border-brand-400 font-bold text-brand-600 bg-blue-50/50",
                    !isSelected && !isCellToday && isCurrentMonth && "text-ink hover:bg-blue-50 hover:text-brand-700",
                    !isSelected && !isCurrentMonth && "text-gray-300 hover:bg-gray-50",
                    isDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent pointer-events-none"
                  )}
                  title={fmtDate(iso)}
                  aria-pressed={isSelected}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-edgesoft pt-2.5">
            <button
              type="button"
              disabled={isTodayDisabled}
              onClick={handleTodayClick}
              className={cx(
                "text-[12px] font-semibold transition-colors",
                isTodayDisabled
                  ? "cursor-not-allowed text-gray-300"
                  : "text-brand-600 hover:text-brand-700 hover:underline"
              )}
            >
              Hôm nay ({fmtDate(today)})
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] font-medium text-sub hover:text-ink transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
