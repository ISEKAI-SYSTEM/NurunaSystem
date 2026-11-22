import { LEARNING_MODE_LABELS, LEARNING_MODES, type LearningMode } from "@/lib/settings";

export type ModeGuide = {
  choice: string;
  summary: string;
};

export const MODE_GUIDES: Record<LearningMode, ModeGuide> = {
  tunanetra: {
    choice: "Saya tunanetra atau low vision",
    summary: "Belajar lewat suara qari, teks Arab besar, dan pintasan keyboard.",
  },
  tunarungu: {
    choice: "Saya tunarungu atau sulit mendengar",
    summary: "Semua bisa diikuti lewat mata: arti per kata, warna tajwid, dan isyarat.",
  },
  tunawicara: {
    choice: "Saya tunawicara atau sulit berbicara",
    summary: "Belajar dan menghafal tanpa perlu berbicara atau memakai mikrofon.",
  },
  umum: {
    choice: "Saya ingin tampilan standar",
    summary: "Membaca, mendengarkan murottal, dan menghafal dengan pengaturan bawaan.",
  },
};

export const VISION_QUESTION = "Apakah Anda tunanetra atau sulit melihat layar?";

export const VISION_OPTIONS = [
  {
    answer: true,
    title: "Ya, saya tunanetra atau low vision",
    description: "Nuruna membimbing dengan suara, teks besar, dan pintasan keyboard.",
  },
  {
    answer: false,
    title: "Tidak",
    description: "Pilih cara belajar lain: tunarungu, tunawicara, atau umum.",
  },
] as const;

export const OTHER_MODES = LEARNING_MODES.filter((m) => m !== "tunanetra");

export function indexForKey(key: string, count: number): number | null {
  const index = Number(key) - 1;
  return /^[1-9]$/.test(key) && index < count ? index : null;
}

const STOP_HINT = "Tekan Escape untuk menghentikan suara.";

export function visionScript({ voice = false }: { voice?: boolean } = {}): string {
  return [
    `Selamat datang di Nuruna. ${VISION_QUESTION}`,
    "Tekan 1 bila ya, atau 2 bila tidak.",
    voice ? "Atau tekan V, lalu ucapkan ya atau tidak." : "",
    STOP_HINT,
  ]
    .filter(Boolean)
    .join(" ");
}

export function otherModesScript({ voice = false }: { voice?: boolean } = {}): string {
  const options = OTHER_MODES.map(
    (mode, i) => `Tekan ${i + 1} untuk mode ${LEARNING_MODE_LABELS[mode]}: ${MODE_GUIDES[mode].summary}`,
  );
  return [
    "Bagaimana Anda ingin belajar?",
    ...options,
    voice ? "Atau tekan V, lalu ucapkan nomornya." : "",
    "Pilihan ini bisa diubah kapan saja.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const SCREEN_READER_QUESTION = "Apakah Anda memakai pembaca layar seperti NVDA, TalkBack, atau VoiceOver?";

export const SCREEN_READER_OPTIONS = [
  {
    answer: true,
    title: "Ya, saya memakai pembaca layar",
    description: "Nuruna tidak ikut bersuara supaya tidak dibacakan dua kali.",
  },
  {
    answer: false,
    title: "Tidak, bacakan dengan suara Nuruna",
    description: "Pemandu suara membacakan nama halaman, tombol yang dipilih, dan setiap hasil.",
  },
] as const;

export function screenReaderScript({ voice = false }: { voice?: boolean } = {}): string {
  return [
    `Mode Tunanetra dipilih. ${SCREEN_READER_QUESTION}`,
    `Tekan 1 bila ya: ${SCREEN_READER_OPTIONS[0].description}`,
    `Tekan 2 bila tidak: ${SCREEN_READER_OPTIONS[1].description}`,
    voice ? "Atau tekan V, lalu ucapkan ya atau tidak." : "",
    STOP_HINT,
  ]
    .filter(Boolean)
    .join(" ");
}

function words(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const MODE_KEYWORDS: Record<LearningMode, readonly string[]> = {
  tunanetra: ["tunanetra", "netra", "buta", "penglihatan", "lowvision"],
  tunarungu: ["tunarungu", "rungu", "tuli", "pendengaran"],
  tunawicara: ["tunawicara", "wicara", "bisu"],
  umum: ["umum", "standar", "biasa"],
};

const NUMBER_WORDS: readonly (readonly string[])[] = [
  ["1", "satu", "kesatu", "pertama"],
  ["2", "dua", "kedua"],
  ["3", "tiga", "ketiga"],
  ["4", "empat", "keempat"],
];

function mentionedModes(tokens: string[]): Set<LearningMode> {
  const joined = tokens.join("");
  const found = new Set<LearningMode>();
  for (const mode of LEARNING_MODES) {
    if (MODE_KEYWORDS[mode].some((w) => tokens.includes(w) || joined.includes(w))) found.add(mode);
  }
  return found;
}

export function pickFromSpeech(transcript: string, options: readonly LearningMode[]): LearningMode | null {
  const tokens = words(transcript);
  const found = new Set([...mentionedModes(tokens)].filter((m) => options.includes(m)));
  NUMBER_WORDS.forEach((numberWords, i) => {
    if (i < options.length && numberWords.some((w) => tokens.includes(w))) found.add(options[i]);
  });
  return found.size === 1 ? [...found][0] : null;
}

export function pickFromAlternatives(
  alternatives: readonly string[],
  options: readonly LearningMode[],
): LearningMode | null {
  for (const text of alternatives) {
    const mode = pickFromSpeech(text, options);
    if (mode) return mode;
  }
  return null;
}

const YES = ["ya", "iya", "iyah", "yes", "betul", "benar", "pakai", "memakai", "menggunakan", "1", "satu", "pertama"];
const NO = ["tidak", "tak", "nggak", "enggak", "ngga", "gak", "ga", "no", "bukan", "belum", "2", "dua", "kedua"];

export function yesNoFromSpeech(alternatives: readonly string[]): boolean | null {
  for (const text of alternatives) {
    const tokens = words(text);
    if (NO.some((w) => tokens.includes(w))) return false;
    if (YES.some((w) => tokens.includes(w))) return true;
  }
  return null;
}

export function visionAnswerFromSpeech(alternatives: readonly string[]): boolean | null {
  for (const text of alternatives) {
    const tokens = words(text);
    const sentence = tokens.join(" ");
    const modes = mentionedModes(tokens);
    if (modes.has("tunanetra") || /(^| )(tidak|nggak|gak|enggak|sulit|susah|kurang) (bisa |dapat )?(melihat|lihat)( |$)/.test(sentence)) {
      return true;
    }
    if (modes.size > 0) return false;
  }
  return yesNoFromSpeech(alternatives);
}
