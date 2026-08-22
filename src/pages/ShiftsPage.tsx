import { CalendarDays, Clock3, Info } from "lucide-react";
import { useShifts } from "../hooks/useDutySchedule";
import { SHIFT_META, Skeleton } from "../components/ui";

/** Trục 0h–24h: vị trí theo % của ca trong ngày */
function shiftPos(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return { left: ((sh + sm / 60) / 24) * 100, width: ((eh + em / 60 - sh - sm / 60) / 24) * 100 };
}

export function ShiftsPage() {
  const { data: shifts, isLoading } = useShifts();

  return (
    <div className="space-y-5">
      <div className="anim-rise">
        <h2 className="text-[24px] font-bold tracking-tight text-ink">Ca trực</h2>
        <p className="mt-0.5 text-[13.5px] text-sub">Khung giờ trực cố định của hệ thống — dùng chung cho phân lịch thủ công và tự động.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 w-full" />)}</div>
      ) : (
        <div className="stagger grid gap-4 lg:grid-cols-3">
          {(shifts ?? []).map((s) => {
            const meta = SHIFT_META[s.code];
            const pos = shiftPos(s.startTime, s.endTime);
            const hours = Number(s.endTime.slice(0, 2)) - Number(s.startTime.slice(0, 2));
            return (
              <div key={s.id} className="rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${meta.chipBg}`}>
                      <Clock3 className={`h-4.5 w-4.5 ${meta.dot.replace("bg-", "text-")}`} />
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold text-ink">{s.name}</span>
                      <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{s.code}</span>
                    </span>
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[11.5px] font-bold text-gray-600">{hours} giờ</span>
                </div>

                <p className="tnum mt-4 font-mono text-[22px] font-bold tracking-tight text-ink">
                  {s.startTime} <span className="text-gray-300">—</span> {s.endTime}
                </p>

                {/* 24h timeline */}
                <div className="mt-4">
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <span className={`absolute inset-y-0 rounded-full ${meta.bar}`} style={{ left: `${pos.left}%`, width: `${pos.width}%` }} />
                  </div>
                  <div className="tnum mt-1 flex justify-between font-mono text-[9.5px] font-medium text-gray-400">
                    <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span>
                  </div>
                </div>

                <p className="mt-3.5 border-t border-edgesoft pt-3 text-[12.5px] leading-relaxed text-gray-500">{s.description}.</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="anim-rise flex items-start gap-3 rounded-[14px] border border-blue-100 bg-blue-50/50 px-4.5 py-4">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-600" />
        <div className="text-[13px] leading-relaxed text-gray-600">
          <b className="text-ink">Quy tắc phân ca:</b> mỗi nhân viên tối đa <b>10 ca/tháng</b> để đảm bảo công bằng;
          nhân viên nghỉ phép hoặc đã có ca trùng khung giờ sẽ tự động bị loại khỏi phân lịch tự động.
          Ca đã <b>khóa</b> không thể chỉnh sửa hay phân công lại.
          <span className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-400">
            <CalendarDays className="h-3.5 w-3.5" /> Thay đổi khung giờ cần quản trị viên cấu hình ở cấp hệ thống.
          </span>
        </div>
      </div>
    </div>
  );
}
