import { getAiConfig } from "@/lib/ai/config";
import { interpretCommand } from "@/lib/ai/perintah";
import { rateLimitAi } from "@/lib/ai/rate-limit";
import { SttError, transcribeAudio } from "@/lib/ai/stt";
import type { PerintahResponse } from "@/lib/perintah/commands";

const COMMAND_VOCABULARY =
  "Perintah Nuruna: putar, jeda, lanjutkan, ayat berikutnya, ayat sebelumnya, ulangi, tafsir, setoran, tanya Nuruna, mode hafalan, latihan, bantuan, buka surat Al-Fatihah, Yasin, Al-Mulk, ayat.";

const SILENCE_HALLUCINATIONS = /^(terima kasih( (telah|sudah) menonton)?|thank you|subtitle[^.]*|\.*)\.?$/i;

const MAX_COMMAND_BYTES = 2 * 1024 * 1024;

const json = (body: PerintahResponse, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const limited = rateLimitAi(request);
  if (limited) return limited;

  const config = getAiConfig();
  if (!config.stt.configured || !config.llm.configured) {
    return json({ error: "Perintah suara belum diaktifkan di server." }, 503);
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return json({ error: "Rekaman tidak terbaca. Coba lagi." }, 400);
  }
  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: "Rekaman kosong. Coba lagi." }, 400);
  }
  if (audio.size > MAX_COMMAND_BYTES) {
    return json({ error: "Perintah terlalu panjang. Ucapkan perintah singkat." }, 413);
  }
  if (!/^(audio|video)\//.test(audio.type)) {
    return json({ error: "Format rekaman tidak didukung." }, 415);
  }

  let transcript: string;
  try {
    transcript = await transcribeAudio(audio, config.stt, {
      language: "id",
      prompt: COMMAND_VOCABULARY,
      signal: request.signal,
    });
  } catch (err) {
    if (err instanceof SttError) return json({ error: err.message }, err.status);
    console.error("perintah: STT", err);
    return json({ error: "Suara gagal diproses. Coba lagi." }, 502);
  }

  if (SILENCE_HALLUCINATIONS.test(transcript.trim())) transcript = "";

  try {
    const command = await interpretCommand(transcript, request.signal);
    return json({ transcript, command });
  } catch (err) {
    console.error("perintah: Claude", err);
    return json({ error: "Perintah gagal dipahami. Coba lagi sebentar lagi." }, 502);
  }
}
