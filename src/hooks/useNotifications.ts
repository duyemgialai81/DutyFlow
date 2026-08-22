import { useMutation, useQuery } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";

export const notifKeys = {
  list: (all: boolean) => ["notifications", all] as const,
  unread: () => ["notifications-unread"] as const,
};

export function useNotifications(all = false) {
  return useQuery({
    queryKey: notifKeys.list(all),
    queryFn: () => notificationApi.list(all),
    refetchInterval: 6000, // fallback khi event bus không available (backend thật: SSE/WebSocket)
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread(),
    queryFn: notificationApi.unreadCount,
    refetchInterval: 6000,
  });
}

export function useNotificationMutations() {
  return {
    markRead: useMutation({ mutationFn: notificationApi.markRead }),
    markAllRead: useMutation({ mutationFn: notificationApi.markAllRead }),
  };
}
