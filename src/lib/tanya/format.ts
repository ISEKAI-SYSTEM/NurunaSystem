export type AnswerPart =
  | { type: "text"; text: string }
  | { type: "ref"; surah: number; ayat: number; label: string };

const ARABIC_CHARS = "\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF";
const ARABIC = new RegExp(`[${ARABIC_CHARS}]+`, "g");
const HAS_ARABIC = new RegExp(`[${ARABIC_CHARS}]`);

const REFERENCE = /\[\s*Q\.?\s*S\.?\s*(\d{1,3})\s*:\s*(\d{1,3})\s*\]/gi;

export function removeArabic(text: string): string {
  if (!HAS_ARABIC.test(text)) return text;
  return text
    .replace(ARABIC, "")
    .replace(/[(“"«]\s*[)”"»]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ([,.;:!?])/g, "$1");
}

export function formatAnswer(text: string): AnswerPart[][] {
  return removeArabic(text)
    .replace(/\*\*|__|^#+\s*/gm, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const parts: AnswerPart[] = [];
      let last = 0;
      for (const m of paragraph.matchAll(REFERENCE)) {
        const surah = Number(m[1]);
        const ayat = Number(m[2]);
        if (m.index > last) parts.push({ type: "text", text: paragraph.slice(last, m.index) });
        if (surah >= 1 && surah <= 114 && ayat >= 1) {
          parts.push({ type: "ref", surah, ayat, label: `QS ${surah}:${ayat}` });
        } else {
          parts.push({ type: "text", text: m[0] });
        }
        last = m.index + m[0].length;
      }
      if (last < paragraph.length) parts.push({ type: "text", text: paragraph.slice(last) });
      return parts;
    });
}

export function answerPlainText(text: string): string {
  return formatAnswer(text)
    .map((p) => p.map((part) => (part.type === "ref" ? part.label : part.text)).join(""))
    .join("\n\n");
}
