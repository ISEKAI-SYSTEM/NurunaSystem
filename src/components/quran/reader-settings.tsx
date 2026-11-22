"use client";

import { Settings2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { type RefObject, useId, useState } from "react";

import {
  ARABIC_SIZES,
  ARABIC_SIZE_LABELS,
  type ArabicSize,
  LEARNING_MODES,
  LEARNING_MODE_LABELS,
  type Settings,
  applyMode,
  isLearningMode,
  modeAnnouncement,
  updateSettings,
  useSettings,
} from "@/lib/settings";

import { preserveReadingPosition } from "./reader-position";
import styles from "./surah-reader.module.css";

type ToggleKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const toggles: { key: ToggleKey; label: string; hint?: string }[] = [
  { key: "showTranslation", label: "Tampilkan terjemahan" },
  {
    key: "showWordByWord",
    label: "Terjemahan per kata",
    hint: "Arti ditampilkan di bawah setiap kata Arab.",
  },
  {
    key: "showIsyarat",
    label: "Isyarat huruf (Al-Qur'an Isyarat)",
    hint: "Gambar isyarat tangan setiap huruf di bawah kata, metode kitabah Kemenag. Harakat (gerakan) belum ditampilkan.",
  },
  {
    key: "showTajweed",
    label: "Warna tajwid",
    hint: "Huruf diwarnai sesuai hukum tajwid. Keterangan warna dan daftar hukum di tiap ayat ikut ditampilkan.",
  },
  {
    key: "hafalanMode",
    label: "Mode hafalan",
    hint: "Teks Arab disembunyikan supaya Anda membaca dari hafalan. Kata bisa diintip satu per satu.",
  },
  { key: "highContrast", label: "Kontras tinggi" },
  {
    key: "continuousPlay",
    label: "Putar berkelanjutan",
    hint: "Lanjut otomatis ke ayat berikutnya.",
  },
  {
    key: "speakSetoranResult",
    label: "Bacakan hasil setoran & perintah suara",
    hint: "Hasil setoran dan jawaban perintah suara dibacakan dengan suara. Matikan bila Anda memakai screen reader, supaya tidak dibacakan dua kali.",
  },
  {
    key: "voiceGuide",
    label: "Pemandu suara",
    hint: "Bacakan nama halaman, tombol atau tautan yang difokus, dan setiap hasil. Teks Arab tidak dibacakan; ayat tetap dari suara qari. Matikan bila Anda memakai NVDA, TalkBack, atau VoiceOver. Escape menghentikan suara.",
  },
  {
    key: "keyboardShortcuts",
    label: "Pintasan keyboard",
    hint: "Spasi/K putar atau jeda, J ayat sebelumnya, L ayat berikutnya, R ulangi ayat, H mode hafalan, V perintah suara.",
  },
];

export function ReaderSettings({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const settings = useSettings();
  const modeId = useId();
  const sizeId = useId();
  const [modeMessage, setModeMessage] = useState("");
  const baseId = useId();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.sheetOverlay} />
        <Dialog.Content
          className={styles.sheet}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <div className={styles.sheetBar}>
            <Settings2 aria-hidden="true" size={20} />
            <Dialog.Title className={styles.sheetTitle}>Pengaturan tampilan &amp; audio</Dialog.Title>
            <Dialog.Close className={styles.sheetClose} aria-label="Tutup pengaturan" title="Tutup pengaturan">
              <X aria-hidden="true" size={20} />
            </Dialog.Close>
          </div>

          <div className={styles.sheetBody}>
            <div className="flex flex-col gap-2">
              <label htmlFor={modeId} className="font-medium">
                Mode belajar
              </label>
              <select
                id={modeId}
                value={settings.mode ?? ""}
                aria-describedby={`${modeId}-hint`}
                onChange={(e) => {
                  const mode = e.target.value;
                  if (!isLearningMode(mode)) return;
                  preserveReadingPosition(() => applyMode(mode));
                  setModeMessage(modeAnnouncement(mode));
                }}
                className={styles.sheetSelect}
              >
                {settings.mode === null && (
                  <option value="" disabled>
                    Belum dipilih
                  </option>
                )}
                {LEARNING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {LEARNING_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
              <span id={`${modeId}-hint`} className="text-sm text-muted-foreground">
                Mengganti mode menyetel ulang ukuran teks dan pilihan tampilan di
                bawah sesuai mode tersebut.
              </span>
              <p role="status" className="text-sm font-medium">
                {modeMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={sizeId} className="font-medium">
                Ukuran teks Arab
              </label>
              <select
                id={sizeId}
                value={settings.arabicSize}
                onChange={(e) => preserveReadingPosition(() =>
                  updateSettings({ arabicSize: e.target.value as ArabicSize }),
                )}
                className={styles.sheetSelect}
              >
                {ARABIC_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {ARABIC_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 font-medium">Pilihan</legend>
              {toggles.map(({ key, label, hint }) => {
                const id = `${baseId}-${key}`;
                return (
                  <div key={key} className={styles.sheetOption}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => preserveReadingPosition(() => updateSettings({ [key]: e.target.checked }))}
                      aria-describedby={hint ? `${id}-hint` : undefined}
                      className={styles.sheetCheck}
                    />
                    <div className="flex flex-col">
                      <label htmlFor={id} className="text-base">
                        {label}
                      </label>
                      {hint && (
                        <span
                          id={`${id}-hint`}
                          className="text-sm text-muted-foreground"
                        >
                          {hint}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </fieldset>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
