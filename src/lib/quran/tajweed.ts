export const TAJWEED_GROUPS = [
  "diam",
  "mad-thabii",
  "mad-aridh",
  "mad-panjang",
  "dengung",
  "lebur",
  "qalqalah",
] as const;
export type TajweedGroup = (typeof TAJWEED_GROUPS)[number];

export const TAJWEED_GROUP_INFO: Record<
  TajweedGroup,
  { label: string; description: string }
> = {
  diam: {
    label: "Tidak dibaca",
    description: "Huruf tertulis tetapi tidak dilafalkan saat bacaan bersambung.",
  },
  "mad-thabii": {
    label: "Mad thabi'i",
    description: "Dipanjangkan 2 harakat.",
  },
  "mad-aridh": {
    label: "Mad 'aridh lissukun",
    description: "Boleh 2, 4, atau 6 harakat bila berhenti (waqaf) di kata ini.",
  },
  "mad-panjang": {
    label: "Mad panjang",
    description: "Dipanjangkan 4 sampai 6 harakat (mad wajib, mad jaiz munfashil, mad lazim).",
  },
  dengung: {
    label: "Dengung (ghunnah)",
    description: "Dibaca berdengung kira-kira 2 harakat (ghunnah, ikhfa', idgham bighunnah, iqlab).",
  },
  lebur: {
    label: "Idgham tanpa dengung",
    description: "Huruf dilebur ke huruf berikutnya tanpa dengung.",
  },
  qalqalah: {
    label: "Qalqalah",
    description: "Huruf mati dibaca memantul.",
  },
};

export const TAJWEED_RULE_IDS = [
  "ham_wasl",
  "laam_shamsiyah",
  "slnt",
  "madda_normal",
  "madda_permissible",
  "madda_obligatory_mottasel",
  "madda_obligatory_monfasel",
  "madda_necessary",
  "ghunnah",
  "ikhafa",
  "ikhafa_shafawi",
  "idgham_ghunnah",
  "idgham_shafawi",
  "iqlab",
  "idgham_wo_ghunnah",
  "idgham_mutajanisayn",
  "idgham_mutaqaribayn",
  "qalaqah",
] as const;
export type TajweedRuleId = (typeof TAJWEED_RULE_IDS)[number];

export const TAJWEED_RULES: Record<
  TajweedRuleId,
  { name: string; group: TajweedGroup; description: string }
> = {
  ham_wasl: {
    name: "Hamzah washal",
    group: "diam",
    description: "Tidak dibaca bila bersambung dengan kata sebelumnya.",
  },
  laam_shamsiyah: {
    name: "Alif lam syamsiyah",
    group: "diam",
    description: "Lam tidak dibaca, langsung masuk ke huruf bertasydid sesudahnya.",
  },
  slnt: {
    name: "Huruf tidak dibaca",
    group: "diam",
    description: "Huruf tertulis tetapi tidak dilafalkan.",
  },
  madda_normal: {
    name: "Mad thabi'i",
    group: "mad-thabii",
    description: "Dipanjangkan 2 harakat.",
  },
  madda_permissible: {
    name: "Mad 'aridh lissukun",
    group: "mad-aridh",
    description: "Boleh 2, 4, atau 6 harakat bila berhenti (waqaf) di kata ini.",
  },
  madda_obligatory_mottasel: {
    name: "Mad wajib muttashil",
    group: "mad-panjang",
    description: "Mad bertemu hamzah dalam satu kata, dipanjangkan 4–5 harakat.",
  },
  madda_obligatory_monfasel: {
    name: "Mad jaiz munfashil",
    group: "mad-panjang",
    description:
      "Mad bertemu hamzah di kata berikutnya, dipanjangkan 4–5 harakat (riwayat Hafs jalur Syathibiyah).",
  },
  madda_necessary: {
    name: "Mad lazim",
    group: "mad-panjang",
    description: "Dipanjangkan 6 harakat.",
  },
  ghunnah: {
    name: "Ghunnah",
    group: "dengung",
    description: "Nun atau mim bertasydid, dibaca berdengung.",
  },
  ikhafa: {
    name: "Ikhfa' haqiqi",
    group: "dengung",
    description: "Nun mati/tanwin dibaca samar disertai dengung.",
  },
  ikhafa_shafawi: {
    name: "Ikhfa' syafawi",
    group: "dengung",
    description: "Mim mati bertemu ba, dibaca samar disertai dengung.",
  },
  idgham_ghunnah: {
    name: "Idgham bighunnah",
    group: "dengung",
    description: "Nun mati/tanwin dilebur ke huruf ي ن م و disertai dengung.",
  },
  idgham_shafawi: {
    name: "Idgham mimi",
    group: "dengung",
    description: "Mim mati bertemu mim, dilebur disertai dengung.",
  },
  iqlab: {
    name: "Iqlab",
    group: "dengung",
    description: "Nun mati/tanwin bertemu ba, berubah menjadi bunyi mim disertai dengung.",
  },
  idgham_wo_ghunnah: {
    name: "Idgham bilaghunnah",
    group: "lebur",
    description: "Nun mati/tanwin dilebur ke huruf ل atau ر tanpa dengung.",
  },
  idgham_mutajanisayn: {
    name: "Idgham mutajanisain",
    group: "lebur",
    description: "Dua huruf yang makhrajnya sama tetapi sifatnya berbeda, huruf pertama dilebur.",
  },
  idgham_mutaqaribayn: {
    name: "Idgham mutaqaribain",
    group: "lebur",
    description: "Dua huruf yang makhraj dan sifatnya berdekatan, huruf pertama dilebur.",
  },
  qalaqah: {
    name: "Qalqalah",
    group: "qalqalah",
    description: "Huruf ق ط ب ج د yang mati dibaca memantul.",
  },
};

export type TajweedSegment = {
  text: string;
  rule: TajweedRuleId | null;
};

function isRuleId(value: string): value is TajweedRuleId {
  return Object.hasOwn(TAJWEED_RULES, value);
}

const TOKEN = /<rule class=([^>\s]+)>|<\/rule>|<[^>]*>|([^<]+)/g;

export function parseTajweed(markup: string): TajweedSegment[] {
  const stack: string[] = [];
  const segments: TajweedSegment[] = [];

  for (const [token, ruleClass, text] of markup.matchAll(TOKEN)) {
    if (ruleClass !== undefined) {
      stack.push(ruleClass);
    } else if (token === "</rule>") {
      stack.pop();
    } else if (text !== undefined) {
      const rule = stack.findLast(isRuleId) ?? null;
      const last = segments.at(-1);
      if (last && last.rule === rule) last.text += text;
      else segments.push({ text, rule });
    }
  }

  return segments;
}
