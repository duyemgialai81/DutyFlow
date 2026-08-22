import { useMemo, useState } from "react";
import {
  Ban, Check, History, Lock, MapPin, Send, Trash2, UserPlus, UserRoundCog, Users, X,
} from "lucide-react";
import {
  AssignmentStatusBadge, Avatar, Button, ConfirmDialog, Drawer, ProgressBar,
  ScheduleStatusBadge, Select, ShiftTag, Skeleton, ZaloBadge,
} from "../ui";
import { useEmployees, useScheduleDetail, useScheduleMutations } from "../../hooks/useDutySchedule";
import { useAuth, useToast } from "../../state/AppProviders";
import { apiErrorMessage } from "../../api/http";
import { cx, fmtDateLong, fmtDateTime, timeAgo } from "../../lib/utils";
import type { DutyAssignment } from "../../types/duty";

export function DetailDrawer({ scheduleId, onClose }: { scheduleId: number | null; onClose: () => void }) {
  const { isAdmin, user } = useAuth();
  const { push } = useToast();
  const { data: detail, isLoading } = useScheduleDetail(scheduleId ?? undefined);
  const { data: employees } = useEmployees();
  const mut = useScheduleMutations();

  const [addMode, setAddMode] = useState(false);
  const [pick, setPick] = useState("");
  const [replaceFor, setReplaceFor] = useState<DutyAssignment | null>(null);
  const [removeFor, setRemoveFor] = useState<DutyAssignment | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const active = useMemo(
    () => (detail?.assignments ?? []).filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED"),
    [detail],
  );
  const assignedIds = useMemo(() => new Set(active.map((a) => a.employeeId)), [active]);
  const myAssignment = detail?.assignments.find(
    (a) => a.employeeId === user.employeeId && (a.status === "ASSIGNED" || a.status === "CONFIRMED"),
  );

  const editable = isAdmin && !!detail && (detail.status === "DRAFT" || detail.status === "CONFIRMED");

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try { await fn(); push("success", okMsg); }
    catch (err) { push("error", apiErrorMessage(err)); }
  };

  if (!scheduleId) return null;

  return (
    <>
      <Drawer
        open={!!scheduleId}
        onClose={onClose}
        title="Chi tiết ca trực"
        subtitle={detail ? `${fmtDateLong(detail.date)} · tạo bởi ${detail.createdBy}` : undefined}
        width={480}
        footer={
          detail && editable ? (
            <>
              {detail.status === "DRAFT" && (
                <Button variant="secondary" onClick={() => run(() => mut.confirm.mutateAsync(detail.id), "Đã xác nhận ca trực.")}>
                  <Check className="h-4 w-4" /> Xác nhận
                </Button>
              )}
              <Button variant="secondary" onClick={() => setLockOpen(true)}><Lock className="h-4 w-4" /> Khóa ca</Button>
              <Button variant="dangerSoft" onClick={() => setCancelOpen(true)}><Ban className="h-4 w-4" /> Hủy ca</Button>
            </>
          ) : detail && myAssignment?.status === "ASSIGNED" && !isAdmin ? (
            <>
              <Button variant="secondary" onClick={() => run(() => mut.declineAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: myAssignment.id }), "Đã từ chối ca trực.")}>
                <X className="h-4 w-4" /> Từ chối
              </Button>
              <Button onClick={() => run(() => mut.confirmAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: myAssignment.id }), "Bạn đã xác nhận ca trực.")}>
                <Check className="h-4 w-4" /> Xác nhận ca
              </Button>
            </>
          ) : undefined
        }
      >
        {isLoading || !detail ? (
          <div className="space-y-3 px-6 py-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="px-6 py-5">
            {/* summary */}
            <div className="rounded-xl border border-edge bg-gray-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <ShiftTag code={detail.shiftCode} />
                <ScheduleStatusBadge status={detail.status} />
                <span className="ml-auto tnum font-mono text-[13px] font-bold text-ink">{detail.startTime} — {detail.endTime}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" /> {detail.location}
                {detail.departmentName && <span className="rounded-md bg-gray-200/60 px-2 py-0.5 text-[11.5px] font-semibold text-gray-600">{detail.departmentName}</span>}
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold">
                  <span className="flex items-center gap-1.5 text-gray-600"><Users className="h-3.5 w-3.5 text-gray-400" /> Nhân sự</span>
                  <span className={cx("tnum", active.length < detail.requiredPeople ? "text-red-600" : "text-green-600")}>
                    {active.length}/{detail.requiredPeople}
                    {active.length < detail.requiredPeople ? ` · thiếu ${detail.requiredPeople - active.length}` : " · đủ"}
                  </span>
                </div>
                <ProgressBar
                  value={active.length}
                  max={detail.requiredPeople}
                  tone={active.length >= detail.requiredPeople ? "green" : "red"}
                />
              </div>
            </div>

            {/* assignees */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-ink">Nhân viên trong ca</h3>
                {editable && !addMode && (
                  <button onClick={() => { setAddMode(true); setPick(""); }} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-brand-600 transition-colors hover:bg-blue-50">
                    <UserPlus className="h-3.5 w-3.5" /> Thêm
                  </button>
                )}
              </div>

              {addMode && (
                <div className="anim-rise mb-3 flex gap-2">
                  <Select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1">
                    <option value="">— Chọn nhân viên —</option>
                    {(employees ?? []).filter((e) => !assignedIds.has(e.id) && e.status === "ACTIVE").map((e) => (
                      <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>
                    ))}
                  </Select>
                  <Button
                    size="sm" className="h-10"
                    loading={mut.addAssignment.isPending}
                    onClick={() => run(async () => {
                      if (!pick) throw new Error("Hãy chọn một nhân viên.");
                      await mut.addAssignment.mutateAsync({ scheduleId: detail.id, employeeId: Number(pick) });
                      setAddMode(false); setPick("");
                    }, "Đã thêm nhân viên — thông báo Zalo đang được gửi.")}
                  >
                    Thêm
                  </Button>
                  <Button variant="ghost" size="sm" className="h-10" onClick={() => setAddMode(false)}>Hủy</Button>
                </div>
              )}

              {active.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center">
                  <Users className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                  <p className="text-[13px] font-semibold text-gray-600">Chưa có nhân viên nào</p>
                  <p className="mt-0.5 text-[12px] text-gray-400">Thêm thủ công hoặc dùng phân lịch tự động.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {detail.assignments.filter((a) => a.status !== "CANCELLED").map((a) => (
                    <li key={a.id} className="group flex items-center gap-3 rounded-xl border border-edge bg-surface p-3 transition-all duration-150 hover:border-gray-300 hover:shadow-[var(--shadow-card)]">
                      <Avatar name={a.employeeName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-ink">{a.employeeName}</p>
                        <p className="truncate text-[11.5px] text-gray-400">{a.employeeCode}{a.departmentName ? ` · ${a.departmentName}` : ""}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <AssignmentStatusBadge status={a.status} />
                          <ZaloBadge connected={a.zaloConnected} size="sm" />
                        </div>
                      </div>
                      {editable && a.status !== "CANCELLED" && (
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                          {replaceFor?.id === a.id ? (
                            <Select
                              value={pick}
                              onChange={(e) => setPick(e.target.value)}
                              className="h-8 w-40 text-[12px]"
                              autoFocus
                            >
                              <option value="">Người thay thế...</option>
                              {(employees ?? []).filter((e) => !assignedIds.has(e.id) && e.status === "ACTIVE").map((e) => (
                                <option key={e.id} value={e.id}>{e.fullName}</option>
                              ))}
                            </Select>
                          ) : (
                            <button
                              onClick={() => { setReplaceFor(a); setPick(""); }}
                              className="rounded-lg border border-edge bg-white p-1.5 text-gray-500 transition-colors hover:border-brand-600/40 hover:text-brand-600"
                              aria-label={`Đổi người cho ${a.employeeName}`}
                            >
                              <UserRoundCog className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setRemoveFor(a)}
                            className="rounded-lg border border-edge bg-white p-1.5 text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                            aria-label={`Gỡ ${a.employeeName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {replaceFor?.id === a.id && (
                        <Button
                          size="xs"
                          loading={mut.replaceAssignment.isPending}
                          onClick={() => run(async () => {
                            if (!pick) throw new Error("Chọn người thay thế.");
                            await mut.replaceAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: a.id, employeeId: Number(pick) });
                            setReplaceFor(null); setPick("");
                          }, "Đã đổi người trực — nhân viên mới đã nhận thông báo Zalo.")}
                        >
                          Đổi
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* remind */}
            {editable && active.length > 0 && (
              <Button
                variant="secondary" className="mt-4 w-full"
                onClick={() => push("success", `Đã gửi nhắc nhở đến ${active.length} nhân viên qua Zalo.`)}
              >
                <Send className="h-4 w-4 text-brand-600" /> Gửi nhắc nhở qua Zalo
              </Button>
            )}

            {/* history */}
            {detail.history.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink">
                  <History className="h-4 w-4 text-gray-400" /> Lịch sử thao tác
                </h3>
                <ul className="space-y-2.5 border-l-2 border-edgesoft pl-4">
                  {detail.history.slice(0, 8).map((h) => (
                    <li key={h.id} className="relative">
                      <span className={cx(
                        "absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                        h.action === "CANCEL" ? "bg-red-400" : h.action.includes("CONFIRM") ? "bg-green-500" : h.action === "LOCK" ? "bg-gray-400" : "bg-brand-500",
                      )} />
                      <p className="text-[12.5px] leading-snug text-gray-700">
                        <b>{actionLabel(h.action)}</b>
                        {h.newValue && <span className="text-gray-500"> → {h.newValue}</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{h.changedBy} · {timeAgo(h.createdAt)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-gray-400">Cập nhật gần nhất {fmtDateTime(detail.createdAt)}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* confirm dialogs */}
      {detail && (
        <>
          <ConfirmDialog
            open={lockOpen}
            onClose={() => setLockOpen(false)}
            onConfirm={() => run(async () => { await mut.lock.mutateAsync(detail.id); setLockOpen(false); }, "Đã khóa ca trực — không thể chỉnh sửa hay phân công.")}
            title="Khóa lịch trực?"
            confirmLabel="Khóa lịch"
            loading={mut.lock.isPending}
            message={<span>Sau khi khóa, lịch sẽ <b>không thể chỉnh sửa</b>, thêm hay đổi người. Thuật toán phân ca tự động cũng bỏ qua ca này.</span>}
          />
          <ConfirmDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            onConfirm={() => run(async () => { await mut.cancel.mutateAsync(detail.id); setCancelOpen(false); }, "Đã hủy ca trực — thông báo đang gửi qua Zalo.")}
            title="Hủy ca trực?"
            danger
            confirmLabel="Hủy ca"
            loading={mut.cancel.isPending}
            message={<span>Toàn bộ <b>{active.length} nhân viên</b> trong ca sẽ nhận thông báo “Ca trực đã hủy” qua Zalo. Thao tác không thể hoàn tác.</span>}
          />
          <ConfirmDialog
            open={!!removeFor}
            onClose={() => setRemoveFor(null)}
            onConfirm={() => run(async () => {
              if (removeFor) await mut.removeAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: removeFor.id });
              setRemoveFor(null);
            }, "Đã gỡ nhân viên khỏi ca trực.")}
            title="Gỡ nhân viên?"
            danger
            confirmLabel="Gỡ"
            loading={mut.removeAssignment.isPending}
            message={<span>Xóa <b>{removeFor?.employeeName}</b> khỏi ca trực {detail.shiftName.toLowerCase()} ngày <b>{detail.date.split("-").reverse().join("/")}</b>?</span>}
          />
        </>
      )}
    </>
  );
}

function actionLabel(a: string): string {
  const map: Record<string, string> = {
    CREATE: "Tạo ca trực", UPDATE: "Cập nhật ca trực", CONFIRM: "Xác nhận ca", LOCK: "Khóa ca",
    CANCEL: "Hủy ca", ASSIGN: "Phân công", REPLACE: "Đổi người trực", REMOVE_ASSIGN: "Gỡ nhân viên",
    EMPLOYEE_CONFIRM: "Nhân viên xác nhận", EMPLOYEE_DECLINE: "Nhân viên từ chối", SWAP_REQUEST: "Yêu cầu đổi ca",
  };
  return map[a] ?? a;
}
