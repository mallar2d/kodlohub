"use client";

import { useEffect, useRef } from "react";

const AUDIO_URL = "/13am.ogg";
const GIF_URL = "/prophecy.gif";

export default function KodloruneClient() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(AUDIO_URL);
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;

    audio.play().catch(() => {});

    const handleUserInteract = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener("click", handleUserInteract);
    window.addEventListener("keydown", handleUserInteract);

    return () => {
      audio.pause();
      audio.src = "";
      window.removeEventListener("click", handleUserInteract);
      window.removeEventListener("keydown", handleUserInteract);
    };
  }, []);

  return (
    <div
      onClick={() => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4 select-none cursor-default"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GIF_URL}
        alt="The Prophecy"
        draggable={false}
        className="max-w-full max-h-[90vh] w-auto h-auto object-contain pointer-events-none select-none [image-rendering:pixelated]"
      />
    </div>
  );
}
