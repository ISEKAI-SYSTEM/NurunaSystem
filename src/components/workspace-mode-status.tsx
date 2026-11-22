"use client";

import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useRef, useState } from "react";

import { preserveReadingPosition } from "@/components/quran/reader-position";
import { Button } from "@/components/ui/button";
import {
  applyMode,
  isLearningMode,
  LEARNING_MODE_LABELS,
  LEARNING_MODES,
  modeAnnouncement,
  useSettings,
} from "@/lib/settings";

import styles from "./workspace.module.css";

export function WorkspaceModeStatus() {
  const { mode } = useSettings();
  const [announcement, setAnnouncement] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const interactedOutside = useRef(false);
  const name = mode ? LEARNING_MODE_LABELS[mode] : null;
  const text = name ? `Mode: ${name}` : "Pilih mode";
  const label = name ? `${text}. Ubah mode belajar` : "Pilih mode belajar";

  return (
    <div className={styles.modePicker}>
      <DropdownMenu.Root modal={false} onOpenChange={(open) => {
        if (open) interactedOutside.current = false;
      }}>
        <DropdownMenu.Trigger asChild>
          <Button ref={trigger} variant="outline" className={styles.modeStatus} aria-label={label} title={label}>
            <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
            <span className={styles.modeLabel} data-label="">{text}</span>
            <ChevronDown aria-hidden="true" className={styles.modeChevron} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className={styles.modeMenu}
          onInteractOutside={() => { interactedOutside.current = true; }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!interactedOutside.current) trigger.current?.focus({ preventScroll: true });
          }}
        >
          <DropdownMenu.Label className={styles.modeMenuLabel}>Mode belajar</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={mode ?? ""}
            onValueChange={(value) => {
              if (!isLearningMode(value)) return;
              preserveReadingPosition(() => applyMode(value));
              setAnnouncement(modeAnnouncement(value));
            }}
          >
            {LEARNING_MODES.map((option) => (
              <DropdownMenu.RadioItem key={option} value={option} className={styles.modeMenuItem}>
                {LEARNING_MODE_LABELS[option]}
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden="true" size={17} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <p role="status" className="sr-only">{announcement}</p>
    </div>
  );
}
