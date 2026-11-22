"use client";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function indonesianVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("id"));
}

let speakingNow = false;
const speakingListeners = new Set<() => void>();

function setSpeakingNow(value: boolean) {
  if (speakingNow === value) return;
  speakingNow = value;
  speakingListeners.forEach((l) => l());
}

function syncSpeaking() {
  window.setTimeout(() => {
    const synth = window.speechSynthesis;
    setSpeakingNow(synth.speaking || synth.pending);
  }, 0);
}

let stopGeneration = 0;

export function subscribeSpeaking(listener: () => void): () => void {
  speakingListeners.add(listener);
  return () => speakingListeners.delete(listener);
}

export function isSpeaking(): boolean {
  return speakingNow;
}

export type SpeakOptions = {
  queue?: boolean;
};

export function speakIndonesian(
  text: string,
  onEnd?: (error?: string) => void,
  options: SpeakOptions = {},
): boolean {
  if (!canSpeak() || !text) return false;
  const synth = window.speechSynthesis;
  if (!options.queue || !synth.speaking) synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  const voice = indonesianVoice();
  if (voice) utterance.voice = voice;
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = (e) => onEnd(e.error);
  }
  const generation = stopGeneration;
  utterance.addEventListener("start", () => {
    if (generation !== stopGeneration) window.speechSynthesis.cancel();
  });
  utterance.addEventListener("end", syncSpeaking);
  utterance.addEventListener("error", syncSpeaking);
  setSpeakingNow(true);
  synth.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (!canSpeak()) return;
  stopGeneration += 1;
  const synth = window.speechSynthesis;
  synth.cancel();
  setSpeakingNow(false);
  window.setTimeout(() => {
    if (synth.speaking || synth.pending) synth.cancel();
  }, 60);
}

type UserActivation = { hasBeenActive: boolean };

export function needsActivation(): boolean {
  const ua = (navigator as Navigator & { userActivation?: UserActivation }).userActivation;
  return ua ? !ua.hasBeenActive : false;
}

const PASSIVE_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "Escape", "CapsLock"]);

export function whenSpeechAllowed(run: () => void, { wait = false }: { wait?: boolean } = {}): () => void {
  if (!wait && !needsActivation()) {
    run();
    return () => {};
  }
  const onKey = (e: KeyboardEvent) => {
    if (PASSIVE_KEYS.has(e.key)) return;
    cancel();
    run();
  };
  const onPointer = () => {
    cancel();
    run();
  };
  const cancel = () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pointerup", onPointer, true);
  };
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pointerup", onPointer, true);
  return cancel;
}

export function speakAndWait(text: string, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    if (!speakIndonesian(text, done)) done();
  });
}

const micStreams = new Set<MediaStream>();

export function trackMic(stream: MediaStream) {
  micStreams.add(stream);
  stopSpeaking();
}

export function micInUse(): boolean {
  for (const stream of micStreams) {
    if (stream.getTracks().some((t) => t.readyState === "live")) return true;
    micStreams.delete(stream);
  }
  return false;
}
