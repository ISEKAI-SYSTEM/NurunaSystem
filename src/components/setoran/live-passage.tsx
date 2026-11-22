"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useRef } from "react";

import { STATUS_INFO } from "@/components/setoran/setoran-result";
import { cn } from "@/lib/utils";
import type { SetoranReveal } from "@/lib/settings";
import type { LiveStatus } from "@/lib/setoran/setoran";

export type PassageVerse = {
  verseNumber: number;
  words: readonly { position: number; textUthmani: string }[];
};

export function LivePassage({
  verses,
  statuses,
  next,
  reveal,
  hints,
  hiddenMessage,
  compact = false,
}: {
  verses: readonly PassageVerse[];
  statuses: readonly LiveStatus[];
  next: number;
  reveal: SetoranReveal;
  hints: ReadonlySet<number>;
  hiddenMessage: string;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const target = box.querySelector<HTMLElement>("[data-next], [data-latest]");
    if (!target) {
      box.scrollTop = box.scrollHeight;
      return;
    }
    const top = target.offsetTop;
    if (top < box.scrollTop || top + target.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 2;
    }
  }, [statuses, next, reveal]);

  const counts = { benar: 0, salah: 0, terlewat: 0 };
  for (const s of statuses) if (s !== "belum") counts[s]++;

  if (reveal === "tersembunyi") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed bg-background text-base",
          compact ? "p-3" : "min-h-24 p-4",
        )}
      >
        <EyeOff aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
        <p>{hiddenMessage}</p>
      </div>
    );
  }

  const multiVerse = verses.length > 1;
  const starts = verses.map((_, v) => verses.slice(0, v).reduce((n, x) => n + x.words.length, 0));
  const blocks = verses.map((verse, v) => {
    const start = starts[v];
    const shown: { key: number; text: string; status: string; isNext: boolean }[] = [];
    let hiddenRest = false;
    for (let i = 0; i < verse.words.length; i++) {
      const k = start + i;
      const status = statuses[k] ?? "belum";
      const visible = reveal === "semua" || status !== "belum" || hints.has(k);
      if (!visible) {
        hiddenRest = true;
        break;
      }
      shown.push({
        key: verse.words[i].position,
        text: verse.words[i].textUthmani,
        status: status === "belum" && hints.has(k) ? "petunjuk" : status,
        isNext: k === next,
      });
    }
    if (reveal === "bertahap" && shown.length === 0 && start > next) return null;
    return (
      <div key={verse.verseNumber} className="flex flex-col gap-1">
        {multiVerse && <p className="text-sm font-medium">Ayat {verse.verseNumber}</p>}
        <p lang="ar" dir="rtl" className="quran-text">
          {shown.map((w) => (
            <span key={w.key}>
              <span
                className="setoran-kata rounded-md px-0.5"
                data-status={w.status === "belum" ? undefined : w.status}
                data-next={w.isNext || undefined}
                data-latest={w.key === shown.at(-1)?.key && hiddenRest ? true : undefined}
              >
                {w.text}
              </span>{" "}
            </span>
          ))}
          {hiddenRest && <span className="text-muted-foreground">…</span>}
        </p>
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <div ref={scrollRef} aria-hidden="true" className={cn(
          "relative flex flex-col gap-3 overflow-y-auto",
          compact
            ? "max-h-[18dvh] min-h-24"
            : "max-h-[32dvh] [@media(max-height:50rem)]:max-h-[24dvh]",
        )}>
        {blocks}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Hitungan sementara">
        {(["benar", "salah", "terlewat"] as const).map((status) => {
          const { label, icon: Icon } = STATUS_INFO[status];
          return (
            <li key={status} data-status={status} className="setoran-status inline-flex items-center gap-1.5">
              <Icon aria-hidden="true" className="size-4" />
              <span data-status={status} className="setoran-kata rounded px-1">
                {label}
              </span>
              <span className="font-semibold">{counts[status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
