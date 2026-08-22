/* ============================================================
 * In-memory database + seed — mô phỏng MySQL schema của module.
 * Cấu trúc bảng khớp 1-1 với server/src/main/resources/db/migration
 * ============================================================ */
import { addDays, todayISO } from "../../lib/utils";

export type DbScheduleStatus = "DRAFT" | "CONFIRMED" | "LOCKED" | "CANCELLED";
export type DbAssignmentStatus = "ASSIGNED" | "CONFIRMED" | "DECLINED" | "CANCELLED";

export interface DbDepartment { id: number; name: string; status: "ACTIVE" | "INACTIVE" }
export interface DbEmployee {
  id: number; employeeCode: string; fullName: string; email: string; phone: string;
  departmentId: number; status: "ACTIVE" | "INACTIVE"; createdAt: string;
}
export interface DbShift {
  id: number; code: "MORNING" | "AFTERNOON" | "NIGHT"; name: string;
  startTime: string; endTime: string; description: string; status: "ACTIVE" | "INACTIVE";
}
export interface DbSchedule {
  id: number; date: string; shiftId: number; requiredPeople: number; location: string;
  departmentId: number | null; status: DbScheduleStatus; createdBy: string;
  createdAt: string; updatedAt: string;
}
export interface DbAssignment {
  id: number; scheduleId: number; employeeId: number; status: DbAssignmentStatus;
  assignedAt: string; confirmedAt: string | null;
}
export interface DbDayOff {
  id: number; employeeId: number; date: string; reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string;
}
export interface DbZaloMapping {
  id: number; employeeId: number; zaloUserId: string; status: "CONNECTED" | "DISCONNECTED";
  receiveNotifications: boolean; connectedAt: string;
}
export interface DbNotification {
  id: number; employeeId: number; type: string; title: string; content: string;
  channel: "ZALO" | "IN_APP"; status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "RETRYING";
  externalMessageId: string | null; idempotencyKey: string; retryCount: number;
  lastError: string | null; read: boolean; createdAt: string; sentAt: string | null;
}
export interface DbHistory {
  id: number; scheduleId: number; action: string; oldValue: string | null;
  newValue: string | null; changedBy: string; createdAt: string;
}

export interface DbShape {
  seedVersion: number;
  seq: number;
  departments: DbDepartment[];
  employees: DbEmployee[];
  shifts: DbShift[];
  schedules: DbSchedule[];
  assignments: DbAssignment[];
  dayOffs: DbDayOff[];
  zaloMappings: DbZaloMapping[];
  notifications: DbNotification[];
  history: DbHistory[];
  idempotencyKeys: string[];
}

const STORAGE_KEY = "trucca.db.v1";
const SEED_VERSION = 7;

/** PRNG ổn định để seed dữ liệu đa dạng nhưng tất định */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

export function buildSeed(): DbShape {
  const rand = lcg(20260825);
  const today = todayISO();
  const now = new Date().toISOString();
  let seq = 1000;
  const next = () => ++seq;

  const departments: DbDepartment[] = [
    { id: 1, name: "Kỹ thuật", status: "ACTIVE" },
    { id: 2, name: "Vận hành", status: "ACTIVE" },
    { id: 3, name: "Hỗ trợ khách hàng", status: "ACTIVE" },
  ];

  const names = [
    "Nguyễn Văn An", "Trần Thị Bích", "Lê Văn Cường", "Phạm Thu Dung", "Hoàng Minh Đức",
    "Vũ Ngọc Hà", "Đặng Văn Khoa", "Bùi Thanh Lan", "Đỗ Quang Minh", "Ngô Hải Yến",
  ];
  const employees: DbEmployee[] = names.map((fullName, i) => ({
    id: i + 1,
    employeeCode: `EMP-${String(i + 1).padStart(3, "0")}`,
    fullName,
    email: `nv${i + 1}@trucca.vn`,
    phone: `09${String(10000000 + Math.floor(rand() * 89999999))}`,
    departmentId: (i % 3) + 1,
    status: "ACTIVE",
    createdAt: now,
  }));

  const shifts: DbShift[] = [
    { id: 1, code: "MORNING", name: "Ca sáng", startTime: "08:00", endTime: "12:00", description: "Trực buổi sáng", status: "ACTIVE" },
    { id: 2, code: "AFTERNOON", name: "Ca chiều", startTime: "13:00", endTime: "17:00", description: "Trực buổi chiều", status: "ACTIVE" },
    { id: 3, code: "NIGHT", name: "Ca tối", startTime: "18:00", endTime: "22:00", description: "Trực buổi tối", status: "ACTIVE" },
  ];

  const locations = ["Văn phòng A", "Văn phòng B", "Phòng server", "Quầy lễ tân"];
  const schedules: DbSchedule[] = [];
  const assignments: DbAssignment[] = [];
  const history: DbHistory[] = [];
  const load: Record<number, number> = {};

  const pickEmployees = (count: number, exclude: number[] = []): number[] => {
    const pool = employees
      .map((e) => e.id)
      .filter((id) => !exclude.includes(id))
      .sort((a, b) => (load[a] ?? 0) - (load[b] ?? 0) || rand() - 0.5);
    return pool.slice(0, count);
  };

  for (let offset = -5; offset <= 14; offset++) {
    const date = addDays(today, offset);
    const perDay = offset % 3 === 0 ? 2 : 1;
    for (let s = 0; s < perDay; s++) {
      const shiftId = (Math.abs(offset) + s) % 3 === 2 ? 3 : ((Math.abs(offset) + s) % 3) + 1;
      const required = 1 + (rand() > 0.55 ? 1 : 0);
      const isPast = offset < 0;
      const sch: DbSchedule = {
        id: next(), date, shiftId, requiredPeople: required,
        location: locations[Math.floor(rand() * locations.length)],
        departmentId: rand() > 0.5 ? 1 + Math.floor(rand() * 3) : null,
        status: isPast ? (rand() > 0.3 ? "LOCKED" : "CONFIRMED") : offset === 0 && s === 0 ? "CONFIRMED" : rand() > 0.45 ? "CONFIRMED" : "DRAFT",
        createdBy: "Quản trị viên", createdAt: now, updatedAt: now,
      };
      if (isPast && rand() > 0.85) sch.status = "CANCELLED";
      schedules.push(sch);
      if (sch.status === "CANCELLED") continue;

      const assignedCount = sch.status === "DRAFT" && rand() > 0.5 ? required - 1 : required;
      const ids = pickEmployees(Math.max(0, assignedCount));
      ids.forEach((empId, idx) => {
        load[empId] = (load[empId] ?? 0) + 1;
        const confirmed = isPast ? true : sch.status === "CONFIRMED" && rand() > 0.4;
        assignments.push({
          id: next(), scheduleId: sch.id, employeeId: empId,
          status: confirmed ? "CONFIRMED" : "ASSIGNED",
          assignedAt: now, confirmedAt: confirmed ? now : null,
        });
        if (idx === 0) {
          history.push({
            id: next(), scheduleId: sch.id, action: "AUTO_ASSIGN",
            oldValue: null, newValue: `${required} vị trí`, changedBy: "Hệ thống", createdAt: now,
          });
        }
      });
    }
  }

  // Đảm bảo EMP-001 (Nguyễn Văn An) luôn có ca sắp tới để demo luồng nhân viên
  const upcoming = schedules
    .filter((s) => s.date >= today && s.status !== "CANCELLED")
    .sort((a, b) => a.date.localeCompare(b.date));
  const ensureForEmp1 = [0, 1, 2];
  ensureForEmp1.forEach((k, i) => {
    const sch = upcoming[k * 2];
    if (!sch) return;
    const has = assignments.some((a) => a.scheduleId === sch.id && a.employeeId === 1 && a.status !== "CANCELLED");
    if (!has && assignments.filter((a) => a.scheduleId === sch.id).length < sch.requiredPeople + 1) {
      assignments.push({
        id: next(), scheduleId: sch.id, employeeId: 1,
        status: i === 0 ? "CONFIRMED" : "ASSIGNED",
        assignedAt: now, confirmedAt: i === 0 ? now : null,
      });
      load[1] = (load[1] ?? 0) + 1;
    }
  });

  const dayOffs: DbDayOff[] = [
    { id: next(), employeeId: 3, date: addDays(today, 2), reason: "Việc gia đình", status: "APPROVED", createdAt: now },
    { id: next(), employeeId: 7, date: addDays(today, 4), reason: "Khám sức khỏe", status: "APPROVED", createdAt: now },
    { id: next(), employeeId: 5, date: addDays(today, 6), reason: "Du lịch", status: "PENDING", createdAt: now },
  ];

  const zaloMappings: DbZaloMapping[] = [1, 2, 3, 4, 6, 8, 9].map((empId, i) => ({
    id: next(), employeeId: empId,
    zaloUserId: `${8200100000 + Math.floor(rand() * 9000000)}`,
    status: "CONNECTED", receiveNotifications: i !== 3, connectedAt: now,
  }));

  const emp1Sch = assignments.find((a) => a.employeeId === 1 && a.status === "ASSIGNED");
  const schOf = (id?: number) => schedules.find((s) => s.id === id);
  const notifications: DbNotification[] = [
    ...(emp1Sch && schOf(emp1Sch.scheduleId)
      ? [{
          id: next(), employeeId: 1, type: "SCHEDULE_ASSIGNED",
          title: "📅 Lịch trực mới",
          content: `Ngày ${schOf(emp1Sch.scheduleId)!.date.split("-").reverse().join("/")} • ${shifts.find((s) => s.id === schOf(emp1Sch.scheduleId)!.shiftId)!.startTime}–${shifts.find((s) => s.id === schOf(emp1Sch.scheduleId)!.shiftId)!.endTime} • ${schOf(emp1Sch.scheduleId)!.location}. Vui lòng kiểm tra và xác nhận.`,
          channel: "ZALO" as const, status: "SENT" as const,
          externalMessageId: `zalo_msg_${next()}`, idempotencyKey: `seed-1:${emp1Sch.id}`,
          retryCount: 0, lastError: null, read: false,
          createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          sentAt: new Date(Date.now() - 4.6 * 60000).toISOString(),
        }]
      : []),
    {
      id: next(), employeeId: 1, type: "SCHEDULE_UPDATED", title: "⚠️ Lịch trực thay đổi",
      content: "Ca trực của bạn vừa được điều chỉnh. Vui lòng kiểm tra lại lịch.",
      channel: "ZALO", status: "SENT", externalMessageId: `zalo_msg_${next()}`,
      idempotencyKey: "seed-2", retryCount: 0, lastError: null, read: true,
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      sentAt: new Date(Date.now() - 2.9 * 3600000).toISOString(),
    },
    {
      id: next(), employeeId: 2, type: "SCHEDULE_ASSIGNED", title: "📅 Lịch trực mới",
      content: "Bạn được phân công ca trực mới. Vui lòng kiểm tra và xác nhận.",
      channel: "ZALO", status: "FAILED", externalMessageId: null,
      idempotencyKey: "seed-3", retryCount: 3, lastError: "Zalo API error 401: access_token expired",
      read: true, createdAt: new Date(Date.now() - 26 * 3600000).toISOString(), sentAt: null,
    },
    {
      id: next(), employeeId: 4, type: "SCHEDULE_CANCELLED", title: "❌ Ca trực đã hủy",
      content: "Ca trực của bạn đã được hủy bởi quản trị viên.",
      channel: "ZALO", status: "SENT", externalMessageId: `zalo_msg_${next()}`,
      idempotencyKey: "seed-4", retryCount: 1, lastError: null, read: true,
      createdAt: new Date(Date.now() - 50 * 3600000).toISOString(),
      sentAt: new Date(Date.now() - 49 * 3600000).toISOString(),
    },
  ];

  return {
    seedVersion: SEED_VERSION, seq, departments, employees, shifts,
    schedules, assignments, dayOffs, zaloMappings, notifications, history,
    idempotencyKeys: notifications.map((n) => n.idempotencyKey),
  };
}

export function loadDb(): DbShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DbShape;
      if (parsed.seedVersion === SEED_VERSION) return parsed;
    }
  } catch {
    /* seed lại khi hỏng */
  }
  const fresh = buildSeed();
  persist(fresh);
  return fresh;
}

export function persist(db: DbShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* bỏ qua quota */
  }
}

export function resetDb(): DbShape {
  const fresh = buildSeed();
  persist(fresh);
  return fresh;
}
