import styles from "./verse-end-marker.module.css";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

export function VerseEndMarker({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      lang="ar"
      dir="rtl"
      className={`quran-text ${styles.marker}`}
      data-wide={number >= 100 || undefined}
    >
      <span>{toArabicDigits(number)}</span>
    </span>
  );
}
