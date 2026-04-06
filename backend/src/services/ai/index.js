/**
 * LLM provider abstraction for MCQ explanations.
 *
 * AI_PROVIDER=mock | openai | local   (default: mock)
 *
 * - mock: deterministic, hash-based structured text — no API keys, no outbound calls.
 * - openai: existing OpenAI chat completions + JSON schema (uses OPENAI_API_KEY).
 * - local: OpenAI-compatible HTTP POST to LOCAL_LLM_URL/v1/chat/completions.
 */

import { generateMockExplanation } from "./providers/mockExplainProvider.js";
import { generateOpenAIExplanation } from "./providers/openaiExplainProvider.js";
import { generateLocalExplanation } from "./providers/localExplainProvider.js";
import { getOpenAIClient } from "../openaiClient.js";
import { HttpError } from "../../utils/httpError.js";

export { explainResponseSchema } from "./explainResponseSchema.js";

/**
 * Emergency off-ramp for runaway OpenAI/local spend: set EXPLAIN_KILL_SWITCH=true
 * (or 1 / yes). Forces explanations onto the mock provider regardless of AI_PROVIDER.
 * For day-to-day “no bill” use, AI_PROVIDER=mock is enough; the kill switch is for
 * instant override without editing multiple vars.
 */
export function isExplainKillSwitchActive() {
  const v = String(process.env.EXPLAIN_KILL_SWITCH || "")
    .toLowerCase()
    .trim();
  return v === "true" || v === "1" || v === "yes";
}

/** @returns {'mock' | 'openai' | 'local'} */
export function getExplainProviderId() {
  if (isExplainKillSwitchActive()) return "mock";
  const v = (process.env.AI_PROVIDER || "mock").toLowerCase().trim();
  if (v === "openai") return "openai";
  if (v === "local") return "local";
  return "mock";
}

/** Model string stored in DB cache hash — keep stable per provider. */
export function getEffectiveExplainModel(providerId) {
  if (providerId === "openai") {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }
  if (providerId === "local") {
    return process.env.LOCAL_LLM_MODEL || "local-llm";
  }
  return process.env.MOCK_EXPLAIN_MODEL || "mock-v1";
}

/** Daily quota table user_explanation_usage.openai_calls — only OpenAI increments. */
export function shouldApplyOpenAIDailyQuota(providerId) {
  return providerId === "openai";
}

/** For GET /api/config — UI shows Explain when true. */
export function computeExplainAvailable() {
  if (process.env.EXPLAIN_AI_ENABLED === "false") return false;
  const p = getExplainProviderId();
  if (p === "openai") return Boolean(getOpenAIClient());
  if (p === "local") {
    return Boolean(String(process.env.LOCAL_LLM_URL || "").trim());
  }
  return true;
}

/**
 * Validates provider prerequisites; throws HttpError 503 if misconfigured.
 * @param {'mock' | 'openai' | 'local'} providerId
 */
export function assertExplainProviderReady(providerId) {
  if (providerId === "openai" && !getOpenAIClient()) {
    throw new HttpError(
      503,
      "AI explanations are not configured on the server (OpenAI API key missing).",
      { expose: true }
    );
  }
  if (providerId === "local") {
    const url = String(process.env.LOCAL_LLM_URL || "").trim();
    if (!url) {
      throw new HttpError(
        503,
        "Local LLM is not configured (LOCAL_LLM_URL).",
        { expose: true }
      );
    }
  }
}

/**
 * @param {'mock' | 'openai' | 'local'} providerId
 * @param {object} row DB row with prompt, option_*, correct_option
 * @param {string} questionBlock
 */
export async function generateExplanationWithProvider(providerId, row, questionBlock) {
  const model = getEffectiveExplainModel(providerId);
  switch (providerId) {
    case "openai":
      return generateOpenAIExplanation(model, questionBlock);
    case "local":
      return generateLocalExplanation(questionBlock, model);
    default:
      return generateMockExplanation(row, questionBlock);
  }
}
