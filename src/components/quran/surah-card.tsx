import { Check } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, Ref } from "react";

import type { Chapter } from "@/lib/quran/types";

import styles from "./surah-card.module.css";

export function SurahCard({
  chapter,
  selected,
  compact,
  ref,
  onNavigate,
  hrefBase = "/surah",
  detail,
}: {
  chapter: Chapter;
  selected?: boolean;
  compact?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  onNavigate?: ComponentProps<typeof Link>["onNavigate"];
  hrefBase?: string;
  detail?: string;
}) {
  return (
    <Link
      href={`${hrefBase}/${chapter.id}`}
      prefetch={false}
      aria-current={selected ? "page" : undefined}
      className={styles.card}
      data-compact={compact || undefined}
      ref={ref}
      onNavigate={onNavigate}
    >
      <span className={styles.number}><span>{chapter.id}</span></span>
      <span className={styles.names}>
        <strong>
          {chapter.nameSimple}
          {selected && <Check aria-hidden="true" size={15} />}
        </strong>
        <span>{chapter.translatedName}</span>
      </span>
      <span className={styles.details}>
        <span className={`quran-text ${styles.arabic}`} lang="ar" dir="rtl" aria-hidden="true">
          {chapter.nameArabic}
        </span>
        <span>{detail ?? `${chapter.versesCount} ayat`}</span>
      </span>
    </Link>
  );
}
