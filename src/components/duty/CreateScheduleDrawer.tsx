import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CalendarDays, Check } from "lucide-react";
import { Button, Drawer, Field, inputCls, Select, SHIFT_META, Stepper } from "../ui";
import { useDepartments, useEmployees, useShifts } from "../../hooks/useDutySchedule";
import { dutyScheduleApi } from "../../api/dutySchedule.api";
import { apiErrorMessage, apiClient } from "../../api/http";
import { useToast } from "../../state/AppProviders";
import { cx, todayISO } from "../../lib/utils";

const schema = z.object({
  date: z.string().min(1, "Chọn ngày trực"),
  shiftId: z.string().min(1, "Chọn ca trực"),
  requiredPeople: z.string().min(1, "Nhập số người"),
  location: z.string().trim().min(2, "Nhập địa điểm trực"),
  departmentId: z.string(),
}).refine((v) => !v.date || v.date >= todayISO(), { message: "Không được chọn ngày trong quá khứ.", path: ["date"] });
type FormValues = z.infer<typeof schema>;

export function CreateScheduleDrawer({ open, onClose, presetDate, onCreated }: {
  open: boolean; onClose: () => void; presetDate?: string; onCreated: (id: number) => void;
}) {
  const { push } = useToast();
  const { data: shifts } = useShifts();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: presetDate ?? todayISO(), shiftId: "", requiredPeople: "2", location: "Văn phòng A", departmentId: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ date: presetDate ?? todayISO(), shiftId: "", requiredPeople: "2", location: "Văn phòng A", departmentId: "" });
      setSelectedEmployees([]);
      setServerError(null);
    }
  }, [open, presetDate, reset]);

  const watchShift = watch("shiftId");
  const watchReq = watch("requiredPeople");
  const required = Number(watchReq) || 0;
  const pool = useMemo(
    () => (employees ?? []).filter((e) => e.status === "ACTIVE"),
    [employees],
  );

  const submit = async (v: FormValues) => {
    setServerError(null);
    setBusy(true);
    try {
      const created = await dutyScheduleApi.create({
        date: v.date,
        shiftId: Number(v.shiftId),
        requiredPeople: Number(v.requiredPeople),
        location: v.location.trim(),
        departmentId: v.departmentId === "" ? null : Number(v.departmentId),
        status: "CONFIRMED",
      });
      let added = 0;
      for (const empId of selectedEmployees.slice(0, Number(v.requiredPeople))) {
        try {
          await apiClient.post(`/api/duty-schedules/${created.id}/assignments`, { employeeId: empId });
          added++;
        } catch { /* nhân viên trùng/nghỉ — bỏ qua, báo tổng */ }
      }
      push("success", added > 0
        ? `Đã tạo lịch trực và phân công ${added} nhân viên. Thông báo Zalo đang được gửi.`
        : "Đã tạo lịch trực thành công.");
      onClose();
      onCreated(created.id);
    } catch (err) {
      setServerError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Tạo lịch trực"
      subtitle="Ca trực sẽ được kiểm tra trùng lịch trước khi lưu"
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={handleSubmit(submit)} loading={busy}>Tạo lịch</Button>
        </>
      }
    >
      <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit(submit)}>
        {serverError && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[12.5px] font-medium leading-snug text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
          </div>
        )}

        <Field label="Ngày trực" error={errors.date?.message}>
          <input type="date" min={todayISO()} className={inputCls} {...register("date")} />
        </Field>

        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-700">Ca trực</span>
          <div className="grid grid-cols-3 gap-2">
            {(shifts ?? []).map((s) => {
              const active = watchShift === String(s.id);
              const meta = SHIFT_META[s.code];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => reset((f) => ({ ...f, shiftId: String(s.id) }), { keepErrors: true })}
                  className={cx(
                    "relative rounded-[10px] border p-3 text-left transition-all duration-150",
                    active ? "border-brand-600 bg-blue-50/60 shadow-[0_0_0_1px_var(--color-brand-600)]" : "border-edge bg-surface hover:border-gray-300",
                  )}
                  aria-pressed={active}
                >
                  <span className={cx("mb-2 block h-1 w-6 rounded-full", meta.bar)} />
                  <span className="block text-[12.5px] font-bold text-ink">{s.name}</span>
                  <span className="tnum block font-mono text-[11px] text-gray-500">{s.startTime}–{s.endTime}</span>
                  {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-brand-600" />}
                </button>
              );
            })}
          </div>
          {errors.shiftId && <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{errors.shiftId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Số người cần" error={errors.requiredPeople?.message}>
            <Controller
              control={control}
              name="requiredPeople"
              render={({ field }) => (
                <Stepper value={Number(field.value) || 1} onChange={(v) => field.onChange(String(v))} min={1} max={8} />
              )}
            />
          </Field>
          <Field label="Phòng ban" hint="Tuỳ chọn">
            <Select {...register("departmentId")}>
              <option value="">Toàn công ty</option>
              {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="Địa điểm trực" error={errors.location?.message}>
          <input className={inputCls} placeholder="Ví dụ: Văn phòng A" {...register("location")} />
        </Field>

        <div>
          <span className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-semibold text-gray-700">
            Nhân viên <span className="text-[11px] font-normal text-faint">Tuỳ chọn · {selectedEmployees.length}/{required} đã chọn</span>
          </span>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-[10px] border border-edge bg-gray-50/50 p-1.5">
            {pool.map((e) => {
              const checked = selectedEmployees.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedEmployees((prev) => checked ? prev.filter((x) => x !== e.id) : [...prev, e.id])}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                    checked ? "bg-blue-50" : "hover:bg-gray-100",
                  )}
                  aria-pressed={checked}
                >
                  <span className={cx(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                    checked ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white",
                  )}>
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{e.fullName}</span>
                    <span className="block text-[11px] text-gray-400">{e.employeeCode} · {e.departmentName ?? "—"}</span>
                  </span>
                  {e.zaloConnected
                    ? <span className="rounded bg-blue-50 px-1.5 py-px text-[10px] font-bold text-blue-600">Zalo</span>
                    : <span className="rounded bg-gray-100 px-1.5 py-px text-[10px] font-medium text-gray-400">Chưa kết nối</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-faint">
            <CalendarDays className="h-3.5 w-3.5" /> Để trống sẽ dùng “Phân lịch tự động” để điền nhân sự.
          </p>
        </div>
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Drawer>
  );
}
