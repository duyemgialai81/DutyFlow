import { apiClient } from "./http";
import type { Shift } from "../types/duty";

export const shiftApi = {
  list: () => apiClient.get<Shift[]>("/api/shifts").then((r) => r.data),
};
