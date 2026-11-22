"use client";

import { Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { canSpeak, speakIndonesian, stopSpeaking } from "@/lib/speech";

const noopSubscribe = () => () => {};

export function useCanSpeak(): boolean {
  return useSyncExternalStore(noopSubscribe, canSpeak, () => false);
}

export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const run = useRef(0);
  const active = useRef(false);

  useEffect(
    () => () => {
      run.current += 1;
      if (active.current) stopSpeaking();
    },
    [],
  );

  const speak = useCallback((text: string, onDone?: (error?: string) => void) => {
    const id = ++run.current;
    const started = speakIndonesian(text, (error) => {
      if (run.current !== id) return;
      active.current = false;
      setSpeaking(false);
      onDone?.(error);
    });
    active.current = started;
    setSpeaking(started);
    return started;
  }, []);

  const stop = useCallback(() => {
    run.current += 1;
    if (active.current) stopSpeaking();
    active.current = false;
    setSpeaking(false);
  }, []);

  return { speaking, speak, stop };
}

export function SpeakButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const supported = useCanSpeak();
  const { speaking, speak, stop } = useSpeaker();

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => (speaking ? stop() : speak(text))}
    >
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {speaking ? "Hentikan suara" : label}
    </Button>
  );
}
