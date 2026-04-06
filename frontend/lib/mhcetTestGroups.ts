import type { AdminTest } from "./types";

/**
 * Maps each admin test `topic` to an MHCET 5-year LLB–style section label for UI grouping.
 * (Exam sections: Legal aptitude, GK, Logical reasoning, English, Math; plus full mocks.)
 */
export function syllabusSectionForTopic(topic: string): string {
  const t = topic.trim();
  if (
    [
      "Legal Aptitude",
      "Constitutional Law",
      "Contract Law",
      "Criminal Law",
      "Tort Law",
    ].includes(t)
  ) {
    return "Legal aptitude & legal reasoning";
  }
  if (t === "GK & Current Affairs") {
    return "General knowledge & current affairs";
  }
  if (t === "Logical Reasoning") {
    return "Logical & analytical reasoning";
  }
  if (t === "Basic Math") {
    return "Quantitative techniques (Basic Math)";
  }
  if (t === "English") {
    return "English";
  }
  if (t === "Mixed (MHCET 5-Year pattern)") {
    return "Full mock — all sections (MHCET pattern)";
  }
  return "Other / custom topic";
}

const SECTION_ORDER: string[] = [
  "Full mock — all sections (MHCET pattern)",
  "Legal aptitude & legal reasoning",
  "General knowledge & current affairs",
  "Logical & analytical reasoning",
  "Quantitative techniques (Basic Math)",
  "English",
  "Other / custom topic",
];

export function groupTestsByMhcetSyllabus(tests: AdminTest[]): {
  section: string;
  tests: AdminTest[];
}[] {
  const map = new Map<string, AdminTest[]>();
  for (const test of tests) {
    const section = syllabusSectionForTopic(test.topic);
    if (!map.has(section)) map.set(section, []);
    map.get(section)!.push(test);
  }
  Array.from(map.values()).forEach((list) => {
    list.sort((a, b) => a.title.localeCompare(b.title));
  });
  const out: { section: string; tests: AdminTest[] }[] = [];
  for (const section of SECTION_ORDER) {
    const list = map.get(section);
    if (list?.length) out.push({ section, tests: list });
    map.delete(section);
  }
  Array.from(map.entries()).forEach(([section, list]) => {
    if (list.length) out.push({ section, tests: list });
  });
  return out;
}
