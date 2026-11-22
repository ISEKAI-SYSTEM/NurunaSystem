import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import styles from "@/components/quran/surah-reader.module.css";

export default function SurahNotFound() {
  return (
    <section className={styles.reader}>
      <div className={styles.notice}>
        <h1 className="text-2xl font-bold">Surah tidak ditemukan</h1>
        <p>Nomor surah yang tersedia adalah 1 sampai 114.</p>
        <Link href="/surah" className={styles.back}>
          <ChevronLeft aria-hidden="true" size={20} />
          Kembali ke daftar surah
        </Link>
      </div>
    </section>
  );
}
