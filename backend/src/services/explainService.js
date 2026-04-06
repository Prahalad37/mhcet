import crypto from "crypto";
import { z } from "zod";
import { HttpError } from "../utils/httpError.js";
import {
  getExplainProviderId,
  getEffectiveExplainModel,
  shouldApplyOpenAIDailyQuota,
  assertExplainProviderReady,
  generateExplanationWithProvider,
  explainResponseSchema,
} from "./ai/index.js";

const optionsSchema = z.object({
  A: z.string(),
  B: z.string(),
  C: z.string(),
  D: z.string(),
});

export const explainBodySchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  question: z.string().min(1).optional(),
  options: optionsSchema.optional(),
  correctAnswer: z.enum(["A", "B", "C", "D"]).optional(),
});

function normalize(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function optionsMatch(row, bodyOptions) {
  return (
    normalize(row.option_a) === normalize(bodyOptions.A) &&
    normalize(row.option_b) === normalize(bodyOptions.B) &&
    normalize(row.option_c) === normalize(bodyOptions.C) &&
    normalize(row.option_d) === normalize(bodyOptions.D)
  );
}

function contentHash(row, model) {
  const payload = [
    normalize(row.prompt),
    normalize(row.option_a),
    normalize(row.option_b),
    normalize(row.option_c),
    normalize(row.option_d),
    row.correct_option,
    model,
  ].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

function utcUsageDate() {
  return new Date().toISOString().slice(0, 10);
}

function dailyLimit() {
  const n = Number(process.env.EXPLAIN_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

async function reserveOpenAISlot(client, userId, usageDate, limit) {
  const up = await client.query(
    `INSERT INTO user_explanation_usage (user_id, usage_date, openai_calls)
     VALUES ($1, $2::date, 1)
     ON CONFLICT (user_id, usage_date) DO UPDATE
     SET openai_calls = user_explanation_usage.openai_calls + 1
     WHERE user_explanation_usage.openai_calls < $3
     RETURNING openai_calls`,
    [userId, usageDate, limit]
  );

  if (!up.rows?.length) {
    throw new HttpError(
      429,
      `Daily explanation limit reached (${limit} OpenAI-backed requests). Resets at UTC midnight. Cached explanations do not count.`,
      { expose: true }
    );
  }
}

async function releaseOpenAISlot(pool, userId, usageDate) {
  try {
    await pool.query(
      `UPDATE user_explanation_usage
       SET openai_calls = GREATEST(openai_calls - 1, 0)
       WHERE user_id = $1 AND usage_date = $2::date`,
      [userId, usageDate]
    );
  } catch {
    // best-effort rollback for failed generation after reservation
  }
}

/**
 * @param {import("pg").Pool} pool
 * @param {string} userId
 * @param {z.infer<typeof explainBodySchema>} body
 */
export async function getExplanation(pool, userId, body) {
  const verify = await pool.query(
    `SELECT a.user_id, a.test_id, a.status, q.id AS question_id,
            q.prompt, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
     FROM attempts a
     JOIN questions q ON q.test_id = a.test_id AND q.id = $1
     WHERE a.id = $2 AND a.user_id = $3`,
    [body.questionId, body.attemptId, userId]
  );
  const row = verify.rows[0];
  if (!row) {
    throw new HttpError(404, "Question or attempt not found", { expose: true });
  }
  if (row.status !== "submitted") {
    throw new HttpError(
      400,
      "Explanations are available after submission",
      { expose: true }
    );
  }

  const sentFull =
    body.question !== undefined &&
    body.options !== undefined &&
    body.correctAnswer !== undefined;

  if (sentFull) {
    if (normalize(row.prompt) !== normalize(body.question)) {
      throw new HttpError(
        400,
        "Question text does not match the server record",
        { expose: true }
      );
    }
    if (!optionsMatch(row, body.options)) {
      throw new HttpError(
        400,
        "Options do not match the server record",
        { expose: true }
      );
    }
    if (row.correct_option !== body.correctAnswer) {
      throw new HttpError(
        400,
        "Correct answer does not match the server record",
        { expose: true }
      );
    }
  }

  if (process.env.EXPLAIN_AI_ENABLED === "false") {
    throw new HttpError(
      503,
      "Explanations are disabled on this server.",
      { expose: true }
    );
  }

  const providerId = getExplainProviderId();
  assertExplainProviderReady(providerId);

  const model = getEffectiveExplainModel(providerId);
  const hash = contentHash(row, model);

  const cached = await pool.query(
    `SELECT answer, explanation, concept, example
     FROM question_explanations
     WHERE question_id = $1 AND content_hash = $2`,
    [body.questionId, hash]
  );
  if (cached.rows[0]) {
    return {
      answer: cached.rows[0].answer,
      explanation: cached.rows[0].explanation,
      concept: cached.rows[0].concept,
      example: cached.rows[0].example,
      cached: true,
    };
  }

  const limit = dailyLimit();
  const usageDate = utcUsageDate();
  const quotaEnabled = shouldApplyOpenAIDailyQuota(providerId);

  if (quotaEnabled) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await reserveOpenAISlot(client, userId, usageDate, limit);
      await client.query("COMMIT");
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }
  }

  const questionBlock = `QUESTION STEM:
${row.prompt}

OPTIONS:
(A) ${row.option_a}
(B) ${row.option_b}
(C) ${row.option_c}
(D) ${row.option_d}

AUTHORITATIVE CORRECT OPTION (letter only): ${row.correct_option}`;

  let result;
  try {
    result = await generateExplanationWithProvider(
      providerId,
      row,
      questionBlock
    );
  } catch (e) {
    if (quotaEnabled) {
      await releaseOpenAISlot(pool, userId, usageDate);
    }
    if (e instanceof HttpError) throw e;
    throw new HttpError(
      502,
      "Could not generate an explanation. Please try again.",
      { expose: true }
    );
  }

  const validated = explainResponseSchema.safeParse(result);
  if (!validated.success) {
    if (quotaEnabled) {
      await releaseOpenAISlot(pool, userId, usageDate);
    }
    throw new HttpError(
      502,
      "Received an invalid explanation format. Please try again.",
      { expose: true }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO question_explanations
       (question_id, content_hash, answer, explanation, concept, example, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (question_id, content_hash) DO NOTHING`,
      [
        body.questionId,
        hash,
        validated.data.answer,
        validated.data.explanation,
        validated.data.concept,
        validated.data.example,
        model,
      ]
    );
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    if (quotaEnabled) {
      await releaseOpenAISlot(pool, userId, usageDate);
    }
    throw e;
  } finally {
    client.release();
  }

  return { ...validated.data, cached: false };
}
