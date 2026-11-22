import { describe, expect, it } from "vitest";

import fixtures from "./__fixtures__/ayat.json";
import { type ExpectedWord, matchRecitation, summarizeMatch } from "./match";
import { normalizeArabic, normalizeWord } from "./normalize";

type FixtureWord = { position: number; uthmani: string; imlaei: string };
const verses = fixtures.verses as Record<string, FixtureWord[]>;

const words = (key: string) => verses[key];
const expectedOf = (key: string): ExpectedWord[] =>
  words(key).map((w) => [w.uthmani, w.imlaei]);
const imlaeiText = (key: string) => words(key).map((w) => w.imlaei).join(" ");
const strippedUthmaniText = (key: string) =>
  words(key).map((w) => normalizeArabic(w.uthmani)).join(" ");

const statuses = (key: string, heard: string) =>
  matchRecitation(expectedOf(key), heard).map((r) => r.status);

describe("normalizeArabic", () => {
  it("menyeragamkan variasi alif, ya, ta marbutah, dan hamzah", () => {
    const alif = "ا";
    for (const variant of ["آ", "أ", "إ", "ٱ"]) {
      expect(normalizeArabic(variant)).toBe(alif);
    }
    expect(normalizeArabic("ى")).toBe("ي"); // alif maqsurah -> ya
    expect(normalizeArabic("ة")).toBe("ه"); // ta marbutah -> ha
    expect(normalizeArabic("ؤ")).toBe("و"); // waw berhamzah -> waw
  });

  it("membuang harakat, tanda waqaf, tatweel, angka, dan tanda baca", () => {
    const withWaqf = words("2:2")[3].uthmani;
    expect(normalizeArabic(withWaqf)).toBe(normalizeArabic(words("2:2")[3].imlaei));
    expect(normalizeArabic(`${words("112:1")[0].imlaei}، ۝١ 1 .`)).toBe(
      normalizeArabic(words("112:1")[0].imlaei),
    );
    expect(normalizeWord("ـ")).toBe("");
  });

  it("menghasilkan ejaan yang sama untuk rasm Utsmani dan imla'i pada kata biasa", () => {
    expect(normalizeWord(words("1:2")[2].uthmani)).toBe(normalizeWord(words("1:2")[2].imlaei));
    expect(normalizeWord(words("112:2")[1].uthmani)).toBe(normalizeWord(words("112:2")[1].imlaei));
  });
});

describe("matchRecitation", () => {
  it("bacaan sempurna (ejaan imla'i) -> semua kata benar, di semua ayat uji", () => {
    for (const key of Object.keys(verses)) {
      const result = matchRecitation(expectedOf(key), imlaeiText(key));
      expect(result.every((r) => r.status === "benar"), key).toBe(true);
      expect(result.map((r) => r.index), key).toEqual(words(key).map((_, i) => i));
    }
  });

  it("bacaan sempurna (rasm Utsmani tanpa harakat) -> semua kata benar", () => {
    for (const key of Object.keys(verses)) {
      expect(statuses(key, strippedUthmaniText(key)).every((s) => s === "benar"), key).toBe(true);
    }
  });

  it("bacaan sempurna dengan harakat lengkap -> semua kata benar", () => {
    const uthmani = words("1:7").map((w) => w.uthmani).join(" ");
    expect(statuses("1:7", uthmani).every((s) => s === "benar")).toBe(true);
  });

  it("kata yang terlewat ditandai 'terlewat' di posisinya", () => {
    const w = words("1:7").map((x) => x.imlaei);
    const heard = [...w.slice(0, 2), ...w.slice(3)].join(" ");
    const result = matchRecitation(expectedOf("1:7"), heard);
    const missing = result.filter((r) => r.status === "terlewat");
    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({ index: 2, expected: words("1:7")[2].uthmani, heard: null });
    expect(result.filter((r) => r.status === "benar")).toHaveLength(w.length - 1);
  });

  it("kata yang salah ditandai 'salah' beserta kata yang terdengar", () => {
    const w = words("1:2").map((x) => x.imlaei);
    const wrong = words("114:1")[1].imlaei; // kata dari ayat lain
    const heard = [w[0], wrong, w[2], w[3]].join(" ");
    const result = matchRecitation(expectedOf("1:2"), heard);
    expect(result.map((r) => r.status)).toEqual(["benar", "salah", "benar", "benar"]);
    expect(result[1]).toMatchObject({ index: 1, heard: wrong });
  });

  it("kata pendek harus persis: satu huruf beda tetap 'salah'", () => {
    const w = words("2:2").map((x) => x.imlaei);
    const heard = [...w.slice(0, 2), words("112:1")[1].imlaei, ...w.slice(3)].join(" ");
    expect(statuses("2:2", heard)[2]).toBe("salah");
  });

  it("kata pendek yang kurang satu huruf tetap 'salah' (برب dibaca رب)", () => {
    const target = words("114:1")[2]; // "برب"
    const heardWord = words("1:2")[2].imlaei; // "رب"
    expect(normalizeWord(target.imlaei).slice(1)).toBe(normalizeWord(heardWord));
    const w = words("114:1").map((x) => x.imlaei);
    const heard = [w[0], w[1], heardWord, w[3]].join(" ");
    expect(statuses("114:1", heard)).toEqual(["benar", "benar", "salah", "benar"]);
  });

  it("kata tambahan ditandai 'tambahan' tanpa menggeser kata lain", () => {
    const w = words("112:2").map((x) => x.imlaei);
    const extra = words("114:1")[3].imlaei;
    const result = matchRecitation(expectedOf("112:2"), [w[0], extra, w[1]].join(" "));
    expect(result.map((r) => r.status)).toEqual(["benar", "tambahan", "benar"]);
    expect(result[1]).toMatchObject({ index: null, heard: extra });
  });

  it("satu kata Utsmani yang ditulis dua kata imla'i (يا ايها) tetap benar", () => {
    const first = words("2:21")[0];
    expect(first.imlaei.split(" ")).toHaveLength(2); // pastikan kasus ujinya benar
    const result = matchRecitation(expectedOf("2:21"), imlaeiText("2:21"));
    expect(result[0]).toMatchObject({ status: "benar", index: 0, heard: first.imlaei });
    expect(summarizeMatch(result)).toMatchObject({ benar: 11, total: 11, tambahan: 0 });
  });

  it("satu kata ayat cocok dengan dua kata terdengar bila hanya rasm Utsmani yang tersedia", () => {
    const expected = words("2:21").map((w) => w.uthmani);
    const result = matchRecitation(expected, imlaeiText("2:21"));
    expect(result.every((r) => r.status === "benar")).toBe(true);
  });

  it("dua kata ayat yang terdengar menyatu tetap benar", () => {
    const w = words("112:1").map((x) => x.imlaei);
    const heard = [w[0], w[1] + w[2], w[3]].join(" ");
    const result = matchRecitation(expectedOf("112:1"), heard);
    expect(result.map((r) => [r.status, r.index])).toEqual([
      ["benar", 0],
      ["benar", 1],
      ["benar", 2],
      ["benar", 3],
    ]);
  });

  it("tidak ada suara -> semua kata terlewat", () => {
    const result = matchRecitation(expectedOf("1:5"), "  ");
    expect(result.map((r) => r.status)).toEqual(["terlewat", "terlewat", "terlewat", "terlewat"]);
  });

  it("berhenti di tengah ayat -> sisa kata terlewat", () => {
    const w = words("1:7").map((x) => x.imlaei);
    const result = matchRecitation(expectedOf("1:7"), w.slice(0, 4).join(" "));
    expect(summarizeMatch(result)).toEqual({ total: 9, benar: 4, salah: 0, terlewat: 5, tambahan: 0 });
  });

  it("mengabaikan tanda baca dan nomor ayat dari speech-to-text", () => {
    const heard = `${imlaeiText("112:1")}، ۝١ .`;
    expect(statuses("112:1", heard).every((s) => s === "benar")).toBe(true);
  });
});
