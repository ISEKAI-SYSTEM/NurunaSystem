"use client";

import { Loader2, Send, Square, Volume2 } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { canSpeak, speakIndonesian } from "@/lib/speech";
import { answerPlainText } from "@/lib/tanya/format";
import { MAX_QUESTION_LENGTH, type TanyaTurn } from "@/lib/tanya/types";

import { AiAnswer, AiLabel } from "./ai-answer";
import { useTanyaStream } from "./use-tanya-stream";

const EXAMPLE_QUESTIONS = [
  "Apa makna ayat ini?",
  "Apa pelajaran dari ayat ini?",
  "Mengapa ayat ini penting?",
];

export function TanyaPanel({
  id,
  surah,
  ayat,
}: {
  id: string;
  surah: number;
  ayat: number;
}) {
  const headingId = useId();
  const inputId = useId();
  const simpleId = useId();
  const { mode } = useSettings();
  const [simple, setSimple] = useState(mode === "tunarungu");
  const [turns, setTurns] = useState<TanyaTurn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { status, text, error, ask, stop, busy } = useTanyaStream();

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setPending(q);
    setLastFailed(null);
    setInput("");
    setAnnouncement("Pertanyaan terkirim. Nuruna sedang menyiapkan jawaban.");
    const answer = await ask({ surah, ayat, mode: "tanya", question: q, simple, history: turns });
    setPending(null);
    if (answer) {
      setTurns((prev) => [...prev, { question: q, answer }]);
      setAnnouncement(`Jawaban Nuruna: ${answerPlainText(answer)}`);
    } else {
      setLastFailed(q);
      setAnnouncement("");
    }
    inputRef.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4"
    >
      <h3 id={headingId} className="text-lg font-semibold">
        Tanya Nuruna tentang ayat {ayat}
      </h3>
      <p className="max-w-prose text-base leading-relaxed">
        Nuruna menjawab dengan AI, hanya berdasarkan Tafsir Kemenag RI. AI bisa
        keliru; untuk hal penting, tanyakan kepada guru atau ustadz. Nuruna
        tidak menulis teks ayat dan tidak memberi fatwa.
      </p>

      {(turns.length > 0 || pending) && (
        <div className="flex flex-col gap-5">
          {turns.map((turn, i) => (
            <div key={i} className="flex flex-col gap-3">
              <p className="text-lg">
                <span className="font-semibold">Anda: </span>
                {turn.question}
              </p>
              <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
                <p className="font-semibold">Nuruna:</p>
                <AiAnswer text={turn.answer} />
                <AiLabel surah={surah} ayat={ayat} />
                {canSpeak() && (
                  <Button
                    variant="outline"
                    className="h-11 w-fit px-4 text-base"
                    onClick={() => speakIndonesian(answerPlainText(turn.answer))}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                    Bacakan jawaban
                    <span className="sr-only"> {i + 1}</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex flex-col gap-3">
              <p className="text-lg">
                <span className="font-semibold">Anda: </span>
                {pending}
              </p>
              <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
                <p className="font-semibold">Nuruna:</p>
                {status === "menunggu" ? (
                  <p className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
                    Nuruna sedang menyiapkan jawaban…
                  </p>
                ) : (
                  <div aria-hidden={busy || undefined}>
                    <AiAnswer text={text} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium text-destructive">{error}</p>
          {lastFailed && (
            <Button
              variant="outline"
              className="h-11 px-4 text-base"
              onClick={() => void send(lastFailed)}
            >
              Coba lagi
            </Button>
          )}
        </div>
      )}

      {turns.length === 0 && !pending && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Contoh pertanyaan:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outline"
                className="h-11 px-4 text-base"
                onClick={() => void send(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor={inputId} className="font-medium">
          Pertanyaan Anda
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          value={input}
          maxLength={MAX_QUESTION_LENGTH}
          rows={2}
          aria-describedby={`${inputId}-hint`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base"
        />
        <span id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          Enter untuk mengirim, Shift+Enter untuk baris baru. Maksimal{" "}
          {MAX_QUESTION_LENGTH} karakter.
        </span>
        <div className="flex items-center gap-2">
          <input
            id={simpleId}
            type="checkbox"
            checked={simple}
            onChange={(e) => setSimple(e.target.checked)}
            className="size-6 accent-primary"
          />
          <label htmlFor={simpleId} className="text-base">
            Jawab dengan bahasa sederhana
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 px-5 text-base" disabled={busy || !input.trim()}>
            <Send aria-hidden="true" className="size-5" />
            Kirim
          </Button>
          {busy && (
            <Button type="button" variant="outline" className="h-11 px-4 text-base" onClick={stop}>
              <Square aria-hidden="true" className="size-5" />
              Hentikan
            </Button>
          )}
        </div>
      </form>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
