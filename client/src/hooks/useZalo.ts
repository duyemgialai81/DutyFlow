import { useMutation, useQuery } from "@tanstack/react-query";
import { zaloApi } from "../api/zalo.api";

export const zaloKeys = {
  status: () => ["zalo-status"] as const,
  employees: () => ["zalo-employees"] as const,
  devFailure: () => ["zalo-dev-failure"] as const,
  appConfig: () => ["zalo-app-config"] as const,
};

export function useZaloStatus() {
  return useQuery({ queryKey: zaloKeys.status(), queryFn: zaloApi.status });
}
export function useZaloEmployees() {
  return useQuery({ queryKey: zaloKeys.employees(), queryFn: zaloApi.employees });
}
export function useZaloDevFailure() {
  return useQuery({ queryKey: zaloKeys.devFailure(), queryFn: zaloApi.getDevFailure });
}
export function useZaloAppConfig() {
  return useQuery({ queryKey: zaloKeys.appConfig(), queryFn: zaloApi.getAppConfig });
}

export function useZaloMutations() {
  return {
    connect: useMutation({ mutationFn: zaloApi.connect }),
    completeConnect: useMutation({ mutationFn: (body?: { zaloUserId?: string }) => zaloApi.completeConnect(body) }),
    connectForEmployee: useMutation({
      mutationFn: ({ employeeId, zaloUserId }: { employeeId: number; zaloUserId?: string }) =>
        zaloApi.connectForEmployee(employeeId, zaloUserId),
    }),
    disconnect: useMutation({ mutationFn: zaloApi.disconnect }),
    setPreferences: useMutation({ mutationFn: zaloApi.setPreferences }),
    setDevFailure: useMutation({ mutationFn: zaloApi.setDevFailure }),
    saveAppConfig: useMutation({
      mutationFn: ({ appId, appSecret }: { appId: string; appSecret: string }) =>
        zaloApi.saveAppConfig(appId, appSecret),
    }),
  };
}

