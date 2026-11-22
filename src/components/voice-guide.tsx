"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { useSettings } from "@/lib/settings";
import { micInUse, speakIndonesian, stopSpeaking, whenSpeechAllowed } from "@/lib/speech";
import { describeElement, pageIntro, regionText } from "@/lib/voice-guide";

function mediaPlaying(): boolean {
  return Array.from(document.querySelectorAll("audio, video")).some(
    (m) => m instanceof HTMLMediaElement && !m.paused && !m.ended,
  );
}

const LIVE_REGION =
  '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]';

export function VoiceGuide() {
  const { voiceGuide } = useSettings();
  if (!voiceGuide) return null;
  return (
    <Suspense fallback={null}>
      <ActiveVoiceGuide />
    </Suspense>
  );
}

function ActiveVoiceGuide() {
  const pathname = usePathname();
  const { keyboardShortcuts, welcomeDone } = useSettings();
  const shortcuts = useRef(keyboardShortcuts);
  useEffect(() => {
    shortcuts.current = keyboardShortcuts;
  }, [keyboardShortcuts]);

  useEffect(() => {
    if (pathname === "/" && !welcomeDone) return;
    let cancel = () => {};
    const timer = window.setTimeout(() => {
      const text = pageIntro(pathname, document.title, { shortcuts: shortcuts.current });
      cancel = whenSpeechAllowed(() => {
        if (!micInUse()) speakIndonesian(text);
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [pathname, welcomeDone]);

  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (!e.target.matches(":focus-visible")) return;
      if (micInUse()) return;
      const text = describeElement(e.target);
      if (text) speakIndonesian(text);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopSpeaking();
    };

    const lastText = new WeakMap<Element, string>();
    const observer = new MutationObserver((records) => {
      const regions = new Set<Element>();
      for (const record of records) {
        const node = record.target instanceof Element ? record.target : record.target.parentElement;
        const region = node?.closest(LIVE_REGION);
        if (region && !region.closest('[aria-hidden="true"], [data-voice-guide="off"]')) regions.add(region);
      }
      for (const region of regions) {
        const text = regionText(region);
        if (text === (lastText.get(region) ?? "")) continue;
        lastText.set(region, text);
        if (!text) continue;
        const urgent = region.getAttribute("role") === "alert" || region.getAttribute("aria-live") === "assertive";
        if ((!urgent && mediaPlaying()) || micInUse()) continue;
        speakIndonesian(text, undefined, { queue: !urgent });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    const onPlay = () => stopSpeaking();
    document.addEventListener("play", onPlay, true);

    document.addEventListener("focusin", onFocus);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("keydown", onKeyDown);
      stopSpeaking();
    };
  }, []);

  return null;
}
