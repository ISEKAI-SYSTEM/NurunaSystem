"use client";

import {
  BookOpen,
  Check,
  Ear,
  Eye,
  Hand,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";

import {
  LEARNING_MODE_LABELS,
  type LearningMode,
  applyMode,
  modeAnnouncement,
  useSettings,
} from "@/lib/settings";

import styles from "./workspace.module.css";

const MODES: { mode: LearningMode; icon: LucideIcon; description: string }[] = [
  {
    mode: "tunanetra",
    icon: Eye,
    description:
      "Teks Arab lebih besar, pintasan keyboard, dan ringkasan setoran yang dibacakan.",
  },
  {
    mode: "tunarungu",
    icon: Ear,
    description:
      "Ikuti bacaan dengan terjemahan per kata dan penanda warna tajwid.",
  },
  {
    mode: "tunawicara",
    icon: Hand,
    description:
      "Pelajari arti setiap kata dan baca ayat tanpa perlu menggunakan mikrofon.",
  },
  {
    mode: "umum",
    icon: BookOpen,
    description:
      "Mulai dengan tampilan standar untuk membaca, mendengarkan murottal, dan menghafal.",
  },
];

export function ModePicker() {
  const { mode: activeMode } = useSettings();
  const [announcement, setAnnouncement] = useState("");
  const baseId = useId();

  return (
    <>
      <ul className={styles.modeGrid} role="list">
        {MODES.map(({ mode, icon: Icon, description }) => {
          const active = mode === activeMode;
          const titleId = `${baseId}-${mode}-title`;
          const descId = `${baseId}-${mode}-desc`;
          return (
            <li key={mode}>
              <button
                type="button"
                aria-pressed={active}
                aria-labelledby={titleId}
                aria-describedby={descId}
                onClick={() => {
                  if (active) return;
                  applyMode(mode);
                  setAnnouncement(modeAnnouncement(mode));
                }}
                className={styles.modeCard}
              >
                <span className={styles.modeIcon}>
                  <Icon aria-hidden="true" size={24} strokeWidth={1.7} />
                </span>
                <span className={styles.modeCopy}>
                  <span id={titleId} className={styles.modeTitle}>
                    Mode {LEARNING_MODE_LABELS[mode]}
                  </span>
                  <span id={descId} className={styles.modeDescription}>
                    {description}
                  </span>
                </span>
                <span aria-hidden="true" className={styles.modeIndicator}>
                  {active && <Check size={14} strokeWidth={2.5} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
