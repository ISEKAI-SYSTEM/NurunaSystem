import { describe, expect, it } from "vitest";

import { mergeSegments, stripRepeatedPrefix } from "./live-recognition";

describe("mergeSegments", () => {
  it("segmen terpisah (Chrome desktop) dibiarkan", () => {
    expect(mergeSegments(["قل هو", "الله احد"])).toEqual(["قل هو", "الله احد"]);
  });

  it("hasil kumulatif (Chrome Android) digabung menjadi satu", () => {
    expect(mergeSegments(["قل", "قل هو", "قل هو الله"])).toEqual(["قل هو الله"]);
  });

  it("hasil yang terulang persis atau lebih pendek dibuang", () => {
    expect(mergeSegments(["قل هو", "قل هو", "قل", "الله"])).toEqual(["قل هو", "الله"]);
  });

  it("awalan kata yang hanya mirip tidak dianggap ulangan", () => {
    expect(mergeSegments(["قل", "قلب"])).toEqual(["قل", "قلب"]);
  });
});

describe("stripRepeatedPrefix", () => {
  it("membuang bagian sementara yang sudah ada di hasil final", () => {
    expect(stripRepeatedPrefix("قل هو الله", "قل هو")).toBe("الله");
    expect(stripRepeatedPrefix("قل هو", "قل هو")).toBe("");
  });

  it("teks sementara baru dibiarkan", () => {
    expect(stripRepeatedPrefix("الله احد", "قل هو")).toBe("الله احد");
    expect(stripRepeatedPrefix("قلب", "قل")).toBe("قلب");
    expect(stripRepeatedPrefix("الله", undefined)).toBe("الله");
  });
});
