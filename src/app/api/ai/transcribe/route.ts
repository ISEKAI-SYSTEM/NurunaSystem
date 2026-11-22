import { getAiConfig } from "@/lib/ai/config";
import { rateLimitAi } from "@/lib/ai/rate-limit";
import { MAX_AUDIO_BYTES, SttError, transcribeAudio } from "@/lib/ai/stt";

export type TranscribeResponse = { text: string } | { error: string };

const json = (body: TranscribeResponse, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const limited = rateLimitAi(request);
  if (limited) return limited;

  const config = getAiConfig();
  if (!config.stt.configured) {
    return json({ error: "Fitur setoran suara belum diaktifkan di server." }, 503);
  }

  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_AUDIO_BYTES + 64 * 1024) {
    return json({ error: "Rekaman terlalu panjang. Coba setor lebih sedikit ayat." }, 413);
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return json({ error: "Rekaman tidak terbaca. Coba rekam ulang." }, 400);
  }
  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: "Rekaman kosong. Coba rekam ulang." }, 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return json({ error: "Rekaman terlalu panjang. Coba setor lebih sedikit ayat." }, 413);
  }
  if (!/^(audio|video)\//.test(audio.type)) {
    return json({ error: "Format rekaman tidak didukung." }, 415);
  }

  try {
    const text = await transcribeAudio(audio, config.stt, { language: "ar", signal: request.signal });
    return json({ text });
  } catch (err) {
    if (err instanceof SttError) return json({ error: err.message }, err.status);
    console.error("transcribe:", err);
    return json({ error: "Bacaan gagal diproses. Coba lagi." }, 500);
  }
}
