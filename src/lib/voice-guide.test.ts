import { describe, expect, it } from "vitest";

import { menuList, pageIntro, pageName, shorten, stripArabic } from "@/lib/voice-guide";

describe("stripArabic", () => {
  it("membuang huruf Arab supaya TTS tidak membacakan Al-Qur'an", () => {
    const arabic = String.fromCodePoint(0x0628, 0x0633, 0x0645);
    expect(stripArabic(`Ayat 1, ${arabic} ${arabic}. Dengan nama Allah`)).toBe("Ayat 1,. Dengan nama Allah");
    expect(stripArabic(arabic)).toBe("");
  });

  it("merapikan spasi", () => {
    expect(stripArabic("  Putar \n  tombol ")).toBe("Putar tombol");
  });
});

describe("shorten", () => {
  it("memotong di batas kata", () => {
    expect(shorten("satu dua tiga empat", 12)).toBe("satu dua…");
    expect(shorten("pendek", 12)).toBe("pendek");
  });
});

describe("pageName", () => {
  it("mengambil bagian sebelum nama situs", () => {
    expect(pageName("Surah Al-Fatihah · Nuruna")).toBe("Surah Al-Fatihah");
    expect(pageName("")).toBe("Nuruna");
  });
});

describe("pageIntro", () => {
  const opts = { shortcuts: true };

  it("halaman baca menyebut nama surah dan pintasan", () => {
    const text = pageIntro("/surah/1", "Surah Al-Fatihah · Nuruna", opts);
    expect(text).toContain("Surah Al-Fatihah");
    expect(text).toContain("Spasi");
  });

  it("tanpa pintasan, memberi petunjuk Tab", () => {
    expect(pageIntro("/surah/1", "Surah Al-Fatihah · Nuruna", { ...opts, shortcuts: false })).toContain("Tab");
  });

  it("beranda langsung menyebutkan menu, tanpa tutorial", () => {
    const text = pageIntro("/", "Nuruna", opts);
    expect(text).toContain(`Menu: ${menuList()}.`);
    expect(text).not.toContain("Langkah");
  });

  it("menu dibaca dari tautan situs, tanpa Beranda", () => {
    expect(menuList()).toBe("Daftar Surah, Hafalan, dan Tentang Kami");
  });

  it("halaman lain tetap punya pembuka", () => {
    expect(pageIntro("/tidak-ada", "Halaman · Nuruna", opts)).toBe("Halaman. Tekan Tab untuk menjelajah.");
  });
});
