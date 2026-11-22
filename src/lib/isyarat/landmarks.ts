export type Point3 = { x: number; y: number; z: number };

export type Handedness = "Left" | "Right" | "Unknown";

export const LANDMARK_COUNT = 21;
export const WRIST = 0;
export const MIDDLE_FINGER_MCP = 9;
export const FEATURE_LENGTH = LANDMARK_COUNT * 3;

const round4 = (v: number) => Math.round(v * 1e4) / 1e4 || 0;

export function normalizeLandmarks(points: readonly Point3[], aspect = 1): number[] | null {
  if (points.length !== LANDMARK_COUNT || !(aspect > 0)) return null;
  const scaled = points.map((p) => ({ x: p.x * aspect, y: p.y, z: p.z * aspect }));
  const wrist = scaled[WRIST];
  const ref = scaled[MIDDLE_FINGER_MCP];
  const size = Math.hypot(ref.x - wrist.x, ref.y - wrist.y, ref.z - wrist.z);
  if (!Number.isFinite(size) || size < 1e-6) return null;
  const out = scaled.flatMap((p) => [
    round4((p.x - wrist.x) / size),
    round4((p.y - wrist.y) / size),
    round4((p.z - wrist.z) / size),
  ]);
  return out.every(Number.isFinite) ? out : null;
}

export function mirrorFeatures(features: readonly number[]): number[] {
  return features.map((v, i) => (i % 3 === 0 ? (v === 0 ? 0 : -v) : v));
}
