import { describe, expect, it } from "vitest";

import type { IsyaratSample } from "./dataset";
import { MAX_PER_LETTER, withPersonalSample } from "./personal";

const sample = (id: string, letter = "ro"): IsyaratSample => ({
  id,
  letter,
  participant: "saya",
  handedness: "Right",
  capturedAt: "",
  frames: [Array(63).fill(0)],
});

describe("withPersonalSample", () => {
  it("menyimpan hanya contoh terbaru per huruf", () => {
    let samples: IsyaratSample[] = [sample("lain", "ba")];
    for (let i = 1; i <= MAX_PER_LETTER + 2; i++) samples = withPersonalSample(samples, sample(`ro${i}`));
    const ro = samples.filter((s) => s.letter === "ro").map((s) => s.id);
    expect(ro).toEqual(["ro3", "ro4", "ro5"]);
    expect(samples.some((s) => s.id === "lain")).toBe(true);
  });
});
