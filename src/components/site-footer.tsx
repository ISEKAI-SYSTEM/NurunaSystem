import Image from "next/image";
import Link from "next/link";

import { QURAN_CREDITS, SITE_LINKS } from "@/lib/site";

import styles from "./site-chrome.module.css";

const SOURCES = [
  { href: "https://api-docs.quran.com/", label: "Quran.com API" },
  { href: "https://quran.com/", label: "Quran.com" },
  { href: "https://equran.id/", label: "equran.id (tafsir)" },
] as const;

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>
              <Image src="/nuruna-logo.svg" alt="" width={30} height={30} unoptimized />
            </span>
            <span className={styles.brandName}>Nuruna</span>
          </Link>
          <p>
            Belajar Al-Qur’an yang inklusif untuk tunanetra, tunarungu,
            tunawicara, dan semua orang.
          </p>
        </div>

        <nav aria-labelledby="footer-jelajahi" className={styles.footerColumn}>
          <h2 id="footer-jelajahi">Jelajahi</h2>
          <ul>
            {SITE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.footerColumn}>
          <h2>Sumber data</h2>
          <ul>
            {SOURCES.map(({ href, label }) => (
              <li key={href}>
                <a href={href} rel="noopener">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>{QURAN_CREDITS}</p>
        <p>
          Dibuat oleh <strong>Isekai System</strong> · Data Al-Qur’an dari{" "}
          <a href="https://api-docs.quran.com/" rel="noopener">
            Quran.com API
          </a>
        </p>
      </div>
    </footer>
  );
}
