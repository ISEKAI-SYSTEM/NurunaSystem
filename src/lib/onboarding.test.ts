import { describe, expect, it } from "vitest";

import {
  indexForKey,
  MODE_GUIDES,
  OTHER_MODES,
  otherModesScript,
  pickFromAlternatives,
  pickFromSpeech,
  screenReaderScript,
  visionAnswerFromSpeech,
  visionScript,
  yesNoFromSpeech,
} from "@/lib/onboarding";
import { DEFAULT_SETTINGS, LEARNING_MODE_LABELS, LEARNING_MODES, parseSettings } from "@/lib/settings";

describe("MODE_GUIDES", () => {
  it.each(LEARNING_MODES)("mode %s punya teks pilihan dan ringkasan", (mode) => {
    expect(MODE_GUIDES[mode].choice).not.toBe("");
    expect(MODE_GUIDES[mode].summary).not.toBe("");
  });
});

describe("indexForKey", () => {
  it("memetakan angka ke indeks pilihan", () => {
    expect(indexForKey("1", 2)).toBe(0);
    expect(indexForKey("2", 2)).toBe(1);
    expect(indexForKey("3", 3)).toBe(2);
  });

  it.each(["0", "3", "a", "", " ", "1.5", "10"])("mengabaikan tombol %j bila hanya ada 2 pilihan", (key) => {
    expect(indexForKey(key, 2)).toBeNull();
  });
});

describe("OTHER_MODES", () => {
  it("semua mode kecuali tunanetra, sesuai urutan", () => {
    expect(OTHER_MODES).toEqual(["tunarungu", "tunawicara", "umum"]);
  });
});

describe("naskah suara", () => {
  it("pertanyaan pertama hanya tentang tunanetra, dijawab ya atau tidak", () => {
    const script = visionScript();
    expect(script).toContain("tunanetra");
    expect(script).toContain("Tekan 1 bila ya, atau 2 bila tidak");
    for (const mode of OTHER_MODES) expect(script).not.toContain(LEARNING_MODE_LABELS[mode]);
  });

  it("menyebut perintah suara hanya bila browser mendukungnya", () => {
    expect(visionScript({ voice: true })).toContain("tekan V");
    expect(visionScript({ voice: false })).not.toContain("tekan V");
    expect(screenReaderScript({ voice: true })).toContain("ya atau tidak");
  });

  it("pertanyaan yang dibacakan otomatis memberi tahu cara menghentikan suara", () => {
    expect(visionScript()).toContain("Escape");
    expect(screenReaderScript()).toContain("Escape");
  });

  it("pilihan mode lain menyebut nomor 1–3", () => {
    const script = otherModesScript();
    OTHER_MODES.forEach((mode, i) => {
      expect(script).toContain(`Tekan ${i + 1} untuk mode ${LEARNING_MODE_LABELS[mode]}`);
    });
  });
});

describe("visionAnswerFromSpeech", () => {
  it.each([
    [["ya"], true],
    [["iya"], true],
    [["saya tunanetra"], true],
    [["tuna netra"], true],
    [["low vision"], true],
    [["saya tidak bisa melihat"], true],
    [["sulit melihat"], true],
    [["tidak"], false],
    [["nggak"], false],
    [["bukan"], false],
    [["saya tuli"], false],
    [["satu"], true],
    [["dua"], false],
    [["halo"], null],
  ] as const)("%j → %s", (heard, answer) => {
    expect(visionAnswerFromSpeech(heard)).toBe(answer);
  });
});

describe("pickFromSpeech (mode lain)", () => {
  it.each([
    ["nomor satu", "tunarungu"],
    ["yang kedua", "tunawicara"],
    ["3", "umum"],
    ["saya tuli", "tunarungu"],
    ["Tunarungu", "tunarungu"],
    ["saya tunawicara", "tunawicara"],
    ["yang umum saja", "umum"],
  ] as const)("%j → %s", (heard, mode) => {
    expect(pickFromSpeech(heard, OTHER_MODES)).toBe(mode);
  });

  it.each(["", "halo", "satu atau dua", "nomor empat", "tunanetra"])("tidak menebak untuk %j", (heard) => {
    expect(pickFromSpeech(heard, OTHER_MODES)).toBeNull();
  });

  it("mencoba kemungkinan transkrip berikutnya", () => {
    expect(pickFromAlternatives(["nomor sat", "nomor satu"], OTHER_MODES)).toBe("tunarungu");
    expect(pickFromAlternatives(["halo"], OTHER_MODES)).toBeNull();
  });
});

describe("yesNoFromSpeech", () => {
  it.each([
    [["ya"], true],
    [["iya, saya pakai"], true],
    [["satu"], true],
    [["tidak"], false],
    [["nggak"], false],
    [["tidak pakai"], false],
    [["dua"], false],
    [["halo"], null],
    [["halo", "iya"], true],
  ] as const)("%j → %s", (heard, answer) => {
    expect(yesNoFromSpeech(heard)).toBe(answer);
  });
});

describe("parseSettings", () => {
  it("pengunjung baru melihat sambutan", () => {
    expect(parseSettings(null).welcomeDone).toBe(false);
  });

  it("pengguna lama yang sudah memilih mode tidak melihat sambutan lagi", () => {
    expect(parseSettings(JSON.stringify({ mode: "tunarungu" })).welcomeDone).toBe(true);
  });

  it("menghormati nilai welcomeDone yang tersimpan", () => {
    expect(parseSettings(JSON.stringify({ mode: "umum", welcomeDone: false })).welcomeDone).toBe(false);
    expect(parseSettings(JSON.stringify({ mode: null, welcomeDone: true })).welcomeDone).toBe(true);
  });

  it("kembali ke bawaan bila data rusak", () => {
    expect(parseSettings("{rusak")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("null")).toEqual(DEFAULT_SETTINGS);
  });

  it("membuang mode yang tidak dikenal", () => {
    expect(parseSettings(JSON.stringify({ mode: "lama" })).mode).toBeNull();
  });

  it("isyarat huruf otomatis aktif untuk tunawicara, termasuk pengguna lama", () => {
    expect(parseSettings(JSON.stringify({ mode: "tunawicara" })).showIsyarat).toBe(true);
    expect(parseSettings(JSON.stringify({ mode: "umum" })).showIsyarat).toBe(false);
    expect(parseSettings(null).showIsyarat).toBe(false);
  });

  it("isyarat huruf yang dimatikan/dinyalakan sendiri tetap dihormati", () => {
    expect(parseSettings(JSON.stringify({ mode: "tunawicara", showIsyarat: false })).showIsyarat).toBe(false);
    expect(parseSettings(JSON.stringify({ mode: "umum", showIsyarat: true })).showIsyarat).toBe(true);
  });
});
