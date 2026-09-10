import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRightLeft, Bell, CalendarCheck2, Check, Clock3, Download, MapPin, ShieldCheck, X } from "lucide-react";
import { useMyDuty, useScheduleMutations } from "../hooks/useDutySchedule";
import { swapRequestApi } from "../api/swapRequest.api";
import { useAuth, useToast, queryClient } from "../state/AppProviders";
import { apiErrorMessage } from "../api/http";
import { AssignmentStatusBadge, Button, ConfirmDialog, EmptyState, Modal, ScheduleStatusBadge, ShiftTag, Skeleton } from "../components/ui";
import { SyncCalendarModal } from "../components/duty/SyncCalendarModal";
import { downloadIcsFile, generateIcsCalendar } from "../lib/ical";
import { cx, fmtDateLong, todayISO } from "../lib/utils";
import type { MyDutyItem } from "../types/duty";

export function MyDutySchedulePage() {
  const { user } = useAuth();
  const { push } = useToast();
  const { data, isLoading } = useMyDuty();
  const mut = useScheduleMutations();
  const [declineFor, setDeclineFor] = useState<MyDutyItem | null>(null);
  const [swapFor, setSwapFor] = useState<MyDutyItem | null>(null);
  const [swapReason, setSwapReason] = useState("");
  const [syncOpen, setSyncOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("sync") === "1") {
      setSyncOpen(true);
    }
  }, [searchParams]);

  const today = todayISO();
  const items = useMemo(() => data?.items ?? [], [data]);
  const upcoming = items.filter((i) => i.schedule.date >= today);
  const past = items.filter((i) => i.schedule.date < today).slice(0, 4);
  const pendingCount = upcoming.filter((i) => i.assignmentStatus === "ASSIGNED").length;

  const handleQuickSync = () => {
    if (items.length === 0) {
      push("info", "Bạn chưa có ca trực nào để đồng bộ.");
      return;
    }
    const icsContent = generateIcsCalendar({
      employeeName: user.name,
      employeeCode: user.sub,
      items,
    });
    const filename = `LichTruc_${user.sub || "DutyFlow"}_${user.name.replace(/\s+/g, "_")}.ics`;
    downloadIcsFile(filename, icsContent);
    push("success", "Đã tải file lịch! Bấm 'Thêm tất cả' hoặc 'Lưu' trên điện thoại để hoàn tất cài báo thức.");
  };

  if (!user.employeeId) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-7 w-7" />}
        title="Tài khoản quản trị"
        message="Quản trị viên không có ca trực cá nhân — chuyển sang phiên nhân viên ở góc phải trên để trải nghiệm luồng xác nhận ca."
        action={<Link to="/duty/calendar"><Button variant="secondary">Xem lịch tổng</Button></Link>}
      />
    );
  }

  if (isLoading) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  const respond = async (item: MyDutyItem, accept: boolean) => {
    try {
      if (accept) await mut.confirmAssignment.mutateAsync({ scheduleId: item.schedule.id, assignmentId: item.assignmentId });
      else await mut.declineAssignment.mutateAsync({ scheduleId: item.schedule.id, assignmentId: item.assignmentId });
      push("success", accept ? "Bạn đã xác nhận ca trực." : "Đã từ chối ca trực — quản trị viên sẽ phân người khác.");
      setDeclineFor(null);
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  const sendSwap = async () => {
    if (!swapFor) return;
    try {
      await swapRequestApi.create({ assignmentId: swapFor.assignmentId, reason: swapReason });
      await queryClient.invalidateQueries({ queryKey: ["swaps"] });
      push("success", "Đã gửi yêu cầu đổi ca tới quản trị viên.");
      setSwapFor(null);
      setSwapReason("");
    } catch (err) { push("error", apiErrorMessage(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight text-ink">Ca trực của tôi</h2>
          <p className="mt-0.5 text-[13.5px] text-sub">
            {pendingCount > 0
              ? <>Bạn có <b className="text-brand-700">{pendingCount} ca chờ xác nhận</b> và {upcoming.length} ca sắp tới.</>
              : `Bạn có ${upcoming.length} ca sắp tới.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSyncOpen(true)}
            className="gap-1.5 font-semibold text-brand-700 bg-brand-50/80 border-brand-200/80 hover:bg-brand-100 hover:border-brand-300 shadow-2xs"
          >
            <CalendarCheck2 className="h-4 w-4 text-brand-600" />
            Đồng bộ Lịch điện thoại (.ics)
          </Button>
          <Link to="/requests"><Button variant="secondary" size="sm">Đăng ký nghỉ</Button></Link>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="anim-rise flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white p-4 text-[13px] shadow-sm">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-gray-900 text-[14px]">
                Bật chuông báo thức ca trực trên Điện thoại
              </p>
              <p className="text-[12.5px] text-gray-600 leading-relaxed">
                Tự động reo chuông và hiển thị màn hình khóa trước ca <b>2 tiếng</b> &amp; <b>30 phút</b> (Offline 100%, không cần mạng).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleQuickSync}
              className="font-bold shadow-xs gap-1.5 h-9"
            >
              <Download className="h-4 w-4" /> Bấm để Đồng bộ ngay
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSyncOpen(true)}
              className="text-[12.5px] h-9"
            >
              Xem hướng dẫn chi tiết
            </Button>
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="anim-rise rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<CalendarCheck2 className="h-7 w-7" />}
            title="Chưa có ca trực nào"
            message="Khi quản trị viên phân ca, lịch sẽ hiện ở đây và bạn nhận thông báo Zalo."
          />
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-gray-400">Sắp tới · {upcoming.length}</h3>
          <div className="stagger space-y-3">
            {upcoming.map((i) => {
              const s = i.schedule;
              const canRespond = i.assignmentStatus === "ASSIGNED" && s.date >= today;
              return (
                <div key={i.assignmentId} className="rounded-[14px] border border-edge bg-surface shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <div className="flex items-stretch">
                    <div className={cx(
                      "flex w-[84px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-[14px] border-r border-edgesoft",
                      s.shiftCode === "MORNING" && "bg-amber-50", s.shiftCode === "AFTERNOON" && "bg-blue-50/70", s.shiftCode === "NIGHT" && "bg-gray-100",
                    )}>
                      <span className="tnum font-mono text-[26px] font-bold leading-none text-ink">{s.date.slice(8, 10)}</span>
                      <span className="text-[10.5px] font-bold uppercase text-gray-400">Th{Number(s.date.slice(5, 7))}/{s.date.slice(2, 4)}</span>
                    </div>
                    <div className="min-w-0 flex-1 px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14.5px] font-bold text-ink">{fmtDateLong(s.date)}</span>
                        <ScheduleStatusBadge status={s.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-600">
                        <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-gray-400" /><b className="tnum font-mono">{s.startTime} – {s.endTime}</b></span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" />{s.location}</span>
                        <ShiftTag code={s.shiftCode} size="sm" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <AssignmentStatusBadge status={i.assignmentStatus} />
                        {canRespond && (
                          <span className="flex flex-wrap gap-1.5">
                            <Button size="xs" onClick={() => respond(i, true)} loading={mut.confirmAssignment.isPending}>
                              <Check className="h-3.5 w-3.5" /> Xác nhận
                            </Button>
                            <Button size="xs" variant="secondary" onClick={() => setDeclineFor(i)}>
                              <X className="h-3.5 w-3.5 text-red-500" /> Từ chối
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => { setSwapFor(i); setSwapReason(""); }}>
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Yêu cầu đổi ca
                            </Button>
                          </span>
                        )}
                        <Link to={`/duty/calendar?open=${s.id}`} className="ml-auto text-[12px] font-semibold text-brand-600 transition-colors hover:text-brand-800">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-sub">Gần đây</h3>
          <div className="space-y-2.5">
            {past.map((i) => (
              <div key={i.assignmentId} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-edge bg-surface px-4 py-3 opacity-75 shadow-[var(--shadow-card)]">
                <span className="tnum w-20 font-mono text-[13px] font-bold text-ink">{i.schedule.date.slice(8, 10)}/{i.schedule.date.slice(5, 7)}</span>
                <ShiftTag code={i.schedule.shiftCode} size="sm" />
                <span className="tnum font-mono text-[12.5px] text-sub">{i.schedule.startTime}–{i.schedule.endTime} · {i.schedule.location}</span>
                <span className="ml-auto"><AssignmentStatusBadge status={i.assignmentStatus} /></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={!!declineFor}
        onClose={() => setDeclineFor(null)}
        onConfirm={() => declineFor && respond(declineFor, false)}
        title="Từ chối ca trực?"
        danger
        confirmLabel="Từ chối ca"
        loading={mut.declineAssignment.isPending}
        message={declineFor ? (
          <span>Bạn sẽ từ chối ca <b>{declineFor.schedule.shiftName.toLowerCase()}</b> ngày <b>{fmtDateLong(declineFor.schedule.date)}</b>. Quản trị viên sẽ phân công người khác.</span>
        ) : null}
      />

      <Modal
        open={!!swapFor}
        onClose={() => setSwapFor(null)}
        title="Yêu cầu đổi ca"
        subtitle={swapFor ? `${swapFor.schedule.shiftName} · ${fmtDateLong(swapFor.schedule.date)}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSwapFor(null)}>Hủy</Button>
            <Button onClick={sendSwap} loading={false}><ArrowRightLeft className="h-4 w-4" /> Gửi yêu cầu</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-gray-600">
          Nêu lý do muốn đổi ca — quản trị viên sẽ xem xét trong trang <b>Đổi ca</b>.
        </p>
        <textarea
          value={swapReason}
          onChange={(e) => setSwapReason(e.target.value)}
          rows={3}
          placeholder="Ví dụ: Tôi có việc gia đình sáng 25/08, muốn đổi sang ca chiều..."
          className="mt-3 w-full rounded-[10px] border border-edge bg-surface p-3 text-[13.5px] transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          aria-label="Lý do đổi ca"
        />
      </Modal>

      <SyncCalendarModal
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        items={items}
        employeeName={user.name}
        employeeCode={user.sub}
        employeeId={user.employeeId}
      />
    </div>
  );
}
