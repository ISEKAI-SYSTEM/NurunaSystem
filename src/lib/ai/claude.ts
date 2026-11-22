import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAiConfig } from "./config";

export function getClaude(): { client: Anthropic; model: string } | null {
  const { llm } = getAiConfig();
  if (!llm.configured) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const authToken = apiKey ? null : process.env.ANTHROPIC_AUTH_TOKEN?.trim() || null;
  const client = new Anthropic({
    apiKey,
    authToken,
    baseURL: llm.baseUrl,
    maxRetries: 1,
    timeout: 60_000,
  });
  return { client, model: llm.model };
}

const FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
  "claude-fable-5-1",
  "claude-fable-5-2",
]);

export function shouldUseRefusalFallback(model: string): boolean {
  return process.env.AI_REFUSAL_FALLBACK?.trim().toLowerCase() !== "off" && FALLBACK_MODELS.has(model);
}
