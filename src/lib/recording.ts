"use client";

const MIME_TYPES = [
  ["audio/webm;codecs=opus", "webm"],
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/ogg;codecs=opus", "ogg"],
] as const;

export function pickMimeType(): { mimeType?: string; ext: string } {
  for (const [mimeType, ext] of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType, ext };
  }
  return { ext: "webm" };
}

export function canRecord(): boolean {
  return typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function micErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser, lalu coba lagi.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Mikrofon tidak ditemukan. Pastikan mikrofon terpasang, lalu coba lagi.";
  }
  if (name === "NotReadableError") {
    return "Mikrofon sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.";
  }
  return "Mikrofon tidak bisa dipakai. Coba lagi.";
}

export const NO_RECORDING_SUPPORT =
  "Browser ini belum mendukung perekaman suara di halaman ini. Gunakan Chrome, Edge, Firefox, atau Safari terbaru melalui alamat https.";
