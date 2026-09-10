import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, CalendarPlus, CornerDownLeft, LayoutDashboard, Repeat, Search, Sparkles, Users, Zap
} from "lucide-react";
import { useEmployees } from "../../hooks/useDutySchedule";
import { dutyScheduleApi } from "../../api/dutySchedule.api";
import type { SearchScheduleDoc } from "../../api/dutySchedule.api";
import { useAuth } from "../../state/AppProviders";
import { Avatar, Kbd } from "../ui";
import { cx, fmtDate, monthKey } from "../../lib/utils";

interface Cmd {
  id: string;
  group: "Hành động" | "Nhân viên" | "Ca trực (Chỉ mục siêu tốc)" | "Ca trực";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: employees } = useEmployees();
  const [searchResults, setSearchResults] = useState<SearchScheduleDoc[]>([]);

  const close = useCallback(() => { setOpen(false); setQ(""); setIdx(0); setSearchResults([]); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("df:open-search", onEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("df:open-search", onEvt);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  /* Tìm kiếm siêu tốc qua API Elasticsearch Backend */
  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      dutyScheduleApi.searchSmart({ keyword: term, size: 8 }, user?.role)
        .then((res) => {
          if (res && Array.isArray(res.content)) {
            setSearchResults(res.content);
          }
        })
        .catch(() => {
          setSearchResults([]);
        });
    }, 150);

    return () => clearTimeout(timer);
  }, [q, open, user?.role]);

  const cmds = useMemo<Cmd[]>(() => {
    const term = q.trim().toLowerCase();
    const has = (s: string) => s.toLowerCase().includes(term);
    const out: Cmd[] = [];

    const actions: Cmd[] = [
      { id: "a1", group: "Hành động", label: "Tạo lịch trực", hint: "Mở form tạo ca", icon: <CalendarPlus className="h-4 w-4" />, run: () => { window.dispatchEvent(new CustomEvent("df:create-schedule")); navigate("/duty/calendar"); } },
      { id: "a2", group: "Hành động", label: "Phân lịch tự động", hint: "Thuật toán phân ca", icon: <Sparkles className="h-4 w-4" />, run: () => { window.dispatchEvent(new CustomEvent("df:auto-assign")); navigate("/duty/calendar"); } },
      { id: "a3", group: "Hành động", label: "Đi tới hôm nay", icon: <CalendarDays className="h-4 w-4" />, run: () => { window.dispatchEvent(new CustomEvent("df:go-today")); navigate("/duty/calendar"); } },
      { id: "a4", group: "Hành động", label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" />, run: () => navigate("/overview") },
      { id: "a5", group: "Hành động", label: "Đổi ca & nghỉ phép", icon: <Repeat className="h-4 w-4" />, run: () => navigate("/requests") },
    ];
    out.push(...actions.filter((a) => !term || has(a.label)));

    (employees ?? []).filter((e) => !term || has(e.fullName) || has(e.employeeCode) || has(e.departmentName ?? ""))
      .slice(0, term ? 5 : 3)
      .forEach((e) => out.push({
        id: `e${e.id}`, group: "Nhân viên", label: e.fullName, hint: `${e.employeeCode} · ${e.departmentName ?? ""}`,
        icon: <Avatar name={e.fullName} size="xs" />, run: () => navigate("/users"),
      }));

    return out;
  }, [q, employees, navigate]);

  /* lịch tháng hiện tại — tìm kiếm dự phòng */
  const [schedules, setSchedules] = useState<Awaited<ReturnType<typeof dutyScheduleApi.calendar>>["schedules"]>([]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    dutyScheduleApi.calendar({ month: monthKey(new Date()) })
      .then((r) => { if (alive) setSchedules(r.schedules); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [open]);

  const all = useMemo<Cmd[]>(() => {
    const term = q.trim().toLowerCase();
    
    // Nếu có kết quả tìm kiếm từ Elasticsearch API
    if (searchResults.length > 0) {
      const esCmds: Cmd[] = searchResults.map((doc) => {
        const empNames = doc.assignedEmployees?.map((e) => e.fullName).join(", ");
        return {
          id: `es_${doc.scheduleId}`,
          group: "Ca trực (Chỉ mục siêu tốc)" as const,
          label: `${doc.shiftName || doc.shiftCode || "Ca trực"} · ${fmtDate(doc.date)}`,
          hint: `${doc.departmentName ? doc.departmentName + " · " : ""}${doc.location || ""} ${empNames ? "· " + empNames : ""}`,
          icon: <Zap className="h-4 w-4 text-amber-500" />,
          run: () => navigate(`/duty/calendar?open=${doc.scheduleId}`),
        };
      });
      return [...cmds, ...esCmds];
    }

    const schedCmds: Cmd[] = (term.length >= 2
      ? schedules.filter((s) =>
          fmtDate(s.date).includes(term) || s.date.includes(term) ||
          s.shiftName.toLowerCase().includes(term) || s.location.toLowerCase().includes(term))
      : []
    ).slice(0, 5).map((s) => ({
      id: `s${s.id}`, group: "Ca trực" as const, label: `${s.shiftName} · ${fmtDate(s.date)}`,
      hint: `${s.startTime}–${s.endTime} · ${s.location}`,
      icon: <CalendarDays className="h-4 w-4 text-brand-600" />,
      run: () => navigate(`/duty/calendar?open=${s.id}`),
    }));
    return [...cmds, ...schedCmds];
  }, [cmds, schedules, searchResults, q, navigate]);

  useEffect(() => setIdx(0), [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(all.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && all[idx]) { all[idx].run(); close(); }
    else if (e.key === "Escape") close();
  };

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal aria-label="Tìm kiếm nhanh">
      <div className="anim-fade absolute inset-0 bg-gray-900/45" onClick={close} />
      <div className="anim-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-edge bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3 border-b border-edgesoft px-4">
          <Search className="h-4.5 w-4.5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Tìm nhân viên, ca trực, hành động..."
            className="h-13 w-full bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
            aria-label="Tìm kiếm"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2">
          {all.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-8 text-[13px] text-sub">
              <Users className="h-4 w-4 text-gray-300" /> Không có kết quả cho “{q}”.
            </div>
          )}
          {all.map((c, i) => {
            const showGroup = c.group !== lastGroup;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {showGroup && (
                  <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">{c.group}</p>
                )}
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => { c.run(); close(); }}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-100",
                    i === idx ? "bg-blue-50" : "hover:bg-gray-50",
                  )}
                >
                  <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", i === idx ? "bg-white text-brand-600 shadow-sm" : "bg-gray-100 text-gray-500")}>
                    {c.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{c.label}</span>
                    {c.hint && <span className="block truncate text-[11.5px] text-sub">{c.hint}</span>}
                  </span>
                  {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t border-edgesoft bg-gray-50/70 px-4 py-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> di chuyển</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> chọn</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>⌘K</Kbd> mở/đóng</span>
        </div>
      </div>
    </div>
  );
}
