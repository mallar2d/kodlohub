"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import Avatar from "@/components/ui/Avatar";

type LeaderboardRow = {
  user_id: string;
  count: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type MeData = {
  userId: string;
  count: number;
  lastHitAt: string | null;
  rank: number | null;
  cooldownMs: number;
};

type HammerState = {
  totalHits: number;
  totalHitters: number;
  leaderboard: LeaderboardRow[];
  me: MeData | null;
};

const HIT_MESSAGES = [
  "БАБАХ!",
  "ТРЩ!",
  "ЙОБНУВ!",
  "БАХ-БАХ!",
  "ШЛЯХ!",
  "ХРЯСЬ!",
  "ЛЯЗГ!",
  "ТУК!",
  "ГАРНА ЗМАЗКА!",
  "ВЛУЧНО!",
  "КАПЕЦЬ!",
  "БЕЗ ПОЩАДИ!",
];

const SPECIAL_MESSAGES = [
  "КРОВАВА НІЧ!",
  "22:00 — ЧАС КРОВІ!",
  "МНОЖНИК 22x!",
  "ПОЛУНОК КРОВІ!",
  "САТАНИНСЬКИЙ УДАР!",
];

function playHitSound(isSpecial: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Impact oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = isSpecial ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(isSpecial ? 75 : 130, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Ignore audio context errors
  }
}

function formatCooldown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimeUntil2200(): string {
  const now = new Date();
  const target = new Date();
  target.setHours(22, 0, 0, 0);
  if (now.getTime() > target.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const diff = target.getTime() - now.getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours} год ${minutes} хв`;
}

export default function HammerClient() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HammerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hitting, setHitting] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [floaters, setFloaters] = useState<{ id: number; x: number; label: string }[]>([]);
  const [shockwaves, setShockwaves] = useState<number[]>([]);
  const [animHit, setAnimHit] = useState(false);
  const [specialHit, setSpecialHit] = useState(false);
  const [lastMultiplier, setLastMultiplier] = useState(1);
  const floaterIdRef = useRef(0);
  const lastHammerHitAtRef = useRef<string | null>(null);
  const hittingRef = useRef(false);
  const { toast } = useToast();

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/hammer", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as HammerState;
      setState(data);
      if (data.me?.lastHitAt) {
        lastHammerHitAtRef.current = data.me.lastHitAt;
        const elapsed = Date.now() - new Date(data.me.lastHitAt).getTime();
        const remaining = (data.me.cooldownMs ?? 3600000) - elapsed;
        setCooldownLeft(remaining > 0 ? remaining : 0);
      } else {
        setCooldownLeft(0);
      }
    } catch {
      toast("Не вдалося отримати дані молотка", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) fetchState();
  }, [authLoading, fetchState]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  const onHit = useCallback(async () => {
    if (!user) {
      toast("Увійди, щоб йобнути молотком", "error");
      return;
    }
    if (hittingRef.current || cooldownLeft > 0) return;

    hittingRef.current = true;
    setHitting(true);
    setAnimHit(true);

    const isSpecialTime = new Date().getHours() === 22 && new Date().getMinutes() === 0;
    playHitSound(isSpecialTime);

    // Trigger shockwave
    const swId = Date.now();
    setShockwaves((prev) => [...prev, swId]);
    setTimeout(() => {
      setShockwaves((prev) => prev.filter((id) => id !== swId));
    }, 900);

    const msgPool = isSpecialTime ? SPECIAL_MESSAGES : HIT_MESSAGES;
    const label = msgPool[Math.floor(Math.random() * msgPool.length)] ?? "БАБАХ!";
    const id = ++floaterIdRef.current;
    setFloaters((arr) => [...arr, { id, x: 25 + Math.random() * 50, label }]);
    setTimeout(() => {
      setFloaters((arr) => arr.filter((f) => f.id !== id));
    }, 1300);
    setTimeout(() => setAnimHit(false), 500);

    try {
      const res = await fetch("/api/hammer", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && typeof data.remainingMs === "number") {
          setCooldownLeft(data.remainingMs);
        }
        toast(data.error ?? "Не вдалося вдарити", "error");
        return;
      }

      const mult = data.multiplier ?? 1;
      setLastMultiplier(mult);

      if (data.isSpecial || mult > 1) {
        setSpecialHit(true);
        setTimeout(() => setSpecialHit(false), 3000);
        toast(`КРОВАВА НІЧ! x${mult} МНОЖНИК!`, "success");
      } else {
        toast("БАБАХ! Удар зараховано.", "success");
      }

      lastHammerHitAtRef.current = data.hitAt;
      const remaining = state?.me?.cooldownMs ?? 60 * 60 * 1000;
      setCooldownLeft(remaining);
      await fetchState();
    } catch {
      toast("Помилка мережі", "error");
    } finally {
      hittingRef.current = false;
      setHitting(false);
    }
  }, [user, cooldownLeft, toast, state, fetchState]);

  const me = state?.me ?? null;
  const isAuthed = !!user;
  const canHit = isAuthed && cooldownLeft <= 0 && !hitting;

  const timeUntil22 = useMemo(() => getTimeUntil2200(), []);

  return (
    <div className={`grid lg:grid-cols-[1.15fr_1fr] gap-8 relative ${animHit ? "animate-[impactShake_0.35s_ease-out]" : ""}`}>
      {/* Кровавий оверлей при 22:00 ударі */}
      {specialHit && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ animation: "bloodFlash 3s ease-out forwards" }}
        >
          <div className="absolute inset-0 bg-red-600/30 backdrop-blur-xs" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 20%, rgba(139,0,0,0.5) 60%, rgba(80,0,0,0.85) 100%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-[var(--font-display)] text-7xl sm:text-9xl font-black text-red-500 tracking-widest uppercase drop-shadow-[0_0_40px_rgba(220,38,38,1)]"
              style={{ animation: "specialPulse 0.6s ease-in-out infinite alternate" }}
            >
              x{lastMultiplier}
            </span>
            <span className="font-mono text-xs sm:text-sm text-red-300 uppercase tracking-widest mt-2">
              КРОВАВА НІЧ 22:00
            </span>
          </div>
        </div>
      )}

      {/* Ліва колонка: Інтерактивне Ковадло / Молоток */}
      <div className="card-dark p-6 sm:p-10 rounded-2xl flex flex-col items-center justify-between text-center relative overflow-hidden">
        <div className="w-full flex items-center justify-between gap-2 mb-6">
          <p className="micro-cap text-ink-mute text-[10px]">КОВАДЛО-РЕАКТОР</p>
          <span className="button-cap px-2.5 py-0.5 rounded-full border border-hairline-dark bg-canvas-night text-[10px] text-ink-mute font-mono">
            {canHit ? "ГОТОВО ДО УДАРУ" : "ОХОЛОДЖЕННЯ"}
          </span>
        </div>

        {/* Central Hammer Button Area */}
        <div className="relative w-full flex-1 flex items-center justify-center py-8 sm:py-12">
          {/* Shockwaves */}
          {shockwaves.map((swId) => (
            <div
              key={swId}
              className="absolute pointer-events-none rounded-full border-2 border-white/60 animate-[shockwaveExpand_0.8s_ease-out_forwards]"
              style={{ width: "260px", height: "260px" }}
            />
          ))}

          {/* Floating Impact Words */}
          {floaters.map((f) => (
            <span
              key={f.id}
              className="pointer-events-none absolute bottom-1/2 left-0 font-[var(--font-display)] text-3xl sm:text-4xl font-black text-on-primary tracking-widest uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] z-30"
              style={{
                left: `${f.x}%`,
                animation: "floatUp 1.3s ease-out forwards",
              }}
            >
              {f.label}
            </span>
          ))}

          {/* Clean Concentric Hammer Button */}
          <button
            type="button"
            onClick={onHit}
            disabled={!canHit}
            className={`group relative w-60 h-60 sm:w-72 sm:h-72 rounded-full flex flex-col items-center justify-center border border-hairline-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-all duration-300 select-none ${
              canHit
                ? "cursor-pointer bg-[#141518] hover:bg-[#181a1f] hover:border-white/40 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
                : "cursor-not-allowed bg-[#0e0f11] opacity-80"
            }`}
            aria-label="Вдарити молотком"
          >
            {/* Hammer Graphic */}
            <span
              className={`select-none transition-all duration-300 ${
                canHit
                  ? "group-hover:-rotate-12 group-hover:scale-110 text-on-primary"
                  : "text-ink-mute opacity-50"
              } ${animHit ? "rotate-[32deg] scale-90" : "rotate-0"}`}
            >
              <svg
                width="76"
                height="76"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-18 h-18 sm:w-20 sm:h-20"
              >
                <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                <path d="m18 15 4-4" />
                <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
              </svg>
            </span>

            {/* Cooldown Timer */}
            {!canHit && cooldownLeft > 0 && (
              <span className="mt-3 font-mono font-bold text-lg sm:text-xl tracking-wider text-on-primary">
                {formatCooldown(cooldownLeft)}
              </span>
            )}
          </button>
        </div>

        {/* Bottom CTA / Status Info */}
        <div className="w-full pt-4 border-t border-hairline-dark">
          {!isAuthed ? (
            <div className="space-y-3">
              <p className="text-on-primary-mute text-xs">
                Потрібно увійти в систему, щоб здійснити удар молотком
              </p>
              <Link href="/login" className="btn-solid !py-2 !px-6 !text-xs">
                УВІЙТИ В АКАУНТ
              </Link>
            </div>
          ) : cooldownLeft > 0 ? (
            <p className="micro-cap text-ink-mute text-[11px]">
              НАСТУПНИЙ УДАР ДОСТУПНИЙ ЧЕРЕЗ{" "}
              <span className="text-on-primary font-mono font-bold text-xs">
                {formatCooldown(cooldownLeft)}
              </span>
            </p>
          ) : (
            <p className="micro-cap text-on-primary text-[11px] font-mono font-bold">
              ⚡ МОЛОТОК ЗАРЯДЖЕНИЙ · НАТИСНИ ДЛЯ УДАРУ
            </p>
          )}

          {/* 22:00 Blood Night Mode Widget */}
          <div className="mt-4 p-2.5 rounded-xl bg-canvas-night border border-hairline-dark/60 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-mute font-mono text-[11px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              ПРОТОКОЛ 22:00 (x22 МНОЖНИК)
            </span>
            <span className="text-on-primary font-mono text-[11px] font-semibold">
              ЧЕРЕЗ {timeUntil22}
            </span>
          </div>
        </div>
      </div>

      {/* Права колонка: статистика + лідерборд */}
      <div className="space-y-6">
        {/* Global & Personal Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-dark p-5 rounded-xl">
            <p className="micro-cap text-ink-mute text-[10px] mb-1">ЗАГАЛОМ УДАРІВ</p>
            <p className="heading-sub !text-2xl text-on-primary font-mono leading-none">
              {(state?.totalHits ?? 0).toLocaleString("uk-UA")}
            </p>
            <p className="text-xs text-ink-mute mt-2">
              від <span className="text-on-primary font-bold">{state?.totalHitters ?? 0}</span> бійців
            </p>
          </div>

          <div className="card-dark p-5 rounded-xl">
            <p className="micro-cap text-ink-mute text-[10px] mb-1">ТВОЯ АКТИВНІСТЬ</p>
            <p className="heading-sub !text-2xl text-on-primary font-mono leading-none">
              {isAuthed && me ? me.count.toLocaleString("uk-UA") : "—"}
            </p>
            <p className="text-xs text-ink-mute mt-2">
              {isAuthed && me?.rank ? `Місце у топі: #${me.rank}` : "Увійдіть для участі"}
            </p>
          </div>
        </div>

        {/* Global Top Leaderboard */}
        <div className="card-dark p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="micro-cap text-ink-mute text-[11px]">ТОП КОВАЛІВ ХАБУ</p>
            <span className="micro-cap text-ink-mute text-[10px] font-mono">LIVE СИНХРОНІЗАЦІЯ</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-ink-mute text-xs py-8 justify-center">
              <span className="animate-spin w-4 h-4 border border-on-primary border-t-transparent rounded-full" />
              Оновлення таблиці лідерів...
            </div>
          ) : !state || state.leaderboard.length === 0 ? (
            <p className="text-on-primary-mute text-xs py-8 text-center">
              Ще ніхто не здійснив удару. Будь першим.
            </p>
          ) : (
            <div className="divide-y divide-hairline-dark/60">
              {state.leaderboard.map((row, idx) => {
                const isMe = me?.userId === row.user_id;
                const rank = idx + 1;
                const name = row.display_name || row.username || "Кодло-коваль";
                return (
                  <div
                    key={row.user_id}
                    className={`flex items-center justify-between py-3 px-2 rounded-xl transition-colors ${
                      isMe ? "bg-white/[0.04]" : "hover:bg-canvas-night/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Clean Minimalist Monochrome Rank */}
                      <span
                        className={`w-5 text-center font-mono font-bold text-sm shrink-0 ${
                          rank === 1
                            ? "text-on-primary"
                            : rank === 2
                            ? "text-zinc-300"
                            : rank === 3
                            ? "text-zinc-400"
                            : "text-ink-mute text-xs font-normal"
                        }`}
                      >
                        {rank}
                      </span>

                      <Avatar src={row.avatar_url} displayName={name} size={28} />

                      <div className="min-w-0">
                        <Link
                          href={`/profile/${row.user_id}`}
                          className="text-xs font-semibold hover:underline truncate block text-on-primary"
                        >
                          {name}
                        </Link>
                        {isMe && <span className="text-[10px] text-ink-mute font-mono">Це ви</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span className="font-mono text-sm font-bold text-on-primary">
                        {row.count}
                      </span>
                      <span className="micro-cap text-ink-mute text-[10px]">уд.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-ink-mute text-[11px] text-center font-mono">
          Глобальний протокол ударів зберігається в базі даних назавжди.
        </p>
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translateY(-25px) scale(1.15);
          }
          100% {
            opacity: 0;
            transform: translateY(-130px) scale(0.85);
          }
        }
        @keyframes shockwaveExpand {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        @keyframes impactShake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-3px, 2px); }
          40% { transform: translate(3px, -2px); }
          60% { transform: translate(-2px, 1px); }
          80% { transform: translate(2px, -1px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes bloodFlash {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes specialPulse {
          0% { transform: scale(1); text-shadow: 0 0 20px rgba(220,38,38,0.8); }
          100% { transform: scale(1.15); text-shadow: 0 0 60px rgba(220,38,38,1), 0 0 120px rgba(139,0,0,0.6); }
        }
      `}</style>
    </div>
  );
}
