import type { Metadata } from "next";
import Link from "next/link";

import { StandardShell } from "@/components/standard-shell";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
};

export default function NotFound() {
  return (
    <StandardShell>
      <main
        id="konten-utama"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-10"
      >
        <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="text-lg">
          Halaman yang Anda cari tidak ada. Nomor surah yang tersedia adalah 1
          sampai 114.
        </p>
        <Link
          href="/surah"
          className="inline-flex min-h-11 w-fit items-center text-base underline underline-offset-4"
        >
          Ke Daftar Surah
        </Link>
      </main>
    </StandardShell>
  );
}
