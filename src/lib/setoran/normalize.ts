const MARKS =
  /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿ]/g;
const TATWEEL = /ـ/g;

const LETTER_MAP: Record<string, string> = {
  "آ": "ا", // alif madd -> alif
  "أ": "ا", // alif hamzah atas -> alif
  "إ": "ا", // alif hamzah bawah -> alif
  "ٱ": "ا", // alif wasl -> alif
  "ٲ": "ا",
  "ٳ": "ا",
  "ى": "ي", // alif maqsurah -> ya
  "ی": "ي", // ya Persia -> ya
  "ئ": "ي", // ya berhamzah -> ya
  "ؤ": "و", // waw berhamzah -> waw
  "ة": "ه", // ta marbutah -> ha
  "ک": "ك", // kaf Persia -> kaf
  "ء": "", // hamzah lepas: ejaannya sering berbeda, abaikan
};

const NON_LETTER = /[^ء-غف-ي\s]/g;

export function stripMarks(text: string): string {
  return text.normalize("NFC").replace(MARKS, "").replace(TATWEEL, "");
}

export function normalizeArabic(text: string): string {
  return text
    .normalize("NFC")
    .replace(MARKS, "")
    .replace(TATWEEL, "")
    .replace(/[ء-ۿ]/g, (ch) => LETTER_MAP[ch] ?? ch)
    .replace(NON_LETTER, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWord(text: string): string {
  return normalizeArabic(text).replace(/\s/g, "");
}
