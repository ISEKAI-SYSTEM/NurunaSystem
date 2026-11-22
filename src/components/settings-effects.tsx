"use client";

import { useEffect } from "react";

import { useSettings } from "@/lib/settings";

export function SettingsEffects() {
  const { highContrast, arabicSize } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.dataset.contrast = "tinggi";
    else delete root.dataset.contrast;
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.dataset.arabicSize = arabicSize;
  }, [arabicSize]);

  return null;
}
