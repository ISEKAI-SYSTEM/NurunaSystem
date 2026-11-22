"use client";

type Alternative = { transcript: string };
type ResultList = ArrayLike<ArrayLike<Alternative> & { isFinal: boolean }>;
type RecognitionEvent = { resultIndex: number; results: ResultList };
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
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

export function canListenLive(): boolean {
  return recognitionClass() !== null;
}

function fatalMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Koreksi langsung tidak diizinkan browser. Rekaman tetap diperiksa setelah selesai.";
    case "audio-capture":
      return "Mikrofon tidak bisa dipakai untuk koreksi langsung.";
    case "network":
      return "Koreksi langsung butuh internet. Rekaman tetap diperiksa setelah selesai.";
    case "language-not-supported":
      return "Browser ini belum mendukung bahasa Arab untuk koreksi langsung.";
    default:
      return null;
  }
}

export type LiveListener = {
  stop(): void;
};

export function listenLive({
  lang = "ar-SA",
  onText,
  onError,
}: {
  lang?: string;
  onText: (finalText: string, interimText: string) => void;
  onError: (message: string) => void;
}): LiveListener {
  const Ctor = recognitionClass();
  if (!Ctor) {
    onError("Browser ini belum mendukung koreksi langsung. Rekaman tetap diperiksa setelah selesai.");
    return { stop() {} };
  }

  let stopped = false;
  let finals: string[] = [];
  let current: Recognition | null = null;

  const begin = () => {
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const before = finals;
    recognition.onresult = (e) => {
      const sessionFinals: string[] = [];
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript.trim() ?? "";
        if (!text) continue;
        if (result.isFinal) sessionFinals.push(text);
        else interim += ` ${text}`;
      }
      finals = [...before, ...sessionFinals];
      onText(finals.join(" "), interim.trim());
    };
    recognition.onerror = (e) => {
      const message = fatalMessage(e.error);
      if (message) {
        stopped = true;
        onError(message);
      }
    };
    recognition.onend = () => {
      if (stopped) return;
      try {
        begin();
      } catch {
        stopped = true;
      }
    };
    current = recognition;
    recognition.start();
  };

  try {
    begin();
  } catch {
    onError("Koreksi langsung gagal dimulai. Rekaman tetap diperiksa setelah selesai.");
    return { stop() {} };
  }

  return {
    stop() {
      stopped = true;
      current?.stop();
    },
  };
}
