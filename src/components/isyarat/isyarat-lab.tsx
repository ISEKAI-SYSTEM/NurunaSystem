"use client";

import { BarChart3, Check, Download, Hand, Trash2, Undo2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type Evaluation, evaluateClassifier, trainClassifier } from "@/lib/isyarat/classifier";
import {
  type IsyaratSample,
  countByLetter,
  mergeSamples,
  parseDataset,
  serializeDataset,
} from "@/lib/isyarat/dataset";
import { HIJAIYAH_LETTERS, LETTER_BY_ID } from "@/lib/isyarat/hijaiyah";
import { kemenagSign } from "@/lib/isyarat/kemenag";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

import { type HandFrame, HandTracker } from "./hand-tracker";

const CAPTURE_TIMEOUT_MS = 4000;
const TARGET_PER_LETTER = 30;
// Diisyaratkan per huruf (Pedoman Kemenag); setoran juga memeriksanya per huruf, jadi tidak direkam sendiri.
const SPLIT_LETTERS: Record<string, readonly string[]> = { "lam-alif": ["lam", "alif"] };

type Capture =
  | { state: "siap" }
  | { state: "hitung-mundur"; seconds: number }
  | { state: "merekam" };

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function IsyaratLab() {
  const ids = {
    participant: useId(),
    frames: useId(),
    countdown: useId(),
    file: useId(),
    live: useId(),
  };
  const { keyboardShortcuts } = useSettings();
  const [samples, setSamples] = useState<IsyaratSample[]>([]);
  const [unsaved, setUnsaved] = useState(false);
  const [participant, setParticipant] = useState("P01");
  const [letterId, setLetterId] = useState(HIJAIYAH_LETTERS[0].id);
  const [framesPerSample, setFramesPerSample] = useState(10);
  const [useCountdown, setUseCountdown] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [capture, setCapture] = useState<Capture>({ state: "siap" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [liveTest, setLiveTest] = useState(false);
  const [liveLabel, setLiveLabel] = useState("");

  const framesRef = useRef<HandFrame[]>([]);
  const capturingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const settingsRef = useRef({ participant, letterId, framesPerSample });
  useEffect(() => {
    settingsRef.current = { participant, letterId, framesPerSample };
  }, [participant, letterId, framesPerSample]);

  const classifier = useMemo(() => trainClassifier(samples), [samples]);
  const liveRef = useRef({ on: liveTest, classifier });
  useEffect(() => {
    liveRef.current = { on: liveTest, classifier };
  }, [liveTest, classifier]);

  const counts = countByLetter(samples);
  const letter = LETTER_BY_ID.get(letterId)!;

  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  const clearTimers = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
    timeoutRef.current = null;
    countdownRef.current = null;
  };
  useEffect(() => clearTimers, []);

  const finishCapture = useCallback((frames: HandFrame[]) => {
    capturingRef.current = false;
    clearTimers();
    setCapture({ state: "siap" });
    const { participant, letterId } = settingsRef.current;
    const handedness = frames[0].handedness;
    const sample: IsyaratSample = {
      id: newId(),
      letter: letterId,
      participant: participant.trim() || "P00",
      handedness,
      capturedAt: new Date().toISOString(),
      frames: frames.map((f) => f.features),
    };
    setSamples((prev) => {
      const next = [...prev, sample];
      const n = countByLetter(next).get(letterId) ?? 0;
      setMessage(`Sampel ${LETTER_BY_ID.get(letterId)!.name} tersimpan (${n} untuk huruf ini).`);
      return next;
    });
    setUnsaved(true);
  }, []);

  const handleFrame = useCallback(
    (frame: HandFrame | null) => {
      const live = liveRef.current;
      if (live.on) {
        let label = "Tangan tidak terlihat.";
        if (frame) {
          const p = live.classifier.predict(frame.features, frame.handedness);
          label = p.letter
            ? `Terdeteksi: ${LETTER_BY_ID.get(p.letter)?.name ?? p.letter} (${Math.round(p.confidence * 100)}%)`
            : "Tidak dikenali.";
        }
        setLiveLabel((prev) => (prev === label ? prev : label));
      }
      if (!capturingRef.current || !frame) return;
      framesRef.current.push(frame);
      if (framesRef.current.length >= settingsRef.current.framesPerSample) {
        finishCapture(framesRef.current);
      }
    },
    [finishCapture],
  );

  const beginRecording = useCallback(() => {
    framesRef.current = [];
    capturingRef.current = true;
    setCapture({ state: "merekam" });
    setMessage("Merekam… tahan isyarat.");
    timeoutRef.current = window.setTimeout(() => {
      capturingRef.current = false;
      setCapture({ state: "siap" });
      setError("Tangan tidak terdeteksi cukup lama. Pastikan tangan terlihat jelas, lalu coba lagi.");
      setMessage("Sampel gagal diambil.");
    }, CAPTURE_TIMEOUT_MS);
  }, []);

  const takeSample = useCallback(() => {
    if (!cameraOn || capture.state !== "siap" || SPLIT_LETTERS[settingsRef.current.letterId]) return;
    setError("");
    if (!useCountdown) {
      beginRecording();
      return;
    }
    let seconds = 3;
    setCapture({ state: "hitung-mundur", seconds });
    setMessage(`Bersiap: ${seconds}`);
    countdownRef.current = window.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        if (countdownRef.current !== null) window.clearInterval(countdownRef.current);
        countdownRef.current = null;
        beginRecording();
      } else {
        setCapture({ state: "hitung-mundur", seconds });
        setMessage(`${seconds}`);
      }
    }, 1000);
  }, [cameraOn, capture.state, useCountdown, beginRecording]);

  useEffect(() => {
    if (!keyboardShortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, select, textarea, button, a, summary")) return;
      e.preventDefault();
      takeSample();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [takeSample, keyboardShortcuts]);

  function undoLast() {
    const last = samples.at(-1);
    if (!last) return;
    setSamples(samples.slice(0, -1));
    setUnsaved(true);
    setMessage(`Sampel terakhir (${LETTER_BY_ID.get(last.letter)!.name}) dihapus.`);
  }

  function clearAll() {
    if (!samples.length) return;
    if (!window.confirm(`Hapus semua ${samples.length} sampel? Data yang belum diunduh akan hilang.`)) return;
    setSamples([]);
    setUnsaved(false);
    setMessage("Semua sampel dihapus.");
  }

  function download() {
    const blob = new Blob([serializeDataset(samples)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isyarat-hijaiyah-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setUnsaved(false);
    setMessage(`${samples.length} sampel diunduh.`);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const incoming = parseDataset(await file.text());
      setSamples((prev) => {
        const merged = mergeSamples(prev, incoming);
        setMessage(`${merged.length - prev.length} sampel dimuat dari ${file.name}.`);
        return merged;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Berkas tidak bisa dibaca.");
    }
  }

  const sign = kemenagSign(letterId);
  const letterCount = counts.get(letterId) ?? 0;
  const split = SPLIT_LETTERS[letterId];
  const steps: { text: string; done: boolean; active: boolean }[] = [
    { text: "Nyalakan kamera.", done: cameraOn, active: !cameraOn },
    {
      text: sign ? "Pilih huruf, lalu bentuk tangan seperti gambar." : "Pilih huruf, lalu bentuk isyaratnya.",
      done: false,
      active: cameraOn && capture.state === "siap",
    },
    {
      text: keyboardShortcuts
        ? "Tekan Ambil sampel (atau Spasi), tahan sampai selesai."
        : "Tekan Ambil sampel, tahan sampai selesai.",
      done: false,
      active: capture.state !== "siap",
    },
    { text: `Ulangi sampai ${TARGET_PER_LETTER} sampel, lalu unduh data.`, done: false, active: false },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <section aria-labelledby="judul-kamera" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <h2 id="judul-kamera" className="text-lg font-semibold">
            1. Kamera
          </h2>
          <HandTracker onFrame={handleFrame} onActiveChange={setCameraOn} compact />
        </section>

        <section aria-labelledby="judul-uji" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <h2 id="judul-uji" className="text-lg font-semibold">
            3. Uji pengenal
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-10 px-3 text-sm"
              disabled={counts.size < 2}
              onClick={() => {
                const e = evaluateClassifier(samples);
                setEvaluation(e);
                setMessage(`Akurasi ${Math.round(e.accuracy * 100)}% dari ${e.tested} sampel.`);
              }}
            >
              <BarChart3 aria-hidden="true" className="size-4" />
              Hitung akurasi
            </Button>
            <div className="flex items-center gap-2">
              <input
                id={ids.live}
                type="checkbox"
                checked={liveTest}
                disabled={samples.length === 0}
                onChange={(e) => {
                  setLiveTest(e.target.checked);
                  setLiveLabel("");
                }}
                className="size-5 accent-primary"
              />
              <label htmlFor={ids.live} className="text-sm">
                Coba langsung di kamera
              </label>
            </div>
          </div>
          {counts.size < 2 && <p className="text-xs text-muted-foreground">Butuh sampel untuk minimal 2 huruf.</p>}
          {liveTest && (
            <p className="font-semibold">{cameraOn ? liveLabel || "Menunggu tangan…" : "Nyalakan kamera untuk mencoba."}</p>
          )}
          {evaluation && (
            <details className="text-sm">
              <summary className="cursor-pointer">
                <strong>Akurasi {Math.round(evaluation.accuracy * 100)}%</strong> ({evaluation.correct} dari{" "}
                {evaluation.tested},{" "}
                {evaluation.method === "per-peserta" ? "diuji per peserta" : "diuji per sampel, baru satu peserta"}).
                Lihat per huruf
              </summary>
              <table className="mt-2 w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="py-1 text-start">Huruf</th>
                    <th scope="col" className="py-1 text-end">Benar</th>
                    <th scope="col" className="py-1 ps-4 text-start">Sering tertukar dengan</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.letters.map((r) => (
                    <tr key={r.letter} className="border-b">
                      <th scope="row" className="py-1 text-start font-normal">
                        {LETTER_BY_ID.get(r.letter)?.name ?? r.letter}
                      </th>
                      <td className="py-1 text-end tabular-nums">
                        {r.correct}/{r.total}
                      </td>
                      <td className="py-1 ps-4">
                        {Object.entries(r.confusions)
                          .sort((a, b) => b[1] - a[1])
                          .map(([l, n]) =>
                            `${l === "tidak-dikenali" ? "tidak dikenali" : (LETTER_BY_ID.get(l)?.name ?? l)} (${n})`,
                          )
                          .join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          <p className="text-xs text-muted-foreground">
            Setiap peserta diuji memakai data peserta lain. Targetkan akurasi di atas 90% sebelum dipakai siswa.
          </p>
        </section>
      </div>

      <section aria-labelledby="judul-rekam" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 id="judul-rekam" className="text-lg font-semibold">
          2. Ambil sampel
        </h2>

        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.participant} className="text-sm font-medium">
              Kode peserta <span className="font-normal text-muted-foreground">(anonim, mis. P01)</span>
            </label>
            <input
              id={ids.participant}
              value={participant}
              onChange={(e) => setParticipant(e.target.value)}
              autoComplete="off"
              className="min-h-10 rounded-lg border border-input bg-background px-3 text-base"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.frames} className="text-sm font-medium">
              Frame/sampel
            </label>
            <input
              id={ids.frames}
              type="number"
              min={1}
              max={60}
              value={framesPerSample}
              onChange={(e) => setFramesPerSample(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              className="min-h-10 rounded-lg border border-input bg-background px-3 text-base"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Huruf (angka = jumlah sampel)</legend>
          <div className="flex flex-wrap gap-1" dir="rtl">
            {HIJAIYAH_LETTERS.map((l) => {
              const n = counts.get(l.id) ?? 0;
              const selected = l.id === letterId;
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={SPLIT_LETTERS[l.id] ? `${l.name}, direkam per huruf` : `${l.name}, ${n} sampel`}
                  onClick={() => setLetterId(l.id)}
                  className={cn(
                    "inline-flex h-10 min-w-11 items-center justify-center gap-1 rounded-md border px-1.5",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted",
                    !selected && n >= TARGET_PER_LETTER && "border-[var(--status-benar)]",
                  )}
                >
                  <span lang="ar" className="font-quran text-xl leading-none">
                    {l.char}
                  </span>
                  {!SPLIT_LETTERS[l.id] && (
                    <span dir="ltr" className="text-[0.7rem] tabular-nums opacity-80">
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-start gap-4 rounded-lg border bg-background p-3">
          <div className="flex items-center gap-3">
            <span lang="ar" dir="rtl" aria-hidden="true" className="font-quran text-5xl leading-[1.6]">
              {letter.char}
            </span>
            {sign && (
              <Image
                src={sign.image}
                alt={`Gambar isyarat huruf ${letter.name}`}
                width={128}
                height={128}
                className="size-28 rounded-lg border bg-white [@media(max-height:50rem)]:size-24"
              />
            )}
          </div>
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            {split ? (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Huruf {letter.name} tidak perlu direkam.</p>
                <p className="text-sm">
                  Isyaratnya {split.map((id) => LETTER_BY_ID.get(id)!.name).join(" lalu ")}, dan setoran memeriksanya
                  per huruf. Rekam di huruf masing-masing:
                </p>
                <div className="flex flex-wrap gap-2">
                  {split.map((id) => (
                    <Button key={id} variant="outline" className="h-10 px-3 text-sm" onClick={() => setLetterId(id)}>
                      <span lang="ar" dir="rtl" aria-hidden="true" className="font-quran text-xl leading-none">
                        {LETTER_BY_ID.get(id)!.char}
                      </span>
                      Rekam {LETTER_BY_ID.get(id)!.name} ({counts.get(id) ?? 0})
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
              <p className="font-semibold">
                Huruf {letter.name}: {letterCount} dari {TARGET_PER_LETTER} sampel
              </p>
              <div
                role="progressbar"
                aria-label={`Sampel huruf ${letter.name}`}
                aria-valuemin={0}
                aria-valuemax={TARGET_PER_LETTER}
                aria-valuenow={Math.min(letterCount, TARGET_PER_LETTER)}
                className="h-2.5 w-full overflow-hidden rounded-full border border-input bg-background"
              >
                <div
                  className="h-full bg-[var(--status-benar)] transition-[width]"
                  style={{ width: `${Math.min(100, (letterCount / TARGET_PER_LETTER) * 100)}%` }}
                />
              </div>
              </>
            )}
            {sign && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Cara:</strong> {sign.description}
              </p>
            )}
          </div>
        </div>

        <ol className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {steps.map((s, i) => (
            <li
              key={i}
              aria-current={s.active ? "step" : undefined}
              className={cn("flex items-start gap-2 text-sm leading-snug", s.active && "font-semibold")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-bold",
                  s.done && "border-[var(--status-benar)] bg-[var(--status-benar)] text-white",
                  s.active && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {s.done ? <Check className="size-3" /> : i + 1}
              </span>
              <span>
                {s.text}
                {s.done && <span className="sr-only"> (selesai)</span>}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="h-11 px-5 text-base" onClick={takeSample} disabled={!cameraOn || capture.state !== "siap" || Boolean(split)}>
            <Hand aria-hidden="true" className="size-5" />
            {capture.state === "merekam"
              ? "Merekam…"
              : capture.state === "hitung-mundur"
                ? `Bersiap… ${capture.seconds}`
                : "Ambil sampel"}
          </Button>
          <div className="flex items-center gap-2">
            <input
              id={ids.countdown}
              type="checkbox"
              checked={useCountdown}
              onChange={(e) => setUseCountdown(e.target.checked)}
              className="size-5 accent-primary"
            />
            <label htmlFor={ids.countdown} className="text-sm">
              Hitung mundur 3 detik (merekam sendiri)
            </label>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 border-t pt-3">
          <p className="text-sm">
            Total {samples.length} sampel.{" "}
            {unsaved ? <strong>Ada sampel yang belum diunduh.</strong> : "Semua sampel sudah diunduh."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-10 px-3 text-sm" onClick={download} disabled={!samples.length}>
              <Download aria-hidden="true" className="size-4" />
              Unduh data (JSON)
            </Button>
            <label
              htmlFor={ids.file}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2"
            >
              <Upload aria-hidden="true" className="size-4" />
              Muat data
              <input
                id={ids.file}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <Button variant="outline" className="h-10 px-3 text-sm" onClick={undoLast} disabled={!samples.length}>
              <Undo2 aria-hidden="true" className="size-4" />
              Hapus terakhir
            </Button>
            <Button variant="outline" className="h-10 px-3 text-sm" onClick={clearAll} disabled={!samples.length}>
              <Trash2 aria-hidden="true" className="size-4" />
              Hapus semua
            </Button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Memakai data ini di aplikasi</summary>
            <ol className="mt-1 flex list-decimal flex-col gap-0.5 ps-6">
              <li>
                Tekan <strong>Unduh data (JSON)</strong>.
              </li>
              <li>
                Simpan sebagai <code>public/isyarat/dataset.json</code> (untuk menambah data lama, tekan{" "}
                <strong>Muat data</strong> dulu sebelum merekam).
              </li>
              <li>Commit dan jalankan ulang aplikasi.</li>
            </ol>
          </details>
        </div>
      </section>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
