"use client";

import { flushSync } from "react-dom";

export function preserveReadingPosition(update: () => void) {
  const heading = document.querySelector<HTMLElement>("[data-reader-chapter]");
  const verses = document.querySelector<HTMLOListElement>("ol[data-reader-verses]");
  if (!heading || !verses || window.scrollY === 0) {
    update();
    return;
  }

  const stickyHeader = document.querySelector(
    matchMedia("(max-width: 56rem)").matches ? "[data-surah-index]" : "[data-reader-topbar]",
  );
  const line = Math.max(0, stickyHeader?.getBoundingClientRect().bottom ?? 0);
  let anchor: Element | undefined;
  for (const verse of verses.children) {
    const bounds = verse.getBoundingClientRect();
    if (bounds.bottom <= line) continue;
    if (bounds.top <= line) anchor = verse;
    break;
  }
  if (!anchor) {
    update();
    return;
  }

  const before = anchor.getBoundingClientRect();
  const progress = before.height ? (line - before.top) / before.height : 0;
  flushSync(update);
  const after = anchor.getBoundingClientRect();
  const delta = after.top + after.height * progress - line;
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
}
