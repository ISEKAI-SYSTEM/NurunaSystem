import { describe, expect, it } from "vitest";

import { seededRng } from "@/lib/latihan/quiz";

import {
  type Prediction,
  evaluateClassifier,
  hasDepth,
  predictSample,
  toVector,
  trainClassifier,
} from "./classifier";
import type { IsyaratSample } from "./dataset";
import { FEATURE_LENGTH, type Handedness, mirrorFeatures } from "./landmarks";
import { STABILITY_REQUIRED, StabilityTracker } from "./stability";

const rng = seededRng(42);
const noise = (scale: number) => (rng() - 0.5) * 2 * scale;
const LETTERS = ["alif", "ba", "ta", "jim", "dal"];
const BASE: Record<string, number[]> = Object.fromEntries(
  LETTERS.map((l) => [l, Array.from({ length: FEATURE_LENGTH }, (_, i) => (i < 3 ? 0 : noise(1)))]),
);

let nextId = 0;
function sample(letter: string, participant = "P01", handedness: Handedness = "Right", jitter = 0.04): IsyaratSample {
  const frames = Array.from({ length: 8 }, () => {
    const f = BASE[letter].map((v, i) => (i < 3 ? 0 : v + noise(jitter)));
    return handedness === "Left" ? mirrorFeatures(f) : f;
  });
  return { id: `s${nextId++}`, letter, participant, handedness, capturedAt: "", frames };
}
const dataset = (perLetter: number, participants = ["P01"]) =>
  participants.flatMap((p) => LETTERS.flatMap((l) => Array.from({ length: perLetter }, () => sample(l, p))));

describe("toVector", () => {
  it("membuang pergelangan, mencerminkan tangan kiri, dan memberi bobot z", () => {
    const f = BASE.alif;
    const right = toVector(f, "Right");
    expect(right.length).toBe(FEATURE_LENGTH - 3);
    expect(toVector(mirrorFeatures(f), "Left")).toEqual(right);
    expect(right[2]).toBeCloseTo(f[5] * 0.5, 5); // z titik 1
  });
});

describe("trainClassifier", () => {
  const classifier = trainClassifier(dataset(5));

  it("mengenali huruf dari frame baru yang mirip", () => {
    for (const l of LETTERS) {
      const p = classifier.predict(sample(l).frames[0], "Right");
      expect(p.letter).toBe(l);
      expect(p.confidence).toBeGreaterThan(0.8);
    }
  });

  it("mengenali tangan kiri dengan data latih tangan kanan", () => {
    const left = sample("jim", "P02", "Left");
    expect(classifier.predict(left.frames[0], "Left").letter).toBe("jim");
  });

  it("menjawab 'tidak dikenali' untuk bentuk yang jauh dari semua huruf", () => {
    const strange = Array.from({ length: FEATURE_LENGTH }, (_, i) => (i < 3 ? 0 : 5));
    const p = classifier.predict(strange, "Right");
    expect(p.letter).toBeNull();
    expect(p.distance).toBeGreaterThan(classifier.maxDistance);
  });

  it("tanpa data: selalu tidak dikenali", () => {
    expect(trainClassifier([]).predict(BASE.alif, "Right").letter).toBeNull();
  });

  it("predictSample memakai suara terbanyak dari semua frame", () => {
    expect(predictSample(classifier, sample("dal"))).toBe("dal");
  });

  it("data latih tanpa z: kedalaman dari kamera diabaikan", () => {
    const flat = (f: number[]) => f.map((v, i) => (i % 3 === 2 ? 0 : v));
    const samples = dataset(5).map((s) => ({ ...s, frames: s.frames.map(flat) }));
    expect(hasDepth(samples)).toBe(false);
    expect(hasDepth(dataset(1))).toBe(true);
    expect(hasDepth([...samples, ...dataset(1)])).toBe(false);
    const noDepth = trainClassifier(samples);
    const live = sample("ta").frames[0].map((v, i) => (i % 3 === 2 ? v + 3 : v));
    const p = noDepth.predict(live, "Right");
    expect(p.letter).toBe("ta");
    expect(p.distance).toBeCloseTo(noDepth.predict(flat(live), "Right").distance, 5);
  });
});

describe("evaluateClassifier", () => {
  it("per-peserta bila ada 2 peserta atau lebih, dan akurat untuk data bersih", () => {
    const e = evaluateClassifier(dataset(3, ["P01", "P02"]));
    expect(e.method).toBe("per-peserta");
    expect(e.tested).toBe(30);
    expect(e.accuracy).toBe(1);
  });

  it("per-sampel bila hanya satu peserta", () => {
    const e = evaluateClassifier(dataset(5));
    expect(e.method).toBe("per-sampel");
    expect(e.tested).toBe(25);
    expect(e.accuracy).toBeGreaterThan(0.95);
  });

  it("mencatat kebingungan antar huruf bila data tumpang tindih", () => {
    BASE.ta = BASE.ba.map((v) => v + noise(0.01));
    const samples = [...dataset(6)].map((s) => (s.letter === "ta" || s.letter === "ba" ? sample(s.letter, "P01", "Right", 0.3) : s));
    const e = evaluateClassifier(samples);
    const ta = e.letters.find((r) => r.letter === "ta")!;
    expect(ta.total).toBe(6);
    expect(ta.correct).toBeLessThan(6);
    expect(Object.keys(ta.confusions).length).toBeGreaterThan(0);
  });
});

describe("StabilityTracker", () => {
  const pred = (letter: string | null, confidence = 0.9): Prediction => ({ letter, confidence, distance: 0.1, candidates: [] });

  it("stabil setelah cukup frame berturut-turut menebak huruf yang sama", () => {
    const t = new StabilityTracker();
    let s = t.push(pred("alif"));
    for (let i = 1; i < STABILITY_REQUIRED - 1; i++) s = t.push(pred("alif"));
    expect(s.stable).toBeNull();
    expect(s.leading).toBe("alif");
    s = t.push(pred("alif"));
    expect(s.stable).toBe("alif");
    expect(s.progress).toBe(1);
  });

  it("frame tanpa tangan dan tebakan ragu-ragu tidak dihitung", () => {
    const t = new StabilityTracker();
    let s = t.push(null);
    for (let i = 0; i < 20; i++) s = t.push(pred("ba", 0.4));
    expect(s.stable).toBeNull();
    expect(s.leading).toBeNull();
  });

  it("reset mengosongkan riwayat", () => {
    const t = new StabilityTracker();
    for (let i = 0; i < 15; i++) t.push(pred("ta"));
    t.reset();
    expect(t.push(pred("ta")).stable).toBeNull();
  });
});
