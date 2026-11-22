import { SITE_LINKS } from "@/lib/site";

const ARABIC = /[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-﻿]+/g;

export function stripArabic(text: string): string {
  return text
    .replace(ARABIC, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_LENGTH = 240;

export function shorten(text: string, max = MAX_LENGTH): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max / 2 ? space : max)}…`;
}

export function menuList(): string {
  const labels = SITE_LINKS.filter((l) => l.href !== "/").map((l) => l.label);
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")}, dan ${labels.at(-1)}` : (labels[0] ?? "");
}

export function pageName(title: string): string {
  return title.split(" · ")[0]?.trim() || "Nuruna";
}

export function pageIntro(
  pathname: string,
  title: string,
  { shortcuts }: { shortcuts: boolean },
): string {
  const name = pageName(title);
  if (pathname === "/") {
    return [
      `Beranda Nuruna. Menu: ${menuList()}.`,
      "Tekan Tab untuk memilih menu, lalu Enter.",
      shortcuts ? "Tekan V untuk perintah suara." : "",
      "Tekan Escape untuk menghentikan suara.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (pathname === "/surah") {
    return "Halaman daftar surah. Ketik nama, arti, atau nomor surah di kotak pencarian, lalu tekan Tab sampai hasilnya dan Enter untuk membuka.";
  }
  if (/^\/surah\/\d+$/.test(pathname)) {
    const keys = shortcuts
      ? "Tekan Spasi untuk memutar murottal qari, J dan L untuk pindah ayat, R untuk mengulang ayat, dan H untuk mode hafalan."
      : "Tekan Tab sampai tombol Putar, lalu Enter untuk memutar murottal qari.";
    return `${name}. ${keys} Tekan Escape untuk menghentikan suara pemandu.`;
  }
  if (pathname === "/hafalan") {
    return "Halaman hafalan. Ketik nama atau nomor surah di kotak pencarian, lalu tekan Tab sampai hasilnya dan Enter. Setelah itu pilih setor hafalan atau kuis.";
  }
  if (pathname.startsWith("/hafalan/")) {
    return `${name}. Pilih cara menguji hafalan: setor hafalan dengan suara, pilih kata, atau isyarat; atau kuis tanpa suara. Tekan Tab lalu Enter.`;
  }
  if (pathname.startsWith("/setoran/")) {
    return "Halaman setoran. Pilih rentang ayat dan cara setoran, lalu tekan Mulai. Selama merekam, pemandu suara diam supaya tidak ikut terekam.";
  }
  if (pathname.startsWith("/latihan/")) {
    return `${name}. Pilih jawaban dengan Tab dan Enter. Setiap hasil akan dibacakan.`;
  }
  if (pathname === "/belajar/isyarat") {
    return "Halaman belajar isyarat hijaiyah. Halaman ini paling cocok untuk pengguna yang bisa melihat isyarat tangan. Tekan Tab untuk menjelajah.";
  }
  if (pathname === "/tentang") {
    return "Tentang Kami: profil Nuruna, fitur, sumber data, dan pernyataan aksesibilitas. Tekan Tab untuk menjelajah tautan.";
  }
  return `${name}. Tekan Tab untuk menjelajah.`;
}

const ROLE_LABELS: Record<string, string> = {
  button: "tombol",
  link: "tautan",
  checkbox: "kotak centang",
  switch: "sakelar",
  radio: "pilihan",
  menuitemradio: "pilihan",
  menuitemcheckbox: "pilihan",
  menuitem: "menu",
  tab: "tab",
  slider: "penggeser",
  textbox: "kotak isian",
  searchbox: "kotak pencarian",
  combobox: "kotak pilihan",
  heading: "judul",
  dialog: "dialog",
  region: "",
};

function implicitRole(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "a" && el.hasAttribute("href")) return "link";
  if (tag === "button" || tag === "summary") return "button";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "select") return "combobox";
  if (tag === "textarea") return "textbox";
  if (el instanceof HTMLInputElement) {
    if (el.type === "checkbox") return "checkbox";
    if (el.type === "radio") return "radio";
    if (el.type === "range") return "slider";
    if (el.type === "search") return "searchbox";
    if (["button", "submit", "reset"].includes(el.type)) return "button";
    return "textbox";
  }
  return "";
}

function visibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone
    .querySelectorAll('[aria-hidden="true"], [lang|="ar"], .quran-text, svg, script, style')
    .forEach((n) => n.remove());
  return clone.textContent ?? "";
}

function textOfIds(ids: string | null): string {
  if (!ids) return "";
  return ids
    .split(/\s+/)
    .map((id) => {
      const target = document.getElementById(id);
      return target ? visibleText(target) : "";
    })
    .join(" ");
}

function accessibleName(el: HTMLElement): string {
  const labelledBy = textOfIds(el.getAttribute("aria-labelledby"));
  if (labelledBy.trim()) return labelledBy;
  const label = el.getAttribute("aria-label");
  if (label?.trim()) return label;
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    const own = el.labels?.[0] ? visibleText(el.labels[0]) : "";
    if (own.trim()) return own;
    if ("placeholder" in el && el.placeholder) return el.placeholder;
  }
  const text = visibleText(el);
  return text.trim() ? text : el.title;
}

function stateText(el: HTMLElement, role: string): string {
  const parts: string[] = [];
  const pressed = el.getAttribute("aria-pressed");
  if (pressed === "true") parts.push("aktif");
  else if (pressed === "false") parts.push("tidak aktif");
  const expanded = el.getAttribute("aria-expanded");
  if (expanded === "true") parts.push("terbuka");
  else if (expanded === "false") parts.push("tertutup");
  const checked = el.getAttribute("aria-checked") ?? (el instanceof HTMLInputElement && (role === "checkbox" || role === "radio") ? String(el.checked) : null);
  if (checked === "true") parts.push(role === "radio" || role === "menuitemradio" ? "terpilih" : "dicentang");
  else if (checked === "false") parts.push(role === "radio" || role === "menuitemradio" ? "tidak terpilih" : "tidak dicentang");
  if (el.getAttribute("aria-current") === "page") parts.push("halaman ini");
  if (el.getAttribute("aria-disabled") === "true" || (el as HTMLButtonElement).disabled) parts.push("tidak tersedia");
  if (el instanceof HTMLSelectElement && el.selectedOptions[0]) parts.push(`terpilih ${el.selectedOptions[0].text}`);
  if (el instanceof HTMLInputElement && role === "slider") parts.push(`nilai ${el.getAttribute("aria-valuetext") ?? el.value}`);
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && (role === "textbox" || role === "searchbox")) {
    parts.push(el.value ? `berisi ${el.value}` : "kosong");
  }
  const keys = el.getAttribute("aria-keyshortcuts");
  if (keys) parts.push(`pintasan ${keys}`);
  return parts.join(", ");
}

export function describeElement(el: HTMLElement): string {
  const role = el.getAttribute("role") ?? implicitRole(el);
  const name = stripArabic(accessibleName(el));
  const roleLabel = ROLE_LABELS[role] ?? "";
  if (!name && !roleLabel) return el.id === "konten-utama" ? "Konten utama" : "";
  const description = stripArabic(textOfIds(el.getAttribute("aria-describedby")));
  const parts = [name, roleLabel, stateText(el, role), description].filter(Boolean);
  return shorten(parts.join(", "));
}

export function regionText(region: Element): string {
  return shorten(stripArabic(visibleText(region)));
}
