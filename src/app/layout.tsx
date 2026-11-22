import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Atkinson_Hyperlegible_Next, Geist_Mono } from "next/font/google";
import { SettingsEffects } from "@/components/settings-effects";
import { VoiceGuide } from "@/components/voice-guide";

import "./globals.css";

const fontSans = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const fontQuran = Amiri_Quran({
  variable: "--font-quran",
  weight: "400",
  subsets: ["arabic"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nuruna",
    template: "%s · Nuruna",
  },
  description:
    "Platform belajar Al-Qur'an yang inklusif untuk tunanetra, tunarungu, tunawicara, dan semua orang, dengan bantuan AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      dir="ltr"
      className={`${fontSans.variable} ${fontQuran.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#konten-utama" className="skip-link">
          Langsung ke konten utama
        </a>
        <SettingsEffects />
        <VoiceGuide />
        {children}
      </body>
    </html>
  );
}
