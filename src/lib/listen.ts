"use client";

type RecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionClass() !== null;
}

function errorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini, atau pilih dengan angka.";
    case "no-speech":
      return "Tidak terdengar suara. Coba lagi, atau pilih dengan angka.";
    case "audio-capture":
      return "Mikrofon tidak ditemukan. Pilih dengan angka atau tombol.";
    case "network":
      return "Pengenal suara butuh koneksi internet. Pilih dengan angka atau tombol.";
    default:
      return "Suara tidak bisa dikenali. Coba lagi, atau pilih dengan angka.";
  }
}

export function listenOnce({
  onResult,
  onError,
  onEnd,
}: {
  onResult: (alternatives: string[]) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}): () => void {
  const Ctor = recognitionClass();
  if (!Ctor) {
    onError("Browser ini belum mendukung pengenal suara. Pilih dengan angka atau tombol.");
    onEnd?.();
    return () => {};
  }
  const recognition = new Ctor();
  recognition.lang = "id-ID";
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  let settled = false;
  recognition.onresult = (e) => {
    settled = true;
    const first = e.results[0];
    const alternatives = first ? Array.from(first, (a) => a.transcript) : [];
    onResult(alternatives);
  };
  recognition.onerror = (e) => {
    if (e.error === "aborted") return;
    settled = true;
    onError(errorMessage(e.error));
  };
  recognition.onend = () => {
    if (!settled) onError(errorMessage("no-speech"));
    onEnd?.();
  };
  try {
    recognition.start();
  } catch {
    onError(errorMessage(""));
    onEnd?.();
    return () => {};
  }
  return () => {
    settled = true;
    recognition.abort();
  };
}
