import { cacheLife } from "next/cache";

import { parseTajweed } from "./tajweed";
import type { Chapter, Juz, RevelationPlace, Verse, WordSegment } from "./types";

const API_BASE = "https://api.quran.com/api/v4";
const AUDIO_BASE = "https://verses.quran.com/";

export const TRANSLATION_KEMENAG = 33;
export const RECITATION_ALAFASY = 7;

export const TOTAL_CHAPTERS = 114;

type ApiChapter = {
  id: number;
  revelation_place: RevelationPlace;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  translated_name: { name: string };
};

type ApiWord = {
  position: number;
  char_type_name: "word" | "end" | string;
  text_uthmani: string;
  text_uthmani_tajweed?: string | null;
  text_imlaei_simple?: string | null;
  translation: { text: string | null } | null;
};

type ApiVerse = {
  verse_number: number;
  verse_key: string;
  juz_number: number;
  words: ApiWord[];
  translations: { resource_id: number; text: string }[];
  audio: { url: string; segments: number[][] } | null;
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Quran API ${res.status} untuk ${path}`);
  }
  return (await res.json()) as T;
}

function cleanTranslation(text: string): string {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSegments(raw: number[][] | undefined): WordSegment[] {
  if (!raw) return [];
  return raw
    .filter((s) => s.length >= 4)
    .map(([start, end, startMs, endMs]) => ({
      fromPosition: start + 1,
      toPosition: end,
      startMs,
      endMs,
    }));
}

function toChapter(c: ApiChapter): Chapter {
  return {
    id: c.id,
    nameSimple: c.name_simple,
    nameArabic: c.name_arabic,
    translatedName: c.translated_name.name,
    versesCount: c.verses_count,
    revelationPlace: c.revelation_place,
    revelationOrder: c.revelation_order,
    bismillahPre: c.bismillah_pre,
  };
}

function toVerse(v: ApiVerse): Verse {
  const translation =
    v.translations.find((t) => t.resource_id === TRANSLATION_KEMENAG)?.text ??
    "";
  return {
    verseNumber: v.verse_number,
    verseKey: v.verse_key,
    juzNumber: v.juz_number,
    words: v.words
      .filter((w) => w.char_type_name === "word")
      .map((w) => ({
        position: w.position,
        textUthmani: w.text_uthmani,
        textImlaei: w.text_imlaei_simple || w.text_uthmani,
        translation: w.translation?.text ?? "",
        tajweed: w.text_uthmani_tajweed
          ? parseTajweed(w.text_uthmani_tajweed)
          : [{ text: w.text_uthmani, rule: null }],
      })),
    translation: cleanTranslation(translation),
    audioUrl: v.audio ? new URL(v.audio.url, AUDIO_BASE).toString() : "",
    segments: toSegments(v.audio?.segments),
  };
}

export function isValidChapterId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= TOTAL_CHAPTERS;
}

type ApiJuz = { juz_number: number; verse_mapping: Record<string, string> };

export async function getJuzs(): Promise<Juz[]> {
  "use cache";
  cacheLife("max");
  const data = await fetchJson<{ juzs: ApiJuz[] }>("/juzs");
  const byNumber = new Map<number, Juz>();
  for (const j of data.juzs) {
    if (byNumber.has(j.juz_number)) continue;
    byNumber.set(j.juz_number, {
      number: j.juz_number,
      chapters: Object.entries(j.verse_mapping)
        .map(([id, verses]) => ({ id: Number(id), verses }))
        .sort((a, b) => a.id - b.id),
    });
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

export async function getChapters(): Promise<Chapter[]> {
  "use cache";
  cacheLife("max");
  const data = await fetchJson<{ chapters: ApiChapter[] }>(
    "/chapters?language=id",
  );
  return data.chapters.map(toChapter);
}

export async function getChapter(id: number): Promise<Chapter | undefined> {
  const chapters = await getChapters();
  return chapters.find((c) => c.id === id);
}

export async function getVerses(chapterId: number): Promise<Verse[]> {
  "use cache";
  cacheLife("max");
  const params = new URLSearchParams({
    language: "id",
    words: "true",
    word_fields: "text_uthmani,text_uthmani_tajweed,text_imlaei_simple",
    translations: String(TRANSLATION_KEMENAG),
    audio: String(RECITATION_ALAFASY),
    per_page: "300",
  });
  const data = await fetchJson<{ verses: ApiVerse[] }>(
    `/verses/by_chapter/${chapterId}?${params}`,
  );
  return data.verses.map(toVerse);
}
