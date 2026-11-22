import { rateLimitAi } from "@/lib/ai/rate-limit";
import { TanyaError, streamTanya } from "@/lib/ai/tanya";
import { parseTanyaRequest } from "@/lib/tanya/types";

const jsonError = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const limited = rateLimitAi(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Permintaan tidak valid.", 400);
  }
  const parsed = parseTanyaRequest(body);
  if (typeof parsed === "string") return jsonError(parsed, 400);

  try {
    const stream = await streamTanya(parsed, request.signal);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof TanyaError) return jsonError(err.message, err.status);
    console.error("tanya:", err);
    return jsonError("Tanya Nuruna sedang tidak bisa menjawab. Coba lagi.", 500);
  }
}
