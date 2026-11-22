"use client";

import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { type Handedness, normalizeLandmarks } from "@/lib/isyarat/landmarks";
import { cn } from "@/lib/utils";
import { loadHandLandmarker } from "@/lib/isyarat/mediapipe";

export type HandFrame = {
  features: number[];
  handedness: Handedness;
  score: number;
};

type Status = "mati" | "memuat" | "aktif" | "gagal";

const HANDEDNESS_LABEL: Record<Handedness, string> = {
  Left: "kiri",
  Right: "kanan",
  Unknown: "tidak diketahui",
};

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Izin kamera ditolak. Izinkan kamera untuk situs ini di pengaturan browser, lalu coba lagi.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Kamera tidak ditemukan. Pastikan kamera terpasang, lalu coba lagi.";
  }
  if (name === "NotReadableError") {
    return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi.";
  }
  return "Kamera tidak bisa dipakai. Coba lagi.";
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export function HandTracker({
  onFrame,
  onActiveChange,
  compact = false,
}: {
  onFrame?: (frame: HandFrame | null) => void;
  onActiveChange?: (active: boolean) => void;
  compact?: boolean;
}) {
  const overlayId = useId();
  const [status, setStatus] = useState<Status>("mati");
  const [error, setError] = useState("");
  const [handSeen, setHandSeen] = useState<Handedness | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = usePrefersReducedMotion();
  const [overlayChoice, setOverlayChoice] = useState<boolean | null>(null);
  const showOverlay = overlayChoice ?? !reducedMotion;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  const onActiveRef = useRef(onActiveChange);
  const showOverlayRef = useRef(showOverlay);
  useEffect(() => {
    onFrameRef.current = onFrame;
    onActiveRef.current = onActiveChange;
    showOverlayRef.current = showOverlay;
  }, [onFrame, onActiveChange, showOverlay]);

  useEffect(() => {
    if (status !== "aktif") return;
    const t = window.setTimeout(() => {
      setAnnouncement(
        handSeen
          ? `Tangan ${HANDEDNESS_LABEL[handSeen]} terlihat.`
          : "Tangan tidak terlihat. Arahkan tangan ke kamera.",
      );
    }, 600);
    return () => window.clearTimeout(t);
  }, [handSeen, status]);

  const stop = () => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHandSeen(null);
    onFrameRef.current?.(null);
    onActiveRef.current?.(false);
  };

  useEffect(() => stop, []);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("gagal");
      setError("Browser ini belum mendukung kamera di halaman ini. Gunakan browser terbaru melalui alamat https.");
      return;
    }
    setStatus("memuat");
    setAnnouncement("Menyalakan kamera dan memuat pengenal tangan…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      stop();
      setStatus("gagal");
      setError(cameraErrorMessage(err));
      setAnnouncement(cameraErrorMessage(err));
      return;
    }

    let landmarker;
    let DrawingUtilsCtor;
    let connections;
    try {
      landmarker = await loadHandLandmarker();
      const mp = await import("@mediapipe/tasks-vision");
      DrawingUtilsCtor = mp.DrawingUtils;
      connections = mp.HandLandmarker.HAND_CONNECTIONS;
    } catch (err) {
      console.error(err);
      stop();
      setStatus("gagal");
      const message = "Pengenal tangan gagal dimuat. Periksa koneksi internet lalu coba lagi.";
      setError(message);
      setAnnouncement(message);
      return;
    }

    if (!streamRef.current) return;
    setStatus("aktif");
    onActiveRef.current?.(true);

    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const draw = new DrawingUtilsCtor(ctx);
    let lastTime = -1;
    let lastSeen: Handedness | null = null;

    const tick = () => {
      if (!streamRef.current) return;
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const result = landmarker.detectForVideo(video, performance.now());
        const points = result.landmarks[0];
        const category = result.handedness[0]?.[0];
        const handedness: Handedness =
          category?.categoryName === "Left" || category?.categoryName === "Right"
            ? category.categoryName
            : "Unknown";

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (points && showOverlayRef.current) {
          draw.drawConnectors(points, connections, { color: "#2563eb", lineWidth: 4 });
          draw.drawLandmarks(points, { color: "#f97316", lineWidth: 1, radius: 4 });
        }

        const features = points
          ? normalizeLandmarks(points, video.videoWidth / video.videoHeight)
          : null;
        const seen = features ? handedness : null;
        if (seen !== lastSeen) {
          lastSeen = seen;
          setHandSeen(seen);
        }
        onFrameRef.current?.(
          features ? { features, handedness, score: category?.score ?? 0 } : null,
        );
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function turnOff() {
    stop();
    setStatus("mati");
    setAnnouncement("Kamera dimatikan.");
  }

  const active = status === "aktif" || status === "memuat";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {active ? (
          <Button variant="outline" className="h-11 px-4 text-base" onClick={turnOff}>
            <CameraOff aria-hidden="true" className="size-5" />
            Matikan kamera
          </Button>
        ) : (
          <Button className="h-11 px-5 text-base" onClick={start}>
            <Camera aria-hidden="true" className="size-5" />
            {status === "gagal" ? "Coba lagi" : "Nyalakan kamera"}
          </Button>
        )}
        <div className="flex items-center gap-2">
          <input
            id={overlayId}
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => setOverlayChoice(e.target.checked)}
            className="size-6 accent-primary"
          />
          <label htmlFor={overlayId} className="text-base">
            Tampilkan titik tangan
          </label>
        </div>
      </div>

      {status === "memuat" && (
        <p className="inline-flex items-center gap-2 font-medium">
          <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
          Memuat pengenal tangan…
        </p>
      )}
      {status === "aktif" && (
        <p className="font-medium">
          {handSeen
            ? `Tangan ${HANDEDNESS_LABEL[handSeen]} terlihat.`
            : "Tangan tidak terlihat. Arahkan tangan ke kamera."}
        </p>
      )}
      {error && <p className="font-medium text-destructive">{error}</p>}

      <div
        className={
          active
            ? // Lebar dibatasi tinggi layar (rasio 4:3) supaya video muat tanpa menggulir.
              cn(
                "relative w-full min-w-64 overflow-hidden rounded-xl border bg-muted",
                compact
                  ? "max-w-[min(36rem,calc((100dvh-28rem)*4/3))]"
                  : "max-w-[min(36rem,calc((100dvh-26rem)*4/3))]",
              )
            : "hidden"
        }
      >
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Pratinjau kamera"
          className="block w-full -scale-x-100"
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
