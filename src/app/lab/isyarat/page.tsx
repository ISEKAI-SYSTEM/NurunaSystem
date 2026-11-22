import type { Metadata } from "next";

import { IsyaratLab } from "@/components/isyarat/isyarat-lab";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Lab Isyarat Hijaiyah",
  description: "Alat internal untuk mengumpulkan data isyarat huruf hijaiyah.",
  robots: { index: false, follow: false },
};

export default function LabIsyaratPage() {
  return (
    <PageHero
      title="Lab Isyarat Hijaiyah"
      intro="Alat internal untuk mengumpulkan contoh isyarat huruf hijaiyah, sebagai bahan melatih pengenal isyarat Nuruna."
    >
      <div className="max-w-prose rounded-xl border bg-card p-4 text-base leading-relaxed">
        <p className="font-semibold">Sebelum merekam peserta</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-6">
          <li>
            Minta persetujuan tertulis peserta, dan orang tua/wali bila peserta
            masih anak-anak.
          </li>
          <li>
            Yang disimpan hanya titik koordinat tangan, bukan gambar atau video,
            dengan kode peserta anonim (mis. P01).
          </li>
          <li>
            Data hanya ada di browser ini sampai Anda menekan{" "}
            <strong>Unduh data</strong>. Unduh secara berkala.
          </li>
          <li>
            Rekam berbagai tangan, cahaya, dan latar. Targetnya 30 sampel per
            huruf.
          </li>
        </ul>
      </div>
      <IsyaratLab />
    </PageHero>
  );
}
