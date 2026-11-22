import { ChevronLeft, ChevronRight, Hand, ListChecks, Mic, Puzzle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHero } from "@/components/page-hero";
import { getChapter, isValidChapterId } from "@/lib/quran/api";

export function generateStaticParams() {
  return [{ nomor: "1" }];
}

function parseNomor(nomor: string): number | null {
  const id = Number(nomor);
  return isValidChapterId(id) && String(id) === nomor ? id : null;
}

export async function generateMetadata({ params }: PageProps<"/hafalan/[nomor]">): Promise<Metadata> {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  const chapter = id ? await getChapter(id) : undefined;
  if (!chapter) return { title: "Surah tidak ditemukan" };
  return { title: `Hafalan Surah ${chapter.nameSimple}` };
}

type Params = PageProps<"/hafalan/[nomor]">["params"];

export default function HafalanSurahPage({ params }: PageProps<"/hafalan/[nomor]">) {
  return (
    <Suspense fallback={<p role="status" className="text-lg">Memuat surah…</p>}>
      <HafalanContent params={params} />
    </Suspense>
  );
}

async function HafalanContent({ params }: { params: Params }) {
  const { nomor } = await params;
  const id = parseNomor(nomor);
  if (!id) notFound();
  const chapter = await getChapter(id);
  if (!chapter) notFound();

  const choices = [
    {
      href: `/setoran/${id}`,
      title: "Setor hafalan",
      body: "Baca dari hafalan dan lihat koreksinya kata demi kata.",
      ways: [
        { icon: Mic, label: "Suara" },
        { icon: ListChecks, label: "Pilih kata berikutnya" },
        { icon: Hand, label: "Isyarat tangan" },
      ],
    },
    {
      href: `/latihan/${id}`,
      title: "Kuis hafalan",
      body: "Tanpa suara: susun kata, lengkapi ayat, dan cocokkan ayat dengan artinya.",
      ways: [{ icon: Puzzle, label: "Tombol atau keyboard" }],
    },
  ];

  return (
    <PageHero
      title={`Hafalan Surah ${chapter.nameSimple}`}
      intro={`${chapter.translatedName} · ${chapter.versesCount} ayat`}
    >
      <Link
        href="/hafalan"
        className="inline-flex min-h-11 w-fit items-center gap-1 rounded-md text-base font-semibold text-[var(--home-accent)] underline underline-offset-4"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
        Pilih surah lain
      </Link>

      <section aria-labelledby="judul-cara">
        <h2 id="judul-cara" className="mb-3 text-xl font-semibold">
          Pilih cara menguji hafalan
        </h2>
        <ul role="list" className="grid gap-4 sm:grid-cols-2">
          {choices.map(({ href, title, body, ways }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-[var(--home-accent)]"
              >
                <span className="flex items-center justify-between gap-2 text-xl font-semibold">
                  {title}
                  <ChevronRight aria-hidden="true" className="size-5 text-[var(--home-accent)]" />
                </span>
                <span className="text-base text-muted-foreground">{body}</span>
                <span className="flex flex-wrap gap-2">
                  {ways.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {label}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageHero>
  );
}
