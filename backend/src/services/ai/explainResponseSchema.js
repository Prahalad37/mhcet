import { z } from "zod";

/** Structured explanation returned by all LLM providers (OpenAI, mock, local). */
export const explainResponseSchema = z.object({
  answer: z.string(),
  explanation: z.string(),
  concept: z.string(),
  example: z.string(),
});
