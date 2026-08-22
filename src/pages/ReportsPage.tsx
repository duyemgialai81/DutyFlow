import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import { useEmployees } from "../hooks/useDutySchedule";
import { Avatar, ProgressBar, Skeleton } from "../components/ui";
import { cx, monthKey, parseISO, toISODate } from "../lib/utils";

export function ReportsPage() {
  const [offset, setOffset] = useState(0);
  const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
  const month = monthKey(monthDate);

  const cal = useQuery({ queryKey: ["report-cal", month], queryFn: () => dutyScheduleApi.calendar({ month }) });
  const { data: employees } = useEmployees();

  const byDay = useMemo(() => {
    const m = new Map<string, { required: number; assigned: number }>();
    for (const s of cal.data?.schedules ?? []) {
      if (s.status === "CANCELLED") continue;
      const cur = m.get(s.date) ?? { required: 0, assigned: 0 };
      cur.required += s.requiredPeople;
      cur.assigned += s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length;
      m.set(s.date, cur);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cal.data]);

  const byShift = useMemo(() => {
    const m = new Map<string, { name: string; code: "MORNING" | "AFTERNOON" | "NIGHT"; count: number; assigned: number; required: number }>();
    for (const s of cal.data?.schedules ?? []) {
      if (s.status === "CANCELLED") continue;
      const cur = m.get(s.shiftName) ?? { name: s.shiftName, code: s.shiftCode, count: 0, assigned: 0, required: 0 };
      cur.count++;
      cur.required += s.requiredPeople;
      cur.assigned += s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length;
      m.set(s.shiftName, cur);
    }
    return Array.from(m.values());
  }, [cal.data]);

  const stats = cal.data?.stats;
  const confirmRate = stats && stats.totalAssignments > 0 ? Math.round((stats.confirmedAssignments / stats.totalAssignments) * 100) : 0;
  const connected = (employees ?? []).filter((e) => e.zaloConnected).length;
  const zaloRate = employees?.length ? Math.round((connected / employees.length) * 100) : 0;
  const topEmployees = useMemo(
    () => (employees ?? []).slice().sort((a, b) => (b.shiftCountMonth ?? 0) - (a.shiftCountMonth ?? 0)).slice(0, 6),
    [employees],
  );
  const maxDay = Math.max(1, ...byDay.map(([, v]) => v.required));
  const label = monthDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  if (cal.isLoading) {
    return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Báo cáo</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">Mức độ phủ lịch và hiệu suất phân công theo tháng</p>
        </div>
        <div className="flex items-center gap-1 rounded-[10px] border border-edge bg-surface p-1 shadow-card">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="Tháng trước" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>
          <span className="min-w-40 text-center text-[13.5px] font-bold capitalize text-ink">{label}</span>
          <button onClick={() => setOffset((o) => Math.min(0, o + 1))} disabled={offset >= 0} aria-label="Tháng sau" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* headline numbers */}
      <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Headline label="Coverage trung bình" value={`${byDay.length ? Math.round((byDay.reduce((s, [, v]) => s + Math.min(1, v.assigned / v.required), 0) / byDay.length) * 100) : 0}%`} icon={<BarChart3 className="h-4.5 w-4.5" />} tone="bg-blue-50 text-brand-600" />
        <Headline label="Tỷ lệ xác nhận" value={`${confirmRate}%`} icon={<ShieldCheck className="h-4.5 w-4.5" />} tone="bg-green-50 text-green-600" />
        <Headline label="Kết nối Zalo" value={`${zaloRate}%`} icon={<MessageSquare className="h-4.5 w-4.5" />} tone="bg-blue-50 text-blue-500" />
        <Headline label="Ca thiếu người" value={String(stats?.understaffed ?? 0)} icon={<Users className="h-4.5 w-4.5" />} tone={stats?.understaffed ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* coverage by day */}
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-bold text-ink">Nhân sự theo ngày</h3>
          <p className="text-[12px] text-gray-400">Cột xanh = đủ người · cột đỏ = thiếu</p>
          {byDay.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-gray-400">Tháng này chưa có ca trực.</p>
          ) : (
            <div className="mt-4 flex h-40 items-end gap-[3px]">
              {byDay.map(([date, v]) => {
                const full = v.assigned >= v.required;
                const pct = Math.min(100, (v.assigned / maxDay) * 100);
                return (
                  <div key={date} className="group relative flex flex-1 flex-col items-center justify-end self-stretch">
                    <div
                      className={cx("w-full rounded-t-[4px] transition-all duration-300", full ? "bg-brand-500/85 group-hover:bg-brand-600" : "bg-red-400/90 group-hover:bg-red-500")}
                      style={{ height: `${Math.max(6, pct)}%` }}
                    />
                    {/* tooltip */}
                    <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10.5px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                      {date.slice(8, 10)}/{date.slice(5, 7)} · {v.assigned}/{v.required}
                    </div>
                    <span className="tnum mt-1 font-mono text-[9px] font-medium text-gray-400">{date.slice(8, 10)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* shift distribution */}
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-bold text-ink">Phân bổ theo ca</h3>
          <div className="mt-4 space-y-4">
            {byShift.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                  <span className="font-semibold text-gray-700">{s.name} <span className="text-gray-400">· {s.count} ca</span></span>
                  <span className="tnum font-bold text-ink">{s.assigned}/{s.required}</span>
                </div>
                <ProgressBar value={s.assigned} max={s.required} tone={s.assigned >= s.required ? "green" : "amber"} />
              </div>
            ))}
            {byShift.length === 0 && <p className="py-8 text-center text-[13px] text-gray-400">Chưa có dữ liệu.</p>}
          </div>
        </section>

        {/* top employees */}
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-bold text-ink">Nhân viên trực nhiều nhất</h3>
          <ul className="mt-3.5 space-y-3">
            {topEmployees.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className={cx("tnum w-5 text-center font-mono text-[12px] font-bold", i < 3 ? "text-brand-600" : "text-gray-300")}>{i + 1}</span>
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
        </section>

        {/* zalo + confirm funnel */}
        <section className="anim-rise rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-bold text-ink">Kênh thông báo & xác nhận</h3>
          <div className="mt-4 space-y-5">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                <span className="font-semibold text-gray-700">Nhân viên kết nối Zalo</span>
                <span className="tnum font-bold text-ink">{connected}/{employees?.length ?? 0}</span>
              </div>
              <ProgressBar value={connected} max={Math.max(1, employees?.length ?? 1)} tone="brand" />
              <p className="mt-1.5 text-[11.5px] text-gray-400">Nhân viên chưa kết nối sẽ không nhận được thông báo phân ca.</p>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                <span className="font-semibold text-gray-700">Nhân viên đã xác nhận ca</span>
                <span className="tnum font-bold text-ink">{stats?.confirmedAssignments ?? 0}/{stats?.totalAssignments ?? 0}</span>
              </div>
              <ProgressBar value={stats?.confirmedAssignments ?? 0} max={Math.max(1, stats?.totalAssignments ?? 1)} tone="green" />
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-[12px] leading-relaxed text-gray-500">
              Thông báo gửi qua Zalo có <b>cơ chế thử lại 3 lần</b> và khóa chống trùng — xem chi tiết tại trang Thông báo.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Headline({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
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

export { parseISO, toISODate };
