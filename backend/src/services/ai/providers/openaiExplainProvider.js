import { getOpenAIClient } from "../../openaiClient.js";
import { HttpError } from "../../../utils/httpError.js";
import { explainResponseSchema } from "../explainResponseSchema.js";
import { logError } from "../../../utils/logger.js";

function isRetryableOpenAIError(err) {
  if (err?.name === "AbortError") return true;
  const code = err?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND")
    return true;
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const SYSTEM = `You are an expert tutor for Maharashtra Common Entrance Test Law (MHCET Law) and Indian law entrance exams.

Your job: produce a clear, exam-oriented explanation for the multiple-choice question below.

Rules:
- Base reasoning on mainstream legal understanding suitable for undergrad law entrance (Constitution, contracts, torts, criminal law basics, legal reasoning) — be accurate; if unsure, say so briefly.
- Tie the explanation to how an examiner expects the answer to be chosen (eliminate distractors where helpful).
- Keep language precise but accessible; avoid unnecessary jargon; define terms when needed.
- Output MUST be a single JSON object only (no markdown fences, no prose outside JSON) with exactly these keys:
{"answer":"","explanation":"","concept":"","example":""}

Field meanings:
- "answer": One short line stating the correct choice in plain English (e.g. "Option B — …" or the substantive answer label).
- "explanation": 3–6 sentences: why the correct option is right and why common wrong options fail.
- "concept": Name the core legal idea or rule in a short phrase or title (e.g. "Article 14 — Equality before law").
- "example": One short hypothetical or real-world style illustration (2–3 sentences max) that reinforces the concept.`;

/**
 * @param {string} model
 * @param {string} questionBlock
 * @returns {Promise<z.infer<typeof explainResponseSchema>>}
 */
export async function generateOpenAIExplanation(model, questionBlock) {
  const client = getOpenAIClient();
  if (!client) {
    throw new HttpError(
      503,
      "AI explanations are not configured on the server",
      { expose: true }
    );
  }

  const maxAttempts = 3;
  const timeouts = [55000, 55000, 55000];
  let lastErr;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const completion = await client.chat.completions.create(
        {
          model,
          temperature: 0.25,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `Explain this MCQ for a student reviewing their graded attempt.\n\n${questionBlock}`,
            },
          ],
        },
        { signal: AbortSignal.timeout(timeouts[attempt]) }
      );
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty model response");
      const parsed = JSON.parse(text);
      const validated = explainResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error("Model returned JSON in an unexpected shape");
      }
      return validated.data;
    } catch (err) {
      lastErr = err;
      const authLike =
        err?.status === 401 || err?.code === "invalid_api_key";
      if (authLike) {
        throw new HttpError(
          503,
          "AI explanations are temporarily unavailable.",
          { expose: true }
        );
      }
      if (attempt < maxAttempts - 1 && isRetryableOpenAIError(err)) {
        await sleep(400 * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  logError(
    { msg: "openai_explain_failed", provider: "openai" },
    lastErr
  );
  throw new HttpError(
    502,
    "The explanation service is temporarily unavailable. Please try again.",
    { expose: true }
  );
}
