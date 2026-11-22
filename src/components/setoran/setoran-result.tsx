"use client";

import { Check, Minus, Plus, Square, Volume2, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WordSegment } from "@/lib/quran/types";
import { type CorrectionClip, correctionClips, describeClip } from "@/lib/setoran/correction";
import type { SetoranResult, SetoranVerseInput, SetoranWord } from "@/lib/setoran/setoran";
import { canSpeak, speakIndonesian, stopSpeaking } from "@/lib/speech";

export type SetoranPanelVerse = SetoranVerseInput & {
  audioUrl: string;
  segments: readonly WordSegment[];
};

export function summaryText(result: SetoranResult): string {
  const { total, benar, salah, terlewat, tambahan } = result.summary;
  const parts = [`${benar} dari ${total} kata benar.`];
  if (salah) parts.push(`${salah} kata salah.`);
  if (terlewat) parts.push(`${terlewat} kata terlewat.`);
  if (tambahan) parts.push(`${tambahan} kata tambahan.`);
  if (benar === total && !tambahan) parts.push("Masya Allah, bacaan lengkap!");
  return parts.join(" ");
}

export const STATUS_INFO = {
  benar: { label: "Benar", icon: Check },
  salah: { label: "Salah", icon: X },
  terlewat: { label: "Terlewat", icon: Minus },
  tambahan: { label: "Tambahan", icon: Plus },
} as const;

function WordResult({ word, multiVerse, heardLabel }: { word: SetoranWord; multiVerse: boolean; heardLabel: string }) {
  const { label, icon: Icon } = STATUS_INFO[word.status];
  const where =
    word.position === null
      ? "Kata tambahan"
      : multiVerse
        ? `Ayat ${word.verseNumber}, kata ${word.position}`
        : `Kata ${word.position}`;
  return (
    <li
      data-status={word.status}
      className="setoran-status flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-s-4 bg-background px-3 py-2"
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className="font-semibold">
        {where}: {label}
      </span>
      {word.expected !== null && (
        <span lang="ar" dir="rtl" className="font-quran text-2xl">
          {word.expected}
        </span>
      )}
      {(word.status === "salah" || word.status === "tambahan") && (
        <span className="text-muted-foreground">
          {heardLabel}:{" "}
          <span lang="ar" dir="rtl" className="font-quran text-xl">
            {word.heard}
          </span>
        </span>
      )}
    </li>
  );
}

function VerseStatusView({
  verse,
  words,
  multiVerse,
}: {
  verse: SetoranPanelVerse;
  words: readonly SetoranWord[];
  multiVerse: boolean;
}) {
  const statusOf = new Map(
    words
      .filter((w) => w.verseNumber === verse.verseNumber && w.position !== null)
      .map((w) => [w.position as number, w.status]),
  );
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      {multiVerse && <p className="text-sm font-medium">Ayat {verse.verseNumber}</p>}
      <p lang="ar" dir="rtl" className="quran-text">
        {verse.words.map((w) => (
          <span key={w.position}>
            <span className="setoran-kata rounded-md px-0.5" data-status={statusOf.get(w.position) ?? "terlewat"}>
              {w.textUthmani}
            </span>{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

export function StatusLegend() {
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {(["benar", "salah", "terlewat"] as const).map((status) => {
        const { label, icon: Icon } = STATUS_INFO[status];
        return (
          <li key={status} data-status={status} className="setoran-status inline-flex items-center gap-1.5">
            <Icon className="size-4" />
            <span data-status={status} className="setoran-kata rounded px-1">
              {label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function WordList({
  words,
  showAll,
  onToggle,
  label,
  multiVerse,
  heardLabel,
}: {
  words: readonly SetoranWord[];
  showAll: boolean;
  onToggle: () => void;
  label: string;
  multiVerse: boolean;
  heardLabel: string;
}) {
  const shown = showAll ? words : words.filter((w) => w.status !== "benar");
  return (
    <>
      {shown.length > 0 && (
        <ol
          className="flex flex-col gap-2"
          aria-label={showAll ? `Semua kata, ${label}` : `Kata yang perlu diperbaiki, ${label}`}
        >
          {shown.map((word, i) => (
            <WordResult key={i} word={word} multiVerse={multiVerse} heardLabel={heardLabel} />
          ))}
        </ol>
      )}
      <Button variant="outline" className="h-11 w-fit px-4 text-base" aria-pressed={showAll} onClick={onToggle}>
        {showAll ? "Tampilkan hanya yang perlu diperbaiki" : `Tampilkan semua kata (${words.length})`}
      </Button>
    </>
  );
}

export function SetoranResultView({
  verses,
  result,
  label,
  heard = null,
  heardLabel = "terdengar",
  note,
  onPlayCorrection,
}: {
  verses: readonly SetoranPanelVerse[];
  result: SetoranResult;
  label: string;
  heard?: string | null;
  heardLabel?: string;
  note?: ReactNode;
  onPlayCorrection?: () => void;
}) {
  const [showAllWords, setShowAllWords] = useState(false);
  const [playingClip, setPlayingClip] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const frameRef = useRef(0);
  const multiVerse = verses.length > 1;
  const clips: CorrectionClip[] = correctionClips(verses, result.words);

  const stopCorrection = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.pause();
    setPlayingClip(null);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      audioRef.current?.pause();
    },
    [],
  );

  function playClip(list: CorrectionClip[], i: number) {
    const audio = audioRef.current;
    const clip = list[i];
    if (!audio || !clip) {
      stopCorrection();
      setAnnouncement("Selesai memutar bacaan yang benar.");
      return;
    }
    setPlayingClip(i);
    setAnnouncement(`Bacaan yang benar: ${describeClip(clip, multiVerse)}.`);
    const begin = () => {
      audio.currentTime = clip.startMs / 1000;
      audio.play().catch(() => {
        stopCorrection();
        setAnnouncement("Audio gagal diputar. Periksa koneksi internet lalu coba lagi.");
      });
      const tick = () => {
        if (clip.endMs !== null && audio.currentTime * 1000 >= clip.endMs) {
          audio.pause();
          playClip(list, i + 1);
          return;
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };
    audio.onended = () => {
      cancelAnimationFrame(frameRef.current);
      playClip(list, i + 1);
    };
    if (audio.src !== clip.audioUrl) {
      audio.src = clip.audioUrl;
      audio.addEventListener("loadedmetadata", begin, { once: true });
      audio.load();
    } else {
      begin();
    }
  }

  function toggleCorrection() {
    if (playingClip !== null) {
      stopCorrection();
      setAnnouncement("Pemutaran dihentikan.");
      return;
    }
    stopSpeaking();
    onPlayCorrection?.();
    playClip(clips, 0);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{summaryText(result)}</p>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}

      <div className="flex flex-wrap gap-2">
        {clips.length > 0 && (
          <Button variant="outline" className="h-11 px-4 text-base" onClick={toggleCorrection}>
            {playingClip !== null ? (
              <Square aria-hidden="true" className="size-5" />
            ) : (
              <Volume2 aria-hidden="true" className="size-5" />
            )}
            {playingClip !== null ? "Hentikan" : "Dengarkan yang benar"}
          </Button>
        )}
        {canSpeak() && (
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => speakIndonesian(`Hasil setoran ${label}. ${summaryText(result)}`)}
          >
            <Volume2 aria-hidden="true" className="size-5" />
            Bacakan hasil
          </Button>
        )}
      </div>
      {playingClip !== null && clips[playingClip] && (
        <p className="font-medium">Memutar bacaan qari: {describeClip(clips[playingClip], multiVerse)}</p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
        <StatusLegend />
        <div className="flex max-h-[40dvh] flex-col gap-3 overflow-y-auto">
        {verses.map((v) => (
          <VerseStatusView key={v.verseKey} verse={v} words={result.words} multiVerse={multiVerse} />
        ))}
        </div>
      </div>

      <WordList
        words={result.words}
        showAll={showAllWords}
        onToggle={() => setShowAllWords((v) => !v)}
        label={label}
        multiVerse={multiVerse}
        heardLabel={heardLabel}
      />

      {heard !== null && (
        <details className="rounded-lg border">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 font-medium">
            Teks yang terdengar (hasil pengenal suara, bukan teks ayat)
          </summary>
          <p lang="ar" dir="rtl" className="border-t px-3 py-3 font-quran text-2xl leading-loose">
            {heard || "—"}
          </p>
        </details>
      )}

      <audio ref={audioRef} preload="none" />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
