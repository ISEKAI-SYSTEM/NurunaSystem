"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import styles from "./back-link.module.css";

type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries: () => { url: string | null }[];
};

export function BackLink() {
  return (
    <Button asChild variant="outline" className={styles.backLink}>
      <Link
        href="/"
        onNavigate={(event) => {
          const { navigation } = window as Window & {
            navigation?: NavigationHistory;
          };
          const index = navigation?.currentEntry?.index ?? -1;
          const previousUrl = index > 0 ? navigation?.entries()[index - 1]?.url : null;
          if (!previousUrl) return;

          const previous = new URL(previousUrl);
          if (
            previous.origin === window.location.origin &&
            previous.pathname !== window.location.pathname
          ) {
            event.preventDefault();
            window.history.back();
          }
        }}
      >
        <ArrowLeft aria-hidden="true" />
        Kembali
      </Link>
    </Button>
  );
}
