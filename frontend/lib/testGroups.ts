import type { AdminTest } from "./types";

/**
 * Maps each admin test `topic` to a group section label for UI grouping.
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
    return "Legal aptitude & legal reasoning (MHCET/UPSC Law)";
  }
  if (t === "GK & Current Affairs" || t === "Current Affairs") {
    return "General knowledge & current affairs (UPSC/MHCET)";
  }
  if (t === "Geography" || t === "History" || t === "Economy") {
    return "General Studies (UPSC)";
  }
  if (t === "Logical Reasoning") {
    return "Logical & analytical reasoning";
  }
  if (t === "Basic Math") {
    return "Quantitative techniques (Basic Math)";
  }
  if (t === "English") {
    return "English Comprehension";
  }
  if (t === "Mixed (UPSC Prelims)" || t === "Mixed (MHCET 5-Year pattern)") {
    return "Full mock — all sections";
  }
  return "Other / custom topic";
}

const SECTION_ORDER: string[] = [
  "Full mock — all sections",
  "General Studies (UPSC)",
  "General knowledge & current affairs (UPSC/MHCET)",
  "Legal aptitude & legal reasoning (MHCET/UPSC Law)",
  "Logical & analytical reasoning",
  "Quantitative techniques (Basic Math)",
  "English Comprehension",
  "Other / custom topic",
];

export function groupTestsBySection(tests: AdminTest[]): {
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
