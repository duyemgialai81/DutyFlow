import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Palmtree, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useDayOffs } from "../hooks/useDutySchedule";
import { dayOffApi } from "../api/dayOff.api";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { Avatar, Button, Card, ConfirmDialog, EmptyState, Field, inputCls, Skeleton } from "../components/ui";
import { cx, fmtDate, todayISO } from "../lib/utils";
import { queryClient } from "../state/AppProviders";
import { qk } from "../hooks/useDutySchedule";

const schema = z.object({
  date: z.string().min(1, "Chọn ngày nghỉ"),
  reason: z.string().trim().min(3, "Nêu lý do ngắn gọn"),
}).refine((v) => v.date >= todayISO(), { message: "Không đăng ký nghỉ cho ngày quá khứ.", path: ["date"] });
type FormValues = z.infer<typeof schema>;

export function DayOffsPage() {
  const { user, isAdmin } = useAuth();
  const { push } = useToast();
  const { data, isLoading } = useDayOffs();
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO(), reason: "" },
  });

  const create = async (v: FormValues) => {
    try {
      await dayOffApi.create({ date: v.date, reason: v.reason.trim() });
      push("success", `Đã gửi đăng ký nghỉ ngày ${fmtDate(v.date)}. Quản trị viên sẽ phê duyệt.`);
      reset({ date: todayISO(), reason: "" });
      await queryClient.invalidateQueries({ queryKey: qk.dayOffs() });
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const setStatus = async (id: number, status: "APPROVED" | "REJECTED") => {
    setBusy(id);
    try {
      await dayOffApi.updateStatus(id, status);
      push("success", status === "APPROVED" ? "Đã duyệt đăng ký nghỉ — thuật toán phân ca sẽ loại nhân viên này." : "Đã từ chối đăng ký nghỉ.");
      await queryClient.invalidateQueries({ queryKey: qk.dayOffs() });
    } catch (err) {
      push("error", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const doRemove = async () => {
    if (removeId == null) return;
    setBusy(removeId);
    try {
      await dayOffApi.remove(removeId);
      push("success", "Đã xóa đăng ký nghỉ.");
      setRemoveId(null);
      await queryClient.invalidateQueries({ queryKey: qk.dayOffs() });
    } catch (err) {
      push("error", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const list = (data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="anim-rise h-fit p-5 lg:sticky lg:top-20">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-100 text-pine-700"><Palmtree className="h-4.5 w-4.5" /></span>
          <h2 className="font-display text-lg font-extrabold text-ink">Đăng ký nghỉ</h2>
        </div>
        <p className="mb-4 text-[12.5px] leading-snug text-muted">
          Nhân viên đang nghỉ (đã duyệt hoặc chờ duyệt) sẽ bị <b className="text-inksoft">loại khỏi phân ca tự động</b> trong ngày đó.
        </p>
        <form className="space-y-3.5" onSubmit={handleSubmit(create)}>
          <Field label="Ngày nghỉ" error={errors.date?.message}>
            <input type="date" min={todayISO()} className={inputCls} {...register("date")} />
          </Field>
          <Field label="Lý do" error={errors.reason?.message}>
            <input className={inputCls} placeholder="Ví dụ: Việc gia đình" {...register("reason")} />
          </Field>
          <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Gửi đăng ký</Button>
          <p className="text-[11.5px] text-muted">Đăng ký với tên: <b className="text-inksoft">{user.name}</b></p>
        </form>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Palmtree className="h-7 w-7" />}
            title="Chưa có đăng ký nghỉ"
            message={isAdmin ? "Nhân viên chưa gửi đăng ký nghỉ nào." : "Bạn chưa đăng ký nghỉ ngày nào."}
          />
        ) : (
          <div className="stagger space-y-2.5">
            {list.map((d) => (
              <Card key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar name={d.employeeName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-ink">
                    {isAdmin && <span>{d.employeeName} · </span>}
                    {fmtDate(d.date)}
                  </p>
                  <p className="truncate text-[12px] text-muted">{d.reason}</p>
                </div>
                <span className={cx(
                  "rounded-md px-2 py-1 text-[11px] font-bold uppercase",
                  d.status === "APPROVED" && "bg-ok-100 text-ok-700",
                  d.status === "PENDING" && "bg-warn-100 text-warn-700",
                  d.status === "REJECTED" && "bg-danger-100 text-danger-700",
                )}>
                  {d.status === "APPROVED" ? "Đã duyệt" : d.status === "PENDING" ? "Chờ duyệt" : "Từ chối"}
                </span>
                {isAdmin && d.status === "PENDING" && (
                  <span className="flex gap-1.5">
                    <button
                      onClick={() => setStatus(d.id, "APPROVED")}
                      disabled={busy === d.id}
                      className="rounded-lg border border-ok-600/30 bg-ok-100 px-2.5 py-1.5 text-[12px] font-bold text-ok-700 transition-colors hover:bg-ok-100/60 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setStatus(d.id, "REJECTED")}
                      disabled={busy === d.id}
                      className="rounded-lg border border-danger-600/30 bg-danger-100 px-2.5 py-1.5 text-[12px] font-bold text-danger-700 transition-colors hover:bg-danger-100/60 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setRemoveId(d.id)}
                  className="rounded-lg border border-line bg-white p-2 text-muted transition-colors hover:border-danger-600/40 hover:text-danger-600"
                  aria-label="Xóa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removeId != null}
        onClose={() => setRemoveId(null)}
        onConfirm={doRemove}
        title="Xóa đăng ký nghỉ"
        danger
        confirmLabel="Xóa"
        loading={busy != null}
        message="Sau khi xóa, nhân viên sẽ có thể được phân ca trở lại vào ngày này."
      />
    </div>
  );
}
