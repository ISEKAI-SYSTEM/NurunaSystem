import { describe, expect, it } from "vitest";

import fixtures from "./__fixtures__/ayat.json";
import { type SetoranVerseInput, checkSetoran, muqattaatSpelling } from "./setoran";

type FixtureWord = { position: number; uthmani: string; imlaei: string };
const raw = fixtures.verses as Record<string, FixtureWord[]>;

const verse = (key: string): SetoranVerseInput => ({
  verseKey: key,
  verseNumber: Number(key.split(":")[1]),
  words: raw[key].map((w) => ({ position: w.position, textUthmani: w.uthmani, textImlaei: w.imlaei })),
});
const recite = (key: string) => raw[key].map((w) => w.imlaei).join(" ");
const basmalah = verse("1:1").words;
const ISTIADHA_HEARD = "أعوذ بالله من الشيطان الرجيم";

describe("checkSetoran: bacaan pembuka", () => {
  it("isti'adzah + basmalah sebelum ayat tidak dihitung tambahan", () => {
    const heard = `${ISTIADHA_HEARD} ${recite("1:1")} ${recite("112:1")}`;
    const { words, summary } = checkSetoran([verse("112:1")], heard, basmalah);
    expect(summary).toEqual({ total: 4, benar: 4, salah: 0, terlewat: 0, tambahan: 0 });
    expect(words.map((w) => w.position)).toEqual([1, 2, 3, 4]);
  });

  it("hanya basmalah, atau tanpa pembuka sama sekali, juga benar", () => {
    for (const heard of [`${recite("1:1")} ${recite("112:1")}`, recite("112:1")]) {
      const { summary } = checkSetoran([verse("112:1")], heard, basmalah);
      expect(summary).toMatchObject({ benar: 4, tambahan: 0, terlewat: 0 });
    }
  });

  it("kata lain sebelum ayat tetap tambahan", () => {
    const extra = raw["114:1"][3].imlaei;
    const { words } = checkSetoran([verse("112:1")], `${extra} ${recite("112:1")}`, basmalah);
    expect(words[0]).toMatchObject({ status: "tambahan", heard: extra, verseNumber: null });
  });

  it("setoran Al-Fatihah ayat 1: basmalah dinilai sebagai ayatnya, bukan pembuka", () => {
    const { words, summary } = checkSetoran([verse("1:1")], recite("1:1"), basmalah);
    expect(summary).toMatchObject({ total: 4, benar: 4 });
    expect(words.every((w) => w.verseNumber === 1)).toBe(true);
  });

  it("Al-Fatihah ayat 1 yang tidak dibaca tetap terlewat", () => {
    const { summary } = checkSetoran([verse("1:1"), verse("1:2")], recite("1:2"), basmalah);
    expect(summary).toMatchObject({ terlewat: 4, benar: 4 });
  });
});

describe("checkSetoran: beberapa ayat", () => {
  it("memetakan setiap kata ke nomor ayat dan posisinya", () => {
    const w2 = raw["112:2"].map((w) => w.imlaei);
    const heard = `${recite("112:1")} ${w2[0]}`; // kata ke-2 ayat 2 tidak dibaca
    const { words } = checkSetoran([verse("112:1"), verse("112:2")], heard, basmalah);
    const missing = words.filter((w) => w.status === "terlewat");
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ verseNumber: 2, position: 2 });
  });
});

describe("huruf muqatta'at", () => {
  it("dieja sebagai nama huruf", () => {
    expect(muqattaatSpelling(raw["36:1"][0].uthmani)).toBe("ياسين");
    expect(muqattaatSpelling(raw["2:1"][0].uthmani)).toBe("الفلامميم");
    expect(muqattaatSpelling(raw["42:2"][0].uthmani)).toBe("عينسينقاف");
  });

  it.each([
    ["36:1", "يا سين"],
    ["36:1", "ياسين"],
    ["36:1", recite("36:1")],
    ["2:1", "ألف لام ميم"],
    ["19:1", "كاف ها يا عين صاد"],
    ["42:2", "عين سين قاف"],
  ])("%s dibaca '%s' -> benar", (key, heard) => {
    const { summary, words } = checkSetoran([verse(key)], heard, basmalah);
    expect(summary).toMatchObject({ total: 1, benar: 1, tambahan: 0 });
    expect(words[0].heard).toBe(heard);
  });

  it("nama huruf yang salah tetap salah", () => {
    const { summary } = checkSetoran([verse("2:1")], "ألف لام را", basmalah);
    expect(summary.benar).toBe(0);
  });

  it("hanya berlaku di awal surah muqatta'at, bukan di ayat lain", () => {
    const { summary } = checkSetoran([verse("114:1")], `قاف لام ${recite("114:1").split(" ").slice(1).join(" ")}`, basmalah);
    expect(summary.benar).toBe(3);
  });
});
