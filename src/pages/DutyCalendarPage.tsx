import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Lock, Users, CalendarDays } from "lucide-react";
import { useCalendar, useDepartments, useShifts, useEmployees } from "../hooks/useDutySchedule";
import { useAuth } from "../state/AppProviders";
import { Avatar, Button, EmptyState, ScheduleStatusPill, Select, ShiftChip, Skeleton, Stat } from "../components/ui";
import { cx, fmtDate, monthKey, monthMatrix, todayISO, weekdayShort } from "../lib/utils";
import type { DutySchedule } from "../types/duty";

function ScheduleChip({ s, onOpen }: { s: DutySchedule; onOpen: () => void }) {
  const active = s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED");
  const full = active.length >= s.requiredPeople;
  const cancelled = s.status === "CANCELLED";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className={cx(
        "group/chip w-full rounded-lg border px-2 py-1.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        cancelled && "opacity-50 hover:translate-y-0",
        s.shiftCode === "MORNING" && "border-gold-300/60 bg-gold-100/70 hover:border-gold-500/60",
        s.shiftCode === "AFTERNOON" && "border-pine-300/60 bg-pine-50 hover:border-pine-500/60",
        s.shiftCode === "NIGHT" && "border-night-600/25 bg-night-100/70 hover:border-night-600/50",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10.5px] font-bold text-ink">
          {s.startTime}–{s.endTime}
        </span>
        <span className="flex items-center gap-1">
          {s.status === "LOCKED" && <Lock className="h-3 w-3 text-muted" />}
          <span
            className={cx(
              "flex items-center gap-0.5 rounded px-1 py-px text-[9.5px] font-bold",
              full ? "bg-ok-100 text-ok-700" : "bg-warn-100 text-warn-700",
              cancelled && "bg-linesoft text-muted",
            )}
          >
            <Users className="h-2.5 w-2.5" />
            {active.length}/{s.requiredPeople}
          </span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <div className="flex -space-x-1.5">
          {active.slice(0, 3).map((a) => (
            <span key={a.id} className="rounded-full ring-2 ring-white/70">
              <Avatar name={a.employeeName} size="xs" />
            </span>
          ))}
          {active.length === 0 && <span className="text-[9.5px] font-semibold italic text-muted">Chưa phân công</span>}
        </div>
        {active.length > 3 && <span className="text-[9.5px] font-bold text-muted">+{active.length - 3}</span>}
      </div>
    </button>
  );
}

export function DutyCalendarPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [shiftId, setShiftId] = useState<number | "">("");
  const [status, setStatus] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<number | "">("");

  const filter = useMemo(
    () => ({
      month: monthKey(new Date(year, month0, 1)),
      departmentId: departmentId || undefined,
      shiftId: shiftId || undefined,
      status: status || undefined,
      employeeId: employeeId || undefined,
    }),
    [year, month0, departmentId, shiftId, status, employeeId],
  );

  const { data, isLoading } = useCalendar(filter);
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();
  const { data: employees } = useEmployees();

  const cells = useMemo(() => monthMatrix(year, month0), [year, month0]);
  const byDate = useMemo(() => {
    const m = new Map<string, DutySchedule[]>();
    (data?.schedules ?? []).forEach((s) => {
      const arr = m.get(s.date) ?? [];
      arr.push(s);
      m.set(s.date, arr);
    });
    return m;
  }, [data]);

  const hasFilter = departmentId !== "" || shiftId !== "" || status !== "" || employeeId !== "";
  const today = todayISO();
  const monthLabel = `Tháng ${month0 + 1}/${year}`;

  const nav = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };

  return (
    <div className="space-y-5">
      {/* hàng thao tác */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1 shadow-sm">
          <button onClick={() => nav(-1)} className="rounded-lg p-2 text-inksoft transition-colors hover:bg-pine-50 hover:text-ink" aria-label="Tháng trước">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display min-w-[128px] text-center text-[16px] font-extrabold text-ink">{monthLabel}</span>
          <button onClick={() => nav(1)} className="rounded-lg p-2 text-inksoft transition-colors hover:bg-pine-50 hover:text-ink" aria-label="Tháng sau">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button variant="secondary" size="md" onClick={() => { setYear(now.getFullYear()); setMonth0(now.getMonth()); }}>
          Hôm nay
        </Button>
        {hasFilter && (
          <Button
            variant="ghost" size="md"
            onClick={() => { setDepartmentId(""); setShiftId(""); setStatus(""); setEmployeeId(""); }}
          >
            <RotateCcw className="h-4 w-4" /> Xóa bộ lọc
          </Button>
        )}
        <div className="flex-1" />
        {isAdmin && (
          <Button onClick={() => navigate("/duty/create")}>
            <Plus className="h-4 w-4" /> Tạo lịch
          </Button>
        )}
      </div>

      {/* bộ lọc */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Tất cả phòng ban</option>
          {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={shiftId} onChange={(e) => setShiftId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Tất cả ca trực</option>
          {(shifts ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="LOCKED">Đã khóa</option>
          <option value="CANCELLED">Đã hủy</option>
        </Select>
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Tất cả nhân viên</option>
          {(employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
        </Select>
      </div>

      {/* thống kê */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ca trong tháng" value={isLoading ? "–" : data?.stats.totalSchedules ?? 0} tone="dark" sub={monthLabel} />
        <Stat label="Ca thiếu người" value={isLoading ? "–" : data?.stats.understaffed ?? 0} tone={data?.stats.understaffed ? "warn" : "default"} sub="Cần bổ sung nhân sự" />
        <Stat label="Ca đã khóa" value={isLoading ? "–" : data?.stats.locked ?? 0} sub="Không thể chỉnh sửa" />
        <Stat
          label="Xác nhận của NV"
          value={isLoading ? "–" : `${data?.stats.confirmedAssignments ?? 0}/${data?.stats.totalAssignments ?? 0}`}
          tone="ok"
          sub="Phản hồi phân công"
        />
      </div>

      {/* lưới lịch */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-7 border-b border-line bg-pine-900 text-center">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
            <div key={d} className={cx("py-2.5 text-[12px] font-bold uppercase tracking-wider", i >= 5 ? "text-gold-300" : "text-pine-100")}>
              {d}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="min-h-[104px] border-b border-r border-linesoft p-2 [&:nth-child(7n)]:border-r-0">
                <Skeleton className="mb-2 h-4 w-6" />
                <Skeleton className="mb-1.5 h-10 w-full" />
                {i % 3 === 0 && <Skeleton className="h-10 w-full" />}
              </div>
            ))}
          </div>
        ) : (
          <div key={`${year}-${month0}`} className="stagger grid grid-cols-7">
            {cells.map((iso) => {
              const inMonth = iso.slice(5, 7) === String(month0 + 1).padStart(2, "0");
              const isToday = iso === today;
              const list = byDate.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  onClick={() => isAdmin && inMonth && navigate(`/duty/create?date=${iso}`)}
                  className={cx(
                    "group min-h-[104px] border-b border-r border-linesoft p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-paper/70",
                    isAdmin && inMonth && "cursor-pointer hover:bg-pine-50/60",
                    isToday && "bg-gold-100/40",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span
                      className={cx(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold",
                        isToday ? "bg-pine-800 text-white shadow" : inMonth ? "text-ink" : "text-muted/60",
                      )}
                    >
                      {Number(iso.slice(8, 10))}
                    </span>
                    <span className="text-[9px] font-semibold uppercase text-muted/70 md:hidden">{weekdayShort(iso)}</span>
                    {isAdmin && inMonth && list.length === 0 && (
                      <Plus className="h-3.5 w-3.5 text-pine-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                  <div className="space-y-1">
                    {list.map((s) => (
                      <ScheduleChip key={s.id} s={s} onOpen={() => navigate(`/duty-schedules/${s.id}`)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* chú giải */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
        <span className="font-bold uppercase tracking-wider text-inksoft">Chú giải:</span>
        {(shifts ?? []).map((s) => <ShiftChip key={s.id} code={s.code} time={`${s.startTime}–${s.endTime}`} size="sm" />)}
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok-600" /> Đủ người</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn-600" /> Thiếu người</span>
        <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Đã khóa</span>
      </div>

      {!isLoading && (data?.schedules.length ?? 0) === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="Không có ca trực nào"
          message={hasFilter ? "Không có ca trực khớp bộ lọc trong tháng này." : "Chưa có lịch trực trong tháng. Hãy tạo ca hoặc dùng phân ca tự động."}
          action={isAdmin ? (
            <div className="flex gap-2">
              <Button onClick={() => navigate("/duty/create")}><Plus className="h-4 w-4" /> Tạo lịch</Button>
              <Button variant="secondary" onClick={() => navigate("/duty/auto-assign")}>Phân ca tự động</Button>
            </div>
          ) : undefined}
        />
      )}

      <p className="text-center text-[11.5px] text-muted">
        Mẹo: bấm vào một ngày trống để tạo ca trực · dữ liệu ngày {fmtDate(today)}
      </p>
    </div>
  );
}
