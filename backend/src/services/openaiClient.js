import OpenAI from "openai";

let _client = null;

export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}
