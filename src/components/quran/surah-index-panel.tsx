"use client";

import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { searchChapters } from "@/lib/quran/chapter-search";
import type { Chapter } from "@/lib/quran/types";

import { SurahCard } from "./surah-card";
import styles from "./surah-index-panel.module.css";

const COMPACT_VIEW = "(max-width: 56rem)";

function subscribeToViewport(onChange: () => void) {
  const media = window.matchMedia(COMPACT_VIEW);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isCompactView() {
  return window.matchMedia(COMPACT_VIEW).matches;
}

export function SurahIndexPanel({ chapters, current }: { chapters: Chapter[]; current: string }) {
  const id = useId();
  const list = useRef<HTMLOListElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  const disclosure = useRef<HTMLButtonElement>(null);
  const compact = useSyncExternalStore(subscribeToViewport, isCompactView, () => false);
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? !compact;
  const toggleLabel = open ? "Tutup daftar surah" : "Buka daftar surah";
  const [query, setQuery] = useState("");
  const results = searchChapters(chapters, query);

  useEffect(() => {
    const scroller = list.current;
    const link = active.current;
    if (!scroller?.clientHeight || !link) return;
    if (query) return;
    const item = link.getBoundingClientRect();
    const pane = scroller.getBoundingClientRect();
    if (item.top < pane.top || item.bottom > pane.bottom) {
      scroller.scrollTop += item.top - pane.top - scroller.clientHeight / 2 + item.height / 2;
    }
  }, [current, open, query]);

  return (
    <aside
      className={styles.panel}
      data-surah-index={open ? "open" : "closed"}
      onBlur={(event) => {
        if (compact && open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setOpenOverride(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open && !event.defaultPrevented) {
          event.preventDefault();
          disclosure.current?.focus({ preventScroll: true });
          setOpenOverride(false);
        }
      }}
    >
      <div className={styles.panelContent}>
        <div className={styles.panelBar}>
          <h2 id={`${id}-title`} className={styles.title}>Daftar Surah</h2>
          {open && (
            <label className={styles.search}>
              <span className="sr-only">Cari surah berdasarkan nama, arti, atau nomor</span>
              <Search aria-hidden="true" size={16} />
              <input
                type="search"
                placeholder="Cari nama atau nomor"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          )}
          <Button
            ref={disclosure}
            type="button"
            variant="outline"
            className={styles.disclosure}
            aria-label={toggleLabel}
            title={toggleLabel}
            aria-controls={`${id}-index`}
            aria-expanded={open}
            onClick={() => setOpenOverride(!open)}
          >
            {open ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
          </Button>
        </div>
        <nav id={`${id}-index`} aria-labelledby={`${id}-title`} className={styles.index} hidden={!open}>
          <p role="status" className={styles.count}>
            {query.trim() ? `${results.length} surah ditemukan` : `${chapters.length} surah`}
          </p>
          {results.length === 0 && <p className={styles.empty}>Coba nama atau nomor lain.</p>}
          <ol role="list" className={styles.entries} ref={list}>
            {results.map((chapter) => {
              const selected = String(chapter.id) === current;
              return (
                <li key={chapter.id}>
                  <SurahCard
                    chapter={chapter}
                    selected={selected}
                    compact
                    ref={selected ? active : undefined}
                    onNavigate={() => {
                      if (compact && !selected) {
                        disclosure.current?.focus({ preventScroll: true });
                        setOpenOverride(false);
                      }
                    }}
                  />
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </aside>
  );
}
