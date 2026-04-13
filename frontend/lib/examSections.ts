import type { QuestionPublic } from "@/lib/types";

/** Canonical MHCET-style order for section jump tabs only (palette stays paper order). */
export const MHCET_SECTION_ORDER = [
  "Legal Aptitude",
  "GK & Current Affairs",
  "Logical Reasoning",
  "Basic Math",
  "English",
] as const;

export type ExamSection = {
  id: string;
  label: string;
  startIndex: number;
  endIndex: number;
};

function normalizeSubjectLabel(subject: string | null | undefined): string {
  const t = subject != null ? String(subject).trim() : "";
  return t.length > 0 ? t : "General";
}

/**
 * Contiguous runs of the same subject label in API order (orderIndex).
 */
export function deriveContiguousSections(
  questions: QuestionPublic[]
): ExamSection[] {
  if (!questions.length) return [];
  const sections: ExamSection[] = [];
  let start = 0;
  let label = normalizeSubjectLabel(questions[0].subject);
  for (let i = 1; i <= questions.length; i++) {
    const nextLabel =
      i < questions.length
        ? normalizeSubjectLabel(questions[i].subject)
        : null;
    if (i === questions.length || nextLabel !== label) {
      sections.push({
        id: `sec-${sections.length}-${start}`,
        label,
        startIndex: start,
        endIndex: i - 1,
      });
      if (i < questions.length) {
        start = i;
        label = nextLabel!;
      }
    }
  }
  return sections;
}

/** Section jump tabs: MHCET-known labels first (by MHCET_SECTION_ORDER), then other labels by paper order. */
export function orderedSectionsForJumpTabs(sections: ExamSection[]): ExamSection[] {
  if (sections.length <= 1) return sections;
  const rank = new Map<string, number>();
  MHCET_SECTION_ORDER.forEach((s, i) => rank.set(s, i));
  return [...sections].sort((a, b) => {
    const ra = rank.has(a.label) ? rank.get(a.label)! : 1000 + a.startIndex;
    const rb = rank.has(b.label) ? rank.get(b.label)! : 1000 + b.startIndex;
    if (ra !== rb) return ra - rb;
    return a.startIndex - b.startIndex;
  });
}

export function getSectionForQuestionIndex(
  sections: ExamSection[],
  questionIndex: number
): { section: ExamSection; withinSection: number; sectionSize: number } | null {
  for (const s of sections) {
    if (questionIndex >= s.startIndex && questionIndex <= s.endIndex) {
      const sectionSize = s.endIndex - s.startIndex + 1;
      return {
        section: s,
        withinSection: questionIndex - s.startIndex + 1,
        sectionSize,
      };
    }
  }
  return null;
}

export function countAnsweredInSection(
  section: ExamSection,
  answeredIndices: Set<number>
): number {
  let n = 0;
  for (let i = section.startIndex; i <= section.endIndex; i++) {
    if (answeredIndices.has(i)) n += 1;
  }
  return n;
}
