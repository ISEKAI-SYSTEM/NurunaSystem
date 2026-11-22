import { normalizeWord } from "./normalize";

export type ExpectedWord = string | readonly string[];

export type WordStatus = "benar" | "salah" | "terlewat" | "tambahan";

export type MatchedWord =
  | { status: "benar" | "salah"; index: number; expected: string; heard: string }
  | { status: "terlewat"; index: number; expected: string; heard: null }
  | { status: "tambahan"; index: null; expected: null; heard: string };

export type MatchSummary = Record<WordStatus, number> & { total: number };

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length];
}

function allowedDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

function isClose(variants: readonly string[], heard: string, shortestPart = Infinity): boolean {
  if (!heard) return false;
  return variants.some((v) => {
    if (!v) return false;
    const limit = allowedDistance(Math.max(v.length, heard.length));
    if (Math.abs(v.length - heard.length) > limit) return false;
    const distance = levenshtein(v, heard);
    return distance <= limit && distance < shortestPart;
  });
}

type Op = "cocok" | "terlewat" | "tambahan" | "pecah" | "gabung";

const MAX_SPLIT = 5;

export type MatchOptions = {
  opening?: readonly ExpectedWord[];
  partial?: boolean;
};

function prepare(words: readonly ExpectedWord[]) {
  return words.map((w) => {
    const spellings = typeof w === "string" ? [w] : [...w];
    return {
      display: spellings[0] ?? "",
      variants: [...new Set(spellings.map(normalizeWord).filter(Boolean))],
    };
  });
}

export function matchRecitation(
  expectedWords: readonly ExpectedWord[],
  heardText: string,
  options: MatchOptions = {},
): MatchedWord[] {
  const openingCount = options.opening?.length ?? 0;
  const expected = prepare([...(options.opening ?? []), ...expectedWords]);

  const heard = heardText
    .split(/\s+/)
    .map((raw) => ({ raw, norm: normalizeWord(raw) }))
    .filter((t) => t.norm);

  const n = expected.length;
  const m = heard.length;
  const grid = <T,>(fill: T) =>
    Array.from({ length: n + 1 }, () => new Array<T>(m + 1).fill(fill));
  const cost = grid(Infinity);
  const op = grid<Op | null>(null);
  const span = grid(0);
  cost[0][0] = 0;

  const relax = (i: number, j: number, value: number, how: Op, k = 0) => {
    if (value < cost[i][j]) {
      cost[i][j] = value;
      op[i][j] = how;
      span[i][j] = k;
    }
  };

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i > 0 && j > 0) {
        const same = isClose(expected[i - 1].variants, heard[j - 1].norm);
        relax(i, j, cost[i - 1][j - 1] + (same ? 0 : 1), "cocok");
      }
      if (i > 0) {
        let joined = j > 0 ? heard[j - 1].norm : "";
        let shortest = j > 0 ? heard[j - 1].norm.length : 0;
        for (let k = 2; k <= MAX_SPLIT && j - k >= 0; k++) {
          joined = heard[j - k].norm + joined;
          shortest = Math.min(shortest, heard[j - k].norm.length);
          if (isClose(expected[i - 1].variants, joined, shortest)) {
            relax(i, j, cost[i - 1][j - k], "pecah", k);
          }
        }
      }
      if (i > 1 && j > 0) {
        const close = expected[i - 2].variants.some((a) =>
          expected[i - 1].variants.some((b) =>
            isClose([a + b], heard[j - 1].norm, Math.min(a.length, b.length)),
          ),
        );
        if (close) {
          relax(i, j, cost[i - 2][j - 1], "gabung");
        }
      }
      if (i > 0) relax(i, j, cost[i - 1][j] + (i <= openingCount ? 0 : 1), "terlewat");
      if (j > 0) relax(i, j, cost[i][j - 1] + 1, "tambahan");
    }
  }

  let end = n;
  if (options.partial) {
    end = 0;
    for (let r = 1; r <= n; r++) if (cost[r][m] <= cost[end][m]) end = r;
  }
  const result: MatchedWord[] = [];
  const word = (i: number) => ({ index: i - 1, expected: expected[i - 1].display });
  let i = end;
  let j = m;
  while (i > 0 || j > 0) {
    switch (op[i][j]) {
      case "cocok": {
        const same = isClose(expected[i - 1].variants, heard[j - 1].norm);
        result.push({ status: same ? "benar" : "salah", ...word(i), heard: heard[j - 1].raw });
        i--;
        j--;
        break;
      }
      case "pecah": {
        const k = span[i][j];
        const raw = heard.slice(j - k, j).map((t) => t.raw).join(" ");
        result.push({ status: "benar", ...word(i), heard: raw });
        i--;
        j -= k;
        break;
      }
      case "gabung":
        result.push(
          { status: "benar", ...word(i), heard: heard[j - 1].raw },
          { status: "benar", ...word(i - 1), heard: heard[j - 1].raw },
        );
        i -= 2;
        j--;
        break;
      case "terlewat":
        result.push({ status: "terlewat", ...word(i), heard: null });
        i--;
        break;
      case "tambahan":
        result.push({ status: "tambahan", index: null, expected: null, heard: heard[j - 1].raw });
        j--;
        break;
      default:
        throw new Error("matchRecitation: jalur penyelarasan tidak lengkap");
    }
  }

  return result.reverse().flatMap((r): MatchedWord[] => {
    if (r.index === null) return [r];
    if (r.index < openingCount) {
      return r.status === "salah"
        ? [{ status: "tambahan", index: null, expected: null, heard: r.heard }]
        : [];
    }
    return [{ ...r, index: r.index - openingCount }];
  });
}

export function summarizeMatch(result: readonly MatchedWord[]): MatchSummary {
  const summary: MatchSummary = { total: 0, benar: 0, salah: 0, terlewat: 0, tambahan: 0 };
  for (const word of result) {
    summary[word.status]++;
    if (word.index !== null) summary.total++;
  }
  return summary;
}
