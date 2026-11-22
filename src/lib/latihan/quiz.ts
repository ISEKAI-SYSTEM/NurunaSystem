import { normalizeWord } from "@/lib/setoran/normalize";

export type QuizWord = { position: number; textUthmani: string; textImlaei: string };
export type QuizVerse = {
  verseNumber: number;
  words: QuizWord[];
  translation: string;
  audioUrl: string;
};

export type QuizQuestion =
  | {
      type: "susun";
      verseNumber: number;
      from: number;
      to: number;
      answer: string[];
      shuffled: string[];
    }
  | {
      type: "lengkapi";
      verseNumber: number;
      blank: number;
      options: string[];
      answerIndex: number;
    }
  | {
      type: "arti";
      verseNumber: number;
      options: string[];
      answerIndex: number;
    };

export type Rng = () => number;

export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MAX_ORDER_WORDS = 8;
const ORDER_WINDOW = 6;
const MIN_ORDER_WORDS = 3;
const MAX_OPTIONS = 4;

function orderQuestion(verse: QuizVerse, rng: Rng): QuizQuestion | null {
  const n = verse.words.length;
  if (n < MIN_ORDER_WORDS) return null;
  let start = 0;
  let len = n;
  if (n > MAX_ORDER_WORDS) {
    len = ORDER_WINDOW;
    start = Math.floor(rng() * (n - len + 1));
  }
  const answer = verse.words.slice(start, start + len).map((w) => w.textUthmani);
  let shuffled = shuffle(answer, rng);
  for (let i = 0; i < 5 && shuffled.join(" ") === answer.join(" "); i++) shuffled = shuffle(answer, rng);
  if (shuffled.join(" ") === answer.join(" ")) return null; // mis. semua kata sama
  return {
    type: "susun",
    verseNumber: verse.verseNumber,
    from: start + 1,
    to: start + len,
    answer,
    shuffled,
  };
}

function missingWordQuestion(verse: QuizVerse, allWords: QuizWord[], rng: Rng): QuizQuestion | null {
  if (verse.words.length < 2) return null;
  const candidates = verse.words.filter((w) => normalizeWord(w.textImlaei).length >= 3);
  const pool = candidates.length ? candidates : verse.words;
  const target = pool[Math.floor(rng() * pool.length)];
  const targetKey = normalizeWord(target.textImlaei);

  const seen = new Set([targetKey]);
  const distractors: string[] = [];
  for (const w of shuffle(allWords, rng)) {
    const key = normalizeWord(w.textImlaei);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    distractors.push(w.textUthmani);
    if (distractors.length === MAX_OPTIONS - 1) break;
  }
  if (distractors.length < 2) return null;
  const options = shuffle([target.textUthmani, ...distractors], rng);
  return {
    type: "lengkapi",
    verseNumber: verse.verseNumber,
    blank: target.position,
    options,
    answerIndex: options.indexOf(target.textUthmani),
  };
}

function meaningQuestion(verse: QuizVerse, verses: readonly QuizVerse[], rng: Rng): QuizQuestion | null {
  const others = [
    ...new Set(
      verses
        .filter((v) => v.verseNumber !== verse.verseNumber && v.translation && v.translation !== verse.translation)
        .map((v) => v.translation),
    ),
  ];
  if (!verse.translation || others.length < 1) return null;
  const options = shuffle([verse.translation, ...shuffle(others, rng).slice(0, MAX_OPTIONS - 1)], rng);
  return {
    type: "arti",
    verseNumber: verse.verseNumber,
    options,
    answerIndex: options.indexOf(verse.translation),
  };
}

export function generateQuiz(verses: readonly QuizVerse[], count: number, rng: Rng): QuizQuestion[] {
  const allWords = verses.flatMap((v) => v.words);
  const makers = [
    (v: QuizVerse) => orderQuestion(v, rng),
    (v: QuizVerse) => missingWordQuestion(v, allWords, rng),
    (v: QuizVerse) => meaningQuestion(v, verses, rng),
  ];
  const queues = makers.map(() => shuffle(verses, rng));
  const questions: QuizQuestion[] = [];
  let type = Math.floor(rng() * makers.length);
  let idleRounds = 0;
  while (questions.length < count && idleRounds < makers.length) {
    const queue = queues[type];
    let made: QuizQuestion | null = null;
    while (!made && queue.length) made = makers[type](queue.shift()!);
    if (made) {
      questions.push(made);
      idleRounds = 0;
    } else {
      idleRounds++;
    }
    type = (type + 1) % makers.length;
  }
  return questions;
}

export function isOrderCorrect(question: Extract<QuizQuestion, { type: "susun" }>, picked: readonly string[]): boolean {
  return picked.length === question.answer.length && picked.every((w, i) => w === question.answer[i]);
}
