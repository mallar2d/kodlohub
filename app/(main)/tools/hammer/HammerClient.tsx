"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { User } from "@supabase/supabase-js";

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

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "щойно";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} хв тому`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} год тому`;
  return `${Math.floor(diff / 86_400_000)} д тому`;
}

export default function HammerClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [state, setState] = useState<HammerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [hitting, setHitting] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [floaters, setFloaters] = useState<
    { id: number; x: number; label: string }[]
  >([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [animHit, setAnimHit] = useState(false);
  const floaterIdRef = useRef(0);
  const lastHammerHitAtRef = useRef<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user);
      setAuthLoaded(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User | null } | null) => {
        setUser(session?.user ?? null);
      },
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/hammer", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as HammerState;
      setState(data);
      if (data.me?.lastHitAt) {
        lastHammerHitAtRef.current = data.me.lastHitAt;
        const elapsed = Date.now() - new Date(data.me.lastHitAt).getTime();
        const remaining = (data.me.cooldownMs ?? 0) - elapsed;
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
    if (authLoaded) fetchState();
  }, [authLoaded, fetchState]);

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
    if (hitting || cooldownLeft > 0) return;

    setHitting(true);
    setAnimHit(true);
    setShakeKey((k) => k + 1);

    const label =
      HIT_MESSAGES[Math.floor(Math.random() * HIT_MESSAGES.length)] ?? "БАБАХ!";
    const id = ++floaterIdRef.current;
    setFloaters((arr) => [
      ...arr,
      { id, x: 30 + Math.random() * 40, label },
    ]);
    setTimeout(() => {
      setFloaters((arr) => arr.filter((f) => f.id !== id));
    }, 1400);
    setTimeout(() => setAnimHit(false), 600);

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
      lastHammerHitAtRef.current = data.hitAt;
      const remaining =
        state?.me?.cooldownMs ?? 60 * 60 * 1000;
      setCooldownLeft(remaining);
      toast("ЗАРЯДЖАЄМО... раз на годину!", "success");
      await fetchState();
    } catch {
      toast("Помилка мережі", "error");
    } finally {
      setHitting(false);
    }
  }, [user, hitting, cooldownLeft, toast, state, fetchState]);

  const me = state?.me ?? null;
  const isAuthed = !!user;
  const canHit = isAuthed && cooldownLeft <= 0 && !hitting;

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
      {/* Ліва колонка: молоток */}
      <div className="card-dark p-6 sm:p-10 flex flex-col items-center text-center relative overflow-hidden">
        <p className="micro-cap text-ink-mute mb-6">ГОЛОВНИЙ МОЛОТОК</p>

        <div className="relative w-full flex-1 flex items-center justify-center min-h-[280px] sm:min-h-[340px]">
          {floaters.map((f) => (
            <span
              key={f.id}
              className="pointer-events-none absolute bottom-1/2 left-0 font-[var(--font-display)] text-2xl sm:text-3xl font-black text-on-primary tracking-widest uppercase drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]"
              style={{
                left: `${f.x}%`,
                animation: "floatUp 1.3s ease-out forwards",
              }}
            >
              {f.label}
            </span>
          ))}

          <button
            type="button"
            onClick={onHit}
            disabled={!canHit}
            className={`group relative w-56 h-56 sm:w-72 sm:h-72 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-transform ${
              canHit ? "cursor-pointer hover:scale-105" : "cursor-not-allowed"
            } ${animHit ? "scale-90" : "scale-100"}`}
            aria-label="Вдарити молотком"
          >
            <span
              key={shakeKey}
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0 8%, transparent 32%), " +
                  "radial-gradient(circle at 60% 60%, rgba(220,38,38,0.18), transparent 40%), " +
                  "radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 60%, #000 100%)",
                boxShadow: canHit
                  ? "0 0 60px rgba(255,255,255,0.18), inset 0 0 40px rgba(0,0,0,0.9)"
                  : "0 0 25px rgba(255,255,255,0.05), inset 0 0 40px rgba(0,0,0,0.9)",
                animation: animHit ? "hammerImpact 0.55s ease-out" : undefined,
              }}
            />

            <span
              className={`absolute inset-0 rounded-full border-2 transition-colors ${
                canHit
                  ? "border-on-primary/40 group-hover:border-on-primary"
                  : "border-hairline-dark"
              }`}
            />

            <span
              className={`text-7xl sm:text-8xl select-none transition-transform duration-300 ${
                canHit ? "group-hover:-rotate-12" : ""
              } ${animHit ? "rotate-[25deg] scale-90" : "rotate-0"}`}
            >
              🔨
            </span>

            {!canHit && cooldownLeft > 0 && (
              <span className="absolute inset-x-0 bottom-6 text-center text-2xl sm:text-3xl font-[var(--font-display)] font-black tracking-widest text-on-primary">
                {formatCooldown(cooldownLeft)}
              </span>
            )}
          </button>
        </div>

        <div className="mt-6 w-full">
          {!isAuthed ? (
            <div>
              <p className="text-on-primary-mute text-sm mb-3">
                Увійди, щоб йобнути молотком
              </p>
              <Link href="/login" className="btn-ghost text-on-primary inline-block">
                УВІЙТИ
              </Link>
            </div>
          ) : cooldownLeft > 0 ? (
            <p className="micro-cap text-ink-mute">
              Наступний удар через{" "}
              <span className="text-on-primary font-bold">
                {formatCooldown(cooldownLeft)}
              </span>
            </p>
          ) : (
            <p className="micro-cap text-ink-mute">
              Ти можеш вдарити. Не зловживай.
            </p>
          )}
        </div>
      </div>

      {/* Права колонка: статистика + лідерборд */}
      <div className="flex flex-col gap-6">
        <div className="card-dark p-6">
          <p className="micro-cap text-ink-mute mb-3">ЗАГАЛОМ</p>
          <p className="heading-sub text-on-primary leading-none">
            {(state?.totalHits ?? 0).toLocaleString("uk-UA")}
          </p>
          <p className="text-on-primary-mute text-sm mt-1">
            ударів від{" "}
            <span className="text-on-primary font-bold">
              {(state?.totalHitters ?? 0).toLocaleString("uk-UA")}
            </span>{" "}
            учасників
          </p>
        </div>

        {isAuthed && me && (
          <div className="card-dark p-6">
            <p className="micro-cap text-ink-mute mb-3">ТИ</p>
            <div className="flex items-baseline gap-3">
              <p className="heading-sub text-on-primary leading-none">
                {me.count.toLocaleString("uk-UA")}
              </p>
              <p className="text-on-primary-mute text-sm">разів йобнув</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div>
                <p className="text-ink-mute micro-cap">МІСЦЕ В ТОПІ</p>
                <p className="text-on-primary font-bold text-lg mt-1">
                  {me.rank ? `#${me.rank}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-ink-mute micro-cap">ОСТАННІЙ УДАР</p>
                <p className="text-on-primary font-bold text-sm mt-1">
                  {timeAgo(me.lastHitAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card-dark p-6">
          <p className="micro-cap text-ink-mute mb-4">ТОП ЛІДЕРІВ</p>
          {loading ? (
            <div className="flex items-center gap-2 text-ink-mute text-sm py-4 justify-center">
              <span className="animate-spin w-3 h-3 border border-on-primary border-t-transparent rounded-full" />
              завантаження...
            </div>
          ) : !state || state.leaderboard.length === 0 ? (
            <p className="text-on-primary-mute text-sm py-4 text-center">
              Ще ніхто не йобнув. Будь першим.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {state.leaderboard.map((row, idx) => {
                const isMe = me?.userId === row.user_id;
                const rank = idx + 1;
                const medal =
                  rank === 1
                    ? "1"
                    : rank === 2
                      ? "2"
                      : rank === 3
                        ? "3"
                        : `${rank}`;
                const name =
                  row.display_name || row.username || "анонімний кодло";
                return (
                  <li
                    key={row.user_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded ${
                      isMe ? "bg-canvas-night-soft" : ""
                    }`}
                  >
                    <span
                      className={`w-7 text-center font-[var(--font-display)] font-black text-sm ${
                        rank === 1
                          ? "text-yellow-300"
                          : rank === 2
                            ? "text-gray-300"
                            : rank === 3
                              ? "text-amber-600"
                              : "text-ink-mute"
                      }`}
                    >
                      {medal}
                    </span>
                    {row.avatar_url ? (
                      <img
                        src={row.avatar_url}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover bg-canvas-cool"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-xs font-bold">
                        {(row.username || row.display_name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <Link
                      href={`/profile/${row.user_id}`}
                      className={`flex-1 truncate text-sm hover:underline ${
                        isMe ? "text-on-primary font-bold" : "text-on-primary-mute"
                      }`}
                    >
                      {name}
                      {isMe && (
                        <span className="ml-2 micro-cap text-ink-mute">
                          (ти)
                        </span>
                      )}
                    </Link>
                    <span className="font-[var(--font-display)] font-black text-on-primary text-base tabular-nums">
                      {row.count}
                    </span>
                    <span className="micro-cap text-ink-mute hidden sm:inline">
                      ударів
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <p className="text-on-primary-mute/40 text-[10px] text-center">
          Глобальний рахунок спільний для всіх учасників KodloHUB.
          Удари зберігаються в історії назавжди.
        </p>
      </div>

      <style jsx global>{`
        @keyframes hammerImpact {
          0% {
            transform: scale(1) rotate(0deg);
          }
          18% {
            transform: scale(0.82) rotate(-3deg);
          }
          38% {
            transform: scale(1.12) rotate(2deg);
          }
          60% {
            transform: scale(0.96) rotate(-1deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translateY(-30px) scale(1.15);
          }
          100% {
            opacity: 0;
            transform: translateY(-160px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
