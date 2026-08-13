"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomeHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute transform & opacity for the hero logo dock transition
  const progress = Math.min(Math.max(scrollY / 220, 0), 1);
  const scale = 1 - progress * 0.45;
  const opacity = 1 - progress * 1.1;
  const translateY = progress * -60;

  return (
    <div className="pt-28 sm:pt-36 pb-14 sm:pb-20 text-center relative overflow-hidden">
      {/* Massive Iconic Logo with Dramatic Bottom Shadow / Dark Submersion */}
      <div
        className="transition-transform duration-75 ease-out will-change-transform flex justify-center items-center px-2"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
          opacity: Math.max(opacity, 0),
        }}
      >
        <h1
          className="font-[var(--font-display)] text-6xl sm:text-8xl md:text-9xl lg:text-[145px] xl:text-[170px] font-black uppercase tracking-[-0.04em] leading-none select-none text-transparent bg-clip-text"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 28%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.08) 72%, rgba(255, 255, 255, 0.01) 92%, transparent 100%)",
          }}
        >
          KODLOHUB
        </h1>
      </div>

      {/* Subtitle */}
      <div
        className="mt-6 sm:mt-8 max-w-2xl mx-auto px-4 transition-opacity duration-300"
        style={{ opacity: Math.max(1 - progress * 1.6, 0) }}
      >
        <p className="text-on-primary-mute text-base sm:text-xl font-normal leading-relaxed">
          Єдиний цифровий архів творчості, ігор, медіа та бази знань кодла.
        </p>
      </div>

      {/* Action CTA Pills */}
      <div
        className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3 px-4 transition-opacity duration-300"
        style={{ opacity: Math.max(1 - progress * 1.8, 0) }}
      >
        <Link href="/projects" className="btn-solid !px-6 !py-3 !text-xs font-bold">
          КАТАЛОГ ПРОЄКТІВ
        </Link>
        <Link href="/archive" className="btn-ghost !px-6 !py-3 !text-xs font-semibold">
          АРХІВ КОНТЕНТУ
        </Link>
        <Link href="/wiki" className="btn-ghost text-on-primary-mute hover:text-on-primary !px-6 !py-3 !text-xs font-semibold">
          КОДЛОПЕДІЯ
        </Link>
      </div>
    </div>
  );
}
