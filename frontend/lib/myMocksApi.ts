import { api, noErrorToast } from "./api";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getToken } from "./auth";
import { toastErrorSafe } from "./sonnerToast";
import type { AdminTest, AdminQuestion } from "./types";

const API_BASE = getApiBaseUrl();

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

export async function updateTest(id: string, data: Partial<any>): Promise<AdminTest> {
  // Mocked for user side simplicity unless fully fleshed out
  return api<AdminTest>(`/api/tests/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteTest(id: string, force = false): Promise<any> {
  return api<any>(`/api/tests/${id}?force=${force}`, {
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
  // tests.js already returns questions on GET /api/tests/:id
  const testInfo = await getAdminTest(testId);
  return (testInfo as any).questions;
}

export async function getQuestion(id: string): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/questions/${id}`, noErrorToast);
}

export async function createQuestion(testId: string, data: any): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/${testId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateQuestion(id: string, data: any): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/tests/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteQuestion(id: string): Promise<any> {
  return api<any>(`/api/tests/questions/${id}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function reorderQuestions(testId: string, questionIds: string[]): Promise<any> {
  return api<any>(`/api/tests/${testId}/questions/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ questionIds }),
    ...noErrorToast,
  });
}