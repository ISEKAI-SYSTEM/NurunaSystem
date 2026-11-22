import "server-only";

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT_PER_MINUTE = 20;
const MAX_ENTRIES = 10_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function limitPerMinute(): number {
  const n = Number(process.env.AI_RATE_LIMIT_PER_MINUTE);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_LIMIT_PER_MINUTE;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "tanpa-ip";
  return ip;
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  limit = limitPerMinute(),
  now = Date.now(),
): RateLimitResult {
  if (buckets.size >= MAX_ENTRIES) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function rateLimitAi(request: Request): Response | null {
  const result = checkRateLimit(`ai:${clientKey(request)}`);
  if (result.ok) return null;
  return Response.json(
    {
      error: `Terlalu banyak permintaan. Silakan coba lagi dalam ${result.retryAfterSeconds} detik.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
