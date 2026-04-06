import crypto from "crypto";
import { explainResponseSchema } from "../explainResponseSchema.js";

const CONCEPT_POOL = [
  "Issue spotting and elimination of options",
  "Principles of statutory interpretation",
  "Constitutional rights and limitations",
  "Contract formation and breach basics",
  "Tort: duty, breach, causation",
  "Criminal law: actus reus and mens rea",
  "Legal reasoning under time pressure",
  "Reading comprehension in legal contexts",
  "Current affairs and legal awareness",
  "Basic legal vocabulary in context",
];

const TEMPLATES_EXP = [
  (correct, wrongHint, stemSnippet) =>
    `The stem focuses on: ${stemSnippet}. Option ${correct} aligns with the requirement stated in the question. ${wrongHint} Use the wording of the question to confirm which option is directly supported.`,
  (correct, wrongHint, stemSnippet) =>
    `Start from what the question asks (${stemSnippet}). The best-supported choice is (${correct}) because it matches that requirement. ${wrongHint}`,
  (correct, wrongHint, stemSnippet) =>
    `For this item, narrow down using the stem (${stemSnippet}). (${correct}) is consistent with the facts and the call of the question. ${wrongHint}`,
];

function stemSnippet(prompt, max = 100) {
  const t = String(prompt ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return t.length < 20 ? "the fact pattern given" : `${t}${t.length >= max ? "…" : ""}`;
}

function wrongOptionHint(correct, optionsByLetter, digest) {
  const letters = ["A", "B", "C", "D"].filter((L) => L !== correct);
  const pickWrong = letters[digest[1] % letters.length];
  const wrongText = optionsByLetter[pickWrong];
  const short =
    String(wrongText ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "a distractor";
  return `A common trap is (${pickWrong}) — "${short}" — which does not satisfy the same test as the correct line in the stem.`;
}

function exampleFromSeed(concept, digest) {
  const scenarios = [
    "A fact pattern changes one element; the legally relevant outcome follows from that element alone.",
    "Two answers look similar; the examiner usually rewards the one that tracks the precise legal test named in the stem.",
    "If the stem names a statute or article, tie your choice to that source before picking a broad policy answer.",
  ];
  return `${scenarios[digest[2] % scenarios.length]} (${concept.toLowerCase()}).`;
}

/**
 * Deterministic, logic-shaped mock: content varies with a hash of the full question block
 * (same inputs → same outputs; different questions → different prose).
 *
 * @param {{ prompt: string, option_a: string, option_b: string, option_c: string, option_d: string, correct_option: string }} row
 * @param {string} questionBlock
 * @returns {z.infer<typeof explainResponseSchema>}
 */
export function generateMockExplanation(row, questionBlock) {
  const digest = crypto
    .createHash("sha256")
    .update(questionBlock, "utf8")
    .digest();

  const optionsByLetter = {
    A: row.option_a,
    B: row.option_b,
    C: row.option_c,
    D: row.option_d,
  };
  const correct = String(row.correct_option || "A").toUpperCase().slice(0, 1);
  const correctKey = `option_${correct.toLowerCase()}`;
  const correctText = row[correctKey] ?? optionsByLetter[correct] ?? "";
  const correctShort = String(correctText)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  const answer = correctShort
    ? `Option ${correct} — ${correctShort}${correctText.length > 140 ? "…" : ""}`
    : `Option ${correct} — matches the stem and the stated correct key.`;

  const concept = CONCEPT_POOL[digest[0] % CONCEPT_POOL.length];
  const stem = stemSnippet(row.prompt);
  const wrongHint = wrongOptionHint(correct, optionsByLetter, digest);
  const tpl = TEMPLATES_EXP[digest[3] % TEMPLATES_EXP.length];
  const explanation = tpl(correct, wrongHint, stem);
  const example = exampleFromSeed(concept, digest);

  const parsed = explainResponseSchema.safeParse({
    answer,
    explanation,
    concept,
    example,
  });
  if (!parsed.success) {
    return {
      answer: "—",
      explanation: "Mock provider produced an invalid shape; retry.",
      concept: "Error handling",
      example: "Please report this case.",
    };
  }
  return parsed.data;
}
