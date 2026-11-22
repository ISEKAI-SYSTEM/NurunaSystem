export type VerseRange = { from: number; to: number };

export function defaultRange(count: number): VerseRange {
  return { from: 1, to: Math.min(count, count <= 7 ? count : 5) };
}

function verseNumber(value: string | null, count: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= count ? n : null;
}

export function rangeFromSearch(
  ayat: string | null,
  sampai: string | null,
  count: number,
  maxVerses: number,
): VerseRange {
  const from = verseNumber(ayat, count);
  if (from === null) return defaultRange(count);
  const to = verseNumber(sampai, count);
  if (to === null || to < from) return { from, to: from };
  return { from, to: Math.min(to, from + maxVerses - 1) };
}
