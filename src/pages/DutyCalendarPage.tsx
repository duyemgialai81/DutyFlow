import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, Search, Settings2, Sparkles, TrendingUp, Users, X,
} from "lucide-react";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import { useDepartments, useEmployees, useShifts, useScheduleMutations } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { ResourceCalendar } from "../components/calendar/ResourceCalendar";
import type { DragPayload, ViewMode } from "../components/calendar/ResourceCalendar";
import { CreateScheduleDrawer } from "../components/duty/CreateScheduleDrawer";
import { DetailDrawer } from "../components/duty/DetailDrawer";
import { AutoAssignModal } from "../components/duty/AutoAssignModal";
import type { AutoAssignPreset } from "../components/duty/AutoAssignModal";
import { Avatar, Button, ConfirmDialog, Modal, Segmented, Select, Skeleton, Toggle, AvatarStack } from "../components/ui";
import { cx, fmtDate, fmtDateLong, monthKey, parseISO, toISODate, todayISO } from "../lib/utils";
import type { DutySchedule } from "../types/duty";

/* ---------- stat card ---------- */
function StatCard({ label, value, sub, delta, icon, tone = "blue" }: {
  label: string; value: string; sub: string; delta?: { text: string; up: boolean };
  icon: React.ReactNode; tone?: "blue" | "green" | "amber" | "red";
}) {
  const toneCls = {
    blue: "bg-blue-50 text-brand-600", green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-500",
  }[tone];
  return (
    <div className="rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-sub">{label}</p>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-[10px]", toneCls)}>{icon}</span>
      </div>
      <p className="tnum mt-2 text-[28px] font-bold leading-none tracking-tight text-ink">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        {delta && (
          <span className={cx("flex items-center gap-0.5 font-semibold", delta.up ? "text-green-600" : "text-red-500")}>
            <TrendingUp className={cx("h-3.5 w-3.5", !delta.up && "rotate-180 -scale-x-100")} /> {delta.text}
          </span>
        )}
        <span className="text-gray-400">{sub}</span>
      </div>
    </div>
  );
}

/* ---------- filter popover ---------- */
function FilterPopover({ filters, setFilters, departments, shifts, onClose, count }: {
  filters: { departmentId?: number; shiftId?: number; status?: string };
  setFilters: (f: typeof filters) => void;
  departments: { id: number; name: string }[];
  shifts: { id: number; name: string; code: string }[];
  onClose: () => void;
  count: number;
}) {
  const [draft, setDraft] = useState(filters);
  return (
    <div className="anim-pop absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-edge bg-surface p-4 shadow-[var(--shadow-pop)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-bold text-ink">Bộ lọc</p>
        {count > 0 && (
          <button onClick={() => setDraft({})} className="text-[12px] font-semibold text-brand-600 hover:underline">Reset</button>
        )}
      </div>
      <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-gray-400">Phòng ban</label>
      <Select value={draft.departmentId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value ? Number(e.target.value) : undefined }))}>
        <option value="">Tất cả</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      <label className="mb-1.5 mt-3 block text-[11.5px] font-bold uppercase tracking-wide text-gray-400">Ca trực</label>
      <Select value={draft.shiftId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, shiftId: e.target.value ? Number(e.target.value) : undefined }))}>
        <option value="">Tất cả</option>
        {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <label className="mb-1.5 mt-3 block text-[11.5px] font-bold uppercase tracking-wide text-gray-400">Trạng thái</label>
      <Select value={draft.status ?? ""} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value || undefined }))}>
        <option value="">Tất cả</option>
        <option value="DRAFT">Nháp</option>
        <option value="CONFIRMED">Đã xác nhận</option>
        <option value="LOCKED">Đã khóa</option>
      </Select>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>Đóng</Button>
        <Button size="sm" onClick={() => { setFilters(draft); onClose(); }}>Áp dụng</Button>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export function DutyCalendarPage() {
  const { isAdmin, user } = useAuth();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const mut = useScheduleMutations();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [filters, setFilters] = useState<{ departmentId?: number; shiftId?: number; status?: string }>({});
  const [search, setSearch] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createPreset, setCreatePreset] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoPreset, setAutoPreset] = useState<AutoAssignPreset | undefined>(undefined);
  const [moveReq, setMoveReq] = useState<{ payload: DragPayload; target: { employeeId: number; employeeName: string; date: string; schedule?: DutySchedule } } | null>(null);

  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();

  /* month range theo view (tuần có thể vắt tháng) */
  const months = useMemo(() => {
    const m1 = monthKey(anchor);
    if (view === "week") {
      const dow = (anchor.getDay() + 6) % 7;
      const sunday = new Date(anchor);
      sunday.setDate(anchor.getDate() + (6 - dow));
      const m2 = monthKey(sunday);
      return m2 === m1 ? [m1] : [m1, m2];
    }
    return [m1];
  }, [anchor, view]);

  const q1 = useQuery({
    queryKey: ["cal", months[0], filters],
    queryFn: () => dutyScheduleApi.calendar({ month: months[0], ...filters }),
  });
  const q2 = useQuery({
    queryKey: ["cal", months[1] ?? "", filters],
    queryFn: () => dutyScheduleApi.calendar({ month: months[1]!, ...filters }),
    enabled: !!months[1],
  });

  const schedules = useMemo(() => {
    const all = [...(q1.data?.schedules ?? []), ...(q2.data?.schedules ?? [])];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((s) =>
      s.assignments.some((a) => a.employeeName.toLowerCase().includes(term)) ||
      s.location.toLowerCase().includes(term) || s.shiftName.toLowerCase().includes(term),
    );
  }, [q1.data, q2.data, search]);

  const stats = q1.data?.stats;
  const loading = q1.isLoading;

  /* nhân viên sau khi lọc search */
  const visibleEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = employees ?? [];
    if (!term) return list;
    return list.filter((e) => e.fullName.toLowerCase().includes(term) || e.employeeCode.toLowerCase().includes(term));
  }, [employees, search]);

  /* deep link ?open= */
  useEffect(() => {
    const open = params.get("open");
    if (open) {
      setDetailId(Number(open));
      params.delete("open");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  /* global events từ CommandSearch */
  useEffect(() => {
    const openCreate = () => { setCreatePreset(undefined); setCreateOpen(true); };
    const openAuto = () => setAutoOpen(true);
    const goToday = () => { setAnchor(new Date()); setView("week"); };
    window.addEventListener("df:create-schedule", openCreate);
    window.addEventListener("df:auto-assign", openAuto);
    window.addEventListener("df:go-today", goToday);
    return () => {
      window.removeEventListener("df:create-schedule", openCreate);
      window.removeEventListener("df:auto-assign", openAuto);
      window.removeEventListener("df:go-today", goToday);
    };
  }, []);

  /* prev month stats cho delta */
  const prevMonth = useMemo(() => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    return monthKey(d);
  }, [anchor]);
  const qPrev = useQuery({
    queryKey: ["cal-prev", prevMonth],
    queryFn: () => dutyScheduleApi.calendar({ month: prevMonth }),
  });

  const nav = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setAnchor(d);
  };

  const periodLabel = useMemo(() => {
    if (view === "day") return fmtDateLong(toISODate(anchor));
    const m = anchor.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, [anchor, view]);

  /* cảnh báo thiếu người trong khoảng nhìn thấy */
  const warnings = useMemo(
    () => schedules.filter((s) =>
      s.status !== "CANCELLED" && s.status !== "LOCKED" &&
      s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length < s.requiredPeople,
    ).slice(0, 3),
    [schedules],
  );

  const onMoveRequest = useCallback((payload: DragPayload, target: { employeeId: number; employeeName: string; date: string; schedule?: DutySchedule }) => {
    if (payload.employeeId === target.employeeId && payload.date === target.date) return;
    setMoveReq({ payload, target });
  }, []);

  const confirmMove = async () => {
    if (!moveReq) return;
    const { payload, target } = moveReq;
    try {
      if (payload.date === target.date && (!target.schedule || target.schedule.id === payload.scheduleId)) {
        await dutyScheduleApi.replaceAssignment(payload.scheduleId, payload.assignmentId, target.employeeId);
        push("success", `Đã chuyển ca từ ${payload.employeeName} sang ${target.employeeName}. Thông báo Zalo đang gửi.`);
      } else {
        const targetSched = target.schedule ?? schedules.find((s) => s.date === target.date && s.shiftId === payload.shiftId && s.status !== "CANCELLED");
        if (!targetSched) {
          push("error", `Không có ca ${payload.shiftName.toLowerCase()} ngày ${fmtDate(target.date)} để chuyển tới — hãy tạo lịch trước.`);
          setMoveReq(null);
          return;
        }
        await dutyScheduleApi.removeAssignment(payload.scheduleId, payload.assignmentId);
        await dutyScheduleApi.addAssignment(targetSched.id, payload.employeeId);
        push("success", `Đã chuyển ${payload.employeeName} sang ca ${fmtDate(target.date)} ${payload.startTime}.`);
      }
      setMoveReq(null);
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const delta = useMemo(() => {
    const prev = qPrev.data?.stats?.totalSchedules ?? 0;
    const cur = stats?.totalSchedules ?? 0;
    if (!prev) return undefined;
    const pct = Math.round(((cur - prev) / prev) * 100);
    return { text: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
  }, [qPrev.data, stats]);

  const filterCount = [filters.departmentId, filters.shiftId, filters.status].filter(Boolean).length;

  /* mobile day list */
  const [mobileDate, setMobileDate] = useState(todayISO());
  const mobileDays = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toISODate(d);
  }), []);
  const mobileSchedules = useMemo(
    () => schedules.filter((s) => s.date === mobileDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules, mobileDate],
  );

  return (
    <div className="space-y-5">
      {/* ===== page header ===== */}
      <div className="anim-rise flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Phân lịch trực</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">Quản lý ca trực và phân công nhân sự theo thời gian thực.</p>
        </div>
        <Button variant="secondary" onClick={() => { setAnchor(new Date()); setView("week"); }}>Hôm nay</Button>
        {isAdmin && (
          <>
            <Button variant="secondary" className="border-blue-200 bg-blue-50/60 text-brand-700 hover:bg-blue-50" onClick={() => setAutoOpen(true)}>
              <Sparkles className="h-4 w-4 text-brand-600" /> Phân lịch tự động
            </Button>
            <Button onClick={() => { setCreatePreset(undefined); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" /> Tạo lịch
            </Button>
          </>
        )}
      </div>

      {/* ===== quick stats ===== */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px] w-full" />)}
        </div>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Tổng ca" value={String(stats?.totalSchedules ?? 0)} sub="tháng này" delta={delta} icon={<CalendarDays className="h-4.5 w-4.5" />} />
          <StatCard
            label="Đã phân công" value={String(stats?.totalAssignments ?? 0)}
            sub={`${stats && stats.totalAssignments > 0 ? Math.round((stats.confirmedAssignments / stats.totalAssignments) * 100) : 0}% đã xác nhận`}
            icon={<Users className="h-4.5 w-4.5" />} tone="green"
          />
          <StatCard label="Còn thiếu" value={String(stats?.understaffed ?? 0)} sub={stats?.understaffed ? "cần xử lý" : "đủ nhân sự"} icon={<AlertTriangle className="h-4.5 w-4.5" />} tone={stats?.understaffed ? "amber" : "green"} />
          <StatCard label="Nhân sự trực" value={String(visibleEmployees.length)} sub={`${stats?.locked ?? 0} ca đã khóa`} icon={<Users className="h-4.5 w-4.5" />} tone="amber" />
        </div>
      )}

      {/* ===== warnings ===== */}
      {warnings.length > 0 && (
        <div className="anim-rise flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-amber-200/80 bg-amber-50/70 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Thiếu nhân sự
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {warnings.map((s) => {
              const cur = s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length;
              return (
                <button
                  key={s.id}
                  onClick={() => setDetailId(s.id)}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-gray-700 transition-all duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-lift)]"
                >
                  {fmtDate(s.date)} · {s.shiftName}
                  <span className="tnum font-bold text-red-500">{cur}/{s.requiredPeople}</span>
                  <span className="flex items-center gap-0.5 font-bold text-brand-600">Phân công <ArrowRight className="h-3 w-3" /></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== toolbar + calendar (desktop) ===== */}
      <div className="anim-rise overflow-hidden rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-edgesoft px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button onClick={() => nav(-1)} aria-label="Trước" className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button onClick={() => nav(1)} aria-label="Sau" className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => { setAnchor(new Date()); }}>Hôm nay</Button>
          </div>

          <Segmented
            options={[{ value: "month", label: "Tháng" }, { value: "week", label: "Tuần" }, { value: "day", label: "Ngày" }]}
            value={view}
            onChange={setView}
          />

          <span className="ml-1 text-[14px] font-bold tracking-tight text-ink">{periodLabel}</span>

          <div className="relative ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trong lịch..."
                className="h-8.5 w-44 rounded-[10px] border border-edge bg-gray-50 pl-8 pr-2 text-[12.5px] transition-all focus:w-56 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label="Tìm trong lịch"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cx(
                  "flex h-8.5 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold transition-colors",
                  filterCount > 0 ? "border-blue-200 bg-blue-50 text-brand-700" : "border-edge bg-surface text-gray-600 hover:bg-gray-50",
                )}
                aria-expanded={filterOpen}
              >
                <Filter className="h-3.5 w-3.5" /> Lọc
                {filterCount > 0 && <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{filterCount}</span>}
              </button>
              {filterOpen && (
                <FilterPopover
                  filters={filters}
                  setFilters={setFilters}
                  departments={departments ?? []}
                  shifts={shifts ?? []}
                  count={filterCount}
                  onClose={() => setFilterOpen(false)}
                />
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                aria-label="Tuỳ chọn hiển thị"
                className="flex h-8.5 w-8.5 items-center justify-center rounded-[10px] border border-edge bg-surface text-gray-500 transition-colors hover:bg-gray-50"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />
                  <div className="anim-pop absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-edge bg-surface p-3.5 shadow-[var(--shadow-pop)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold text-gray-700">Ẩn nhân viên trống</span>
                      <Toggle checked={hideEmpty} onChange={setHideEmpty} label="Ẩn nhân viên trống" />
                    </div>
                    <p className="mt-2 text-[11.5px] leading-snug text-gray-400">Chỉ hiển thị nhân viên có ca trong khoảng thời gian đang xem.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* desktop calendar */}
        <div className="hidden md:block">
          <ResourceCalendar
            schedules={schedules}
            employees={visibleEmployees}
            view={view}
            anchor={anchor}
            onAnchor={setAnchor}
            onView={setView}
            onOpenSchedule={setDetailId}
            onQuickCreate={(d) => { setCreatePreset(d); setCreateOpen(true); }}
            onMoveRequest={onMoveRequest}
            isAdmin={isAdmin}
            currentEmployeeId={user.employeeId}
            hideEmptyRows={hideEmpty}
            loading={loading}
          />
        </div>

        {/* mobile: date strip + day list */}
        <div className="md:hidden">
          <div className="flex gap-1.5 overflow-x-auto border-b border-edgesoft px-3 py-2.5">
            {mobileDays.map((d) => {
              const count = schedules.filter((s) => s.date === d).length;
              const active = d === mobileDate;
              return (
                <button
                  key={d}
                  onClick={() => setMobileDate(d)}
                  className={cx(
                    "flex min-w-[52px] flex-col items-center rounded-[10px] border px-2 py-1.5 transition-all",
                    active ? "border-brand-600 bg-brand-600 text-white shadow-[0_2px_8px_rgb(37_99_235/0.35)]" : "border-edge bg-surface text-gray-600",
                    d === todayISO() && !active && "border-blue-200 bg-blue-50/50",
                  )}
                >
                  <span className={cx("text-[9.5px] font-bold uppercase", active ? "text-blue-200" : "text-gray-400")}>
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"][parseISO(d).getDay()]}
                  </span>
                  <span className="tnum text-[15px] font-bold leading-tight">{Number(d.slice(8, 10))}</span>
                  <span className={cx("text-[9px] font-semibold", active ? "text-blue-200" : count > 0 ? "text-brand-600" : "text-gray-300")}>
                    {count > 0 ? `${count} ca` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="space-y-2.5 p-3">
            {mobileSchedules.length === 0 && (
              <div className="py-10 text-center">
                <CalendarDays className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-[13px] font-semibold text-gray-600">Không có ca trực</p>
                <p className="text-[12px] text-gray-400">Ngày {fmtDate(mobileDate)} chưa có lịch.</p>
              </div>
            )}
            {mobileSchedules.map((s) => {
              const activeAssign = s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED");
              const missing = activeAssign.length < s.requiredPeople;
              return (
                <button
                  key={s.id}
                  onClick={() => setDetailId(s.id)}
                  className="w-full rounded-xl border border-edge bg-surface p-3.5 text-left transition-all hover:-translate-y-px hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="tnum font-mono text-[13px] font-bold text-ink">{s.startTime} – {s.endTime}</span>
                    <span className="text-[12.5px] font-bold uppercase text-gray-500">{s.shiftName}</span>
                    {missing
                      ? <span className="ml-auto rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Thiếu {s.requiredPeople - activeAssign.length}</span>
                      : <span className="ml-auto rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">Đủ</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <AvatarStack names={activeAssign.map((a) => a.employeeName)} max={5} size="sm" />
                    <span className="truncate text-[12px] text-gray-400">{s.location}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== drawers & modals ===== */}
      <CreateScheduleDrawer open={createOpen} onClose={() => setCreateOpen(false)} presetDate={createPreset} onCreated={(id) => setDetailId(id)} />
      <DetailDrawer scheduleId={detailId} onClose={() => setDetailId(null)} />
      {isAdmin && <AutoAssignModal open={autoOpen} onClose={() => setAutoOpen(false)} preset={autoPreset} />}

      {/* drag & drop confirm */}
      <Modal
        open={!!moveReq}
        onClose={() => setMoveReq(null)}
        title="Chuyển ca trực?"
        subtitle="Nhân viên liên quan sẽ nhận thông báo Zalo"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveReq(null)}>Hủy</Button>
            <Button onClick={confirmMove}><Check16 /> Xác nhận</Button>
          </>
        }
      >
        {moveReq && (
          <div className="space-y-3">
            <div className="rounded-xl border border-edge bg-gray-50/60 p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Từ</p>
              <div className="flex items-center gap-3">
                <Avatar name={moveReq.payload.employeeName} />
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{moveReq.payload.employeeName}</p>
                  <p className="tnum font-mono text-[12px] text-gray-500">{fmtDate(moveReq.payload.date)} · {moveReq.payload.startTime} – {moveReq.payload.endTime}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center"><ArrowRight className="h-4 w-4 rotate-90 text-gray-300" /></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-400">Sang</p>
              <div className="flex items-center gap-3">
                <Avatar name={moveReq.target.employeeName} />
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{moveReq.target.employeeName}</p>
                  <p className="tnum font-mono text-[12px] text-gray-500">
                    {fmtDate(moveReq.target.date)} · {moveReq.payload.startTime} – {moveReq.payload.endTime}
                  </p>
                </div>
              </div>
            </div>
            {moveReq.target.employeeId === moveReq.payload.employeeId && moveReq.target.date !== moveReq.payload.date && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Chuyển sang ngày khác sẽ dời nhân viên sang ca {moveReq.payload.shiftName.toLowerCase()} của ngày {fmtDate(moveReq.target.date)} (nếu có).
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Check16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export { X };
