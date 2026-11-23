import type { Metadata } from "next";

import { SurahList } from "@/components/quran/surah-list";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getChapters, getJuzs } from "@/lib/quran/api";

export const metadata: Metadata = {
  title: "Daftar Surah",
  description: "Daftar 114 surah Al-Qur'an beserta arti dan jumlah ayatnya.",
};

export default async function SurahIndexPage() {
  const [chapters, juzs] = await Promise.all([getChapters(), getJuzs().catch(() => null)]);

  return (
    <WorkspaceShell page="surah">
      <SurahList chapters={chapters} juzs={juzs} fullBleed title="Al-Qur'an" intro="Daftar Surah" />
    </WorkspaceShell>
  );
}
