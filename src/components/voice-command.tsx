"use client";

import { Loader2, Mic, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  PERINTAH_EVENT,
  type PerintahEventDetail,
  type PerintahResponse,
  READER_ACTIONS,
  type VoiceCommand,
  commandHref,
  describeCommand,
} from "@/lib/perintah/commands";
import { NO_RECORDING_SUPPORT, canRecord, micErrorMessage, pickMimeType } from "@/lib/recording";
import { useSettings } from "@/lib/settings";
import { speakIndonesian, trackMic } from "@/lib/speech";
import { cn } from "@/lib/utils";

type Phase = "siap" | "mendengar" | "memproses";

const MAX_LISTEN_MS = 6000;

function sendToReader(detail: PerintahEventDetail) {
  window.dispatchEvent(new CustomEvent<PerintahEventDetail>(PERINTAH_EVENT, { detail }));
}

export function VoiceCommandButton({ className }: { className?: string }) {
  const hintId = useId();
  const router = useRouter();
  const { keyboardShortcuts, speakSetoranResult, voiceGuide } = useSettings();
  const speakResult = speakSetoranResult && !voiceGuide;
  const [phase, setPhase] = useState<Phase>("siap");
  const [status, setStatus] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const speakRef = useRef(speakResult);
  useEffect(() => {
    speakRef.current = speakResult;
  }, [speakResult]);

  const cleanup = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanup();
  }, []);

  const report = useCallback((message: string) => {
    setStatus(message);
    if (speakRef.current) speakIndonesian(message);
  }, []);

  const execute = useCallback(
    (command: VoiceCommand, transcript: string) => {
      let message = describeCommand(command, transcript);
      const href = commandHref(command);
      if (href) {
        router.push(href);
      } else if (READER_ACTIONS.has(command.action)) {
        if (window.location.pathname.startsWith("/surah/")) {
          sendToReader({ action: command.action, ayat: command.ayat });
        } else {
          message = 'Perintah ini hanya bisa dipakai di halaman baca surah. Ucapkan misalnya "buka surat Al-Fatihah".';
        }
      }
      const heard = transcript.trim() && command.action !== "tidak_dikenal";
      report(heard ? `Terdengar: "${transcript.trim()}". ${message}` : message);
    },
    [router, report],
  );

  const submit = useCallback(
    async (blob: Blob, ext: string) => {
      setPhase("memproses");
      setStatus("Memproses perintah…");
      const body = new FormData();
      body.set("audio", new File([blob], `perintah.${ext}`, { type: blob.type || "audio/webm" }));
      try {
        const res = await fetch("/api/ai/perintah", { method: "POST", body });
        const data = (await res.json().catch(() => null)) as PerintahResponse | null;
        if (!res.ok || !data || "error" in data) {
          report(data && "error" in data ? data.error : "Perintah gagal diproses. Coba lagi.");
        } else {
          execute(data.command, data.transcript);
        }
      } catch {
        report("Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.");
      } finally {
        setPhase("siap");
      }
    },
    [execute, report],
  );

  const start = useCallback(async () => {
    if (!canRecord()) {
      report(NO_RECORDING_SUPPORT);
      return;
    }
    sendToReader({ action: "jeda", ayat: null });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      report(micErrorMessage(err));
      return;
    }
    streamRef.current = stream;
    trackMic(stream);
    const { mimeType, ext } = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      cleanup();
      void submit(new Blob(chunks, { type: recorder.mimeType || mimeType }), ext);
    };
    recorder.start();
    setPhase("mendengar");
    setStatus(
      "Mendengarkan… Ucapkan perintah, lalu tekan Selesai bicara (atau V).",
    );
    timerRef.current = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_LISTEN_MS);
  }, [report, submit]);

  const toggle = useCallback(() => {
    if (phase === "mendengar") {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    } else if (phase === "siap") {
      void start();
    }
  }, [phase, start]);

  useEffect(() => {
    if (!keyboardShortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "v" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardShortcuts, toggle]);

  return (
    <div className="relative">
      <Button
        variant={phase === "mendengar" ? "default" : "outline"}
        className={cn("h-11 px-4 text-base", className)}
        data-phase={phase}
        aria-describedby={hintId}
        onClick={toggle}
        disabled={phase === "memproses"}
      >
        {phase === "memproses" ? (
          <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
        ) : phase === "mendengar" ? (
          <Square aria-hidden="true" className="size-5" />
        ) : (
          <Mic aria-hidden="true" className="size-5" />
        )}
        <span data-label="">
          {phase === "memproses" ? "Memproses…" : phase === "mendengar" ? "Selesai bicara" : "Perintah suara"}
        </span>
      </Button>
      <span id={hintId} className="sr-only">
        {keyboardShortcuts ? "Pintasan: tombol V. " : ""}Contoh: buka surat Yasin ayat 10.
      </span>
      {status && (
        <div className="fixed inset-x-4 bottom-4 z-40 flex items-start gap-2 rounded-2xl border bg-background p-3 ps-4 text-base text-foreground shadow-lg sm:absolute sm:inset-x-auto sm:bottom-auto sm:inset-e-0 sm:top-full sm:mt-2 sm:w-88">
          <p aria-hidden="true" className="flex-1 py-1.5 leading-snug">
            {status}
          </p>
          <button
            type="button"
            onClick={() => setStatus("")}
            aria-label="Tutup pesan perintah suara"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  );
}
