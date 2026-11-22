import "server-only";

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { getChapters } from "@/lib/quran/api";
import { COMMAND_ACTIONS, type VoiceCommand } from "@/lib/perintah/commands";

import { getClaude } from "./claude";

const CommandSchema = z.object({
  action: z.enum(COMMAND_ACTIONS),
  surah: z.number().int().nullable(),
  ayat: z.number().int().nullable(),
});

const ACTION_GUIDE = `Aksi yang tersedia:
- buka_surah: membuka surah untuk dibaca. Isi "surah", dan "ayat" bila disebut.
- latihan: membuka latihan/kuis hafalan. Isi "surah" bila disebut.
- putar: memutar atau melanjutkan murottal. Isi "ayat" bila disebut ("putar ayat 3").
- jeda: menjeda/berhenti memutar.
- berikutnya: ke ayat berikutnya / selanjutnya.
- sebelumnya: ke ayat sebelumnya.
- ulangi: mengulang ayat yang sedang diputar.
- tafsir: membuka tafsir. Isi "ayat" bila disebut.
- setoran: membuka setoran hafalan (merekam bacaan). Isi "ayat" bila disebut.
- tanya: membuka Tanya Nuruna untuk bertanya tentang ayat. Isi "ayat" bila disebut.
- hafalan_nyala: menyalakan mode hafalan (menyembunyikan teks).
- hafalan_mati: mematikan mode hafalan (menampilkan teks).
- bantuan: pengguna minta bantuan atau contoh perintah.
- tidak_dikenal: perintah tidak jelas atau tidak cocok dengan aksi di atas.`;

let systemPromptCache: string | null = null;

async function systemPrompt(): Promise<string> {
  if (systemPromptCache) return systemPromptCache;
  const chapters = await getChapters();
  const list = chapters.map((c) => `${c.id}. ${c.nameSimple} (${c.translatedName})`).join("\n");
  systemPromptCache = `Kamu mengubah perintah suara berbahasa Indonesia dari pengguna aplikasi belajar Al-Qur'an "Nuruna" menjadi tepat satu aksi.

Teks perintah berasal dari pengenal suara, jadi ejaannya bisa keliru (mis. "yasin" = Ya-Sin, "al mulk" atau "almulk" = Al-Mulk, "surat" = "surah"). Angka bisa diucapkan dengan kata ("sepuluh" = 10, "dua puluh lima" = 25).

${ACTION_GUIDE}

Aturan:
- "surah" hanya boleh nomor dari daftar di bawah. Jangan menebak: bila nama surah tidak jelas, pilih tidak_dikenal.
- Isi "surah" dan "ayat" dengan null bila tidak disebut.
- Abaikan kata sopan seperti "tolong", "coba", "dong".

Daftar surah (nomor. nama (arti)):
${list}`;
  return systemPromptCache;
}

export async function interpretCommand(transcript: string, signal?: AbortSignal): Promise<VoiceCommand> {
  const unknown: VoiceCommand = { action: "tidak_dikenal", surah: null, surahName: null, ayat: null };
  if (!transcript.trim()) return unknown;
  const claude = getClaude();
  if (!claude) throw new Error("Claude belum dikonfigurasi");

  const response = await claude.client.messages.parse(
    {
      model: claude.model,
      max_tokens: 1024,
      system: [{ type: "text", text: await systemPrompt(), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `<perintah>${transcript.trim().slice(0, 300)}</perintah>` }],
      output_config: { effort: "low", format: zodOutputFormat(CommandSchema) },
    },
    { signal },
  );
  const parsed = response.parsed_output;
  if (response.stop_reason === "refusal" || !parsed) return unknown;

  const chapters = await getChapters();
  const chapter = parsed.surah ? chapters.find((c) => c.id === parsed.surah) : undefined;
  const command: VoiceCommand = {
    action: parsed.action,
    surah: chapter?.id ?? null,
    surahName: chapter?.nameSimple ?? null,
    ayat: parsed.ayat && parsed.ayat > 0 ? parsed.ayat : null,
  };
  if (command.action === "buka_surah" && !chapter) return unknown;
  if (chapter && command.ayat && command.ayat > chapter.versesCount) command.ayat = null;
  return command;
}
