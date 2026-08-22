import { apiClient } from "./http";
import type { DayOff } from "../types/duty";

export const dayOffApi = {
  list: () => apiClient.get<DayOff[]>("/api/day-offs").then((r) => r.data),
  create: (p: { date: string; reason: string; employeeId?: number }) =>
    apiClient.post<DayOff>("/api/day-offs", p).then((r) => r.data),
  updateStatus: (id: number, status: "APPROVED" | "REJECTED") =>
    apiClient.put<DayOff>(`/api/day-offs/${id}`, { status }).then((r) => r.data),
  remove: (id: number) => apiClient.delete<{ success: boolean }>(`/api/day-offs/${id}`).then((r) => r.data),
};
