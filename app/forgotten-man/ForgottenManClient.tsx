"use client";

import { useEffect, useRef } from "react";

const AUDIO_URL = "https://deltarune.wiki/images/Man_2_music.ogg?cb=cajews&h=thumb.php&f=Man_2_music.ogg";
const IMAGE_URL = "https://i.ytimg.com/vi/Tzba0JRr0qA/maxresdefault.jpg";

export default function ForgottenManClient() {
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
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-4 cursor-default select-none"
    >
      <div className="relative flex flex-col items-center justify-center select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMAGE_URL}
          alt="Forgotten Man"
          draggable={false}
          className="max-w-full max-h-[60vh] w-auto h-auto object-contain pointer-events-none select-none"
        />
      </div>

      {/* Large black text positioned in the bottom area */}
      <div className="w-full max-w-4xl flex items-center justify-center mt-6 sm:mt-12 pointer-events-auto">
        <p
          className="text-black font-mono text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-wider text-center select-text cursor-text"
          style={{
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
        >
          Ще не готово
        </p>
      </div>
    </div>
  );
}
