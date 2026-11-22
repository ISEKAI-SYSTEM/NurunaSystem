"use client";

import {
  BookOpenText,
  Eye,
  EyeOff,
  Headphones,
  Mic,
  Pause,
  Play,
  Repeat,
  Settings2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { Fragment, memo, type MouseEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Verse } from "@/lib/quran/types";
import {
  PERINTAH_EVENT,
  type PerintahEventDetail,
} from "@/lib/perintah/commands";
import { updateSettings, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

import { BackToTop } from "./back-to-top";
import { preserveReadingPosition } from "./reader-position";
import { ReaderSettings } from "./reader-settings";
import styles from "./surah-reader.module.css";
import { TafsirPanel } from "./tafsir-panel";
import { WordSigns } from "./word-signs";
import { TajweedLegend, VerseTajweedList, WordText } from "./tajweed";
import { VerseEndMarker } from "./verse-end-marker";

type ActiveRange = { from: number; to: number } | null;

const PLAY_ERROR =
  "Audio gagal diputar. Periksa koneksi internet lalu coba lagi.";

export function SurahReader({
  verses,
  bismillah,
  chapterNavigation,
}: {
  verses: Verse[];
  bismillah?: string;
  chapterNavigation: ReactNode;
}) {
  const settings = useSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsOpener = useRef<HTMLElement | null>(null);
  const openSettings = (event: MouseEvent<HTMLElement>) => {
    settingsOpener.current = event.currentTarget;
    setSettingsOpen(true);
  };

  useEffect(() => {
    const dock = dockRef.current;
    const main = dock?.closest("main");
    if (!dock || !main) return;

    let frame = 0;
    function keepFocusVisible(event: FocusEvent) {
      const target = event.target;
      if (!dock || !(target instanceof HTMLElement) || dock.contains(target)) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== target || !target.matches(":focus-visible")) return;
        const control = target.getBoundingClientRect();
        const bar = dock.getBoundingClientRect();
        const topEdge = document.querySelector<HTMLElement>(
          matchMedia("(max-width: 56rem)").matches ? "[data-surah-index]" : "[data-reader-topbar]",
        );
        if (topEdge && getComputedStyle(topEdge).position === "sticky") {
          const edge = topEdge.getBoundingClientRect();
          if (control.top < edge.bottom + 6 && control.bottom > edge.top) {
            window.scrollBy({ top: control.top - edge.bottom - 6, behavior: "instant" });
            return;
          }
        }
        if (getComputedStyle(dock).position === "sticky" && control.top < bar.bottom && control.bottom + 6 > bar.top) {
          window.scrollBy({ top: control.bottom - bar.top + 6, behavior: "instant" });
        }
      });
    }

    main.addEventListener("focusin", keepFocusVisible);
    return () => {
      cancelAnimationFrame(frame);
      main.removeEventListener("focusin", keepFocusVisible);
    };
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRange, setActiveRange] = useState<ActiveRange>(null);
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string | null>(null);

  const indexRef = useRef<number | null>(null);
  const continuousRef = useRef(settings.continuousPlay);
  useEffect(() => {
    continuousRef.current = settings.continuousPlay;
  }, [settings.continuousPlay]);

  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    audio.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(PLAY_ERROR);
      setIsPlaying(false);
    });
  }, []);

  const playVerse = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      const verse = verses[index];
      if (!audio || !verse) return;

      indexRef.current = index;
      setCurrentIndex(index);
      setActiveRange(null);
      setError(null);
      setAnnouncement(`Ayat ${verse.verseNumber} dari ${verses.length}`);

      if (audio.src !== verse.audioUrl) audio.src = verse.audioUrl;
      audio.currentTime = 0;
      startPlayback(audio);
    },
    [verses, startPlayback],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const index = indexRef.current;
    if (index === null || audio.ended) return playVerse(index ?? 0);
    if (audio.paused) startPlayback(audio);
    else audio.pause();
  }, [playVerse, startPlayback]);

  const playPrevious = useCallback(() => {
    playVerse(Math.max(0, (indexRef.current ?? 0) - 1));
  }, [playVerse]);

  const playNext = useCallback(() => {
    const next = (indexRef.current ?? -1) + 1;
    if (next < verses.length) playVerse(next);
  }, [playVerse, verses.length]);

  const repeatVerse = useCallback(() => {
    if (indexRef.current !== null) playVerse(indexRef.current);
  }, [playVerse]);

  const toggleVerse = useCallback(
    (index: number) => {
      if (indexRef.current === index) togglePlay();
      else playVerse(index);
    },
    [playVerse, togglePlay],
  );

  const handleEnded = () => {
    setIsPlaying(false);
    setActiveRange(null);
    const next = (indexRef.current ?? -1) + 1;
    if (continuousRef.current && next < verses.length) {
      playVerse(next);
    } else if (next >= verses.length) {
      setAnnouncement("Surah selesai dibaca.");
    }
  };

  useEffect(() => {
    if (!isPlaying || currentIndex === null) return;
    const segments = verses[currentIndex].segments;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime * 1000;
        const seg = segments.find((s) => t >= s.startMs && t < s.endMs);
        if (seg) {
          setActiveRange((prev) =>
            prev?.from === seg.fromPosition && prev.to === seg.toPosition
              ? prev
              : { from: seg.fromPosition, to: seg.toPosition },
          );
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, currentIndex, verses]);

  const hafalanMode = settings.hafalanMode;
  const toggleHafalan = useCallback(() => {
    const next = !hafalanMode;
    preserveReadingPosition(() => updateSettings({ hafalanMode: next }));
    setAnnouncement(
      next
        ? "Mode hafalan aktif. Teks Arab disembunyikan."
        : "Mode hafalan nonaktif. Teks Arab ditampilkan.",
    );
  }, [hafalanMode]);

  useEffect(() => {
    const onCommand = (e: Event) => {
      const { action, ayat } = (e as CustomEvent<PerintahEventDetail>).detail;
      const audio = audioRef.current;
      if (ayat !== null && (ayat < 1 || ayat > verses.length)) {
        setAnnouncement(`Ayat ${ayat} tidak ada di surah ini.`);
        return;
      }
      const current = indexRef.current;
      switch (action) {
        case "putar":
          if (ayat) playVerse(ayat - 1);
          else if (current === null || audio?.ended) playVerse(current ?? 0);
          else if (audio?.paused) togglePlay();
          break;
        case "jeda":
          audio?.pause();
          break;
        case "berikutnya":
          playNext();
          break;
        case "sebelumnya":
          playPrevious();
          break;
        case "ulangi":
          if (current === null) playVerse(0);
          else repeatVerse();
          break;
        case "hafalan_nyala":
        case "hafalan_mati":
          updateSettings({ hafalanMode: action === "hafalan_nyala" });
          break;
        case "tanya":
          setAnnouncement("Tanya Nuruna tidak tersedia di halaman baca surah.");
          break;
        case "tafsir": {
          const n = ayat ?? (current !== null ? verses[current].verseNumber : 1);
          const button = document.querySelector<HTMLButtonElement>(`#ayat-${n} button[data-panel="tafsir"]`);
          if (!button) return;
          if (button.getAttribute("aria-expanded") !== "true") button.click();
          button.scrollIntoView({ block: "center" });
          button.focus();
          break;
        }
        case "setoran": {
          const n = ayat ?? (current !== null ? verses[current].verseNumber : 1);
          document.querySelector<HTMLAnchorElement>(`#ayat-${n} a[data-panel="setoran"]`)?.click();
          break;
        }
      }
    };
    window.addEventListener(PERINTAH_EVENT, onCommand);
    return () => window.removeEventListener(PERINTAH_EVENT, onCommand);
  }, [verses, playVerse, togglePlay, playNext, playPrevious, repeatVerse]);

  useEffect(() => {
    if (!settings.keyboardShortcuts) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog']"))
        return;

      switch (e.key.toLowerCase()) {
        case " ":
          if (target?.closest("button, a, summary")) return;
          e.preventDefault();
          togglePlay();
          break;
        case "k":
          togglePlay();
          break;
        case "j":
          playPrevious();
          break;
        case "l":
          playNext();
          break;
        case "r":
          repeatVerse();
          break;
        case "h":
          toggleHafalan();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings.keyboardShortcuts, togglePlay, playPrevious, playNext, repeatVerse, toggleHafalan]);

  const current = currentIndex !== null ? verses[currentIndex] : null;
  const surahNumber = verses[0]?.verseKey.split(":")[0] ?? "1";

  return (
    <>
      <div className={styles.tools}>
        <div className={styles.toolbar}>
          <Button
            variant="outline"
            className={styles.tool}
            aria-pressed={hafalanMode}
            onClick={toggleHafalan}
          >
            {hafalanMode ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
            Mode hafalan
          </Button>
          <Button asChild variant="outline" className={styles.tool}>
            <Link href={`/setoran/${surahNumber}`}>
              <Mic aria-hidden="true" className="size-5" />
              Setoran surah
            </Link>
          </Button>
          <Button
            variant="outline"
            className={cn(styles.tool, styles.settingsTool)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={openSettings}
          >
            <Settings2 aria-hidden="true" className="size-5" />
            Pengaturan tampilan &amp; audio
          </Button>
        </div>
        {hafalanMode && (
          <p className={styles.toolHint}>
            Mode hafalan aktif: teks Arab disembunyikan. Bacalah dari hafalan,
            intip kata bila lupa, lalu cek dengan tombol Setoran.
          </p>
        )}
      </div>

      {settings.showTajweed && !hafalanMode && <TajweedLegend />}

      <ReaderSettings open={settingsOpen} onOpenChange={setSettingsOpen} returnFocus={settingsOpener} />

      {bismillah && (
        <p lang="ar" dir="rtl" className={cn("quran-text", styles.bismillah)}>
          {bismillah}
        </p>
      )}

      <ol role="list" aria-label="Daftar ayat" className={styles.verses} data-reader-verses>
        {verses.map((verse, index) => {
          const isCurrent = index === currentIndex;
          return (
            <VerseItem
              key={verse.verseKey}
              verse={verse}
              index={index}
              isCurrent={isCurrent}
              isPlaying={isCurrent && isPlaying}
              activeRange={isCurrent ? activeRange : null}
              showTranslation={settings.showTranslation}
              showWordByWord={settings.showWordByWord}
              showIsyarat={settings.showIsyarat}
              showTajweed={settings.showTajweed}
              hafalanMode={hafalanMode}
              onToggle={toggleVerse}
            />
          );
        })}
      </ol>

      <div ref={dockRef} className={cn("pemutar-murottal", styles.dock)}>
        {error && (
          <p role="alert" className={styles.playerError}>
            {error}
          </p>
        )}
        <section aria-label="Pemutar murottal" className={styles.player}>
          <p className={styles.playerTrack}>
            <Headphones aria-hidden="true" size={20} />
            <strong>Murottal</strong>
            <span>
              {current
                ? `Ayat ${current.verseNumber} dari ${verses.length}`
                : `${verses.length} ayat`}
            </span>
          </p>
          <div className={styles.dockControls}>
            <Button
              variant="ghost"
              onClick={playPrevious}
              disabled={currentIndex === null || currentIndex === 0}
              aria-label="Ayat sebelumnya"
              title="Ayat sebelumnya"
            >
              <SkipBack aria-hidden="true" className="size-5" />
            </Button>
            <Button variant="ghost" className={styles.playAll} data-playing={isPlaying} onClick={togglePlay}>
              {isPlaying ? (
                <>
                  <Pause aria-hidden="true" className="size-5" /> Jeda
                </>
              ) : (
                <>
                  <Play aria-hidden="true" className="size-5" /> Putar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={playNext}
              disabled={currentIndex === verses.length - 1}
              aria-label="Ayat berikutnya"
              title="Ayat berikutnya"
            >
              <SkipForward aria-hidden="true" className="size-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={repeatVerse}
              disabled={currentIndex === null}
              aria-label="Ulangi ayat"
              title="Ulangi ayat"
            >
              <Repeat aria-hidden="true" className="size-5" />
            </Button>
          </div>
          <span aria-hidden="true" className={styles.dockDivider} />
          {chapterNavigation}
          <span aria-hidden="true" className={styles.dockDivider} />
          <Button
            variant="ghost"
            className={styles.dockSettings}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-label="Pengaturan tampilan & audio"
            title="Pengaturan tampilan & audio"
            onClick={openSettings}
          >
            <Settings2 aria-hidden="true" className="size-5" />
          </Button>
        </section>
        <BackToTop className={styles.backToTop} />
      </div>

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          if (indexRef.current !== null) setError(PLAY_ERROR);
        }}
      />
    </>
  );
}

type VerseItemProps = {
  verse: Verse;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  activeRange: ActiveRange;
  showTranslation: boolean;
  showWordByWord: boolean;
  showIsyarat: boolean;
  showTajweed: boolean;
  hafalanMode: boolean;
  onToggle: (index: number) => void;
};

const VerseItem = memo(function VerseItem({
  verse,
  index,
  isCurrent,
  isPlaying,
  activeRange,
  showTranslation,
  showWordByWord,
  showIsyarat,
  showTajweed,
  hafalanMode,
  onToggle,
}: VerseItemProps) {
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const headingId = `judul-ayat-${verse.verseNumber}`;
  const tafsirId = `tafsir-ayat-${verse.verseNumber}`;
  const surahNumber = verse.verseKey.split(":")[0];
  const isActive = (position: number) =>
    activeRange !== null &&
    position >= activeRange.from &&
    position <= activeRange.to;

  return (
    <li
      id={`ayat-${verse.verseNumber}`}
      aria-current={isCurrent ? "true" : undefined}
      className={styles.verse}
    >
      <article aria-labelledby={headingId} className={styles.verseBody}>
        <div className={styles.verseBar}>
          <div className={styles.verseIdentity}>
            <h2 id={headingId} className={styles.verseNumber}>Ayat {verse.verseNumber}</h2>
            {isCurrent && <span className={styles.currentLabel}>Dipilih</span>}
          </div>
          <Button
            variant="outline"
            className={styles.versePlay}
            data-current={isCurrent || undefined}
            onClick={() => onToggle(index)}
            aria-label={`${isPlaying ? "Jeda" : "Putar"} ayat ${verse.verseNumber}`}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-5" />
            ) : (
              <Play aria-hidden="true" className="size-5" />
            )}
            {isPlaying ? "Jeda" : "Putar"}
          </Button>
        </div>

        {hafalanMode ? (
          <HiddenVerse verse={verse} />
        ) : showWordByWord || showIsyarat ? (
          <div
            lang="ar"
            dir="rtl"
            className={cn("quran-text flex flex-wrap items-start", showIsyarat ? "gap-2" : "gap-x-4 gap-y-3")}
          >
            {verse.words.map((word) => (
              <span
                key={word.position}
                className={cn(
                  "inline-flex flex-col items-center rounded-lg px-1 transition-colors",
                  showIsyarat && "gap-1 border bg-card px-2 pb-2",
                  isActive(word.position) && "bg-highlight",
                )}
              >
                <span>
                  <WordText word={word} tajweed={showTajweed} />
                </span>
                {showIsyarat && <WordSigns text={word.textUthmani} />}
                {showWordByWord && (
                  <span
                    lang="id"
                    dir="ltr"
                    className="font-sans text-sm leading-snug text-muted-foreground"
                  >
                    {word.translation}
                  </span>
                )}
              </span>
            ))}
            <VerseEndMarker number={verse.verseNumber} />
          </div>
        ) : (
          <p lang="ar" dir="rtl" className="quran-text">
            {verse.words.map((word) => (
              <Fragment key={word.position}>
                <span
                  className={cn(
                    "rounded-md transition-colors",
                    isActive(word.position) && "bg-highlight",
                  )}
                >
                  <WordText word={word} tajweed={showTajweed} />
                </span>{" "}
              </Fragment>
            ))}
            <VerseEndMarker number={verse.verseNumber} />
          </p>
        )}

        {showTranslation && (
          <p className={styles.translation}>{verse.translation}</p>
        )}

        {showTajweed && !hafalanMode && <VerseTajweedList words={verse.words} />}

        <div className={styles.verseActions}>
          <Button
            variant="outline"
            className={styles.verseAction}
            data-panel="tafsir"
            aria-expanded={tafsirOpen}
            aria-controls={tafsirOpen ? tafsirId : undefined}
            onClick={() => setTafsirOpen((open) => !open)}
          >
            <BookOpenText aria-hidden="true" className="size-5" />
            {tafsirOpen ? "Tutup tafsir" : "Tafsir"}
            <span className="sr-only"> ayat {verse.verseNumber}</span>
          </Button>
          <Button asChild variant="outline" className={styles.verseAction}>
            <Link href={`/setoran/${surahNumber}?ayat=${verse.verseNumber}`} data-panel="setoran">
              <Mic aria-hidden="true" className="size-5" />
              Setoran
              <span className="sr-only"> ayat {verse.verseNumber}</span>
            </Link>
          </Button>
        </div>
        {tafsirOpen && (
          <TafsirPanel
            id={tafsirId}
            verseKey={verse.verseKey}
            verseNumber={verse.verseNumber}
          />
        )}
      </article>
    </li>
  );
});

function HiddenVerse({ verse }: { verse: Verse }) {
  const [shown, setShown] = useState(0);
  const [message, setMessage] = useState("");
  const total = verse.words.length;
  const allShown = shown >= total;

  const peek = () => {
    if (allShown) {
      setMessage("Semua kata sudah ditampilkan.");
      return;
    }
    const next = shown + 1;
    setShown(next);
    setMessage(`Kata ${next} dari ${total} ditampilkan.`);
  };

  const toggleAll = () => {
    if (allShown) {
      setShown(0);
      setMessage(`Ayat ${verse.verseNumber} disembunyikan lagi.`);
    } else {
      setShown(total);
      setMessage(`Ayat ${verse.verseNumber} ditampilkan.`);
    }
  };

  return (
    <div className={styles.hiddenVerse}>
      {shown === 0 ? (
        <p className="text-base text-muted-foreground">
          Teks ayat disembunyikan. Bacalah dari hafalan.
        </p>
      ) : (
        <p lang="ar" dir="rtl" className="quran-text">
          {verse.words.slice(0, shown).map((word) => (
            <Fragment key={word.position}>
              <span>{word.textUthmani}</span>{" "}
            </Fragment>
          ))}
          {allShown ? (
            <VerseEndMarker number={verse.verseNumber} />
          ) : (
            <span aria-hidden="true" className="text-muted-foreground">
              …
            </span>
          )}
        </p>
      )}
      <div className={styles.verseActions}>
        <Button
          variant="outline"
          className={styles.verseAction}
          aria-disabled={allShown}
          onClick={peek}
        >
          Intip kata berikutnya
          <span className="sr-only"> ayat {verse.verseNumber}</span>
        </Button>
        <Button variant="outline" className={styles.verseAction} onClick={toggleAll}>
          {allShown ? "Sembunyikan lagi" : "Tampilkan ayat"}
          <span className="sr-only"> {verse.verseNumber}</span>
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
