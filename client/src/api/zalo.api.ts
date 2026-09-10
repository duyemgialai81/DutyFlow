import { apiClient } from "./http";
import type { ZaloEmployeeRow, ZaloStatus } from "../types/duty";

export interface ZaloAppConfig {
  appId: string;
  appSecretMasked: string;
  isConfigured: boolean;
}

export const zaloApi = {
  status: () => apiClient.get<ZaloStatus>("/api/integrations/zalo/status").then((r) => r.data),
  connect: () =>
    apiClient.get<{ authorizationUrl: string; state: string }>("/api/integrations/zalo/connect").then((r) => r.data),
  completeConnect: (body?: { zaloUserId?: string }) =>
    apiClient.post<ZaloStatus>("/api/integrations/zalo/connect/complete", body ?? {}).then((r) => r.data),
  connectForEmployee: (employeeId: number, zaloUserId?: string) =>
    apiClient.post<ZaloStatus>(`/api/integrations/zalo/connect/employee/${employeeId}`, { zaloUserId }).then((r) => r.data),
  disconnect: () => apiClient.post<ZaloStatus>("/api/integrations/zalo/disconnect").then((r) => r.data),
  setPreferences: (receiveNotifications: boolean) =>
    apiClient.put<ZaloStatus>("/api/integrations/zalo/preferences", { receiveNotifications }).then((r) => r.data),
  employees: () => apiClient.get<ZaloEmployeeRow[]>("/api/integrations/zalo/employees").then((r) => r.data),
  getDevFailure: () => apiClient.get<{ enabled: boolean }>("/api/integrations/zalo/dev-failure").then((r) => r.data),
  setDevFailure: (enabled: boolean) =>
    apiClient.put<{ enabled: boolean }>("/api/integrations/zalo/dev-failure", { enabled }).then((r) => r.data),
  // Admin: cấu hình Zalo App (App ID + Secret) trực tiếp trên UI
  getAppConfig: () => apiClient.get<ZaloAppConfig>("/api/integrations/zalo/app-config").then((r) => r.data),
  saveAppConfig: (appId: string, appSecret: string) =>
    apiClient.put<ZaloAppConfig>("/api/integrations/zalo/app-config", { appId, appSecret }).then((r) => r.data),
};

