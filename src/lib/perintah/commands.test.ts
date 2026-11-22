import { describe, expect, it } from "vitest";

import { COMMAND_ACTIONS, type VoiceCommand, commandHref, describeCommand } from "./commands";

const cmd = (c: Partial<VoiceCommand>): VoiceCommand => ({
  action: "tidak_dikenal", surah: null, surahName: null, ayat: null, ...c,
});

describe("describeCommand", () => {
  it("punya kalimat untuk setiap aksi", () => {
    for (const action of COMMAND_ACTIONS) {
      expect(describeCommand(cmd({ action, surah: 36, surahName: "Ya-Sin", ayat: 10 }), "x").length).toBeGreaterThan(5);
    }
  });

  it("menyebut surah dan ayat", () => {
    expect(describeCommand(cmd({ action: "buka_surah", surah: 36, surahName: "Ya-Sin", ayat: 10 }), "")).toBe("Membuka Surah Ya-Sin ayat 10.");
    expect(describeCommand(cmd({ action: "tafsir", ayat: 3 }), "")).toBe("Membuka tafsir ayat 3.");
    expect(describeCommand(cmd({ action: "tanya" }), "")).toBe("Membuka Tanya Nuruna ayat yang sedang dibuka.");
  });

  it("perintah yang tidak dikenali mengutip apa yang terdengar", () => {
    expect(describeCommand(cmd({}), "tolong nyanyi")).toContain('"tolong nyanyi"');
    expect(describeCommand(cmd({}), "  ")).toContain("tidak terdengar jelas");
  });
});

describe("commandHref", () => {
  it("navigasi hanya untuk buka_surah dan latihan", () => {
    expect(commandHref(cmd({ action: "buka_surah", surah: 67, ayat: 5 }))).toBe("/surah/67#ayat-5");
    expect(commandHref(cmd({ action: "buka_surah", surah: 1 }))).toBe("/surah/1");
    expect(commandHref(cmd({ action: "latihan", surah: 112 }))).toBe("/latihan/112");
    expect(commandHref(cmd({ action: "latihan" }))).toBe("/hafalan");
    expect(commandHref(cmd({ action: "buka_surah" }))).toBeNull();
    expect(commandHref(cmd({ action: "putar", ayat: 2 }))).toBeNull();
  });
});
