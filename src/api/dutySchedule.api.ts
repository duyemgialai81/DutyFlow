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

  myCalendar: (from?: string, to?: string) =>
    apiClient.get<{ items: MyDutyItem[] }>("/api/duty-schedules/my-calendar", { params: { from, to } }).then(unwrap),

  get: (id: number) =>
    apiClient.get<ScheduleDetail & { history: ScheduleHistoryEntry[] }>(`/api/duty-schedules/${id}`).then(unwrap),

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
    apiClient.post<{ success: boolean; created: number }>("/api/duty-schedules/auto-assign/confirm", p).then(unwrap),

  addAssignment: (scheduleId: number, employeeId: number) =>
    apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments`, { employeeId }).then(unwrap),

  replaceAssignment: (scheduleId: number, assignmentId: number, employeeId: number) =>
    apiClient.put<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}`, { employeeId }).then(unwrap),

  removeAssignment: (scheduleId: number, assignmentId: number) =>
    apiClient.delete<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}`).then(unwrap),

  confirmAssignment: (scheduleId: number, assignmentId: number) =>
    apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}/confirm`).then(unwrap),

  declineAssignment: (scheduleId: number, assignmentId: number) =>
    apiClient.post<DutySchedule>(`/api/duty-schedules/${scheduleId}/assignments/${assignmentId}/decline`).then(unwrap),
};
