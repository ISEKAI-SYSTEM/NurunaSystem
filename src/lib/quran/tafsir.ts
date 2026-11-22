import { cacheLife } from "next/cache";

const TAFSIR_API = "https://equran.id/api/v2/tafsir";

export const TAFSIR_SOURCE = {
  name: "Tafsir Kemenag RI",
  provider: "equran.id",
  url: "https://equran.id",
} as const;

type ApiTafsirResponse = {
  data?: { tafsir?: { ayat: number; teks: string }[] };
};

async function getChapterTafsir(chapterId: number): Promise<string[]> {
  "use cache";
  cacheLife("max");
  const res = await fetch(`${TAFSIR_API}/${chapterId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`equran.id ${res.status} untuk tafsir surah ${chapterId}`);
  }
  const json = (await res.json()) as ApiTafsirResponse;
  const items = json.data?.tafsir;
  if (!Array.isArray(items)) {
    throw new Error(`Format tafsir surah ${chapterId} tidak dikenali`);
  }
  const result: string[] = [];
  for (const { ayat, teks } of items) {
    if (Number.isInteger(ayat) && ayat >= 1 && typeof teks === "string") {
      result[ayat - 1] = teks.trim();
    }
  }
  return result;
}

export async function getVerseTafsir(
  chapterId: number,
  verseNumber: number,
): Promise<string | null> {
  "use cache";
  cacheLife("max");
  const tafsir = await getChapterTafsir(chapterId);
  return tafsir[verseNumber - 1] || null;
}
