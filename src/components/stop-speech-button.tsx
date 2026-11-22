"use client";

import { Square } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { isSpeaking, stopSpeaking, subscribeSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

export function StopSpeechButton({ className }: { className?: string }) {
  const speaking = useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false);
  const { voiceGuide } = useSettings();
  const [focused, setFocused] = useState(false);

  if (!speaking && !voiceGuide && !focused) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-11 px-4 text-base", className)}
      aria-keyshortcuts="Escape"
      onClick={stopSpeaking}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <Square aria-hidden="true" className="size-5" />
      <span data-label="">Hentikan suara</span>
    </Button>
  );
}
