import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./quran/surah-list.module.css";

export function PageHero({
  title,
  intro,
  children,
  compact = false,
  wide = false,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  wide?: boolean;
}) {
  return (
    <>
      <header className={cn(styles.heading, compact && styles.compact)} data-bleed>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </header>
      <div className={cn(styles.contained, compact ? "mt-4" : "mt-8")}>
        <div className={cn("flex flex-col gap-6", wide ? "max-w-6xl" : "max-w-4xl")}>{children}</div>
      </div>
    </>
  );
}
