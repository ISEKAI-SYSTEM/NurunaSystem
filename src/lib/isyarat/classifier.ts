import type { IsyaratSample } from "./dataset";
import { FEATURE_LENGTH, type Handedness, mirrorFeatures } from "./landmarks";

const Z_WEIGHT = 0.5;
const DEFAULT_K = 5;
const DEFAULT_MAX_DISTANCE = 1.2;

export type Prediction = {
  letter: string | null;
  confidence: number;
  distance: number;
  candidates: { letter: string; score: number }[];
};

export type Classifier = {
  letters: string[];
  size: number;
  maxDistance: number;
  predict(features: readonly number[], handedness: Handedness): Prediction;
};

type Point = { letter: string; sampleId: string; vec: Float32Array };

export function toVector(
  features: readonly number[],
  handedness: Handedness,
  zWeight = Z_WEIGHT,
): Float32Array {
  const f = handedness === "Left" ? mirrorFeatures(features) : features;
  const vec = new Float32Array(FEATURE_LENGTH - 3);
  for (let i = 3; i < FEATURE_LENGTH; i++) {
    vec[i - 3] = (i % 3 === 2 ? zWeight : 1) * (f[i] ?? 0);
  }
  return vec;
}

export function hasDepth(samples: readonly IsyaratSample[]): boolean {
  const sampleHasDepth = (s: IsyaratSample) => s.frames.some((f) => f.some((v, i) => i % 3 === 2 && v !== 0));
  return samples.length > 0 && samples.every(sampleHasDepth);
}

function distance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function toPoints(samples: readonly IsyaratSample[], zWeight: number): Point[] {
  return samples.flatMap((s) =>
    s.frames.map((frame) => ({ letter: s.letter, sampleId: s.id, vec: toVector(frame, s.handedness, zWeight) })),
  );
}

function calibrate(points: Point[], samples: readonly IsyaratSample[], zWeight: number): number {
  const gaps: number[] = [];
  for (const s of samples) {
    const probe = toVector(s.frames[Math.floor(s.frames.length / 2)], s.handedness, zWeight);
    let best = Infinity;
    for (const p of points) {
      if (p.letter === s.letter && p.sampleId !== s.id) best = Math.min(best, distance(probe, p.vec));
    }
    if (Number.isFinite(best)) gaps.push(best);
  }
  if (gaps.length < 5) return DEFAULT_MAX_DISTANCE;
  gaps.sort((a, b) => a - b);
  return Math.max(0.2, gaps[Math.floor(gaps.length * 0.95)] * 1.5);
}

export function trainClassifier(
  samples: readonly IsyaratSample[],
  options: { k?: number; maxDistance?: number } = {},
): Classifier {
  const zWeight = hasDepth(samples) ? Z_WEIGHT : 0;
  const points = toPoints(samples, zWeight);
  const letters = [...new Set(samples.map((s) => s.letter))];
  const k = Math.max(1, options.k ?? DEFAULT_K);
  const maxDistance = options.maxDistance ?? calibrate(points, samples, zWeight);

  return {
    letters,
    size: points.length,
    maxDistance,
    predict(features, handedness) {
      if (points.length === 0) return { letter: null, confidence: 0, distance: Infinity, candidates: [] };
      const v = toVector(features, handedness, zWeight);
      const nearest: { d: number; letter: string }[] = [];
      for (const p of points) {
        const d = distance(v, p.vec);
        if (nearest.length < k || d < nearest[nearest.length - 1].d) {
          nearest.push({ d, letter: p.letter });
          nearest.sort((a, b) => a.d - b.d);
          if (nearest.length > k) nearest.pop();
        }
      }
      const votes = new Map<string, number>();
      let total = 0;
      for (const n of nearest) {
        const w = 1 / (n.d + 1e-3);
        votes.set(n.letter, (votes.get(n.letter) ?? 0) + w);
        total += w;
      }
      const candidates = [...votes]
        .map(([letter, w]) => ({ letter, score: w / total }))
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const nearestDistance = nearest[0].d;
      return {
        letter: nearestDistance <= maxDistance ? best.letter : null,
        confidence: best.score,
        distance: nearestDistance,
        candidates,
      };
    },
  };
}

export function predictSample(classifier: Classifier, sample: IsyaratSample): string | null {
  const counts = new Map<string | null, number>();
  for (const frame of sample.frames) {
    const { letter } = classifier.predict(frame, sample.handedness);
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export type LetterReport = {
  letter: string;
  total: number;
  correct: number;
  confusions: Record<string, number>;
};

export type Evaluation = {
  method: "per-peserta" | "per-sampel";
  tested: number;
  correct: number;
  accuracy: number;
  letters: LetterReport[];
};

export function evaluateClassifier(samples: readonly IsyaratSample[]): Evaluation {
  const participants = [...new Set(samples.map((s) => s.participant))];
  const method: Evaluation["method"] = participants.length >= 2 ? "per-peserta" : "per-sampel";
  const groups: IsyaratSample[][] =
    method === "per-peserta"
      ? participants.map((p) => samples.filter((s) => s.participant === p))
      : Array.from({ length: 5 }, (_, fold) => samples.filter((_, i) => i % 5 === fold));

  const reports = new Map<string, LetterReport>();
  let tested = 0;
  let correct = 0;
  for (const test of groups) {
    if (!test.length) continue;
    const testIds = new Set(test.map((s) => s.id));
    const classifier = trainClassifier(samples.filter((s) => !testIds.has(s.id)));
    for (const s of test) {
      const guess = predictSample(classifier, s);
      const r = reports.get(s.letter) ?? { letter: s.letter, total: 0, correct: 0, confusions: {} };
      r.total++;
      tested++;
      if (guess === s.letter) {
        r.correct++;
        correct++;
      } else {
        const key = guess ?? "tidak-dikenali";
        r.confusions[key] = (r.confusions[key] ?? 0) + 1;
      }
      reports.set(s.letter, r);
    }
  }
  return {
    method,
    tested,
    correct,
    accuracy: tested ? correct / tested : 0,
    letters: [...reports.values()].sort((a, b) => a.correct / a.total - b.correct / b.total),
  };
}
