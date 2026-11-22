import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { normalizeLandmarks } from "../src/lib/isyarat/landmarks.ts";

const URL_CSV = "https://zenodo.org/records/18363162/files/ArSL_dataset.csv?download=1";
const MD5 = "80f92dfdf29019f83d110eb4d98e3b8c";
const OUT = new URL("../public/isyarat/dataset.json", import.meta.url);

const ASPECT = 4 / 3;
const STEP = 2;
const FRAMES_PER_SAMPLE = 10;

const LABELS = {
  Alef: "alif", Ba2: "ba", Ta2: "ta", Tha2: "tsa", Jim: "jim", "7a2": "ha", Kha2: "kho",
  Dal: "dal", Thal: "dzal", Ra2: "ro", Zayn: "za", Sin: "sin", Chin: "syin", SSad: "shod",
  DDad: "dhod", TTa2: "tho", TTha2: "zho", "3ayn": "ain", Ghayn: "ghoin", Fa2: "fa",
  "9af": "qof", Kaf: "kaf", Lam: "lam", Mim: "mim", Noon: "nun", Ha2: "haa", Waw: "wau",
  Ya2: "ya",
};
const IGNORED = new Set(["Space", "Delete", "Finish"]);

async function loadCsv() {
  const path = process.argv[2];
  if (path) return readFile(path);
  const res = await fetch(URL_CSV);
  if (!res.ok) throw new Error(`Gagal mengunduh dataset: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const raw = await loadCsv();
const md5 = createHash("md5").update(raw).digest("hex");
if (md5 !== MD5) throw new Error(`Checksum berbeda (${md5}); dataset di Zenodo mungkin sudah berubah.`);

const [header, ...rows] = raw.toString("utf8").trim().split(/\r?\n/);
const cols = header.split(";");
if (cols[0] !== "Sign" || cols[1] !== "x0" || cols[42] !== "y20") throw new Error("Kolom CSV tidak dikenali.");

const framesByLetter = new Map();
let skipped = 0;
for (const line of rows) {
  const v = line.split(";");
  const label = v[0];
  if (IGNORED.has(label)) continue;
  const letter = LABELS[label];
  if (!letter) throw new Error(`Label tidak dikenal: ${label}`);
  const points = Array.from({ length: 21 }, (_, i) => ({ x: Number(v[1 + 2 * i]), y: Number(v[2 + 2 * i]), z: 0 }));
  const features = normalizeLandmarks(points, ASPECT);
  if (!features) {
    skipped++;
    continue;
  }
  const list = framesByLetter.get(letter) ?? [];
  list.push(features);
  framesByLetter.set(letter, list);
}

const allFrames = [...framesByLetter.values()].flat();
const mirroredShare = allFrames.filter((f) => f[5 * 3] < f[17 * 3]).length / allFrames.length;
if (mirroredShare < 0.9) {
  throw new Error(`Arah tangan tidak seperti yang diharapkan (${Math.round(mirroredShare * 100)}%); periksa label tangan.`);
}
const HANDEDNESS = "Left";

const samples = [];
for (const [letter, frames] of framesByLetter) {
  const kept = frames.filter((_, i) => i % STEP === 0);
  for (let start = 0, n = 1; start + FRAMES_PER_SAMPLE / 2 <= kept.length; start += FRAMES_PER_SAMPLE, n++) {
    samples.push({
      id: `arsl-${letter}-${String(n).padStart(2, "0")}`,
      letter,
      participant: "ArSL31",
      handedness: HANDEDNESS,
      capturedAt: "2026-01-24T00:00:00.000Z",
      frames: kept.slice(start, start + FRAMES_PER_SAMPLE),
    });
  }
}

const dataset = {
  format: "nuruna-isyarat-v1",
  createdAt: "2026-01-24T00:00:00.000Z",
  source: {
    name: "ArSL-31-Pilot",
    authors: "Youssef Farhan & Abdessalam Ait Madi (Universitas Ibn Tofail)",
    license: "CC BY 4.0",
    url: "https://zenodo.org/records/18363162",
    note:
      "Ini data contoh sementara: isyarat abjad Arab dari satu peraga. Boleh memakai tangan kanan atau kiri. " +
      "Pedoman Mushaf Al-Qur'an Isyarat Kemenag merujuk isyarat abjad Arab, tetapi bentuk " +
      "tiap huruf belum dicocokkan dengan guru SLB. Lam Alif dan Hamzah belum ada datanya.",
  },
  samples,
};

await mkdir(new URL(".", OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(dataset) + "\n");
console.log(
  `Tersimpan ${samples.length} sampel untuk ${framesByLetter.size} huruf` +
    (skipped ? ` (${skipped} frame dilewati)` : "") +
    ` -> public/isyarat/dataset.json`,
);
