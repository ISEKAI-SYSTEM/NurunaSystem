import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HIJAIYAH_LETTERS } from "./hijaiyah";
import { KEMENAG_LETTER_IDS, kemenagSign, signImageFor } from "./kemenag";

describe("isyarat Kemenag", () => {
  it("setiap huruf punya gambar dan deskripsi, dan berkas gambarnya ada", () => {
    for (const l of HIJAIYAH_LETTERS) {
      const sign = kemenagSign(l.id);
      expect(sign, l.id).not.toBeNull();
      expect(sign!.description.length).toBeGreaterThan(20);
      expect(existsSync(join(process.cwd(), "public", sign!.image)), sign!.image).toBe(true);
    }
    expect(KEMENAG_LETTER_IDS).toHaveLength(HIJAIYAH_LETTERS.length);
  });

  it("null untuk id yang tidak dikenal", () => {
    expect(kemenagSign("bukan-huruf")).toBeNull();
  });

  it("gambar untuk Al-Qur'an Isyarat: alif maqsurah dan ta marbutah punya gambar sendiri", () => {
    expect(signImageFor("ya", "ى")).toBe("/isyarat/kemenag/alif-maqsurah.webp");
    expect(signImageFor("ya", "ي")).toBe("/isyarat/kemenag/ya.webp");
    expect(signImageFor("ta-marbutah", "ة")).toBe("/isyarat/kemenag/ta-marbutah.webp");
    for (const src of [signImageFor("ya", "ى"), signImageFor("ta-marbutah", "ة")]) {
      expect(existsSync(join(process.cwd(), "public", src!))).toBe(true);
    }
    expect(signImageFor("bukan-huruf", "x")).toBeNull();
  });
});
