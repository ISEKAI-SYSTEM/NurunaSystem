import { describe, expect, it } from "vitest";

import { seededRng } from "@/lib/latihan/quiz";

import fixtures from "./__fixtures__/ayat.json";
import { normalizeWord } from "./normalize";
import { isPickCorrect, passageWords, pickOptions, pickResult } from "./pilih";
import { type SetoranVerseInput, checkSetoranLive } from "./setoran";

type FixtureWord = { position: number; uthmani: string; imlaei: string };
const raw = fixtures.verses as Record<string, FixtureWord[]>;

const verse = (key: string): SetoranVerseInput => ({
  verseKey: key,
  verseNumber: Number(key.split(":")[1]),
  words: raw[key].map((w) => ({ position: w.position, textUthmani: w.uthmani, textImlaei: w.imlaei })),
});
const words = (key: string) => raw[key].map((w) => w.imlaei);
const basmalah = verse("1:1").words;
const ikhlas = [verse("112:1"), verse("112:2")];
const statuses = (heard: string, tentativeTail = false) =>
  checkSetoranLive(ikhlas, heard, basmalah, { tentativeTail });

describe("checkSetoranLive", () => {
  it("belum membaca: semua kata 'belum'", () => {
    const r = statuses("");
    expect(r.words.map((w) => w.status)).toEqual(Array(6).fill("belum"));
    expect(r.next).toBe(0);
  });

  it("baru basmalah: belum ada kata ayat yang dinilai", () => {
    const r = statuses(words("1:1").join(" "));
    expect(r.words.every((w) => w.status === "belum")).toBe(true);
    expect(r.extra).toBe(0);
  });

  it("baru sebagian: kata sesudahnya 'belum', bukan 'terlewat'", () => {
    const r = statuses(words("112:1").slice(0, 2).join(" "));
    expect(r.words.map((w) => w.status)).toEqual(["benar", "benar", "belum", "belum", "belum", "belum"]);
    expect(r.next).toBe(2);
  });

  it("kata berulang dicocokkan ke posisi terdekat, tidak melompat ke ayat berikutnya", () => {
    const r = statuses(words("112:1").slice(0, 3).join(" "));
    expect(r.words.slice(0, 3).map((w) => w.status)).toEqual(["benar", "benar", "benar"]);
    expect(r.words[3]).toMatchObject({ verseNumber: 1, position: 4, status: "belum" });
    expect(r.next).toBe(3);
  });

  it("kata yang dilompati di tengah tetap 'terlewat'", () => {
    const [a, , c] = words("112:1");
    const r = statuses(`${a} ${c}`);
    expect(r.words.slice(0, 4).map((w) => w.status)).toEqual(["benar", "terlewat", "benar", "belum"]);
  });

  it("kata salah di ujung: 'salah', atau 'belum' selama hasil pengenal masih sementara", () => {
    const wrong = words("114:1")[3];
    const [a, b, , d] = words("112:1");
    const heard = `${a} ${b} ${wrong}`;
    expect(statuses(heard).words[2].status).toBe("salah");
    const tentative = statuses(heard, true);
    expect(tentative.words[2].status).toBe("belum");
    expect(tentative.next).toBe(2);
    const resolved = statuses(`${heard} ${d}`, true);
    expect(resolved.words.slice(0, 4).map((w) => w.status)).toEqual(["benar", "benar", "salah", "benar"]);
  });

  it("bacaan lengkap: semua benar dan next = jumlah kata", () => {
    const r = statuses([...words("112:1"), ...words("112:2")].join(" "));
    expect(r.words.every((w) => w.status === "benar")).toBe(true);
    expect(r.next).toBe(6);
  });
});

describe("setoran tanpa suara (pilih kata)", () => {
  const passage = passageWords(ikhlas);
  const pool = ["1:1", "1:2", "114:1", "112:1", "112:2"].flatMap((k) => raw[k].map((w) => w.uthmani));

  it("pilihan berisi kata yang benar dan pengecoh yang ejaannya berbeda", () => {
    const rng = seededRng(7);
    for (const w of passage) {
      const options = pickOptions(w.text, pool, rng);
      expect(options).toHaveLength(4);
      expect(options).toContain(w.text);
      expect(new Set(options.map(normalizeWord)).size).toBe(4);
      expect(options.filter((o) => isPickCorrect(w.text, o))).toHaveLength(1);
    }
  });

  it("kumpulan kata kecil: pilihan lebih sedikit, tetap berisi jawaban", () => {
    const options = pickOptions(passage[0].text, [passage[0].text, passage[1].text], seededRng(1));
    expect(options.sort()).toEqual([passage[0].text, passage[1].text].sort());
  });

  it("jawaban menjadi hasil setoran (benar, salah, terlewat, belum dijawab)", () => {
    const answers = [passage[0].text, passage[3].text, null];
    const { words: result, summary } = pickResult(passage, answers);
    expect(result.map((w) => w.status)).toEqual(["benar", "salah", "terlewat", "terlewat", "terlewat", "terlewat"]);
    expect(result[1]).toMatchObject({ heard: passage[3].text, verseNumber: 1, position: 2 });
    expect(summary).toEqual({ total: 6, benar: 1, salah: 1, terlewat: 4, tambahan: 0 });
  });
});
