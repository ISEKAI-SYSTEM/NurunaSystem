import { type LlmEndpoint, getAiConfig } from "@/lib/ai/config";
import { rateLimitAi } from "@/lib/ai/rate-limit";

export type AiHealthResponse = {
  llm: { configured: boolean; model: string; endpoint: LlmEndpoint };
  stt: { configured: boolean; provider: string | null };
};

export async function GET(request: Request) {
  const limited = rateLimitAi(request);
  if (limited) return limited;

  const { llm, stt } = getAiConfig();
  const body: AiHealthResponse = {
    llm: { configured: llm.configured, model: llm.model, endpoint: llm.endpoint },
    stt: { configured: stt.configured, provider: stt.provider },
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
