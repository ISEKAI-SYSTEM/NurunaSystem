"use client";

import { BarChart3, Download, Hand, Trash2, Undo2, Upload } from "lucide-react";
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
import { useSettings } from "@/lib/settings";

import { type HandFrame, HandTracker } from "./hand-tracker";

const CAPTURE_TIMEOUT_MS = 4000;
const TARGET_PER_LETTER = 30;

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
    letter: useId(),
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
    if (!cameraOn || capture.state !== "siap") return;
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

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="judul-kamera" className="flex flex-col gap-3">
        <h2 id="judul-kamera" className="text-2xl font-semibold">
          1. Kamera
        </h2>
        <HandTracker onFrame={handleFrame} onActiveChange={setCameraOn} />
      </section>

      <section aria-labelledby="judul-rekam" className="flex flex-col gap-4">
        <h2 id="judul-rekam" className="text-2xl font-semibold">
          2. Ambil sampel
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.participant} className="font-medium">
              Kode peserta
            </label>
            <input
              id={ids.participant}
              value={participant}
              onChange={(e) => setParticipant(e.target.value)}
              aria-describedby={`${ids.participant}-hint`}
              autoComplete="off"
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
            />
            <span id={`${ids.participant}-hint`} className="text-sm text-muted-foreground">
              Kode anonim, jangan nama asli.
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.letter} className="font-medium">
              Huruf
            </label>
            <select
              id={ids.letter}
              value={letterId}
              onChange={(e) => setLetterId(e.target.value)}
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
            >
              {HIJAIYAH_LETTERS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.char}) — {counts.get(l.id) ?? 0} sampel
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.frames} className="font-medium">
              Frame per sampel
            </label>
            <input
              id={ids.frames}
              type="number"
              min={1}
              max={60}
              value={framesPerSample}
              onChange={(e) => setFramesPerSample(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id={ids.countdown}
            type="checkbox"
            checked={useCountdown}
            onChange={(e) => setUseCountdown(e.target.checked)}
            className="size-6 accent-primary"
          />
          <label htmlFor={ids.countdown} className="text-base">
            Hitung mundur 3 detik sebelum merekam (untuk merekam sendiri)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
          <span lang="ar" dir="rtl" aria-hidden="true" className="font-quran text-6xl leading-loose">
            {letter.char}
          </span>
          <div className="flex flex-col gap-2">
            <p className="text-lg font-semibold">
              Huruf {letter.name}: {counts.get(letterId) ?? 0} dari {TARGET_PER_LETTER} sampel
            </p>
            <Button
              className="h-11 w-fit px-5 text-base"
              onClick={takeSample}
              disabled={!cameraOn || capture.state !== "siap"}
            >
              <Hand aria-hidden="true" className="size-5" />
              {capture.state === "merekam"
                ? "Merekam…"
                : capture.state === "hitung-mundur"
                  ? `Bersiap… ${capture.seconds}`
                  : "Ambil sampel"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {cameraOn
                ? keyboardShortcuts
                  ? "Tekan tombol atau Spasi, lalu tahan isyarat sebentar."
                  : "Tekan tombol, lalu tahan isyarat sebentar."
                : "Nyalakan kamera dulu."}
            </p>
          </div>
        </div>
        {error && <p className="font-medium text-destructive">{error}</p>}
      </section>

      <section aria-labelledby="judul-data" className="flex flex-col gap-4">
        <h2 id="judul-data" className="text-2xl font-semibold">
          3. Data
        </h2>
        <p className="text-base">
          Total {samples.length} sampel.{" "}
          {unsaved ? (
            <strong>Ada sampel yang belum diunduh.</strong>
          ) : (
            "Semua sampel sudah diunduh."
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 px-4 text-base" onClick={download} disabled={!samples.length}>
            <Download aria-hidden="true" className="size-5" />
            Unduh data (JSON)
          </Button>
          <Button variant="outline" className="h-11 px-4 text-base" onClick={undoLast} disabled={!samples.length}>
            <Undo2 aria-hidden="true" className="size-5" />
            Hapus sampel terakhir
          </Button>
          <Button variant="outline" className="h-11 px-4 text-base" onClick={clearAll} disabled={!samples.length}>
            <Trash2 aria-hidden="true" className="size-5" />
            Hapus semua
          </Button>
          <label
            htmlFor={ids.file}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 text-base font-medium hover:bg-muted has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2"
          >
            <Upload aria-hidden="true" className="size-5" />
            Muat data (JSON)
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
        </div>

        <table className="w-full max-w-xl border-collapse text-base">
          <caption className="mb-2 text-start font-medium">Jumlah sampel per huruf</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2 text-start">Huruf</th>
              <th scope="col" className="py-2 text-end">Sampel</th>
              <th scope="col" className="py-2 text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            {HIJAIYAH_LETTERS.map((l) => {
              const n = counts.get(l.id) ?? 0;
              return (
                <tr key={l.id} className="border-b" aria-current={l.id === letterId ? "true" : undefined}>
                  <th scope="row" className="py-1.5 text-start font-normal">
                    <span lang="ar" dir="rtl" className="me-2 font-quran text-xl">
                      {l.char}
                    </span>
                    {l.name}
                  </th>
                  <td className="py-1.5 text-end tabular-nums">{n}</td>
                  <td className="py-1.5 text-end">
                    {n >= TARGET_PER_LETTER ? "Cukup" : `Kurang ${TARGET_PER_LETTER - n}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="judul-uji" className="flex flex-col gap-4">
        <h2 id="judul-uji" className="text-2xl font-semibold">
          4. Uji pengenal
        </h2>
        <p className="max-w-prose text-base leading-relaxed">
          Pengenal belajar dari sampel di atas. Untuk hasil yang jujur, setiap
          peserta diuji memakai data peserta lain (butuh minimal 2 kode
          peserta). Targetkan akurasi di atas 90% sebelum dipakai siswa.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            disabled={counts.size < 2}
            onClick={() => {
              const e = evaluateClassifier(samples);
              setEvaluation(e);
              setMessage(`Akurasi ${Math.round(e.accuracy * 100)}% dari ${e.tested} sampel.`);
            }}
          >
            <BarChart3 aria-hidden="true" className="size-5" />
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
              className="size-6 accent-primary"
            />
            <label htmlFor={ids.live} className="text-base">
              Coba pengenal langsung di kamera
            </label>
          </div>
        </div>
        {counts.size < 2 && (
          <p className="text-sm text-muted-foreground">Butuh sampel untuk minimal 2 huruf.</p>
        )}
        {liveTest && (
          <p className="text-lg font-semibold">
            {cameraOn ? liveLabel || "Menunggu tangan…" : "Nyalakan kamera untuk mencoba."}
          </p>
        )}

        {evaluation && (
          <div className="flex flex-col gap-3">
            <p className="text-lg">
              <strong>Akurasi {Math.round(evaluation.accuracy * 100)}%</strong> ({evaluation.correct} dari{" "}
              {evaluation.tested} sampel benar,{" "}
              {evaluation.method === "per-peserta"
                ? "diuji per peserta"
                : "diuji per sampel karena baru ada satu peserta"}
              ).
            </p>
            <table className="w-full max-w-xl border-collapse text-base">
              <caption className="mb-2 text-start font-medium">Hasil per huruf (yang paling lemah di atas)</caption>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="py-2 text-start">Huruf</th>
                  <th scope="col" className="py-2 text-end">Benar</th>
                  <th scope="col" className="py-2 text-start ps-4">Sering tertukar dengan</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.letters.map((r) => (
                  <tr key={r.letter} className="border-b">
                    <th scope="row" className="py-1.5 text-start font-normal">
                      {LETTER_BY_ID.get(r.letter)?.name ?? r.letter}
                    </th>
                    <td className="py-1.5 text-end tabular-nums">
                      {r.correct}/{r.total}
                    </td>
                    <td className="py-1.5 ps-4">
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
          </div>
        )}

        <div className="max-w-prose rounded-xl border bg-card p-4 text-base leading-relaxed">
          <p className="font-semibold">Memakai data ini di halaman Belajar Isyarat</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1 ps-6">
            <li>Tekan <strong>Unduh data (JSON)</strong>.</li>
            <li>
              Simpan berkasnya di repo sebagai <code>public/isyarat/dataset.json</code>.
            </li>
            <li>Commit dan jalankan ulang aplikasi. Halaman <code>/belajar/isyarat</code> akan memakainya.</li>
          </ol>
        </div>
      </section>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
