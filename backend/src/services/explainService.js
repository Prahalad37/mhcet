import crypto from "crypto";
import OpenAI from "openai";
import { pool } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";
import { generateMockExplanation } from "./ai/providers/mockExplainProvider.js";

function utcTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function explainDailyLimit() {
  const n = Number(process.env.EXPLAIN_DAILY_LIMIT ?? 5);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
}

function resolveModelName() {
  if (process.env.EXPLAIN_KILL_SWITCH === "true" || process.env.EXPLAIN_KILL_SWITCH === "1") {
    return process.env.MOCK_EXPLAIN_MODEL || "mock-v1";
  }
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
  if (provider === "mock") {
    return process.env.MOCK_EXPLAIN_MODEL || "mock-v1";
  }
  if (provider === "openai") {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL || "deepseek-chat";
  }
  if (provider === "local") {
    return process.env.LOCAL_LLM_MODEL || "local";
  }
  return process.env.MOCK_EXPLAIN_MODEL || "mock-v1";
}

function contentHashFromRow(row) {
  const canonical = {
    p: row.prompt,
    a: row.option_a,
    b: row.option_b,
    c: row.option_c,
    d: row.option_d,
    co: row.correct_option,
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildBlock(row) {
  return `STEM:\n${row.prompt}\nOPTS:\nA:${row.option_a}\nB:${row.option_b}\nC:${row.option_c}\nD:${row.option_d}\nCORRECT:${row.correct_option}`;
}

/**
 * @param {import("pg").Pool} db
 */
async function loadQuestionForAttempt(db, userId, attemptId, questionId) {
  const res = await db.query(
    `SELECT q.id, q.prompt, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
     FROM attempts a
     JOIN questions q ON q.test_id = a.test_id AND q.id = $3
     WHERE a.id = $1 AND a.user_id = $2 AND a.status = 'submitted'`,
    [attemptId, userId, questionId]
  );
  const row = res.rows[0];
  if (!row) {
    throw new HttpError(404, "Question not found for this submitted attempt");
  }
  return row;
}

/**
 * Optional client-provided fields must match DB when present.
 */
function assertClientMatchesDb(row, clientExtras) {
  if (!clientExtras) return;
  const { question, options, correctAnswer } = clientExtras;
  if (question != null && question.trim() !== String(row.prompt).trim()) {
    throw new HttpError(400, "Question text does not match attempt data");
  }
  if (options) {
    const pairs = [
      ["A", row.option_a],
      ["B", row.option_b],
      ["C", row.option_c],
      ["D", row.option_d],
    ];
    for (const [k, v] of pairs) {
      if (options[k] != null && String(options[k]).trim() !== String(v).trim()) {
        throw new HttpError(400, "Options do not match attempt data");
      }
    }
  }
  if (correctAnswer != null && correctAnswer !== row.correct_option) {
    throw new HttpError(400, "Correct answer does not match attempt data");
  }
}

async function getCached(db, questionId, contentHash) {
  const { rows } = await db.query(
    `SELECT answer, explanation, concept, example, model
     FROM question_explanations
     WHERE question_id = $1 AND content_hash = $2`,
    [questionId, contentHash]
  );
  return rows[0] || null;
}

async function insertCache(db, questionId, contentHash, model, payload) {
  await db.query(
    `INSERT INTO question_explanations (
       question_id, content_hash, answer, explanation, concept, example, model
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (question_id, content_hash) DO UPDATE SET
       answer = EXCLUDED.answer,
       explanation = EXCLUDED.explanation,
       concept = EXCLUDED.concept,
       example = EXCLUDED.example,
       model = EXCLUDED.model`,
    [
      questionId,
      contentHash,
      payload.answer,
      payload.explanation,
      payload.concept,
      payload.example,
      model,
    ]
  );
}

/**
 * Reserve one OpenAI-backed slot for today (UTC). No-op for mock/cache paths before call.
 */
async function reserveOpenAiSlot(db, userId) {
  const limit = explainDailyLimit();
  const usageDate = utcTodayString();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO user_explanation_usage (user_id, usage_date, openai_calls)
       VALUES ($1, $2::date, 0)
       ON CONFLICT (user_id, usage_date) DO NOTHING`,
      [userId, usageDate]
    );
    const lock = await client.query(
      `SELECT openai_calls FROM user_explanation_usage
       WHERE user_id = $1 AND usage_date = $2::date
       FOR UPDATE`,
      [userId, usageDate]
    );
    const current = lock.rows[0]?.openai_calls ?? 0;
    if (current >= limit) {
      await client.query("ROLLBACK");
      throw new HttpError(429, "Daily AI explanation limit reached for your account");
    }
    await client.query(
      `UPDATE user_explanation_usage
       SET openai_calls = openai_calls + 1
       WHERE user_id = $1 AND usage_date = $2::date`,
      [userId, usageDate]
    );
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

async function releaseOpenAiSlot(db, userId) {
  const usageDate = utcTodayString();
  await db.query(
    `UPDATE user_explanation_usage
     SET openai_calls = GREATEST(0, openai_calls - 1)
     WHERE user_id = $1 AND usage_date = $2::date`,
    [userId, usageDate]
  );
}

async function callOpenAiStructured(row, block) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new HttpError(503, "OpenAI is not configured");
  }
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key });
  const sys = `You are an assistant for law entrance MCQs. Respond with a single JSON object with keys: answer (short string), explanation (string), concept (short string), example (string). No markdown fences.`;
  const user = `${block}\n\nReturn JSON only.`;


  const maxAttempts = 3;
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim() || "";
      const parsed = JSON.parse(text);
      const answer = String(parsed.answer ?? "").trim();
      const explanation = String(parsed.explanation ?? "").trim();
      const concept = String(parsed.concept ?? "").trim();
      const example = String(parsed.example ?? "").trim();
      if (answer.length < 5 || explanation.length < 20 || concept.length < 3 || example.length < 10) {
        throw new Error("Model output too short");
      }
      return { answer, explanation, concept, example };
    } catch (e) {
      lastErr = e;
      const delay = 400 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new HttpError(503, `Explanation generation failed: ${lastErr?.message || "unknown"}`);
}

async function callDeepSeek(row, block) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new HttpError(503, "DeepSeek API key is not configured (set DEEPSEEK_API_KEY)");
  }
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  // DeepSeek is OpenAI-compatible — same SDK, different baseURL
  const client = new OpenAI({
    apiKey: key,
    baseURL: "https://api.deepseek.com",
  });
  const sys = `You are an assistant for competitive exam MCQs (GK, Law, Reasoning). Respond with a single JSON object with keys: answer (short string), explanation (2-3 sentences), concept (short label), example (real-world example sentence). No markdown fences.`;
  const user = `${block}\n\nReturn JSON only.`;

  const maxAttempts = 3;
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim() || "";
      // Strip markdown fences if model returns them
      const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(clean);
      const answer = String(parsed.answer ?? "").trim();
      const explanation = String(parsed.explanation ?? "").trim();
      const concept = String(parsed.concept ?? "").trim();
      const example = String(parsed.example ?? "").trim();
      if (answer.length < 5 || explanation.length < 10 || concept.length < 2) {
        throw new Error("DeepSeek output too short");
      }
      return { answer, explanation, concept, example };
    } catch (e) {
      lastErr = e;
      const delay = 400 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new HttpError(503, `DeepSeek explanation failed: ${lastErr?.message || "unknown"}`);
}

async function callLocalLlm(row, block) {
  const base = process.env.LOCAL_LLM_URL;
  if (!base) {
    throw new HttpError(503, "LOCAL_LLM_URL is not set");
  }
  const model = process.env.LOCAL_LLM_MODEL || "llama3.2";
  const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS || 120_000);
  const sys = `Respond with JSON only: {"answer":"","explanation":"","concept":"","example":""} for the MCQ.`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: block },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`local llm HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(text);
    return {
      answer: String(parsed.answer ?? "").trim(),
      explanation: String(parsed.explanation ?? "").trim(),
      concept: String(parsed.concept ?? "").trim(),
      example: String(parsed.example ?? "").trim(),
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Core explain run (used by Bull worker).
 * @param {{ userId: string, attemptId: string, questionId: string, clientExtras?: object }} params
 */
export async function runExplainJob(params) {
  const { userId, attemptId, questionId, clientExtras } = params;

  if (process.env.EXPLAIN_AI_ENABLED === "false" || process.env.EXPLAIN_AI_ENABLED === "0") {
    throw new HttpError(503, "AI explanations are disabled");
  }

  const row = await loadQuestionForAttempt(pool, userId, attemptId, questionId);
  assertClientMatchesDb(row, clientExtras);

  const contentHash = contentHashFromRow(row);
  const block = buildBlock(row);
  const kill = process.env.EXPLAIN_KILL_SWITCH === "true" || process.env.EXPLAIN_KILL_SWITCH === "1";
  const provider = kill ? "mock" : (process.env.AI_PROVIDER || "mock").toLowerCase();
  const model = resolveModelName();

  const cached = await getCached(pool, questionId, contentHash);
  if (cached) {
    return {
      answer: cached.answer,
      explanation: cached.explanation,
      concept: cached.concept,
      example: cached.example,
      cached: true,
      model: cached.model || model,
    };
  }

  if (provider === "mock") {
    const payload = generateMockExplanation(row, block);
    await insertCache(pool, questionId, contentHash, model, payload);
    return {
      ...payload,
      cached: false,
      model,
    };
  }

  await reserveOpenAiSlot(pool, userId);
  try {
    let payload;
    if (provider === "openai") {
      payload = await callOpenAiStructured(row, block);
    } else if (provider === "deepseek") {
      payload = await callDeepSeek(row, block);
    } else if (provider === "local") {
      payload = await callLocalLlm(row, block);
    } else {
      payload = generateMockExplanation(row, block);
    }
    await insertCache(pool, questionId, contentHash, model, payload);
    return {
      ...payload,
      cached: false,
      model,
    };
  } catch (e) {
    await releaseOpenAiSlot(pool, userId);
    throw e;
  }
}
