export type TanyaMode =
  | "tanya"
  | "sederhana";

export type TanyaTurn = { question: string; answer: string };

export type TanyaRequest = {
  surah: number;
  ayat: number;
  mode: TanyaMode;
  question: string;
  simple: boolean;
  history: TanyaTurn[];
};

export const MAX_QUESTION_LENGTH = 500;
export const MAX_HISTORY_TURNS = 4;
const MAX_ANSWER_LENGTH = 3000;

export const SIMPLE_TAFSIR_QUESTION =
  "Jelaskan isi Tafsir Kemenag untuk ayat ini dengan bahasa sederhana. Langsung ke penjelasannya, tanpa kalimat pembuka.";

const isPositiveInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0;

export function parseTanyaRequest(body: unknown): TanyaRequest | string {
  if (!body || typeof body !== "object") return "Permintaan tidak valid.";
  const b = body as Record<string, unknown>;

  if (!isPositiveInt(b.surah) || b.surah > 114 || !isPositiveInt(b.ayat) || b.ayat > 286) {
    return "Ayat tidak ditemukan.";
  }
  const mode: TanyaMode = b.mode === "sederhana" ? "sederhana" : "tanya";

  let question = SIMPLE_TAFSIR_QUESTION;
  if (mode === "tanya") {
    if (typeof b.question !== "string" || !b.question.trim()) {
      return "Tulis pertanyaan terlebih dahulu.";
    }
    question = b.question.trim();
    if (question.length > MAX_QUESTION_LENGTH) {
      return `Pertanyaan terlalu panjang (maksimal ${MAX_QUESTION_LENGTH} karakter).`;
    }
  }

  const history: TanyaTurn[] = [];
  if (mode === "tanya" && Array.isArray(b.history)) {
    for (const t of b.history.slice(-MAX_HISTORY_TURNS)) {
      const turn = t as Partial<TanyaTurn> | null;
      if (
        typeof turn?.question === "string" &&
        typeof turn.answer === "string" &&
        turn.question.trim() &&
        turn.answer.trim()
      ) {
        history.push({
          question: turn.question.trim().slice(0, MAX_QUESTION_LENGTH),
          answer: turn.answer.trim().slice(0, MAX_ANSWER_LENGTH),
        });
      }
    }
  }

  return {
    surah: b.surah,
    ayat: b.ayat,
    mode,
    question,
    simple: mode === "sederhana" || b.simple === true,
    history,
  };
}
