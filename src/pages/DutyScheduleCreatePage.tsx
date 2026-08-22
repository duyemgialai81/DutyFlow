import { useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CalendarPlus, FileDown, ShieldCheck, Wand2, AlertCircle } from "lucide-react";
import { useDepartments, useShifts, useScheduleMutations } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { Button, Card, EmptyState, Field, inputCls, Select } from "../components/ui";
import { todayISO } from "../lib/utils";

const schema = z.object({
  date: z.string().min(1, "Chọn ngày trực"),
  shiftId: z.string().min(1, "Chọn ca trực"),
  requiredPeople: z.string().min(1, "Nhập số người cần").refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 8,
    "Số người cần từ 1–8.",
  ),
  location: z.string().trim().min(2, "Nhập địa điểm trực"),
  departmentId: z.string(),
}).refine((v) => v.date >= todayISO(), { message: "Không được chọn ngày trong quá khứ.", path: ["date"] });

type FormValues = z.infer<typeof schema>;

export function DutyScheduleCreatePage() {
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: shifts } = useShifts();
  const { data: departments } = useDepartments();
  const mut = useScheduleMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: params.get("date") && params.get("date")! >= todayISO() ? params.get("date")! : todayISO(),
      shiftId: params.get("shift") ?? "",
      requiredPeople: params.get("required") ?? "2",
      location: "Văn phòng A",
      departmentId: "",
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = form;
  const watchShift = watch("shiftId");
  const watchDate = watch("date");

  const shift = useMemo(() => shifts?.find((s) => s.id === Number(watchShift)), [shifts, watchShift]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Cần quyền quản trị viên"
        message="Chỉ quản trị viên mới có thể tạo ca trực. Hãy đổi phiên đăng nhập ở góc phải trên."
        action={<Link to="/duty/calendar"><Button variant="secondary">Về lịch tổng</Button></Link>}
      />
    );
  }

  const submit = async (values: FormValues, status: "DRAFT" | "CONFIRMED", thenAssign = false) => {
    try {
      const created = await mut.create.mutateAsync({
        date: values.date,
        shiftId: Number(values.shiftId),
        requiredPeople: Number(values.requiredPeople),
        location: values.location.trim(),
        departmentId: values.departmentId === "" ? null : Number(values.departmentId),
        status,
      });
      if (status === "DRAFT") {
        push("success", `Đã lưu nháp ca trực ngày ${values.date.split("-").reverse().join("/")}.`);
        navigate(`/duty-schedules/${created.id}`);
      } else if (thenAssign) {
        push("success", "Đã tạo ca trực. Chọn nhân viên để phân công thủ công.");
        navigate(`/duty-schedules/${created.id}?assign=1`);
      } else {
        push("success", "Đã tạo và xác nhận ca trực. Chuyển sang phân ca tự động để điền nhân sự.");
        navigate(`/duty/auto-assign?date=${values.date}&shift=${values.shiftId}&required=${values.requiredPeople}`);
      }
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_300px]">
      <Card className="anim-rise p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-100 text-pine-700">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">Tạo ca trực mới</h2>
            <p className="text-[13px] text-muted">Thông tin ca trực sẽ được kiểm tra trùng lịch trước khi lưu.</p>
          </div>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => submit(v, "CONFIRMED"))}>
          <Field label="Ngày trực" error={errors.date?.message}>
            <input type="date" min={todayISO()} className={inputCls} {...register("date")} />
          </Field>
          <Field label="Ca trực" error={errors.shiftId?.message}>
            <Select {...register("shiftId")}>
              <option value="">— Chọn ca —</option>
              {(shifts ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.startTime}–{s.endTime}</option>
              ))}
            </Select>
          </Field>
          <Field label="Số người cần" error={errors.requiredPeople?.message} hint="1–8 người cho mỗi ca">
            <input type="number" min={1} max={8} className={inputCls} {...register("requiredPeople")} />
          </Field>
          <Field label="Phòng ban" hint="Để trống nếu cần người toàn công ty">
            <Select {...register("departmentId")}>
              <option value="">Toàn công ty</option>
              {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Địa điểm trực" error={errors.location?.message}>
              <input className={inputCls} placeholder="Ví dụ: Văn phòng A" {...register("location")} />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-linesoft pt-4 sm:col-span-2">
            <Button type="submit" loading={isSubmitting && mut.create.isPending}>
              <ShieldCheck className="h-4 w-4" /> Xác nhận
            </Button>
            <Button
              type="button" variant="secondary"
              loading={isSubmitting}
              onClick={handleSubmit((v) => submit(v, "CONFIRMED", true))}
            >
              Phân công thủ công <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={handleSubmit((v) => submit(v, "DRAFT"))}>
              <FileDown className="h-4 w-4" /> Lưu nháp
            </Button>
            <Link to={`/duty/auto-assign${watchDate ? `?date=${watchDate}${watchShift ? `&shift=${watchShift}` : ""}` : ""}`} className="ml-auto">
              <Button type="button" variant="warn">
                <Wand2 className="h-4 w-4" /> Phân lịch tự động
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      {/* panel preview */}
      <div className="space-y-4">
        <Card className="anim-rise bg-pine-950 p-5 text-pine-100">
          <h3 className="font-display text-[15px] font-bold text-white">Xem trước ca trực</h3>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-pine-300">Ngày</dt>
              <dd className="font-bold text-white">{watchDate ? watchDate.split("-").reverse().join("/") : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-pine-300">Thời gian</dt>
              <dd className="font-mono font-bold text-gold-300">{shift ? `${shift.startTime} – ${shift.endTime}` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-pine-300">Nhân sự</dt>
              <dd className="font-bold text-white">{watch("requiredPeople") || 0} người</dd>
            </div>
          </dl>
        </Card>
        <Card className="anim-rise p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink"><AlertCircle className="h-4 w-4 text-warn-600" /> Quy tắc nghiệp vụ</h3>
          <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-snug text-inksoft">
            <li>• Không tạo ca trùng ngày + khung giờ.</li>
            <li>• Không chọn ngày trong quá khứ.</li>
            <li>• Ca đã <b>KHÓA</b> không thể sửa hoặc phân công.</li>
            <li>• Nhân viên được báo qua Zalo ngay khi phân công.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
