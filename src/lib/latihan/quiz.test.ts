import { describe, expect, it } from "vitest";

import fixtures from "@/lib/setoran/__fixtures__/ayat.json";
import { normalizeWord } from "@/lib/setoran/normalize";

import { type QuizVerse, generateQuiz, isOrderCorrect, seededRng, shuffle } from "./quiz";

type W = { position: number; uthmani: string; imlaei: string };
const raw = fixtures.verses as Record<string, W[]>;
const verse = (key: string, translation: string): QuizVerse => ({
  verseNumber: Number(key.split(":")[1]),
  words: raw[key].map((w) => ({ position: w.position, textUthmani: w.uthmani, textImlaei: w.imlaei })),
  translation,
  audioUrl: "",
});
const fatihah = [
  verse("1:1", "terjemahan ayat 1"),
  verse("1:2", "terjemahan ayat 2"),
  verse("1:5", "terjemahan ayat 5"),
  verse("1:7", "terjemahan ayat 7"),
];

describe("shuffle & seededRng", () => {
  it("acak tetapi bisa diulang dengan seed yang sama", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(7));
    expect(shuffle([1, 2, 3, 4, 5], seededRng(7))).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("generateQuiz", () => {
  it("membuat soal campuran dari ketiga jenis", () => {
    const qs = generateQuiz(fatihah, 9, seededRng(1));
    expect(qs.length).toBe(9);
    expect(new Set(qs.map((q) => q.type))).toEqual(new Set(["susun", "lengkapi", "arti"]));
  });

  it("tidak memakai ayat yang sama dua kali untuk jenis yang sama", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const qs = generateQuiz(fatihah, 12, seededRng(seed));
      const keys = qs.map((q) => `${q.type}:${q.verseNumber}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("soal susun: kata berasal dari ayat (urut), diacak, dan potongan untuk ayat panjang", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const q of generateQuiz(fatihah, 12, seededRng(seed))) {
        if (q.type !== "susun") continue;
        const v = fatihah.find((x) => x.verseNumber === q.verseNumber)!;
        expect(q.answer).toEqual(v.words.slice(q.from - 1, q.to).map((w) => w.textUthmani));
        expect([...q.shuffled].sort()).toEqual([...q.answer].sort());
        expect(q.shuffled.join(" ")).not.toBe(q.answer.join(" "));
        expect(q.answer.length).toBeLessThanOrEqual(8);
        expect(q.answer.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("soal lengkapi: jawaban ada di opsi, opsi berbeda-beda, kata yang hilang benar", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const q of generateQuiz(fatihah, 12, seededRng(seed))) {
        if (q.type !== "lengkapi") continue;
        const v = fatihah.find((x) => x.verseNumber === q.verseNumber)!;
        expect(q.options[q.answerIndex]).toBe(v.words[q.blank - 1].textUthmani);
        const keys = q.options.map((o) => normalizeWord(o));
        expect(new Set(keys).size).toBe(q.options.length);
        expect(q.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("soal arti: terjemahan yang benar ada di opsi, tanpa duplikat", () => {
    for (let seed = 1; seed <= 10; seed++) {
      for (const q of generateQuiz(fatihah, 12, seededRng(seed))) {
        if (q.type !== "arti") continue;
        const v = fatihah.find((x) => x.verseNumber === q.verseNumber)!;
        expect(q.options[q.answerIndex]).toBe(v.translation);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
    }
  });

  it("surah satu ayat pendek: hanya soal yang mungkin, tanpa error", () => {
    const qs = generateQuiz([verse("36:1", "Yā Sīn.")], 10, seededRng(3));
    expect(qs).toEqual([]);
  });

  it("isOrderCorrect membandingkan teks, jadi kata kembar boleh tertukar", () => {
    const [q] = generateQuiz([fatihah[3]], 1, seededRng(2)).filter((x) => x.type === "susun");
    if (!q || q.type !== "susun") throw new Error("butuh soal susun");
    expect(isOrderCorrect(q, q.answer)).toBe(true);
    expect(isOrderCorrect(q, q.shuffled)).toBe(false);
    expect(isOrderCorrect(q, q.answer.slice(1))).toBe(false);
  });
});
