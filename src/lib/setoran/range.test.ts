import { describe, expect, it } from "vitest";

import { defaultRange, rangeFromSearch } from "@/lib/setoran/range";

describe("rangeFromSearch", () => {
  it("?ayat=N membuka satu ayat itu", () => {
    expect(rangeFromSearch("3", null, 7, 20)).toEqual({ from: 3, to: 3 });
  });

  it("?ayat=N&sampai=M membuka rentang", () => {
    expect(rangeFromSearch("5", "8", 286, 20)).toEqual({ from: 5, to: 8 });
  });

  it("rentang dibatasi jumlah ayat maksimal", () => {
    expect(rangeFromSearch("1", "100", 286, 20)).toEqual({ from: 1, to: 20 });
  });

  it("sampai yang lebih kecil atau tidak valid diabaikan", () => {
    expect(rangeFromSearch("5", "2", 7, 20)).toEqual({ from: 5, to: 5 });
    expect(rangeFromSearch("5", "abc", 7, 20)).toEqual({ from: 5, to: 5 });
  });

  it.each([null, "", "0", "8", "-1", "1.5", "abc", "03x"])("ayat %j tidak valid → bawaan", (ayat) => {
    expect(rangeFromSearch(ayat, null, 7, 20)).toEqual(defaultRange(7));
  });
});

describe("defaultRange", () => {
  it("surah pendek disetor utuh, surah panjang 5 ayat pertama", () => {
    expect(defaultRange(7)).toEqual({ from: 1, to: 7 });
    expect(defaultRange(286)).toEqual({ from: 1, to: 5 });
  });
});
