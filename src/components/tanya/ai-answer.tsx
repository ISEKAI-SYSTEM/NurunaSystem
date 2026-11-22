import { Sparkles } from "lucide-react";
import Link from "next/link";

import { formatAnswer } from "@/lib/tanya/format";

export function AiAnswer({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-lg leading-relaxed">
      {formatAnswer(text).map((paragraph, i) => (
        <p key={i}>
          {paragraph.map((part, j) =>
            part.type === "ref" ? (
              <Link
                key={j}
                href={`/surah/${part.surah}#ayat-${part.ayat}`}
                className="font-medium underline underline-offset-4"
              >
                {part.label}
              </Link>
            ) : (
              <span key={j}>{part.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

export function AiLabel({ surah, ayat }: { surah: number; ayat: number }) {
  return (
    <p className="inline-flex flex-wrap items-center gap-x-2 text-sm font-medium text-muted-foreground">
      <Sparkles aria-hidden="true" className="size-4" />
      Dijelaskan oleh AI · Sumber: Tafsir Kemenag RI, QS {surah}:{ayat}
    </p>
  );
}
