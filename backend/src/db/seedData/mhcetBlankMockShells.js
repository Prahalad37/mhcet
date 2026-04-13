/**
 * Five empty catalog shells for MHCET Law (5-Year LLB): titles, descriptions, timing only.
 * Questions: add later via Admin → Import CSV or question editor.
 * `topic` matches admin analytics / filters (keep under 100 chars).
 */

const TOPIC_FULL = "MHCET Law (5-Year LLB)";
const TOPIC_LEGAL = "MHCET Law — Legal Aptitude";
const TOPIC_GK = "MHCET Law — GK & Current Affairs";
const TOPIC_VERBAL = "MHCET Law — Logical & English";
const TOPIC_DIAG = "MHCET Law — Diagnostic";

/** @type {{ title: string; description: string; durationSeconds: number; topic: string }[]} */
export const mhcetBlankMockShells = [
  {
    title: "MHCET Law (5-Year LLB) — Full syllabus mock (hall pattern)",
    topic: TOPIC_FULL,
    description:
      "Complete-length practice paper in official-style section mix: Legal Aptitude, GK & Current Affairs, Logical Reasoning, Basic Math, and English. Use this shell for a 150-question bank and hall-equivalent pacing. Import MCQs via CSV or add them in Admin — this entry has no questions yet.",
    durationSeconds: 150 * 60,
  },
  {
    title: "MHCET Law — Legal Aptitude sectional mock",
    topic: TOPIC_LEGAL,
    description:
      "Focused drill on legal reasoning, legal knowledge, and constitution-style aptitude at MHCET difficulty. Ideal for institutes running weekly Legal-only mocks. Timer suits a medium sectional; adjust duration in Admin after you attach questions.",
    durationSeconds: 60 * 60,
  },
  {
    title: "MHCET Law — GK & Current Affairs spotlight",
    topic: TOPIC_GK,
    description:
      "Static general knowledge plus current events weighted like the real exam. Short sectional shell for daily GK sprints or institute batches. Fill the question bank when ready — placeholder only for now.",
    durationSeconds: 45 * 60,
  },
  {
    title: "MHCET Law — Logical Reasoning & English combined",
    topic: TOPIC_VERBAL,
    description:
      "Verbal logic, analytical reasoning, reading comprehension, vocabulary, and grammar in one timed block — typical MHCET pairing. Use for combined verbal mocks; no items loaded yet.",
    durationSeconds: 60 * 60,
  },
  {
    title: "MHCET Law — Quick baseline diagnostic",
    topic: TOPIC_DIAG,
    description:
      "Short sprint to benchmark level across topics before full mocks. Perfect for onboarding new students; add a smaller question set (e.g. 30–40 MCQs) when you build the paper. Empty template only.",
    durationSeconds: 30 * 60,
  },
];
