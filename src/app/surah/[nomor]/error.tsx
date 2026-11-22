"use client";

import { SurahLoadError } from "@/components/quran/surah-load-error";
import styles from "@/components/quran/surah-reader.module.css";

export default function ReaderError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className={styles.reader}>
      <SurahLoadError error={error} retry={retry} />
    </div>
  );
}
