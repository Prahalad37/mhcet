import crypto from "crypto";

/**
 * Deterministic pseudo-random bytes from a seed string (stable across runs).
 */
function seededBytes(seed, len) {
  const out = Buffer.alloc(len);
  let h = crypto.createHash("sha256").update(seed).digest();
  let off = 0;
  while (off < len) {
    for (let i = 0; i < h.length && off < len; i++, off++) {
      out[off] = h[i];
    }
    if (off < len) {
      h = crypto.createHash("sha256").update(h).digest();
    }
  }
  return out;
}

function pickParagraph(seed, templates) {
  const idx = seededBytes(seed, 1)[0] % templates.length;
  return templates[idx];
}

/**
 * @param {object} row - question row (prompt, options, correct_option)
 * @param {string} block - canonical text block for hashing / variation
 * @returns {{ answer: string, explanation: string, concept: string, example: string }}
 */
export function generateMockExplanation(row, block) {
  const seed = `${block}::${row.correct_option}`;
  const answer = `The correct option is **${row.correct_option}** — it best matches the stem and distractors.`;

  const explainTemplates = [
    `Walk through the stem: identify what is being asked, eliminate options that contradict the rule or facts, and confirm that option ${row.correct_option} fits the narrowest accurate reading.`,
    `Start by mapping the question to the underlying rule. Compare each option against that rule; only ${row.correct_option} remains consistent with the stated facts.`,
    `Use elimination: two options usually fail on a clear factual mismatch; between the remainder, ${row.correct_option} aligns with the principle the question tests.`,
  ];
  const conceptTemplates = [
    "Rule identification and careful reading under exam time pressure.",
    "Applying a narrow legal principle to a fact pattern without over-reading distractors.",
    "Eliminating options using boundary conditions and definitional fit.",
  ];
  const exampleTemplates = [
    "If the stem shifts one fact, the same method still applies: restate the rule, test each option, pick the only survivor.",
    "When two answers look plausible, compare which one is *necessary* versus merely *possible* under the rule.",
    "Underline the operative phrase in the prompt — mismatches there usually kill two options immediately.",
  ];

  const explanation = pickParagraph(seed + ":e", explainTemplates);
  const concept = pickParagraph(seed + ":c", conceptTemplates);
  const example = pickParagraph(seed + ":x", exampleTemplates);

  return {
    answer,
    explanation,
    concept,
    example,
  };
}
