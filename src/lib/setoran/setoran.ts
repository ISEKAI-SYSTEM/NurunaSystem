import {
  type ExpectedWord,
  type MatchSummary,
  type MatchedWord,
  matchRecitation,
  summarizeMatch,
} from "./match";
import { normalizeWord } from "./normalize";

export type SetoranWordInput = { position: number; textUthmani: string; textImlaei: string };
export type SetoranVerseInput = { verseKey: string; verseNumber: number; words: SetoranWordInput[] };

export type SetoranWord = MatchedWord & {
  verseNumber: number | null;
  position: number | null;
};

export type SetoranResult = { words: SetoranWord[]; summary: MatchSummary };

const ISTIADHA = ["اعوذ", "بالله", "من", "الشيطان", "الرجيم"];

const MUQATTAAT_SURAHS = new Set([
  2, 3, 7, 10, 11, 12, 13, 14, 15, 19, 20, 26, 27, 28, 29, 30, 31, 32, 36, 38,
  40, 41, 42, 43, 44, 45, 46, 50, 68,
]);

const LETTER_NAMES: Record<string, string> = {
  ا: "الف",
  ل: "لام",
  م: "ميم",
  ر: "را",
  ص: "صاد",
  ك: "كاف",
  ه: "ها",
  ي: "يا",
  ع: "عين",
  ط: "طا",
  س: "سين",
  ح: "حا",
  ق: "قاف",
  ن: "نون",
};

function isMuqattaat(verseKey: string, position: number): boolean {
  const [surah, ayah] = verseKey.split(":").map(Number);
  if (position !== 1 || !MUQATTAAT_SURAHS.has(surah)) return false;
  return ayah === 1 || (surah === 42 && ayah === 2);
}

export function muqattaatSpelling(word: string): string | null {
  const letters = [...normalizeWord(word)];
  if (letters.length === 0) return null;
  const names = letters.map((ch) => LETTER_NAMES[ch]);
  return names.every(Boolean) ? names.join("") : null;
}

function expectedSpellings(verseKey: string, word: SetoranWordInput): ExpectedWord {
  const spellings = [word.textUthmani, word.textImlaei];
  if (isMuqattaat(verseKey, word.position)) {
    const spoken = muqattaatSpelling(word.textUthmani);
    if (spoken) spellings.push(spoken);
  }
  return spellings;
}

function prepareSetoran(verses: readonly SetoranVerseInput[], basmalah: readonly SetoranWordInput[]) {
  const refs = verses.flatMap((v) =>
    v.words.map((w) => ({
      verseNumber: v.verseNumber,
      position: w.position,
      expected: w.textUthmani,
    })),
  );
  const expected = verses.flatMap((v) =>
    v.words.map((w) => expectedSpellings(v.verseKey, w)),
  );

  const startsWithBasmalahVerse = verses[0]?.verseKey === "1:1";
  const opening: ExpectedWord[] = [
    ...ISTIADHA,
    ...(startsWithBasmalahVerse ? [] : basmalah.map((w) => [w.textUthmani, w.textImlaei])),
  ];
  return { refs, expected, opening };
}

export function checkSetoran(
  verses: readonly SetoranVerseInput[],
  heardText: string,
  basmalah: readonly SetoranWordInput[] = [],
): SetoranResult {
  const { refs, expected, opening } = prepareSetoran(verses, basmalah);
  const matched = matchRecitation(expected, heardText, { opening });
  const words: SetoranWord[] = matched.map((m) => ({
    ...m,
    verseNumber: m.index === null ? null : refs[m.index].verseNumber,
    position: m.index === null ? null : refs[m.index].position,
  }));
  return { words, summary: summarizeMatch(matched) };
}

export type LiveStatus = "benar" | "salah" | "terlewat" | "belum";

export type LiveWord = {
  verseNumber: number;
  position: number;
  expected: string;
  status: LiveStatus;
  heard: string | null;
};

export type LiveResult = {
  words: LiveWord[];
  next: number;
  extra: number;
};

export function checkSetoranLive(
  verses: readonly SetoranVerseInput[],
  heardText: string,
  basmalah: readonly SetoranWordInput[] = [],
  { tentativeTail = false }: { tentativeTail?: boolean } = {},
): LiveResult {
  const { refs, expected, opening } = prepareSetoran(verses, basmalah);
  const words: LiveWord[] = refs.map((r) => ({ ...r, status: "belum", heard: null }));
  let extra = 0;
  for (const m of matchRecitation(expected, heardText, { opening, partial: true })) {
    if (m.index === null) {
      extra++;
      continue;
    }
    words[m.index] = { ...words[m.index], status: m.status, heard: m.heard };
  }
  let last = words.findLastIndex((w) => w.status !== "belum");
  if (tentativeTail && last >= 0 && words[last].status === "salah") {
    words[last] = { ...words[last], status: "belum", heard: null };
    last = words.findLastIndex((w) => w.status !== "belum");
  }
  return { words, next: last + 1, extra };
}

export function holdLiveProgress(prev: LiveResult | null, next: LiveResult): LiveResult {
  if (!prev || prev.words.length !== next.words.length || next.next >= prev.next) return next;
  const words = next.words.map((w, i) => (i >= next.next && i < prev.next ? prev.words[i] : w));
  return { words, next: prev.next, extra: next.extra };
}
