import type { Prediction } from "./classifier";

export const STABILITY_WINDOW = 15;
export const STABILITY_REQUIRED = 11;
export const MIN_CONFIDENCE = 0.6;

export type StabilityState = {
  stable: string | null;
  leading: string | null;
  progress: number;
};

export class StabilityTracker {
  private recent: (string | null)[] = [];

  reset() {
    this.recent = [];
  }

  push(prediction: Prediction | null): StabilityState {
    const letter =
      prediction && prediction.letter && prediction.confidence >= MIN_CONFIDENCE ? prediction.letter : null;
    this.recent.push(letter);
    if (this.recent.length > STABILITY_WINDOW) this.recent.shift();

    const counts = new Map<string, number>();
    for (const l of this.recent) if (l) counts.set(l, (counts.get(l) ?? 0) + 1);
    const [leading, count] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return {
      stable: count >= STABILITY_REQUIRED ? leading : null,
      leading,
      progress: Math.min(1, count / STABILITY_REQUIRED),
    };
  }
}
