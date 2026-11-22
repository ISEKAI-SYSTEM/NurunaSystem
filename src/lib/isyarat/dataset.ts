import { LETTER_BY_ID } from "./hijaiyah";
import { FEATURE_LENGTH, type Handedness } from "./landmarks";

export type { Handedness };

export const DATASET_FORMAT = "nuruna-isyarat-v1";

export type IsyaratSample = {
  id: string;
  letter: string;
  participant: string;
  handedness: Handedness;
  capturedAt: string;
  frames: number[][];
};

export type DatasetSource = {
  name: string;
  authors: string;
  license: string;
  url: string;
  note?: string;
};

export type IsyaratDataset = {
  format: typeof DATASET_FORMAT;
  createdAt: string;
  source?: DatasetSource;
  samples: IsyaratSample[];
};

export function readDatasetSource(text: string): DatasetSource | null {
  try {
    const s = (JSON.parse(text) as Partial<IsyaratDataset> | null)?.source;
    const str = (v: unknown) => typeof v === "string" && v.length > 0;
    if (!s || !str(s.name) || !str(s.authors) || !str(s.license) || !str(s.url)) return null;
    return { name: s.name, authors: s.authors, license: s.license, url: s.url, note: str(s.note) ? s.note : undefined };
  } catch {
    return null;
  }
}

export function serializeDataset(samples: readonly IsyaratSample[], now = new Date()): string {
  const data: IsyaratDataset = {
    format: DATASET_FORMAT,
    createdAt: now.toISOString(),
    samples: [...samples],
  };
  return JSON.stringify(data);
}

const isFrame = (f: unknown): f is number[] =>
  Array.isArray(f) && f.length === FEATURE_LENGTH && f.every((v) => typeof v === "number" && Number.isFinite(v));

export function parseDataset(text: string): IsyaratSample[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Berkas bukan JSON yang valid.");
  }
  const d = data as Partial<IsyaratDataset> | null;
  if (!d || d.format !== DATASET_FORMAT || !Array.isArray(d.samples)) {
    throw new Error(`Berkas bukan data isyarat Nuruna (format ${DATASET_FORMAT}).`);
  }
  return d.samples.map((s, i) => {
    const ok =
      s &&
      typeof s.id === "string" &&
      typeof s.letter === "string" &&
      LETTER_BY_ID.has(s.letter) &&
      typeof s.participant === "string" &&
      (s.handedness === "Left" || s.handedness === "Right" || s.handedness === "Unknown") &&
      typeof s.capturedAt === "string" &&
      Array.isArray(s.frames) &&
      s.frames.length > 0 &&
      s.frames.every(isFrame);
    if (!ok) throw new Error(`Sampel ke-${i + 1} tidak valid.`);
    return s as IsyaratSample;
  });
}

export function mergeSamples(
  current: readonly IsyaratSample[],
  incoming: readonly IsyaratSample[],
): IsyaratSample[] {
  const seen = new Set(current.map((s) => s.id));
  return [...current, ...incoming.filter((s) => !seen.has(s.id))];
}

export function countByLetter(samples: readonly IsyaratSample[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of samples) counts.set(s.letter, (counts.get(s.letter) ?? 0) + 1);
  return counts;
}
