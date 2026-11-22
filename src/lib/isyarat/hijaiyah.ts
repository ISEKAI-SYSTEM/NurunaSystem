export type HijaiyahLetter = { id: string; char: string; name: string };

export const HIJAIYAH_LETTERS: readonly HijaiyahLetter[] = [
  { id: "alif", char: "ا", name: "Alif" },
  { id: "ba", char: "ب", name: "Ba" },
  { id: "ta", char: "ت", name: "Ta" },
  { id: "tsa", char: "ث", name: "Tsa" },
  { id: "jim", char: "ج", name: "Jim" },
  { id: "ha", char: "ح", name: "Ha" },
  { id: "kho", char: "خ", name: "Kho" },
  { id: "dal", char: "د", name: "Dal" },
  { id: "dzal", char: "ذ", name: "Dzal" },
  { id: "ro", char: "ر", name: "Ro" },
  { id: "za", char: "ز", name: "Za" },
  { id: "sin", char: "س", name: "Sin" },
  { id: "syin", char: "ش", name: "Syin" },
  { id: "shod", char: "ص", name: "Shod" },
  { id: "dhod", char: "ض", name: "Dhod" },
  { id: "tho", char: "ط", name: "Tho" },
  { id: "zho", char: "ظ", name: "Zho" },
  { id: "ain", char: "ع", name: "'Ain" },
  { id: "ghoin", char: "غ", name: "Ghoin" },
  { id: "fa", char: "ف", name: "Fa" },
  { id: "qof", char: "ق", name: "Qof" },
  { id: "kaf", char: "ك", name: "Kaf" },
  { id: "lam", char: "ل", name: "Lam" },
  { id: "mim", char: "م", name: "Mim" },
  { id: "nun", char: "ن", name: "Nun" },
  { id: "wau", char: "و", name: "Wau" },
  { id: "haa", char: "ه", name: "Ha'" },
  { id: "lam-alif", char: "لا", name: "Lam Alif" },
  { id: "hamzah", char: "ء", name: "Hamzah" },
  { id: "ya", char: "ي", name: "Ya" },
];

export const LETTER_BY_ID: ReadonlyMap<string, HijaiyahLetter> = new Map(
  HIJAIYAH_LETTERS.map((l) => [l.id, l]),
);
