import Image from "next/image";

import { signImageFor } from "@/lib/isyarat/kemenag";
import { signSteps } from "@/lib/setoran/isyarat";

export function WordSigns({ text }: { text: string }) {
  const steps = signSteps(text);
  if (steps.length === 0) return null;
  const names = steps.map((s) => (s.char === "ى" ? "Alif maqsurah" : s.name));
  return (
    <span
      role="img"
      aria-label={`Isyarat: ${names.join(", ")}`}
      dir="rtl"
      className="flex max-w-72 flex-wrap justify-center gap-0.5"
    >
      {steps.map((step, i) => {
        const src = signImageFor(step.id, step.char);
        return src ? (
          <Image
            key={i}
            src={src}
            alt=""
            width={36}
            height={36}
            className="size-8 rounded-sm bg-white"
          />
        ) : (
          <span key={i} lang="ar" className="grid size-8 place-items-center font-quran text-lg">
            {step.char}
          </span>
        );
      })}
    </span>
  );
}
