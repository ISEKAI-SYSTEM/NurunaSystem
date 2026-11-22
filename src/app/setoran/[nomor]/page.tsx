import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SetoranWorkspace, SetoranWorkspaceFromUrl } from "@/components/setoran/setoran-workspace";
import { getChapter, getVerses, isValidChapterId } from "@/lib/quran/api";

export function generateStaticParams() {
  return [{ nomor: "1" }];
}

function parseNomor(nomor: string): number | null {
  const id = Number(nomor);
  return isValidChapterId(id) && String(id) === nomor ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/setoran/[nomor]">): Promise<Metadata> {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  const chapter = id ? await getChapter(id) : undefined;
  if (!chapter) return { title: "Surah tidak ditemukan" };
  return { title: `Setoran Surah ${chapter.nameSimple}` };
}

type Params = PageProps<"/setoran/[nomor]">["params"];

export default function SetoranSurahPage({ params }: PageProps<"/setoran/[nomor]">) {
  return (
    <Suspense fallback={<p role="status" className="text-lg">Memuat surah…</p>}>
      <SetoranContent params={params} />
    </Suspense>
  );
}

async function SetoranContent({ params }: { params: Params }) {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  if (!id) notFound();
  const [chapter, verses] = await Promise.all([getChapter(id), getVerses(id)]);
  if (!chapter) notFound();

  const basmalahVerse = id === 1 ? verses[0] : (await getVerses(1))[0];
  const basmalah = basmalahVerse.words.map(({ position, textUthmani, textImlaei }) => ({
    position,
    textUthmani,
    textImlaei,
  }));

  const setoranVerses = verses.map((v) => ({
    verseKey: v.verseKey,
    verseNumber: v.verseNumber,
    words: v.words.map(({ position, textUthmani, textImlaei }) => ({ position, textUthmani, textImlaei })),
    audioUrl: v.audioUrl,
    segments: v.segments,
  }));

  return (
    <Suspense
      fallback={<SetoranWorkspace surahName={chapter.nameSimple} verses={setoranVerses} basmalah={basmalah} />}
    >
      <SetoranWorkspaceFromUrl surahName={chapter.nameSimple} verses={setoranVerses} basmalah={basmalah} />
    </Suspense>
  );
}
