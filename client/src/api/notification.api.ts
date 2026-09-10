import { apiClient } from "./http";
import type { AppNotification } from "../types/duty";

export const notificationApi = {
  list: (all = false) =>
    apiClient.get<AppNotification[]>("/api/notifications", { params: { all: String(all) } }).then((r) => r.data),
  unreadCount: () => apiClient.get<{ count: number }>("/api/notifications/unread-count").then((r) => r.data.count),
  markRead: (id: number) => apiClient.put<{ success: boolean }>(`/api/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.put<{ success: boolean }>("/api/notifications/read-all").then((r) => r.data),
};
