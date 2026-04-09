import { api, noErrorToast } from "./api";
import { getApiBaseUrl } from "./apiBaseUrl";
import { getToken } from "./auth";
import { toastErrorSafe } from "./sonnerToast";
import type {
  AdminStats,
  AdminTest,
  AdminQuestion,
  AdminUser,
  AdminTenant,
  AuditLog,
  AuditLogsResponse,
  ImportResult,
} from "./types";
import { pollJob } from "./jobPoll";

const API_BASE = getApiBaseUrl();

// ============================================================================
// DASHBOARD & STATS
// ============================================================================

export async function getAdminStats(): Promise<AdminStats> {
  return api<AdminStats>("/api/admin/stats", noErrorToast);
}

// ============================================================================
// TESTS MANAGEMENT
// ============================================================================

export async function getAdminTests(): Promise<AdminTest[]> {
  return api<AdminTest[]>("/api/admin/tests", noErrorToast);
}

export async function getAdminTest(id: string): Promise<AdminTest> {
  return api<AdminTest>(`/api/admin/tests/${id}`, noErrorToast);
}

export async function createTest(data: {
  title: string;
  description?: string;
  durationSeconds: number;
  topic: string;
  isActive?: boolean;
  /** Omit = global; `null` or `""` clears / platform catalog. */
  tenantId?: string | null | "";
}): Promise<AdminTest> {
  return api<AdminTest>("/api/admin/tests", {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateTest(id: string, data: Partial<{
  title: string;
  description: string;
  durationSeconds: number;
  topic: string;
  isActive: boolean;
  tenantId: string | null | "";
}>): Promise<AdminTest> {
  return api<AdminTest>(`/api/admin/tests/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteTest(id: string, force = false): Promise<{ message: string; test?: AdminTest }> {
  return api<{ message: string; test?: AdminTest }>(`/api/admin/tests/${id}?force=${force}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function toggleTestActive(id: string): Promise<AdminTest> {
  return api<AdminTest>(`/api/admin/tests/${id}/toggle`, {
    method: "POST",
    ...noErrorToast,
  });
}

// ============================================================================
// QUESTIONS MANAGEMENT
// ============================================================================

export async function getTestQuestions(testId: string): Promise<AdminQuestion[]> {
  return api<AdminQuestion[]>(`/api/admin/tests/${testId}/questions`, noErrorToast);
}

export async function getQuestion(id: string): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/admin/questions/${id}`, noErrorToast);
}

export async function createQuestion(testId: string, data: {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  subject: string;
  hint?: string;
  officialExplanation?: string;
  orderIndex?: number;
}): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/admin/tests/${testId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateQuestion(id: string, data: Partial<{
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  subject: string;
  hint: string;
  officialExplanation: string;
  orderIndex: number;
}>): Promise<AdminQuestion> {
  return api<AdminQuestion>(`/api/admin/questions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function deleteQuestion(id: string): Promise<{ message: string }> {
  return api<{ message: string }>(`/api/admin/questions/${id}`, {
    method: "DELETE",
    ...noErrorToast,
  });
}

export async function reorderQuestions(testId: string, questionIds: string[]): Promise<{ message: string }> {
  return api<{ message: string }>("/api/admin/questions/reorder", {
    method: "POST",
    body: JSON.stringify({ testId, questionIds }),
    ...noErrorToast,
  });
}

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

export async function getAdminUsers(): Promise<AdminUser[]> {
  return api<AdminUser[]>("/api/admin/users", noErrorToast);
}

export async function updateUserRole(id: string, role: 'user' | 'admin'): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
    ...noErrorToast,
  });
}

export async function updateUserPlan(id: string, plan: "free" | "paid"): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/plan`, {
    method: "PUT",
    body: JSON.stringify({ plan }),
    ...noErrorToast,
  });
}

/** Assign or clear B2B tenant (`tenantId: null` = B2C / PrepMaster platform). */
export async function updateUserTenant(
  id: string,
  tenantId: string | null
): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ tenantId }),
    ...noErrorToast,
  });
}

// ============================================================================
// TENANTS (B2B institutes)
// ============================================================================

export async function getTenants(): Promise<AdminTenant[]> {
  return api<AdminTenant[]>("/api/admin/tenants", noErrorToast);
}

export async function createTenant(data: {
  name: string;
  domain?: string;
}): Promise<AdminTenant> {
  return api<AdminTenant>("/api/admin/tenants", {
    method: "POST",
    body: JSON.stringify(data),
    ...noErrorToast,
  });
}

export async function updateTenantStatus(
  id: string,
  status: "active" | "inactive"
): Promise<AdminTenant> {
  return api<AdminTenant>(`/api/admin/tenants/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
    ...noErrorToast,
  });
}

// ============================================================================
// BULK IMPORT
// ============================================================================

export async function getCSVTemplate(): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/admin/import/template`, {
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
  });
  
  if (!response.ok) {
    toastErrorSafe("Failed to download template");
    throw new Error("Failed to download template");
  }
  
  return response.blob();
}

export async function importQuestionsCSV(testId: string, file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('csvFile', file);
  
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/admin/import/questions/${testId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token || ''}`,
    },
    body: formData,
  });
  
  const data = await response.json();

  if (response.status === 202 && data && typeof data.jobId === "string") {
    return pollJob<ImportResult>(data.jobId);
  }

  if (!response.ok) {
    const errMsg =
      typeof data?.error === "string" ? data.error : "Import failed";
    toastErrorSafe(errMsg);
    throw new Error(errMsg);
  }

  return data as ImportResult;
}

export async function importQuestionsText(testId: string, csvText: string): Promise<ImportResult> {
  const base = getApiBaseUrl();
  const token = getToken();
  const response = await fetch(`${base}/api/admin/import/questions/${testId}/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ csvText }),
  });
  const data = await response.json();
  if (response.status === 202 && data && typeof data.jobId === "string") {
    return pollJob<ImportResult>(data.jobId);
  }
  if (!response.ok) {
    const errMsg =
      typeof data?.error === "string" ? data.error : "Import failed";
    toastErrorSafe(errMsg);
    throw new Error(errMsg);
  }
  return data as ImportResult;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  userId?: string;
  resourceType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  
  const query = searchParams.toString();
  return api<AuditLogsResponse>(`/api/audit/logs${query ? `?${query}` : ''}`, noErrorToast);
}

export async function getResourceAuditLogs(resourceType: string, resourceId: string): Promise<AuditLog[]> {
  return api<AuditLog[]>(`/api/audit/resource/${resourceType}/${resourceId}`, noErrorToast);
}