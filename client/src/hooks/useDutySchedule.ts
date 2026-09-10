import { useMutation, useQuery } from "@tanstack/react-query";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import type { CalendarFilter } from "../api/dutySchedule.api";
import { employeeApi } from "../api/employee.api";
import { shiftApi } from "../api/shift.api";
import { dayOffApi } from "../api/dayOff.api";

export const qk = {
  calendar: (f: CalendarFilter) => ["calendar", f] as const,
  schedule: (id: number) => ["schedule", id] as const,
  myDuty: () => ["my-duty"] as const,
  employees: () => ["employees"] as const,
  departments: () => ["departments"] as const,
  shifts: () => ["shifts"] as const,
  dayOffs: () => ["day-offs"] as const,
};

export function useCalendar(filter: CalendarFilter) {
  return useQuery({ queryKey: qk.calendar(filter), queryFn: () => dutyScheduleApi.calendar(filter) });
}
export function useScheduleDetail(id: number | undefined) {
  return useQuery({
    queryKey: qk.schedule(id ?? -1),
    queryFn: () => dutyScheduleApi.get(id!),
    enabled: !!id,
  });
}
export function useMyDuty(from?: string, to?: string) {
  return useQuery({ queryKey: qk.myDuty(), queryFn: () => dutyScheduleApi.myCalendar(from, to) });
}
export function useEmployees() {
  return useQuery({ queryKey: qk.employees(), queryFn: employeeApi.list });
}
export function useDepartments() {
  return useQuery({ queryKey: qk.departments(), queryFn: employeeApi.departments });
}
export function useShifts() {
  return useQuery({ queryKey: qk.shifts(), queryFn: shiftApi.list });
}
export function useDayOffs() {
  return useQuery({ queryKey: qk.dayOffs(), queryFn: dayOffApi.list });
}

/** Gom toàn bộ mutation ca trực để pages gọi gọn */
export function useScheduleMutations() {
  return {
    create: useMutation({ mutationFn: dutyScheduleApi.create }),
    update: useMutation({ mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof dutyScheduleApi.update>[1] }) => dutyScheduleApi.update(id, payload) }),
    confirm: useMutation({ mutationFn: dutyScheduleApi.confirm }),
    lock: useMutation({ mutationFn: dutyScheduleApi.lock }),
    cancel: useMutation({ mutationFn: dutyScheduleApi.cancel }),
    remove: useMutation({ mutationFn: dutyScheduleApi.remove }),
    addAssignment: useMutation({ mutationFn: ({ scheduleId, employeeId }: { scheduleId: number; employeeId: number }) => dutyScheduleApi.addAssignment(scheduleId, employeeId) }),
    replaceAssignment: useMutation({ mutationFn: ({ scheduleId, assignmentId, employeeId }: { scheduleId: number; assignmentId: number; employeeId: number }) => dutyScheduleApi.replaceAssignment(scheduleId, assignmentId, employeeId) }),
    removeAssignment: useMutation({ mutationFn: ({ scheduleId, assignmentId }: { scheduleId: number; assignmentId: number }) => dutyScheduleApi.removeAssignment(scheduleId, assignmentId) }),
    confirmAssignment: useMutation({ mutationFn: ({ scheduleId, assignmentId }: { scheduleId: number; assignmentId: number }) => dutyScheduleApi.confirmAssignment(scheduleId, assignmentId) }),
    declineAssignment: useMutation({ mutationFn: ({ scheduleId, assignmentId }: { scheduleId: number; assignmentId: number }) => dutyScheduleApi.declineAssignment(scheduleId, assignmentId) }),
  };
}
