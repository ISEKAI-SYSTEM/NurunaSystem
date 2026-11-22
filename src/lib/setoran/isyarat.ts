import { LETTER_BY_ID } from "@/lib/isyarat/hijaiyah";

import { summarizeMatch } from "./match";
import { stripMarks } from "./normalize";
import type { SetoranResult, SetoranWord } from "./setoran";

export type SignStep = {
  id: string;
  char: string;
  name: string;
};

const CHAR_TO_ID: Record<string, string> = {
  ا: "alif", ٱ: "alif", آ: "alif", ٲ: "alif", ٳ: "alif",
  أ: "hamzah", إ: "hamzah", ء: "hamzah", ؤ: "hamzah", ئ: "hamzah",
  ب: "ba", ت: "ta", ث: "tsa", ج: "jim", ح: "ha", خ: "kho", د: "dal", ذ: "dzal",
  ر: "ro", ز: "za", س: "sin", ش: "syin", ص: "shod", ض: "dhod", ط: "tho", ظ: "zho",
  ع: "ain", غ: "ghoin", ف: "fa", ق: "qof", ك: "kaf", ک: "kaf", ل: "lam", م: "mim",
  ن: "nun", ه: "haa", ة: "ta-marbutah", و: "wau", ي: "ya", ى: "ya", ی: "ya",
};

export function signName(id: string): string {
  return id === "ta-marbutah" ? "Ta marbutah" : (LETTER_BY_ID.get(id)?.name ?? id);
}

export function signSteps(word: string): SignStep[] {
  return [...stripMarks(word)].flatMap((char) => {
    const id = CHAR_TO_ID[char];
    return id ? [{ id, char, name: signName(id) }] : [];
  });
}

export type SignRecord = {
  trail: string[];
  errors: number;
  skippedLetters: number;
  skipped: boolean;
  complete: boolean;
};

export const emptyRecord = (): SignRecord => ({
  trail: [],
  errors: 0,
  skippedLetters: 0,
  skipped: false,
  complete: false,
});

export type SignWord = { verseNumber: number; position: number; text: string };

export function signWordStatus(record: SignRecord | undefined): "belum" | "benar" | "salah" | "terlewat" {
  if (!record) return "belum";
  if (record.skipped) return "terlewat";
  if (!record.complete) return record.errors > 0 ? "salah" : "belum";
  return record.errors > 0 || record.skippedLetters > 0 ? "salah" : "benar";
}

export function signResult(words: readonly SignWord[], records: readonly (SignRecord | undefined)[]): SetoranResult {
  const result: SetoranWord[] = words.map((w, index) => {
    const base = { index, expected: w.text, verseNumber: w.verseNumber, position: w.position };
    const r = records[index];
    if (!r || r.skipped || (!r.complete && r.trail.length === 0)) return { ...base, status: "terlewat", heard: null };
    const ok = r.complete && r.errors === 0 && r.skippedLetters === 0;
    return { ...base, status: ok ? "benar" : "salah", heard: r.trail.join(" ") };
  });
  return { words: result, summary: summarizeMatch(result) };
}
