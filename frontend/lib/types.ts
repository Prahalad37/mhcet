export type TestSummary = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  topic: string;
  questionCount: number;
};

export type QuestionPublic = {
  id: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  orderIndex: number;
  /** Present when the API returns per-question subjects (e.g. GET /api/tests/:id for instructions). */
  subject?: string | null;
};

export type TestDetail = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  topic: string;
  questions: QuestionPublic[];
};

export type TopicStat = {
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
};

export type RecommendedTest = TestSummary & {
  reason: string;
};

export type AnalyticsInsights = {
  topicStats: TopicStat[];
  weakTopics: string[];
  primaryWeakTopic: string | null;
  insightMessage: string | null;
  recommendedTests: RecommendedTest[];
};

export type AttemptStart = {
  attemptId: string;
  /** Present on new starts (POST) and resumes (GET) for in-app headers. */
  testId?: string;
  testTitle?: string | null;
  testTopic?: string | null;
  startedAt: string;
  /** Server-authoritative deadline (ISO). Prefer this over startedAt + duration for the timer. */
  endsAt?: string;
  durationSeconds: number;
  totalQuestions: number;
  questions: QuestionPublic[];
};

/** GET /api/attempts/:id/resume */
export type AttemptResume = AttemptStart & {
  testId: string;
  selections: Record<string, "A" | "B" | "C" | "D">;
};

export type AppConfig = {
  /** free = daily cap on new mock attempts (UTC); paid = unlimited */
  plan?: "free" | "paid";
  testsTodayUtc?: number;
  freeTestsPerDay?: number;
  canStartMock?: boolean;
  /** False when AI is disabled or Redis/worker is not configured */
  explainAvailable?: boolean;
  aiProvider?: string;
};

/** POST /api/explain job result (GET /api/jobs/:id when completed) */
export type AiExplainResult = {
  answer: string;
  explanation: string;
  concept: string;
  example: string;
  cached?: boolean;
  model?: string;
};

export type AttemptSubmit = {
  attemptId: string;
  score: number;
};

/** GET /api/attempts — in_progress + submitted */
export type AttemptHistoryItem = {
  attemptId: string;
  testId: string;
  testTitle: string;
  topic: string;
  status: "submitted" | "in_progress";
  score: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
};

export type ResultsResponse = {
  attemptId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  submittedAt: string;
  durationSeconds: number;
  questions: Array<
    QuestionPublic & {
      correctOption: string;
      selectedOption: string | null;
      isCorrect: boolean | null;
      /** Short note; results only */
      hint: string | null;
      /** Longer text for static explain modal; results only */
      officialExplanation: string | null;
    }
  >;
};

/** GET /api/attempts/:id/result — Phase 9 analytics report */
export type AttemptResultResponse = {
  attemptId: string;
  testId: string;
  testTitle: string;
  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
  timeTakenSeconds: number;
  totalQuestions: number;
  attempted: number;
  unattempted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  score: number;
  passStatus: boolean;
  responses: AttemptResultQuestion[];
};

export type AttemptResultQuestion = {
  questionId: string;
  orderIndex: number;
  prompt: string;
  selectedOption: string | null;
  selectedOptionText: string | null;
  correctOption: string;
  correctOptionText: string | null;
  isCorrect: boolean;
  explanation: string | null;
};

/* ── Practice mode ────────────────────────────── */

export type PracticeSubject = {
  subject: string;
  questionCount: number;
};

export type PracticeSession = {
  sessionId: string;
  subject: string;
  startedAt: string;
  totalQuestions: number;
  questions: QuestionPublic[];
};

export type PracticeCheckResult = {
  correct: boolean;
  correctOption: string;
  hint: string | null;
  officialExplanation: string | null;
};

export type PracticeComplete = {
  sessionId: string;
  subject: string;
  totalQuestions: number;
  correct: number;
  startedAt: string;
  completedAt: string;
};


/** Logged-in user from `/api/auth/login`, `/api/auth/register`, `/api/auth/me`. */
export type AuthUser = {
  id: string;
  email: string;
  role: string;
  tenantId?: string | null;
  /** B2B coaching brand; null/undefined for B2C (PrepMaster platform). */
  tenantName?: string | null;
};

/* ── Admin types ────────────────────────────── */

export type AdminStats = {
  total_users: number;
  admin_users: number;
  total_tests: number;
  active_tests: number;
  total_questions: number;
  total_attempts: number;
  completed_attempts: number;
  practice_sessions: number;
};

export type AdminTest = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  topic: string;
  isActive: boolean;
  createdAt: string;
  questionCount: number;
  /** B2B institute; null/undefined = global catalog (B2C). */
  tenantId?: string | null;
  /** From `GET /api/admin/tests` (joined `tenants.name`). */
  tenantName?: string | null;
};

export type AdminQuestion = {
  id: string;
  testId: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  subject: string;
  hint: string | null;
  officialExplanation: string | null;
  orderIndex: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'paid';
  tenantId?: string | null;
  /** From `GET /api/admin/users` (joined tenants.name) */
  tenantName?: string | null;
  createdAt: string;
  attemptCount: number;
  lastLogin: string | null;
};

export type AdminTenant = {
  id: string;
  name: string;
  domain: string | null;
  status: "active" | "inactive";
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogsResponse = {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ImportResult = {
  success: boolean;
  imported: number;
  total: number;
  errors: string[] | null;
  testTitle: string;
  questions: Array<{ id: string; prompt: string }>;
};
