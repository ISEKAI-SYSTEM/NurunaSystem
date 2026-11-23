"use client";

import {
  ArrowLeft,
  BookOpen,
  Ear,
  Eye,
  Hand,
  Lock,
  type LucideIcon,
  Mic,
  Square,
  Type,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useCanSpeak, useSpeaker } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import { canListen, listenOnce } from "@/lib/listen";
import {
  indexForKey,
  MODE_GUIDES,
  OTHER_MODES,
  otherModesScript,
  pickFromAlternatives,
  SCREEN_READER_OPTIONS,
  SCREEN_READER_QUESTION,
  screenReaderScript,
  VISION_OPTIONS,
  VISION_QUESTION,
  visionAnswerFromSpeech,
  visionScript,
  yesNoFromSpeech,
} from "@/lib/onboarding";
import { LEARNING_MODE_LABELS, type LearningMode, type Settings, updateSettings, useSettings } from "@/lib/settings";
import { needsActivation, whenSpeechAllowed } from "@/lib/speech";

import styles from "./workspace.module.css";

export const MODE_ICONS: Record<LearningMode, LucideIcon> = {
  tunanetra: Eye,
  tunarungu: Ear,
  tunawicara: Hand,
  umum: BookOpen,
};

type Step = "netra" | "pembaca-layar" | "mode-lain";
type ListenPhase = "diam" | "bersiap" | "mendengar";

type Option = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  pick: () => void;
};

const noopSubscribe = () => () => {};

export type WelcomeChoice = Partial<Pick<Settings, "voiceGuide" | "speakSetoranResult">>;

export function WelcomeScreen({
  onChoose,
  onSkip,
}: {
  onChoose: (mode: LearningMode, choice?: WelcomeChoice) => void;
  onSkip: () => void;
}) {
  const { keyboardShortcuts, dyslexiaFont } = useSettings();
  const ttsSupported = useCanSpeak();
  const voiceSupported = useSyncExternalStore(noopSubscribe, canListen, () => false);
  const { speaking, speak, stop } = useSpeaker();
  const [step, setStep] = useState<Step>("netra");
  const [waiting, setWaiting] = useState(() => needsActivation());
  const [listen, setListen] = useState<ListenPhase>("diam");
  const [message, setMessage] = useState("");
  const cancelListen = useRef<() => void>(() => {});
  const heading = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);
  const baseId = useId();

  const stopAll = useCallback(() => {
    cancelListen.current();
    cancelListen.current = () => {};
    setListen("diam");
    stop();
  }, [stop]);

  useEffect(() => () => cancelListen.current(), []);

  const goTo = useCallback(
    (next: Step) => {
      stopAll();
      setMessage("");
      setStep(next);
    },
    [stopAll],
  );

  const answerVision = useCallback((blind: boolean) => goTo(blind ? "pembaca-layar" : "mode-lain"), [goTo]);

  const answerScreenReader = useCallback(
    (usesScreenReader: boolean) => {
      stopAll();
      onChoose("tunanetra", { voiceGuide: !usesScreenReader, speakSetoranResult: !usesScreenReader });
    },
    [onChoose, stopAll],
  );

  const chooseOther = useCallback(
    (mode: LearningMode) => {
      stopAll();
      onChoose(mode);
    },
    [onChoose, stopAll],
  );

  const options: Option[] = useMemo(() => {
    if (step === "netra") {
      return VISION_OPTIONS.map((o) => ({
        id: o.answer ? "ya" : "tidak",
        icon: o.answer ? Eye : X,
        title: o.title,
        description: o.description,
        pick: () => answerVision(o.answer),
      }));
    }
    if (step === "pembaca-layar") {
      return SCREEN_READER_OPTIONS.map((o) => ({
        id: o.answer ? "ya" : "tidak",
        icon: o.answer ? Ear : Volume2,
        title: o.title,
        description: o.description,
        pick: () => answerScreenReader(o.answer),
      }));
    }
    return OTHER_MODES.map((mode) => ({
      id: mode,
      icon: MODE_ICONS[mode],
      title: MODE_GUIDES[mode].choice,
      description: `Mode ${LEARNING_MODE_LABELS[mode]}. ${MODE_GUIDES[mode].summary}`,
      pick: () => chooseOther(mode),
    }));
  }, [answerScreenReader, answerVision, chooseOther, step]);

  const script =
    step === "netra"
      ? visionScript({ voice: voiceSupported })
      : step === "pembaca-layar"
        ? screenReaderScript({ voice: voiceSupported })
        : otherModesScript({ voice: voiceSupported });

  const autoSpeak = step !== "mode-lain";
  useEffect(() => {
    heading.current?.focus();
    if (!autoSpeak) return;
    let cancel = () => {};
    const play = () => {
      setWaiting(false);
      speak(script, (error) => {
        if (error === "not-allowed") {
          setWaiting(true);
          cancel = whenSpeechAllowed(play, { wait: true });
        }
      });
    };
    cancel = whenSpeechAllowed(play);
    return () => cancel();
  }, [autoSpeak, script, speak]);

  const report = useCallback(
    (text: string) => {
      setMessage(text);
      speak(text);
    },
    [speak],
  );

  const toggleListening = useCallback(() => {
    if (listen !== "diam") {
      stopAll();
      setMessage("");
      return;
    }
    const prompt =
      step === "mode-lain" ? "Silakan ucapkan nomornya atau nama modenya." : "Silakan ucapkan ya atau tidak.";
    const begin = () => {
      setListen("mendengar");
      setMessage(`Mendengarkan… ${prompt}`);
      cancelListen.current = listenOnce({
        onResult: (alternatives) => {
          const heard = alternatives[0]?.trim();
          const quoted = heard ? `: "${heard}"` : "";
          if (step === "netra") {
            const answer = visionAnswerFromSpeech(alternatives);
            if (answer !== null) return answerVision(answer);
            report(`Belum dikenali${quoted}. Ucapkan ya atau tidak, atau tekan 1 atau 2.`);
          } else if (step === "pembaca-layar") {
            const answer = yesNoFromSpeech(alternatives);
            if (answer !== null) return answerScreenReader(answer);
            report(`Belum dikenali${quoted}. Ucapkan ya atau tidak, atau tekan 1 atau 2.`);
          } else {
            const mode = pickFromAlternatives(alternatives, OTHER_MODES);
            if (mode) return chooseOther(mode);
            report(`Belum dikenali${quoted}. Ucapkan nomor satu sampai tiga, atau tekan angkanya.`);
          }
        },
        onError: report,
        onEnd: () => setListen("diam"),
      });
    };
    stop();
    setListen("bersiap");
    setMessage(prompt);
    const spoken = speak(prompt, (error) => {
      if (error === "interrupted" || error === "canceled") return;
      begin();
    });
    if (!spoken) begin();
  }, [answerScreenReader, answerVision, chooseOther, listen, report, speak, step, stop, stopAll]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "Escape") {
        stopAll();
        return;
      }
      if (!keyboardShortcuts || !section.current?.contains(document.activeElement)) return;
      if (e.key.toLowerCase() === "v" && voiceSupported) {
        e.preventDefault();
        toggleListening();
        return;
      }
      const index = indexForKey(e.key, options.length);
      if (index === null) return;
      e.preventDefault();
      options[index].pick();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [keyboardShortcuts, options, stopAll, toggleListening, voiceSupported]);

  const answerHint =
    options.length === 2 ? " Tekan 1 untuk ya atau 2 untuk tidak." : ` Tekan angka 1 sampai ${options.length}.`;
  const keyHint = keyboardShortcuts ? `${answerHint} Bisa juga dengan Tab lalu Enter.` : "";
  const voiceHint = keyboardShortcuts && voiceSupported ? " Tekan V untuk menjawab dengan suara." : "";

  const copy = {
    netra: {
      eyebrow: "Selamat datang di Nuruna",
      title: VISION_QUESTION,
      lead: "Satu pertanyaan singkat supaya tampilan dan suara disesuaikan.",
    },
    "pembaca-layar": {
      eyebrow: "Mode Tunanetra",
      title: SCREEN_READER_QUESTION,
      lead: "Jawaban ini menentukan apakah Nuruna ikut bersuara.",
    },
    "mode-lain": {
      eyebrow: "Selamat datang di Nuruna",
      title: "Bagaimana Anda ingin belajar?",
      lead: "Pilih satu. Pilihan bisa diubah kapan saja.",
    },
  }[step];

  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-labelledby={`${baseId}-judul`}
      aria-describedby={`${baseId}-petunjuk`}
      className={styles.welcomeGate}
      data-voice-guide="off"
    >
      <div className={styles.welcomeGateIntro}>
        <p className={styles.welcomeGateEyebrow}>{copy.eyebrow}</p>
        <h1 id={`${baseId}-judul`} ref={heading} tabIndex={-1}>
          {copy.title}
        </h1>
        <p id={`${baseId}-petunjuk`}>
          {copy.lead}
          {keyHint}
          {voiceHint}
        </p>

        {ttsSupported && autoSpeak && waiting && (
          <p className={styles.welcomeGateWaiting}>
            <Volume2 aria-hidden="true" size={20} />
            Tekan Spasi atau ketuk layar di mana saja untuk mendengar pertanyaan ini.
          </p>
        )}

        <div className={styles.welcomeGateActions}>
          {ttsSupported && (
            <Button
              type="button"
              variant="outline"
              className={styles.welcomeGateSpeak}
              onClick={() => (speaking ? stop() : speak(script))}
            >
              {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
              {speaking ? "Hentikan suara" : "Dengarkan pertanyaan"}
            </Button>
          )}
          {voiceSupported && (
            <Button
              type="button"
              variant="outline"
              className={styles.welcomeGateListen}
              data-phase={listen}
              aria-describedby={`${baseId}-privasi`}
              aria-keyshortcuts={keyboardShortcuts ? "V" : undefined}
              onClick={toggleListening}
            >
              {listen === "diam" ? <Mic aria-hidden="true" /> : <Square aria-hidden="true" />}
              {listen === "diam" ? "Jawab dengan suara" : "Berhenti mendengarkan"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className={styles.welcomeGateFont}
            aria-pressed={dyslexiaFont}
            aria-describedby={`${baseId}-huruf`}
            onClick={() => updateSettings({ dyslexiaFont: !dyslexiaFont })}
          >
            <Type aria-hidden="true" />
            Huruf ramah disleksia
            <span aria-hidden="true" className={styles.welcomeGateFontState}>
              {dyslexiaFont ? "Aktif" : "Mati"}
            </span>
          </Button>
        </div>
        <p id={`${baseId}-huruf`} className="sr-only">
          Mengganti huruf Latin menjadi OpenDyslexic. Bisa diubah lagi di pengaturan halaman baca.
        </p>
      </div>

      <p role="status" className={message ? styles.welcomeGateMessage : "sr-only"}>
        {message}
      </p>

      <ul className={styles.answerGrid} role="list">
        {options.map((option, i) => (
          <li key={`${step}-${option.id}`}>
            <ChoiceCard
              baseId={`${baseId}-${step}-${option.id}`}
              icon={option.icon}
              title={option.title}
              description={option.description}
              shortcut={keyboardShortcuts ? String(i + 1) : undefined}
              onClick={option.pick}
            />
          </li>
        ))}
      </ul>

      <div className={styles.welcomeGateFooter}>
        <p id={`${baseId}-privasi`} className={styles.privacyNote}>
          <Lock aria-hidden="true" size={16} />
          Pilihan Anda hanya disimpan di perangkat ini. Mikrofon dan kamera baru dipakai setelah Anda
          izinkan, dan suara maupun gambar tidak disimpan oleh Nuruna.
        </p>
        {step === "netra" ? (
          <Button
            type="button"
            variant="ghost"
            className={styles.skipButton}
            onClick={() => {
              stopAll();
              onSkip();
            }}
          >
            Lewati, tampilkan semua fitur
          </Button>
        ) : (
          <Button type="button" variant="ghost" className={styles.skipButton} onClick={() => goTo("netra")}>
            <ArrowLeft aria-hidden="true" />
            Kembali ke pertanyaan sebelumnya
          </Button>
        )}
      </div>
    </section>
  );
}

function ChoiceCard({
  baseId,
  icon: Icon,
  title,
  description,
  shortcut,
  onClick,
}: {
  baseId: string;
  icon: LucideIcon;
  title: string;
  description: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-labelledby={`${baseId}-judul`}
      aria-describedby={`${baseId}-desk`}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      className={styles.modeCard}
    >
      <span className={styles.modeIcon}>
        <Icon aria-hidden="true" size={24} strokeWidth={1.7} />
      </span>
      <span className={styles.modeCopy}>
        <span id={`${baseId}-judul`} className={styles.modeTitle}>
          {title}
        </span>
        <span id={`${baseId}-desk`} className={styles.modeDescription}>
          {description}
        </span>
      </span>
      {shortcut && (
        <kbd aria-hidden="true" className={styles.choiceKey}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
