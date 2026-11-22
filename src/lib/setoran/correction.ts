import type { WordSegment } from "@/lib/quran/types";

import type { SetoranWord } from "./setoran";

export type CorrectionVerse = {
  verseNumber: number;
  audioUrl: string;
  segments: readonly WordSegment[];
};

export type CorrectionClip = {
  verseNumber: number;
  audioUrl: string;
  startMs: number;
  endMs: number | null;
  fromPosition: number;
  toPosition: number;
};

const PAD_MS = 150;

export function correctionClips(
  verses: readonly CorrectionVerse[],
  words: readonly SetoranWord[],
): CorrectionClip[] {
  const clips: CorrectionClip[] = [];

  for (const verse of verses) {
    if (!verse.audioUrl) continue;
    const positions = [
      ...new Set(
        words
          .filter(
            (w) =>
              (w.status === "salah" || w.status === "terlewat") &&
              w.verseNumber === verse.verseNumber &&
              w.position !== null,
          )
          .map((w) => w.position as number),
      ),
    ].sort((a, b) => a - b);
    if (positions.length === 0) continue;

    const segments = positions.map((p) =>
      verse.segments.find((s) => s.fromPosition <= p && p <= s.toPosition),
    );
    if (segments.some((s) => !s)) {
      clips.push({
        verseNumber: verse.verseNumber,
        audioUrl: verse.audioUrl,
        startMs: 0,
        endMs: null,
        fromPosition: positions[0],
        toPosition: positions[positions.length - 1],
      });
      continue;
    }

    const unique = [...new Set(segments as WordSegment[])].sort(
      (a, b) => a.fromPosition - b.fromPosition,
    );
    let current: CorrectionClip | null = null;
    for (const seg of unique) {
      if (current && seg.fromPosition <= current.toPosition + 1) {
        current.toPosition = Math.max(current.toPosition, seg.toPosition);
        current.endMs = Math.max(current.endMs ?? 0, seg.endMs + PAD_MS);
        continue;
      }
      current = {
        verseNumber: verse.verseNumber,
        audioUrl: verse.audioUrl,
        startMs: Math.max(0, seg.startMs - PAD_MS),
        endMs: seg.endMs + PAD_MS,
        fromPosition: seg.fromPosition,
        toPosition: seg.toPosition,
      };
      clips.push(current);
    }
  }
  return clips;
}

export function describeClip(clip: CorrectionClip, multiVerse: boolean): string {
  const words =
    clip.fromPosition === clip.toPosition
      ? `kata ${clip.fromPosition}`
      : `kata ${clip.fromPosition} sampai ${clip.toPosition}`;
  return multiVerse ? `ayat ${clip.verseNumber}, ${words}` : words;
}
