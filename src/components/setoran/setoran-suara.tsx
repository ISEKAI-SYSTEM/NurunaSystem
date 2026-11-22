"use client";

import { Lightbulb, Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { TranscribeResponse } from "@/app/api/ai/transcribe/route";
import { Button } from "@/components/ui/button";
import { canListenLive, type LiveListener, listenLive } from "@/lib/live-recognition";
import { NO_RECORDING_SUPPORT, canRecord, micErrorMessage, pickMimeType } from "@/lib/recording";
import { type SetoranReveal, useSettings } from "@/lib/settings";
import {
  type LiveResult,
  type SetoranResult,
  type SetoranWordInput,
  checkSetoran,
  checkSetoranLive,
  holdLiveProgress,
} from "@/lib/setoran/setoran";
import { speakAndWait, speakIndonesian, stopSpeaking, trackMic } from "@/lib/speech";

import { LivePassage } from "./live-passage";
import { type SetoranPanelVerse, SetoranResultView, summaryText } from "./setoran-result";

type Phase =
  | { name: "siap" }
  | { name: "meminta-izin" }
  | { name: "merekam" }
  | { name: "memeriksa" }
  | { name: "selesai"; result: SetoranResult; heard: string; note: string }
  | { name: "gagal"; message: string };

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function SetoranSuara({
  verses,
  basmalah,
  label,
  reveal,
  maxSeconds,
}: {
  verses: readonly SetoranPanelVerse[];
  basmalah: readonly SetoranWordInput[];
  label: string;
  reveal: SetoranReveal;
  maxSeconds: number;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "siap" });
  const [announcement, setAnnouncement] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<LiveResult>(() => checkSetoranLive(verses, "", basmalah));
  const [liveError, setLiveError] = useState<string | null>(null);
  const [hints, setHints] = useState<ReadonlySet<number>>(new Set());
  const { speakSetoranResult, voiceGuide } = useSettings();
  const speakRef = useRef(speakSetoranResult && !voiceGuide);
  const guideRef = useRef(voiceGuide);
  useEffect(() => {
    speakRef.current = speakSetoranResult && !voiceGuide;
    guideRef.current = voiceGuide;
  }, [speakSetoranResult, voiceGuide]);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const listenerRef = useRef<LiveListener | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef({ final: "", interim: "" });

  const releaseMic = () => {
    listenerRef.current?.stop();
    listenerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      listenerRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      stopSpeaking();
    },
    [],
  );

  function finish(result: SetoranResult, heard: string, note: string) {
    setPhase({ name: "selesai", result, heard, note });
    setAnnouncement(`Hasil setoran ${label}: ${summaryText(result)}`);
    if (speakRef.current) speakIndonesian(`Hasil setoran ${label}. ${summaryText(result)}`);
  }

  function finishFromLive(reason: string) {
    const { final, interim } = transcriptRef.current;
    const heard = `${final} ${interim}`.trim();
    if (!heard) {
      setPhase({ name: "gagal", message: `${reason} Bacaan tidak terdengar oleh pengenal browser.` });
      setAnnouncement(reason);
      return;
    }
    finish(checkSetoran(verses, heard, basmalah), heard, `Dinilai dari pengenal suara browser. ${reason}`);
  }

  async function submit(blob: Blob, ext: string) {
    setPhase({ name: "memeriksa" });
    setAnnouncement("Memeriksa bacaan…");
    const body = new FormData();
    body.set("audio", new File([blob], `setoran.${ext}`, { type: blob.type || "audio/webm" }));
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/transcribe", { method: "POST", body, signal: controller.signal });
      const data = (await res.json().catch(() => null)) as TranscribeResponse | null;
      if (!res.ok || !data || "error" in data) {
        const message = data && "error" in data ? data.error : "Server penilai tidak tersedia.";
        finishFromLive(message);
        return;
      }
      finish(checkSetoran(verses, data.text, basmalah), data.text, "Dinilai ulang dengan pengenal suara Whisper setelah selesai.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      finishFromLive("Tidak bisa terhubung ke server.");
    }
  }

  async function start() {
    stopSpeaking();
    const record = canRecord();
    const listen = canListenLive();
    if (!record && !listen) {
      setPhase({ name: "gagal", message: NO_RECORDING_SUPPORT });
      setAnnouncement(NO_RECORDING_SUPPORT);
      return;
    }
    setPhase({ name: "meminta-izin" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const message = micErrorMessage(err);
      setPhase({ name: "gagal", message });
      setAnnouncement(message);
      return;
    }
    streamRef.current = stream;
    if (guideRef.current) await speakAndWait(`Bacalah ${label} setelah kalimat ini. Tekan Selesai bila sudah.`);
    if (streamRef.current !== stream) return;
    trackMic(stream);

    transcriptRef.current = { final: "", interim: "" };
    setLive(checkSetoranLive(verses, "", basmalah));
    setHints(new Set());
    setLiveError(null);
    if (listen) {
      listenerRef.current = listenLive({
        onText: (final, interim) => {
          transcriptRef.current = { final, interim };
          // Kata salah di ujung belum dinilai sampai kata sesudahnya terdengar:
          // bisa jadi derau atau kata yang belum selesai dikenali. Penilaian
          // akhir tetap memakai seluruh rekaman.
          const next = checkSetoranLive(verses, `${final} ${interim}`, basmalah, { tentativeTail: true });
          setLive((prev) => holdLiveProgress(prev, next));
        },
        onError: (message) => setLiveError(message),
      });
    } else {
      setLiveError("Browser ini belum mendukung koreksi langsung. Bacaan tetap dinilai setelah selesai.");
    }

    if (record) {
      const { mimeType, ext } = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        releaseMic();
        void submit(new Blob(chunksRef.current, { type: recorder.mimeType || mimeType }), ext);
      };
      recorder.start();
    }

    const startedAt = Date.now();
    setElapsed(0);
    setPhase({ name: "merekam" });
    setAnnouncement(`Mulai. Bacalah ${label}, lalu tekan Selesai.`);
    timerRef.current = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(ms);
      if (ms >= maxSeconds * 1000) {
        setAnnouncement("Batas waktu rekaman tercapai.");
        stop();
      }
    }, 250);
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      listenerRef.current?.stop();
      recorderRef.current.stop();
    } else {
      releaseMic();
      finishFromLive("Browser ini tidak bisa merekam untuk penilaian ulang.");
    }
  }

  function showHint() {
    if (live.next >= live.words.length) return;
    setHints((prev) => new Set(prev).add(live.next));
  }

  const recording = phase.name === "merekam";
  const nextWord = live.words[live.next];
  const hinted = nextWord && hints.has(live.next);

  return (
    <div className="flex flex-col gap-4">
      {(phase.name === "siap" || phase.name === "meminta-izin") && (
        <div className="flex max-w-prose flex-col gap-1 text-base leading-relaxed">
          <p>
            Tekan <strong>Mulai</strong>, bacalah {label} dari hafalan, lalu tekan <strong>Selesai</strong>.
            Kata ditandai langsung selama membaca. Paling lama {Math.round(maxSeconds / 60)} menit.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <>
            <Button className="h-11 px-5 text-base" onClick={stop}>
              <Square aria-hidden="true" className="size-5" />
              Selesai
            </Button>
            {reveal !== "semua" && (
              <Button variant="outline" className="h-11 px-4 text-base" onClick={showHint} disabled={!nextWord}>
                <Lightbulb aria-hidden="true" className="size-5" />
                Petunjuk kata berikutnya
              </Button>
            )}
            <span className="inline-flex items-center gap-2 font-medium">
              <span aria-hidden="true" className="size-3 rounded-full bg-destructive motion-safe:animate-pulse" />
              Mendengarkan <span aria-hidden="true">{formatDuration(elapsed)}</span>
            </span>
          </>
        ) : (
          <Button
            className="h-11 px-5 text-base"
            onClick={start}
            disabled={phase.name === "meminta-izin" || phase.name === "memeriksa"}
          >
            <Mic aria-hidden="true" className="size-5" />
            {phase.name === "selesai" || phase.name === "gagal" ? "Setor ulang" : "Mulai"}
          </Button>
        )}
        {phase.name === "memeriksa" && (
          <span className="inline-flex items-center gap-2 font-medium">
            <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
            Memeriksa bacaan…
          </span>
        )}
        {phase.name === "meminta-izin" && <span className="font-medium">Menunggu izin mikrofon…</span>}
      </div>

      {(recording || phase.name === "memeriksa") && (
        <>
          {liveError && <p className="font-medium">{liveError}</p>}
          {hinted && reveal === "tersembunyi" && (
            <p className="text-base">
              Petunjuk:{" "}
              <span lang="ar" dir="rtl" className="font-quran text-3xl">
                {nextWord.expected}
              </span>
            </p>
          )}
          <LivePassage
            verses={verses}
            statuses={live.words.map((w) => w.status)}
            next={live.next}
            reveal={reveal}
            hints={hints}
            hiddenMessage="Teks dan tanda disembunyikan sampai selesai. Terus membaca."
          />
        </>
      )}

      {phase.name === "gagal" && <p className="font-medium text-destructive">{phase.message}</p>}

      {phase.name === "selesai" && (
        <SetoranResultView
          verses={verses}
          result={phase.result}
          label={label}
          heard={phase.heard}
          note={hints.size > 0 ? `${phase.note} Petunjuk dipakai: ${hints.size} kata.` : phase.note}
        />
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
