import { useMemo, useState } from "react";
import { Mail, Phone, Search, Users } from "lucide-react";
import { useEmployees } from "../hooks/useDutySchedule";
import { Avatar, EmptyState, ProgressBar, Skeleton, ZaloBadge } from "../components/ui";
import { cx } from "../lib/utils";

export function UsersPage() {
  const { data: employees, isLoading } = useEmployees();
  const [term, setTerm] = useState("");
  const [dept, setDept] = useState<number | "all">("all");

  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (employees ?? []).filter((e) =>
      (dept === "all" || e.departmentId === dept) &&
      (!t || e.fullName.toLowerCase().includes(t) || e.employeeCode.toLowerCase().includes(t) || (e.departmentName ?? "").toLowerCase().includes(t)),
    );
  }, [employees, term, dept]);

  const depts = useMemo(
    () => Array.from(new Map((employees ?? []).map((e) => [e.departmentId, e.departmentName])).entries()),
    [employees],
  );
  const maxLoad = Math.max(10, ...(employees ?? []).map((e) => e.shiftCountMonth ?? 0));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Nhân viên</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">{employees?.length ?? 0} nhân sự · tải trọng ca trong tháng</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="h-10 w-56 rounded-[10px] border border-edge bg-surface pl-9 pr-3 text-[13px] transition-all focus:w-64 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="Tìm nhân viên"
          />
        </div>
        <div className="flex gap-1 rounded-[10px] bg-gray-100 p-0.5">
          <button
            onClick={() => setDept("all")}
            className={cx("rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-all", dept === "all" ? "bg-surface text-gray-900 shadow-sm" : "text-gray-500")}
          >
            Tất cả
          </button>
          {depts.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setDept(id)}
              className={cx("rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-all", dept === id ? "bg-surface text-gray-900 shadow-sm" : "text-gray-500")}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
          <EmptyState icon={<Users className="h-7 w-7" />} title="Không tìm thấy nhân viên" message={`Không có kết quả cho “${term}”.`} />
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <div key={e.id} className="rounded-[14px] border border-edge bg-surface p-4.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-center gap-3">
                <Avatar name={e.fullName} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-ink">{e.fullName}</p>
                  <p className="text-[12px] text-gray-400">{e.employeeCode} · {e.departmentName ?? "—"}</p>
                </div>
                <ZaloBadge connected={!!e.zaloConnected} size="sm" />
              </div>
              <div className="mt-3.5">
                <div className="mb-1 flex items-baseline justify-between text-[12px]">
                  <span className="font-semibold text-gray-500">Ca trong tháng</span>
                  <span className={cx("tnum font-bold", (e.shiftCountMonth ?? 0) >= 9 ? "text-amber-600" : "text-ink")}>{e.shiftCountMonth ?? 0}/10</span>
                </div>
                <ProgressBar value={e.shiftCountMonth ?? 0} max={maxLoad} tone={(e.shiftCountMonth ?? 0) >= 9 ? "amber" : "brand"} />
              </div>
              <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-edgesoft pt-3 text-[12px] text-gray-500">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-300" />{e.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-300" />{e.phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
