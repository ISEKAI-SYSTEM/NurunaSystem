"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";

import { StopSpeechButton } from "@/components/stop-speech-button";
import { VoiceCommandButton } from "@/components/voice-command";
import { WorkspaceModeStatus } from "@/components/workspace-mode-status";
import { SITE_LINKS } from "@/lib/site";

import styles from "./site-chrome.module.css";
import workspace from "./workspace.module.css";

let hidden = false;
let lastY = 0;
function readHidden() {
  const y = window.scrollY;
  const delta = y - lastY;
  if (Math.abs(delta) > 6 || y < 4) {
    hidden = y > 160 && delta > 0;
    lastY = y;
  }
  return hidden;
}

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const hidden = useSyncExternalStore(subscribeScroll, readHidden, () => false);

  return (
    <header
      className={styles.header}
      data-hidden={hidden || undefined}
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
