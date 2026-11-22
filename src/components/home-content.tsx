"use client";

import { RotateCcw, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { ModePicker } from "@/components/mode-picker";
import { Button } from "@/components/ui/button";
import { WelcomeScreen } from "@/components/welcome-screen";
import { applyMode, modeAnnouncement, updateSettings, useSettings } from "@/lib/settings";

import styles from "./workspace.module.css";

const noopSubscribe = () => () => {};

export function HomeContent({ hero }: { hero: ReactNode }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { mode, welcomeDone, voiceGuide } = useSettings();
  const [announcement, setAnnouncement] = useState("");
  const guideHintId = useId();
  const focusHeading = useRef(false);

  useEffect(() => {
    if (!welcomeDone || !focusHeading.current) return;
    focusHeading.current = false;
    const heading = document.querySelector<HTMLElement>("#konten-utama h1");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
  }, [welcomeDone]);

  return (
    <>
      {hydrated && !welcomeDone ? (
        <WelcomeScreen
          onChoose={(m, choice) => {
            applyMode(m, choice);
            focusHeading.current = true;
            setAnnouncement(
              choice?.voiceGuide
                ? `${modeAnnouncement(m)} Pemandu suara aktif. Tekan Escape untuk menghentikan suara.`
                : modeAnnouncement(m),
            );
          }}
          onSkip={() => {
            updateSettings({ welcomeDone: true });
            focusHeading.current = true;
            setAnnouncement("Layar sambutan dilewati. Semua fitur ditampilkan dengan tampilan standar.");
          }}
        />
      ) : (
        <>
          {hero}

          <section
            id="pilih-mode"
            tabIndex={-1}
            aria-labelledby="judul-mode"
            className={styles.modes}
          >
            <h2 id="judul-mode">{mode ? "Ganti mode belajar" : "Pilih mode belajar"}</h2>
            <p>
              Mode menyesuaikan tampilan dan audio. Ubah pengaturannya kapan
              saja di halaman baca.
            </p>
            <ModePicker />
            {hydrated && (mode === "tunanetra" || voiceGuide) && (
              <div className={styles.guideToggleRow}>
                <Button
                  type="button"
                  variant="outline"
                  className={styles.guideToggle}
                  aria-pressed={voiceGuide}
                  aria-describedby={guideHintId}
                  onClick={() => updateSettings({ voiceGuide: !voiceGuide })}
                >
                  <Volume2 aria-hidden="true" />
                  Pemandu suara
                  <span aria-hidden="true" className={styles.guideToggleState}>
                    {voiceGuide ? "Aktif" : "Mati"}
                  </span>
                </Button>
                <p id={guideHintId}>
                  Membacakan nama halaman, menu yang dipilih, dan setiap hasil. Matikan bila Anda
                  memakai NVDA, TalkBack, atau VoiceOver.
                </p>
              </div>
            )}
            {hydrated && (
              <Button
                type="button"
                variant="ghost"
                className={styles.skipButton}
                onClick={() => {
                  setAnnouncement("");
                  updateSettings({ welcomeDone: false });
                }}
              >
                <RotateCcw aria-hidden="true" />
                Buka lagi layar sambutan
              </Button>
            )}
          </section>
        </>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
