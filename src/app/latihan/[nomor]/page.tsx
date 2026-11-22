import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { QuizRunner } from "@/components/latihan/quiz-runner";
import { PageHero } from "@/components/page-hero";
import { getChapter, getVerses, isValidChapterId } from "@/lib/quran/api";
import type { QuizVerse } from "@/lib/latihan/quiz";

export function generateStaticParams() {
  return [{ nomor: "1" }];
}

function parseNomor(nomor: string): number | null {
  const id = Number(nomor);
  return isValidChapterId(id) && String(id) === nomor ? id : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/latihan/[nomor]">): Promise<Metadata> {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  const chapter = id ? await getChapter(id) : undefined;
  if (!chapter) return { title: "Surah tidak ditemukan" };
  return { title: `Latihan Surah ${chapter.nameSimple}` };
}

type Params = PageProps<"/latihan/[nomor]">["params"];

export default function LatihanSurahPage({ params }: PageProps<"/latihan/[nomor]">) {
  return (
    <Suspense fallback={<p role="status" className="text-lg">Memuat soal…</p>}>
      <LatihanContent params={params} />
    </Suspense>
  );
}

async function LatihanContent({ params }: { params: Params }) {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  if (!id) notFound();
  const [chapter, verses] = await Promise.all([getChapter(id), getVerses(id)]);
  if (!chapter) notFound();

  const quizVerses: QuizVerse[] = verses.map((v) => ({
    verseNumber: v.verseNumber,
    words: v.words.map(({ position, textUthmani, textImlaei }) => ({ position, textUthmani, textImlaei })),
    translation: v.translation,
    audioUrl: v.audioUrl,
  }));

  return (
    <PageHero
      title={`Latihan Surah ${chapter.nameSimple}`}
      intro={`${chapter.translatedName} · ${chapter.versesCount} ayat`}
    >
      <Link
        href="/hafalan"
        className="inline-flex min-h-11 w-fit items-center gap-1 rounded-md text-base font-semibold text-[var(--home-accent)] underline underline-offset-4"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        Pilih surah lain
      </Link>
      <QuizRunner surah={id} surahName={chapter.nameSimple} verses={quizVerses} />
    </PageHero>
  );
}
