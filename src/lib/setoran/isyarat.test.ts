import { describe, expect, it } from "vitest";

import fixtures from "./__fixtures__/ayat.json";
import { emptyRecord, signResult, signSteps, signWordStatus } from "./isyarat";

type FixtureWord = { position: number; uthmani: string; imlaei: string };
const raw = fixtures.verses as Record<string, FixtureWord[]>;
const word = (key: string, position: number) => raw[key][position - 1].uthmani;
const ids = (key: string, position: number) => signSteps(word(key, position)).map((s) => s.id);

describe("signSteps (metode kitabah)", () => {
  it("Allah = alif, lam, lam, ha' (alif kecil adalah harakat, bukan huruf), seperti contoh pedoman", () => {
    expect(ids("1:1", 2)).toEqual(["alif", "lam", "lam", "haa"]);
  });

  it("ar-Rahman: harakat dan alif kecil dibuang, alif wasl tetap alif", () => {
    expect(ids("1:1", 3)).toEqual(["alif", "lam", "ro", "ha", "mim", "nun"]);
  });

  it("hamzah di bawah alif diisyaratkan sebagai hamzah (pedoman hlm. 27)", () => {
    expect(ids("1:5", 1)[0]).toBe("hamzah");
  });

  it("huruf muqatta'at diisyaratkan per huruf", () => {
    expect(ids("2:1", 1)).toEqual(["alif", "lam", "mim"]);
  });

  it("menyimpan huruf tertulis dan nama untuk ditampilkan", () => {
    const [first] = signSteps(word("112:1", 1));
    expect(first).toMatchObject({ id: "qof", name: "Qof" });
    expect(first.char).toHaveLength(1);
  });
});

describe("hasil setoran isyarat", () => {
  const words = raw["112:1"].map((w) => ({ verseNumber: 1, position: w.position, text: w.uthmani }));

  it("status kata selama setoran", () => {
    expect(signWordStatus(undefined)).toBe("belum");
    expect(signWordStatus({ ...emptyRecord(), trail: ["ق"] })).toBe("belum");
    expect(signWordStatus({ ...emptyRecord(), trail: ["ق"], errors: 1 })).toBe("salah");
    expect(signWordStatus({ ...emptyRecord(), trail: ["ق", "ل"], complete: true })).toBe("benar");
    expect(signWordStatus({ ...emptyRecord(), complete: true, skippedLetters: 1 })).toBe("salah");
    expect(signWordStatus({ ...emptyRecord(), skipped: true })).toBe("terlewat");
  });

  it("hasil akhir: benar, salah, terlewat, dan kata yang belum selesai", () => {
    const { words: result, summary } = signResult(words, [
      { ...emptyRecord(), trail: ["ق", "ل"], complete: true },
      { ...emptyRecord(), trail: ["ب", "ه", "و"], errors: 1, complete: true },
      { ...emptyRecord(), trail: ["ا"] },
    ]);
    expect(result.map((w) => w.status)).toEqual(["benar", "salah", "salah", "terlewat"]);
    expect(result[1].heard).toBe("ب ه و");
    expect(summary).toEqual({ total: 4, benar: 1, salah: 2, terlewat: 1, tambahan: 0 });
  });
});
