"use client";

import { useSyncExternalStore } from "react";

export const ARABIC_SIZES = ["sedang", "besar", "sangat-besar", "raksasa"] as const;
export type ArabicSize = (typeof ARABIC_SIZES)[number];

export const ARABIC_SIZE_LABELS: Record<ArabicSize, string> = {
  sedang: "Sedang",
  besar: "Besar",
  "sangat-besar": "Sangat besar",
  raksasa: "Raksasa",
};

export const LEARNING_MODES = [
  "tunanetra",
  "tunarungu",
  "tunawicara",
  "umum",
] as const;
export type LearningMode = (typeof LEARNING_MODES)[number];

export const LEARNING_MODE_LABELS: Record<LearningMode, string> = {
  tunanetra: "Tunanetra",
  tunarungu: "Tunarungu",
  tunawicara: "Tunawicara",
  umum: "Umum",
};

export const SETORAN_REVEALS = ["semua", "bertahap", "tersembunyi"] as const;
export type SetoranReveal = (typeof SETORAN_REVEALS)[number];

export const SETORAN_REVEAL_LABELS: Record<SetoranReveal, { label: string; hint: string }> = {
  semua: { label: "Teks terlihat semua", hint: "Untuk latihan membaca. Kata ditandai sambil dibaca." },
  bertahap: { label: "Muncul bertahap", hint: "Untuk hafalan. Kata baru muncul setelah dibaca." },
  tersembunyi: { label: "Tersembunyi sampai selesai", hint: "Seperti ujian. Hasil dan teks baru terlihat di akhir." },
};

export type Settings = {
  mode: LearningMode | null;
  arabicSize: ArabicSize;
  showTranslation: boolean;
  showWordByWord: boolean;
  showIsyarat: boolean;
  showTajweed: boolean;
  highContrast: boolean;
  continuousPlay: boolean;
  keyboardShortcuts: boolean;
  speakSetoranResult: boolean;
  hafalanMode: boolean;
  voiceGuide: boolean;
  welcomeDone: boolean;
  setoranReveal: SetoranReveal;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: null,
  arabicSize: "besar",
  showTranslation: true,
  showWordByWord: false,
  showIsyarat: false,
  showTajweed: false,
  highContrast: false,
  continuousPlay: true,
  keyboardShortcuts: true,
  speakSetoranResult: false,
  hafalanMode: false,
  voiceGuide: false,
  welcomeDone: false,
  setoranReveal: "bertahap",
};

type PresetKey =
  | "arabicSize"
  | "showTranslation"
  | "showWordByWord"
  | "showIsyarat"
  | "showTajweed"
  | "continuousPlay"
  | "speakSetoranResult"
  | "voiceGuide";

const MODE_PRESETS: Record<LearningMode, Partial<Settings>> = {
  tunanetra: { arabicSize: "sangat-besar", keyboardShortcuts: true, speakSetoranResult: true },
  tunarungu: { showWordByWord: true, showTajweed: true },
  tunawicara: { showWordByWord: true, showIsyarat: true },
  umum: {},
};

export function applyMode(mode: LearningMode, extra: Partial<Pick<Settings, PresetKey>> = {}) {
  const base: Pick<Settings, PresetKey> = {
    arabicSize: DEFAULT_SETTINGS.arabicSize,
    showTranslation: DEFAULT_SETTINGS.showTranslation,
    showWordByWord: DEFAULT_SETTINGS.showWordByWord,
    showIsyarat: DEFAULT_SETTINGS.showIsyarat,
    showTajweed: DEFAULT_SETTINGS.showTajweed,
    continuousPlay: DEFAULT_SETTINGS.continuousPlay,
    speakSetoranResult: DEFAULT_SETTINGS.speakSetoranResult,
    voiceGuide: DEFAULT_SETTINGS.voiceGuide,
  };
  updateSettings({ ...base, ...MODE_PRESETS[mode], ...extra, mode, welcomeDone: true });
}

export function modeAnnouncement(mode: LearningMode): string {
  return `Mode ${LEARNING_MODE_LABELS[mode]} aktif. Pengaturan baca sudah disesuaikan dan tetap bisa diubah.`;
}

export function isLearningMode(value: unknown): value is LearningMode {
  return LEARNING_MODES.includes(value as LearningMode);
}

const STORAGE_KEY = "nuruna:settings";
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedValue: Settings = DEFAULT_SETTINGS;
let memoryRaw: string | null = null;

function getRaw(): string | null {
  if (memoryRaw !== null) return memoryRaw;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseSettings(raw: string | null): Settings {
  let stored: Partial<Settings> = {};
  try {
    stored = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const value: Settings = { ...DEFAULT_SETTINGS, ...stored };
  if (value.mode !== null && !isLearningMode(value.mode)) value.mode = null;
  if (typeof stored.welcomeDone !== "boolean") value.welcomeDone = value.mode !== null;
  if (!SETORAN_REVEALS.includes(value.setoranReveal)) value.setoranReveal = DEFAULT_SETTINGS.setoranReveal;
  if (typeof stored.showIsyarat !== "boolean") value.showIsyarat = value.mode === "tunawicara";
  return value;
}

function read(): Settings {
  const raw = getRaw();
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = parseSettings(raw);
  return cachedValue;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function updateSettings(patch: Partial<Settings>) {
  const raw = JSON.stringify({ ...read(), ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    memoryRaw = raw;
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
}
