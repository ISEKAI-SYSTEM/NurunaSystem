import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

import { HomeContent } from "@/components/home-content";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";

import styles from "@/components/workspace.module.css";

export default function Home() {
  return (
    <WorkspaceShell page="home">
      <HomeContent
        hero={
          <header className={styles.welcome} data-hero>
            <div className={styles.welcomeCopy}>
              <h1>
                Belajar Al-Qur’an,<br /> dengan cara Anda.
              </h1>
              <p>
                Baca, dengarkan murottal, dan latih hafalan dengan pengaturan
                yang bisa Anda sesuaikan.
              </p>
              <Button asChild className={styles.start}>
                <Link href="/surah">
                  <BookOpen aria-hidden="true" />
                  Mulai membaca
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </header>
        }
      />
    </WorkspaceShell>
  );
}
