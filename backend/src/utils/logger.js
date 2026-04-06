/**
 * Structured JSON logs (one object per line). Never log JWTs, passwords, or API keys.
 */

function safeJson(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ message: "log_serialize_error" });
  }
}

/** Redact common secret patterns from arbitrary strings (e.g. error messages). */
export function redactSecrets(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/\bBearer\s+[\w-]+\.[\w-]+\.[\w-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\bAuthorization:\s*[^\s]+/gi, "Authorization: [REDACTED]")
    .replace(/\bOPENAI_API_KEY\s*=\s*\S+/gi, "OPENAI_API_KEY=[REDACTED]");
}

export function logInfo(fields) {
  console.log(safeJson({ level: "info", ts: new Date().toISOString(), ...fields }));
}

export function logWarn(fields) {
  console.warn(safeJson({ level: "warn", ts: new Date().toISOString(), ...fields }));
}

export function logError(fields, err) {
  const base = {
    level: "error",
    ts: new Date().toISOString(),
    ...fields,
  };
  if (err) {
    base.errName = err.name;
    base.errMessage = redactSecrets(String(err.message || err));
    if (err.code) base.errCode = err.code;
    if (process.env.NODE_ENV !== "production" && err.stack) {
      base.errStack = redactSecrets(String(err.stack).slice(0, 2000));
    }
  }
  console.error(safeJson(base));
}
