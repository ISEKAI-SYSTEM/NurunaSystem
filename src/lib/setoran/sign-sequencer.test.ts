import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { trainClassifier } from "@/lib/isyarat/classifier";
import { type IsyaratSample, parseDataset } from "@/lib/isyarat/dataset";

import { RELEASE_FRAMES, type SignEvent, SignSequencer } from "./sign-sequencer";

const samples = parseDataset(readFileSync(join(process.cwd(), "public/isyarat/dataset.json"), "utf8"));
const classifier = trainClassifier(samples);
const framesOf = (letter: string, n = 3) =>
  samples
    .filter((s: IsyaratSample) => s.letter === letter)
    .slice(0, n)
    .flatMap((s) => s.frames.map((f) => ({ f, h: s.handedness })));

function run(sequence: ({ f: number[]; h: IsyaratSample["handedness"] } | null)[], expectedLetters: string[]) {
  const seq = new SignSequencer();
  const events: NonNullable<SignEvent>[] = [];
  let k = 0;
  for (const item of sequence) {
    const expected = expectedLetters[k] ?? "selesai";
    const { event } = seq.push(item ? classifier.predict(item.f, item.h) : null, expected);
    if (event) {
      events.push(event);
      if (event.kind === "terima") {
        k++;
        seq.reset();
      }
    }
  }
  return events;
}

const gap = (n = RELEASE_FRAMES + 2) => Array<null>(n).fill(null);

describe("SignSequencer dengan data isyarat asli", () => {
  it("qul: qof lalu lam diterima berurutan", () => {
    const events = run([...framesOf("qof"), ...gap(), ...framesOf("lam")], ["qof", "lam"]);
    expect(events).toEqual([
      { kind: "terima", letter: "qof" },
      { kind: "terima", letter: "lam" },
    ]);
  });

  it("isyarat yang ditahan lama hanya terhitung sekali", () => {
    const events = run(framesOf("lam", 8), ["lam", "lam"]);
    expect(events).toEqual([{ kind: "terima", letter: "lam" }]);
  });

  it("huruf yang sama dua kali (Allah: lam, lam) diterima setelah tangan dilepas", () => {
    const events = run([...framesOf("lam"), ...gap(), ...framesOf("lam")], ["lam", "lam"]);
    expect(events.filter((e) => e.kind === "terima")).toHaveLength(2);
  });

  it("bentuk tangan lain yang hanya sebentar (saat berpindah huruf) tidak dihitung salah", () => {
    const events = run([...framesOf("mim", 2).slice(0, 15), ...framesOf("qof")], ["qof"]);
    expect(events).toEqual([{ kind: "terima", letter: "qof" }]);
  });

  it("isyarat lain yang ditahan lama dilaporkan salah satu kali, lalu huruf benar tetap bisa diterima", () => {
    const events = run([...framesOf("mim", 6), ...gap(), ...framesOf("qof")], ["qof"]);
    expect(events).toEqual([
      { kind: "salah", letter: "mim" },
      { kind: "terima", letter: "qof" },
    ]);
  });
});

describe("ajari isyarat saya (contoh milik pengguna)", () => {
  const rotate = (f: number[], deg: number) => {
    const a = (deg * Math.PI) / 180;
    return f.map((v, i) => {
      if (i % 3 === 2) return v;
      const x = i % 3 === 0 ? v : f[i - 1];
      const y = i % 3 === 0 ? f[i + 1] : v;
      return i % 3 === 0 ? x * Math.cos(a) - y * Math.sin(a) : x * Math.sin(a) + y * Math.cos(a);
    });
  };
  const ro = samples.filter((s) => s.letter === "ro");
  const userFrames = (from: number, to: number) => ro.slice(from, to).flatMap((s) => s.frames.map((f) => rotate(f, 35)));
  const accuracy = (c: ReturnType<typeof trainClassifier>, frames: number[][]) =>
    frames.filter((f) => c.predict(f, ro[0].handedness).letter === "ro").length / frames.length;

  it("isyarat yang tidak dikenali menjadi dikenali setelah satu contoh direkam", () => {
    const live = userFrames(5, 10);
    expect(accuracy(classifier, live)).toBeLessThan(0.5);
    const taught = trainClassifier([
      ...samples,
      {
        id: "saya-ro",
        letter: "ro",
        participant: "saya",
        handedness: ro[0].handedness,
        capturedAt: "",
        frames: userFrames(0, 2).slice(0, 15),
      },
    ]);
    expect(accuracy(taught, live)).toBeGreaterThan(0.8);
    const seq = new SignSequencer();
    const events = live.map((f) => seq.push(taught.predict(f, ro[0].handedness), "ro").event).filter(Boolean);
    expect(events[0]).toEqual({ kind: "terima", letter: "ro" });
  });
});
