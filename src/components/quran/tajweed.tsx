import { Fragment } from "react";

import {
  TAJWEED_GROUPS,
  TAJWEED_GROUP_INFO,
  TAJWEED_RULES,
  type TajweedRuleId,
} from "@/lib/quran/tajweed";
import type { Word } from "@/lib/quran/types";

export function WordText({ word, tajweed }: { word: Word; tajweed: boolean }) {
  if (!tajweed) return word.textUthmani;
  return word.tajweed.map((seg, i) =>
    seg.rule ? (
      <span key={i} data-tajwid={TAJWEED_RULES[seg.rule].group}>
        {seg.text}
      </span>
    ) : (
      <Fragment key={i}>{seg.text}</Fragment>
    ),
  );
}

function Swatch({ group }: { group: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-1 size-4 shrink-0 rounded-full"
      style={{ backgroundColor: `var(--tajwid-${group})` }}
    />
  );
}

export function TajweedLegend() {
  return (
    <details className="rounded-xl border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-xl px-4 py-2 font-medium">
        Keterangan warna tajwid
      </summary>
      <ul className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">
        {TAJWEED_GROUPS.map((group) => (
          <li key={group} className="flex items-start gap-3">
            <Swatch group={group} />
            <div className="flex flex-col">
              <span data-tajwid={group} className="font-semibold">
                {TAJWEED_GROUP_INFO[group].label}
              </span>
              <span className="text-sm text-muted-foreground">
                {TAJWEED_GROUP_INFO[group].description}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t px-4 py-3 text-sm text-muted-foreground">
        Penanda tajwid dari Quran.com. Warna hanya bantuan: daftar &ldquo;Hukum
        tajwid di ayat ini&rdquo; pada tiap ayat memuat nama hukumnya dalam
        bentuk teks.
      </p>
    </details>
  );
}

export function VerseTajweedList({ words }: { words: Word[] }) {
  const rules = new Map<TajweedRuleId, Word[]>();
  for (const word of words) {
    for (const seg of word.tajweed) {
      if (!seg.rule) continue;
      const list = rules.get(seg.rule) ?? [];
      if (list.at(-1) !== word) list.push(word);
      rules.set(seg.rule, list);
    }
  }
  if (rules.size === 0) return null;

  return (
    <details className="rounded-lg border">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 py-2 font-medium">
        Hukum tajwid di ayat ini ({rules.size})
      </summary>
      <ul className="flex flex-col gap-4 border-t px-3 py-3">
        {[...rules].map(([id, ruleWords]) => {
          const rule = TAJWEED_RULES[id];
          return (
            <li key={id} className="flex items-start gap-3">
              <Swatch group={rule.group} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold">{rule.name}</span>
                <span className="text-sm text-muted-foreground">
                  {rule.description}
                </span>
                <span
                  lang="ar"
                  dir="rtl"
                  className="quran-text text-start"
                >
                  {ruleWords.map((w, i) => (
                    <Fragment key={w.position}>
                      {i > 0 && "، "}
                      <WordText word={w} tajweed />
                    </Fragment>
                  ))}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
