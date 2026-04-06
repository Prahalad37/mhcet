import { HttpError } from "../../../utils/httpError.js";
import { explainResponseSchema } from "../explainResponseSchema.js";
import { logError, logWarn } from "../../../utils/logger.js";

const SYSTEM = `You are an expert tutor for Maharashtra Common Entrance Test Law (MHCET Law) and Indian law entrance exams.
Output MUST be a single JSON object only with exactly these keys:
{"answer":"","explanation":"","concept":"","example":""}`;

/**
 * OpenAI-compatible Chat Completions API (Ollama, vLLM, LiteLLM, etc.).
 * Set LOCAL_LLM_URL (e.g. http://127.0.0.1:11434/v1) and optionally LOCAL_LLM_MODEL.
 *
 * @param {string} questionBlock
 * @param {string} model
 */
export async function generateLocalExplanation(questionBlock, model) {
  const base = String(process.env.LOCAL_LLM_URL || "").trim().replace(/\/$/, "");
  if (!base) {
    throw new HttpError(
      503,
      "Local LLM is not configured (LOCAL_LLM_URL).",
      { expose: true }
    );
  }

  const url = `${base}/chat/completions`;
  const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS) || 120000;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      logWarn({
        msg: "local_llm_http_error",
        status: res.status,
        body: t.slice(0, 500),
      });
      throw new HttpError(
        502,
        "The local explanation service returned an error. Please try again.",
        { expose: true }
      );
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Empty local model response");
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HttpError(
        502,
        "Local model did not return valid JSON for the explanation.",
        { expose: true }
      );
    }
    const validated = explainResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new HttpError(
        502,
        "Received an invalid explanation format from the local model.",
        { expose: true }
      );
    }
    return validated.data;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    logError({ msg: "local_llm_explain_failed", provider: "local" }, e);
    if (e?.name === "AbortError") {
      throw new HttpError(
        504,
        "Local LLM request timed out.",
        { expose: true }
      );
    }
    throw new HttpError(
      502,
      "The local explanation service is unavailable. Please try again.",
      { expose: true }
    );
  }
}
