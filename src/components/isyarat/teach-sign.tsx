"use client";

import { Check, Hand, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { kemenagSign } from "@/lib/isyarat/kemenag";
import type { Handedness } from "@/lib/isyarat/landmarks";
import { PERSONAL_PARTICIPANT, addPersonalSample, clearPersonalSamples } from "@/lib/isyarat/personal";
import { cn } from "@/lib/utils";

import type { HandFrame } from "./hand-tracker";

export const TEACH_FRAMES = 15;
export const TEACH_COUNTDOWN = 3;

export type Teaching = {
  letter: string;
  name: string;
  phase: "bersiap" | "merekam";
  seconds: number;
  count: number;
};

type Buffer = { letter: string; name: string; frames: number[][]; handedness: Handedness | null; recording: boolean };

export function useTeachSign(onDone: (message: string) => void) {
  const [teaching, setTeaching] = useState<Teaching | null>(null);
  const bufferRef = useRef<Buffer | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  // Hitung mundur dulu supaya ada waktu membentuk tangan; bentuk peralihan tidak ikut terekam.
  const start = useCallback(
    (letter: string, name: string) => {
      clearTimer();
      const buffer: Buffer = { letter, name, frames: [], handedness: null, recording: false };
      bufferRef.current = buffer;
      let seconds = TEACH_COUNTDOWN;
      setTeaching({ letter, name, phase: "bersiap", seconds, count: 0 });
      timerRef.current = window.setInterval(() => {
        if (bufferRef.current !== buffer) return clearTimer();
        seconds -= 1;
        if (seconds > 0) {
          setTeaching({ letter, name, phase: "bersiap", seconds, count: 0 });
          return;
        }
        clearTimer();
        buffer.recording = true;
        setTeaching({ letter, name, phase: "merekam", seconds: 0, count: 0 });
      }, 1000);
    },
    [clearTimer],
  );

  const cancel = useCallback(() => {
    clearTimer();
    bufferRef.current = null;
    setTeaching(null);
  }, [clearTimer]);

  const feed = useCallback(
    (frame: HandFrame | null): boolean => {
      const buffer = bufferRef.current;
      if (!buffer) return false;
      if (!buffer.recording || !frame) return true;
      buffer.handedness ??= frame.handedness;
      if (frame.handedness !== buffer.handedness) return true;
      buffer.frames.push(frame.features);
      setTeaching({ letter: buffer.letter, name: buffer.name, phase: "merekam", seconds: 0, count: buffer.frames.length });
      if (buffer.frames.length < TEACH_FRAMES) return true;
      const saved = addPersonalSample({
        id: `saya-${buffer.letter}-${Date.now()}`,
        letter: buffer.letter,
        participant: PERSONAL_PARTICIPANT,
        handedness: buffer.handedness,
        capturedAt: new Date().toISOString(),
        frames: buffer.frames,
      });
      bufferRef.current = null;
      setTeaching(null);
      onDone(
        saved
          ? `Contoh isyarat ${buffer.name} Anda tersimpan. Coba isyaratkan lagi.`
          : "Contoh tidak bisa disimpan: penyimpanan browser tidak tersedia.",
      );
      return true;
    },
    [onDone],
  );

  return { teaching, start, cancel, feed };
}

export function TeachSignButton({
  letter,
  name,
  onStart,
}: {
  letter: string;
  name: string;
  onStart: (letter: string, name: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Button variant="outline" className="h-10 px-3 text-sm" onClick={() => onStart(letter, name)}>
        <Hand aria-hidden="true" className="size-4" />
        Ajari isyarat {name} saya
      </Button>
      <span className="text-xs text-muted-foreground">Bila isyarat Anda tidak dikenali.</span>
    </div>
  );
}

type StepState = "selesai" | "aktif" | "nanti";

function stepStates(t: Teaching): StepState[] {
  if (t.phase === "bersiap") return ["aktif", "nanti", "nanti"];
  if (t.count === 0) return ["selesai", "aktif", "nanti"];
  return ["selesai", "selesai", "aktif"];
}

export function TeachSignPanel({ teaching, onCancel }: { teaching: Teaching; onCancel: () => void }) {
  const sign = kemenagSign(teaching.letter);
  const states = stepStates(teaching);
  const percent = Math.round((teaching.count / TEACH_FRAMES) * 100);
  const steps = [
    sign ? "Lihat gambar, lalu bentuk tangan seperti contoh." : `Bentuk tangan untuk isyarat ${teaching.name}.`,
    "Hadapkan tangan ke kamera sampai titik tangan muncul.",
    "Tahan tanpa bergerak sampai rekaman 100%.",
  ];
  const status =
    teaching.phase === "bersiap"
      ? `Bersiap… ${teaching.seconds}`
      : teaching.count === 0
        ? "Menunggu tangan…"
        : `Merekam… ${percent}%`;

  return (
    <section
      aria-labelledby="judul-ajari"
      className="flex flex-col gap-3 rounded-lg border-2 border-primary/40 bg-background p-3 [@media(max-height:50rem)]:gap-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="judul-ajari" className="text-lg font-semibold">
          Ajari isyarat {teaching.name}
        </h3>
        <Button variant="outline" className="h-10 px-3 text-sm" onClick={onCancel}>
          <X aria-hidden="true" className="size-4" />
          Batal
        </Button>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {sign && (
          <Image
            src={sign.image}
            alt={`Gambar isyarat huruf ${teaching.name}`}
            width={144}
            height={144}
            className="size-32 shrink-0 rounded-lg border bg-white [@media(max-height:50rem)]:size-24"
          />
        )}
        <ol className="flex min-w-56 flex-1 flex-col gap-1.5">
          {steps.map((text, i) => (
            <li
              key={i}
              aria-current={states[i] === "aktif" ? "step" : undefined}
              className={cn(
                "flex items-start gap-2 text-sm leading-snug",
                states[i] === "nanti" && "text-muted-foreground",
                states[i] === "aktif" && "font-semibold",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  states[i] === "selesai" && "border-[var(--status-benar)] bg-[var(--status-benar)] text-white",
                  states[i] === "aktif" && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {states[i] === "selesai" ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span>
                {text}
                {states[i] === "selesai" && <span className="sr-only"> (selesai)</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-1">
        <p id="ajari-status" role="status" className="text-sm font-medium">
          {status}
        </p>
        <div
          role="progressbar"
          aria-labelledby="ajari-status"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 w-full max-w-md overflow-hidden rounded-full border border-input bg-background"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {sign && (
        <p className="text-xs leading-relaxed text-muted-foreground [@media(max-height:44rem)]:sr-only">
          <strong className="text-foreground">Cara:</strong> {sign.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Contoh hanya disimpan di perangkat ini dan langsung dipakai pengenal.</p>
    </section>
  );
}

export function PersonalSamplesNote({ letters }: { letters: readonly string[] }) {
  if (letters.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      Contoh isyarat Anda tersimpan untuk {letters.length} huruf di perangkat ini.
      <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => clearPersonalSamples()}>
        <Trash2 aria-hidden="true" className="size-4" />
        Hapus contoh saya
      </Button>
    </p>
  );
}
