"use client";

import { SurahLoadError } from "@/components/quran/surah-load-error";
import { WorkspaceShell } from "@/components/workspace-shell";

export default function SurahError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <WorkspaceShell page="surah">
      <SurahLoadError error={error} retry={retry} />
    </WorkspaceShell>
  );
}
