"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_GOAL_TOTAL = 400.0;
const DEFAULT_GOAL_CURRENT = 148.8;

interface FeatureItem {
  title: string;
  desc: string;
  tags?: string[];
  icon: React.ReactNode;
}

const FEATURES: FeatureItem[] = [
  {
    title: "Вимкнення реклами",
    desc: "Повне блокування спливаючих банерів по всьому сайту з можливістю увімкнути їх назад.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  {
    title: "Ранній доступ до проєктів",
    desc: "Тестування закритих білдів та свіжих оновлень майбутніх релізів:",
    tags: ["Кодлоруна", "Брат ТД 2", "Супер Кладмен"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: "Матеріали кодло-розробки",
    desc: "Вихідні матеріали, концепт-арти та чернетки розробки:",
    tags: ["Дизайн-доки", "Спрайти", "Концепт-арти"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    title: "Підтримка сайту для покупки слопу для генерації слопу",
    desc: "Ваш щомісячний внесок іде у фонд 400 ₴ на підписку Opencode для безперервної генерації свіжого слопу в T3 Code.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8" y2="16" />
        <line x1="16" y1="16" x2="16" y2="16" />
      </svg>
    ),
  },
  {
    title: "Крутий підпис у хедері",
    desc: "Ексклюзивний лаконічний бейдж [PREMIUM] у шапці сайту.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: "Чому саме 22 грн на місяць?",
    a: "Це символічна сума для підтримки життєдіяльності кодла. Менше ніж чашка кави, але дає повний пакет поваги та вимикає рекламу.",
  },
  {
    q: "Що таке збір на підписку Opencode (400 грн)?",
    a: "Opencode — це підписка для інструментів генерації коду та слопу в T3 Code, за допомогою яких створюється контент сайту. Кожні 400 гривень покривають місяць підписки.",
  },
  {
    q: "Як відбувається активація підписки?",
    a: "Ви здійснюєте прямий переказ 22 ₴ на карту, вказавши свій нікнейм, і головний адмін вручну активує статус Premium на ваш акаунт.",
  },
];

export default function PremiumClient() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [isPremium, setIsPremium] = useState(false);
  const [goalTotal, setGoalTotal] = useState(DEFAULT_GOAL_TOTAL);
  const [goalCurrent, setGoalCurrent] = useState(DEFAULT_GOAL_CURRENT);

  useEffect(() => {
    // Load slop fund data from site_settings table
    const fetchSlopFund = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "slop_fund")
          .single();

        if (data?.value) {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (typeof val.collected === "number") setGoalCurrent(val.collected);
          if (typeof val.goal === "number") setGoalTotal(val.goal);
        }
      } catch {
        // Fallback to default state
      }
    };

    fetchSlopFund();
  }, [supabase]);

  useEffect(() => {
    // Check if user has premium from DB profile or localStorage
    const checkUserPremium = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single();

        if (profile?.is_premium) {
          setIsPremium(true);
          localStorage.setItem("kodlohub_premium", "true");
          window.dispatchEvent(new Event("premium_updated"));
          return;
        }
      }

      setIsPremium(localStorage.getItem("kodlohub_premium") === "true");
    };

    checkUserPremium();
  }, [user, supabase]);

  const handleSubscribeClick = () => {
    if (!user) {
      router.push("/login?next=/premium");
      return;
    }
    router.push("/payment");
  };

  const percentage = Math.min(Math.max((goalCurrent / goalTotal) * 100, 0), 100).toFixed(1);
  const remaining = Math.max(goalTotal - goalCurrent, 0).toFixed(2);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1000px] mx-auto space-y-12">
        {/* Hero Section with Iconic Shimmer Brandmark & Deluxe Signature */}
        <div className="text-center space-y-4 pt-4 sm:pt-8">
          <div className="relative inline-block select-none">
            {/* Subtle atmospheric ambient glow behind logo */}
            <div className="absolute -inset-x-12 -inset-y-6 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl opacity-50 pointer-events-none rounded-full" />

            {/* Sparkle Glint 1 (Top Right) */}
            <div className="absolute -top-2 -right-2 sm:right-2 pointer-events-none text-cyan-300/80 animate-twinkle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>

            {/* Sparkle Glint 2 (Bottom Left) */}
            <div
              className="absolute -bottom-1 -left-2 sm:left-2 pointer-events-none text-pink-300/80 animate-twinkle"
              style={{ animationDelay: "1.5s" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </div>

            {/* Massive Monumental Logo with Iridescent Specular Sweep and Subtle Bottom Submersion Shading */}
            <h1
              className="relative font-[var(--font-display)] text-6xl sm:text-8xl md:text-9xl lg:text-[130px] font-black uppercase tracking-[-0.04em] leading-none select-none text-transparent bg-clip-text animate-premium-sheen"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, #FFFFFF 0%, #FFFFFF 20%, #e2e8f0 32%, #bae6fd 42%, #fbcfe8 50%, #c4b5fd 58%, #e0f2fe 68%, #FFFFFF 80%, #FFFFFF 100%)",
                maskImage:
                  "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.32) 100%)",
                WebkitMaskImage:
                  "linear-gradient(180deg, #000 0%, #000 48%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.32) 100%)",
              }}
            >
              KODLOHUB
            </h1>

            {/* Deluxe Sub-Signature in Deltarune aesthetic with subtle glow */}
            <div className="mt-4 sm:mt-5 flex items-center justify-center gap-3 sm:gap-4">
              <div className="h-px w-10 sm:w-24 bg-gradient-to-r from-transparent via-white/30 to-white/70" />
              <span
                className="font-deltarune text-base sm:text-xl tracking-[0.25em] sm:tracking-[0.3em] uppercase text-transparent bg-clip-text animate-premium-sheen select-none drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                style={{
                  backgroundImage:
                    "linear-gradient(115deg, #FFFFFF 0%, #FFFFFF 25%, #bae6fd 45%, #fbcfe8 55%, #c4b5fd 65%, #FFFFFF 85%, #FFFFFF 100%)",
                }}
              >
                PREMIUM
              </span>
              <div className="h-px w-10 sm:w-24 bg-gradient-to-l from-transparent via-white/30 to-white/70" />
            </div>
          </div>

          <p className="text-ink-mute text-sm sm:text-base max-w-[580px] mx-auto leading-relaxed pt-1">
            Пряма підтримка сайту для закупівлі підписки Opencode для безперервної генерації слопу в T3 Code.
          </p>
        </div>

        {/* Crowdfunding Slop Goal Progress Tracker */}
        <div className="card-dark p-6 sm:p-8 rounded-3xl border border-hairline-dark hover:border-white/20 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="micro-cap text-[10px] text-ink-mute font-mono tracking-wider uppercase">
                  ЦІЛЬ МІСЯЦЯ
                </span>
                <span className="text-xs text-ink-mute">• Підписка Opencode на генерацію слопу в T3 Code</span>
              </div>
              <h2 className="text-2xl font-bold text-on-primary tracking-wide mt-1">
                Фонд закупівлі слопу
              </h2>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-3xl font-mono font-bold text-on-primary">
                {goalCurrent.toFixed(2)} ₴
              </span>
              <span className="text-xs text-ink-mute font-mono block">
                з цілі {goalTotal.toFixed(2)} ₴ ({percentage}%)
              </span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-canvas-night rounded-full overflow-hidden border border-hairline-dark p-0.5 relative">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000 relative shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-mute">
              <span>0.00 ₴</span>
              <span className="text-on-primary-mute font-medium">
                Залишилось зібрати: {remaining} ₴
              </span>
              <span>{goalTotal.toFixed(2)} ₴</span>
            </div>
          </div>
        </div>

        {/* Pricing Card & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Features List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="micro-cap text-xs text-ink-mute font-mono tracking-wider uppercase px-1">
              ЩО ВХОДИТЬ У ПІДПИСКУ
            </h3>
            <div className="space-y-3">
              {FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  className="card-dark p-4 rounded-2xl border border-hairline-dark hover:border-white/20 transition-all flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary shrink-0 mt-0.5">
                    {feat.icon}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-sm font-bold text-on-primary uppercase tracking-wide">
                      {feat.title}
                    </h4>
                    <p className="text-xs text-ink-mute leading-relaxed">
                      {feat.desc}
                    </p>
                    {feat.tags && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {feat.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-hairline-dark bg-canvas-night text-white/90"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Checkout Card */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            <div className="card-dark p-6 sm:p-7 rounded-3xl border border-white/20 bg-canvas-night-soft shadow-2xl relative overflow-hidden space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="micro-cap text-[10px] text-ink-mute font-mono tracking-wider uppercase">
                    ТАРИФ
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-on-primary border border-hairline-dark">
                    ЩОМІСЯЧНО
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-on-primary">
                    22 ₴
                  </span>
                  <span className="text-xs text-ink-mute font-mono">/ місяць</span>
                </div>
                <p className="text-xs text-ink-mute">
                  Повна вартість переказується на щомісячний фонд генерації слопу в T3 Code.
                </p>
              </div>

              {/* Status & CTA */}
              <div className="space-y-3 pt-4 border-t border-hairline-dark">
                {isPremium ? (
                  <div className="p-3.5 rounded-2xl bg-canvas-night border border-hairline-dark text-center space-y-2">
                    <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      PREMIUM АКТИВОВАНО
                    </p>
                    <p className="text-[11px] text-ink-mute">
                      Рекламу вимкнено • Преміум-бейдж активний
                    </p>
                    <Link
                      href="/premium/hub"
                      className="w-full py-2.5 px-4 rounded-full text-xs font-bold font-mono tracking-wider uppercase btn-solid block text-center cursor-pointer hover:bg-white/90 transition-all mt-2"
                    >
                      ВІДКРИТИ ПРЕМІУМ-ХАБ →
                    </Link>
                  </div>
                ) : user ? (
                  <div className="p-3.5 rounded-xl bg-canvas-night border border-hairline-dark text-center">
                    <p className="text-xs text-ink-mute font-mono">
                      Акаунт: <span className="text-white font-bold">{user.email}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-canvas-night border border-hairline-dark text-center">
                    <p className="text-xs text-ink-mute font-mono">
                      Для покупки потрібна авторизація
                    </p>
                  </div>
                )}

                {!isPremium && (
                  <button
                    onClick={handleSubscribeClick}
                    className="w-full py-3.5 px-6 rounded-full text-xs font-bold font-mono tracking-wider uppercase btn-solid shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer hover:bg-white/90 transition-all"
                  >
                    {user ? "ОФОРМИТИ ПІДПИСКУ (22 ₴)" : "УВІЙТИ ДЛЯ ОФОРМЛЕННЯ"}
                  </button>
                )}
              </div>

              <div className="text-[11px] text-ink-mute font-mono text-center leading-relaxed">
                Переказ на карту з ручною видачею адміном.
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4 pt-8 border-t border-hairline-dark">
          <h3 className="micro-cap text-xs text-ink-mute font-mono tracking-wider uppercase">
            ЧАСТІ ПИТАННЯ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="card-dark p-5 rounded-2xl border border-hairline-dark space-y-2">
                <p className="text-xs font-bold text-on-primary">{faq.q}</p>
                <p className="text-xs text-ink-mute leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
