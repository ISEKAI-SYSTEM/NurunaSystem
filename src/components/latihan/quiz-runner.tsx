"use client";

import { Check, RotateCcw, Undo2, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type QuizQuestion,
  type QuizVerse,
  generateQuiz,
  isOrderCorrect,
  seededRng,
} from "@/lib/latihan/quiz";
import { cn } from "@/lib/utils";

type Result = { question: QuizQuestion; correct: boolean };

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  susun: "Susun kata",
  lengkapi: "Lengkapi ayat",
  arti: "Cocokkan arti",
};

const COUNTS = [5, 10, 15] as const;

function describe(q: QuizQuestion, verse: QuizVerse): string {
  if (q.type === "susun") {
    const whole = q.from === 1 && q.to === verse.words.length;
    return whole
      ? `Susun kata-kata ayat ${q.verseNumber} sesuai urutan.`
      : `Susun kata ke-${q.from} sampai ke-${q.to} dari ayat ${q.verseNumber} sesuai urutan.`;
  }
  if (q.type === "lengkapi") return `Pilih kata yang hilang dari ayat ${q.verseNumber}.`;
  return `Pilih arti yang sesuai untuk ayat ${q.verseNumber}.`;
}

export function QuizRunner({
  surah,
  surahName,
  verses,
}: {
  surah: number;
  surahName: string;
  verses: QuizVerse[];
}) {
  const countId = useId();
  const [count, setCount] = useState<number>(5);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const finished = questions !== null && index >= questions.length;

  useEffect(() => {
    if (questions) headingRef.current?.focus();
  }, [questions, index]);

  function start() {
    const qs = generateQuiz(verses, count, seededRng(Date.now()));
    setQuestions(qs);
    setIndex(0);
    setResults([]);
    setMessage(qs.length ? "" : "Surah ini terlalu pendek untuk dibuat soal.");
  }

  function playVerse(verseNumber: number) {
    const audio = audioRef.current;
    const verse = verses.find((v) => v.verseNumber === verseNumber);
    if (!audio || !verse?.audioUrl) return;
    audio.src = verse.audioUrl;
    audio.currentTime = 0;
    audio.play().catch(() => setMessage("Audio gagal diputar. Periksa koneksi internet."));
  }

  function record(correct: boolean) {
    if (!questions) return;
    setResults((prev) => [...prev, { question: questions[index], correct }]);
  }

  function next() {
    audioRef.current?.pause();
    setIndex((i) => i + 1);
    setMessage("");
  }

  if (!questions) {
    return (
      <section aria-labelledby="judul-mulai" className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <h2 id="judul-mulai" className="text-2xl font-semibold">
          Mulai latihan
        </h2>
        <p className="text-lg">
          Soal dibuat dari ayat-ayat Surah {surahName}: menyusun kata, melengkapi
          kata yang hilang, dan mencocokkan arti. Tidak ada batas waktu.
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor={countId} className="font-medium">
            Jumlah soal
          </label>
          <select
            id={countId}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="min-h-11 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-base"
          >
            {COUNTS.map((n) => (
              <option key={n} value={n}>
                {n} soal
              </option>
            ))}
          </select>
        </div>
        <Button className="h-11 w-fit px-5 text-base" onClick={start}>
          Mulai latihan
        </Button>
      </section>
    );
  }

  if (questions.length === 0) {
    return <p className="text-lg">{message}</p>;
  }

  if (finished) {
    const score = results.filter((r) => r.correct).length;
    return (
      <section aria-labelledby="judul-hasil" className="flex flex-col gap-4 rounded-xl border bg-card p-6">
        <h2 id="judul-hasil" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Hasil latihan: {score} dari {results.length} benar
        </h2>
        <p className="text-lg">
          {score === results.length
            ? "Masya Allah, semua benar!"
            : "Ulangi ayat yang belum tepat, lalu coba lagi."}
        </p>
        <ol className="flex flex-col gap-2">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-base">
              {r.correct ? (
                <Check aria-hidden="true" className="size-5 shrink-0 text-[var(--status-benar)]" />
              ) : (
                <X aria-hidden="true" className="size-5 shrink-0 text-[var(--status-salah)]" />
              )}
              <span>
                Soal {i + 1}, {TYPE_LABEL[r.question.type].toLowerCase()} ayat{" "}
                {r.question.verseNumber}: {r.correct ? "benar" : "belum tepat"}.{" "}
                {!r.correct && (
                  <Link
                    href={`/surah/${surah}#ayat-${r.question.verseNumber}`}
                    className="underline underline-offset-4"
                  >
                    Baca ayat {r.question.verseNumber}
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 px-5 text-base" onClick={start}>
            <RotateCcw aria-hidden="true" className="size-5" />
            Latihan lagi
          </Button>
          <Button asChild variant="outline" className="h-11 px-4 text-base">
            <Link href="/hafalan">Pilih surah lain</Link>
          </Button>
        </div>
      </section>
    );
  }

  const q = questions[index];
  const verse = verses.find((v) => v.verseNumber === q.verseNumber)!;
  const answered = results.length > index;

  return (
    <section aria-labelledby="judul-soal" className="flex flex-col gap-5 rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <p className="text-base text-muted-foreground">
          Soal {index + 1} dari {questions.length} · {TYPE_LABEL[q.type]}
        </p>
        <h2 id="judul-soal" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          {describe(q, verse)}
        </h2>
      </div>

      {q.type === "susun" && (
        <OrderQuestion key={index} q={q} verse={verse} answered={answered} onCheck={record} setMessage={setMessage} />
      )}
      {q.type === "lengkapi" && (
        <ChoiceQuestion
          key={index}
          legend="Pilih kata yang hilang"
          options={q.options}
          optionsArabic
          answerIndex={q.answerIndex}
          answered={answered}
          onCheck={record}
          setMessage={setMessage}
          prompt={
            <p lang="ar" dir="rtl" className="quran-text">
              {verse.words.map((w) =>
                w.position === q.blank ? (
                  <span key={w.position}>
                    <span aria-hidden="true" className="mx-1 inline-block min-w-16 border-b-4 border-foreground">
                      &nbsp;
                    </span>
                    <span lang="id" dir="ltr" className="sr-only">
                      (kata yang hilang)
                    </span>{" "}
                  </span>
                ) : (
                  <span key={w.position}>{w.textUthmani} </span>
                ),
              )}
            </p>
          }
        />
      )}
      {q.type === "arti" && (
        <ChoiceQuestion
          key={index}
          legend="Pilih arti yang sesuai"
          options={q.options}
          answerIndex={q.answerIndex}
          answered={answered}
          onCheck={record}
          setMessage={setMessage}
          prompt={
            <p lang="ar" dir="rtl" className="quran-text">
              {verse.words.map((w) => w.textUthmani).join(" ")}
            </p>
          }
        />
      )}

      {answered && (
        <div className="flex flex-wrap gap-2">
          {verse.audioUrl && (
            <Button variant="outline" className="h-11 px-4 text-base" onClick={() => playVerse(q.verseNumber)}>
              <Volume2 aria-hidden="true" className="size-5" />
              Dengarkan ayat {q.verseNumber}
            </Button>
          )}
          <Button className="h-11 px-5 text-base" onClick={next}>
            {index + 1 < questions.length ? "Soal berikutnya" : "Lihat hasil"}
          </Button>
        </div>
      )}

      <audio ref={audioRef} preload="none" />
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}

function Feedback({ correct, children }: { correct: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-status={correct ? "benar" : "salah"}
      className="setoran-status flex flex-col gap-2 rounded-lg border border-s-4 bg-background p-4"
    >
      <p className="inline-flex items-center gap-2 text-lg font-semibold">
        {correct ? <Check aria-hidden="true" className="size-6" /> : <X aria-hidden="true" className="size-6" />}
        {correct ? "Benar!" : "Belum tepat."}
      </p>
      {children}
    </div>
  );
}

function OrderQuestion({
  q,
  verse,
  answered,
  onCheck,
  setMessage,
}: {
  q: Extract<QuizQuestion, { type: "susun" }>;
  verse: QuizVerse;
  answered: boolean;
  onCheck: (correct: boolean) => void;
  setMessage: (m: string) => void;
}) {
  const hintId = useId();
  const [picked, setPicked] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const words = picked.map((i) => q.shuffled[i]);

  function toggle(i: number) {
    if (answered) return;
    const next = picked.includes(i) ? picked.filter((p) => p !== i) : [...picked, i];
    setPicked(next);
    setMessage(`${next.length} dari ${q.shuffled.length} kata dipilih.`);
  }

  function check() {
    const ok = isOrderCorrect(q, words);
    setCorrect(ok);
    onCheck(ok);
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="font-medium" id={`${hintId}-susunan`}>
          Susunan Anda ({words.length} dari {q.shuffled.length} kata):
        </p>
        <p
          lang="ar"
          dir="rtl"
          aria-labelledby={`${hintId}-susunan`}
          className="quran-text min-h-16 rounded-lg border-2 border-dashed border-input px-3"
        >
          {words.length ? words.join(" ") : <span lang="id" dir="ltr" className="font-sans text-base text-muted-foreground">Belum ada kata dipilih.</span>}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={answered}>
        <legend className="mb-2 font-medium">
          Ketuk kata sesuai urutan. Ketuk lagi untuk membatalkan.
        </legend>
        <div dir="rtl" className="flex flex-wrap gap-2">
          {q.shuffled.map((word, i) => {
            const order = picked.indexOf(i);
            return (
              <Button
                key={i}
                type="button"
                variant={order >= 0 ? "default" : "outline"}
                aria-pressed={order >= 0}
                onClick={() => toggle(i)}
                className="h-auto min-h-14 px-4 py-2"
              >
                <span lang="ar" className="font-quran text-3xl leading-loose">
                  {word}
                </span>
                {order >= 0 && (
                  <span lang="id" className="text-sm font-semibold">
                    <span className="sr-only">, urutan ke-</span>
                    <span aria-hidden="true">#</span>
                    {order + 1}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </fieldset>

      {!answered && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => setPicked(picked.slice(0, -1))}
            disabled={!picked.length}
          >
            <Undo2 aria-hidden="true" className="size-5" />
            Hapus kata terakhir
          </Button>
          <Button variant="outline" className="h-11 px-4 text-base" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint} aria-controls={hintId}>
            {showHint ? "Sembunyikan arti" : "Lihat arti ayat"}
          </Button>
          <Button className="h-11 px-5 text-base" onClick={check} disabled={picked.length !== q.shuffled.length}>
            Periksa
          </Button>
        </div>
      )}
      {showHint && !answered && (
        <p id={hintId} className="text-lg leading-relaxed">
          Arti ayat {verse.verseNumber}: {verse.translation}
        </p>
      )}

      {answered && correct !== null && (
        <Feedback correct={correct}>
          {!correct && (
            <p className="text-base">
              Urutan yang benar:{" "}
              <span lang="ar" dir="rtl" className="font-quran text-2xl">
                {q.answer.join(" ")}
              </span>
            </p>
          )}
        </Feedback>
      )}
    </div>
  );
}

function ChoiceQuestion({
  legend,
  options,
  optionsArabic = false,
  answerIndex,
  answered,
  onCheck,
  setMessage,
  prompt,
}: {
  legend: string;
  options: string[];
  optionsArabic?: boolean;
  answerIndex: number;
  answered: boolean;
  onCheck: (correct: boolean) => void;
  setMessage: (m: string) => void;
  prompt: React.ReactNode;
}) {
  const name = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const correct = selected === answerIndex;

  function check() {
    if (selected === null) return;
    onCheck(correct);
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-4">
      {prompt}
      <fieldset className="flex flex-col gap-2" disabled={answered}>
        <legend className="mb-2 font-medium">{legend}</legend>
        {options.map((option, i) => {
          const id = `${name}-${i}`;
          const isAnswer = answered && i === answerIndex;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 border-input bg-background px-4 py-3",
                selected === i && "border-primary",
                isAnswer && "border-[var(--status-benar)]",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                checked={selected === i}
                onChange={() => setSelected(i)}
                className="size-6 shrink-0 accent-primary"
              />
              <label
                htmlFor={id}
                lang={optionsArabic ? "ar" : undefined}
                dir={optionsArabic ? "rtl" : undefined}
                className={cn("flex-1 cursor-pointer", optionsArabic ? "font-quran text-3xl leading-loose" : "text-lg leading-relaxed")}
              >
                {option}
              </label>
              {isAnswer && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                  <Check aria-hidden="true" className="size-5" />
                  Jawaban benar
                </span>
              )}
            </div>
          );
        })}
      </fieldset>
      {!answered && (
        <Button className="h-11 w-fit px-5 text-base" onClick={check} disabled={selected === null}>
          Periksa
        </Button>
      )}
      {answered && (
        <Feedback correct={correct}>
          {!correct && (
            <p className="text-base">
              Jawaban yang benar:{" "}
              <span
                lang={optionsArabic ? "ar" : undefined}
                dir={optionsArabic ? "rtl" : undefined}
                className={optionsArabic ? "font-quran text-2xl" : "font-medium"}
              >
                {options[answerIndex]}
              </span>
            </p>
          )}
        </Feedback>
      )}
    </div>
  );
}
