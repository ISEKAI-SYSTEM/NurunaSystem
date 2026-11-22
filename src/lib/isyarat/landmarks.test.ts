import { describe, expect, it } from "vitest";

import {
  FEATURE_LENGTH,
  type Point3,
  mirrorFeatures,
  normalizeLandmarks,
} from "./landmarks";

const hand = (dx = 0, dy = 0, scale = 1): Point3[] =>
  Array.from({ length: 21 }, (_, i) => ({
    x: 0.5 + dx + scale * 0.01 * (i % 5) * (i % 3 === 0 ? 1 : -1),
    y: 0.6 + dy - scale * 0.01 * i,
    z: scale * 0.002 * (i % 4),
  }));

describe("normalizeLandmarks", () => {
  it("menghasilkan 63 angka dengan pergelangan di titik nol", () => {
    const f = normalizeLandmarks(hand());
    expect(f).toHaveLength(FEATURE_LENGTH);
    expect(f!.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("tidak berubah bila tangan digeser", () => {
    expect(normalizeLandmarks(hand(0.2, -0.1))).toEqual(normalizeLandmarks(hand()));
  });

  it("tidak berubah bila tangan lebih dekat/jauh dari kamera", () => {
    const a = normalizeLandmarks(hand(0, 0, 1))!;
    const b = normalizeLandmarks(hand(0, 0, 2.5))!;
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 3));
  });

  it("jarak pergelangan ke pangkal jari tengah selalu 1", () => {
    const f = normalizeLandmarks(hand(0.1, 0.1, 3), 16 / 9)!;
    const [x, y, z] = f.slice(9 * 3, 9 * 3 + 3);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 3);
  });

  it("memperhitungkan rasio lebar/tinggi video", () => {
    expect(normalizeLandmarks(hand(), 16 / 9)).not.toEqual(normalizeLandmarks(hand(), 1));
  });

  it("menolak data yang tidak lengkap atau tangan berukuran nol", () => {
    expect(normalizeLandmarks(hand().slice(0, 20))).toBeNull();
    const flat = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    expect(normalizeLandmarks(flat)).toBeNull();
    expect(normalizeLandmarks(hand(), 0)).toBeNull();
  });

  it("mirrorFeatures membalik sumbu x saja, dan dua kali kembali seperti semula", () => {
    const f = normalizeLandmarks(hand())!;
    const m = mirrorFeatures(f);
    expect(m[3]).toBe(f[3] === 0 ? 0 : -f[3]);
    expect(m[4]).toBe(f[4]);
    expect(mirrorFeatures(m)).toEqual(f);
  });
});

describe("MediaPipe", () => {
  it("versi WASM dari CDN sama dengan paket yang dipasang dan yang di-pin", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { MEDIAPIPE_VERSION } = await import("./mediapipe");
    const read = (...p: string[]) => JSON.parse(readFileSync(join(process.cwd(), ...p), "utf8"));
    const installed = read("node_modules", "@mediapipe", "tasks-vision", "package.json").version;
    const pinned = read("package.json").dependencies["@mediapipe/tasks-vision"];
    expect(MEDIAPIPE_VERSION).toBe(installed);
    expect(MEDIAPIPE_VERSION).toBe(pinned);
  });
});
