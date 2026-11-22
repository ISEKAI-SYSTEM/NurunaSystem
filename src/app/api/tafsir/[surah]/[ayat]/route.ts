import { isValidChapterId } from "@/lib/quran/api";
import { TAFSIR_SOURCE, getVerseTafsir } from "@/lib/quran/tafsir";

export type TafsirResponse = {
  verseKey: string;
  text: string;
  source: typeof TAFSIR_SOURCE;
};

function parsePositiveInt(value: string): number | null {
  return /^[1-9]\d{0,2}$/.test(value) ? Number(value) : null;
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/tafsir/[surah]/[ayat]">,
) {
  const { surah, ayat } = await ctx.params;
  const chapterId = parsePositiveInt(surah);
  const verseNumber = parsePositiveInt(ayat);
  if (!chapterId || !verseNumber || !isValidChapterId(chapterId)) {
    return Response.json({ error: "Ayat tidak ditemukan." }, { status: 404 });
  }

  let text: string | null;
  try {
    text = await getVerseTafsir(chapterId, verseNumber);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Sumber tafsir sedang tidak bisa dihubungi." },
      { status: 502 },
    );
  }
  if (!text) {
    return Response.json({ error: "Ayat tidak ditemukan." }, { status: 404 });
  }

  const body: TafsirResponse = {
    verseKey: `${chapterId}:${verseNumber}`,
    text,
    source: TAFSIR_SOURCE,
  };
  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
