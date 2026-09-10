import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronRight, MapPin, RefreshCw, Sparkles, Users } from "lucide-react";
import { Button, DatePicker, Field, inputCls, Modal, Select, shiftMeta, Skeleton, Stepper } from "../ui";
import { useAutoAssignPreview, useAutoAssignConfirm } from "../../hooks/useAutoAssign";
import { useDepartments, useShifts } from "../../hooks/useDutySchedule";
import { useToast } from "../../state/AppProviders";
import { apiErrorMessage } from "../../api/http";
import { cx, fmtDate, todayISO, addDays } from "../../lib/utils";
import type { AutoAssignPayload } from "../../api/dutySchedule.api";

const STEPS = [
  { n: "01", label: "Thời gian" },
  { n: "02", label: "Phòng ban" },
  { n: "03", label: "Ca trực" },
  { n: "04", label: "Nhân sự" },
  { n: "05", label: "Xem trước" },
];

export interface AutoAssignPreset {
  date?: string; shiftId?: number; requiredPeople?: number; location?: string; departmentId?: number | null;
}

export function AutoAssignModal({ open, onClose, preset }: {
  open: boolean; onClose: () => void;
  preset?: AutoAssignPreset;
}) {
  const { push } = useToast();
  const { data: shifts } = useShifts();
  const { data: departments } = useDepartments();

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 6));
  const [departmentId, setDepartmentId] = useState<string>("");
  const [shiftId, setShiftId] = useState<string>("");
  const [requiredPeople, setRequiredPeople] = useState(2);
  const [location, setLocation] = useState("Văn phòng A");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewPayload, setPreviewPayload] = useState<AutoAssignPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(0);
      setStartDate(preset?.date && preset.date >= todayISO() ? preset.date : todayISO());
      setEndDate(preset?.date && preset.date >= todayISO() ? addDays(preset.date, 6) : addDays(todayISO(), 6));
      setDepartmentId(preset?.departmentId ? String(preset.departmentId) : "");
      setShiftId(preset?.shiftId ? String(preset.shiftId) : "");
      setRequiredPeople(preset?.requiredPeople ?? 2);
      setLocation(preset?.location ?? "Văn phòng A");
      setPreviewPayload(null);
      setErr(null);
    }
  }, [open, preset]);

  const days = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    const d = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    return Math.min(d, 62);
  }, [startDate, endDate]);

  const payload: AutoAssignPayload = useMemo(() => ({
    startDate, endDate, shiftId: Number(shiftId),
    departmentId: departmentId === "" ? null : Number(departmentId),
    requiredPeople, location: location.trim() || "Văn phòng A",
  }), [startDate, endDate, shiftId, departmentId, requiredPeople, location]);

  const preview = useAutoAssignPreview(step === 4 ? previewPayload : null);
  const confirm = useAutoAssignConfirm();

  const canNext = () => {
    setErr(null);
    if (step === 0) {
      if (!startDate || !endDate) { setErr("Chọn đầy đủ ngày bắt đầu và kết thúc."); return false; }
      if (endDate < startDate) { setErr("Ngày kết thúc phải sau ngày bắt đầu."); return false; }
      if (startDate < todayISO()) { setErr("Không phân lịch cho ngày trong quá khứ."); return false; }
      if (days > 62) { setErr("Khoảng thời gian tối đa 62 ngày."); return false; }
    }
    if (step === 2 && !shiftId) { setErr("Chọn một ca trực."); return false; }
    return true;
  };

  const goPreview = () => {
    if (!canNext()) return;
    setPreviewPayload({ ...payload });
    setPreviewKey((k) => k + 1);
    setStep(4);
  };

  const doConfirm = async () => {
    try {
      const r = await confirm.mutateAsync(previewPayload!);
      push("success", `Đã phân công ${r.totals.assigned} lượt trực cho ${r.totals.schedules} ca.`);
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#2563eb", "#3b82f6", "#16a34a", "#f59e0b"],
          disableForReducedMotion: true,
        });
      }
      onClose();
    } catch (e) {
      push("error", apiErrorMessage(e));
    }
  };

  const pv = preview.data;
  const coverage = pv && pv.totals.slots > 0 ? Math.round((pv.totals.assigned / pv.totals.slots) * 100) : 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Phân lịch tự động"
      subtitle="Thuật toán ưu tiên người ít ca, loại nhân viên nghỉ phép và trùng ca"
      size="xl"
      footer={
        <>
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          )}
          <span className="flex-1" />
          {step < 4 ? (
            <Button onClick={() => { if (step === 3) goPreview(); else if (canNext()) setStep((s) => s + 1); }}>
              {step === 3 ? "Xem trước kết quả" : "Tiếp theo"} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { setPreviewKey((k) => k + 1); preview.refetch(); }} disabled={preview.isFetching}>
                <RefreshCw className={cx("h-4 w-4", preview.isFetching && "animate-spin")} /> Phân lịch lại
              </Button>
              <Button onClick={doConfirm} loading={confirm.isPending} disabled={preview.isFetching}>
                <Check className="h-4 w-4" /> Xác nhận & lưu
              </Button>
            </>
          )}
        </>
      }
    >
      {/* progress */}
      <div className="mb-6 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-1 last:flex-none">
            <button
              onClick={() => i < step && setStep(i)}
              className={cx(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-all duration-200",
                i === step ? "bg-blue-50" : i < step ? "cursor-pointer hover:bg-gray-50" : "opacity-50",
              )}
              aria-label={`Bước ${s.n}: ${s.label}`}
            >
              <span className={cx(
                "flex h-6.5 w-6.5 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200",
                i < step ? "bg-green-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500",
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className={cx("hidden text-[12px] font-semibold sm:block", i === step ? "text-brand-700" : "text-gray-500")}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className={cx("h-px flex-1", i < step ? "bg-green-300" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      {err && (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
        </div>
      )}

      {/* STEP 1: thời gian */}
      {step === 0 && (
        <div className="anim-rise grid gap-4 sm:grid-cols-2">
          <Field label="Ngày bắt đầu">
            <DatePicker min={todayISO()} value={startDate} onChange={setStartDate} placeholder="Chọn ngày bắt đầu" />
          </Field>
          <Field label="Ngày kết thúc">
            <DatePicker min={startDate} value={endDate} onChange={setEndDate} placeholder="Chọn ngày kết thúc" />
          </Field>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-600 sm:col-span-2">
            Khoảng <b className="text-ink">{days} ngày</b> · từ {fmtDate(startDate)} đến {fmtDate(endDate)} — hệ thống bỏ qua ca đã khóa và ngày đã đủ người.
          </div>
        </div>
      )}

      {/* STEP 2: phòng ban */}
      {step === 1 && (
        <div className="anim-rise">
          <p className="mb-3 text-[13px] text-gray-600">Chọn phòng ban cần phân ca, hoặc để tất cả nhân viên cùng tham gia.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <DeptChip active={departmentId === ""} label="Toàn công ty" hint="Tất cả phòng ban" onClick={() => setDepartmentId("")} />
            {(departments ?? []).map((d) => (
              <DeptChip key={d.id} active={departmentId === String(d.id)} label={d.name} hint={`Phòng ${d.name.toLowerCase()}`} onClick={() => setDepartmentId(String(d.id))} />
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: ca */}
      {step === 2 && (
        <div className="anim-rise grid gap-3 sm:grid-cols-3">
          {(shifts ?? []).map((s) => {
            const meta = shiftMeta(s.code);
            const active = shiftId === String(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setShiftId(String(s.id))}
                className={cx(
                  "relative rounded-xl border p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
                  active ? "border-brand-600 bg-blue-50/60 shadow-[0_0_0_1px_var(--color-brand-600)]" : "border-edge bg-surface",
                )}
                aria-pressed={active}
              >
                <span className={cx("mb-3 block h-1.5 w-8 rounded-full", meta.bar)} />
                <span className="block text-[14px] font-bold text-ink">{s.name}</span>
                <span className="tnum mt-0.5 block font-mono text-[12.5px] text-gray-500">{s.startTime} — {s.endTime}</span>
                <span className="mt-2 block text-[11.5px] leading-snug text-gray-400">{s.description}</span>
                {active && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"><Check className="h-3 w-3" /></span>}
              </button>
            );
          })}
        </div>
      )}

      {/* STEP 4: nhân sự */}
      {step === 3 && (
        <div className="anim-rise grid gap-4 sm:grid-cols-2">
          <Field label="Số người mỗi ca">
            <Stepper value={requiredPeople} onChange={setRequiredPeople} min={1} max={8} />
          </Field>
          <Field label="Địa điểm trực">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Văn phòng A" />
          </Field>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-600 sm:col-span-2">
            Dự kiến tạo <b className="text-ink">{days} ca</b> × <b className="text-ink">{requiredPeople} người</b> ={" "}
            <b className="text-brand-700">{days * requiredPeople} lượt phân công</b>. Bước tiếp theo sẽ xem trước kết quả — chưa lưu vào hệ thống.
          </div>
        </div>
      )}

      {/* STEP 5: preview */}
      {step === 4 && (
        <div className="anim-rise">
          {preview.isFetching || !pv ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <>
              {/* summary */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SummaryStat label="Ca trực" value={String(pv.totals.schedules)} />
                <SummaryStat label="Phân công" value={`${pv.totals.assigned}/${pv.totals.slots}`} />
                <SummaryStat label="Coverage" value={`${coverage}%`} tone={coverage >= 90 ? "green" : coverage >= 60 ? "amber" : "red"} />
                <SummaryStat label="Cảnh báo" value={String(pv.warnings.filter((w) => w.level === "WARN").length)} tone={pv.warnings.some((w) => w.level === "WARN") ? "amber" : undefined} />
              </div>

              {/* warnings */}
              {pv.warnings.filter((w) => w.level === "WARN").slice(0, 3).map((w, i) => (
                <div key={i} className="mb-2 flex items-start gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-medium text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> {w.message}
                </div>
              ))}

              {/* list */}
              <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-1">
                {pv.assignments.filter((it) => !it.existing || it.employees.length > 0).map((it, i) => {
                  const missing = it.requiredPeople - it.employees.length;
                  return (
                    <div key={i} className="rounded-xl border border-edge bg-surface p-3.5 transition-colors hover:border-gray-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-gray-100 leading-none">
                          <span className="text-[13px] font-bold text-ink">{it.date.slice(8, 10)}</span>
                          <span className="text-[8.5px] font-bold uppercase text-gray-400">T{Number(it.date.slice(5, 7))}</span>
                        </span>
                        <span className="text-[13px] font-bold text-ink">{fmtDate(it.date)}</span>
                        <span className="text-[12px] font-semibold text-gray-500">{it.shiftName}</span>
                        <span className="tnum font-mono text-[11.5px] text-gray-400">{it.startTime} — {it.endTime}</span>
                        {it.existing && <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-bold text-gray-500">Ca hiện có</span>}
                        <span className="ml-auto">
                          {missing > 0 ? (
                            <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                              <AlertTriangle className="h-3 w-3" /> Thiếu {missing}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
                              <Check className="h-3 w-3" /> Đủ {it.employees.length}/{it.requiredPeople}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {it.employees.map((e) => (
                          <span key={e.id} className="flex items-center gap-1.5 rounded-full border border-edge bg-gray-50 py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold text-gray-700">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700">
                              {e.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()}
                            </span>
                            {e.name}
                            <span className="tnum text-[10px] font-medium text-gray-400">{e.currentLoad} ca</span>
                          </span>
                        ))}
                        {it.employees.length === 0 && <span className="text-[12px] italic text-gray-400">Không có nhân viên khả dụng</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {pv.warnings.filter((w) => w.level === "INFO").length > 0 && (
                <details className="mt-3 rounded-[10px] border border-edge bg-gray-50/60 px-3.5 py-2.5">
                  <summary className="cursor-pointer text-[12px] font-semibold text-gray-500">
                    {pv.warnings.filter((w) => w.level === "INFO").length} ghi chú của thuật toán
                  </summary>
                  <ul className="mt-2 space-y-1 text-[12px] text-gray-500">
                    {pv.warnings.filter((w) => w.level === "INFO").map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5"><ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />{w.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function DeptChip({ active, label, hint, onClick }: { active: boolean; label: string; hint: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
        active ? "border-brand-600 bg-blue-50/60 shadow-[0_0_0_1px_var(--color-brand-600)]" : "border-edge bg-surface hover:border-gray-300",
      )}
      aria-pressed={active}
    >
      <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500")}>
        <Users className="h-4.5 w-4.5" />
      </span>
      <span>
        <span className="block text-[13.5px] font-bold text-ink">{label}</span>
        <span className="block text-[11.5px] text-gray-400">{hint}</span>
      </span>
      {active && <Check className="ml-auto h-4 w-4 text-brand-600" />}
    </button>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "red" }) {
  return (
    <div className="rounded-xl border border-edge bg-gray-50/60 px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={cx(
        "tnum mt-0.5 text-[20px] font-bold",
        tone === "green" && "text-green-600", tone === "amber" && "text-amber-600", tone === "red" && "text-red-600",
        !tone && "text-ink",
      )}>{value}</p>
    </div>
  );
}

export { MapPin, Sparkles };
