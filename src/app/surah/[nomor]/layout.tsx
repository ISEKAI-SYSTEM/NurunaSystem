import { Suspense } from "react";

import { SurahIndexPanel } from "@/components/quran/surah-index-panel";
import styles from "@/components/quran/surah-index-panel.module.css";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getChapters } from "@/lib/quran/api";

export default function ReaderLayout({ children, params }: LayoutProps<"/surah/[nomor]">) {
  return (
    <WorkspaceShell
      page="reader"
      sidebar={
        <Suspense fallback={<p role="status" className={styles.placeholder}>Memuat daftar surah…</p>}>
          <ReaderIndex params={params} />
        </Suspense>
      }
    >
      {children}
    </WorkspaceShell>
  );
}

async function ReaderIndex({ params }: Pick<LayoutProps<"/surah/[nomor]">, "params">) {
  const [{ nomor }, chapters] = await Promise.all([params, getChapters().catch(() => null)]);

  if (!chapters) return <p className={styles.placeholder}>Daftar surah tidak dapat dimuat.</p>;

  return <SurahIndexPanel chapters={chapters} current={nomor} />;
}
