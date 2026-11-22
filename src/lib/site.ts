export const FEEDBACK_CONTACT: { label: string; href: string } | null = null;

export const ACCESSIBILITY_STATEMENT_DATE = "22 November 2026";

export const QURAN_CREDITS =
  "Teks Al-Qur’an dan audio dari Quran.com · Terjemahan Kementerian Agama RI · Qari: Mishary Rashid Alafasy";

export const SITE_LINKS: readonly { href: string; label: string; also?: readonly string[] }[] = [
  { href: "/", label: "Beranda" },
  { href: "/surah", label: "Daftar Surah" },
  { href: "/hafalan", label: "Hafalan", also: ["/setoran", "/latihan", "/belajar"] },
  { href: "/tentang", label: "Tentang Kami" },
];
