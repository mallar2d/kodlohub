"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export default function KodloruneAwaitingClient() {
  const { user } = useAuth();
  const supabase = createClient();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Set flag in localStorage indicating the user has seen the resumption announcement
    try {
      localStorage.setItem("kodlorune_resumed", "true");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const checkPremium = async () => {
      let active = localStorage.getItem("kodlohub_premium") === "true";

      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_premium")
            .eq("id", user.id)
            .single();

          if (profile?.role === "owner" || profile?.role === "podrofikovany" || profile?.is_premium) {
            active = true;
          }
        } catch {}
      }

      setIsPremium(active);
    };

    checkPremium();
    window.addEventListener("premium_updated", checkPremium);
    return () => {
      window.removeEventListener("premium_updated", checkPremium);
    };
  }, [user, supabase]);

  return (
    <article className="min-h-screen px-4 pb-20 pt-32 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-hairline-dark pb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-on-primary font-mono font-semibold uppercase border border-hairline-dark">
              ОФІЦІЙНЕ ОГОЛОШЕННЯ
            </span>
            <span className="micro-cap text-ink-mute text-[10px]">KODLORUNE</span>
          </div>
          <h1 className="heading-section text-on-primary">
            KODLORUNE IS AWAITING: Розробку офіційно відновлено
          </h1>
          <p className="mt-4 text-sm font-mono text-ink-mute">
            Статус розробки змінено на АКТИВНИЙ
          </p>
        </header>

        <div className="mt-10 space-y-6 text-base leading-7 text-on-primary-mute sm:text-lg sm:leading-8">
          <p>
            Ми раді повідомити, що розробку гри <strong className="font-bold text-on-primary">KODLORUNE</strong> офіційно{" "}
            <strong className="font-bold text-white">відновлено</strong>. Попереднє рішення про повне скасування проєкту переглянуто.
          </p>

          <p>
            Робота над проєктом повертається до активної стадії. Концепція, геймплейні механіки, музичний супровід та візуальний стиль отримали новий подих і продовжують розвиватися.
          </p>
        </div>

        {/* Premium Callout / Gratitude Banner */}
        <div className="mt-12 card-dark p-6 sm:p-8 rounded-3xl border border-white/20 bg-canvas-night-soft relative overflow-hidden space-y-4">
          {/* Subtle ambient backglow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Sparkle Glint */}
          <div className="absolute top-4 right-4 text-cyan-300/70 animate-twinkle pointer-events-none">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          {isPremium ? (
            <>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white font-[var(--font-display)]">
                  Дякуємо за підтримку розробки!
                </h2>
                <p className="text-sm text-ink-mute leading-relaxed max-w-xl">
                  Завдяки вашій підписці KodloHUB Premium розробка Кодлоруни активно триває. Вам відкрито повний доступ до матеріалів та білдів.
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/premium/kodlorune"
                  className="btn-solid !py-3 !px-6 !text-xs font-mono font-bold uppercase tracking-wider inline-block text-center shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-white/90 transition-all cursor-pointer"
                >
                  ВІДКРИТИ МАТЕРІАЛИ РОЗРОБКИ →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white font-[var(--font-display)]">
                  Підтримайте розробку Кодлоруни
                </h2>
                <p className="text-sm text-ink-mute leading-relaxed max-w-xl">
                  Ви можете підтримати створення гри та отримати ексклюзивний ранній доступ до закритих білдів, концепт-артів і матеріалів розробки з підпискою KodloHUB Premium.
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/premium"
                  className="btn-solid !py-3 !px-6 !text-xs font-mono font-bold uppercase tracking-wider inline-block text-center shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-white/90 transition-all cursor-pointer"
                >
                  ОТРИМАТИ РАННІЙ ДОСТУП (22 ₴) →
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-hairline-dark flex items-center justify-between">
          <Link
            href="/"
            className="btn-ghost text-on-primary text-xs inline-flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5" />
              <path d="m11 18-6-6 6-6" />
            </svg>
            <span>ПОВЕРНУТИСЯ НА ГОЛОВНУ</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
