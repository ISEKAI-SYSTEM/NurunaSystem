"use client";

import { Search, SearchX, X } from "lucide-react";
import {
  type ReactNode,
  useDeferredValue,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { searchChapters } from "@/lib/quran/chapter-search";
import type { Chapter, Juz } from "@/lib/quran/types";

import { BackToTop } from "./back-to-top";
import { SurahCard } from "./surah-card";
import styles from "./surah-list.module.css";

type SortMode = "surah" | "juz" | "turun";

const SORTS: { value: SortMode; label: string; status: string }[] = [
  { value: "surah", label: "Surah", status: "urut nomor surah" },
  { value: "juz", label: "Juz", status: "dikelompokkan per juz" },
  { value: "turun", label: "Urutan Turun", status: "urut waktu turun" },
];

export function SurahList({
  chapters,
  hrefBase = "/surah",
  juzs,
  fullBleed = false,
  title,
  intro,
}: {
  chapters: Chapter[];
  hrefBase?: string;
  juzs?: Juz[] | null;
  fullBleed?: boolean;
  title?: string;
  intro?: ReactNode;
}) {
  const inputId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("surah");
  const deferredQuery = useDeferredValue(query);

  const results = searchChapters(chapters, deferredQuery);
  const sortOptions = juzs ? SORTS : SORTS.filter((s) => s.value !== "juz");
  const mode = juzs || sort !== "juz" ? sort : "surah";
  const ordered =
    mode === "turun"
      ? [...results].sort((a, b) => a.revelationOrder - b.revelationOrder)
      : results;
  const juzGroups =
    mode === "juz" && juzs ? groupByJuz(juzs, chapters, results) : null;

  const count = deferredQuery.trim()
    ? `${results.length} surah ditemukan`
    : `${chapters.length} surah`;
  const status =
    juzs === undefined
      ? count
      : `${count}, ${SORTS.find((s) => s.value === mode)?.status}`;

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  const list = (
    <section className={styles.results} aria-label="Hasil pencarian surah">
      <div className={styles.toolbar}>
        {juzs !== undefined && (
          <div
            role="group"
            aria-label="Urutkan daftar surah"
            className={styles.sort}
          >
            {sortOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <p role="status" className={styles.resultCount}>
          {status}
        </p>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <SearchX aria-hidden="true" size={26} strokeWidth={1.7} />
          <h2>Tidak ada hasil</h2>
          <p>Coba ejaan lain atau cari dengan nomor surah.</p>
          <Button
            type="button"
            variant="outline"
            className={styles.recoveryButton}
            onClick={clearSearch}
          >
            Hapus pencarian
          </Button>
        </div>
      ) : juzGroups ? (
        juzGroups.map(({ number, entries }) => (
          <section
            key={number}
            aria-labelledby={`${inputId}-juz-${number}`}
            className={styles.juz}
          >
            <h2 id={`${inputId}-juz-${number}`}>Juz {number}</h2>
            <ol className={styles.entries} role="list">
              {entries.map(({ chapter, verses }) => (
                <li key={chapter.id}>
                  <SurahCard
                    chapter={chapter}
                    hrefBase={hrefBase}
                    detail={verseRange(verses)}
                  />
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : (
        <ol className={styles.entries} role="list">
          {ordered.map((c) => (
            <li key={c.id}>
              <SurahCard chapter={c} hrefBase={hrefBase} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <>
      <header className={styles.heading} data-bleed={fullBleed || undefined}>
        {title && <h1 tabIndex={-1}>{title}</h1>}
        {intro && <p className={styles.intro}>{intro}</p>}

        <div
          className={styles.search}
          role="search"
          aria-label="Pencarian surah"
        >
          <label htmlFor={inputId} className="sr-only">
            Cari surah
          </label>
          <Search className={styles.searchIcon} aria-hidden="true" size={20} />
          <input
            ref={searchRef}
            id={inputId}
            aria-describedby={`${inputId}-hint`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            placeholder="Contoh: Yasin, 67"
          />
          {query && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Hapus pencarian"
              onClick={clearSearch}
            >
              <X aria-hidden="true" size={18} />
            </button>
          )}
        </div>
      </header>

      {fullBleed ? <div className={styles.contained}>{list}</div> : list}
      {fullBleed && <BackToTop className={styles.toTop} label="Ke atas" />}
    </>
  );
}

function groupByJuz(juzs: Juz[], chapters: Chapter[], results: Chapter[]) {
  const matched = new Set(results.map((c) => c.id));
  const byId = new Map(chapters.map((c) => [c.id, c]));
  return juzs
    .map((juz) => ({
      number: juz.number,
      entries: juz.chapters.flatMap(({ id, verses }) => {
        const chapter = byId.get(id);
        return chapter && matched.has(id) ? [{ chapter, verses }] : [];
      }),
    }))
    .filter((group) => group.entries.length > 0);
}

function verseRange(verses: string) {
  const [from, to] = verses.split("-");
  return to && to !== from ? `Ayat ${from}–${to}` : `Ayat ${from}`;
}
