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
  explainAvailable: boolean;
  /** Backend hint: mock | openai | local */
  aiProvider?: string;
  /** free = daily cap on new mock attempts (UTC); paid = unlimited */
  plan?: "free" | "paid";
  testsTodayUtc?: number;
  freeTestsPerDay?: number;
  canStartMock?: boolean;
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

/** Matches POST /api/explain response */
export type ExplainResponse = {
  answer: string;
  explanation: string;
  concept: string;
  example: string;
};

export type ExplainRequestBody = {
  attemptId: string;
  questionId: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
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
  createdAt: string;
  attemptCount: number;
  lastLogin: string | null;
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
