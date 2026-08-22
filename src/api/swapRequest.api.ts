import { apiClient } from "./http";
import type { SwapRequest } from "../types/duty";

export const swapRequestApi = {
  list: () => apiClient.get<SwapRequest[]>("/api/swap-requests").then((r) => r.data),
  create: (p: { assignmentId: number; reason: string }) =>
    apiClient.post<SwapRequest>("/api/swap-requests", p).then((r) => r.data),
  updateStatus: (id: number, status: "APPROVED" | "REJECTED" | "CANCELLED") =>
    apiClient.put<SwapRequest>(`/api/swap-requests/${id}`, { status }).then((r) => r.data),
};
