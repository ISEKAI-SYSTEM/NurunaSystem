export const COMMAND_ACTIONS = [
  "buka_surah",
  "latihan",
  "putar",
  "jeda",
  "berikutnya",
  "sebelumnya",
  "ulangi",
  "tafsir",
  "setoran",
  "tanya",
  "hafalan_nyala",
  "hafalan_mati",
  "bantuan",
  "tidak_dikenal",
] as const;
export type CommandAction = (typeof COMMAND_ACTIONS)[number];

export type VoiceCommand = {
  action: CommandAction;
  surah: number | null;
  surahName: string | null;
  ayat: number | null;
};

export type PerintahResponse = { transcript: string; command: VoiceCommand } | { error: string };

export const READER_ACTIONS: ReadonlySet<CommandAction> = new Set([
  "putar",
  "jeda",
  "berikutnya",
  "sebelumnya",
  "ulangi",
  "tafsir",
  "setoran",
  "tanya",
  "hafalan_nyala",
  "hafalan_mati",
]);

export const PERINTAH_EVENT = "nuruna:perintah";
export type PerintahEventDetail = { action: CommandAction; ayat: number | null };

export const HELP_TEXT =
  'Contoh perintah: "buka surat Yasin ayat 10", "putar", "jeda", "ayat berikutnya", "ulangi", "tafsir ayat 3", "setoran ayat 1", "tanya Nuruna ayat 2", "mode hafalan", "latihan Al-Ikhlas".';

const PANEL_NAME: Partial<Record<CommandAction, string>> = {
  tafsir: "tafsir",
  setoran: "setoran",
  tanya: "Tanya Nuruna",
};

export function describeCommand(cmd: VoiceCommand, transcript: string): string {
  const ayat = cmd.ayat ? ` ayat ${cmd.ayat}` : "";
  switch (cmd.action) {
    case "buka_surah":
      return `Membuka Surah ${cmd.surahName ?? cmd.surah}${ayat}.`;
    case "latihan":
      return cmd.surah ? `Membuka latihan Surah ${cmd.surahName ?? cmd.surah}.` : "Membuka halaman latihan.";
    case "putar":
      return cmd.ayat ? `Memutar ayat ${cmd.ayat}.` : "Memutar murottal.";
    case "jeda":
      return "Murottal dijeda.";
    case "berikutnya":
      return "Ayat berikutnya.";
    case "sebelumnya":
      return "Ayat sebelumnya.";
    case "ulangi":
      return "Mengulang ayat.";
    case "tafsir":
    case "setoran":
    case "tanya":
      return `Membuka ${PANEL_NAME[cmd.action]}${ayat || " ayat yang sedang dibuka"}.`;
    case "hafalan_nyala":
      return "Mode hafalan dinyalakan.";
    case "hafalan_mati":
      return "Mode hafalan dimatikan.";
    case "bantuan":
      return HELP_TEXT;
    case "tidak_dikenal":
      return transcript.trim()
        ? `Maaf, perintah belum dikenali: "${transcript.trim()}". Ucapkan "bantuan" untuk contoh perintah.`
        : 'Maaf, suara tidak terdengar jelas. Coba lagi, atau ucapkan "bantuan".';
  }
}

export function commandHref(cmd: VoiceCommand): string | null {
  if (cmd.action === "buka_surah" && cmd.surah) {
    return `/surah/${cmd.surah}${cmd.ayat ? `#ayat-${cmd.ayat}` : ""}`;
  }
  if (cmd.action === "latihan") return cmd.surah ? `/latihan/${cmd.surah}` : "/hafalan";
  return null;
}
