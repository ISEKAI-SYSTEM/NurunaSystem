"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { TafsirResponse } from "@/app/api/tafsir/[surah]/[ayat]/route";
import { AiAnswer, AiLabel } from "@/components/tanya/ai-answer";
import { useTanyaStream } from "@/components/tanya/use-tanya-stream";
import { Button } from "@/components/ui/button";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: TafsirResponse };

const cache = new Map<string, Promise<TafsirResponse>>();

function loadTafsir(verseKey: string): Promise<TafsirResponse> {
  let promise = cache.get(verseKey);
  if (!promise) {
    const [surah, ayat] = verseKey.split(":");
    promise = fetch(`/api/tafsir/${surah}/${ayat}`).then(async (res) => {
      const body = (await res.json().catch(() => null)) as
        | (TafsirResponse & { error?: string })
        | null;
      if (!res.ok || !body?.text) {
        throw new Error(body?.error ?? "Tafsir gagal dimuat.");
      }
      return body;
    });
    promise.catch(() => cache.delete(verseKey));
    cache.set(verseKey, promise);
  }
  return promise;
}

export function TafsirPanel({
  id,
  verseKey,
  verseNumber,
}: {
  id: string;
  verseKey: string;
  verseNumber: number;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [simpleOpen, setSimpleOpen] = useState(false);
  const simple = useTanyaStream();
  const surah = Number(verseKey.split(":")[0]);
  const simpleId = `${id}-sederhana`;

  function toggleSimple() {
    if (simpleOpen) {
      simple.stop();
      setSimpleOpen(false);
      return;
    }
    setSimpleOpen(true);
    if (simple.status === "siap" || simple.status === "gagal") {
      void simple.ask({ surah, ayat: verseNumber, mode: "sederhana" });
    }
  }

  useEffect(() => {
    let cancelled = false;
    loadTafsir(verseKey).then(
      (data) => !cancelled && setState({ status: "done", data }),
      (err: unknown) =>
        !cancelled &&
        setState({
          status: "error",
          message:
            err instanceof TypeError
              ? "Tafsir gagal dimuat. Periksa koneksi internet lalu coba lagi."
              : err instanceof Error
                ? err.message
                : "Tafsir gagal dimuat.",
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [verseKey, attempt]);

  return (
    <section
      id={id}
      aria-label={`Tafsir ayat ${verseNumber}`}
      className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4"
    >
      {state.status === "loading" && (
        <p role="status" className="text-muted-foreground">
          Memuat tafsir…
        </p>
      )}

      {state.status === "error" && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="font-medium text-destructive">
            {state.message}
          </p>
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Coba lagi
          </Button>
        </div>
      )}

      {state.status === "done" && (
        <>
          <div className="flex max-w-prose flex-col gap-3 text-lg leading-relaxed">
            {state.data.text
              .split(/\n+/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
          <div className="flex flex-col gap-3 border-t pt-3">
            <Button
              variant="outline"
              className="h-11 w-fit px-4 text-base"
              aria-expanded={simpleOpen}
              aria-controls={simpleOpen ? simpleId : undefined}
              onClick={toggleSimple}
            >
              <Sparkles aria-hidden="true" className="size-5" />
              {simpleOpen ? "Tutup bahasa sederhana" : "Bahasa sederhana"}
              <span className="sr-only"> untuk tafsir ayat {verseNumber}</span>
            </Button>
            {simpleOpen && (
              <section
                id={simpleId}
                aria-label={`Tafsir ayat ${verseNumber} dalam bahasa sederhana`}
                aria-busy={simple.busy}
                className="flex max-w-prose flex-col gap-3 rounded-lg border bg-background p-4"
              >
                <p className="font-semibold">Versi bahasa sederhana</p>
                {simple.status === "menunggu" && (
                  <p role="status" className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
                    Nuruna sedang menyederhanakan tafsir…
                  </p>
                )}
                {(simple.status === "menjawab" || simple.status === "selesai") && (
                  <>
                    <AiAnswer text={simple.text} />
                    <AiLabel surah={surah} ayat={verseNumber} />
                    <p className="text-sm text-muted-foreground">
                      Ini ringkasan dari AI. Tafsir aslinya tetap tertulis di atas.
                    </p>
                  </>
                )}
                {simple.status === "gagal" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <p role="alert" className="font-medium text-destructive">
                      {simple.error}
                    </p>
                    <Button
                      variant="outline"
                      className="h-11 px-4 text-base"
                      onClick={() => void simple.ask({ surah, ayat: verseNumber, mode: "sederhana" })}
                    >
                      Coba lagi
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Sumber: {state.data.source.name}, melalui{" "}
            <a
              href={state.data.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {state.data.source.provider}
              <span className="sr-only"> (membuka tab baru)</span>
            </a>
            .
          </p>
        </>
      )}
    </section>
  );
}
