# Nuruna

Platform belajar Al-Qur'an yang inklusif untuk **tunanetra**, **tunarungu**, **tunawicara**, dan pengguna umum, dengan integrasi AI.

## Stack

- **Next.js 16** (App Router, Turbopack, Cache Components) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix, preset Nova, dukungan RTL)
- Font: **Atkinson Hyperlegible Next** (UI, ramah low vision) dan **Amiri Quran** (teks ayat)
- Package manager: **pnpm**

## Menjalankan

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

### Konfigurasi AI

Fitur AI membutuhkan kunci API. Salin `.env.example` menjadi `.env.local`, lalu isi:

| Variabel                      | Untuk                                            | Keterangan                                              |
| ----------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `ANTHROPIC_API_KEY`           | Claude (tutor, bahasa sederhana, perintah suara) | Model bawaan `claude-opus-5-5`; ganti lewat `LLM_MODEL` |
| `ANTHROPIC_BASE_URL`          | Endpoint Claude kustom (proxy/gateway)           | Opsional; URL dasar tanpa `/v1/messages`                |
| `AI_REFUSAL_FALLBACK`         | Fallback otomatis bila Claude menolak menjawab   | Opsional; isi `off` bila gateway tidak mendukung        |
| `STT_PROVIDER`, `STT_API_KEY` | Whisper (setoran hafalan suara)                  | `groq` atau `openai`                                    |
| `AI_RATE_LIMIT_PER_MINUTE`    | Batas permintaan per IP ke `/api/ai/*`           | Bawaan 20                                               |

## Sumber data

- Teks Uthmani, terjemahan per kata, dan segmen waktu audio: [Quran.com API v4](https://api.quran.com/api/v4)
- Terjemahan dari Kementerian Agama RI
- Audio Mishary Rashid Alafasy
- Penanda tajwid per huruf: Quran.com API
- Tafsir Kemenag RI melalui [equran.id API v2](https://equran.id/apidev), dimuat per ayat lewat `/api/tafsir/[surah]/[ayat]`
# NurunaSystem
# NurunaSystem
