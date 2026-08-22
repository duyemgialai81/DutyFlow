import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowRight, CalendarDays, CalendarPlus, Check, Clock3, Palmtree,
  Repeat, Sparkles, Users, X,
} from "lucide-react";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import { useEmployees, useMyDuty, useScheduleMutations } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { Avatar, AvatarStack, AssignmentStatusBadge, Button, ProgressBar, ShiftTag, Skeleton } from "../components/ui";
import { cx, fmtDate, fmtDateLong, monthKey, todayISO } from "../lib/utils";

export function OverviewPage() {
  const { user, isAdmin } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const month = monthKey(new Date());
  const today = todayISO();

  const cal = useQuery({ queryKey: ["overview-cal", month], queryFn: () => dutyScheduleApi.calendar({ month }) });
  const { data: employees } = useEmployees();
  const myDuty = useQuery({
    queryKey: ["overview-my"],
    queryFn: () => dutyScheduleApi.myCalendar(today),
    enabled: !isAdmin,
  });
  const mut = useScheduleMutations();

  const stats = cal.data?.stats;
  const todays = useMemo(
    () => (cal.data?.schedules ?? []).filter((s) => s.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [cal.data, today],
  );
  const understaffed = useMemo(
    () => (cal.data?.schedules ?? []).filter((s) =>
      s.date >= today && s.status !== "CANCELLED" && s.status !== "LOCKED" &&
      s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length < s.requiredPeople,
    ).slice(0, 5),
    [cal.data, today],
  );
  const pendingMine = useMemo(
    () => (myDuty.data?.items ?? []).filter((i) => i.assignmentStatus === "ASSIGNED").slice(0, 4),
    [myDuty.data],
  );
  const topLoad = useMemo(
    () => (employees ?? []).slice().sort((a, b) => (b.shiftCountMonth ?? 0) - (a.shiftCountMonth ?? 0)).slice(0, 5),
    [employees],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const dateLabel = fmtDateLong(today);

  const respond = async (assignmentId: number, scheduleId: number, accept: boolean) => {
    try {
      if (accept) await mut.confirmAssignment.mutateAsync({ scheduleId, assignmentId });
      else await mut.declineAssignment.mutateAsync({ scheduleId, assignmentId });
      push("success", accept ? "Bạn đã xác nhận ca trực." : "Đã từ chối ca trực.");
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-ink">{greeting}, {user.name.split(" ").slice(-2).join(" ")}</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">{dateLabel} · {isAdmin ? "Tổng quan phân công toàn đội ngũ" : "Lịch trực và công việc của bạn"}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { window.dispatchEvent(new CustomEvent("df:auto-assign")); navigate("/duty/calendar"); }}>
              <Sparkles className="h-4 w-4 text-brand-600" /> Phân lịch tự động
            </Button>
            <Button onClick={() => { window.dispatchEvent(new CustomEvent("df:create-schedule")); navigate("/duty/calendar"); }}>
              <CalendarPlus className="h-4 w-4" /> Tạo lịch
            </Button>
          </div>
        )}
      </div>

      {/* stats */}
      {cal.isLoading ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px] w-full" />)}</div>
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MiniStat label="Tổng ca tháng này" value={stats?.totalSchedules ?? 0} icon={<CalendarDays className="h-4.5 w-4.5" />} tone="bg-blue-50 text-brand-600" />
          <MiniStat label="Lượt phân công" value={stats?.totalAssignments ?? 0} icon={<Users className="h-4.5 w-4.5" />} tone="bg-green-50 text-green-600" />
          <MiniStat label="Ca thiếu người" value={stats?.understaffed ?? 0} icon={<AlertTriangle className="h-4.5 w-4.5" />} tone={stats?.understaffed ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"} />
          <MiniStat label="Đã khóa" value={stats?.locked ?? 0} icon={<Clock3 className="h-4.5 w-4.5" />} tone="bg-gray-100 text-gray-500" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {/* left 2/3 */}
        <div className="space-y-5 xl:col-span-2">
          {/* understaffed */}
          {isAdmin && (
            <section className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
              <header className="flex items-center justify-between border-b border-edgesoft px-5 py-3.5">
                <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Cần xử lý
                  {understaffed.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">{understaffed.length}</span>}
                </h3>
                <Link to="/duty/calendar" className="text-[12.5px] font-semibold text-brand-600 hover:underline">Mở lịch</Link>
              </header>
              {understaffed.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-gray-400">Tuyệt vời — không còn ca nào thiếu nhân sự.</p>
              ) : (
                <ul className="divide-y divide-edgesoft">
                  {understaffed.map((s) => {
                    const cur = s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length;
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/70">
                        <span className="tnum w-20 font-mono text-[13px] font-bold text-ink">{fmtDate(s.date)}</span>
                        <ShiftTag code={s.shiftCode} size="sm" />
                        <span className="text-[12.5px] text-gray-500">{s.location}</span>
                        <span className="ml-auto flex items-center gap-3">
                          <span className="flex items-center gap-2">
                            <AvatarStack names={s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").map((a) => a.employeeName)} max={3} />
                            <span className="tnum text-[12px] font-bold text-red-500">{cur}/{s.requiredPeople}</span>
                          </span>
                          <Button size="xs" variant="secondary" onClick={() => navigate(`/duty/calendar?open=${s.id}`)}>
                            Phân công <ArrowRight className="h-3 w-3" />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* today */}
          <section className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
            <header className="flex items-center justify-between border-b border-edgesoft px-5 py-3.5">
              <h3 className="text-[14px] font-bold text-ink">Hôm nay · {fmtDate(today)}</h3>
              <Link to="/duty/calendar" className="text-[12.5px] font-semibold text-brand-600 hover:underline">Xem lịch</Link>
            </header>
            {todays.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-gray-400">Hôm nay không có ca trực nào.</p>
            ) : (
              <ul className="divide-y divide-edgesoft">
                {todays.map((s) => {
                  const act = s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED");
                  const missing = act.length < s.requiredPeople;
                  return (
                    <li key={s.id}>
                      <button onClick={() => navigate(`/duty/calendar?open=${s.id}`)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50/70">
                        <span className="tnum w-24 font-mono text-[13px] font-bold text-ink">{s.startTime}–{s.endTime}</span>
                        <ShiftTag code={s.shiftCode} size="sm" />
                        <span className="hidden text-[12.5px] text-gray-500 sm:block">{s.location}</span>
                        <span className="ml-auto flex items-center gap-2">
                          <AvatarStack names={act.map((a) => a.employeeName)} max={4} />
                          {missing
                            ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Thiếu {s.requiredPeople - act.length}</span>
                            : <span className="rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">Đủ</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* employee: pending confirmations */}
          {!isAdmin && (
            <section className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
              <header className="flex items-center justify-between border-b border-edgesoft px-5 py-3.5">
                <h3 className="text-[14px] font-bold text-ink">Chờ bạn xác nhận</h3>
                <Link to="/my-duty" className="text-[12.5px] font-semibold text-brand-600 hover:underline">Ca của tôi</Link>
              </header>
              {pendingMine.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-gray-400">Không còn ca nào chờ xác nhận.</p>
              ) : (
                <ul className="divide-y divide-edgesoft">
                  {pendingMine.map((i) => (
                    <li key={i.assignmentId} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="tnum w-20 font-mono text-[13px] font-bold text-ink">{fmtDate(i.schedule.date)}</span>
                      <ShiftTag code={i.schedule.shiftCode} size="sm" />
                      <span className="hidden text-[12.5px] text-gray-500 sm:block">{i.schedule.location}</span>
                      <span className="ml-auto flex gap-1.5">
                        <Button size="xs" onClick={() => respond(i.assignmentId, i.schedule.id, true)} loading={mut.confirmAssignment.isPending}>
                          <Check className="h-3.5 w-3.5" /> Xác nhận
                        </Button>
                        <Button size="xs" variant="secondary" onClick={() => respond(i.assignmentId, i.schedule.id, false)}>
                          <X className="h-3.5 w-3.5 text-red-500" /> Từ chối
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* right 1/3 */}
        <div className="space-y-5">
          {isAdmin ? (
            <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="mb-3.5 text-[14px] font-bold text-ink">Nhân viên nhiều ca nhất</h3>
              <ul className="space-y-3">
                {topLoad.map((e) => (
                  <li key={e.id} className="flex items-center gap-3">
                    <Avatar name={e.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink">{e.fullName}</p>
                        <span className="tnum text-[12px] font-bold text-gray-500">{e.shiftCountMonth} ca</span>
                      </div>
                      <ProgressBar value={e.shiftCountMonth ?? 0} max={10} tone={(e.shiftCountMonth ?? 0) >= 8 ? "amber" : "brand"} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] text-gray-400">Giới hạn công bằng: 10 ca / nhân viên / tháng.</p>
            </section>
          ) : (
            <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
              <h3 className="mb-3.5 text-[14px] font-bold text-ink">Sắp tới của bạn</h3>
              {(myDuty.data?.items ?? []).length === 0 ? (
                <p className="py-4 text-center text-[13px] text-gray-400">Chưa có ca nào sắp tới.</p>
              ) : (
                <ul className="space-y-2.5">
                  {(myDuty.data?.items ?? []).slice(0, 4).map((i) => (
                    <li key={i.assignmentId} className="rounded-xl border border-edge p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="tnum font-mono text-[12.5px] font-bold text-ink">{fmtDate(i.schedule.date)} · {i.schedule.startTime}</span>
                        <AssignmentStatusBadge status={i.assignmentStatus} />
                      </div>
                      <p className="mt-1 text-[12px] text-gray-500">{i.schedule.shiftName} · {i.schedule.location}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* quick actions */}
          <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-3 text-[14px] font-bold text-ink">Thao tác nhanh</h3>
            <div className="space-y-1.5">
              {isAdmin && (
                <QuickAction icon={<CalendarPlus className="h-4 w-4" />} label="Tạo lịch trực" onClick={() => { window.dispatchEvent(new CustomEvent("df:create-schedule")); navigate("/duty/calendar"); }} />
              )}
              <QuickAction icon={<Repeat className="h-4 w-4" />} label="Yêu cầu đổi ca / nghỉ phép" onClick={() => navigate("/requests")} />
              <QuickAction icon={<Palmtree className="h-4 w-4" />} label="Đăng ký nghỉ" onClick={() => navigate("/requests")} />
              <QuickAction icon={<Users className="h-4 w-4" />} label={isAdmin ? "Quản lý nhân viên" : "Xem đồng đội"} onClick={() => navigate(isAdmin ? "/users" : "/duty/calendar")} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-sub">{label}</p>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-[10px]", tone)}>{icon}</span>
      </div>
      <p className="tnum mt-2 text-[28px] font-bold leading-none tracking-tight text-ink">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-gray-700 transition-all duration-150 hover:bg-blue-50 hover:text-brand-700"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors">{icon}</span>
      {label}
      <ArrowRight className="ml-auto h-4 w-4 text-gray-300" />
    </button>
  );
}
