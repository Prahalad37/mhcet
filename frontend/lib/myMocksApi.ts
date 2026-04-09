import { api, noErrorToast } from "./api";
import type { AdminTest, AdminQuestion } from "./types";

/** User-owned test from GET /api/tests/:id may include questions (not on list type). */
type TestDetailWithQuestions = AdminTest & { questions?: AdminQuestion[] };

export async function getAdminTests(): Promise<AdminTest[]> {
  return api<AdminTest[]>("/api/tests/my", noErrorToast);
}

export async function getAdminTest(id: string): Promise<AdminTest> {
  return api<AdminTest>(`/api/tests/${id}`, noErrorToast);
}

export async function createTest(data: {
  title: string;
  description?: string;
  durationSeconds: number;
  topic: string;
  isActive?: boolean;
}): Promise<AdminTest> {
  return api<AdminTest>("/api/tests", {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateTest(
  id: string,
  data: Record<string, unknown>
): Promise<AdminTest> {
  return api<AdminTest>(`/api/tests/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteTest(id: string, force = false): Promise<unknown> {
  return api<unknown>(`/api/tests/${id}?force=${force}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function toggleTestActive(id: string): Promise<AdminTest> {
  return api<AdminTest>(`/api/tests/${id}/toggle`, {
    method: "POST",
    ...noErrorToast,
  });
}

export async function getTestQuestions(testId: string): Promise<AdminQuestion[]> {
  const testInfo = await api<TestDetailWithQuestions>(
    `/api/tests/${testId}`,
    noErrorToast
  );
  return testInfo.questions ?? [];
}

export async function getQuestion(id: string): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/questions/${id}`, noErrorToast);
}

export async function createQuestion(
  testId: string,
  data: Record<string, unknown>
): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/${testId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateQuestion(
  id: string,
  data: Record<string, unknown>
): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteQuestion(id: string): Promise<unknown> {
  return api<unknown>(`/api/tests/questions/${id}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function reorderQuestions(
  testId: string,
  questionIds: string[]
): Promise<unknown> {
  return api<unknown>(`/api/tests/${testId}/questions/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ questionIds }),
    ...noErrorToast,
  });
}
