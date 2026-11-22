"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import styles from "./surah-list.module.css";

export function SurahLoadError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.loadError}>
      <h1>Data surah gagal dimuat</h1>
      <p role="alert">
        Server Al-Qur’an sedang tidak bisa dihubungi. Periksa koneksi internet,
        lalu coba lagi.
      </p>
      <Button className={styles.recoveryButton} onClick={retry}>
        <RotateCw aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  );
}
