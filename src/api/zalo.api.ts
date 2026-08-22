import { apiClient } from "./http";
import type { ZaloEmployeeRow, ZaloStatus } from "../types/duty";

export const zaloApi = {
  status: () => apiClient.get<ZaloStatus>("/api/integrations/zalo/status").then((r) => r.data),
  connect: () =>
    apiClient.get<{ authorizationUrl: string; state: string }>("/api/integrations/zalo/connect").then((r) => r.data),
  /** Demo OAuth callback: backend thật sẽ exchange code → lưu mapping (GET /callback) */
  completeConnect: () => apiClient.post<ZaloStatus>("/api/integrations/zalo/connect/complete").then((r) => r.data),
  disconnect: () => apiClient.post<ZaloStatus>("/api/integrations/zalo/disconnect").then((r) => r.data),
  setPreferences: (receiveNotifications: boolean) =>
    apiClient.put<ZaloStatus>("/api/integrations/zalo/preferences", { receiveNotifications }).then((r) => r.data),
  employees: () => apiClient.get<ZaloEmployeeRow[]>("/api/integrations/zalo/employees").then((r) => r.data),
  getDevFailure: () => apiClient.get<{ enabled: boolean }>("/api/integrations/zalo/dev-failure").then((r) => r.data),
  setDevFailure: (enabled: boolean) =>
    apiClient.put<{ enabled: boolean }>("/api/integrations/zalo/dev-failure", { enabled }).then((r) => r.data),
};
