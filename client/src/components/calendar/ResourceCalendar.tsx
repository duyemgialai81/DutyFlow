import { memo, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, GripVertical, Lock, Plus } from "lucide-react";
import { Avatar, AvatarStack, EmptyState, shiftMeta, Tip } from "../ui";
import { cx, fmtDate, monthMatrix, parseISO, toISODate, todayISO, weekdayShort } from "../../lib/utils";
import type { DutyAssignment, DutySchedule, Employee } from "../../types/duty";

export type ViewMode = "month" | "week" | "day";

export interface DragPayload {
  assignmentId: number;
  scheduleId: number;
  employeeId: number;
  employeeName: string;
  date: string;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
}

interface Props {
  schedules: DutySchedule[];
  employees: Employee[];
  view: ViewMode;
  anchor: Date;
  onAnchor: (d: Date) => void;
  onView: (v: ViewMode) => void;
  onOpenSchedule: (id: number) => void;
  onQuickCreate: (date: string) => void;
  onMoveRequest: (p: DragPayload, target: { employeeId: number; employeeName: string; date: string; schedule?: DutySchedule }) => void;
  isAdmin: boolean;
  currentEmployeeId?: number;
  hideEmptyRows: boolean;
  loading?: boolean;
}

const DAY_START = 7;
const DAY_END = 22;
const SPAN = DAY_END - DAY_START;
const timeToPct = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return Math.max(0, Math.min(100, ((h + m / 60 - DAY_START) / SPAN) * 100));
};

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* index: employeeId → date → assignments (kèm schedule) */
function useIndex(schedules: DutySchedule[]) {
  return useMemo(() => {
    const schedById = new Map(schedules.map((s) => [s.id, s]));
    const idx = new Map<number, Map<string, { a: DutyAssignment; s: DutySchedule }[]>>();
    const schedByDateShift = new Map<string, DutySchedule>();
    for (const s of schedules) {
      if (s.status === "CANCELLED") continue;
      schedByDateShift.set(`${s.date}|${s.shiftId}`, s);
      for (const a of s.assignments) {
        if (a.status === "CANCELLED" || a.status === "DECLINED") continue;
        let byDate = idx.get(a.employeeId);
        if (!byDate) { byDate = new Map(); idx.set(a.employeeId, byDate); }
        const list = byDate.get(s.date) ?? [];
        list.push({ a, s });
        byDate.set(s.date, list);
      }
    }
    return { idx, schedById, schedByDateShift };
  }, [schedules]);
}

/* ================= chip ================= */
function ScheduleChip({ a, s, draggable, onOpen, onDragStart }: {
  a: DutyAssignment; s: DutySchedule; draggable: boolean;
  onOpen: () => void; onDragStart: (e: DragEvent) => void;
}) {
  const meta = shiftMeta(s.shiftCode);
  const missing = s.assignments.filter((x) => x.status === "ASSIGNED" || x.status === "CONFIRMED").length < s.requiredPeople;
  const locked = s.status === "LOCKED";
  return (
    <button
      onClick={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cx(
        "group/chip relative flex w-full items-center gap-1.5 overflow-hidden rounded-lg border bg-surface py-1 pl-2 pr-1.5 text-left transition-all duration-150",
        "hover:-translate-y-px hover:shadow-[var(--shadow-lift)]",
        draggable && "cursor-grab active:cursor-grabbing active:scale-[0.985] active:shadow-[var(--shadow-pop)]",
        a.status === "CONFIRMED" ? "border-green-200/80" : missing ? "border-red-200" : "border-edge",
      )}
      aria-label={`${meta.label} ${s.startTime} đến ${s.endTime}, ${a.employeeName}`}
    >
      <span className={cx("absolute inset-y-0 left-0 w-[3px]", meta.bar)} />
      <span className="min-w-0 flex-1">
        <span className="tnum block truncate font-mono text-[10.5px] font-semibold leading-tight text-gray-800">
          {s.startTime}–{s.endTime}
        </span>
        <span className="block truncate text-[10px] leading-tight text-sub">{s.location}</span>
      </span>
      {locked ? (
        <Lock className="h-3 w-3 shrink-0 text-sub" />
      ) : missing ? (
        <span className="flex shrink-0 items-center gap-0.5 rounded bg-red-50 px-1 py-px text-[9.5px] font-bold text-red-600">
          <AlertTriangle className="h-2.5 w-2.5" />{s.requiredPeople - s.assignments.filter((x) => x.status === "ASSIGNED" || x.status === "CONFIRMED").length}
        </span>
      ) : a.status === "CONFIRMED" ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600" />
      ) : (
        <Clock3 className="h-3 w-3 shrink-0 text-blue-500" />
      )}
      {draggable && <GripVertical className="h-3 w-3 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover/chip:opacity-100" />}
    </button>
  );
}

/* ================= cell với drop zone ================= */
function DropCell({ cellKey, date, employee, children, onMoveRequest, disabled, highlight, setHighlight, onQuickCreate, isAdmin, empty }: {
  cellKey: string; date: string; employee: Employee; children: React.ReactNode;
  onMoveRequest: Props["onMoveRequest"]; disabled: boolean;
  highlight: string | null; setHighlight: React.Dispatch<React.SetStateAction<string | null>>;
  onQuickCreate: (d: string) => void; isAdmin: boolean; empty: boolean;
}) {
  const active = highlight === cellKey;
  return (
    <div
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setHighlight(cellKey); } }}
      onDragLeave={() => setHighlight((h) => (h === cellKey ? null : h))}
      onDrop={(e) => {
        e.preventDefault();
        setHighlight(null);
        if (disabled) return;
        try {
          const p = JSON.parse(e.dataTransfer.getData("text/plain")) as DragPayload;
          onMoveRequest(p, { employeeId: employee.id, employeeName: employee.fullName, date });
        } catch { /* ignore */ }
      }}
      className={cx(
        "relative min-h-[62px] space-y-1 border-b border-r border-edgesoft p-1.5 transition-all duration-200",
        active && "bg-blue-50/80 ring-2 ring-inset ring-brand-500 anim-cell-glow scale-[1.01] z-10 shadow-sm",
        !active && empty && "hover:bg-gray-50/60",
      )}
    >
      {children}
      {isAdmin && empty && (
        <button
          onClick={() => onQuickCreate(date)}
          aria-label={`Tạo ca ngày ${fmtDate(date)}`}
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 hover:bg-blue-50/40 hover:opacity-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-400 shadow-sm">
            <Plus className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ================= employee label ================= */
const EmployeeCell = memo(function EmployeeCell({ e, isMe, sticky }: { e: Employee; isMe: boolean; sticky?: boolean }) {
  return (
    <div className={cx(
      "flex items-center gap-2.5 border-b border-r border-edgesoft bg-surface px-3 py-2",
      sticky && "sticky left-0 z-20",
      isMe && "bg-blue-50/50",
    )}>
      <Avatar name={e.fullName} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{e.fullName}</span>
          {isMe && <span className="rounded bg-brand-600 px-1 py-px text-[9px] font-bold uppercase text-white">Bạn</span>}
        </span>
        <span className="block truncate text-[11px] text-sub">{e.departmentName ?? "—"}</span>
      </span>
    </div>
  );
});

/* ================= Tuần ================= */
function WeekView(props: Props) {
  const { employees, view: _v, anchor, onAnchor, onOpenSchedule, onMoveRequest, isAdmin, currentEmployeeId, hideEmptyRows, loading } = props;
  const { idx, schedByDateShift } = useIndex(props.schedules);
  const [highlight, setHighlight] = useState<string | null>(null);
  const now = useNow();
  const today = todayISO();

  const days = useMemo(() => {
    const dow = (anchor.getDay() + 6) % 7;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return toISODate(d);
    });
  }, [anchor]);

  const nowPct = ((now.getHours() + now.getMinutes() / 60 - DAY_START) / SPAN) * 100;
  const showNowLine = nowPct > 0 && nowPct < 100;

  const visibleEmployees = useMemo(
    () => (hideEmptyRows ? employees.filter((e) => days.some((d) => idx.get(e.id)?.has(d))) : employees),
    [employees, days, idx, hideEmptyRows],
  );

  if (loading) return <CalendarSkeleton cols={7} />;

  return (
    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 330px)", minHeight: 420 }}>
      <div className="min-w-[860px]">
        {/* header */}
        <div className="sticky top-0 z-30 grid border-b border-edge bg-surface" style={{ gridTemplateColumns: "228px repeat(7, minmax(118px, 1fr))" }}>
          <div className="sticky left-0 z-10 flex items-end border-r border-edgesoft bg-surface px-3 pb-2 pt-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">Nhân viên</span>
          </div>
          {days.map((d) => {
            const isToday = d === today;
            const isWeekend = parseISO(d).getDay() % 6 === 0;
            return (
              <div key={d} className={cx("relative px-2 pb-2 pt-3 text-center", isWeekend && "bg-gray-50/80")}>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{weekdayShort(d)}</p>
                <p className={cx(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold",
                  isToday ? "bg-brand-600 text-white shadow-[0_2px_8px_rgb(37_99_235/0.4)]" : "text-gray-800",
                )}>
                  {Number(d.slice(8, 10))}
                </p>
                {isToday && showNowLine && (
                  <span className="now-dot absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* rows */}
        {visibleEmployees.length === 0 && (
          <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="Không có nhân viên phù hợp" message="Thử tắt bộ lọc hoặc hiển thị nhân viên trống." />
        )}
        {visibleEmployees.map((e) => {
          const isMe = e.id === currentEmployeeId;
          return (
            <div key={e.id} className="grid" style={{ gridTemplateColumns: "228px repeat(7, minmax(118px, 1fr))" }}>
              <EmployeeCell e={e} isMe={isMe} sticky />
              {days.map((d) => {
                const items = idx.get(e.id)?.get(d) ?? [];
                const isToday = d === today;
                const isWeekend = parseISO(d).getDay() % 6 === 0;
                return (
                  <div key={d} className={cx("relative border-b border-r border-edgesoft", isWeekend && "bg-gray-50/50", isToday && "bg-blue-50/25")}>
                    {isToday && showNowLine && (
                      <span className="pointer-events-none absolute inset-y-0 z-10 w-px bg-brand-500/50" style={{ left: `${nowPct}%` }} />
                    )}
                    <DropCell
                      cellKey={`w|${e.id}|${d}`} date={d} employee={e}
                      onMoveRequest={onMoveRequest}
                      disabled={!isAdmin}
                      highlight={highlight} setHighlight={setHighlight}
                      onQuickCreate={props.onQuickCreate} isAdmin={isAdmin}
                      empty={items.length === 0}
                    >
                      <div className={cx("space-y-1", isWeekend && "relative")}>
                        {items.map(({ a, s }) => (
                          <ScheduleChip
                            key={a.id} a={a} s={s}
                            draggable={isAdmin && (s.status === "DRAFT" || s.status === "CONFIRMED")}
                            onOpen={() => onOpenSchedule(s.id)}
                            onDragStart={(ev) => {
                              ev.dataTransfer.setData("text/plain", JSON.stringify({
                                assignmentId: a.id, scheduleId: s.id, employeeId: e.id, employeeName: e.fullName,
                                date: d, shiftId: s.shiftId, shiftName: s.shiftName, startTime: s.startTime, endTime: s.endTime,
                              } satisfies DragPayload));
                              ev.dataTransfer.effectAllowed = "move";
                            }}
                          />
                        ))}
                      </div>
                    </DropCell>
                  </div>
                );
              })}
            </div>
          );
        })}
        {/* legend */}
        <LegendRow />
      </div>
    </div>
  );
}

function LegendRow() {
  return (
    <div className="sticky left-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edgesoft bg-gray-50/70 px-4 py-2.5 text-[11.5px] font-medium text-sub">
      <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Đã xác nhận</span>
      <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-blue-500" /> Chờ xác nhận</span>
      <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Thiếu nhân sự</span>
      <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-sub" /> Đã khóa</span>
      <span className="ml-auto hidden text-sub sm:block">Kéo thả ca giữa các nhân viên để đổi người trực</span>
    </div>
  );
}

/* ================= Ngày ================= */
function DayView(props: Props) {
  const { employees, anchor, onOpenSchedule, onMoveRequest, isAdmin, currentEmployeeId, hideEmptyRows } = props;
  const { idx } = useIndex(props.schedules);
  const [highlight, setHighlight] = useState<string | null>(null);
  const now = useNow();
  const today = todayISO();
  const date = toISODate(anchor);
  const isToday = date === today;
  const nowPct = ((now.getHours() + now.getMinutes() / 60 - DAY_START) / SPAN) * 100;
  const showNow = isToday && nowPct > 0 && nowPct < 100;

  const hours = Array.from({ length: SPAN + 1 }, (_, i) => DAY_START + i);
  const visibleEmployees = useMemo(
    () => (hideEmptyRows ? employees.filter((e) => idx.get(e.id)?.has(date)) : employees),
    [employees, date, idx, hideEmptyRows],
  );

  if (props.loading) return <CalendarSkeleton cols={1} wide />;

  return (
    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 330px)", minHeight: 420 }}>
      <div className="min-w-[760px]">
        {/* header: time axis */}
        <div className="sticky top-0 z-30 grid border-b border-edge bg-surface" style={{ gridTemplateColumns: "228px 1fr" }}>
          <div className="sticky left-0 z-10 flex items-center justify-between border-r border-edgesoft bg-surface px-3 py-2.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">Nhân viên</span>
            <span className="text-[12px] font-bold text-ink">{fmtDate(date)}{isToday && <span className="ml-1.5 rounded bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">Hôm nay</span>}</span>
          </div>
          <div className="relative h-11">
            {hours.map((h) => (
              <span key={h} className="tnum absolute top-1/2 -translate-y-1/2 font-mono text-[10.5px] font-medium text-gray-400"
                style={{ left: `${((h - DAY_START) / SPAN) * 100}%`, transform: "translate(-50%,-50%)" }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
            {showNow && (
              <span className="absolute -bottom-px z-10 -translate-x-1/2" style={{ left: `${nowPct}%` }}>
                <span className="now-dot block h-2 w-2 rounded-full bg-brand-600" />
              </span>
            )}
          </div>
        </div>

        {visibleEmployees.map((e) => {
          const isMe = e.id === currentEmployeeId;
          const items = idx.get(e.id)?.get(date) ?? [];
          return (
            <div key={e.id} className="grid" style={{ gridTemplateColumns: "228px 1fr" }}>
              <EmployeeCell e={e} isMe={isMe} sticky />
              <div
                onDragOver={(ev) => { if (isAdmin) { ev.preventDefault(); setHighlight(`d|${e.id}`); } }}
                onDragLeave={() => setHighlight((h) => (h === `d|${e.id}` ? null : h))}
                onDrop={(ev) => {
                  ev.preventDefault(); setHighlight(null);
                  if (!isAdmin) return;
                  try {
                    const p = JSON.parse(ev.dataTransfer.getData("text/plain")) as DragPayload;
                    onMoveRequest(p, { employeeId: e.id, employeeName: e.fullName, date });
                  } catch { /* ignore */ }
                }}
                className={cx(
                  "relative h-[86px] border-b border-edgesoft transition-colors",
                  highlight === `d|${e.id}` && "bg-blue-50 ring-2 ring-inset ring-brand-500/60",
                )}
              >
                {/* hour grid lines */}
                {hours.map((h) => (
                  <span key={h} className="pointer-events-none absolute inset-y-0 w-px bg-edgesoft" style={{ left: `${((h - DAY_START) / SPAN) * 100}%` }} />
                ))}
                {showNow && (
                  <span className="pointer-events-none absolute inset-y-0 z-10 w-[1.5px] bg-brand-500/70" style={{ left: `${nowPct}%` }} />
                )}
                {/* blocks */}
                {items.map(({ a, s }) => {
                  const left = timeToPct(s.startTime);
                  const width = Math.max(6, timeToPct(s.endTime) - left);
                  const meta = shiftMeta(s.shiftCode);
                  const activeCount = s.assignments.filter((x) => x.status === "ASSIGNED" || x.status === "CONFIRMED").length;
                  const missing = activeCount < s.requiredPeople;
                  const names = s.assignments.filter((x) => x.status === "ASSIGNED" || x.status === "CONFIRMED").map((x) => x.employeeName);
                  const draggable = isAdmin && (s.status === "DRAFT" || s.status === "CONFIRMED");
                  return (
                    <button
                      key={a.id}
                      onClick={() => onOpenSchedule(s.id)}
                      draggable={draggable}
                      onDragStart={(ev) => {
                        ev.dataTransfer.setData("text/plain", JSON.stringify({
                          assignmentId: a.id, scheduleId: s.id, employeeId: e.id, employeeName: e.fullName,
                          date, shiftId: s.shiftId, shiftName: s.shiftName, startTime: s.startTime, endTime: s.endTime,
                        } satisfies DragPayload));
                      }}
                      className={cx(
                        "absolute top-2 bottom-2 z-[5] flex flex-col justify-between overflow-hidden rounded-[10px] border bg-surface p-2 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-lift)]",
                        draggable && "cursor-grab active:cursor-grabbing",
                        missing ? "border-red-200" : "border-edge",
                      )}
                      style={{ left: `calc(${left}% + 3px)`, width: `calc(${width}% - 6px)` }}
                      aria-label={`${s.shiftName} ${s.startTime} đến ${s.endTime}`}
                    >
                      <span className={cx("absolute inset-y-0 left-0 w-[3.5px]", meta.bar)} />
                      <span className="flex items-center gap-1.5 pl-1.5">
                        <span className="truncate text-[11.5px] font-bold text-ink">{s.shiftName}</span>
                        {s.status === "LOCKED" && <Lock className="h-3 w-3 shrink-0 text-gray-400" />}
                        <span className="tnum ml-auto shrink-0 font-mono text-[10.5px] font-semibold text-gray-500">{s.startTime} — {s.endTime}</span>
                      </span>
                      <span className="flex items-center gap-2 pl-1.5">
                        <AvatarStack names={names} max={4} />
                        {missing ? (
                          <span className="flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Thiếu {s.requiredPeople - activeCount}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                            <Check className="h-3 w-3" /> Đủ nhân sự
                          </span>
                        )}
                        <span className="ml-auto hidden truncate text-[10.5px] text-gray-400 xl:block">{s.location}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <LegendRow />
      </div>
    </div>
  );
}

/* ================= Tháng ================= */
function MonthView(props: Props) {
  const { anchor, onAnchor, onView, onOpenSchedule, isAdmin } = props;
  const { schedByDateShift } = useIndex(props.schedules);
  const today = todayISO();
  const cells = useMemo(() => monthMatrix(anchor.getFullYear(), anchor.getMonth()), [anchor]);
  const inMonth = (iso: string) => Number(iso.slice(5, 7)) === anchor.getMonth() + 1;

  const byDate = useMemo(() => {
    const m = new Map<string, DutySchedule[]>();
    for (const s of props.schedules) {
      if (s.status === "CANCELLED") continue;
      const list = m.get(s.date) ?? [];
      list.push(s);
      m.set(s.date, list);
    }
    return m;
  }, [props.schedules]);

  if (props.loading) return <CalendarSkeleton cols={7} tall />;

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-edgesoft bg-gray-50/60">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const list = byDate.get(d) ?? [];
          const isToday = d === today;
          const weekend = parseISO(d).getDay() % 6 === 0;
          return (
            <div
              key={d}
              className={cx(
                "group relative min-h-[104px] border-b border-r border-edgesoft p-1.5 transition-colors",
                weekend && "bg-gray-50/50",
                !inMonth(d) && "opacity-45",
              )}
            >
              <button
                onClick={() => { onAnchor(parseISO(d)); onView("day"); }}
                className={cx(
                  "mb-1 flex h-6.5 w-6.5 items-center justify-center rounded-full text-[12.5px] font-semibold transition-colors",
                  isToday ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100",
                )}
                aria-label={`Xem ngày ${fmtDate(d)}`}
              >
                {Number(d.slice(8, 10))}
              </button>
              <div className="space-y-1">
                {list.slice(0, 3).map((s) => {
                  const activeCount = s.assignments.filter((x) => x.status === "ASSIGNED" || x.status === "CONFIRMED").length;
                  const missing = activeCount < s.requiredPeople;
                  const meta = shiftMeta(s.shiftCode);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onOpenSchedule(s.id)}
                      className={cx(
                        "flex w-full items-center gap-1.5 rounded-md border bg-surface px-1.5 py-1 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-lift)]",
                        missing ? "border-red-200" : s.status === "LOCKED" ? "border-gray-200 bg-gray-50" : "border-edge",
                      )}
                    >
                      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                      <span className="tnum truncate font-mono text-[10.5px] font-semibold text-gray-700">{s.startTime}</span>
                      <span className="ml-auto flex items-center gap-0.5">
                        {s.status === "LOCKED" ? <Lock className="h-3 w-3 text-gray-400" /> : missing ? (
                          <span className="text-[9.5px] font-bold text-red-500">{activeCount}/{s.requiredPeople}</span>
                        ) : (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </span>
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <button onClick={() => { onAnchor(parseISO(d)); onView("day"); }} className="w-full rounded px-1 text-left text-[10.5px] font-semibold text-brand-600 hover:bg-blue-50">
                    +{list.length - 3} ca khác
                  </button>
                )}
              </div>
              {isAdmin && list.length === 0 && inMonth(d) && (
                <button
                  onClick={() => props.onQuickCreate(d)}
                  aria-label={`Tạo ca ngày ${fmtDate(d)}`}
                  className="absolute inset-0 hidden items-center justify-center rounded transition-colors hover:bg-blue-50/40 group-hover:flex"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-gray-400 shadow-sm">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= skeleton ================= */
function CalendarSkeleton({ cols, tall, wide }: { cols: number; tall?: boolean; wide?: boolean }) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex gap-2">
        <Skeleton w={228} />
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} flex />)}
      </div>
      {Array.from({ length: tall ? 5 : 6 }).map((_, r) => (
        <div key={r} className="flex gap-2">
          <div className="skeleton h-12 w-[228px] shrink-0" />
          {Array.from({ length: wide ? 1 : cols }).map((_, c) => (
            <div key={c} className={cx("skeleton h-12", wide ? "flex-1" : "min-w-[110px] flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}
function Skeleton({ w, flex }: { w?: number; flex?: boolean }) {
  return <div className={cx("skeleton h-9", flex && "min-w-[100px] flex-1")} style={w ? { width: w } : undefined} />;
}

/* ================= root ================= */
export function ResourceCalendar(props: Props) {
  const hasAny = props.schedules.some((s) => s.status !== "CANCELLED");
  if (!props.loading && !hasAny) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-7 w-7" />}
        title="Chưa có lịch trực"
        message="Bạn chưa tạo lịch cho khoảng thời gian này. Tạo ca đầu tiên hoặc dùng phân lịch tự động."
        action={
          props.isAdmin ? (
            <div className="flex gap-2">
              <button onClick={() => props.onQuickCreate(todayISO())} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-brand-600 px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
                <Plus className="h-4 w-4" /> Tạo lịch
              </button>
            </div>
          ) : undefined
        }
      />
    );
  }
  if (props.view === "month") return <MonthView {...props} />;
  if (props.view === "day") return <DayView {...props} />;
  return <WeekView {...props} />;
}

/* re-export cho toolbar */
export { timeToPct };
export type { DutySchedule };
export { Tip };
