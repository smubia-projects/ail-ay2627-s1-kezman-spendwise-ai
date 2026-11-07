import OpenAI from "openai";

// Inference config comes from env so the gateway and model can change without code edits.
// The new names (API_BASE_URL, API_KEY, MODEL_NAME) win; the original OPENAI_* names still work.
const DEFAULT_BASE_URL = "https://api.apiyi.com/v1";
const DEFAULT_MODEL = "deepseek-v4-flash";

export function getOpenAIConfiguration() {
  const apiKey = (process.env.API_KEY || process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) {
    return null;
  }

  const model = (process.env.MODEL_NAME || process.env.OPENAI_MODEL)?.trim() || DEFAULT_MODEL;
  const baseURL = (process.env.API_BASE_URL || process.env.OPENAI_BASE_URL)?.trim() || DEFAULT_BASE_URL;
  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout: 45_000,
    maxRetries: 0,
  });

  return { client, model };
}
