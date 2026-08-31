"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

const CARD_NUMBER = "4149607855830523";
const CARD_NUMBER_FORMATTED = "4149 6078 5583 0523";

export default function PaymentClient() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const userIdentifier = user?.user_metadata?.display_name || user?.email?.split("@")[0] || user?.email || "ваш нікнейм";

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[680px] mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hairline-dark bg-canvas-night-soft/60 backdrop-blur-md">
            <span className="micro-cap text-[10px] text-ink-mute tracking-widest uppercase font-mono">
              ОПЛАТА KODLOHUB PREMIUM
            </span>
          </div>
          <h1 className="heading-hero text-3xl sm:text-4xl font-bold uppercase tracking-tight text-on-primary">
            ПРЯМИЙ ПЕРЕКАЗ НА КАРТУ
          </h1>
        </div>

        {/* Honest Notice */}
        <div className="card-dark p-6 sm:p-7 rounded-3xl border border-hairline-dark space-y-4 bg-canvas-night-soft">
          <div className="p-4 rounded-2xl bg-canvas-night border border-hairline-dark space-y-2">
            <p className="text-sm font-semibold text-on-primary leading-relaxed">
              «Я їбав підключати LiqPay та інші платіжки, тому просто закиньте гроші на карту і вкажіть, хто це кидає.»
            </p>
            <p className="text-xs text-ink-mute font-mono">
              — Адміністрація KodloHUB
            </p>
          </div>

          {/* Card Info Box */}
          <div className="space-y-3 pt-2">
            <p className="micro-cap text-[10px] text-ink-mute tracking-wider font-mono uppercase px-1">
              РЕКВІЗИТИ ДЛЯ ОПЛАТИ (22 ₴ / МІСЯЦЬ)
            </p>
            <div className="p-5 rounded-2xl bg-canvas-night border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-ink-mute font-mono uppercase block">
                  Номер картки
                </span>
                <span className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-on-primary select-all">
                  {CARD_NUMBER_FORMATTED}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="btn-solid !py-2.5 !px-5 !text-xs font-mono font-bold shrink-0 cursor-pointer transition-all"
              >
                {copied ? "СКОПІЙОВАНО" : "СКОПІЮВАТИ"}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 pt-4 border-t border-hairline-dark">
            <p className="micro-cap text-[10px] text-ink-mute tracking-wider font-mono uppercase px-1">
              ЯК ОТРИМАТИ ПРЕМІУМ:
            </p>
            <ol className="space-y-2.5 text-xs text-on-primary-mute leading-relaxed list-decimal list-inside font-mono">
              <li>
                Перекажіть <strong className="text-white">22 ₴</strong> (або скільки бажаєте на фонд слопу) на вказану картку.
              </li>
              <li>
                У призначенні платежу або повідомленні вкажіть:{" "}
                <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold inline-block mt-1">
                  {userIdentifier}
                </span>
              </li>
              <li>
                Головний адмін перевірить надходження коштів та видасть статус <strong className="text-white">Premium</strong> вручну в адмін-панелі.
              </li>
            </ol>
          </div>

          {/* User Account Info */}
          {user ? (
            <div className="p-3.5 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-between text-xs font-mono">
              <span className="text-ink-mute">Ваш акаунт:</span>
              <span className="text-white font-bold">{user.email}</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-canvas-night border border-hairline-dark text-xs font-mono text-ink-mute">
              Ви зараз не авторизовані. Будь ласка,{" "}
              <Link href="/login?next=/payment" className="underline font-bold text-white">
                увійдіть в акаунт
              </Link>
              , щоб ми знали, кому видавати Premium.
            </div>
          )}

          {/* Leak Warning Box */}
          <div className="p-4 rounded-2xl bg-canvas-night border border-hairline-dark text-xs font-mono text-ink-mute space-y-1">
            <p className="text-white font-bold uppercase tracking-wider text-[11px]">
              УВАГА ЩОДО ЗЛИВУ ІНФОРМАЦІЇ:
            </p>
            <p className="leading-relaxed text-[11px]">
              У разі зливу закритої інформації, тестових білдів або матеріалів розробки — підписка анулюється без повернення коштів, а доступ блокується назавжди.
            </p>
          </div>

          {/* Back Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/premium"
              className="btn-ghost !text-xs !py-2 !px-5 w-full sm:w-auto text-center"
            >
              ← НАЗАД ДО ТАРИФУ
            </Link>
            <Link
              href="/"
              className="text-xs text-ink-mute hover:text-white font-mono transition-colors"
            >
              На головну сторінку
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
