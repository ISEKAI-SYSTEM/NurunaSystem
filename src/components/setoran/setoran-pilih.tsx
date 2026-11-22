"use client";

import { Check, Flag, SkipForward, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { seededRng } from "@/lib/latihan/quiz";
import { type SetoranReveal, useSettings } from "@/lib/settings";
import { type PickAnswer, isPickCorrect, passageWords, pickOptions, pickResult } from "@/lib/setoran/pilih";
import type { LiveStatus, SetoranResult } from "@/lib/setoran/setoran";

import { LivePassage } from "./live-passage";
import { type SetoranPanelVerse, SetoranResultView, summaryText } from "./setoran-result";

type Feedback = { correct: boolean; expected: string } | null;

export function SetoranPilih({
  verses,
  pool,
  label,
  reveal,
}: {
  verses: readonly SetoranPanelVerse[];
  pool: readonly string[];
  label: string;
  reveal: SetoranReveal;
}) {
  const words = useMemo(() => passageWords(verses), [verses]);
  const [seed] = useState(() => Date.now());
  const [answers, setAnswers] = useState<PickAnswer[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [result, setResult] = useState<SetoranResult | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const { keyboardShortcuts } = useSettings();
  const index = answers.length;
  const current = words[index];
  const resultRef = useRef<HTMLHeadingElement>(null);

  const options = useMemo(
    () => (current ? pickOptions(current.text, pool, seededRng(seed + index * 7919)) : []),
    [current, pool, seed, index],
  );

  const statuses: LiveStatus[] = words.map((w, k) => {
    if (k >= answers.length) return "belum";
    const a = answers[k];
    return a === null ? "terlewat" : isPickCorrect(w.text, a) ? "benar" : "salah";
  });

  function finish(final: PickAnswer[]) {
    const r = pickResult(words, final);
    setResult(r);
    setAnnouncement(`Hasil setoran ${label}: ${summaryText(r)}`);
  }

  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  function answer(value: PickAnswer) {
    if (!current || result) return;
    const next = [...answers, value];
    setAnswers(next);
    const correct = value !== null && isPickCorrect(current.text, value);
    const done = next.length >= words.length;
    if (reveal === "tersembunyi") {
      setFeedback(null);
      setAnnouncement(done ? "" : `Kata ke-${next.length + 1}.`);
    } else {
      setFeedback({ correct, expected: current.text });
      const what = value === null ? "Dilewati." : correct ? "Benar." : "Belum tepat.";
      setAnnouncement(done ? what : `${what} Kata ke-${next.length + 1}.`);
    }
    if (done) finish(next);
  }

  useEffect(() => {
    if (!keyboardShortcuts || result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        answer(options[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <h3 ref={resultRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Hasil setoran {label}
        </h3>
        <SetoranResultView
          verses={verses}
          result={result}
          label={label}
          heardLabel="dipilih"
          note="Setoran tanpa suara: kata dipilih dari hafalan."
        />
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    );
  }

  const multiVerse = verses.length > 1;
  return (
    <div className="flex flex-col gap-3">
      <LivePassage
        verses={verses}
        statuses={statuses}
        next={index}
        reveal={reveal}
        hints={new Set()}
        hiddenMessage={`Teks disembunyikan sampai selesai. Sudah ${index} dari ${words.length} kata.`}
      />

      {feedback && (
        <p
          data-status={feedback.correct ? "benar" : "salah"}
          className="setoran-status inline-flex w-fit flex-wrap items-center gap-2 rounded-lg border border-s-4 bg-background px-3 py-1 font-medium"
        >
          {feedback.correct ? <Check aria-hidden="true" className="size-5" /> : <X aria-hidden="true" className="size-5" />}
          {feedback.correct ? "Benar" : "Belum tepat. Yang benar:"}
          {!feedback.correct && (
            <span lang="ar" dir="rtl" className="font-quran text-2xl leading-normal">
              {feedback.expected}
            </span>
          )}
        </p>
      )}

      {current && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-medium">
            Kata ke-{index + 1} dari {words.length}
            {multiVerse ? ` (ayat ${current.verseNumber})` : ""}: pilih kata berikutnya
            {keyboardShortcuts && <span className="font-normal text-muted-foreground"> (angka 1–{options.length})</span>}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {options.map((option, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto min-h-14 justify-between gap-3 px-4 py-1"
                onClick={() => answer(option)}
              >
                <span aria-hidden="true" className="rounded border px-2 text-sm font-semibold">
                  {i + 1}
                </span>
                <span lang="ar" dir="rtl" className="font-quran text-3xl leading-loose">
                  {option}
                </span>
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 px-4 text-base" onClick={() => answer(null)}>
          <SkipForward aria-hidden="true" className="size-5" />
          Lewati kata ini
        </Button>
        <Button variant="outline" className="h-11 px-4 text-base" onClick={() => finish(answers)}>
          <Flag aria-hidden="true" className="size-5" />
          Selesai sekarang
        </Button>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
