"use client";

import { useEffect, useMemo, useState } from "react";

import { type Classifier, trainClassifier } from "@/lib/isyarat/classifier";
import { type DatasetSource, type IsyaratSample, parseDataset, readDatasetSource } from "@/lib/isyarat/dataset";
import { loadPersonalSamples, onPersonalSamplesChange } from "@/lib/isyarat/personal";

const DATASET_URL = "/isyarat/dataset.json";

export type IsyaratModel =
  | { status: "memuat" }
  | {
      status: "siap";
      classifier: Classifier;
      source: DatasetSource | null;
      personalLetters: string[];
    }
  | { status: "belum-ada" };

type Base = { status: "memuat" } | { status: "siap"; samples: IsyaratSample[]; source: DatasetSource | null } | { status: "gagal" };

export function useIsyaratModel(): IsyaratModel {
  const [base, setBase] = useState<Base>({ status: "memuat" });
  const [personal, setPersonal] = useState<IsyaratSample[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(DATASET_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const text = await res.text();
        if (!cancelled) setBase({ status: "siap", samples: parseDataset(text), source: readDatasetSource(text) });
      })
      .catch(() => {
        if (!cancelled) setBase({ status: "gagal" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refresh = () => setPersonal(loadPersonalSamples());
    refresh();
    return onPersonalSamplesChange(refresh);
  }, []);

  return useMemo((): IsyaratModel => {
    if (base.status === "memuat") return { status: "memuat" };
    const samples = [...(base.status === "siap" ? base.samples : []), ...personal];
    const classifier = trainClassifier(samples);
    if (!classifier.letters.length) return { status: "belum-ada" };
    return {
      status: "siap",
      classifier,
      source: base.status === "siap" ? base.source : null,
      personalLetters: [...new Set(personal.map((s) => s.letter))],
    };
  }, [base, personal]);
}
