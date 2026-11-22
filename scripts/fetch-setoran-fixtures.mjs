import { writeFile } from "node:fs/promises";

const API = "https://api.quran.com/api/v4";
const OUT = new URL("../src/lib/setoran/__fixtures__/ayat.json", import.meta.url);

const VERSE_KEYS = [
  "1:1", "1:2", "1:5", "1:7", "2:1", "2:2", "2:21", "19:1", "36:1", "42:2",
  "112:1", "112:2", "114:1",
];

const verses = {};
for (const key of VERSE_KEYS) {
  const params = new URLSearchParams({
    words: "true",
    word_fields: "text_uthmani,text_imlaei_simple",
  });
  const res = await fetch(`${API}/verses/by_key/${key}?${params}`);
  if (!res.ok) throw new Error(`Quran API ${res.status} untuk ${key}`);
  const { verse } = await res.json();
  verses[key] = verse.words
    .filter((w) => w.char_type_name === "word")
    .map((w) => ({
      position: w.position,
      uthmani: w.text_uthmani,
      imlaei: w.text_imlaei_simple,
    }));
}

await writeFile(
  OUT,
  JSON.stringify({ source: "https://api.quran.com/api/v4", verses }, null, 2) + "\n",
);
console.log(`Tersimpan ${Object.keys(verses).length} ayat ke ${OUT.pathname}`);
