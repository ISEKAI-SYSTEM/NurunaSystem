"use client";

import { Camera, Check, Hand, RotateCcw, SkipForward, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Classifier } from "@/lib/isyarat/classifier";
import type { DatasetSource } from "@/lib/isyarat/dataset";
import { HIJAIYAH_LETTERS, type HijaiyahLetter, LETTER_BY_ID } from "@/lib/isyarat/hijaiyah";
import { KEMENAG_SOURCE, kemenagSign } from "@/lib/isyarat/kemenag";
import { StabilityTracker } from "@/lib/isyarat/stability";
import { seededRng, shuffle } from "@/lib/latihan/quiz";

import { type HandFrame, HandTracker } from "./hand-tracker";
import { PersonalSamplesNote, TeachSignButton, TeachSignPanel, useTeachSign } from "./teach-sign";
import { useIsyaratModel } from "./use-isyarat-model";

const LETTERS_PER_ROUND = 10;

type Mode = "kamera" | "ketuk";

type TapQuestion = {
  letter: HijaiyahLetter;
  ask: "nama" | "huruf";
  options: HijaiyahLetter[];
};

type Result = { letter: HijaiyahLetter; correct: boolean; skipped?: boolean };

function SourceNote({ source }: { source: DatasetSource }) {
  return (
    <div className="max-w-prose rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
      <p>
        Data contoh isyarat:{" "}
        <a href={source.url} className="font-medium underline underline-offset-4" target="_blank" rel="noreferrer">
          {source.name}
          <span className="sr-only"> (membuka tab baru)</span>
        </a>{" "}
        oleh {source.authors}, lisensi {source.license}.
      </p>
      {source.note && <p className="mt-2">{source.note}</p>}
    </div>
  );
}

function makeTapQuestions(rng: () => number): TapQuestion[] {
  return shuffle(HIJAIYAH_LETTERS, rng)
    .slice(0, LETTERS_PER_ROUND)
    .map((letter, i) => {
      const others = shuffle(HIJAIYAH_LETTERS.filter((l) => l.id !== letter.id), rng).slice(0, 3);
      return { letter, ask: i % 2 ? "huruf" : "nama", options: shuffle([letter, ...others], rng) };
    });
}

export function IsyaratBelajar() {
  const model = useIsyaratModel();
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState<HijaiyahLetter[]>([]);
  const [tapQuestions, setTapQuestions] = useState<TapQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const frameHandlerRef = useRef<((frame: HandFrame | null) => void) | null>(null);
  const forwardFrame = useCallback((frame: HandFrame | null) => frameHandlerRef.current?.(frame), []);
  const registerFrameHandler = useCallback((handler: ((frame: HandFrame | null) => void) | null) => {
    frameHandlerRef.current = handler;
  }, []);

  const start = useCallback(
    (m: Mode) => {
      const rng = seededRng(Date.now());
      setMode(m);
      setIndex(0);
      setResults([]);
      setRound((r) => r + 1);
      if (m === "kamera" && model.status === "siap") {
        const known = model.classifier.letters
          .map((id) => LETTER_BY_ID.get(id))
          .filter((l): l is HijaiyahLetter => Boolean(l));
        setQueue(shuffle(known, rng).slice(0, LETTERS_PER_ROUND));
      } else {
        setTapQuestions(makeTapQuestions(rng));
      }
    },
    [model],
  );

  const total = mode === "kamera" ? queue.length : tapQuestions.length;
  const finished = mode !== null && index >= total;

  useEffect(() => {
    if (mode) headingRef.current?.focus();
  }, [mode, index, round]);

  function record(result: Result) {
    setResults((prev) => [...prev, result]);
  }
  function next() {
    setIndex((i) => i + 1);
  }

  if (mode === null || model.status === "memuat") {
    return (
      <section aria-labelledby="judul-pilih" className="flex w-full max-w-4xl flex-col gap-4 rounded-xl border bg-card p-6">
        <h2 id="judul-pilih" className="text-2xl font-semibold">
          Pilih cara belajar
        </h2>
        {model.status === "memuat" && <p role="status">Memeriksa pengenal isyarat…</p>}
        {model.status === "belum-ada" && (
          <p className="max-w-prose text-base leading-relaxed">
            Pengenal isyarat dengan kamera <strong>belum tersedia</strong>: data
            contoh isyarat sedang dikumpulkan bersama guru SLB. Sementara itu,
            Anda tetap bisa berlatih mengenal huruf hijaiyah dengan mengetuk
            jawaban.
          </p>
        )}
        {model.status === "siap" && (
          <p className="max-w-prose text-base leading-relaxed">
            Pengenal isyarat siap untuk {model.classifier.letters.length} huruf.
            Peragakan isyarat di depan kamera, atau berlatih tanpa kamera.
          </p>
        )}
        {model.status === "siap" && model.source && <SourceNote source={model.source} />}
        {model.status === "siap" && <PersonalSamplesNote letters={model.personalLetters} />}
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11 px-5 text-base"
            disabled={model.status !== "siap"}
            onClick={() => start("kamera")}
          >
            <Camera aria-hidden="true" className="size-5" />
            Latihan isyarat dengan kamera
          </Button>
          <Button
            variant={model.status === "siap" ? "outline" : "default"}
            className="h-11 px-5 text-base"
            disabled={model.status === "memuat"}
            onClick={() => start("ketuk")}
          >
            <Hand aria-hidden="true" className="size-5" />
            Latihan tanpa kamera (ketuk)
          </Button>
        </div>
      </section>
    );
  }

  if (finished) {
    const score = results.filter((r) => r.correct).length;
    return (
      <section aria-labelledby="judul-hasil-isyarat" className="flex w-full max-w-4xl flex-col gap-4 rounded-xl border bg-card p-6">
        <h2 id="judul-hasil-isyarat" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Hasil: {score} dari {results.length} huruf
        </h2>
        <ul className="flex flex-wrap gap-2">
          {results.map((r, i) => (
            <li key={i} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-base">
              {r.correct ? (
                <Check aria-hidden="true" className="size-4 text-[var(--status-benar)]" />
              ) : (
                <X aria-hidden="true" className="size-4 text-[var(--status-salah)]" />
              )}
              {r.letter.name}: {r.correct ? "benar" : r.skipped ? "dilewati" : "belum tepat"}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 px-5 text-base" onClick={() => start(mode)}>
            <RotateCcw aria-hidden="true" className="size-5" />
            Latihan lagi
          </Button>
          <Button variant="outline" className="h-11 px-4 text-base" onClick={() => setMode(null)}>
            Ganti cara belajar
          </Button>
        </div>
      </section>
    );
  }

  const progress = `Huruf ${index + 1} dari ${total}`;

  if (mode === "kamera" && model.status === "siap") {
    const letter = queue[index];
    return (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CameraPractice
          key={`${round}-${index}`}
          letter={letter}
          progress={progress}
          classifier={model.classifier}
          headingRef={headingRef}
          register={registerFrameHandler}
          onResult={record}
          onNext={next}
          onSwitch={() => start("ketuk")}
        />
        <section aria-label="Kamera" className="rounded-xl border bg-card p-4">
          <HandTracker onFrame={forwardFrame} compact />
        </section>
      </div>
    );
  }

  const q = tapQuestions[index];
  return (
    <TapPractice
      key={`${round}-${index}`}
      q={q}
      progress={progress}
      headingRef={headingRef}
      onResult={record}
      onNext={next}
    />
  );
}

function BigLetter({ letter, compact = false }: { letter: HijaiyahLetter; compact?: boolean }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={compact ? "font-quran text-7xl leading-[1.6]" : "font-quran text-8xl leading-[1.8]"}
    >
      {letter.char}
    </span>
  );
}

function SignGuide({ letter }: { letter: HijaiyahLetter }) {
  const sign = kemenagSign(letter.id);
  if (!sign) return null;
  return (
    <figure className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <BigLetter letter={letter} compact />
      <Image
        src={sign.image}
        alt={`Gambar isyarat huruf ${letter.name}`}
        width={144}
        height={144}
        className="size-32 rounded-lg border bg-white [@media(max-height:50rem)]:size-24"
      />
      <figcaption className="flex min-w-56 flex-1 flex-col gap-1">
        <span className="text-sm leading-relaxed [@media(max-height:50rem)]:text-xs">
          <strong>Cara:</strong> {sign.description}
        </span>
        <span className="text-xs text-muted-foreground">
          Gambar dilihat dari depan. Sumber:{" "}
          <a href={KEMENAG_SOURCE.url} className="underline underline-offset-4" target="_blank" rel="noreferrer">
            Pedoman Mushaf Al-Qur&apos;an Isyarat, LPMQ Kemenag {KEMENAG_SOURCE.year}
            <span className="sr-only"> (membuka tab baru)</span>
          </a>
        </span>
      </figcaption>
    </figure>
  );
}

function CameraPractice({
  letter,
  progress,
  classifier,
  headingRef,
  register,
  onResult,
  onNext,
  onSwitch,
}: {
  letter: HijaiyahLetter;
  progress: string;
  classifier: Classifier;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  register: (handler: ((frame: HandFrame | null) => void) | null) => void;
  onResult: (r: Result) => void;
  onNext: () => void;
  onSwitch: () => void;
}) {
  const progressId = useId();
  const tracker = useMemo(() => new StabilityTracker(), []);
  const [done, setDone] = useState<null | "benar" | "lewati">(null);
  const [leading, setLeading] = useState<string | null>(null);
  const [hold, setHold] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const doneRef = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [taught, setTaught] = useState<string | null>(null);
  const onTaught = useCallback(
    (message: string) => {
      tracker.reset();
      setTaught(message);
      setAnnouncement(message);
    },
    [tracker],
  );
  const teach = useTeachSign(onTaught);

  const onFrame = useCallback(
    (frame: HandFrame | null) => {
      if (doneRef.current) return;
      if (teach.feed(frame)) return;
      const prediction = frame ? classifier.predict(frame.features, frame.handedness) : null;
      const s = tracker.push(prediction);
      setLeading((prev) => (prev === s.leading ? prev : s.leading));
      const target = s.leading === letter.id ? Math.round(s.progress * 10) / 10 : 0;
      setHold((prev) => (prev === target ? prev : target));
      if (s.stable === letter.id) {
        doneRef.current = true;
        setDone("benar");
        onResult({ letter, correct: true });
        setAnnouncement(`Benar! Isyarat ${letter.name} dikenali.`);
      }
    },
    [classifier, letter, onResult, teach, tracker],
  );

  useEffect(() => {
    register(onFrame);
    return () => register(null);
  }, [onFrame, register]);

  useEffect(() => {
    if (done) feedbackRef.current?.focus();
  }, [done]);

  function skip() {
    doneRef.current = true;
    setDone("lewati");
    onResult({ letter, correct: false, skipped: true });
  }

  const otherLetter = leading && leading !== letter.id ? LETTER_BY_ID.get(leading)?.name : null;

  return (
    <section
      aria-labelledby="judul-isyarat"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 [@media(max-height:50rem)]:gap-2"
    >
      <p className="text-sm text-muted-foreground">{progress} · Latihan dengan kamera</p>
      <h2 id="judul-isyarat" ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        Peragakan isyarat huruf {letter.name}
      </h2>
      {teach.teaching ? (
        <TeachSignPanel teaching={teach.teaching} onCancel={teach.cancel} />
      ) : (
        <>
          <SignGuide letter={letter} />
          <p className="text-sm [@media(max-height:50rem)]:sr-only">
            Tahan isyarat sampai indikator penuh. Tidak ada batas waktu.
          </p>

          {!done && (
            <div className="flex flex-col gap-2">
              <p id={progressId} className="font-medium">
                {hold > 0 ? `Menahan isyarat ${letter.name}…` : otherLetter ? `Terlihat seperti isyarat ${otherLetter}` : "Menunggu isyarat…"}
              </p>
              <div
                role="progressbar"
                aria-labelledby={progressId}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hold * 100)}
                className="h-4 w-full max-w-md overflow-hidden rounded-full border border-input bg-background"
              >
                <div className="h-full bg-primary transition-[width]" style={{ width: `${hold * 100}%` }} />
              </div>
              <TeachSignButton letter={letter.id} name={letter.name} onStart={teach.start} />
              {taught && <p className="text-sm font-medium">{taught}</p>}
            </div>
          )}

          {done ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              data-status={done === "benar" ? "benar" : "terlewat"}
              className="setoran-status flex flex-col gap-3 rounded-lg border border-s-4 bg-background p-4"
            >
              <p className="inline-flex items-center gap-2 text-lg font-semibold">
                {done === "benar" ? <Check aria-hidden="true" className="size-6" /> : <SkipForward aria-hidden="true" className="size-6" />}
                {done === "benar" ? `Benar! Isyarat ${letter.name} dikenali.` : `Huruf ${letter.name} dilewati.`}
              </p>
              <Button className="h-11 w-fit px-5 text-base" onClick={onNext}>
                Huruf berikutnya
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="h-11 px-4 text-base" onClick={skip}>
                <SkipForward aria-hidden="true" className="size-5" />
                Lewati huruf ini
              </Button>
              <Button variant="outline" className="h-11 px-4 text-base" onClick={onSwitch}>
                <Hand aria-hidden="true" className="size-5" />
                Ganti ke latihan tanpa kamera
              </Button>
            </div>
          )}
        </>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

function TapPractice({
  q,
  progress,
  headingRef,
  onResult,
  onNext,
}: {
  q: TapQuestion;
  progress: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onResult: (r: Result) => void;
  onNext: () => void;
}) {
  const name = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const correct = selected === q.letter.id;

  useEffect(() => {
    if (checked) feedbackRef.current?.focus();
  }, [checked]);

  return (
    <section aria-labelledby="judul-ketuk" className="flex w-full max-w-4xl flex-col gap-4 rounded-xl border bg-card p-6">
      <p className="text-base text-muted-foreground">{progress} · Latihan tanpa kamera</p>
      <h2 id="judul-ketuk" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {q.ask === "nama" ? "Apa nama huruf ini?" : `Mana huruf ${q.letter.name}?`}
      </h2>
      {q.ask === "nama" && <BigLetter letter={q.letter} />}
      <fieldset className="flex flex-col gap-2" disabled={checked}>
        <legend className="mb-2 font-medium">{q.ask === "nama" ? "Pilih nama huruf" : "Pilih hurufnya"}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o) => {
            const id = `${name}-${o.id}`;
            return (
              <div
                key={o.id}
                className={
                  "flex items-center gap-3 rounded-lg border-2 bg-background px-4 py-3 " +
                  (checked && o.id === q.letter.id ? "border-[var(--status-benar)]" : selected === o.id ? "border-primary" : "border-input")
                }
              >
                <input
                  id={id}
                  type="radio"
                  name={name}
                  checked={selected === o.id}
                  onChange={() => setSelected(o.id)}
                  className="size-6 shrink-0 accent-primary"
                />
                <label htmlFor={id} className="flex-1 cursor-pointer">
                  {q.ask === "nama" ? (
                    <span className="text-xl">{o.name}</span>
                  ) : (
                    <span lang="ar" dir="rtl" className="font-quran text-5xl leading-loose">
                      {o.char}
                      <span lang="id" dir="ltr" className="sr-only">
                        {" "}
                        (huruf {o.name})
                      </span>
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      {!checked ? (
        <Button
          className="h-11 w-fit px-5 text-base"
          disabled={!selected}
          onClick={() => {
            setChecked(true);
            onResult({ letter: q.letter, correct });
          }}
        >
          Periksa
        </Button>
      ) : (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          data-status={correct ? "benar" : "salah"}
          className="setoran-status flex flex-col gap-3 rounded-lg border border-s-4 bg-background p-4"
        >
          <p className="inline-flex items-center gap-2 text-lg font-semibold">
            {correct ? <Check aria-hidden="true" className="size-6" /> : <X aria-hidden="true" className="size-6" />}
            {correct ? "Benar!" : `Belum tepat. Jawabannya: ${q.letter.name}`}
            {!correct && (
              <span lang="ar" dir="rtl" className="font-quran text-3xl">
                {q.letter.char}
              </span>
            )}
          </p>
          <Button className="h-11 w-fit px-5 text-base" onClick={onNext}>
            Huruf berikutnya
          </Button>
        </div>
      )}
    </section>
  );
}
