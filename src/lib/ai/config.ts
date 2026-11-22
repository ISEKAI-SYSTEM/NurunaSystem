import "server-only";

export const DEFAULT_LLM_MODEL = "claude-opus-5-5";

export const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com";

export type LlmEndpoint = "anthropic" | "custom" | "invalid";

export const STT_PROVIDERS = ["groq", "openai"] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];

export type AiConfig = {
  llm: {
    configured: boolean;
    model: string;
    endpoint: LlmEndpoint;
    baseUrl: string;
  };
  stt: { configured: boolean; provider: SttProvider | null; model: string | null };
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseBaseUrl(value: string | undefined): {
  endpoint: LlmEndpoint;
  baseUrl: string;
} {
  const raw = clean(value);
  if (!raw) return { endpoint: "anthropic", baseUrl: ANTHROPIC_DEFAULT_BASE_URL };
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return { endpoint: "custom", baseUrl: raw.replace(/\/+$/, "") };
    }
  } catch {
  }
  return { endpoint: "invalid", baseUrl: ANTHROPIC_DEFAULT_BASE_URL };
}

function parseSttProvider(value: string | undefined): SttProvider | null {
  const v = clean(value)?.toLowerCase();
  return STT_PROVIDERS.includes(v as SttProvider) ? (v as SttProvider) : null;
}

export function getAiConfig(): AiConfig {
  const env = process.env;
  const provider = parseSttProvider(env.STT_PROVIDER);
  const { endpoint, baseUrl } = parseBaseUrl(env.ANTHROPIC_BASE_URL);
  const hasCredential = Boolean(
    clean(env.ANTHROPIC_API_KEY) ?? clean(env.ANTHROPIC_AUTH_TOKEN),
  );
  return {
    llm: {
      configured: hasCredential && endpoint !== "invalid",
      model: clean(env.LLM_MODEL) ?? DEFAULT_LLM_MODEL,
      endpoint,
      baseUrl,
    },
    stt: {
      configured: provider !== null && Boolean(clean(env.STT_API_KEY)),
      provider,
      model: clean(env.STT_MODEL) ?? null,
    },
  };
}
