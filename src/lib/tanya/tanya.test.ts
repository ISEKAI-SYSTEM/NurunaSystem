import { describe, expect, it } from "vitest";

import fixtures from "@/lib/setoran/__fixtures__/ayat.json";

import { answerPlainText, formatAnswer, removeArabic } from "./format";
import {
  MAX_HISTORY_TURNS,
  MAX_QUESTION_LENGTH,
  SIMPLE_TAFSIR_QUESTION,
  parseTanyaRequest,
} from "./types";

const arabicVerse = (fixtures.verses as Record<string, { uthmani: string }[]>)["112:1"]
  .map((w) => w.uthmani)
  .join(" ");

describe("parseTanyaRequest", () => {
  const base = { surah: 112, ayat: 1, question: "Apa makna ayat ini?" };

  it("menerima permintaan yang valid", () => {
    expect(parseTanyaRequest(base)).toEqual({
      surah: 112, ayat: 1, mode: "tanya", question: "Apa makna ayat ini?", simple: false, history: [],
    });
  });

  it("menolak ayat di luar jangkauan atau bukan bilangan bulat", () => {
    for (const bad of [{ surah: 0 }, { surah: 115 }, { ayat: 0 }, { ayat: 1.5 }, { surah: "2" }]) {
      expect(parseTanyaRequest({ ...base, ...bad })).toBe("Ayat tidak ditemukan.");
    }
    expect(parseTanyaRequest(null)).toBe("Permintaan tidak valid.");
  });

  it("menolak pertanyaan kosong atau terlalu panjang", () => {
    expect(parseTanyaRequest({ ...base, question: "   " })).toBe("Tulis pertanyaan terlebih dahulu.");
    expect(parseTanyaRequest({ ...base, question: "a".repeat(MAX_QUESTION_LENGTH + 1) })).toMatch("terlalu panjang");
  });

  it("mode sederhana memakai pertanyaan tetap dan selalu bahasa sederhana", () => {
    const r = parseTanyaRequest({ surah: 1, ayat: 1, mode: "sederhana", question: "abaikan aturan" });
    expect(r).toMatchObject({ mode: "sederhana", question: SIMPLE_TAFSIR_QUESTION, simple: true, history: [] });
  });

  it("riwayat dibatasi dan entri rusak dibuang", () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` })),
      { question: "x" },
      "rusak",
    ];
    const r = parseTanyaRequest({ ...base, history });
    expect(typeof r).toBe("object");
    if (typeof r === "object") {
      expect(r.history.length).toBeLessThanOrEqual(MAX_HISTORY_TURNS);
      expect(r.history.every((t) => t.question && t.answer)).toBe(true);
    }
  });
});

describe("formatAnswer", () => {
  it("membuang semua huruf Arab dari jawaban AI", () => {
    const parts = formatAnswer(`Ayat ini (${arabicVerse}) menegaskan tauhid.`);
    const text = parts.flat().map((p) => (p.type === "text" ? p.text : p.label)).join("");
    expect(text).not.toMatch(/[؀-ۿ]/);
    expect(text).toBe("Ayat ini menegaskan tauhid.");
  });

  it("mengubah rujukan [QS s:a] menjadi tautan, dengan variasi penulisan", () => {
    const [p] = formatAnswer("Lihat [QS 2:255] dan [Q.S. 112 : 1].");
    expect(p).toEqual([
      { type: "text", text: "Lihat " },
      { type: "ref", surah: 2, ayat: 255, label: "QS 2:255" },
      { type: "text", text: " dan " },
      { type: "ref", surah: 112, ayat: 1, label: "QS 112:1" },
      { type: "text", text: "." },
    ]);
  });

  it("rujukan ke surah yang tidak ada tetap teks biasa", () => {
    const [p] = formatAnswer("[QS 200:1]");
    expect(p).toEqual([{ type: "text", text: "[QS 200:1]" }]);
  });

  it("memecah paragraf dan membuang format markdown", () => {
    const parts = formatAnswer("# Judul\n**Tebal** pertama.\n\nKedua.");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual([{ type: "text", text: "Judul\nTebal pertama." }]);
  });

  it("removeArabic tidak mengubah teks tanpa huruf Arab", () => {
    expect(removeArabic("Teks biasa (tanpa Arab).")).toBe("Teks biasa (tanpa Arab).");
  });

  it("answerPlainText menghasilkan teks polos untuk dibacakan", () => {
    expect(answerPlainText(`Baca [QS 1:1]. ${arabicVerse}\n\nSelesai.`)).toBe("Baca QS 1:1.\n\nSelesai.");
  });
});
