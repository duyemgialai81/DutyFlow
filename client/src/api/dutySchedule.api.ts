import { apiClient } from "./http";
import type {
  AutoAssignPreviewResponse, CalendarResponse, DutySchedule, MyDutyItem, ScheduleDetail, ScheduleHistoryEntry,
} from "../types/duty";

export interface CreateSchedulePayload {
  date: string;
  shiftId: number;
  requiredPeople: number;
  location: string;
  departmentId?: number | null;
  status?: "DRAFT" | "CONFIRMED";
}

export interface AutoAssignPayload {
  startDate: string;
  endDate: string;
  shiftId: number;
  departmentId?: number | null;
  requiredPeople: number;
  location: string;
}

export interface CalendarFilter {
  month: string; // yyyy-MM
  departmentId?: number;
  shiftId?: number;
  status?: string;
  employeeId?: number;
}

const unwrap = <T,>(r: { data: T }) => r.data;

function normalizeScheduleDetail(
  data: ScheduleDetail | { schedule: DutySchedule; history: ScheduleHistoryEntry[] },
): ScheduleDetail {
  if ("schedule" in data) return { ...data.schedule, history: data.history };
  return data;
}

export interface ScheduleSearchCriteria {
  keyword?: string;
  departmentId?: number;
  shiftId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface SearchScheduleDoc {
  scheduleId: number;
  date: string;
  shiftId?: number;
  shiftCode?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  departmentId?: number;
  departmentName?: string;
  location?: string;
  status: string;
  requiredPeople: number;
  assignedCount: number;
  assignedEmployees: Array<{
    employeeId: number;
    employeeCode: string;
    fullName: string;
    phone: string;
    assignmentStatus: string;
  }>;
}

export const dutyScheduleApi = {
  calendar: (f: CalendarFilter) =>
    apiClient.get<CalendarResponse>("/api/duty-schedules/calendar", {
      params: {
        month: f.month,
        departmentId: f.departmentId,
        shiftId: f.shiftId,
        status: f.status,
        employeeId: f.employeeId,
      },
    }).then(unwrap),

  /** Lịch trực khoa phòng cấp Tổ trưởng (Tiered RBAC V1) */
  leaderDepartmentCalendar: (departmentId: number, month: string, shiftId?: number, status?: string) =>
    apiClient.get<CalendarResponse>(`/api/v1/leader/departments/${departmentId}/schedules`, {
      params: { month, shiftId, status }
    }).then(unwrap),

  /** Lịch trực cá nhân nhân viên (Ưu tiên gọi Tiered RBAC V1) */
  myCalendar: async (from?: string, to?: string): Promise<{ items: MyDutyItem[] }> => {
    try {
      const data = await apiClient.get<any>("/api/v1/employee/me/schedules", { params: { from, to } }).then(unwrap);
      const items = Array.isArray(data) ? data : (data?.items ?? []);
      return { items };
    } catch {
      return apiClient.get<{ items: MyDutyItem[] }>("/api/duty-schedules/my-calendar", { params: { from, to } }).then(unwrap);
    }
  },

  get: (id: number) =>
    apiClient.get<ScheduleDetail | { schedule: DutySchedule; history: ScheduleHistoryEntry[] }>(`/api/duty-schedules/${id}`)
      .then(unwrap)
      .then(normalizeScheduleDetail),

  create: (p: CreateSchedulePayload) =>
    apiClient.post<DutySchedule>("/api/duty-schedules", p).then(unwrap),

  update: (id: number, p: Partial<CreateSchedulePayload>) =>
    apiClient.put<DutySchedule>(`/api/duty-schedules/${id}`, p).then(unwrap),

  remove: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/api/duty-schedules/${id}`).then(unwrap),

  confirm: (id: number) => apiClient.post<DutySchedule>(`/api/duty-schedules/${id}/confirm`).then(unwrap),
  lock: (id: number) => apiClient.post<DutySchedule>(`/api/duty-schedules/${id}/lock`).then(unwrap),
  cancel: (id: number) => apiClient.post<DutySchedule>(`/api/duty-schedules/${id}/cancel`).then(unwrap),

  autoAssignPreview: (p: AutoAssignPayload) =>
    apiClient.post<AutoAssignPreviewResponse>("/api/duty-schedules/auto-assign/preview", p).then(unwrap),

  autoAssignConfirm: (p: AutoAssignPayload) =>
    apiClient.post<{
      success: boolean; created: number;
      totals: { schedules: number; slots: number; assigned: number; missing: number };
    }>("/api/duty-schedules/auto-assign/confirm", p).then(unwrap),

  addAssignment: (scheduleId: number, employeeId: number) =>
    apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments`, { employeeId }).then(unwrap),

  replaceAssignment: (scheduleId: number, assignmentId: number, employeeId: number) =>
    apiClient.put<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}`, { employeeId }).then(unwrap),

  removeAssignment: (scheduleId: number, assignmentId: number) =>
    apiClient.delete<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}`).then(unwrap),

  /** Nhân viên xác nhận ca trực cá nhân (Ưu tiên V1 Tiered API) */
  confirmAssignment: async (scheduleId: number, assignmentId: number) => {
    try {
      return await apiClient.post<DutySchedule>(`/api/v1/employee/me/schedules/${scheduleId}/assignments/${assignmentId}/confirm`).then(unwrap);
    } catch {
      return await apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}/confirm`).then(unwrap);
    }
  },

  declineAssignment: (scheduleId: number, assignmentId: number) =>
    apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}/decline`).then(unwrap),

  /* =========================================================================
   * HỆ THỐNG TRA CỨU & QUẢN TRỊ CHỈ MỤC SIÊU TỐC ELASTICSEARCH V1
   * ========================================================================= */

  /** Quản trị viên tìm kiếm ca trực toàn viện */
  searchAdmin: (criteria: ScheduleSearchCriteria) =>
    apiClient.get<PageResponse<SearchScheduleDoc>>("/api/v1/admin/schedules/search", { params: criteria }).then(unwrap),

  /** Tổ trưởng tìm kiếm ca trực trong khoa phụ trách */
  searchLeader: (departmentId: number, criteria: ScheduleSearchCriteria) =>
    apiClient.get<PageResponse<SearchScheduleDoc>>(`/api/v1/leader/departments/${departmentId}/schedules/search`, { params: criteria }).then(unwrap),

  /** Nhân viên tìm kiếm ca trực của chính mình */
  searchEmployee: (criteria: ScheduleSearchCriteria) =>
    apiClient.get<PageResponse<SearchScheduleDoc>>("/api/v1/employee/me/schedules/search", { params: criteria }).then(unwrap),

  /** Tìm kiếm thông minh tự phân cấp theo quyền hạn */
  searchSmart: (criteria: ScheduleSearchCriteria, role?: string, departmentId?: number) => {
    if (role === "ADMIN") {
      return dutyScheduleApi.searchAdmin(criteria);
    }
    if (role === "LEADER" && departmentId) {
      return dutyScheduleApi.searchLeader(departmentId, criteria);
    }
    return dutyScheduleApi.searchEmployee(criteria);
  },

  /** Tái tạo và đồng bộ chỉ mục Elasticsearch */
  reindex: () =>
    apiClient.post<void>("/api/v1/admin/schedules/reindex").then(unwrap),

  /** Chỉ số vận hành & hiệu năng máy chủ */
  systemMetrics: () =>
    apiClient.get<{
      status: string;
      totalMemoryMb: number;
      freeMemoryMb: number;
      maxMemoryMb: number;
      availableProcessors: number;
      timestamp: string;
    }>("/api/v1/admin/system/metrics").then(unwrap),
};
