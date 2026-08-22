import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, CalendarDays, MapPin, ArrowRightLeft, ShieldCheck, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { useMyDuty, useScheduleMutations } from "../hooks/useDutySchedule";
import { useAuth, useToast } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { AssignmentStatusPill, Button, Card, ConfirmDialog, EmptyState, ShiftChip, Skeleton, ScheduleStatusPill } from "../components/ui";
import { cx, fmtDateLong, todayISO } from "../lib/utils";
import type { MyDutyItem } from "../types/duty";

export function MyDutySchedulePage() {
  const { user } = useAuth();
  const { push } = useToast();
  const { data, isLoading } = useMyDuty();
  const mut = useScheduleMutations();
  const [declineFor, setDeclineFor] = useState<MyDutyItem | null>(null);
  const [swapFor, setSwapFor] = useState<MyDutyItem | null>(null);

  const today = todayISO();
  const items = useMemo(() => data?.items ?? [], [data]);
  const upcoming = items.filter((i) => i.schedule.date >= today);
  const past = items.filter((i) => i.schedule.date < today).slice(0, 4);

  if (!user.employeeId) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-7 w-7" />}
        title="Tài khoản quản trị"
        message="Quản trị viên không có ca trực cá nhân. Hãy chuyển sang phiên nhân viên (góc phải trên) để trải nghiệm luồng xác nhận ca."
        action={<Link to="/duty/calendar"><Button variant="secondary">Xem lịch tổng</Button></Link>}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const respond = async (item: MyDutyItem, accept: boolean) => {
    try {
      if (accept) {
        await mut.confirmAssignment.mutateAsync({ scheduleId: item.schedule.id, assignmentId: item.assignmentId });
        push("success", "Bạn đã xác nhận ca trực. Quản trị viên sẽ thấy trạng thái mới.");
      } else {
        await mut.declineAssignment.mutateAsync({ scheduleId: item.schedule.id, assignmentId: item.assignmentId });
        push("info", "Đã từ chối ca trực. Quản trị viên sẽ phân công người khác.");
      }
      setDeclineFor(null);
    } catch (err) {
      push("error", apiErrorMessage(err));
    }
  };

  const DutyCard = ({ item, compact }: { item: MyDutyItem; compact?: boolean }) => {
    const s = item.schedule;
    const canRespond = item.assignmentStatus === "ASSIGNED" && s.date >= today;
    return (
      <Card className={cx("anim-rise overflow-hidden transition-all hover:shadow-[var(--shadow-pop)]", compact && "opacity-80")}>
        <div className="flex flex-wrap items-stretch">
          <div className={cx(
            "flex w-[86px] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-linesoft px-3 py-4",
            s.shiftCode === "MORNING" && "bg-gold-100/70",
            s.shiftCode === "AFTERNOON" && "bg-pine-50",
            s.shiftCode === "NIGHT" && "bg-night-100/70",
          )}>
            <span className="font-display text-[26px] font-extrabold leading-none text-ink">{s.date.slice(8, 10)}</span>
            <span className="text-[11px] font-bold uppercase text-muted">Th{Number(s.date.slice(5, 7))}/{s.date.slice(2, 4)}</span>
          </div>
          <div className="min-w-0 flex-1 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[15px] font-extrabold text-ink">{fmtDateLong(s.date)}</span>
              <ScheduleStatusPill status={s.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-inksoft">
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-muted" /><b className="font-mono">{s.startTime} – {s.endTime}</b></span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted" />{s.location}</span>
              <ShiftChip code={s.shiftCode} size="sm" />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <AssignmentStatusPill status={item.assignmentStatus} />
              {canRespond && !compact && (
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => respond(item, true)} loading={mut.confirmAssignment.isPending}>
                    <Check className="h-4 w-4" /> Xác nhận
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDeclineFor(item)}>
                    <X className="h-4 w-4 text-danger-600" /> Từ chối
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSwapFor(item)}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Yêu cầu đổi ca
                  </Button>
                </span>
              )}
              <Link to={`/duty-schedules/${s.id}`} className="ml-auto text-[12px] font-bold text-pine-700 transition-colors hover:text-pine-900">
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Chào {user.name.split(" ").slice(-2).join(" ")} 👋</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">
            Bạn có <b className="text-pine-700">{upcoming.filter((i) => i.assignmentStatus === "ASSIGNED").length} ca chờ xác nhận</b> và{" "}
            <b className="text-ink">{upcoming.length} ca sắp tới</b>.
          </p>
        </div>
        <Link to="/day-offs"><Button variant="secondary" size="sm">Đăng ký nghỉ</Button></Link>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="Chưa có ca trực nào"
          message="Khi quản trị viên phân ca, bạn sẽ thấy ở đây và nhận thông báo Zalo."
        />
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-muted">Sắp tới · {upcoming.length}</h3>
          <div className="stagger space-y-3">
            {upcoming.map((i) => <DutyCard key={i.assignmentId} item={i} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-muted">Gần đây</h3>
          <div className="space-y-3">
            {past.map((i) => <DutyCard key={i.assignmentId} item={i} compact />)}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!declineFor}
        onClose={() => setDeclineFor(null)}
        onConfirm={() => declineFor && respond(declineFor, false)}
        title="Từ chối ca trực"
        danger
        confirmLabel="Từ chối ca"
        loading={mut.declineAssignment.isPending}
        message={declineFor ? (
          <span>Bạn sẽ từ chối ca <b>{declineFor.schedule.shiftName}</b> ngày <b>{fmtDateLong(declineFor.schedule.date)}</b>. Quản trị viên sẽ phân công người khác thay thế.</span>
        ) : null}
      />

      <ConfirmDialog
        open={!!swapFor}
        onClose={() => setSwapFor(null)}
        onConfirm={() => { setSwapFor(null); push("success", "Đã gửi yêu cầu đổi ca tới quản trị viên."); }}
        title="Yêu cầu đổi ca"
        confirmLabel="Gửi yêu cầu"
        message={swapFor ? (
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" />
            <span>Yêu cầu đổi ca <b>{swapFor.schedule.shiftName}</b> ngày <b>{fmtDateLong(swapFor.schedule.date)}</b> sẽ được gửi đến quản trị viên xem xét.</span>
          </span>
        ) : null}
      />
    </div>
  );
}

export { XCircle };
