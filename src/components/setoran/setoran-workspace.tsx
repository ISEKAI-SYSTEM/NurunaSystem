"use client";

import { ChevronLeft, Hand, ListChecks, Mic } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { SETORAN_REVEALS, SETORAN_REVEAL_LABELS, updateSettings, useSettings } from "@/lib/settings";
import { defaultRange, rangeFromSearch, type VerseRange } from "@/lib/setoran/range";
import type { SetoranWordInput } from "@/lib/setoran/setoran";
import { cn } from "@/lib/utils";

import type { SetoranPanelVerse } from "./setoran-result";
import { SetoranIsyarat } from "./setoran-isyarat";
import { SetoranPilih } from "./setoran-pilih";
import { SetoranSuara } from "./setoran-suara";

type Method = "suara" | "pilih" | "isyarat";

const MAX_VERSES = 20;
const MAX_SECONDS = 600;

const METHODS: { id: Method; label: string; hint: string; icon: typeof Mic }[] = [
  { id: "suara", label: "Suara", hint: "Baca dari hafalan; kata ditandai langsung.", icon: Mic },
  { id: "pilih", label: "Pilih kata", hint: "Tanpa suara: pilih kata berikutnya (tombol atau angka).", icon: ListChecks },
  { id: "isyarat", label: "Isyarat", hint: "Isyaratkan huruf demi huruf di depan kamera (metode kitabah).", icon: Hand },
];

type WorkspaceProps = {
  surahName: string;
  verses: readonly SetoranPanelVerse[];
  basmalah: readonly SetoranWordInput[];
};

export function SetoranWorkspaceFromUrl(props: WorkspaceProps) {
  const params = useSearchParams();
  const initialRange = rangeFromSearch(params.get("ayat"), params.get("sampai"), props.verses.length, MAX_VERSES);
  return <SetoranWorkspace key={`${initialRange.from}-${initialRange.to}`} {...props} initialRange={initialRange} />;
}

export function SetoranWorkspace({
  surahName,
  verses,
  basmalah,
  initialRange,
}: WorkspaceProps & { initialRange?: VerseRange }) {
  const ids = { from: useId(), to: useId(), method: useId(), reveal: useId() };
  const settings = useSettings();
  const count = verses.length;
  const start = initialRange ?? defaultRange(count);
  const [from, setFrom] = useState(start.from);
  const [to, setTo] = useState(start.to);
  const [chosenMethod, setChosenMethod] = useState<Method | null>(null);
  const method: Method =
    chosenMethod ?? (settings.mode === "tunawicara" ? "pilih" : settings.mode === "tunarungu" ? "isyarat" : "suara");
  const reveal = settings.setoranReveal;

  const selected = useMemo(() => verses.slice(from - 1, to), [verses, from, to]);
  const pool = useMemo(() => verses.flatMap((v) => v.words.map((w) => w.textUthmani)), [verses]);
  const label = from === to ? `ayat ${from}` : `ayat ${from}–${to}`;

  function changeFrom(value: number) {
    setFrom(value);
    if (to < value) setTo(value);
    if (to - value + 1 > MAX_VERSES) setTo(value + MAX_VERSES - 1);
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
      <section aria-labelledby="judul-atur" className="flex flex-col gap-3 rounded-xl border bg-card p-4 [@media(max-height:50rem)]:gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 id="judul-atur" className="text-lg font-semibold">
            Atur setoran
          </h2>
          <Link
            href="/hafalan"
            className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold text-[var(--home-accent)] underline underline-offset-4"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Surah lain
          </Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.from} className="font-medium">
              Dari ayat
            </label>
            <select
              id={ids.from}
              value={from}
              onChange={(e) => changeFrom(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
            >
              {verses.map((v) => (
                <option key={v.verseNumber} value={v.verseNumber}>
                  {v.verseNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.to} className="font-medium">
              Sampai ayat
            </label>
            <select
              id={ids.to}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-base"
            >
              {verses.slice(from - 1, from - 1 + MAX_VERSES).map((v) => (
                <option key={v.verseNumber} value={v.verseNumber}>
                  {v.verseNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
        {count > MAX_VERSES && (
          <p className="text-sm text-muted-foreground">Paling banyak {MAX_VERSES} ayat sekali setor.</p>
        )}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 font-medium">Cara setoran</legend>
            {METHODS.map((m) => (
              <ChoiceRow
                key={m.id}
                name={ids.method}
                id={`${ids.method}-${m.id}`}
                checked={method === m.id}
                onChange={() => setChosenMethod(m.id)}
                label={m.label}
                hint={m.hint}
                icon={<m.icon aria-hidden="true" className="size-5 shrink-0" />}
              />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 font-medium">Teks ayat selama setoran</legend>
            {SETORAN_REVEALS.map((r) => (
              <ChoiceRow
                key={r}
                name={ids.reveal}
                id={`${ids.reveal}-${r}`}
                checked={reveal === r}
                onChange={() => updateSettings({ setoranReveal: r })}
                label={SETORAN_REVEAL_LABELS[r].label}
                hint={SETORAN_REVEAL_LABELS[r].hint}
              />
            ))}
          </fieldset>
        </div>
      </section>

      <section aria-labelledby="judul-setor" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
        <h1 id="judul-setor" className="text-xl font-bold">
          Setoran Surah {surahName}, {label}
        </h1>
        {method === "isyarat" ? (
          <SetoranIsyarat key={`isyarat-${from}-${to}`} verses={selected} label={label} reveal={reveal} />
        ) : method === "suara" ? (
          <SetoranSuara
            key={`suara-${from}-${to}`}
            verses={selected}
            basmalah={basmalah}
            label={label}
            reveal={reveal}
            maxSeconds={MAX_SECONDS}
          />
        ) : (
          <SetoranPilih key={`pilih-${from}-${to}`} verses={selected} pool={pool} label={label} reveal={reveal} />
        )}
      </section>
    </div>
  );
}

function ChoiceRow({
  name,
  id,
  checked,
  onChange,
  label,
  hint,
  icon,
}: {
  name: string;
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border-2 border-input bg-background px-3 py-1.5 [@media(max-height:50rem)]:py-1",
        checked && "border-primary",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        aria-describedby={`${id}-hint`}
        className="mt-0.5 size-6 shrink-0 accent-primary"
      />
      <label htmlFor={id} className="flex flex-1 cursor-pointer flex-col">
        <span className="inline-flex items-center gap-2 font-medium">
          {icon}
          {label}
        </span>
        <span
          id={`${id}-hint`}
          className="text-xs leading-snug text-muted-foreground [@media(max-height:50rem)]:sr-only"
        >
          {hint}
        </span>
      </label>
    </div>
  );
}
