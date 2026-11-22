import type { TajweedSegment } from "./tajweed";

export type RevelationPlace = "makkah" | "madinah";

export type Chapter = {
  id: number;
  nameSimple: string;
  nameArabic: string;
  translatedName: string;
  versesCount: number;
  revelationPlace: RevelationPlace;
  revelationOrder: number;
  bismillahPre: boolean;
};

export type Juz = {
  number: number;
  chapters: { id: number; verses: string }[];
};

export type Word = {
  position: number;
  textUthmani: string;
  textImlaei: string;
  translation: string;
  tajweed: TajweedSegment[];
};

export type WordSegment = {
  fromPosition: number;
  toPosition: number;
  startMs: number;
  endMs: number;
};

export type Verse = {
  verseNumber: number;
  verseKey: string;
  juzNumber: number;
  words: Word[];
  translation: string;
  audioUrl: string;
  segments: WordSegment[];
};
