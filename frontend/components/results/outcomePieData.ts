/** Shared with results page useMemo — keep separate from Recharts component so the page bundle does not load `recharts` on the server. */

export const COLORS = {
  correct: "#10b981",
  incorrect: "#f43f5e",
  unattempted: "#71717a",
} as const;

export type PieRow = { name: string; value: number; fill: string };
