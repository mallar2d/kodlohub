"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomeHero() {
  const [scrollY, setScrollY] = useState(0);
  const [isResumed, setIsResumed] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkState = () => {
      try {
        if (localStorage.getItem("kodlorune_resumed") === "true") {
          setIsResumed(true);
        }
        setIsPremium(localStorage.getItem("kodlohub_premium") === "true");
      } catch {
        // ignore
      }
    };

    checkState();
    window.addEventListener("storage", checkState);
    window.addEventListener("focus", checkState);
    window.addEventListener("pageshow", checkState);
    window.addEventListener("premium_updated", checkState);

    return () => {
      window.removeEventListener("storage", checkState);
      window.removeEventListener("focus", checkState);
      window.removeEventListener("pageshow", checkState);
      window.removeEventListener("premium_updated", checkState);
    };
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
        className="transition-transform duration-75 ease-out will-change-transform flex justify-center items-center px-2 relative"
        style={{
          transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
          opacity: Math.max(opacity, 0),
        }}
      >
        {isResumed ? (
          <Link
            href="/kodlorune"
            className="font-deltarune text-6xl sm:text-8xl md:text-9xl lg:text-[130px] xl:text-[150px] tracking-normal leading-none select-none text-transparent bg-clip-text hover:opacity-85 transition-opacity cursor-pointer inline-block"
            style={{
              backgroundImage:
                "var(--hero-gradient, linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 28%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.08) 72%, rgba(255, 255, 255, 0.01) 92%, transparent 100%))",
            }}
            title="kodlOrune"
          >
            kodlOrune
          </Link>
        ) : (
          <div
            className="relative inline-block"
            style={{
              filter: isPremium ? "var(--premium-text-filter)" : undefined,
            }}
          >
            {isPremium && (
              <>
                <div className="absolute -top-3 -right-3 sm:-right-6 pointer-events-none text-cyan-300/80 animate-twinkle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>
                <div
                  className="absolute -bottom-2 -left-3 sm:-left-6 pointer-events-none text-pink-300/80 animate-twinkle"
                  style={{ animationDelay: "1.5s" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>
              </>
            )}
            <h1
              className={`font-[var(--font-display)] text-6xl sm:text-8xl md:text-9xl lg:text-[145px] xl:text-[170px] font-black uppercase tracking-[-0.04em] leading-none select-none text-transparent bg-clip-text ${
                isPremium ? "animate-premium-sheen" : ""
              }`}
              style={{
                backgroundImage: isPremium
                  ? "var(--premium-gradient)"
                  : "var(--hero-gradient, linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 28%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.08) 72%, rgba(255, 255, 255, 0.01) 92%, transparent 100%))",
                maskImage: isPremium
                  ? "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.32) 100%)"
                  : undefined,
                WebkitMaskImage: isPremium
                  ? "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.32) 100%)"
                  : undefined,
              }}
            >
              KODLOHUB
            </h1>
          </div>
        )}
      </div>

      {/* Subtitle */}
      <div
        className="mt-6 sm:mt-8 max-w-2xl mx-auto px-4 transition-opacity duration-300"
        style={{ opacity: Math.max(1 - progress * 1.6, 0) }}
      >
        {isResumed ? (
          <p className="text-on-primary-mute font-mono text-sm sm:text-lg tracking-wider">
            i can&apos;t forget i can&apos;t forget.
          </p>
        ) : (
          <p className="text-on-primary-mute text-base sm:text-xl font-normal leading-relaxed">
            Єдиний цифровий архів творчості, ігор, медіа та бази знань кодла.
          </p>
        )}
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

