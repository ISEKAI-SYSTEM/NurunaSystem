import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import styles from "./workspace.module.css";

export function WorkspaceShell({
  page,
  sidebar,
  children,
}: {
  page: "home" | "surah" | "reader" | "hafalan" | "latihan" | "isyarat" | "setoran";
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell} data-workspace={page}>
      <SiteHeader floatOnScroll={page !== "reader"} />
      <div className={sidebar ? styles.withSidebar : styles.body}>
        {sidebar}
        <main id="konten-utama" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
