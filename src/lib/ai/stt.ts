import "server-only";

import { type AiConfig, type SttProvider } from "./config";

const PROVIDERS: Record<SttProvider, { url: string; defaultModel: string }> = {
  groq: {
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    defaultModel: "whisper-large-v3",
  },
  openai: {
    url: "https://api.openai.com/v1/audio/transcriptions",
    defaultModel: "whisper-1",
  },
};

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export class SttError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function transcribeAudio(
  audio: File,
  stt: AiConfig["stt"],
  { language, prompt, signal }: { language: "ar" | "id"; prompt?: string; signal?: AbortSignal },
): Promise<string> {
  const apiKey = process.env.STT_API_KEY?.trim();
  if (!stt.provider || !apiKey) {
    throw new SttError("Fitur setoran suara belum diaktifkan di server.", 503);
  }
  const provider = PROVIDERS[stt.provider];

  const body = new FormData();
  body.set("file", audio, audio.name || "rekaman.webm");
  body.set("model", stt.model ?? provider.defaultModel);
  body.set("language", language);
  body.set("response_format", "json");
  body.set("temperature", "0");
  if (prompt) body.set("prompt", prompt);

  let res: Response;
  try {
    res = await fetch(provider.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal,
    });
  } catch (err) {
    console.error("STT: gagal menghubungi penyedia", err);
    throw new SttError("Layanan pengenal suara tidak bisa dihubungi. Coba lagi sebentar lagi.", 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`STT ${stt.provider} ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 429) {
      throw new SttError("Layanan pengenal suara sedang sibuk. Coba lagi dalam beberapa saat.", 503);
    }
    if (res.status === 413) {
      throw new SttError("Rekaman terlalu panjang. Coba setor lebih sedikit ayat.", 413);
    }
    throw new SttError("Bacaan gagal diproses. Coba lagi.", 502);
  }

  const data = (await res.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof data?.text !== "string") {
    throw new SttError("Bacaan gagal diproses. Coba lagi.", 502);
  }
  return data.text.trim();
}
