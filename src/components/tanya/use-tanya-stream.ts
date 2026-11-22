"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { TanyaMode, TanyaTurn } from "@/lib/tanya/types";

export type TanyaStatus = "siap" | "menunggu" | "menjawab" | "selesai" | "gagal";

type AskParams = {
  surah: number;
  ayat: number;
  mode: TanyaMode;
  question?: string;
  simple?: boolean;
  history?: TanyaTurn[];
};

export function useTanyaStream() {
  const [status, setStatus] = useState<TanyaStatus>("siap");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const ask = useCallback(async (params: AskParams): Promise<string | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText("");
    setError("");
    setStatus("menunggu");

    let full = "";
    try {
      const res = await fetch("/api/ai/tanya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      if (!res.ok || !res.body || !res.headers.get("content-type")?.startsWith("text/plain")) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Tanya Nuruna sedang tidak bisa menjawab. Coba lagi.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStatus("menjawab");
        setText(full);
      }
      full += decoder.decode();
      setText(full);
      setStatus("selesai");
      return full;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus(full ? "selesai" : "siap");
        return null;
      }
      const message =
        err instanceof TypeError
          ? "Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi."
          : err instanceof Error
            ? err.message
            : "Tanya Nuruna sedang tidak bisa menjawab. Coba lagi.";
      setError(message);
      setStatus("gagal");
      return null;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return { status, text, error, ask, stop, busy: status === "menunggu" || status === "menjawab" };
}
