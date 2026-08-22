/* ============================================================
 * Engine — bản mô phỏng trung thực của Service Layer Spring Boot:
 *  - ScheduleService / AssignmentService / DayOffService
 *  - ScheduleAlgorithmService (phân ca công bằng)
 *  - Event bus → NotificationService → ZaloChannel (retry + idempotency)
 *  - RBAC (ADMIN / EMPLOYEE) giống @PreAuthorize phía backend
 * ============================================================ */
import {
  DbShape, DbSchedule, DbAssignment, DbNotification, DbHistory,
  loadDb, persist, resetDb,
} from "./db";
import { addDays, overlaps, todayISO } from "../../lib/utils";

export interface Session { sub: string; role: "ADMIN" | "EMPLOYEE"; name: string; employeeId?: number }
export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MAX_SHIFT_PER_MONTH = 10;
let db: DbShape = loadDb();

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeDbChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function changed() {
  persist(db);
  listeners.forEach((fn) => fn());
}

/* ---------- dev flag: giả lập Zalo API lỗi để demo retry ---------- */
let devZaloFailure = false;
export const setDevZaloFailure = (v: boolean) => { devZaloFailure = v; };
export const getDevZaloFailure = () => devZaloFailure;

/* ================= helpers ================= */
const nextId = () => ++db.seq;
const nowIso = () => new Date().toISOString();
const shiftOf = (id: number) => db.shifts.find((s) => s.id === id)!;
const empOf = (id: number) => db.employees.find((e) => e.id === id)!;
const deptOf = (id: number | null | undefined) =>
  id ? db.departments.find((d) => d.id === id)?.name : undefined;
const scheduleById = (id: number) => db.schedules.find((s) => s.id === id);

function requireAdmin(s: Session) {
  if (s.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
}
function findAssignment(scheduleId: number, assignmentId: number): DbAssignment {
  const a = db.assignments.find((x) => x.id === assignmentId && x.scheduleId === scheduleId);
  if (!a) throw new ApiError(404, "ASSIGNMENT_NOT_FOUND", "Không tìm thấy phân công.");
  return a;
}

function logHistory(scheduleId: number, action: string, oldValue: unknown, newValue: unknown, by: string) {
  db.history.push({
    id: nextId(), scheduleId, action,
    oldValue: oldValue == null ? null : typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue),
    newValue: newValue == null ? null : typeof newValue === "string" ? newValue : JSON.stringify(newValue),
    changedBy: by, createdAt: nowIso(),
  });
}

/* ================= notification pipeline ================= */
function fmtVN(dateIso: string) {
  return dateIso.split("-").reverse().join("/");
}

function buildContent(type: DbNotification["type"], sch: DbSchedule): { title: string; content: string } {
  const shift = shiftOf(sch.shiftId);
  switch (type) {
    case "SCHEDULE_ASSIGNED":
      return {
        title: "📅 Lịch trực mới",
        content: `Ngày ${fmtVN(sch.date)}\nCa: ${shift.startTime} - ${shift.endTime}\nĐịa điểm: ${sch.location}\nBạn được phân công ca trực này.\nVui lòng kiểm tra và xác nhận.`,
      };
    case "SCHEDULE_UPDATED":
      return {
        title: "⚠️ Lịch trực đã thay đổi",
        content: `Ngày ${fmtVN(sch.date)}\nThời gian mới: ${shift.startTime} - ${shift.endTime}\nĐịa điểm: ${sch.location}\nVui lòng kiểm tra lại lịch.`,
      };
    case "SCHEDULE_CANCELLED":
      return {
        title: "❌ Ca trực đã hủy",
        content: `Ca trực ngày ${fmtVN(sch.date)} (${shift.startTime} - ${shift.endTime}) đã được hủy.`,
      };
    default:
      return { title: "Thông báo lịch trực", content: `Lịch trực ngày ${fmtVN(sch.date)} đã được xác nhận.` };
  }
}

/**
 * NotificationService.publish — có idempotency key, không gửi trùng.
 */
export function publishNotification(employeeId: number, type: DbNotification["type"], sch: DbSchedule, idemSuffix: string) {
  const key = `${employeeId}:${type}:${sch.id}:${idemSuffix}`;
  if (db.idempotencyKeys.includes(key)) return; // không gửi trùng
  db.idempotencyKeys.push(key);
  const { title, content } = buildContent(type, sch);
  const n: DbNotification = {
    id: nextId(), employeeId, type, title, content,
    channel: "ZALO", status: "PENDING", externalMessageId: null,
    idempotencyKey: key, retryCount: 0, lastError: null, read: false,
    createdAt: nowIso(), sentAt: null,
  };
  db.notifications.unshift(n);
  changed();
  void deliver(n.id);
}

/** Mô phỏng ZaloNotificationChannel.send + RetryPolicy (tối đa 3 lần, backoff lũy thừa) */
async function deliver(notificationId: number) {
  const n = db.notifications.find((x) => x.id === notificationId);
  if (!n || n.status === "SENT") return;
  n.status = "PROCESSING";
  changed();
  await new Promise((r) => setTimeout(r, 700));

  const mapping = db.zaloMappings.find((m) => m.employeeId === n.employeeId && m.status === "CONNECTED");
  const prefOff = mapping ? !mapping.receiveNotifications : false;
  const fail = devZaloFailure || !mapping || prefOff || Math.random() < 0.1;

  const fresh = db.notifications.find((x) => x.id === notificationId);
  if (!fresh) return;
  if (fail) {
    const reason = devZaloFailure
      ? "Zalo API error 503: service unavailable (dev simulation)"
      : !mapping
        ? "Nhân viên chưa kết nối Zalo — không có zalo_user_id"
        : prefOff
          ? "Nhân viên đã tắt nhận thông báo Zalo"
          : "Zalo API error 429: rate limited";
    fresh.lastError = reason;
    if (fresh.retryCount < 3) {
      fresh.retryCount += 1;
      fresh.status = "RETRYING";
      changed();
      setTimeout(() => void deliver(notificationId), 1400 * Math.pow(2, fresh.retryCount - 1));
    } else {
      fresh.status = "FAILED";
      changed();
    }
  } else {
    fresh.status = "SENT";
    fresh.sentAt = nowIso();
    fresh.externalMessageId = `zalo_msg_${Math.random().toString(36).slice(2, 10)}`;
    fresh.lastError = null;
    changed();
  }
}

/* ================= event → notification (lặp lại NotificationEventListener) ================= */
function notifyAssigned(sch: DbSchedule) {
  activeAssignments(sch.id).forEach((a) => publishNotification(a.employeeId, "SCHEDULE_ASSIGNED", sch, `a${a.id}`));
}
function notifyUpdated(sch: DbSchedule) {
  activeAssignments(sch.id).forEach((a) => publishNotification(a.employeeId, "SCHEDULE_UPDATED", sch, `u${sch.updatedAt}`));
}
function notifyCancelled(sch: DbSchedule) {
  activeAssignments(sch.id).forEach((a) => publishNotification(a.employeeId, "SCHEDULE_CANCELLED", sch, `c${sch.updatedAt}`));
}

const ACTIVE_A: DbAssignment["status"][] = ["ASSIGNED", "CONFIRMED"];
function activeAssignments(scheduleId: number) {
  return db.assignments.filter((a) => a.scheduleId === scheduleId && ACTIVE_A.includes(a.status));
}

/* ================= validation nghiệp vụ ================= */
function assertNoDuplicateSchedule(date: string, shiftId: number, ignoreId?: number) {
  const dup = db.schedules.find(
    (s) => s.date === date && s.shiftId === shiftId && s.status !== "CANCELLED" && s.id !== ignoreId,
  );
  if (dup) {
    throw new ApiError(409, "DUTY_SCHEDULE_CONFLICT", `Đã tồn tại ca trực ${shiftOf(shiftId).name.toLowerCase()} ngày ${fmtVN(date)}. Không thể tạo lịch trùng.`);
  }
}

function validateAssignmentTarget(sch: DbSchedule, employeeId: number) {
  const emp = db.employees.find((e) => e.id === employeeId);
  if (!emp || emp.status !== "ACTIVE") throw new ApiError(400, "EMPLOYEE_NOT_FOUND", "Nhân viên không tồn tại hoặc đã nghỉ việc.");
  const dayOff = db.dayOffs.find((d) => d.employeeId === employeeId && d.date === sch.date && d.status !== "REJECTED");
  if (dayOff) throw new ApiError(409, "EMPLOYEE_ON_DAY_OFF", `${emp.fullName} đã đăng ký nghỉ ngày ${fmtVN(sch.date)} (${dayOff.reason}).`);
  const shift = shiftOf(sch.shiftId);
  const conflict = db.assignments.some((a) => {
    if (a.employeeId !== employeeId || !ACTIVE_A.includes(a.status)) return false;
    const s = scheduleById(a.scheduleId);
    return !!s && s.id !== sch.id && s.date === sch.date && s.status !== "CANCELLED" && overlaps(shift.startTime, shift.endTime, shiftOf(s.shiftId).startTime, shiftOf(s.shiftId).endTime);
  });
  if (conflict) throw new ApiError(409, "ASSIGNMENT_CONFLICT", `${emp.fullName} đã có ca trực trong khoảng thời gian này.`);
  const already = db.assignments.some((a) => a.scheduleId === sch.id && a.employeeId === employeeId && ACTIVE_A.includes(a.status));
  if (already) throw new ApiError(409, "ASSIGNMENT_DUPLICATE", `${emp.fullName} đã nằm trong ca trực này.`);
}

function monthOf(dateIso: string) {
  return dateIso.slice(0, 7);
}
function countShiftsInMonth(employeeId: number, month: string, planned: Record<number, number> = {}) {
  const base = db.assignments.filter((a) => {
    if (a.employeeId !== employeeId || !ACTIVE_A.includes(a.status)) return false;
    const s = scheduleById(a.scheduleId);
    return !!s && s.status !== "CANCELLED" && monthOf(s.date) === month;
  }).length;
  return base + (planned[employeeId] ?? 0);
}

/* ================= ScheduleAlgorithmService ================= */
export interface AutoAssignInput {
  startDate: string; endDate: string; shiftId: number;
  departmentId?: number | null; requiredPeople: number; location: string;
}
export interface PreviewItem {
  scheduleId?: number; existing?: boolean; date: string; shiftId: number; shiftName: string;
  startTime: string; endTime: string; location: string; requiredPeople: number;
  employees: { id: number; name: string; currentLoad: number }[];
}
export interface PreviewWarning { level: "WARN" | "INFO"; date?: string; message: string }

export function runAutoAssignPreview(input: AutoAssignInput, existingOnly = false) {
  const shift = shiftOf(input.shiftId);
  const items: PreviewItem[] = [];
  const warnings: PreviewWarning[] = [];
  const planned: Record<number, number> = {};
  let slots = 0; let assigned = 0;

  let cursor = input.startDate;
  let guard = 0;
  while (cursor <= input.endDate && guard++ < 62) {
    const existing = db.schedules.find((s) => s.date === cursor && s.shiftId === input.shiftId && s.status !== "CANCELLED");
    if (existing && existing.status === "LOCKED") {
      warnings.push({ level: "INFO", date: cursor, message: `Ngày ${fmtVN(cursor)}: ca đã KHÓA — hệ thống không ghi đè.` });
      cursor = addDays(cursor, 1);
      continue;
    }

    const currentAssigned = existing ? activeAssignments(existing.id).length : 0;
    const need = Math.max(0, input.requiredPeople - currentAssigned);
    slots += need;

    if (need === 0 && existing) {
      items.push({
        scheduleId: existing.id, existing: true, date: cursor, shiftId: input.shiftId,
        shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime,
        location: existing.location, requiredPeople: input.requiredPeople,
        employees: activeAssignments(existing.id).map((a) => ({ id: a.employeeId, name: empOf(a.employeeId).fullName, currentLoad: countShiftsInMonth(a.employeeId, monthOf(cursor), planned) })),
      });
      cursor = addDays(cursor, 1);
      continue;
    }

    const month = monthOf(cursor);
    const candidates = db.employees.filter((e) => {
      if (e.status !== "ACTIVE") return false;
      if (input.departmentId && e.departmentId !== input.departmentId) return false;
      if (existing && activeAssignments(existing.id).some((a) => a.employeeId === e.id)) return false;
      if (db.dayOffs.some((d) => d.employeeId === e.id && d.date === cursor && d.status !== "REJECTED")) {
        warnings.push({ level: "INFO", date: cursor, message: `${e.fullName} nghỉ phép ngày ${fmtVN(cursor)} — đã loại khỏi danh sách.` });
        return false;
      }
      if (db.assignments.some((a) => {
        if (a.employeeId !== e.id || !ACTIVE_A.includes(a.status)) return false;
        const s = scheduleById(a.scheduleId);
        return !!s && s.status !== "CANCELLED" && s.date === cursor && overlaps(shift.startTime, shift.endTime, shiftOf(s.shiftId).startTime, shiftOf(s.shiftId).endTime);
      })) {
        warnings.push({ level: "INFO", date: cursor, message: `${e.fullName} đã có ca trùng giờ ngày ${fmtVN(cursor)} — đã loại.` });
        return false;
      }
      if (countShiftsInMonth(e.id, month, planned) >= MAX_SHIFT_PER_MONTH) {
        warnings.push({ level: "INFO", date: cursor, message: `${e.fullName} đã đạt giới hạn ${MAX_SHIFT_PER_MONTH} ca/tháng.` });
        return false;
      }
      return true;
    });

    // Ưu tiên người ít ca hơn (công bằng), ổn định theo tên
    candidates.sort((a, b) =>
      countShiftsInMonth(a.id, month, planned) - countShiftsInMonth(b.id, month, planned) ||
      a.fullName.localeCompare(b.fullName, "vi"),
    );

    const chosen = candidates.slice(0, need);
    chosen.forEach((e) => { planned[e.id] = (planned[e.id] ?? 0) + 1; });
    assigned += chosen.length;
    if (chosen.length < need) {
      warnings.push({ level: "WARN", date: cursor, message: `Ngày ${fmtVN(cursor)} không đủ nhân sự — thiếu ${need - chosen.length}/${need} người.` });
    }

    if (!existingOnly || existing) {
      items.push({
        scheduleId: existing?.id, existing: !!existing, date: cursor, shiftId: input.shiftId,
        shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime,
        location: existing?.location ?? input.location, requiredPeople: input.requiredPeople,
        employees: [
          ...(existing ? activeAssignments(existing.id).map((a) => ({ id: a.employeeId, name: empOf(a.employeeId).fullName, currentLoad: countShiftsInMonth(a.employeeId, month, planned) })) : []),
          ...chosen.map((e) => ({ id: e.id, name: e.fullName, currentLoad: countShiftsInMonth(e.id, month, planned) })),
        ],
      });
    }
    cursor = addDays(cursor, 1);
  }

  return {
    success: true,
    assignments: items,
    warnings,
    totals: { schedules: items.length, slots, assigned, missing: slots - assigned },
  };
}

export function commitAutoAssign(input: AutoAssignInput, session: Session) {
  requireAdmin(session);
  const preview = runAutoAssignPreview(input);
  const created: DbSchedule[] = [];
  for (const item of preview.assignments) {
    let sch = item.scheduleId ? scheduleById(item.scheduleId) : undefined;
    const newIds = item.employees
      .filter((e) => !(sch && activeAssignments(sch.id).some((a) => a.employeeId === e.id)))
      .map((e) => e.id);
    if (!sch) {
      sch = {
        id: nextId(), date: item.date, shiftId: item.shiftId, requiredPeople: item.requiredPeople,
        location: item.location, departmentId: input.departmentId ?? null, status: "CONFIRMED",
        createdBy: session.name, createdAt: nowIso(), updatedAt: nowIso(),
      };
      db.schedules.push(sch);
      logHistory(sch.id, "CREATE", null, { date: item.date, shift: item.shiftName }, session.name);
      logHistory(sch.id, "CONFIRM", "DRAFT", "CONFIRMED", session.name);
      created.push(sch);
    } else if (sch.status === "LOCKED") {
      continue; // không ghi đè lịch đã khóa
    } else if (sch.status === "DRAFT") {
      sch.status = "CONFIRMED";
      sch.updatedAt = nowIso();
      logHistory(sch.id, "CONFIRM", "DRAFT", "CONFIRMED", session.name);
      created.push(sch);
    }
    for (const empId of newIds) {
      const a: DbAssignment = {
        id: nextId(), scheduleId: sch.id, employeeId: empId, status: "ASSIGNED",
        assignedAt: nowIso(), confirmedAt: null,
      };
      db.assignments.push(a);
      logHistory(sch.id, "ASSIGN", null, empOf(empId).fullName, session.name);
    }
  }
  changed();
  // ScheduleAssignedEvent → gửi sau khi "transaction" thành công
  created.forEach((s) => notifyAssigned(s));
  return { success: true, created: created.length, ...preview.totals };
}

/* ================= ScheduleService ================= */
export interface ScheduleInput {
  date: string; shiftId: number; requiredPeople: number; location: string;
  departmentId?: number | null; status?: "DRAFT" | "CONFIRMED";
}

function toScheduleDto(s: DbSchedule) {
  const shift = shiftOf(s.shiftId);
  return {
    id: s.id, date: s.date, shiftId: s.shiftId, shiftName: shift.name, shiftCode: shift.code,
    startTime: shift.startTime, endTime: shift.endTime, requiredPeople: s.requiredPeople,
    location: s.location, departmentId: s.departmentId, departmentName: deptOf(s.departmentId),
    status: s.status, createdBy: s.createdBy, createdAt: s.createdAt,
    assignments: db.assignments
      .filter((a) => a.scheduleId === s.id)
      .sort((a, b) => a.id - b.id)
      .map((a) => {
        const emp = empOf(a.employeeId);
        const mapping = db.zaloMappings.find((m) => m.employeeId === emp.id && m.status === "CONNECTED");
        return {
          id: a.id, scheduleId: s.id, employeeId: emp.id, employeeName: emp.fullName,
          employeeCode: emp.employeeCode, departmentName: deptOf(emp.departmentId),
          zaloConnected: !!mapping, status: a.status, assignedAt: a.assignedAt,
          confirmedAt: a.confirmedAt ?? undefined,
        };
      }),
  };
}

export function listSchedules(filter: { month?: string; departmentId?: number; shiftId?: number; status?: string; employeeId?: number; from?: string; to?: string }) {
  let list = db.schedules.slice();
  if (filter.month) list = list.filter((s) => s.date.startsWith(filter.month!));
  if (filter.from) list = list.filter((s) => s.date >= filter.from!);
  if (filter.to) list = list.filter((s) => s.date <= filter.to!);
  if (filter.departmentId) list = list.filter((s) => s.departmentId === filter.departmentId);
  if (filter.shiftId) list = list.filter((s) => s.shiftId === filter.shiftId);
  if (filter.status) list = list.filter((s) => s.status === filter.status);
  if (filter.employeeId) {
    list = list.filter((s) => db.assignments.some((a) => a.scheduleId === s.id && a.employeeId === filter.employeeId && ACTIVE_A.includes(a.status)));
  }
  return list.sort((a, b) => a.date.localeCompare(b.date) || a.shiftId - b.shiftId).map(toScheduleDto);
}

export function calendar(month: string, filter: { departmentId?: number; shiftId?: number; status?: string; employeeId?: number }) {
  const schedules = listSchedules({ month, ...filter });
  const totalAssignments = schedules.reduce((sum, s) => sum + s.assignments.filter((a) => ACTIVE_A.includes(a.status as DbAssignment["status"])).length, 0);
  const confirmedAssignments = schedules.reduce((sum, s) => sum + s.assignments.filter((a) => a.status === "CONFIRMED").length, 0);
  return {
    schedules,
    stats: {
      totalSchedules: schedules.filter((s) => s.status !== "CANCELLED").length,
      understaffed: schedules.filter((s) => s.status !== "CANCELLED" && s.assignments.filter((a) => a.status === "ASSIGNED" || a.status === "CONFIRMED").length < s.requiredPeople).length,
      locked: schedules.filter((s) => s.status === "LOCKED").length,
      confirmedAssignments,
      totalAssignments,
    },
  };
}

export function getSchedule(id: number): ReturnType<typeof toScheduleDto> & { history: DbHistory[] } {
  const s = scheduleById(id);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  return { ...toScheduleDto(s), history: db.history.filter((h) => h.scheduleId === id).sort((a, b) => b.id - a.id) };
}

export function createSchedule(input: ScheduleInput, session: Session) {
  requireAdmin(session);
  if (input.date < todayISO()) throw new ApiError(400, "INVALID_DATE", "Không thể tạo lịch cho ngày trong quá khứ.");
  if (input.requiredPeople < 1) throw new ApiError(400, "INVALID_REQUIRED_PEOPLE", "Số người cần phải lớn hơn 0.");
  assertNoDuplicateSchedule(input.date, input.shiftId);
  const s: DbSchedule = {
    id: nextId(), date: input.date, shiftId: input.shiftId, requiredPeople: input.requiredPeople,
    location: input.location || "Văn phòng A", departmentId: input.departmentId ?? null,
    status: input.status ?? "DRAFT", createdBy: session.name, createdAt: nowIso(), updatedAt: nowIso(),
  };
  db.schedules.push(s);
  logHistory(s.id, "CREATE", null, { date: input.date, shift: shiftOf(input.shiftId).name }, session.name);
  changed(); // ScheduleCreatedEvent
  return toScheduleDto(s);
}

export function updateSchedule(id: number, input: Partial<ScheduleInput>, session: Session) {
  requireAdmin(session);
  const s = scheduleById(id);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (s.status === "LOCKED") throw new ApiError(409, "SCHEDULE_LOCKED", "Ca trực đã khóa — không thể chỉnh sửa.");
  if (s.status === "CANCELLED") throw new ApiError(409, "SCHEDULE_CANCELLED", "Ca trực đã bị hủy.");
  const old = { date: s.date, shift: shiftOf(s.shiftId).name, location: s.location, required: s.requiredPeople };
  if (input.date && input.date !== s.date && input.date < todayISO()) throw new ApiError(400, "INVALID_DATE", "Không thể chuyển lịch về ngày trong quá khứ.");
  const newDate = input.date ?? s.date;
  const newShift = input.shiftId ?? s.shiftId;
  if (input.date || input.shiftId) assertNoDuplicateSchedule(newDate, newShift, id);
  s.date = newDate; s.shiftId = newShift;
  if (input.requiredPeople != null) s.requiredPeople = input.requiredPeople;
  if (input.location != null) s.location = input.location;
  if (input.departmentId !== undefined) s.departmentId = input.departmentId ?? null;
  s.updatedAt = nowIso();
  logHistory(s.id, "UPDATE", old, { date: s.date, shift: shiftOf(s.shiftId).name, location: s.location, required: s.requiredPeople }, session.name);
  changed();
  notifyUpdated(s); // ScheduleUpdatedEvent
  return toScheduleDto(s);
}

function transition(id: number, to: DbSchedule["status"], session: Session, from: DbSchedule["status"][]) {
  requireAdmin(session);
  const s = scheduleById(id);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (!from.includes(s.status)) throw new ApiError(409, "INVALID_TRANSITION", `Không thể chuyển ca trực từ trạng thái ${s.status} sang ${to}.`);
  const old = s.status;
  s.status = to;
  s.updatedAt = nowIso();
  logHistory(s.id, to === "CANCELLED" ? "CANCEL" : to === "LOCKED" ? "LOCK" : "CONFIRM", old, to, session.name);
  return s;
}

export function confirmSchedule(id: number, session: Session) {
  const s = transition(id, "CONFIRMED", session, ["DRAFT"]);
  changed();
  return toScheduleDto(s);
}
export function lockSchedule(id: number, session: Session) {
  const s = transition(id, "LOCKED", session, ["DRAFT", "CONFIRMED"]);
  changed();
  return toScheduleDto(s);
}
export function cancelSchedule(id: number, session: Session) {
  const s = transition(id, "CANCELLED", session, ["DRAFT", "CONFIRMED"]);
  db.assignments.forEach((a) => {
    if (a.scheduleId === id && ACTIVE_A.includes(a.status)) a.status = "CANCELLED";
  });
  changed();
  notifyCancelled(s); // ScheduleCancelledEvent
  return toScheduleDto(s);
}
export function deleteSchedule(id: number, session: Session) {
  requireAdmin(session);
  const s = scheduleById(id);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (s.status !== "DRAFT") throw new ApiError(409, "INVALID_TRANSITION", "Chỉ có thể xóa lịch ở trạng thái nháp.");
  db.schedules = db.schedules.filter((x) => x.id !== id);
  db.assignments = db.assignments.filter((a) => a.scheduleId !== id);
  changed();
  return { success: true };
}

/* ================= AssignmentService ================= */
export function addAssignment(scheduleId: number, employeeId: number, session: Session) {
  requireAdmin(session);
  const s = scheduleById(scheduleId);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (s.status === "LOCKED") throw new ApiError(409, "SCHEDULE_LOCKED", "Ca trực đã khóa — không thể thêm người.");
  if (s.status === "CANCELLED") throw new ApiError(409, "SCHEDULE_CANCELLED", "Ca trực đã bị hủy.");
  validateAssignmentTarget(s, employeeId);
  const a: DbAssignment = { id: nextId(), scheduleId, employeeId, status: "ASSIGNED", assignedAt: nowIso(), confirmedAt: null };
  db.assignments.push(a);
  logHistory(scheduleId, "ASSIGN", null, empOf(employeeId).fullName, session.name);
  changed();
  publishNotification(employeeId, "SCHEDULE_ASSIGNED", s, `a${a.id}`);
  return toScheduleDto(s);
}

export function replaceAssignment(scheduleId: number, assignmentId: number, newEmployeeId: number, session: Session) {
  requireAdmin(session);
  const s = scheduleById(scheduleId);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (s.status === "LOCKED") throw new ApiError(409, "SCHEDULE_LOCKED", "Ca trực đã khóa — không thể đổi người.");
  const a = findAssignment(scheduleId, assignmentId);
  validateAssignmentTarget(s, newEmployeeId);
  const oldName = empOf(a.employeeId).fullName;
  a.status = "CANCELLED";
  const na: DbAssignment = { id: nextId(), scheduleId, employeeId: newEmployeeId, status: "ASSIGNED", assignedAt: nowIso(), confirmedAt: null };
  db.assignments.push(na);
  logHistory(scheduleId, "REPLACE", oldName, empOf(newEmployeeId).fullName, session.name);
  changed();
  publishNotification(newEmployeeId, "SCHEDULE_ASSIGNED", s, `a${na.id}`);
  return toScheduleDto(s);
}

export function removeAssignment(scheduleId: number, assignmentId: number, session: Session) {
  requireAdmin(session);
  const s = scheduleById(scheduleId);
  if (!s) throw new ApiError(404, "SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực.");
  if (s.status === "LOCKED") throw new ApiError(409, "SCHEDULE_LOCKED", "Ca trực đã khóa.");
  const a = findAssignment(scheduleId, assignmentId);
  const name = empOf(a.employeeId).fullName;
  a.status = "CANCELLED";
  logHistory(scheduleId, "REMOVE_ASSIGN", name, null, session.name);
  changed();
  return toScheduleDto(s);
}

export function respondAssignment(scheduleId: number, assignmentId: number, accept: boolean, session: Session) {
  const a = findAssignment(scheduleId, assignmentId);
  if (session.role !== "ADMIN" && session.employeeId !== a.employeeId) {
    throw new ApiError(403, "FORBIDDEN", "Bạn chỉ có thể xác nhận ca trực của chính mình.");
  }
  if (a.status !== "ASSIGNED") throw new ApiError(409, "INVALID_TRANSITION", "Chỉ có thể phản hồi khi ca đang ở trạng thái chờ xác nhận.");
  a.status = accept ? "CONFIRMED" : "DECLINED";
  if (accept) a.confirmedAt = nowIso();
  const s = scheduleById(scheduleId)!;
  logHistory(scheduleId, accept ? "EMPLOYEE_CONFIRM" : "EMPLOYEE_DECLINE", "ASSIGNED", a.status, session.name);
  changed();
  return toScheduleDto(s);
}

/* ================= My calendar ================= */
export function myCalendar(session: Session, from?: string, to?: string) {
  if (!session.employeeId) return { items: [] };
  const empId = session.employeeId;
  const rows = db.assignments
    .filter((a) => a.employeeId === empId && a.status !== "CANCELLED")
    .map((a) => ({ a, s: scheduleById(a.scheduleId)! }))
    .filter(({ s }) => s && s.status !== "CANCELLED")
    .filter(({ s }) => (!from || s.date >= from) && (!to || s.date <= to))
    .sort((x, y) => x.s.date.localeCompare(y.s.date) || x.s.shiftId - y.s.shiftId);
  return {
    items: rows.map(({ a, s }) => ({ assignmentId: a.id, assignmentStatus: a.status, schedule: toScheduleDto(s) })),
  };
}

/* ================= DayOffService ================= */
export function listDayOffs(session: Session) {
  const list = session.role === "ADMIN" ? db.dayOffs : db.dayOffs.filter((d) => d.employeeId === session.employeeId);
  return list
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, employeeName: empOf(d.employeeId).fullName }));
}
export function createDayOff(session: Session, input: { date: string; reason: string; employeeId?: number }) {
  const employeeId = session.role === "ADMIN" && input.employeeId ? input.employeeId : session.employeeId;
  if (!employeeId) throw new ApiError(400, "INVALID_REQUEST", "Không xác định được nhân viên.");
  if (input.date < todayISO()) throw new ApiError(400, "INVALID_DATE", "Không thể đăng ký nghỉ cho ngày trong quá khứ.");
  if (db.dayOffs.some((d) => d.employeeId === employeeId && d.date === input.date && d.status !== "REJECTED")) {
    throw new ApiError(409, "DAY_OFF_DUPLICATE", `Đã có đăng ký nghỉ ngày ${fmtVN(input.date)}.`);
  }
  const d = { id: nextId(), employeeId, date: input.date, reason: input.reason || "Việc cá nhân", status: "PENDING" as const, createdAt: nowIso() };
  db.dayOffs.push(d);
  changed();
  return { ...d, employeeName: empOf(employeeId).fullName };
}
export function updateDayOff(id: number, status: "APPROVED" | "REJECTED", session: Session) {
  requireAdmin(session);
  const d = db.dayOffs.find((x) => x.id === id);
  if (!d) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đăng ký nghỉ.");
  d.status = status;
  changed();
  return { ...d, employeeName: empOf(d.employeeId).fullName };
}
export function deleteDayOff(id: number, session: Session) {
  const d = db.dayOffs.find((x) => x.id === id);
  if (!d) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đăng ký nghỉ.");
  if (session.role !== "ADMIN" && session.employeeId !== d.employeeId) throw new ApiError(403, "FORBIDDEN", "Không có quyền xóa.");
  db.dayOffs = db.dayOffs.filter((x) => x.id !== id);
  changed();
  return { success: true };
}

/* ================= Zalo ================= */
export function zaloStatus(session: Session) {
  if (!session.employeeId) return { connected: false, receiveNotifications: false, isServiceAccount: true };
  const m = db.zaloMappings.find((x) => x.employeeId === session.employeeId);
  return {
    connected: m?.status === "CONNECTED",
    zaloUserId: m?.status === "CONNECTED" ? m.zaloUserId : undefined,
    connectedAt: m?.connectedAt,
    receiveNotifications: m?.receiveNotifications ?? true,
    employeeId: session.employeeId,
  };
}
export function zaloConnect(session: Session) {
  // Trả về URL OAuth thật của Zalo (app_id lấy từ env phía backend)
  const state = Math.random().toString(36).slice(2, 10);
  return {
    authorizationUrl: `https://oauth.zaloapp.com/v4/permission?app_id={{ZALO_APP_ID}}&redirect_uri={{ZALO_CALLBACK_URL}}&state=${state}`,
    state,
  };
}
export function zaloCompleteConnect(session: Session) {
  if (!session.employeeId) throw new ApiError(400, "INVALID_REQUEST", "Tài khoản quản trị không cần kết nối Zalo cá nhân.");
  let m = db.zaloMappings.find((x) => x.employeeId === session.employeeId);
  if (!m) {
    m = {
      id: nextId(), employeeId: session.employeeId,
      zaloUserId: `${8200000000 + Math.floor(Math.random() * 9999999)}`,
      status: "CONNECTED", receiveNotifications: true, connectedAt: nowIso(),
    };
    db.zaloMappings.push(m);
  } else {
    m.status = "CONNECTED";
    m.connectedAt = nowIso();
  }
  changed();
  return zaloStatus(session);
}
export function zaloDisconnect(session: Session) {
  if (!session.employeeId) throw new ApiError(400, "INVALID_REQUEST", "Không xác định được nhân viên.");
  const m = db.zaloMappings.find((x) => x.employeeId === session.employeeId);
  if (m) m.status = "DISCONNECTED";
  changed();
  return zaloStatus(session);
}
export function zaloPreferences(session: Session, receiveNotifications: boolean) {
  if (!session.employeeId) throw new ApiError(400, "INVALID_REQUEST", "Không xác định được nhân viên.");
  const m = db.zaloMappings.find((x) => x.employeeId === session.employeeId);
  if (!m || m.status !== "CONNECTED") throw new ApiError(409, "ZALO_NOT_CONNECTED", "Hãy kết nối Zalo trước khi bật nhận thông báo.");
  m.receiveNotifications = receiveNotifications;
  changed();
  return zaloStatus(session);
}
export function zaloEmployeeRows() {
  return db.employees.map((e) => {
    const m = db.zaloMappings.find((x) => x.employeeId === e.id && x.status === "CONNECTED");
    return {
      employeeId: e.id, employeeName: e.fullName, employeeCode: e.employeeCode,
      connected: !!m, zaloUserId: m?.zaloUserId, connectedAt: m?.connectedAt,
      receiveNotifications: m?.receiveNotifications ?? false,
    };
  });
}

/* ================= Notification queries ================= */
export function listNotifications(session: Session, all: boolean) {
  const list = all && session.role === "ADMIN"
    ? db.notifications
    : db.notifications.filter((n) => n.employeeId === session.employeeId);
  return list
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((n) => ({ ...n, employeeName: empOf(n.employeeId)?.fullName }));
}
export function unreadCount(session: Session) {
  return db.notifications.filter((n) => n.employeeId === session.employeeId && !n.read).length;
}
export function markRead(id: number, session: Session) {
  const n = db.notifications.find((x) => x.id === id && (session.role === "ADMIN" || x.employeeId === session.employeeId));
  if (n) { n.read = true; changed(); }
  return { success: true };
}
export function markAllRead(session: Session) {
  db.notifications.forEach((n) => {
    if (session.role === "ADMIN" || n.employeeId === session.employeeId) n.read = true;
  });
  changed();
  return { success: true };
}

/* ================= danh mục ================= */
export const listDepartments = () => db.departments;
export const listShifts = () => db.shifts;
export function listEmployees(session: Session) {
  return db.employees.map((e) => ({
    ...e,
    departmentName: deptOf(e.departmentId),
    shiftCountMonth: countShiftsInMonth(e.id, monthOf(todayISO())),
    zaloConnected: db.zaloMappings.some((m) => m.employeeId === e.id && m.status === "CONNECTED"),
  }));
}

export { resetDb };
