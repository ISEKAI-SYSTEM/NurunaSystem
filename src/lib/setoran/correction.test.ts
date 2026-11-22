import { describe, expect, it } from "vitest";

import type { WordSegment } from "@/lib/quran/types";

import { type CorrectionVerse, correctionClips, describeClip } from "./correction";
import type { SetoranWord } from "./setoran";

const seg = (pos: number, startMs: number, endMs: number): WordSegment => ({
  fromPosition: pos,
  toPosition: pos,
  startMs,
  endMs,
});
const verse = (verseNumber: number, segments: WordSegment[]): CorrectionVerse => ({
  verseNumber,
  audioUrl: `https://audio.test/${verseNumber}.mp3`,
  segments,
});
const word = (
  verseNumber: number,
  position: number,
  status: "benar" | "salah" | "terlewat",
): SetoranWord =>
  status === "terlewat"
    ? { status, index: position - 1, expected: "x", heard: null, verseNumber, position }
    : { status, index: position - 1, expected: "x", heard: "y", verseNumber, position };

const v1 = verse(1, [seg(1, 30, 740), seg(2, 750, 1700), seg(3, 1710, 2620), seg(4, 2630, 3590)]);

describe("correctionClips", () => {
  it("tidak ada potongan bila semua kata benar", () => {
    expect(correctionClips([v1], [1, 2, 3, 4].map((p) => word(1, p, "benar")))).toEqual([]);
  });

  it("satu potongan per kata salah, dengan jeda kecil", () => {
    const clips = correctionClips([v1], [word(1, 1, "benar"), word(1, 3, "salah")]);
    expect(clips).toEqual([
      expect.objectContaining({ startMs: 1560, endMs: 2770, fromPosition: 3, toPosition: 3 }),
    ]);
  });

  it("kata salah/terlewat yang berurutan digabung jadi satu potongan", () => {
    const clips = correctionClips([v1], [word(1, 2, "salah"), word(1, 3, "terlewat")]);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ startMs: 600, endMs: 2770, fromPosition: 2, toPosition: 3 });
  });

  it("kata yang berjauhan menjadi potongan terpisah, berurutan", () => {
    const clips = correctionClips([v1], [word(1, 4, "salah"), word(1, 1, "terlewat")]);
    expect(clips.map((c) => [c.fromPosition, c.toPosition])).toEqual([
      [1, 1],
      [4, 4],
    ]);
    expect(clips[0].startMs).toBe(0); // tidak negatif
  });

  it("memisahkan potongan per ayat", () => {
    const v2 = verse(2, [seg(1, 0, 500), seg(2, 510, 900)]);
    const clips = correctionClips([v1, v2], [word(1, 4, "salah"), word(2, 1, "salah")]);
    expect(clips.map((c) => [c.verseNumber, c.audioUrl])).toEqual([
      [1, "https://audio.test/1.mp3"],
      [2, "https://audio.test/2.mp3"],
    ]);
  });

  it("tanpa data waktu per kata, memutar ayat lengkap", () => {
    const clips = correctionClips([verse(1, [])], [word(1, 2, "salah")]);
    expect(clips).toEqual([expect.objectContaining({ startMs: 0, endMs: null })]);
  });

  it("melewati ayat tanpa audio dan mengabaikan kata tambahan", () => {
    const noAudio = { ...v1, audioUrl: "" };
    const extra: SetoranWord = {
      status: "tambahan", index: null, expected: null, heard: "z", verseNumber: null, position: null,
    };
    expect(correctionClips([noAudio], [word(1, 2, "salah"), extra])).toEqual([]);
  });

  it("describeClip menyebut ayat hanya bila setoran lebih dari satu ayat", () => {
    const [clip] = correctionClips([v1], [word(1, 2, "salah"), word(1, 3, "salah")]);
    expect(describeClip(clip, false)).toBe("kata 2 sampai 3");
    expect(describeClip(clip, true)).toBe("ayat 1, kata 2 sampai 3");
  });
});
