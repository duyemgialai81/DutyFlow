import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, CalendarClock, MapPin, Users, ShieldCheck, Lock, Ban, UserPlus, UserRoundCog,
  Trash2, MessageSquare, History, CheckCircle2, XCircle, Plug, PlugZap,
} from "lucide-react";
import { useScheduleDetail, useScheduleMutations, useEmployees } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import {
  AssignmentStatusPill, Avatar, Button, Card, ConfirmDialog, EmptyState, Modal,
  ScheduleStatusPill, Select, ShiftChip, Skeleton,
} from "../components/ui";
import { cx, fmtDateLong, fmtDateTime } from "../lib/utils";
import type { DutyAssignment } from "../types/duty";

function ZaloBadge({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f2fd] px-2 py-0.5 text-[11.5px] font-bold text-[#1a73c8]">
      <PlugZap className="h-3 w-3" /> Đã kết nối
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-linesoft px-2 py-0.5 text-[11.5px] font-semibold text-muted">
      <Plug className="h-3 w-3" /> Chưa kết nối
    </span>
  );
}

export function DutyScheduleDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { push } = useToast();
  const { data: detail, isLoading } = useScheduleDetail(id ? Number(id) : undefined);
  const { data: employees } = useEmployees();
  const mut = useScheduleMutations();

  const [addOpen, setAddOpen] = useState(params.get("assign") === "1");
  const [replaceFor, setReplaceFor] = useState<DutyAssignment | null>(null);
  const [removeFor, setRemoveFor] = useState<DutyAssignment | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [pick, setPick] = useState<string>("");

  const assignedIds = useMemo(
    () => new Set((detail?.assignments ?? []).filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").map((a) => a.employeeId)),
    [detail],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!detail) {
    return (
      <EmptyState
        title="Không tìm thấy ca trực"
        message="Ca trực có thể đã bị xóa hoặc đường dẫn không đúng."
        action={<Link to="/duty/calendar"><Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Về lịch tổng</Button></Link>}
      />
    );
  }

  const active = detail.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED");
  const editable = isAdmin && (detail.status === "DRAFT" || detail.status === "CONFIRMED");

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      push("success", okMsg);
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const doAdd = () =>
    run(async () => {
      if (!pick) throw new Error("Hãy chọn một nhân viên.");
      await mut.addAssignment.mutateAsync({ scheduleId: detail.id, employeeId: Number(pick) });
      setAddOpen(false); setPick("");
    }, "Đã thêm nhân viên — thông báo Zalo đang được gửi.");

  const doReplace = () =>
    run(async () => {
      if (!pick || !replaceFor) throw new Error("Hãy chọn nhân viên thay thế.");
      await mut.replaceAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: replaceFor.id, employeeId: Number(pick) });
      setReplaceFor(null); setPick("");
    }, "Đã đổi người trực — nhân viên mới đã nhận thông báo Zalo.");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
        <ScheduleStatusPill status={detail.status} />
        <span className="ml-auto text-[12px] text-muted">Tạo bởi <b className="text-inksoft">{detail.createdBy}</b> · {fmtDateTime(detail.createdAt)}</span>
      </div>

      {/* header card */}
      <Card className="anim-rise overflow-hidden">
        <div className="sidebar-grain flex flex-wrap items-center gap-x-8 gap-y-4 bg-pine-950 px-6 py-5 text-pine-100">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pine-300">Ngày trực</div>
            <div className="font-display mt-1 text-2xl font-extrabold text-white">{fmtDateLong(detail.date)}</div>
          </div>
          <div className="h-10 w-px bg-pine-800 max-sm:hidden" />
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 text-[13.5px]">
              <CalendarClock className="h-4 w-4 text-gold-300" />
              <b className="font-mono text-gold-300">{detail.startTime} – {detail.endTime}</b>
              <ShiftChip code={detail.shiftCode} size="sm" />
            </span>
            <span className="flex items-center gap-2 text-[13.5px]"><MapPin className="h-4 w-4 text-gold-300" /> {detail.location}</span>
            <span className="flex items-center gap-2 text-[13.5px]">
              <Users className="h-4 w-4 text-gold-300" />
              <b className={cx("font-mono", active.length < detail.requiredPeople ? "text-gold-300" : "text-ok-100")}>
                {active.length}/{detail.requiredPeople}
              </b> người
            </span>
            {detail.departmentName && (
              <span className="rounded-md bg-pine-800 px-2 py-1 text-[12px] font-bold text-pine-100">{detail.departmentName}</span>
            )}
          </div>
        </div>

        {editable && (
          <div className="flex flex-wrap gap-2 border-t border-linesoft bg-paper/60 px-5 py-3">
            {detail.status === "DRAFT" && (
              <Button size="sm" onClick={() => run(() => mut.confirm.mutateAsync(detail.id), "Đã xác nhận ca trực.")}>
                <ShieldCheck className="h-4 w-4" /> Xác nhận ca
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Thêm nhân viên</Button>
            <Button size="sm" variant="secondary" onClick={() => setLockOpen(true)}><Lock className="h-4 w-4" /> Khóa ca</Button>
            <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}><Ban className="h-4 w-4" /> Hủy ca</Button>
          </div>
        )}
      </Card>

      {/* assignments */}
      <Card className="anim-rise overflow-hidden">
        <div className="flex items-center justify-between border-b border-linesoft px-5 py-3.5">
          <h3 className="font-display text-[15px] font-bold text-ink">Nhân viên trực ({active.length}/{detail.requiredPeople})</h3>
          {active.length < detail.requiredPeople && detail.status !== "CANCELLED" && (
            <span className="rounded-md bg-warn-100 px-2 py-1 text-[11.5px] font-bold text-warn-700">
              Thiếu {detail.requiredPeople - active.length} người
            </span>
          )}
        </div>
        {active.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-line" />
            <p className="text-sm font-semibold text-muted">Chưa có nhân viên nào được phân công.</p>
            {editable && (
              <div className="mt-3 flex justify-center gap-2">
                <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Thêm thủ công</Button>
                <Link to={`/duty/auto-assign?date=${detail.date}&shift=${detail.shiftId}&required=${detail.requiredPeople}`}>
                  <Button size="sm" variant="secondary">Phân tự động</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-linesoft bg-paper/70 text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-bold">Nhân viên</th>
                  <th className="px-3 py-2.5 font-bold">Phòng ban</th>
                  <th className="px-3 py-2.5 font-bold">Trạng thái</th>
                  <th className="px-3 py-2.5 font-bold">Zalo</th>
                  {editable && <th className="px-5 py-2.5 text-right font-bold">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {detail.assignments.filter((a) => a.status !== "CANCELLED").map((a) => (
                  <tr key={a.id} className="border-b border-linesoft transition-colors last:border-0 hover:bg-pine-50/40">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={a.employeeName} size="sm" />
                        <span>
                          <span className="block font-bold text-ink">{a.employeeName}</span>
                          <span className="block font-mono text-[11px] text-muted">{a.employeeCode}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-inksoft">{a.departmentName ?? "—"}</td>
                    <td className="px-3 py-3"><AssignmentStatusPill status={a.status} /></td>
                    <td className="px-3 py-3"><ZaloBadge connected={a.zaloConnected} /></td>
                    {editable && (
                      <td className="px-5 py-3">
                        <span className="flex justify-end gap-1">
                          <button
                            onClick={() => { setReplaceFor(a); setPick(""); }}
                            className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-inksoft transition-colors hover:border-pine-400 hover:text-pine-700"
                          >
                            <UserRoundCog className="mr-1 inline h-3.5 w-3.5" /> Đổi
                          </button>
                          <button
                            onClick={() => setRemoveFor(a)}
                            className="rounded-md border border-line bg-white px-2 py-1.5 text-[12px] font-bold text-danger-600 transition-colors hover:border-danger-600/50 hover:bg-danger-100"
                            aria-label="Gỡ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* history */}
      <Card className="anim-rise p-5">
        <h3 className="font-display flex items-center gap-2 text-[15px] font-bold text-ink">
          <History className="h-4 w-4 text-pine-600" /> Lịch sử thao tác
        </h3>
        {detail.history.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Chưa có thao tác nào được ghi nhận.</p>
        ) : (
          <ul className="mt-3 space-y-0">
            {detail.history.map((h, i) => (
              <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < detail.history.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-line" />}
                <span className={cx(
                  "relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-white shadow",
                  h.action === "CANCEL" ? "bg-danger-600" : h.action.includes("CONFIRM") ? "bg-ok-600" : h.action === "LOCK" ? "bg-ink" : "bg-pine-500",
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink">
                    <b>{actionLabel(h.action)}</b>
                    {h.newValue && <span className="text-inksoft"> → {h.newValue}</span>}
                    {h.oldValue && h.action === "REPLACE" && <span className="text-muted"> (thay cho {h.oldValue})</span>}
                  </p>
                  <p className="text-[11.5px] text-muted">{h.changedBy} · {fmtDateTime(h.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Thêm nhân viên vào ca trực">
        <p className="mb-3 text-[13px] text-muted">Nhân viên nghỉ phép hoặc trùng ca sẽ tự động bị loại. Nhân viên được chọn sẽ nhận thông báo Zalo.</p>
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">— Chọn nhân viên —</option>
          {(employees ?? []).filter((e) => !assignedIds.has(e.id) && e.status === "ACTIVE").map((e) => (
            <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}{e.zaloConnected ? "" : " · chưa kết nối Zalo"}</option>
          ))}
        </Select>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Đóng</Button>
          <Button onClick={doAdd} loading={mut.addAssignment.isPending}><MessageSquare className="h-4 w-4" /> Thêm & gửi Zalo</Button>
        </div>
      </Modal>

      <Modal open={!!replaceFor} onClose={() => setReplaceFor(null)} title={`Đổi người trực — ${replaceFor?.employeeName ?? ""}`}>
        <p className="mb-3 text-[13px] text-muted">Phân công cũ sẽ bị hủy, người mới nhận thông báo Zalo ngay.</p>
        <Select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">— Chọn người thay thế —</option>
          {(employees ?? []).filter((e) => !assignedIds.has(e.id) && e.status === "ACTIVE").map((e) => (
            <option key={e.id} value={e.id}>{e.fullName} · {e.employeeCode}</option>
          ))}
        </Select>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReplaceFor(null)}>Đóng</Button>
          <Button onClick={doReplace} loading={mut.replaceAssignment.isPending}>Đổi người</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeFor}
        onClose={() => setRemoveFor(null)}
        onConfirm={() => run(async () => {
          if (removeFor) await mut.removeAssignment.mutateAsync({ scheduleId: detail.id, assignmentId: removeFor.id });
          setRemoveFor(null);
        }, "Đã gỡ nhân viên khỏi ca trực.")}
        title="Gỡ nhân viên"
        danger
        confirmLabel="Gỡ"
        loading={mut.removeAssignment.isPending}
        message={<span>Xóa <b>{removeFor?.employeeName}</b> khỏi ca trực ngày <b>{detail.date.split("-").reverse().join("/")}</b>?</span>}
      />

      <ConfirmDialog
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        onConfirm={() => run(async () => { await mut.lock.mutateAsync(detail.id); setLockOpen(false); }, "Đã khóa ca trực — không thể chỉnh sửa hay phân công.")}
        title="Khóa ca trực"
        confirmLabel="Khóa ca"
        loading={mut.lock.isPending}
        message="Sau khi khóa, ca trực không thể chỉnh sửa, thêm/đổi người. Thuật toán phân ca tự động cũng sẽ bỏ qua ca này."
      />

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => run(async () => { await mut.cancel.mutateAsync(detail.id); setCancelOpen(false); push("info", "Thông báo hủy ca đang được gửi qua Zalo."); }, "Đã hủy ca trực.")}
        title="Hủy ca trực"
        danger
        confirmLabel="Hủy ca"
        loading={mut.cancel.isPending}
        message={<span className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" /><span>Toàn bộ nhân viên trong ca sẽ nhận thông báo <b>“❌ Ca trực đã hủy”</b> qua Zalo. Thao tác không thể hoàn tác.</span></span>}
      />
    </div>
  );
}

function actionLabel(a: string): string {
  const map: Record<string, string> = {
    CREATE: "Tạo ca trực", UPDATE: "Cập nhật ca trực", CONFIRM: "Xác nhận ca", LOCK: "Khóa ca",
    CANCEL: "Hủy ca", ASSIGN: "Phân công nhân viên", REPLACE: "Đổi người trực",
    REMOVE_ASSIGN: "Gỡ nhân viên", AUTO_ASSIGN: "Phân ca tự động",
    EMPLOYEE_CONFIRM: "Nhân viên xác nhận", EMPLOYEE_DECLINE: "Nhân viên từ chối",
  };
  return map[a] ?? a;
}

export { CheckCircle2 };
