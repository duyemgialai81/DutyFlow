import { useMutation, useQuery } from "@tanstack/react-query";
import { dutyScheduleApi } from "../api/dutySchedule.api";
import type { AutoAssignPayload } from "../api/dutySchedule.api";
import type { AutoAssignPreviewResponse } from "../types/duty";

/** Preview được cache theo đúng payload → bấm "Phân lịch lại" mới refetch */
export function useAutoAssignPreview(payload: AutoAssignPayload | null) {
  return useQuery({
    queryKey: ["auto-assign-preview", payload],
    queryFn: () => dutyScheduleApi.autoAssignPreview(payload!),
    enabled: !!payload,
  }) as ReturnType<typeof useQuery<AutoAssignPreviewResponse>>;
}

export function useAutoAssignConfirm() {
  return useMutation({ mutationFn: dutyScheduleApi.autoAssignConfirm });
}

export function usePreviewRefetch() {
  // helper: tạo key mới để ép tính lại preview
  return (p: AutoAssignPayload) => ({ ...p });
}
