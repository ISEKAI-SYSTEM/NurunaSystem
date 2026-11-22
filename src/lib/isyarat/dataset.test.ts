import { describe, expect, it } from "vitest";

import {
  DATASET_FORMAT,
  type IsyaratSample,
  countByLetter,
  mergeSamples,
  parseDataset,
  readDatasetSource,
  serializeDataset,
} from "./dataset";
import { HIJAIYAH_LETTERS, LETTER_BY_ID } from "./hijaiyah";
import { type Point3, normalizeLandmarks } from "./landmarks";

const hand = (dx = 0, dy = 0, scale = 1): Point3[] =>
  Array.from({ length: 21 }, (_, i) => ({
    x: 0.5 + dx + scale * 0.01 * (i % 5) * (i % 3 === 0 ? 1 : -1),
    y: 0.6 + dy - scale * 0.01 * i,
    z: scale * 0.002 * (i % 4),
  }));

describe("huruf hijaiyah", () => {
  it("30 huruf dengan id unik", () => {
    expect(HIJAIYAH_LETTERS).toHaveLength(30);
    expect(LETTER_BY_ID.size).toBe(30);
  });
});

describe("dataset", () => {
  const sample = (id: string, letter = "alif"): IsyaratSample => ({
    id,
    letter,
    participant: "P01",
    handedness: "Right",
    capturedAt: "2026-11-21T00:00:00.000Z",
    frames: [normalizeLandmarks(hand())!],
  });

  it("serialize lalu parse menghasilkan sampel yang sama", () => {
    const samples = [sample("a"), sample("b", "ba")];
    const text = serializeDataset(samples, new Date("2026-11-21T00:00:00Z"));
    expect(JSON.parse(text).format).toBe(DATASET_FORMAT);
    expect(parseDataset(text)).toEqual(samples);
  });

  it("menolak berkas yang bukan JSON, format lain, atau sampel rusak", () => {
    expect(() => parseDataset("bukan json")).toThrow("bukan JSON");
    expect(() => parseDataset(JSON.stringify({ format: "lain", samples: [] }))).toThrow("bukan data isyarat");
    const broken = { ...sample("x"), frames: [[1, 2, 3]] };
    expect(() =>
      parseDataset(JSON.stringify({ format: DATASET_FORMAT, createdAt: "", samples: [broken] })),
    ).toThrow("Sampel ke-1");
    const unknownLetter = { ...sample("y"), letter: "bukan-huruf" };
    expect(() =>
      parseDataset(JSON.stringify({ format: DATASET_FORMAT, createdAt: "", samples: [unknownLetter] })),
    ).toThrow("Sampel ke-1");
  });

  it("mergeSamples tidak menggandakan sampel yang sama", () => {
    const merged = mergeSamples([sample("a")], [sample("a"), sample("b")]);
    expect(merged.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("countByLetter menghitung per huruf", () => {
    const counts = countByLetter([sample("a"), sample("b"), sample("c", "ba")]);
    expect(counts.get("alif")).toBe(2);
    expect(counts.get("ba")).toBe(1);
  });
});

describe("readDatasetSource", () => {
  const source = { name: "Contoh", authors: "A & B", license: "CC BY 4.0", url: "https://example.org" };
  it("membaca keterangan sumber", () => {
    expect(readDatasetSource(JSON.stringify({ format: DATASET_FORMAT, source, samples: [] }))).toEqual(source);
  });
  it("null bila tidak ada, tidak lengkap, atau bukan JSON", () => {
    expect(readDatasetSource(serializeDataset([]))).toBeNull();
    expect(readDatasetSource(JSON.stringify({ source: { name: "x" } }))).toBeNull();
    expect(readDatasetSource("{")).toBeNull();
  });
});
