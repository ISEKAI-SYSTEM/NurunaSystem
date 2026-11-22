import type { Metadata } from "next";
import Link from "next/link";

import { SurahList } from "@/components/quran/surah-list";
import { getChapters } from "@/lib/quran/api";

export const metadata: Metadata = {
  title: "Hafalan",
  description:
    "Setor hafalan Al-Qur'an dengan suara, memilih kata, atau isyarat tangan, dan uji hafalan lewat kuis tanpa suara.",
};

export default async function HafalanPage() {
  const chapters = await getChapters();

  return (
    <SurahList
      chapters={chapters}
      hrefBase="/hafalan"
      fullBleed
      title="Hafalan"
      intro={
        <>
          Setor dengan suara, memilih kata berikutnya, atau isyarat tangan; atau
          kerjakan kuis tanpa suara. Tidak ada batas waktu. Belum hafal isyarat
          huruf? <Link href="/belajar/isyarat">Belajar isyarat hijaiyah</Link>.
        </>
      }
    />
  );
}
