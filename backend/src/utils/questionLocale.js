/** Columns to SELECT from `questions` for exam payloads (snake_case). */
export const QUESTION_ROW_SELECT = `id, prompt, prompt_hi, option_a, option_a_hi, option_b, option_b_hi,
  option_c, option_c_hi, option_d, option_d_hi, order_index, subject`;

/** DB row keys: snake_case as returned by pg. */
export function mapQuestionRowToPublic(row, lang) {
  const useHi = lang === "hi";
  const pick = (en, hi) => {
    if (useHi && hi != null && String(hi).trim() !== "") return String(hi).trim();
    return en;
  };
  const out = {
    id: row.id,
    prompt: pick(row.prompt, row.prompt_hi),
    optionA: pick(row.option_a, row.option_a_hi),
    optionB: pick(row.option_b, row.option_b_hi),
    optionC: pick(row.option_c, row.option_c_hi),
    optionD: pick(row.option_d, row.option_d_hi),
    orderIndex: row.order_index,
  };
  if (row.subject != null && String(row.subject).trim() !== "") {
    out.subject = row.subject;
  }
  return out;
}

/**
 * Snapshot row (snake_case): merge Hindi over English for display when lang=hi.
 * Mutates a shallow copy for optionTextFromRow / response builders.
 */
export function mergeSnapshotRowLocale(row, lang) {
  if (lang !== "hi") return row;
  const pick = (en, hi) =>
    hi != null && String(hi).trim() !== "" ? String(hi).trim() : en;
  return {
    ...row,
    prompt: pick(row.prompt, row.prompt_hi),
    option_a: pick(row.option_a, row.option_a_hi),
    option_b: pick(row.option_b, row.option_b_hi),
    option_c: pick(row.option_c, row.option_c_hi),
    option_d: pick(row.option_d, row.option_d_hi),
    hint: pick(row.hint, row.hint_hi),
    official_explanation: pick(row.official_explanation, row.official_explanation_hi),
  };
}
