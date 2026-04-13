import { api, noErrorToast } from "./api";

export async function deleteMyAttempt(attemptId: string): Promise<void> {
  await api<{ message: string }>(`/api/attempts/${attemptId}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function clearMyAttemptHistory(): Promise<{
  message: string;
  removed: number;
}> {
  return api<{ message: string; removed: number }>(
    "/api/attempts/clear-history",
    {
      method: "POST",
      ...noErrorToast,
    }
  );
}
