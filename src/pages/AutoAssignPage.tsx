import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, RotateCcw, CheckCheck, ArrowLeft, AlertTriangle, Info, Users, Save } from "lucide-react";
import { useAutoAssignPreview, useAutoAssignConfirm } from "../hooks/useAutoAssign";
import { useDepartments, useShifts } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import type { AutoAssignPayload } from "../api/dutySchedule.api";
import { apiErrorMessage } from "../api/http";
import { Avatar, Button, Card, EmptyState, Field, inputCls, Select, ShiftChip, Skeleton, Stat } from "../components/ui";
import { addDays, cx, fmtDateLong, todayISO } from "../lib/utils";

const schema = z.object({
  startDate: z.string().min(1, "Chọn ngày bắt đầu"),
  endDate: z.string().min(1, "Chọn ngày kết thúc"),
  shiftId: z.string().min(1, "Chọn ca trực"),
  departmentId: z.string(),
  requiredPeople: z.string().min(1, "Nhập số người/ca").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5,
    "Số người/ca từ 1–5.",
  ),
  location: z.string().trim().min(2, "Nhập địa điểm"),
}).refine((v) => !v.endDate || !v.startDate || v.endDate >= v.startDate, {
  message: "Ngày kết thúc phải sau ngày bắt đầu.", path: ["endDate"],
}).refine((v) => !v.startDate || v.startDate >= todayISO(), {
  message: "Không được phân lịch cho ngày trong quá khứ.", path: ["startDate"],
});

type FormValues = z.infer<typeof schema>;

export function AutoAssignPage() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: shifts } = useShifts();
  const { data: departments } = useDepartments();

  const [payload, setPayload] = useState<AutoAssignPayload | null>(null);
  const [runId, setRunId] = useState(0);
  const preview = useAutoAssignPreview(payload);
  const confirm = useAutoAssignConfirm();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: params.get("date") ?? todayISO(),
      endDate: params.get("date") ? addDays(params.get("date")!, 6) : addDays(todayISO(), 6),
      shiftId: params.get("shift") ?? "1",
      departmentId: "",
      requiredPeople: params.get("required") ?? "2",
      location: "Văn phòng A",
    },
  });

  const rangeDays = useMemo(() => {
    const s = watch("startDate"); const e = watch("endDate");
    if (!s || !e || e < s) return 0;
    return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;
  }, [watch("startDate"), watch("endDate")]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Cần quyền quản trị viên"
        message="Thuật toán phân ca tự động chỉ khả dụng cho quản trị viên."
        action={<Link to="/duty/calendar"><Button variant="secondary">Về lịch tổng</Button></Link>}
      />
    );
  }

  const runPreview = (v: FormValues) => {
    setRunId((x) => x + 1);
    setPayload({
      startDate: v.startDate, endDate: v.endDate, shiftId: Number(v.shiftId),
      departmentId: v.departmentId === "" ? null : Number(v.departmentId),
      requiredPeople: Number(v.requiredPeople), location: v.location.trim(),
    });
  };

  const doConfirm = async () => {
    if (!payload) return;
    try {
      const res = await confirm.mutateAsync(payload);
      push("success", `Đã lưu ${res.created} ca trực và gửi thông báo Zalo cho nhân viên được phân công.`);
      setPayload(null);
      navigate("/duty/calendar");
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const data = preview.data;
  const warnCount = data?.warnings.filter((w) => w.level === "WARN").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <Card className="anim-rise h-fit p-6 lg:sticky lg:top-20">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700">
              <Wand2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink">Phân ca tự động</h2>
              <p className="text-[13px] text-muted">Thuật toán ưu tiên người ít ca hơn</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(runPreview)}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Từ ngày" error={errors.startDate?.message}>
                <input type="date" min={todayISO()} className={inputCls} {...register("startDate")} />
              </Field>
              <Field label="Đến ngày" error={errors.endDate?.message}>
                <input type="date" className={inputCls} {...register("endDate")} />
              </Field>
            </div>
            <Field label="Ca trực" error={errors.shiftId?.message}>
              <Select {...register("shiftId")}>
                {(shifts ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.startTime}–{s.endTime}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Số người/ca" error={errors.requiredPeople?.message}>
                <input type="number" min={1} max={5} className={inputCls} {...register("requiredPeople")} />
              </Field>
              <Field label="Phòng ban">
                <Select {...register("departmentId")}>
                  <option value="">Toàn công ty</option>
                  {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Địa điểm" error={errors.location?.message}>
              <input className={inputCls} {...register("location")} />
            </Field>

            <p className="rounded-lg bg-pine-50 px-3 py-2 text-[12px] font-semibold text-pine-800">
              Khoảng đã chọn: <b>{rangeDays} ngày</b> · cần <b>{rangeDays * Number(watch("requiredPeople") || 0)} lượt người</b>
            </p>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" loading={preview.isFetching}>
                <Wand2 className="h-4 w-4" /> Phân lịch
              </Button>
              {payload && (
                <Button type="button" variant="secondary" onClick={handleSubmit(runPreview)}>
                  <RotateCcw className="h-4 w-4" /> Chạy lại
                </Button>
              )}
            </div>
            <p className="text-[11.5px] leading-snug text-muted">
              Bước này chỉ <b>preview</b> — chưa ghi database. Loại nhân viên nghỉ phép, trùng ca, vượt giới hạn {`10`} ca/tháng; không ghi đè ca đã khóa.
            </p>
          </form>
        </Card>

        {/* Kết quả */}
        <div className="space-y-4">
          {!payload && (
            <EmptyState
              icon={<Wand2 className="h-7 w-7" />}
              title="Chưa chạy phân lịch"
              message="Chọn khoảng thời gian, ca trực và số người mỗi ca rồi bấm “Phân lịch” để xem trước kết quả."
            />
          )}

          {payload && preview.isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="mb-3 h-5 w-44" />
                  <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-9 flex-1" /></div>
                </Card>
              ))}
            </div>
          )}

          {payload && data && !preview.isLoading && (
            <>
              <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Ca tạo mới" value={data.totals.schedules} tone="dark" />
                <Stat label="Vị trí cần" value={data.totals.slots} />
                <Stat label="Đã phân" value={data.totals.assigned} tone="ok" />
                <Stat label="Còn thiếu" value={data.totals.missing} tone={data.totals.missing > 0 ? "warn" : "default"} />
              </div>

              {data.warnings.length > 0 && (
                <Card className={cx("anim-rise border-l-4 p-4", warnCount > 0 ? "border-l-warn-600 bg-warn-100/50" : "border-l-info-600 bg-info-100/40")}>
                  <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    <AlertTriangle className={cx("h-4 w-4", warnCount > 0 ? "text-warn-600" : "text-info-600")} />
                    Cảnh báo ({data.warnings.length})
                  </h3>
                  <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {data.warnings.slice(0, 12).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] leading-snug text-inksoft">
                        {w.level === "WARN"
                          ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-600" />
                          : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info-600" />}
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <div key={runId} className="stagger space-y-3">
                {data.assignments.map((item) => (
                  <Card key={`${item.date}-${item.shiftId}`} className="overflow-hidden transition-shadow hover:shadow-[var(--shadow-pop)]">
                    <div className="flex flex-wrap items-center gap-3 border-b border-linesoft bg-paper/70 px-4 py-3">
                      <span className="font-display text-[15px] font-extrabold text-ink">{fmtDateLong(item.date)}</span>
                      <ShiftChip code={shifts?.find((s) => s.id === item.shiftId)?.code ?? "MORNING"} time={`${item.startTime}–${item.endTime}`} size="sm" />
                      <span className="text-[12px] text-muted">📍 {item.location}</span>
                      <span className={cx(
                        "ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-bold",
                        item.employees.length >= item.requiredPeople ? "bg-ok-100 text-ok-700" : "bg-warn-100 text-warn-700",
                      )}>
                        <Users className="h-3.5 w-3.5" /> {item.employees.length}/{item.requiredPeople}
                        {item.existing && <span className="ml-1 rounded bg-linesoft px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">Ca đã có</span>}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      {item.employees.length === 0 ? (
                        <p className="text-[13px] italic text-muted">Không còn nhân viên khả dụng cho ngày này.</p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {item.employees.map((e) => (
                            <li key={e.id} className="flex items-center gap-2.5 rounded-lg border border-linesoft bg-white px-3 py-2">
                              <Avatar name={e.name} size="sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold text-ink">{e.name}</span>
                                <span className="block text-[11px] text-muted">
                                  Tháng này: <b className={cx(e.currentLoad >= 8 ? "text-warn-600" : "text-pine-700")}>{e.currentLoad} ca</b>
                                </span>
                              </span>
                              <span className="rounded-md bg-pine-50 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-pine-700">#{e.id}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-[var(--shadow-pop)] backdrop-blur">
                <p className="text-[12.5px] text-muted">
                  <b className="text-ink">{data.totals.assigned}/{data.totals.slots}</b> vị trí được phân ·
                  nhân viên sẽ nhận thông báo <b className="text-pine-700">Zalo</b> ngay khi lưu.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setPayload(null)}><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
                  <Button variant="secondary" onClick={handleSubmit(runPreview)}><RotateCcw className="h-4 w-4" /> Phân lịch lại</Button>
                  <Button onClick={doConfirm} loading={confirm.isPending} disabled={data.totals.assigned === 0}>
                    <CheckCheck className="h-4 w-4" /> Xác nhận & lưu
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-center text-[11.5px] text-muted">
        <Save className="mr-1 inline h-3.5 w-3.5" />
        Backend: <code className="rounded bg-linesoft px-1 font-mono">POST /api/duty-schedules/auto-assign/preview</code> → <code className="rounded bg-linesoft px-1 font-mono">/confirm</code> · thuật toán tại <code className="rounded bg-linesoft px-1 font-mono">ScheduleAlgorithmService.java</code>
      </p>
    </div>
  );
}
