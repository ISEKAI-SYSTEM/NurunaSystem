import type { Metadata } from "next";

import { IsyaratBelajar } from "@/components/isyarat/isyarat-belajar";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Belajar Isyarat Hijaiyah",
  description:
    "Belajar isyarat huruf hijaiyah dengan kamera (pengenal berjalan di perangkat Anda) atau tanpa kamera dengan mengetuk jawaban.",
};

export default function BelajarIsyaratPage() {
  return (
    <PageHero
      compact
      wide
      title="Belajar Isyarat Hijaiyah"
      intro="Peragakan isyarat huruf hijaiyah di depan kamera, atau berlatih dengan mengetuk jawaban."
    >
      <IsyaratBelajar />
    </PageHero>
  );
}
