import type { Chapter } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function searchChapters(chapters: Chapter[], query: string): Chapter[] {
  const q = normalize(query);
  return q
    ? chapters.filter(
        (c) =>
          String(c.id) === q ||
          normalize(c.nameSimple).includes(q) ||
          normalize(c.translatedName).includes(q),
      )
    : chapters;
}
