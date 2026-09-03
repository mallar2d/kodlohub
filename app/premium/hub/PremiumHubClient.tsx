"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";

interface PremiumResource {
  id: string;
  title: string;
  desc: string;
  tag: string;
  link: string;
  isDownload?: boolean;
}

const PREMIUM_RESOURCES: PremiumResource[] = [
  {
    id: "kodlorune",
    title: "Кодлоруна",
    desc: "Матеріали розробки, концепт-арти, чернетки та білд Кодлоруни.",
    tag: "ПРОЄКТ",
    link: "/premium/kodlorune",
  },
  {
    id: "brat_td_2",
    title: "Брат ТД 2",
    desc: "Ранні матеріали розробки, дизайн-документи та концепт-арти сиквелу Brat TD.",
    tag: "В РОЗРОБЦІ",
    link: "/premium/brat-td-2",
  },
  {
    id: "super_kladman",
    title: "Супер Кладмен",
    desc: "Матеріали нового проєкту: спрайти, дизайн рівнів, механіки та чернетки розробки.",
    tag: "В РОЗРОБЦІ",
    link: "/premium/super-kladman",
  },
];

export default function PremiumHubClient() {
  const { user } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showAdsAnyway, setShowAdsAnyway] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      let active = false;
      const forceAds = localStorage.getItem("kodlohub_show_ads_anyway") === "true";
      setShowAdsAnyway(forceAds);

      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_premium")
            .eq("id", user.id)
            .single();

          if (profile?.role === "owner" || profile?.role === "podrofikovany" || profile?.is_premium) {
            active = true;
            localStorage.setItem("kodlohub_premium", "true");
          } else {
            active = false;
            localStorage.removeItem("kodlohub_premium");
          }
        } catch {
          active = false;
        }
      } else {
        localStorage.removeItem("kodlohub_premium");
        active = false;
      }

      setIsPremium(active);
      setLoading(false);
    };

    checkAccess();
    window.addEventListener("premium_updated", checkAccess);
    window.addEventListener("storage", checkAccess);
    return () => {
      window.removeEventListener("premium_updated", checkAccess);
      window.removeEventListener("storage", checkAccess);
    };
  }, [user, supabase]);

  const toggleShowAdsAnyway = () => {
    const nextState = !showAdsAnyway;
    setShowAdsAnyway(nextState);
    if (nextState) {
      localStorage.setItem("kodlohub_show_ads_anyway", "true");
    } else {
      localStorage.removeItem("kodlohub_show_ads_anyway");
    }
    window.dispatchEvent(new Event("premium_updated"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // LOCKED STATE GUARD
  if (!isPremium) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-[520px] w-full mx-auto text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-canvas-night-soft border border-hairline-dark mx-auto flex items-center justify-center text-on-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div className="space-y-2">
            <span className="micro-cap text-[10px] text-ink-mute font-mono tracking-widest uppercase">
              ДОСТУП ОБМЕЖЕНО
            </span>
            <h1 className="heading-hero text-2xl sm:text-3xl font-bold uppercase tracking-tight text-on-primary">
              РОЗДІЛ KODLOHUB PREMIUM
            </h1>
            <p className="text-sm text-ink-mute leading-relaxed max-w-sm mx-auto">
              Цей розділ та матеріали кодло-розробки доступні для користувачів із підпискою KodloHUB Premium.
            </p>
          </div>

          <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft space-y-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink-mute">Вартість:</span>
              <span className="text-white font-bold">22 ₴ / місяць</span>
            </div>
            <Link
              href="/premium"
              className="w-full btn-solid !py-3 !text-xs font-mono font-bold uppercase block text-center"
            >
              ОФОРМИТИ ПІДПИСКУ (22 ₴) →
            </Link>
            <Link
              href="/"
              className="block text-xs text-ink-mute hover:text-on-primary font-mono transition-colors"
            >
              На головну
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // UNLOCKED PREMIUM HUB
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1000px] mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-hairline-dark">
          <div className="space-y-1">
            <p className="micro-cap text-[10px] text-ink-mute font-mono tracking-widest uppercase">
              KODLOHUB PREMIUM
            </p>
            <h1 className="heading-section text-3xl font-bold uppercase tracking-tight text-on-primary">
              ПРЕМІУМ-ХАБ
            </h1>
            <p className="text-xs text-ink-mute max-w-lg">
              Керування показом реклами та доступ до матеріалів кодло-розробки.
            </p>
          </div>

          <Link
            href="/premium"
            className="btn-ghost !text-xs !py-2 !px-4 shrink-0 font-mono w-fit"
          >
            ← ТАРИФ ТА ЦІЛЬ
          </Link>
        </div>

        {/* Feature: Meme Ads Control (Without Test Button) */}
        <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <p className="micro-cap text-[10px] text-ink-mute font-mono uppercase tracking-wider">
              КЕРУВАННЯ РЕКЛАМОЮ
            </p>
            <h2 className="text-sm font-bold uppercase tracking-wide text-on-primary">
              Показ мемної реклами
            </h2>
            <p className="text-xs text-ink-mute leading-relaxed">
              Реклама на KodloHUB — це авторські меми та локальні приколи зі звуком. Якщо бажаєте бачити банери навіть з Premium-статусом, увімкніть їх тут.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={toggleShowAdsAnyway}
              className={`!py-2.5 !px-5 !text-xs font-mono font-bold transition-all cursor-pointer rounded-full ${
                showAdsAnyway ? "btn-solid" : "btn-ghost"
              }`}
            >
              {showAdsAnyway ? "ПОКАЗУВАТИ РЕКЛАМУ: УВІМКНЕНО" : "ПОКАЗУВАТИ РЕКЛАМУ: ВИМКНЕНО"}
            </button>
          </div>
        </div>

        {/* Real Kodlo Projects Grid */}
        <div className="space-y-4">
          <p className="micro-cap text-xs text-ink-mute font-mono tracking-wider uppercase px-1">
            МАТЕРІАЛИ КОДЛО-РОЗРОБКИ ТА ПРОЄКТИ
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PREMIUM_RESOURCES.map((item) => (
              <div
                key={item.id}
                className="card-dark p-5 rounded-2xl border border-hairline-dark hover:border-white/30 transition-all flex flex-col justify-between space-y-4 group bg-canvas-night-soft"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="button-cap px-2 py-0.5 rounded text-[10px] border border-hairline-dark bg-canvas-night text-ink-mute font-mono">
                      {item.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-primary group-hover:opacity-85 transition-opacity">
                      {item.title}
                    </h3>
                    <p className="text-xs text-ink-mute mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-hairline-dark flex items-center justify-end">
                  <Link
                    href={item.link}
                    className="btn-ghost !text-xs !py-1.5 !px-3.5 group-hover:border-white/50 transition-colors"
                  >
                    ВІДКРИТИ →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
