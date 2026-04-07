import { ApiError } from "./api";

type ErrorContext = "default";

function messageForStatus(
  status: number,
  message: string,
  context: ErrorContext
): string {
  if (status === 0) {
    // Network errors - message should already be user-friendly from api.ts
    return message || "Network error. Check your connection and ensure the API server is running.";
  }
  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status === 404 || status === 409) {
    return message || "The requested resource was not found.";
  }
  if (status === 400) {
    return message || "Please check the submitted data and try again.";
  }
  if (status === 429) {
    return (
      message || "Too many requests. Wait a moment and then try again."
    );
  }
  if (status === 502) {

    return "The server is temporarily unavailable. Please wait a moment and try again.";
  }
  if (status === 503) {

    return "The service is temporarily down for maintenance. Please try again in a few minutes.";
  }
  if (status === 504) {
    return "The request timed out. Please try again.";
  }
  if (status >= 500) {
    return "A server error occurred. Please try again, and if the problem persists, contact support.";
  }
  return message || "Something went wrong.";
}

export function getUserErrorMessage(
  error: unknown,
  options: { fallback?: string; context?: ErrorContext } = {}
): string {
  const { fallback = "Something went wrong.", context = "default" } = options;
  if (error instanceof ApiError) {
    return messageForStatus(error.status, error.message, context);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
