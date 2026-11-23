"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Suspense, useState, useSyncExternalStore } from "react";

import { StopSpeechButton } from "@/components/stop-speech-button";
import { VoiceCommandButton } from "@/components/voice-command";
import { WorkspaceModeStatus } from "@/components/workspace-mode-status";
import { SITE_LINKS } from "@/lib/site";

import styles from "./site-chrome.module.css";
import workspace from "./workspace.module.css";

// top: di puncak halaman (mobile: penuh & menyatu dengan hero) · float: menyusut · hidden: scroll ke bawah
type ChromeState = "top" | "float" | "hidden";
let chrome: ChromeState = "top";
let lastY = 0;
function readChrome(): ChromeState {
  const y = Math.max(0, window.scrollY); // iOS overscroll memberi nilai negatif
  const delta = y - lastY;
  if (y < 4) {
    chrome = "top";
    lastY = y;
  } else if (Math.abs(delta) > 6) {
    lastY = y;
    if (y > 160 && delta > 0) chrome = "hidden";
    // histeresis: top → float baru setelah 32px, float → top hanya di puncak, supaya tidak berkedip di batas
    else if (y > 32 || chrome !== "top") chrome = "float";
  }
  return chrome;
}

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const state = useSyncExternalStore(subscribeScroll, readChrome, () => "top" as const);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={styles.header}
      data-hidden={state === "hidden" || undefined}
      data-top={state === "top" || undefined}
      data-reader-topbar
    >
      <div className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>
            <Image src="/nuruna-logo.svg" alt="" width={30} height={30} unoptimized priority />
          </span>
          <span className={styles.brandName}>Nuruna</span>
        </Link>

        <nav aria-label="Navigasi utama" className={styles.nav}>
          <Suspense fallback={<HeaderLinks />}>
            <ActiveHeaderLinks />
          </Suspense>
        </nav>

        <div className={styles.actions}>
          <StopSpeechButton className={workspace.topbarButton} />
          <VoiceCommandButton className={workspace.topbarButton} />
          <WorkspaceModeStatus />

          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger className={styles.menuButton} aria-label="Buka menu" title="Menu">
              <Menu aria-hidden="true" size={20} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.menuOverlay} />
              <Dialog.Content className={styles.menu} aria-describedby={undefined}>
                <div className={styles.menuBar}>
                  <Dialog.Title className={styles.menuTitle}>Menu</Dialog.Title>
                  <Dialog.Close className={styles.menuButton} aria-label="Tutup menu" title="Tutup menu">
                    <X aria-hidden="true" size={20} />
                  </Dialog.Close>
                </div>
                {/* klik link mana pun (termasuk halaman aktif) menutup menu */}
                <nav aria-label="Navigasi utama" className={styles.menuNav} onClick={() => setMenuOpen(false)}>
                  <Suspense fallback={<HeaderLinks />}>
                    <ActiveHeaderLinks />
                  </Suspense>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}

function isCurrent(pathname: string, href: string, also: readonly string[] = []) {
  if (href === "/") return pathname === "/";
  return [href, ...also].some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

function HeaderLinks({ pathname }: { pathname?: string }) {
  return (
    <ul>
      {SITE_LINKS.map(({ href, label, also }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname !== undefined && isCurrent(pathname, href, also) ? "page" : undefined}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActiveHeaderLinks() {
  return <HeaderLinks pathname={usePathname()} />;
}
