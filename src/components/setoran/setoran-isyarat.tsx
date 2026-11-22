"use client";

import { Check, Flag, Lightbulb, SkipForward, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type HandFrame, HandTracker } from "@/components/isyarat/hand-tracker";
import { PersonalSamplesNote, TeachSignButton, TeachSignPanel, useTeachSign } from "@/components/isyarat/teach-sign";
import { useIsyaratModel } from "@/components/isyarat/use-isyarat-model";
import { Button } from "@/components/ui/button";
import { LETTER_BY_ID } from "@/lib/isyarat/hijaiyah";
import { kemenagSign } from "@/lib/isyarat/kemenag";
import type { SetoranReveal } from "@/lib/settings";
import {
  type SignRecord,
  type SignStep,
  emptyRecord,
  signName,
  signResult,
  signSteps,
  signWordStatus,
} from "@/lib/setoran/isyarat";
import { passageWords } from "@/lib/setoran/pilih";
import { SignSequencer } from "@/lib/setoran/sign-sequencer";
import type { LiveStatus } from "@/lib/setoran/setoran";

import { LivePassage } from "./live-passage";
import { type SetoranPanelVerse, SetoranResultView, summaryText } from "./setoran-result";

type Session = { word: number; letter: number; records: (SignRecord | undefined)[]; finished: boolean };
type Feedback = { ok: boolean; text: string } | null;

export function SetoranIsyarat({
  verses,
  label,
  reveal,
}: {
  verses: readonly SetoranPanelVerse[];
  label: string;
  reveal: SetoranReveal;
}) {
  const model = useIsyaratModel();
  const words = useMemo(() => passageWords(verses), [verses]);
  const steps = useMemo(() => words.map((w) => signSteps(w.text)), [words]);
  const [session, setSession] = useState<Session>({ word: 0, letter: 0, records: [], finished: false });
  const sessionRef = useRef(session);
  const [hold, setHold] = useState(0);
  const [seen, setSeen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hints, setHints] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const sequencer = useMemo(() => new SignSequencer(), []);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const onTaught = useCallback(
    (message: string) => {
      sequencer.reset();
      setFeedback({ ok: true, text: message });
      setAnnouncement(message);
    },
    [sequencer],
  );
  const teach = useTeachSign(onTaught);

  const commit = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const withRecord = useCallback((s: Session, update: (r: SignRecord) => SignRecord): Session => {
    const records = [...s.records];
    records[s.word] = update(records[s.word] ?? emptyRecord());
    return { ...s, records };
  }, []);

  const advance = useCallback(
    (s: Session): Session => {
      if (s.letter + 1 < steps[s.word].length) return { ...s, letter: s.letter + 1 };
      const done = withRecord(s, (r) => ({ ...r, complete: true }));
      const word = s.word + 1;
      return { ...done, word, letter: 0, finished: word >= words.length };
    },
    [steps, words.length, withRecord],
  );

  const moveOn = useCallback(
    (next: Session, message: string) => {
      sequencer.reset();
      setHold(0);
      setSeen(null);
      commit(next);
      setAnnouncement(next.finished ? "" : message);
    },
    [commit, sequencer],
  );

  const accept = useCallback(
    (step: SignStep) => {
      const s = sessionRef.current;
      const next = advance(withRecord(s, (r) => ({ ...r, trail: [...r.trail, step.char] })));
      setFeedback({ ok: true, text: reveal === "tersembunyi" ? "Isyarat diterima." : `Benar: ${step.name}.` });
      const newWord = next.word !== s.word;
      moveOn(next, newWord ? "Benar. Kata berikutnya." : "Benar. Huruf berikutnya.");
    },
    [advance, moveOn, reveal, withRecord],
  );

  const wrong = useCallback(
    (seenId: string) => {
      const s = sessionRef.current;
      const char = LETTER_BY_ID.get(seenId)?.char ?? seenId;
      commit(withRecord(s, (r) => ({ ...r, errors: r.errors + 1, trail: [...r.trail, char] })));
      const text =
        reveal === "tersembunyi"
          ? "Belum sesuai. Coba lagi, atau lewati huruf."
          : `Belum sesuai: terlihat seperti isyarat ${signName(seenId)}.`;
      setFeedback({ ok: false, text });
      setAnnouncement(text);
    },
    [commit, reveal, withRecord],
  );

  const handleFrame = useCallback(
    (frame: HandFrame | null) => {
      const s = sessionRef.current;
      if (model.status !== "siap" || s.finished) return;
      if (teach.feed(frame)) return;
      const step = steps[s.word]?.[s.letter];
      if (!step || !model.classifier.letters.includes(step.id)) return;
      const prediction = frame ? model.classifier.predict(frame.features, frame.handedness) : null;
      const { hold: target, seen: other, event } = sequencer.push(prediction, step.id);
      setHold((prev) => (prev === target ? prev : target));
      setSeen((prev) => (prev === other ? prev : other));
      if (event?.kind === "terima") accept(step);
      else if (event?.kind === "salah") wrong(event.letter);
    },
    [accept, model, sequencer, steps, teach, wrong],
  );
  const frameRef = useRef(handleFrame);
  useEffect(() => {
    frameRef.current = handleFrame;
  }, [handleFrame]);
  const forwardFrame = useCallback((frame: HandFrame | null) => frameRef.current(frame), []);

  useEffect(() => {
    if (session.finished) resultRef.current?.focus();
  }, [session.finished]);

  if (model.status === "memuat") return <p role="status">Menyiapkan pengenal isyarat…</p>;
  if (model.status === "belum-ada") {
    return (
      <p className="max-w-prose text-base">
        Pengenal isyarat belum tersedia di perangkat ini. Pilih cara setoran lain (suara atau pilih kata).
      </p>
    );
  }

  if (session.finished) {
    const result = signResult(words, session.records);
    return (
      <div className="flex flex-col gap-4">
        <h3 ref={resultRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          Hasil setoran {label}
        </h3>
        <SetoranResultView
          verses={verses}
          result={result}
          label={label}
          heardLabel="diisyaratkan"
          note={`Setoran isyarat (metode kitabah): bentuk huruf diperiksa kamera; harakat belum dinilai.${hints.size ? ` Petunjuk dipakai: ${hints.size} huruf.` : ""}`}
        />
        <p aria-live="polite" className="sr-only">
          {`Hasil setoran ${label}: ${summaryText(result)}`}
        </p>
      </div>
    );
  }

  const wordSteps = steps[session.word] ?? [];
  const step = wordSteps[session.letter];
  const word = words[session.word];
  const hintKey = `${session.word}-${session.letter}`;
  const showLetter = reveal === "semua" || hints.has(hintKey);
  const recognizable = step ? model.classifier.letters.includes(step.id) : false;
  const statuses: LiveStatus[] = words.map((_, k) => (k < session.word ? signWordStatus(session.records[k]) : "belum"));

  function skipLetter() {
    const s = sessionRef.current;
    moveOn(advance(withRecord(s, (r) => ({ ...r, skippedLetters: r.skippedLetters + 1 }))), "Huruf dilewati.");
    setFeedback(null);
  }
  function confirmLetter() {
    if (step) accept(step);
  }
  function skipWord() {
    const s = sessionRef.current;
    const done = withRecord(s, (r) => ({ ...r, skipped: true, complete: true }));
    const nextWord = s.word + 1;
    moveOn({ ...done, word: nextWord, letter: 0, finished: nextWord >= words.length }, "Kata dilewati.");
    setFeedback(null);
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] [@media(max-height:50rem)]:xl:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm text-muted-foreground [@media(max-height:50rem)]:sr-only">
          Isyaratkan huruf demi huruf (metode kitabah), jeda antarkata. Harakat belum dinilai. Tanpa batas waktu.
        </p>
        <LivePassage
          verses={verses}
          statuses={statuses}
          next={session.word}
          reveal={reveal}
          hints={new Set()}
          hiddenMessage={`Teks disembunyikan sampai selesai. Kata ke-${session.word + 1} dari ${words.length}.`}
          compact
        />

        {teach.teaching && <TeachSignPanel teaching={teach.teaching} onCancel={teach.cancel} />}

        {!teach.teaching && step && word && (
          <section aria-label="Huruf yang ditunggu" className="flex flex-col gap-2 rounded-lg border bg-background p-3">
            <p className="font-medium">
              Kata ke-{session.word + 1} dari {words.length}, huruf ke-{session.letter + 1}
              {reveal === "semua" ? ` dari ${wordSteps.length}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {reveal !== "tersembunyi" && (
                <p lang="ar" dir="rtl" aria-hidden="true" className="flex flex-wrap gap-1 font-quran text-3xl leading-[1.6]">
                  {wordSteps.map((st, i) => {
                    const done = i < session.letter;
                    const current = i === session.letter;
                    if (!done && !current && reveal !== "semua") return null;
                    if (current && !showLetter) return <span key={i} className="text-muted-foreground">…</span>;
                    return (
                      <span
                        key={i}
                        className={
                          done
                            ? "rounded-md bg-muted px-1 underline decoration-[var(--status-benar)] decoration-2 underline-offset-8"
                            : current
                              ? "rounded-md px-1 outline-2 outline-[var(--ring)] outline-solid"
                              : "px-1 text-muted-foreground"
                        }
                      >
                        {st.char}
                      </span>
                    );
                  })}
                </p>
              )}
              {showLetter && <LetterGuide step={step} />}
            </div>

            {recognizable ? (
              <div className="flex flex-col gap-1">
                <p id="isyarat-tahan" className="text-sm font-medium">
                  {hold > 0
                    ? showLetter
                      ? `Menahan isyarat ${step.name}…`
                      : "Menahan isyarat…"
                    : seen && reveal !== "tersembunyi"
                      ? `Terlihat seperti isyarat ${signName(seen)}`
                      : "Menunggu isyarat…"}
                </p>
                <div
                  role="progressbar"
                  aria-labelledby="isyarat-tahan"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(hold * 100)}
                  className="h-3 w-full max-w-md overflow-hidden rounded-full border border-input bg-background"
                >
                  <div className="h-full bg-primary transition-[width]" style={{ width: `${hold * 100}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm">
                  {showLetter ? `Huruf ${step.name}` : "Huruf ini"} belum bisa dikenali kamera. Isyaratkan, lalu tekan
                  Lanjut.
                </p>
                <Button className="h-11 px-4 text-base" onClick={confirmLetter}>
                  <Check aria-hidden="true" className="size-5" />
                  Lanjut
                </Button>
              </div>
            )}

            {showLetter && LETTER_BY_ID.has(step.id) && (
              <TeachSignButton letter={step.id} name={step.name} onStart={teach.start} />
            )}

            {feedback && (
              <p
                data-status={feedback.ok ? "benar" : "salah"}
                className="setoran-status inline-flex w-fit items-center gap-2 rounded-lg border border-s-4 bg-background px-3 py-1 text-sm font-medium"
              >
                {feedback.ok ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
                {feedback.text}
              </p>
            )}
          </section>
        )}

        <div className={teach.teaching ? "hidden" : "flex flex-wrap gap-2"}>
          {reveal !== "semua" && !showLetter && (
            <Button
              variant="outline"
              className="h-11 px-3 text-base [@media(max-height:50rem)]:h-10 [@media(max-height:50rem)]:px-2.5 [@media(max-height:50rem)]:text-sm"
              onClick={() => setHints((prev) => new Set(prev).add(hintKey))}
            >
              <Lightbulb aria-hidden="true" className="size-5" />
              Petunjuk
            </Button>
          )}
          <Button variant="outline" className="h-11 px-3 text-base [@media(max-height:50rem)]:h-10 [@media(max-height:50rem)]:px-2.5 [@media(max-height:50rem)]:text-sm" onClick={skipLetter}>
            <SkipForward aria-hidden="true" className="size-5" />
            Lewati huruf
          </Button>
          <Button variant="outline" className="h-11 px-3 text-base [@media(max-height:50rem)]:h-10 [@media(max-height:50rem)]:px-2.5 [@media(max-height:50rem)]:text-sm" onClick={skipWord}>
            <SkipForward aria-hidden="true" className="size-5" />
            Lewati kata
          </Button>
          <Button
            variant="outline"
            className="h-11 px-3 text-base [@media(max-height:50rem)]:h-10 [@media(max-height:50rem)]:px-2.5 [@media(max-height:50rem)]:text-sm"
            onClick={() => commit({ ...sessionRef.current, finished: true })}
          >
            <Flag aria-hidden="true" className="size-5" />
            Selesai
          </Button>
        </div>
        <PersonalSamplesNote letters={model.personalLetters} />
      </div>

      <section aria-label="Kamera" className="min-w-0">
        <HandTracker onFrame={forwardFrame} compact />
      </section>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function LetterGuide({ step }: { step: SignStep }) {
  const sign = kemenagSign(step.id);
  return (
    <div className="flex items-center gap-3">
      {sign && (
        <Image
          src={sign.image}
          alt={`Gambar isyarat huruf ${step.name}`}
          width={112}
          height={112}
          className="size-24 rounded-lg border bg-white [@media(max-height:50rem)]:size-20"
        />
      )}
      <p className="flex flex-col">
        <span lang="ar" dir="rtl" className="font-quran text-4xl leading-[1.6]">
          {step.char}
        </span>
        <span className="text-sm font-medium">{step.name}</span>
      </p>
    </div>
  );
}
