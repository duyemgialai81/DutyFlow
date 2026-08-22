/* ============================================================
 * Domain types — đồng bộ 1-1 với entity/DTO phía Spring Boot
 * ============================================================ */

export type ScheduleStatus = "DRAFT" | "CONFIRMED" | "LOCKED" | "CANCELLED";
export type AssignmentStatus = "ASSIGNED" | "CONFIRMED" | "DECLINED" | "CANCELLED";
export type DayOffStatus = "PENDING" | "APPROVED" | "REJECTED";
export type NotificationStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "RETRYING";
export type NotificationType = "SCHEDULE_ASSIGNED" | "SCHEDULE_UPDATED" | "SCHEDULE_CANCELLED" | "SCHEDULE_CONFIRMED";
export type Role = "ADMIN" | "EMPLOYEE";

export interface Department {
  id: number;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: number;
  departmentName?: string;
  status: "ACTIVE" | "INACTIVE";
  shiftCountMonth?: number;
  zaloConnected?: boolean;
}

export interface Shift {
  id: number;
  code: "MORNING" | "AFTERNOON" | "NIGHT";
  name: string;
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  description?: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface DutyAssignment {
  id: number;
  scheduleId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  zaloConnected: boolean;
  status: AssignmentStatus;
  assignedAt: string;
  confirmedAt?: string;
}

export interface DutySchedule {
  id: number;
  date: string; // yyyy-MM-dd
  shiftId: number;
  shiftName: string;
  shiftCode: Shift["code"];
  startTime: string;
  endTime: string;
  requiredPeople: number;
  location: string;
  departmentId?: number;
  departmentName?: string;
  status: ScheduleStatus;
  createdBy: string;
  createdAt: string;
  assignments: DutyAssignment[];
}

export interface ScheduleHistoryEntry {
  id: number;
  scheduleId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  createdAt: string;
}

export interface ScheduleDetail extends DutySchedule {
  history: ScheduleHistoryEntry[];
}

export interface DayOff {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  reason: string;
  status: DayOffStatus;
}

export interface ZaloStatus {
  connected: boolean;
  zaloUserId?: string;
  connectedAt?: string;
  receiveNotifications: boolean;
  employeeId?: number;
}

export interface ZaloEmployeeRow {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  connected: boolean;
  zaloUserId?: string;
  connectedAt?: string;
  receiveNotifications: boolean;
}

export interface AppNotification {
  id: number;
  employeeId: number;
  employeeName?: string;
  type: NotificationType;
  title: string;
  content: string;
  channel: "ZALO" | "IN_APP";
  status: NotificationStatus;
  externalMessageId?: string;
  retryCount: number;
  lastError?: string;
  read: boolean;
  createdAt: string;
  sentAt?: string;
}

export interface CalendarStats {
  totalSchedules: number;
  understaffed: number;
  locked: number;
  confirmedAssignments: number;
  totalAssignments: number;
}

export interface CalendarResponse {
  schedules: DutySchedule[];
  stats: CalendarStats;
}

export interface AutoAssignPreviewItem {
  scheduleId?: number;
  existing?: boolean;
  date: string;
  shiftId: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  location: string;
  requiredPeople: number;
  employees: { id: number; name: string; currentLoad: number }[];
}

export interface AutoAssignWarning {
  level: "WARN" | "INFO";
  date?: string;
  message: string;
}

export interface AutoAssignPreviewResponse {
  success: boolean;
  assignments: AutoAssignPreviewItem[];
  warnings: AutoAssignWarning[];
  totals: { schedules: number; slots: number; assigned: number; missing: number };
}

export interface MyDutyItem {
  assignmentId: number;
  assignmentStatus: AssignmentStatus;
  schedule: DutySchedule;
}

/** Chuẩn hoá lỗi backend: { success, code, message, timestamp } */
export interface ApiErrorBody {
  success: false;
  code: string;
  message: string;
  timestamp: string;
}

export interface SessionUser {
  sub: string;
  role: Role;
  name: string;
  employeeId?: number;
  title: string;
}
