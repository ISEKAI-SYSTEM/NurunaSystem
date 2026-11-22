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

/**
 * Chrome Android dengan `continuous` sering mengirim hasil final kumulatif
 * ("قل", "قل هو", "قل هو الله") atau mengulang hasil yang sama. Gabungkan
 * sehingga tiap kata hanya muncul sekali.
 */
export function mergeSegments(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const text of texts) {
    const last = out.at(-1);
    if (last !== undefined && (text === last || last.startsWith(`${text} `))) continue;
    if (last !== undefined && text.startsWith(`${last} `)) out[out.length - 1] = text;
    else out.push(text);
  }
  return out;
}

/** Buang awalan teks sementara yang mengulang hasil final terakhir. */
export function stripRepeatedPrefix(interim: string, lastFinal: string | undefined): string {
  if (!lastFinal || !interim) return interim;
  if (interim === lastFinal) return "";
  return interim.startsWith(`${lastFinal} `) ? interim.slice(lastFinal.length + 1) : interim;
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
  let pendingInterim = "";
  let current: Recognition | null = null;

  const begin = () => {
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const before = finals;
    recognition.onresult = (e) => {
      const rawFinals: string[] = [];
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript.trim() ?? "";
        if (!text) continue;
        if (result.isFinal) rawFinals.push(text);
        else interim += ` ${text}`;
      }
      const sessionFinals = mergeSegments(rawFinals);
      finals = [...before, ...sessionFinals];
      pendingInterim = stripRepeatedPrefix(interim.trim(), sessionFinals.at(-1));
      onText(finals.join(" "), pendingInterim);
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
      // Sesi berakhir (jeda panjang / batas waktu) sebelum teks sementara
      // menjadi final: simpan agar kata itu tidak hilang saat sesi baru dimulai.
      if (pendingInterim) {
        finals = [...finals, pendingInterim];
        pendingInterim = "";
        onText(finals.join(" "), "");
      }
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
