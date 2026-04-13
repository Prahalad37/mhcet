import crypto from "crypto";
import OpenAI from "openai";
import { pool } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";
import { generateMockExplanation } from "./ai/providers/mockExplainProvider.js";

function utcTodayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Max OpenAI-backed explain calls per user per UTC day (cache hits do not count).
 * Set EXPLAIN_DAILY_LIMIT=0 for unlimited (recommended for local dev).
 */
export function explainDailyLimit() {
  const raw = process.env.EXPLAIN_DAILY_LIMIT;
  if (raw === undefined || raw === "") {
    return 5;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return 5;
  }
  if (n === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor(n);
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

function normalizeOptionLetter(v) {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  return /^[ABCD]$/.test(s) ? s : null;
}

/**
 * Cache key: question content + which wrong option the student picked (so distractor-specific explain is cached).
 * Correct or unattempted: no wrongChoice key — matches legacy hashes for “why correct” only.
 */
function contentHashFromRow(row) {
  const canonical = {
    p: row.prompt,
    a: row.option_a,
    b: row.option_b,
    c: row.option_c,
    d: row.option_d,
    co: row.correct_option,
  };
  const sel = normalizeOptionLetter(row.user_selected);
  if (sel && sel !== normalizeOptionLetter(row.correct_option)) {
    canonical.wrongChoice = sel;
  }
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function optionTextForLetter(row, letter) {
  const map = { A: row.option_a, B: row.option_b, C: row.option_c, D: row.option_d };
  return String(map[letter] ?? "").trim();
}

function buildBlock(row) {
  let block = `STEM:\n${row.prompt}\nOPTS:\nA:${row.option_a}\nB:${row.option_b}\nC:${row.option_c}\nD:${row.option_d}\nCORRECT:${row.correct_option}`;
  const sel = normalizeOptionLetter(row.user_selected);
  const correct = normalizeOptionLetter(row.correct_option);
  if (sel && correct && sel !== correct) {
    const wrongText = optionTextForLetter(row, sel);
    block += `\n\nSTUDENT_CHOSE: ${sel}\nSTUDENT_CHOSE_TEXT: ${wrongText}`;
    block += `\n\nINSTRUCTION: The student selected incorrect option ${sel}. You must:
1) Explain clearly why ${correct} is correct.
2) Add a separate short paragraph (or clearly labeled section) on why ${sel} tempts students: the misconception, partial truth, or reasoning slip that makes this distractor plausible, and how to avoid this trap next time. Be supportive and exam-focused.
Keep JSON field "explanation" as the full combined text (both parts), or use two paragraphs within "explanation".`;
  }
  return block;
}

/**
 * @param {import("pg").Pool} db
 */
async function loadQuestionForAttempt(db, userId, attemptId, questionId) {
  const res = await db.query(
    `SELECT q.id, q.prompt, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option,
            ans.selected_option AS user_selected
     FROM attempts att
     JOIN questions q ON q.test_id = att.test_id AND q.id = $3
     LEFT JOIN answers ans ON ans.attempt_id = att.id AND ans.question_id = q.id
     WHERE att.id = $1 AND att.user_id = $2 AND att.status = 'submitted'`,
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
  if (!Number.isFinite(limit)) {
    return;
  }
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
      throw new HttpError(
        429,
        "Daily AI explanation limit reached — you have used today’s quota of AI-backed explanations. It resets at midnight UTC (early morning next day in India). Questions you already explained may still show from cache without using a new slot."
      );
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
  if (!Number.isFinite(explainDailyLimit())) {
    return;
  }
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
  const sys = `You are an assistant for law entrance MCQs. Respond with a single JSON object with keys: answer (short string), explanation (string), concept (short string), example (string). No markdown fences.
If the user block includes STUDENT_CHOSE and INSTRUCTION, follow INSTRUCTION: combine a correct-answer explanation with a distinct section on why the student's wrong option is tempting (misconception / trap) and how to avoid it — all inside "explanation".`;
  const user = `${block}\n\nReturn JSON only.`;


  const maxAttempts = 3;
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: block.includes("STUDENT_CHOSE:") ? 1600 : 1200,
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
      const minExpl = block.includes("STUDENT_CHOSE:") ? 80 : 20;
      if (answer.length < 5 || explanation.length < minExpl || concept.length < 3 || example.length < 10) {
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
  const sys = `You are an assistant for competitive exam MCQs (GK, Law, Reasoning). Respond ONLY with a single JSON object (no markdown) with exactly these keys:
- answer: which option is correct (e.g. "Option B – Guilty mind")
- explanation: if STUDENT_CHOSE appears in the block, write (1) why the correct option holds, then (2) a separate paragraph on why the student's wrong option is a common trap (misconception, partial similarity, or slip) and how to avoid it; otherwise 2-3 sentences on why the correct answer is right
- concept: 2-5 word label for the concept tested (e.g. "Mens Rea")
- example: one real-world example sentence illustrating the concept`;
  const user = `${block}\n\nReturn JSON only.`;

  const maxAttempts = 3;
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: block.includes("STUDENT_CHOSE:") ? 1800 : 1200,
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
      const minExpl = block.includes("STUDENT_CHOSE:") ? 80 : 15;
      if (answer.length < 1 || explanation.length < minExpl || concept.length < 2) {
        throw new Error(`DeepSeek output too short — answer:${answer.length} explanation:${explanation.length} concept:${concept.length}`);
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
  const sys = `Respond with JSON only: {"answer":"","explanation":"","concept":"","example":""} for the MCQ. If the prompt includes STUDENT_CHOSE, explanation must include why the correct option is right and why the student's wrong option is a tempting mistake.`;
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
