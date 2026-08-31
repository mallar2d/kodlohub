"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface AdItem {
  id: string;
  src: string;
  alt: string;
}

const ADS: AdItem[] = [
  { id: "ad1", src: "/ads/ad1.png", alt: "Рекламний банер 1" },
  { id: "ad2", src: "/ads/ad2.png", alt: "Рекламний банер 2" },
  { id: "ad3", src: "/ads/ad3.png", alt: "Рекламний банер 3" },
  { id: "ad4", src: "/ads/ad4.png", alt: "Рекламний банер 4" },
  { id: "ad5", src: "/ads/ad5.png", alt: "Рекламний банер 5" },
  { id: "ad6", src: "/ads/ad6.png", alt: "Рекламний банер 6" },
  { id: "ad7", src: "/ads/ad7.png", alt: "Рекламний банер 7" },
  { id: "ad8", src: "/ads/ad8.png", alt: "Рекламний банер 8" },
];

const EXCLUDED_ROUTES = [
  "/kodlorune",
  "/kodlorune-awaiting",
  "/forgotten-man",
  "/support-ending",
  "/urethra",
  "/urethra.io",
];

export default function MemeAdPopup() {
  const pathname = usePathname();
  const isExcluded = EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const [currentAd, setCurrentAd] = useState<AdItem | null>(null);
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [isVisible, setIsVisible] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showAdsAnyway, setShowAdsAnyway] = useState(false);
  const lastAdIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkPremium = () => {
      const active = localStorage.getItem("kodlohub_premium") === "true";
      const forceAds = localStorage.getItem("kodlohub_show_ads_anyway") === "true";
      setIsPremium(active);
      setShowAdsAnyway(forceAds);
    };
    checkPremium();
    window.addEventListener("premium_updated", checkPremium);
    window.addEventListener("storage", checkPremium);
    return () => {
      window.removeEventListener("premium_updated", checkPremium);
      window.removeEventListener("storage", checkPremium);
    };
  }, []);

  const isAdBlocked = isPremium && !showAdsAnyway;

  const getRandomInterval = () => {
    // Random interval between 60s (60,000ms) and 120s (120,000ms)
    return Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
  };

  const showNextAd = useCallback(() => {
    const isBlocked = localStorage.getItem("kodlohub_premium") === "true" && localStorage.getItem("kodlohub_show_ads_anyway") !== "true";
    if (isBlocked) return;

    // Pick ad different from previous
    const availableAds = ADS.filter((ad) => ad.id !== lastAdIdRef.current);
    const nextAd = availableAds[Math.floor(Math.random() * availableAds.length)] || ADS[0];
    
    // Pick random corner
    const nextPos = Math.random() > 0.5 ? "bottom-right" : "bottom-left";

    lastAdIdRef.current = nextAd.id;
    setCurrentAd(nextAd);
    setPosition(nextPos);
    setIsEnlarged(false);
    setIsVisible(true);
  }, []);

  const closeAd = useCallback(() => {
    setIsVisible(false);
    setIsEnlarged(false);

    // Schedule next ad appearance
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      showNextAd();
    }, getRandomInterval());
  }, [showNextAd]);

  const handleAdClick = () => {
    try {
      const audio = new Audio("/PDR_PRODUCTION_SOUND.mp3");
      audio.play().catch(() => {});
    } catch {
      // Audio playback blocked or unsupported
    }
    // Open in enlarged mode
    setIsEnlarged(true);
  };

  useEffect(() => {
    if (isExcluded || isAdBlocked) {
      setIsVisible(false);
      setIsEnlarged(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initial popup after 3.5 seconds
    timerRef.current = setTimeout(() => {
      showNextAd();
    }, 3500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showNextAd, isExcluded, isAdBlocked]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEnlarged) {
        closeAd();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnlarged, closeAd]);

  if (isExcluded || isAdBlocked || !isVisible || !currentAd) return null;

  return (
    <>
      {/* Enlarged Modal Lightbox */}
      {isEnlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={closeAd}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-canvas-night-soft border border-hairline-dark hover:border-white/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-night/90 border-b border-hairline-dark">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <span className="micro-cap text-xs text-on-primary tracking-wider uppercase font-mono">
                  РЕКЛАМА • СПЕЦІАЛЬНА ПРОПОЗИЦІЯ
                </span>
              </div>
              <button
                onClick={closeAd}
                className="text-ink-mute hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm leading-none cursor-pointer flex items-center gap-1 font-mono"
                aria-label="Закрити"
              >
                <span>✕</span>
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-3 sm:p-4 bg-black/60 flex items-center justify-center overflow-auto max-h-[calc(90vh-8rem)]">
              <Image
                src={currentAd.src}
                alt={currentAd.alt}
                width={800}
                height={600}
                className="w-auto max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
                priority
              />
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-canvas-night/90 border-t border-hairline-dark flex items-center justify-between">
              <span className="text-[11px] text-ink-mute font-mono">
                Дякуємо за увагу до нашого контенту
              </span>
              <button
                onClick={closeAd}
                className="btn-ghost !py-1.5 !px-5 !text-xs font-bold text-on-primary cursor-pointer hover:border-white/40"
              >
                ЗАКРИТИ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Corner Popup */}
      {!isEnlarged && (
        <div
          className={`fixed z-40 transition-all duration-300 ease-out animate-slide-up ${
            position === "bottom-right"
              ? "bottom-4 right-4 sm:bottom-6 sm:right-6"
              : "bottom-4 left-4 sm:bottom-6 sm:left-6"
          }`}
          style={{
            maxWidth: "min(380px, calc(100vw - 2rem))",
          }}
        >
          <div className="bg-canvas-night-soft/95 backdrop-blur-md border border-hairline-dark hover:border-white/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-canvas-night/80 border-b border-hairline-dark">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="micro-cap text-[10px] text-ink-mute tracking-wider uppercase font-mono">
                  РЕКЛАМА
                </span>
              </div>
              <button
                onClick={closeAd}
                className="text-ink-mute hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors text-xs leading-none cursor-pointer"
                aria-label="Закрити рекламу"
              >
                ✕
              </button>
            </div>

            {/* Ad Image Content */}
            <div
              onClick={handleAdClick}
              className="relative cursor-pointer group bg-black/40 flex items-center justify-center overflow-hidden p-1.5 select-none"
              title="Клікніть щоб збільшити"
            >
              <Image
                src={currentAd.src}
                alt={currentAd.alt}
                width={380}
                height={280}
                className="w-auto max-h-[280px] max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                priority
              />

              {/* Hover highlight overlay with click hint */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-colors pointer-events-none rounded-lg flex items-end justify-center pb-2">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-semibold bg-black/80 px-2 py-0.5 rounded-full text-white/90 border border-white/20">
                  🔍 Клікніть щоб відкрити
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
