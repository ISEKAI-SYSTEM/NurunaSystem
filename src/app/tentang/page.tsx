import { CircleCheck, Hammer } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  ACCESSIBILITY_STATEMENT_DATE,
  FEEDBACK_CONTACT,
  QURAN_CREDITS,
} from "@/lib/site";

import { StopSpeechButton } from "@/components/stop-speech-button";

import { BackLink } from "./back-link";
import backLinkStyles from "./back-link.module.css";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Tentang Nuruna: belajar Al-Qur'an yang inklusif untuk tunanetra, tunarungu, tunawicara, dan semua orang. Fitur, sumber data, pernyataan aksesibilitas (WCAG 2.2 AA / ISO/IEC 40500:2025), dan penggunaan AI.",
};

type Feature = { text: string; ready: boolean };

const GROUPS: { title: string; features: Feature[] }[] = [
  {
    title: "Tunanetra dan low vision",
    features: [
      { text: "Audio murottal dari qari asli untuk setiap ayat", ready: true },
      {
        text: "Semua fitur bisa dipakai dengan keyboard, dengan pintasan yang bisa dimatikan",
        ready: true,
      },
      { text: "Label dan pengumuman untuk screen reader", ready: true },
      {
        text: "Teks Arab sampai ukuran raksasa dan mode kontras tinggi",
        ready: true,
      },
      {
        text: "Setoran hafalan dengan suara, dikoreksi otomatis, dengan hasil yang bisa dibacakan",
        ready: true,
      },
      {
        text: "Mode hafalan: teks Arab disembunyikan dan bisa diintip kata demi kata",
        ready: true,
      },
      {
        text: "Perintah suara untuk membuka surah, memutar ayat, dan membuka tafsir atau setoran",
        ready: true,
      },
      {
        text: "Layar sambutan yang dibacakan dan bisa dijawab dengan suara (“ya”, “tidak”)",
        ready: true,
      },
      {
        text: "Pemandu suara di setiap halaman untuk pengguna tanpa pembaca layar",
        ready: true,
      },
    ],
  },
  {
    title: "Tunarungu",
    features: [
      { text: "Terjemahan Kemenag dan terjemahan per kata", ready: true },
      {
        text: "Sorotan kata yang sedang dibaca saat murottal diputar",
        ready: true,
      },
      {
        text: "Warna tajwid beserta daftar hukumnya dalam bentuk teks",
        ready: true,
      },
      { text: "Tafsir Kemenag per ayat dalam bentuk teks", ready: true },
      {
        text: "Mengenal huruf hijaiyah tanpa kamera, dengan mengetuk jawaban",
        ready: true,
      },
      {
        text: "Belajar isyarat hijaiyah dengan kamera, dengan gambar acuan isyarat dari pedoman Kemenag; kamera diproses di perangkat",
        ready: true,
      },
      {
        text: "Penjelasan tafsir dengan bahasa sederhana (dijelaskan oleh AI)",
        ready: true,
      },
      {
        text: "Tanya Nuruna: tanya-jawab tentang ayat berdasarkan Tafsir Kemenag",
        ready: true,
      },
      {
        text: "Tampilan Al-Qur'an Isyarat dan setoran dengan isyarat tangan juga bisa dipakai (lihat Tunawicara)",
        ready: true,
      },
    ],
  },
  {
    title: "Tunawicara",
    features: [
      { text: "Semua fitur membaca bisa dipakai tanpa berbicara", ready: true },
      { text: "Terjemahan per kata untuk membantu menghafal", ready: true },
      {
        text: "Latihan hafalan tanpa suara: susun kata, lengkapi ayat, cocokkan arti (tanpa batas waktu, tanpa seret)",
        ready: true,
      },
      {
        text: "Setoran hafalan tanpa suara: pilih kata berikutnya dari hafalan, dengan tombol atau angka 1–4",
        ready: true,
      },
      {
        text: "Setoran hafalan dengan isyarat tangan (metode kitabah Kemenag): huruf demi huruf di depan kamera, diproses di perangkat",
        ready: true,
      },
      {
        text: "Tampilan Al-Qur'an Isyarat: gambar isyarat setiap huruf di bawah kata, otomatis aktif di mode Tunawicara",
        ready: true,
      },
    ],
  },
];

const GENERAL_FEATURES = [
  "Tautan “Langsung ke konten utama” di awal setiap halaman.",
  "Garis fokus keyboard yang tebal dan selalu terlihat, tidak tertutup pemutar audio.",
  "Pintasan di halaman baca: Spasi atau K (putar/jeda), J (ayat sebelumnya), L (ayat berikutnya), R (ulangi ayat), H (mode hafalan), V (perintah suara, di semua halaman). Bisa dimatikan di pengaturan.",
  "Mode kontras tinggi dan empat ukuran teks Arab.",
  "Font Atkinson Hyperlegible yang dirancang untuk pembaca low vision.",
  "Halaman bisa diperbesar sampai 400% tanpa harus menggulir ke samping.",
  "Mode belajar (Tunanetra, Tunarungu, Tunawicara, Umum) yang menyesuaikan tampilan secara otomatis.",
  "Layar sambutan pada kunjungan pertama dimulai dengan satu pertanyaan, “Apakah Anda tunanetra?”, yang dibacakan otomatis (browser biasanya menunggu tombol pertama atau ketukan). Jawab ya atau tidak dengan angka 1/2, Tab + Enter, sentuhan, atau suara (tekan V). Tunanetra lalu ditanya apakah memakai pembaca layar; pengguna lain memilih mode Tunarungu, Tunawicara, atau Umum. Tombol angka dan V hanya berlaku selama fokus berada di layar sambutan. Escape menghentikan suara.",
  "Tombol “Hentikan suara” di bagian atas halaman setiap kali suara buatan diputar, dan selalu tampil saat pemandu suara aktif. Escape juga menghentikan suara.",
  "Pemandu suara untuk tunanetra tanpa pembaca layar: membacakan nama halaman, tombol atau tautan yang difokus, dan setiap hasil. Teks Arab tidak pernah dibacakan suara buatan, dan pemandu diam saat murottal diputar atau mikrofon merekam. Bisa dimatikan di beranda dan di pengaturan baca.",
  "Saat setoran, Anda memilih sendiri seberapa banyak teks ayat yang terlihat: semua, muncul bertahap, atau tersembunyi sampai selesai. Tidak ada batas waktu.",
  "Animasi dikurangi bila sistem operasi meminta “kurangi gerakan”.",
  "Teks Arab ditandai sebagai bahasa Arab supaya screen reader melafalkannya dengan benar.",
];

const OPEN_CRITERIA: { criterion: string; status: string; note: string }[] = [
  {
    criterion: "2.2.1 Waktu dapat diatur (A)",
    status: "Lulus dengan catatan",
    note: "Saat menjawab dengan suara, browser berhenti mendengarkan setelah beberapa detik hening. Jawaban bisa diulang kapan saja, dan selalu ada pilihan angka, Tab + Enter, atau sentuhan.",
  },
  {
    criterion: "Semua kriteria pada fitur baru",
    status: "Belum diaudit ulang",
    note: "Audit Lighthouse dan axe-core terakhir dilakukan pada 21 November 2026. Layar sambutan, pemandu suara, tombol Hentikan suara, halaman Setoran (termasuk setoran pilih kata dan isyarat tangan), tampilan Al-Qur'an Isyarat, halaman Tentang Kami, dan pembaruan halaman Isyarat sesudah tanggal itu baru ditinjau dari kode dan belum diuji ulang dengan alat otomatis.",
  },
];

const LIMITATIONS = [
  "Pengujian manual dengan screen reader (NVDA, TalkBack, VoiceOver) belum selesai. Sejauh ini kepatuhan baru diperiksa dengan alat otomatis.",
  "Uji pengguna bersama siswa tunanetra, tunarungu, dan tunawicara di SLB belum dilakukan.",
  "Pengenal isyarat dengan kamera sementara dilatih dari kumpulan data isyarat Arab publik (28 huruf, satu peraga), sehingga bisa kurang tepat untuk tangan, cahaya, atau isyarat yang sedikit berbeda dari pedoman Kemenag. Bila isyarat Anda tidak dikenali, rekam contoh isyarat Anda sendiri (hanya titik tangan, disimpan di perangkat ini, bisa dihapus). Data rekaman isyarat dari SLB sesuai pedoman Kemenag belum dikumpulkan. Setiap soal tetap bisa dijawab dengan mengetuk huruf, dan setoran tetap bisa dengan suara atau pilih kata.",
  "Setoran dengan isyarat tangan dan tampilan Al-Qur'an Isyarat baru memakai bentuk huruf. Isyarat harakat (gerakan tangan) belum diperiksa dan belum ditampilkan. Hamzah dan ta marbutah dikonfirmasi dengan tombol Lanjut bila belum ada contohnya.",
  "Pada kunjungan pertama, layar sambutan membacakan pertanyaan dengan suara Nuruna sebelum kami tahu apakah Anda memakai pembaca layar, sehingga pengguna NVDA atau TalkBack bisa mendengar dua suara sesaat. Tekan Escape untuk menghentikannya.",
  "Browser biasanya baru mengizinkan suara setelah Anda menekan tombol atau mengetuk layar, jadi panduan suara tidak selalu langsung terdengar saat halaman dibuka.",
  "Menjawab dengan suara memakai pengenal suara bawaan browser (Chrome, Edge, Safari) dan belum tersedia di Firefox. Suara bahasa Indonesia untuk pemandu suara bergantung pada perangkat Anda.",
  "Audio murottal belum disertai terjemahan bahasa isyarat.",
  "Halaman sumber tafsir di situs luar (equran.id) berada di luar kendali kami dan mungkin tidak sepenuhnya aksesibel.",
  ...(GROUPS.some((g) => g.features.some((f) => !f.ready))
    ? ["Fitur yang ditandai “sedang dikembangkan” belum tersedia."]
    : []),
];

const AI_SAFEGUARDS = [
  "AI tidak pernah membuat atau mengubah teks ayat Al-Qur'an. Teks ayat selalu diambil dari sumber yang sudah ditashih (Quran.com dan Kementerian Agama RI).",
  "Bacaan Al-Qur'an selalu rekaman qari asli, bukan suara buatan (TTS). Suara buatan hanya dipakai untuk teks antarmuka dan umpan balik berbahasa Indonesia.",
  "Setiap jawaban AI diberi label “Dijelaskan oleh AI” dan mencantumkan sumbernya, misalnya Tafsir Kemenag QS 2:255.",
  "AI tidak memberi fatwa. Untuk pertanyaan hukum agama, pengguna diarahkan ke guru atau ustadz.",
  "Mikrofon dan kamera hanya dipakai setelah Anda mengizinkan. Bila memungkinkan, pemrosesan dilakukan di perangkat Anda, dan rekaman tidak disimpan tanpa persetujuan.",
];

const SOURCES: { label: string; detail: string; href: string }[] = [
  {
    label: "Teks Al-Qur'an, audio murottal, dan terjemahan per kata",
    detail: "Quran.com API. Qari: Mishary Rashid Alafasy.",
    href: "https://api-docs.quran.com/",
  },
  {
    label: "Terjemahan dan Tafsir Kementerian Agama RI",
    detail: "Terjemahan Kemenag melalui Quran.com; tafsir melalui equran.id.",
    href: "https://equran.id/",
  },
  {
    label: "Gambar dan deskripsi isyarat hijaiyah",
    detail:
      "Pedoman Membaca Mushaf Al-Qur'an bagi Penyandang Disabilitas Sensorik Rungu Wicara, Lajnah Pentashihan Mushaf Al-Qur'an, Kemenag (2022).",
    href: "https://quran.kemenag.go.id/assets/files/Pedoman-Membaca-Mushaf-Al-Quran-Isyarat.pdf",
  },
  {
    label: "Data contoh pengenal isyarat",
    detail:
      "ArSL-31-Pilot oleh Youssef Farhan & Abdessalam Ait Madi (Universitas Ibn Tofail), lisensi CC BY 4.0.",
    href: "https://zenodo.org/records/18363162",
  },
];

const CONTENTS: [string, string][] = [
  ["#tentang-nuruna", "Apa itu Nuruna"],
  ["#per-kelompok", "Fitur"],
  ["#sumber", "Sumber data"],
  ["#aksesibilitas", "Pernyataan aksesibilitas"],
  ["#ai", "Penggunaan AI"],
  ["#umpan-balik", "Umpan balik"],
];

const linkClass =
  "font-semibold text-[var(--home-accent)] underline underline-offset-4";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-[1.25rem] border border-[var(--home-line)] bg-[var(--home-surface)] p-6 sm:p-8"
    >
      <h2 id={id} className="text-2xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-6 text-lg leading-relaxed marker:text-[var(--home-accent)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TentangPage() {
  return (
    <div className="flex flex-1 flex-col bg-[var(--home-paper)] text-[var(--home-ink)]">
      <main
        id="konten-utama"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12"
      >
        <header className="flex flex-col gap-3 pb-4">
          <div className="mb-5 flex flex-wrap gap-3">
            <BackLink />
            <StopSpeechButton className={backLinkStyles.backLink} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tentang Kami
          </h1>
          <p className="text-lg leading-relaxed">
            Nuruna dibuat supaya Al-Qur&apos;an bisa dipelajari oleh semua
            orang, termasuk teman-teman tunanetra, tunarungu, dan tunawicara.
            Aksesibilitas adalah syarat utama setiap fitur, bukan tambahan.
          </p>
          <nav aria-label="Isi halaman">
            <ul className="flex flex-wrap gap-x-5 text-base">
              {CONTENTS.map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className={`inline-flex min-h-11 items-center ${linkClass}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <Section id="tentang-nuruna" title="Apa itu Nuruna">
          <p className="text-lg leading-relaxed">
            Nuruna adalah aplikasi web untuk belajar Al-Qur&apos;an. membaca
            dengan terjemahan dan tafsir Kemenag, mendengarkan murottal qari
            asli, menghafal, lalu menyetorkan hafalan dengan suara, dengan
            memilih kata, atau dengan isyarat tangan. Ada juga belajar isyarat
            huruf hijaiyah dan Tanya Nuruna untuk bertanya tentang ayat.
          </p>
        </Section>

        <Section id="per-kelompok" title="Fitur untuk setiap kelompok pengguna">
          <div className="flex flex-col divide-y divide-[var(--home-line)]">
            {GROUPS.map((group) => (
              <div
                key={group.title}
                className="flex flex-col gap-3 py-5 first:pt-1 last:pb-0"
              >
                <h3 className="text-xl font-semibold">{group.title}</h3>
                <ul className="flex flex-col gap-2 text-lg leading-relaxed">
                  {group.features.map(({ text, ready }) => (
                    <li key={text} className="flex items-start gap-3">
                      {ready ? (
                        <CircleCheck
                          aria-hidden="true"
                          className="mt-1 size-5 shrink-0 text-[var(--home-accent)]"
                        />
                      ) : (
                        <Hammer
                          aria-hidden="true"
                          className="mt-1 size-5 shrink-0 text-[var(--home-gold-line)]"
                        />
                      )}
                      <span>
                        {text}
                        <span
                          className={
                            ready
                              ? "inline-block rounded-full bg-[var(--home-selected)] px-2.5 text-sm font-semibold whitespace-nowrap text-[var(--home-accent)]"
                              : "inline-block rounded-full bg-[var(--home-icon)] px-2.5 text-sm font-semibold whitespace-nowrap text-[var(--home-ink)]"
                          }
                        >
                          ({ready ? "tersedia" : "sedang dikembangkan"})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="sumber" title="Sumber data">
          <p className="text-lg leading-relaxed">
            Teks ayat tidak pernah ditulis manual atau dibuat AI; semuanya
            diambil dari sumber yang sudah ditashih.
          </p>
          <ul className="flex flex-col gap-3 text-lg leading-relaxed">
            {SOURCES.map(({ label, detail, href }) => (
              <li key={label} className="flex flex-col">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {label}
                  <span className="sr-only"> (membuka tab baru)</span>
                </a>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="aksesibilitas" title="Pernyataan aksesibilitas">
          <p className="text-lg leading-relaxed">
            Nuruna dikembangkan mengacu pada{" "}
            <strong>WCAG 2.2 tingkat AA</strong>, yang juga diterbitkan sebagai
            standar internasional <strong>ISO/IEC 40500:2025</strong>.
          </p>
        </Section>

        <Section
          id="fitur-umum"
          title="Fitur aksesibilitas yang sudah tersedia"
        >
          <BulletList items={GENERAL_FEATURES} />
        </Section>

        <Section id="teknologi-bantu" title="Teknologi bantu">
          <p className="text-lg leading-relaxed">
            Nuruna dirancang untuk bekerja dengan browser modern (Chrome, Edge,
            Firefox, Safari) dan screen reader NVDA, JAWS, TalkBack, serta
            VoiceOver. Halaman ini memakai HTML yang semantis, label ARIA, dan
            urutan fokus yang logis.
          </p>
        </Section>

        <Section id="keterbatasan" title="Keterbatasan yang kami ketahui">
          <BulletList items={LIMITATIONS} />
        </Section>

        <Section id="ai" title="Penggunaan AI dan pengamannya">
          <BulletList items={AI_SAFEGUARDS} />
        </Section>

        <Section id="umpan-balik" title="Umpan balik">
          <p className="text-lg leading-relaxed">
            Menemukan bagian yang sulit dipakai? Kami ingin tahu, supaya bisa
            memperbaikinya.
          </p>
          {FEEDBACK_CONTACT ? (
            <p className="text-lg">
              Hubungi kami di{" "}
              <a href={FEEDBACK_CONTACT.href} className={linkClass}>
                {FEEDBACK_CONTACT.label}
              </a>
              .
            </p>
          ) : (
            <p className="text-lg">
              Saluran umpan balik sedang disiapkan dan akan dicantumkan di sini.
            </p>
          )}
        </Section>

        <footer className="border-t border-[var(--home-line)] pt-4 text-sm text-[var(--home-muted)]">
          <p>{QURAN_CREDITS}</p>
        </footer>
      </main>
    </div>
  );
}
