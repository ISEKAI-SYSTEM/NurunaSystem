import { type IsyaratSample, parseDataset, serializeDataset } from "./dataset";

const STORAGE_KEY = "nuruna-isyarat-saya";
const CHANGE_EVENT = "nuruna-isyarat-saya-berubah";
export const MAX_PER_LETTER = 3;
export const PERSONAL_PARTICIPANT = "saya";

export function withPersonalSample(
  samples: readonly IsyaratSample[],
  sample: IsyaratSample,
  max = MAX_PER_LETTER,
): IsyaratSample[] {
  const sameLetter = samples.filter((s) => s.letter === sample.letter);
  const drop = new Set(sameLetter.slice(0, Math.max(0, sameLetter.length - (max - 1))).map((s) => s.id));
  return [...samples.filter((s) => !drop.has(s.id)), sample];
}

export function loadPersonalSamples(): IsyaratSample[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseDataset(raw) : [];
  } catch {
    return [];
  }
}

function save(samples: readonly IsyaratSample[]): boolean {
  try {
    if (samples.length) window.localStorage.setItem(STORAGE_KEY, serializeDataset(samples));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function addPersonalSample(sample: IsyaratSample): boolean {
  return save(withPersonalSample(loadPersonalSamples(), sample));
}

export function clearPersonalSamples(): boolean {
  return save([]);
}

export function onPersonalSamplesChange(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
