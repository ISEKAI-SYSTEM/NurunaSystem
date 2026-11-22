import { ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SurahReader } from "@/components/quran/surah-reader";
import styles from "@/components/quran/surah-reader.module.css";
import {
  getChapter,
  getChapters,
  getVerses,
  isValidChapterId,
} from "@/lib/quran/api";

export function generateStaticParams() {
  return [{ nomor: "1" }];
}

function parseNomor(nomor: string): number | null {
  const id = Number(nomor);
  return isValidChapterId(id) && String(id) === nomor ? id : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/surah/[nomor]">): Promise<Metadata> {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  const chapter = id ? await getChapter(id) : undefined;
  if (!chapter) return { title: "Surah tidak ditemukan" };
  return {
    title: `Surah ${chapter.nameSimple}`,
    description: `Baca dan dengarkan Surah ${chapter.nameSimple} (${chapter.translatedName}), ${chapter.versesCount} ayat, dengan terjemahan Kemenag.`,
  };
}

type Params = PageProps<"/surah/[nomor]">["params"];

export default function SurahPage({ params }: PageProps<"/surah/[nomor]">) {
  return (
    <div className={styles.reader}>
      <Link href="/surah" className={styles.back}>
        <ChevronLeft aria-hidden="true" size={20} />
        Kembali ke daftar surah
      </Link>

      <Suspense fallback={<SurahLoading />}>
        <SurahContent params={params} />
      </Suspense>
    </div>
  );
}

function SurahLoading() {
  return (
    <div role="status" className={styles.notice}>
      <p>Memuat surah…</p>
    </div>
  );
}

async function SurahContent({ params }: { params: Params }) {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  if (!id) notFound();

  const [chapters, verses] = await Promise.all([getChapters(), getVerses(id)]);
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) notFound();

  const basmalahVerse = id === 1 ? verses[0] : (await getVerses(1))[0];
  const bismillah = chapter.bismillahPre ? basmalahVerse : null;

  const firstJuz = verses[0]?.juzNumber;
  const lastJuz = verses.at(-1)?.juzNumber;
  const juzRange =
    firstJuz && lastJuz && firstJuz !== lastJuz ? `${firstJuz}–${lastJuz}` : firstJuz;
  const prev = chapters.find((c) => c.id === id - 1);
  const next = chapters.find((c) => c.id === id + 1);

  return (
    <>
      <header className={styles.chapter} data-reader-chapter>
        <div className={styles.chapterInfo}>
          <h1 tabIndex={-1}>Surah {chapter.nameSimple}</h1>
          <p className={styles.meaning}>{chapter.translatedName}</p>
        </div>
        <p lang="ar" dir="rtl" aria-hidden="true" className={`quran-text ${styles.arabicName}`}>
          {chapter.nameArabic}
        </p>
        <dl className={styles.chapterDetails}>
          <div>
            <dt>Nomor surah</dt>
            <dd>{chapter.id}</dd>
          </div>
          <div>
            <dt>Jumlah ayat</dt>
            <dd>{chapter.versesCount}</dd>
          </div>
          <div>
            <dt>Golongan</dt>
            <dd>{chapter.revelationPlace === "makkah" ? "Makkiyah" : "Madaniyah"}</dd>
          </div>
          <div>
            <dt>Juz</dt>
            <dd>{juzRange ?? "Tidak tersedia"}</dd>
          </div>
        </dl>
      </header>

      <SurahReader
        verses={verses}
        bismillah={bismillah?.words.map((w) => w.textUthmani).join(" ")}
        chapterNavigation={
          <nav aria-label="Pindah surah" className={styles.chapterNav}>
            {prev ? (
              <Link
                href={`/surah/${prev.id}`}
                aria-label={`Surah sebelumnya: ${prev.nameSimple}`}
                title={`Surah sebelumnya: ${prev.nameSimple}`}
                rel="prev"
                className={styles.chapterControl}
              >
                <ChevronsLeft aria-hidden="true" size={20} />
              </Link>
            ) : (
              <span aria-hidden="true" className={styles.chapterControl} data-unavailable>
                <ChevronsLeft size={20} />
              </span>
            )}
            {next ? (
              <Link
                href={`/surah/${next.id}`}
                aria-label={`Surah berikutnya: ${next.nameSimple}`}
                title={`Surah berikutnya: ${next.nameSimple}`}
                rel="next"
                className={styles.chapterControl}
              >
                <ChevronsRight aria-hidden="true" size={20} />
              </Link>
            ) : (
              <span aria-hidden="true" className={styles.chapterControl} data-unavailable>
                <ChevronsRight size={20} />
              </span>
            )}
          </nav>
        }
      />
    </>
  );
}
