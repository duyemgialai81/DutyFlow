import { CalendarDays, Clock3, Info, Sparkles } from "lucide-react";
import { useShifts } from "../hooks/useDutySchedule";
import { shiftMeta, Skeleton } from "../components/ui";
import { cx } from "../lib/utils";

/** Trục 0h–24h: vị trí theo % của ca trong ngày */
function shiftPos(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const left = ((sh + sm / 60) / 24) * 100;
  let duration = (eh + em / 60) - (sh + sm / 60);
  if (duration <= 0) duration += 24; // ca qua đêm
  const width = (duration / 24) * 100;
  return { left, width };
}

export function ShiftsPage() {
  const { data: shifts, isLoading } = useShifts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[26px] font-bold tracking-tight text-ink">Ca trực</h2>
            {shifts && shifts.length > 0 && (
              <span className="tnum rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-bold text-brand-700">
                {shifts.length} khung ca
              </span>
            )}
          </div>
          <p className="mt-1 text-[13.5px] text-sub">
            Khung giờ trực cố định của hệ thống — áp dụng đồng bộ cho phân lịch tự động và phân ca thủ công.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="stagger grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
          {(shifts ?? []).map((s) => {
            const meta = shiftMeta(s.code);
            const pos = shiftPos(s.startTime, s.endTime);
            const [sh, sm] = s.startTime.split(":").map(Number);
            const [eh, em] = s.endTime.split(":").map(Number);
            let hours = (eh + em / 60) - (sh + sm / 60);
            if (hours <= 0) hours += 24;
            const hoursDisplay = Number.isInteger(hours) ? hours : hours.toFixed(1);

            return (
              <div
                key={s.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-edge bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
              >
                {/* Top vibrant color bar */}
                <div className={cx("absolute inset-x-0 top-0 h-1.5 transition-all duration-200", meta.bar)} />

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform duration-200 group-hover:scale-105", meta.chipBg, meta.border)}>
                        <Clock3 className={cx("h-5 w-5", meta.textColor)} />
                      </span>
                      <div>
                        <h3 className="text-[15.5px] font-bold text-ink">{s.name}</h3>
                        <span className={cx("inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider", meta.badgeBg)}>
                          {s.code}
                        </span>
                      </div>
                    </div>

                    <span className={cx("tnum rounded-lg border px-2.5 py-1 text-[12px] font-bold shadow-xs", meta.chipBg, meta.border, meta.textColor)}>
                      {hoursDisplay} giờ
                    </span>
                  </div>

                  {/* Time Display */}
                  <div className="mt-4 flex items-baseline gap-2">
                    <p className="tnum font-mono text-[24px] font-bold tracking-tight text-ink">
                      {s.startTime}
                      <span className="mx-1.5 text-gray-300 font-normal">—</span>
                      {s.endTime}
                    </p>
                  </div>

                  {/* 24h Visual Timeline */}
                  <div className="mt-3.5">
                    <div className="relative h-3 w-full overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 p-0.5">
                      <span
                        className={cx("absolute inset-y-0.5 rounded-full shadow-xs transition-all", meta.bar)}
                        style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                      />
                    </div>
                    <div className="tnum mt-1.5 flex justify-between font-mono text-[10px] font-medium text-sub">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                </div>

                {/* Description Footer */}
                <div className="mt-4 border-t border-edgesoft pt-3 text-[12.5px] leading-relaxed text-sub">
                  {s.description ? `${s.description}.` : "Ca trực tiêu chuẩn trong hệ thống phân công."}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Card */}
      <div className="anim-rise flex items-start gap-3.5 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-5 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-brand-600">
          <Info className="h-5 w-5" />
        </div>
        <div className="text-[13px] leading-relaxed text-gray-700">
          <p className="font-bold text-ink">Nguyên tắc xếp ca và phân bổ giờ trực:</p>
          <p className="mt-1 text-gray-600">
            Mỗi nhân viên được bố trí tối đa <b className="text-ink">10 ca/tháng</b> để đảm bảo sức khỏe và công bằng quyền lợi. Hệ thống tự động kiểm tra trùng lịch và loại bỏ nhân viên đã có lịch nghỉ phép được duyệt.
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[12px] font-medium text-brand-700">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>Để chỉnh sửa giờ bắt đầu/kết thúc ca trực, vui lòng liên hệ quản trị viên cấu hình.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
