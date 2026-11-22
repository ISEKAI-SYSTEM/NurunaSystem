"use client";

import { Hand, Loader2, Trash2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Handedness } from "@/lib/isyarat/landmarks";
import { PERSONAL_PARTICIPANT, addPersonalSample, clearPersonalSamples } from "@/lib/isyarat/personal";

import type { HandFrame } from "./hand-tracker";

export const TEACH_FRAMES = 15;

type Teaching = { letter: string; name: string; count: number };

export function useTeachSign(onDone: (message: string) => void) {
  const [teaching, setTeaching] = useState<Teaching | null>(null);
  const bufferRef = useRef<{ letter: string; name: string; frames: number[][]; handedness: Handedness | null } | null>(
    null,
  );

  const start = useCallback((letter: string, name: string) => {
    bufferRef.current = { letter, name, frames: [], handedness: null };
    setTeaching({ letter, name, count: 0 });
  }, []);

  const cancel = useCallback(() => {
    bufferRef.current = null;
    setTeaching(null);
  }, []);

  const feed = useCallback(
    (frame: HandFrame | null): boolean => {
      const buffer = bufferRef.current;
      if (!buffer) return false;
      if (!frame) return true;
      buffer.handedness ??= frame.handedness;
      if (frame.handedness !== buffer.handedness) return true;
      buffer.frames.push(frame.features);
      setTeaching({ letter: buffer.letter, name: buffer.name, count: buffer.frames.length });
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

export function TeachSignControls({
  letter,
  name,
  teaching,
  onStart,
  onCancel,
}: {
  letter: string;
  name: string;
  teaching: Teaching | null;
  onStart: (letter: string, name: string) => void;
  onCancel: () => void;
}) {
  if (teaching) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="status">
        <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
        <span className="text-sm font-medium">
          {teaching.count === 0
            ? `Tunjukkan isyarat ${teaching.name} ke kamera…`
            : `Merekam isyarat ${teaching.name}… ${Math.round((teaching.count / TEACH_FRAMES) * 100)}%`}
        </span>
        <Button variant="outline" className="h-10 px-3 text-sm" onClick={onCancel}>
          <X aria-hidden="true" className="size-4" />
          Batal
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Button variant="outline" className="h-10 px-3 text-sm" onClick={() => onStart(letter, name)}>
        <Hand aria-hidden="true" className="size-4" />
        Ajari isyarat {name} saya
      </Button>
      <span className="text-xs text-muted-foreground">
        Bila isyarat Anda tidak dikenali.
      </span>
    </div>
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
