import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarOff, Check, ChevronRight, Palmtree, Plus, Repeat, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { swapRequestApi } from "../api/swapRequest.api";
import { dayOffApi } from "../api/dayOff.api";
import { useAuth, useToast, queryClient } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { Avatar, Button, ConfirmDialog, DatePicker, DayOffStatusBadge, EmptyState, Field, inputCls, Segmented, Skeleton } from "../components/ui";
import { cx, fmtDate, fmtDateLong, timeAgo, todayISO } from "../lib/utils";
import type { DayOffStatus } from "../types/duty";

const offSchema = z.object({
  date: z.string().min(1, "Chọn ngày nghỉ"),
  reason: z.string().trim().min(3, "Nêu lý do ngắn gọn"),
}).refine((v) => !v.date || v.date >= todayISO(), { message: "Không đăng ký nghỉ cho ngày quá khứ.", path: ["date"] });
type OffValues = z.infer<typeof offSchema>;

const SWAP_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  APPROVED: { label: "Đã duyệt", cls: "bg-green-50 text-green-700 border-green-100" },
  REJECTED: { label: "Từ chối", cls: "bg-red-50 text-red-600 border-red-100" },
  CANCELLED: { label: "Đã hủy", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function RequestsPage() {
  const { isAdmin, isLeader } = useAuth();
  const canApprove = isAdmin || isLeader;
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") === "off" ? "off" : "swap") as "swap" | "off";
  const setTab = (t: "swap" | "off") => {
    setSearchParams(t === "swap" ? {} : { tab: t }, { replace: true });
  };
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removeOff, setRemoveOff] = useState<number | null>(null);

  const swaps = useQuery({ queryKey: ["swaps"], queryFn: swapRequestApi.list });
  const offs = useQuery({ queryKey: ["dayoffs"], queryFn: dayOffApi.list });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<OffValues>({
    resolver: zodResolver(offSchema),
    defaultValues: { date: todayISO(), reason: "" },
  });

  const pendingSwaps = useMemo(() => (swaps.data ?? []).filter((s) => s.status === "PENDING"), [swaps.data]);

  const actSwap = async (id: number, status: "APPROVED" | "REJECTED" | "CANCELLED") => {
    setBusyId(id);
    try {
      await swapRequestApi.updateStatus(id, status);
      push("success", status === "APPROVED" ? "Đã duyệt yêu cầu đổi ca." : status === "REJECTED" ? "Đã từ chối yêu cầu." : "Đã hủy yêu cầu.");
      await queryClient.invalidateQueries({ queryKey: ["swaps"] });
    } catch (err) { push("error", apiErrorMessage(err)); }
    finally { setBusyId(null); }
  };

  const createOff = async (v: OffValues) => {
    try {
      await dayOffApi.create({ date: v.date, reason: v.reason.trim() });
      push("success", `Đã gửi đăng ký nghỉ ngày ${fmtDate(v.date)}.`);
      reset({ date: todayISO(), reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["dayoffs"] });
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const actOff = async (id: number, status: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    try {
      await dayOffApi.updateStatus(id, status);
      push("success", status === "APPROVED" ? "Đã duyệt — nhân viên sẽ bị loại khỏi phân ca ngày này." : "Đã từ chối đăng ký nghỉ.");
      await queryClient.invalidateQueries({ queryKey: ["dayoffs"] });
    } catch (err) { push("error", apiErrorMessage(err)); }
    finally { setBusyId(null); }
  };

  const doRemoveOff = async () => {
    if (removeOff == null) return;
    try {
      await dayOffApi.remove(removeOff);
      push("success", "Đã xóa đăng ký nghỉ.");
      setRemoveOff(null);
      await queryClient.invalidateQueries({ queryKey: ["dayoffs"] });
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Đổi ca & Nghỉ phép</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">
            {canApprove ? `${pendingSwaps.length} yêu cầu đổi ca chờ duyệt` : "Gửi yêu cầu đổi ca hoặc đăng ký nghỉ"}
          </p>
        </div>
        <Segmented
          options={[{ value: "swap", label: "Đổi ca" }, { value: "off", label: "Nghỉ phép" }]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "swap" && (
        <div className="space-y-3">
          {!canApprove && (
            <div className="anim-rise flex items-start gap-3 rounded-[14px] border border-blue-100 bg-blue-50/50 px-4 py-3.5 text-[13px] leading-relaxed text-gray-600">
              <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>Yêu cầu đổi ca được gửi từ trang <b className="text-ink">Ca của tôi</b> — chọn ca và bấm “Yêu cầu đổi ca”. Quản trị viên và Tổ trưởng sẽ xem xét tại đây.</span>
            </div>
          )}
          {swaps.isLoading ? (
            <>{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</>
          ) : (swaps.data ?? []).length === 0 ? (
            <div className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
              <EmptyState icon={<Repeat className="h-7 w-7" />} title="Chưa có yêu cầu đổi ca" message="Khi nhân viên muốn đổi ca, yêu cầu sẽ xuất hiện tại đây." />
            </div>
          ) : (
            <div className="stagger space-y-2.5">
              {(swaps.data ?? []).map((s) => {
                const st = SWAP_STATUS[s.status];
                return (
                  <div key={s.id} className="anim-rise flex flex-wrap items-center gap-3 rounded-[14px] border border-edge bg-surface px-4 py-3.5 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-lift)]">
                    <Avatar name={s.employeeName} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-ink">
                        {s.employeeName}
                        <span className="font-medium text-sub"> · {s.departmentName}</span>
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-gray-700">
                        Muốn đổi ca <b>{s.shiftName.toLowerCase()}</b> ngày <b>{fmtDateLong(s.scheduleDate)}</b> (<span className="tnum font-mono font-semibold">{s.startTime}–{s.endTime}</span>, {s.location})
                      </p>
                      <p className="mt-1 text-[12px] italic text-sub">“{s.reason}” · {timeAgo(s.createdAt)}</p>
                    </div>
                    <span className={cx("rounded-md border px-2 py-0.5 text-[11.5px] font-semibold", st.cls)}>{st.label}</span>
                    {canApprove && s.status === "PENDING" && (
                      <span className="flex gap-1.5">
                        <Button size="xs" onClick={() => actSwap(s.id, "APPROVED")} loading={busyId === s.id}><Check className="h-3.5 w-3.5" /> Duyệt</Button>
                        <Button size="xs" variant="dangerSoft" onClick={() => actSwap(s.id, "REJECTED")} disabled={busyId === s.id}><X className="h-3.5 w-3.5" /> Từ chối</Button>
                      </span>
                    )}
                    {!canApprove && s.status === "PENDING" && (
                      <Button size="xs" variant="secondary" onClick={() => actSwap(s.id, "CANCELLED")} disabled={busyId === s.id}>Hủy yêu cầu</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "off" && (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="anim-rise h-fit rounded-[14px] border border-edge bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-20">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-green-50 text-green-600"><Palmtree className="h-4.5 w-4.5" /></span>
              <h3 className="text-[15px] font-bold text-ink">Đăng ký nghỉ</h3>
            </div>
            <p className="mb-4 text-[12px] leading-snug text-sub">Nhân viên nghỉ (đã duyệt hoặc chờ duyệt) sẽ bị loại khỏi phân ca tự động ngày đó.</p>
            <form className="space-y-3.5" onSubmit={handleSubmit(createOff)}>
              <Field label="Ngày nghỉ" error={errors.date?.message}>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      min={todayISO()}
                      placeholder="Chọn ngày nghỉ"
                    />
                  )}
                />
              </Field>
              <Field label="Lý do" error={errors.reason?.message}>
                <input className={inputCls} placeholder="Ví dụ: Việc gia đình" {...register("reason")} />
              </Field>
              <Button type="submit" className="w-full"><Plus className="h-4 w-4" /> Gửi đăng ký</Button>
            </form>
          </div>

          <div className="space-y-2.5">
            {offs.isLoading ? (
              <>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</>
            ) : (offs.data ?? []).length === 0 ? (
              <div className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
                <EmptyState icon={<CalendarOff className="h-7 w-7" />} title="Chưa có đăng ký nghỉ" message={canApprove ? "Nhân viên chưa gửi đăng ký nào." : "Bạn chưa đăng ký nghỉ ngày nào."} />
              </div>
            ) : (
              <div className="stagger space-y-2.5">
                {(offs.data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)).map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-edge bg-surface px-4 py-3 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-lift)]">
                    <Avatar name={d.employeeName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-ink">{canApprove ? `${d.employeeName} · ` : ""}{fmtDate(d.date)}</p>
                      <p className="truncate text-[12px] text-gray-400">{d.reason}</p>
                    </div>
                    <DayOffStatusBadge status={d.status} />
                    {canApprove && d.status === "PENDING" && (
                      <span className="flex gap-1.5">
                        <Button size="xs" onClick={() => actOff(d.id, "APPROVED")} loading={busyId === d.id}><Check className="h-3.5 w-3.5" /> Duyệt</Button>
                        <Button size="xs" variant="dangerSoft" onClick={() => actOff(d.id, "REJECTED")} disabled={busyId === d.id}><X className="h-3.5 w-3.5" /></Button>
                      </span>
                    )}
                    <button
                      onClick={() => setRemoveOff(d.id)}
                      className="rounded-lg border border-edge bg-white p-2 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      aria-label="Xóa đăng ký"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-[10px] px-2 py-1 text-[11.5px] text-gray-400">
              <ChevronRight className="h-3.5 w-3.5" /> Đăng ký nghỉ ảnh hưởng trực tiếp đến kết quả phân lịch tự động.
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeOff != null}
        onClose={() => setRemoveOff(null)}
        onConfirm={doRemoveOff}
        title="Xóa đăng ký nghỉ?"
        danger
        confirmLabel="Xóa"
        message="Sau khi xóa, nhân viên sẽ có thể được phân ca trở lại vào ngày này."
      />
    </div>
  );
}
