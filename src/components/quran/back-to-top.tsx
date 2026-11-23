"use client";

import { ArrowUp } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function BackToTop({ className, label }: { className: string; label?: string }) {
  const visible = useSyncExternalStore(
    subscribe,
    () => window.scrollY > window.innerHeight * 0.6,
    () => false,
  );

  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size={label ? "default" : "icon"}
      className={className}
      data-to-top=""
      aria-label={label ? undefined : "Kembali ke atas"}
      title="Kembali ke atas"
      onClick={() => {
        const target =
          document.querySelector<HTMLElement>("main h1[tabindex]") ??
          document.getElementById("konten-utama");
        target?.focus({ preventScroll: true });
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }}
    >
      <ArrowUp aria-hidden="true" className="size-5" />
      {label && <span data-label="">{label}</span>}
    </Button>
  );
}
