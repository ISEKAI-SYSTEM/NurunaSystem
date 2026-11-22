import { type Rng, shuffle } from "@/lib/latihan/quiz";

import { summarizeMatch } from "./match";
import { normalizeWord } from "./normalize";
import type { SetoranResult, SetoranVerseInput, SetoranWord } from "./setoran";

export type PickAnswer = string | null;

export type PassageWord = { verseNumber: number; position: number; text: string };

export function passageWords(verses: readonly SetoranVerseInput[]): PassageWord[] {
  return verses.flatMap((v) =>
    v.words.map((w) => ({ verseNumber: v.verseNumber, position: w.position, text: w.textUthmani })),
  );
}

export function pickOptions(correct: string, pool: readonly string[], rng: Rng, count = 4): string[] {
  const correctNorm = normalizeWord(correct);
  const seen = new Set([correctNorm]);
  const distractors: string[] = [];
  for (const word of shuffle(pool, rng)) {
    const norm = normalizeWord(word);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    distractors.push(word);
    if (distractors.length >= count - 1) break;
  }
  return shuffle([correct, ...distractors], rng);
}

export function isPickCorrect(correct: string, picked: string): boolean {
  return normalizeWord(correct) === normalizeWord(picked);
}

export function pickResult(words: readonly PassageWord[], answers: readonly PickAnswer[]): SetoranResult {
  const result: SetoranWord[] = words.map((w, index) => {
    const base = { index, expected: w.text, verseNumber: w.verseNumber, position: w.position };
    const answer = index < answers.length ? answers[index] : null;
    if (answer === null) return { ...base, status: "terlewat", heard: null };
    return { ...base, status: isPickCorrect(w.text, answer) ? "benar" : "salah", heard: answer };
  });
  return { words: result, summary: summarizeMatch(result) };
}
