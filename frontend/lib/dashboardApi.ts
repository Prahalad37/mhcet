import { api, noErrorToast } from "./api";

export interface DashboardStats {
  totalTests: number;
  overallAccuracy: number | null;
  practiceAnswered: number;
  activeDays: number;
}

export interface RecentAttempt {
  attemptId: string;
  testId: string;
  title: string;
  topic: string;
  score: number;
  total: number;
  accuracy: number | null;
  submittedAt: string;
}

export interface WeakSubject {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface InProgress {
  attemptId: string;
  testId: string;
  title: string;
}

export interface NextTest {
  id: string;
  title: string;
  topic: string;
  questionCount: number;
  durationSeconds: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentAttempts: RecentAttempt[];
  weakSubjects: WeakSubject[];
  inProgress: InProgress | null;
  nextTest: NextTest | null;
}

export async function getDashboard(): Promise<DashboardData> {
  return api<DashboardData>("/api/dashboard", noErrorToast);
}
