export const KEMENAG_SOURCE = {
  title: "Pedoman Membaca Mushaf Al-Qur'an bagi Penyandang Disabilitas Sensorik Rungu Wicara",
  publisher: "Lajnah Pentashihan Mushaf Al-Qur'an, Kementerian Agama RI",
  year: 2022,
  url: "https://quran.kemenag.go.id/assets/files/Pedoman-Membaca-Mushaf-Al-Quran-Isyarat.pdf",
} as const;

const DESCRIPTIONS: Record<string, string> = {
  alif: "Telapak tangan menghadap ke kiri. Jari-jari menggenggam, kecuali ibu jari menghadap ke luar, menunjuk lurus ke atas. Bentuk seperti huruf alif.",
  ba: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk lurus menunjuk ke atas. Mengisyaratkan huruf ba memiliki satu titik.",
  ta: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk dan jari tengah rapat lurus menunjuk ke atas. Mengisyaratkan huruf ta memiliki dua titik.",
  tsa: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk, jari tengah, dan jari manis rapat menunjuk ke atas. Mengisyaratkan huruf tsa memiliki tiga titik.",
  jim: "Telapak tangan menghadap ke kiri. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) menekuk membentuk sudut siku-siku. Ibu jari menekuk di bawah jari-jari yang lain, menunjukkan posisi titik di bawah huruf jim.",
  ha: "Telapak tangan menghadap ke kiri. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) menekuk membentuk sudut siku-siku. Ibu jari merapat pada pangkal jari telunjuk.",
  kho: "Telapak tangan menghadap ke kiri. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) menekuk membentuk sudut siku-siku. Ibu jari lurus ke atas menghadap luar, menunjukkan posisi titik di atas jari-jari yang lain.",
  dal: "Telapak tangan menghadap ke kiri. Jari-jari menggenggam, kecuali ibu jari dan jari telunjuk lurus menunjuk ke kiri, membentuk huruf dal.",
  dzal: "Telapak tangan menghadap ke kiri. Jari-jari menggenggam, kecuali ibu jari dan jari telunjuk lurus menunjuk ke kiri membentuk huruf dzal, dan jari tengah bertumpu di atas jari telunjuk, menunjukkan adanya satu titik di atas huruf dzal.",
  ro: "Telapak tangan menghadap ke kiri. Jari-jari menggenggam, kecuali jari telunjuk melengkung, membentuk huruf ro.",
  za: "Telapak tangan menghadap ke kiri. Jari-jari menggenggam, kecuali jari telunjuk melengkung membentuk huruf za dan jari tengah bertumpu di atas jari telunjuk, menunjukkan adanya satu titik di atas huruf za.",
  sin: "Telapak tangan menghadap ke luar. Jari-jari lurus dan rapat menunjuk ke atas. Jari-jari menggambarkan gigi-gigi pada huruf sin.",
  syin: "Telapak tangan menghadap ke luar. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) lurus renggang menunjuk ke atas, kecuali ibu jari merapat kepada jari telunjuk. Jari-jari menggambarkan gigi-gigi pada huruf syin.",
  shod: "Telapak tangan menghadap ke luar. Jari-jari menggenggam dengan ibu jari pada posisi terluar.",
  dhod: "Telapak tangan menghadap ke luar. Jari-jari menggenggam dengan ibu jari menunjuk ke kiri, menunjukkan terdapat satu titik pada huruf dhod.",
  tho: "Telapak tangan menghadap ke kiri. Jari kelingking dan jari manis menggenggam, ujung jari tengah dan ibu jari bertemu, sedangkan jari telunjuk lurus menunjuk ke atas, membentuk huruf tho.",
  zho: "Telapak tangan menghadap ke kiri. Jari kelingking dan jari manis menggenggam, jari tengah lurus menunjuk ke arah kiri, sedangkan jari telunjuk lurus menunjuk ke atas. Ibu jari bertumpu di atas jari tengah, menunjukkan ada satu titik di atas huruf zho.",
  ain: "Telapak tangan menghadap ke dalam. Jari-jari menggenggam, kecuali jari telunjuk dan jari tengah rapat menunjuk lurus ke kiri, dan ibu jari diletakkan pada ruas jari telunjuk dan jari tengah.",
  ghoin: "Telapak tangan menghadap ke dalam. Jari-jari menggenggam, kecuali jari telunjuk dan jari tengah rapat menunjuk lurus ke kiri, dan ibu jari menunjuk ke atas menempel pada jari telunjuk (menunjukkan adanya satu titik di atas huruf ghoin).",
  fa: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali ujung jari telunjuk melengkung bertemu dengan ujung ibu jari.",
  qof: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali ujung jari telunjuk dan jari tengah melengkung bertemu dengan ujung ibu jari.",
  kaf: "Telapak tangan menghadap ke luar. Jari-jari lurus dan rapat menunjuk ke atas, kecuali ibu jari dilipat menempel pada telapak tangan.",
  lam: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk lurus menunjuk ke atas dan ibu jari menunjuk ke kiri (membentuk huruf lam).",
  mim: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari kelingking tegak menunjuk ke atas.",
  nun: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk dan ibu jari melengkung menghadap ke atas, membentuk huruf nun.",
  wau: "Telapak tangan menghadap ke kiri. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) rapat melengkung membuat lingkaran kecil, ujung-ujung jari menempel di ruas pangkal ibu jari bagian dalam, sedangkan ibu jari menunjuk ke bawah. Jari-jari membentuk huruf wau.",
  haa: "Telapak tangan menghadap ke luar. Keempat jari (jari telunjuk, jari tengah, jari manis, dan jari kelingking) bertemu dengan ujung ibu jari, melengkung membuat lingkaran kecil. Bentuk seperti huruf ha'.",
  "lam-alif": "Huruf lam dan alif diisyaratkan terpisah, berurutan dari kanan ke kiri: pertama lam, lalu alif.",
  hamzah: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali jari telunjuk menunjuk ke atas sambil melukiskan huruf hamzah di udara.",
  ya: "Telapak tangan menghadap ke luar. Jari-jari menggenggam, kecuali ibu jari dan jari kelingking menunjuk ke atas dan direnggangkan.",
};

export type KemenagSign = { image: string; description: string };

export function kemenagSign(letterId: string): KemenagSign | null {
  const description = DESCRIPTIONS[letterId];
  return description ? { image: `/isyarat/kemenag/${letterId}.webp`, description } : null;
}

export const KEMENAG_LETTER_IDS: readonly string[] = Object.keys(DESCRIPTIONS);

export function signImageFor(id: string, char: string): string | null {
  if (char === "ى") return "/isyarat/kemenag/alif-maqsurah.webp";
  if (id === "ta-marbutah") return "/isyarat/kemenag/ta-marbutah.webp";
  return DESCRIPTIONS[id] ? `/isyarat/kemenag/${id}.webp` : null;
}
