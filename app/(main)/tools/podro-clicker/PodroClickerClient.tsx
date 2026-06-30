"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import HelperShop from "@/components/podro-clicker/HelperShop";
import UpgradeShop from "@/components/podro-clicker/UpgradeShop";
import AchievementsPanel from "@/components/podro-clicker/AchievementsPanel";
import PrestigePanel from "@/components/podro-clicker/PrestigePanel";
import ClickerLeaderboard, { type ClickerLeaderboardRow } from "@/components/podro-clicker/ClickerLeaderboard";
import {
  ACHIEVEMENTS,
  CLICK_QUOTES,
  CRIT_QUOTES,
  OFFLINE_MESSAGES,
  SPECIAL_HOUR,
  STORAGE_KEY,
  formatGrams,
  getRankForCareerGrams,
  type HelperId,
} from "@/lib/podro-clicker/gameConfig";
import {
  applyClick,
  applyNewAchievements,
  applyOfflineProgress,
  buyHelper,
  buyUpgrade,
  computeClickPower,
  computeEffectiveGps,
  createInitialState,
  doPrestige,
  getCritChance,
  normalizeState,
  tick,
  type ClickerState,
} from "@/lib/podro-clicker/state";

type Tab = "shop" | "upgrades" | "achievements" | "leaderboard";

const LOCAL_SAVE_INTERVAL_MS = 3_000;
const SERVER_SAVE_INTERVAL_MS = 20_000;
const TICK_INTERVAL_MS = 200;

interface Floater {
  id: number;
  x: number;
  label: string;
  crit: boolean;
}

function secondsUntilNextHour(now: Date, hour: number): number {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function PodroClickerClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<ClickerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("shop");
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [quoteBubble, setQuoteBubble] = useState<string | null>(null);
  const [animHit, setAnimHit] = useState(false);
  const [critFlash, setCritFlash] = useState(false);
  const [offlineModal, setOfflineModal] = useState<{ gained: number; message: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<ClickerLeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const stateRef = useRef<ClickerState | null>(null);
  const achievementsRef = useRef<Set<string>>(new Set());
  const frameTimeRef = useRef<number>(0);
  const floaterIdRef = useRef(0);
  const quoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitState = useCallback(
    (next: ClickerState) => {
      const withAchievements = applyNewAchievements(next);
      const newly = withAchievements.achievements.filter((id) => !achievementsRef.current.has(id));
      if (newly.length > 0) {
        newly.forEach((id) => achievementsRef.current.add(id));
        const achievement = ACHIEVEMENTS.find((a) => a.id === newly[0]);
        if (achievement) toast(`АЧІВКА: ${achievement.name}`, "success");
      }
      stateRef.current = withAchievements;
      setState(withAchievements);
      return withAchievements;
    },
    [toast],
  );

  const persistLocal = useCallback(() => {
    if (!stateRef.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch {
      // localStorage недоступний (приватний режим тощо) — мовчки ігноруємо
    }
  }, []);

  const persistServer = useCallback(async () => {
    if (!stateRef.current || !user) return;
    try {
      await fetch("/api/podro-clicker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: stateRef.current }),
      });
    } catch {
      // мережа підвела — спробуємо наступного разу
    }
  }, [user]);

  const loadFromLocalStorage = useCallback(() => {
    let raw: unknown = null;
    if (typeof window !== "undefined") {
      try {
        raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      } catch {
        raw = null;
      }
    }
    const loaded = normalizeState(raw ?? {});
    const { state: afterOffline, gained, cappedMs } = applyOfflineProgress(loaded, Date.now());
    if (gained > 1 && cappedMs > 60_000) {
      const message = OFFLINE_MESSAGES[Math.floor(Math.random() * OFFLINE_MESSAGES.length)];
      setOfflineModal({ gained, message });
    }
    achievementsRef.current = new Set(afterOffline.achievements);
    stateRef.current = afterOffline;
    setState(afterOffline);
    frameTimeRef.current = Date.now();
    setLoading(false);
  }, []);

  // --- завантаження локального стану + офлайн-прогрес ---
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // --- синхронізація з сервером (лідерборд завжди, прогрес — якщо авторизований) ---
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/podro-clicker", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (cancelled) return;
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        if (user && data.progress) {
          const serverState = normalizeState(data.progress);
          const local = stateRef.current ?? createInitialState();
          if (serverState.careerGrams > local.careerGrams) {
            const merged = applyOfflineProgress(serverState, Date.now()).state;
            achievementsRef.current = new Set(merged.achievements);
            stateRef.current = merged;
            setState(merged);
          }
        }
      } catch {
        // ок, лишаємось на локальних даних
      } finally {
        if (!cancelled) setLeaderboardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // --- основний тік симуляції ---
  useEffect(() => {
    const id = setInterval(() => {
      const nowMs = Date.now();
      const delta = nowMs - frameTimeRef.current;
      frameTimeRef.current = nowMs;
      const prev = stateRef.current;
      if (!prev) return;
      const { state: next } = tick(prev, delta, new Date(nowMs));
      commitState(next);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [commitState]);

  // --- годинник для бонусу 22:00 ---
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- збереження: локально часто, на сервер рідше ---
  useEffect(() => {
    const localId = setInterval(persistLocal, LOCAL_SAVE_INTERVAL_MS);
    const serverId = setInterval(persistServer, SERVER_SAVE_INTERVAL_MS);
    const flush = () => {
      persistLocal();
      persistServer();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      clearInterval(localId);
      clearInterval(serverId);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [persistLocal, persistServer]);

  const loadMutedPreference = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("podro_clicker_muted");
    if (stored === "1") setMuted(true);
  }, []);

  useEffect(() => {
    loadMutedPreference();
  }, [loadMutedPreference]);

  const playSound = useCallback(
    (volume: number) => {
      if (muted || typeof window === "undefined") return;
      try {
        const audio = new Audio("/PDR_PRODUCTION_SOUND.mp3");
        audio.volume = volume;
        void audio.play().catch(() => {});
      } catch {
        // ігноруємо — звук не критичний
      }
    },
    [muted],
  );

  const showQuote = useCallback((pool: string[]) => {
    const text = pool[Math.floor(Math.random() * pool.length)];
    setQuoteBubble(text);
    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = setTimeout(() => setQuoteBubble(null), 1900);
  }, []);

  const handleClick = useCallback(() => {
    const prev = stateRef.current;
    if (!prev) return;
    const clickDate = new Date();
    const { state: next, gained, isCrit, isSpecial } = applyClick(prev, clickDate);
    commitState(next);
    persistLocal();

    setAnimHit(true);
    setTimeout(() => setAnimHit(false), 550);

    const id = ++floaterIdRef.current;
    const label = `+${formatGrams(gained)}`;
    setFloaters((arr) => [...arr, { id, x: 18 + Math.random() * 64, label, crit: isCrit }]);
    setTimeout(() => {
      setFloaters((arr) => arr.filter((f) => f.id !== id));
    }, 1300);

    if (isCrit) {
      setCritFlash(true);
      setTimeout(() => setCritFlash(false), 900);
      showQuote(CRIT_QUOTES);
      playSound(0.5);
    } else if (Math.random() < 0.08) {
      showQuote(CLICK_QUOTES);
      if (Math.random() < 0.3) playSound(0.2);
    } else if (isSpecial && Math.random() < 0.2) {
      playSound(0.3);
    }
  }, [commitState, persistLocal, playSound, showQuote]);

  const handleBuyHelper = useCallback(
    (id: HelperId) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = buyHelper(prev, id);
      if (!next) {
        toast("Не вистачає грамів кави", "error");
        return;
      }
      commitState(next);
      persistLocal();
    },
    [commitState, persistLocal, toast],
  );

  const handleBuyUpgrade = useCallback(
    (id: string) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = buyUpgrade(prev, id);
      if (!next) {
        toast("Не вистачає грамів кави", "error");
        return;
      }
      commitState(next);
      persistLocal();
      toast("Апгрейд куплено!", "success");
    },
    [commitState, persistLocal, toast],
  );

  const handlePrestige = useCallback(() => {
    const prev = stateRef.current;
    if (!prev) return;
    const next = doPrestige(prev);
    if (next === prev) return;
    const gained = next.respectPoints - prev.respectPoints;
    commitState(next);
    persistLocal();
    void persistServer();
    toast(`ШЕМЕТУВАННЯ ВІДБУЛОСЯ! +${gained} ПОВАГИ`, "success");
  }, [commitState, persistLocal, persistServer, toast]);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("podro_clicker_muted", next ? "1" : "0");
      }
      return next;
    });
  }, []);

  const nowDate = useMemo(() => new Date(now), [now]);
  const isSpecial = nowDate.getHours() === SPECIAL_HOUR;
  const countdown = useMemo(() => secondsUntilNextHour(nowDate, SPECIAL_HOUR), [nowDate]);

  const gps = state ? computeEffectiveGps(state, nowDate) : 0;
  const clickPower = state ? computeClickPower(state) : 1;
  const critChance = state ? getCritChance(state) : 0;
  const rank = state ? getRankForCareerGrams(state.careerGrams) : null;

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="animate-spin w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "shop", label: "МАГАЗИН" },
    { id: "upgrades", label: "АПГРЕЙДИ" },
    { id: "achievements", label: "АЧІВКИ" },
    { id: "leaderboard", label: "ТОП" },
  ];

  return (
    <div className="relative">
      {/* Золотий критичний оверлей */}
      {critFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none" style={{ animation: "podroCritFade 0.9s ease-out forwards" }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(255,215,120,0.25) 0%, rgba(120,80,10,0.18) 55%, transparent 80%)",
            }}
          />
        </div>
      )}

      {/* Офлайн-прогрес модалка */}
      {offlineModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="card-dark p-6 sm:p-8 max-w-sm w-full text-center">
            <p className="micro-cap text-ink-mute mb-3">ПОКИ ТЕБЕ НЕ БУЛО</p>
            <p className="text-on-primary-mute text-sm mb-2">{offlineModal.message}</p>
            <p className="heading-sub text-on-primary mb-6">{formatGrams(offlineModal.gained)} г</p>
            <button type="button" onClick={() => setOfflineModal(null)} className="btn-ghost text-on-primary w-full">
              ДОБРЕ, КОДЛО
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8">
        {/* Ліва колонка — клік-зона */}
        <div className="flex flex-col gap-6">
          {rank && (
            <div className="flex items-center justify-between">
              <span className={`micro-cap font-bold ${rank.colorClass}`}>{rank.label}</span>
              <button
                type="button"
                onClick={toggleMuted}
                className="text-ink-mute hover:text-on-primary transition-colors"
                aria-label={muted ? "Увімкнути звук" : "Вимкнути звук"}
              >
                {muted ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
            </div>
          )}

          <div className="card-dark p-6 sm:p-10 flex flex-col items-center text-center relative overflow-hidden">
            <p className="micro-cap text-ink-mute mb-1">ГРАМИ НЕСКАФЕ ГОЛД</p>
            <p className="heading-sub text-on-primary leading-none tabular-nums">{formatGrams(state.grams)}</p>
            <p className="text-on-primary-mute text-sm mt-2">
              +{formatGrams(gps)} г/с
              {isSpecial && <span className="text-yellow-400 font-bold ml-2">×22 ПОДРО-ГОДИНА</span>}
            </p>

            {!isSpecial && (
              <p className="text-ink-mute text-[11px] mt-1">
                До ПОДРО-ГОДИНИ (22:00): {formatDuration(countdown)}
              </p>
            )}

            <div className="relative w-full flex-1 flex items-center justify-center min-h-[260px] sm:min-h-[320px] mt-4">
              {quoteBubble && (
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border border-hairline-dark bg-canvas-night-soft text-on-primary text-xs font-bold uppercase tracking-wide z-10"
                  style={{ animation: "podroFloatUp 1.9s ease-out forwards" }}
                >
                  {quoteBubble}
                </div>
              )}

              {floaters.map((f) => (
                <span
                  key={f.id}
                  className={`pointer-events-none absolute bottom-1/2 left-0 font-[var(--font-display)] font-black tracking-widest uppercase drop-shadow-[0_0_18px_rgba(255,255,255,0.5)] ${
                    f.crit ? "text-3xl sm:text-4xl text-yellow-300" : "text-xl sm:text-2xl text-on-primary"
                  }`}
                  style={{ left: `${f.x}%`, animation: "podroFloatUp 1.3s ease-out forwards" }}
                >
                  {f.label}
                  {f.crit && " КРИТ!"}
                </span>
              ))}

              <button
                type="button"
                onClick={handleClick}
                className={`group relative w-52 h-52 sm:w-64 sm:h-64 rounded-full overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-transform hover:scale-105 ${
                  animHit ? "scale-90" : "scale-100"
                }`}
                aria-label="Клікнути Подро"
              >
                <span
                  className="absolute inset-0 rounded-full border-2 border-on-primary/40 group-hover:border-on-primary transition-colors z-10"
                  style={{
                    boxShadow: isSpecial
                      ? "0 0 70px rgba(250,204,21,0.35)"
                      : "0 0 50px rgba(255,255,255,0.12)",
                    animation: animHit ? "podroImpact 0.55s ease-out" : undefined,
                  }}
                />
                <Image
                  src="/kava.png"
                  alt="Подро"
                  fill
                  sizes="(max-width: 640px) 208px, 256px"
                  className="object-cover select-none"
                  style={{ animation: animHit ? "podroImpact 0.55s ease-out" : undefined }}
                  priority
                />
              </button>
            </div>

            <p className="text-on-primary-mute text-xs mt-4">
              Сила кліку: <span className="text-on-primary font-bold">{formatGrams(clickPower)} г</span>
              {" · "}
              Крит ({(critChance * 100).toFixed(0)}%): <span className="text-yellow-400 font-bold">×22</span>
            </p>
          </div>

          <PrestigePanel state={state} onPrestige={handlePrestige} />
        </div>

        {/* Права колонка — магазин/апгрейди/ачівки/лідерборд */}
        <div className="flex flex-col gap-4">
          <div className="card-dark p-5">
            <p className="micro-cap text-ink-mute mb-3">ТИ</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-ink-mute micro-cap">КЛІКІВ ЗАГАЛОМ</p>
                <p className="text-on-primary font-bold text-lg mt-1 tabular-nums">
                  {state.totalClicks.toLocaleString("uk-UA")}
                </p>
              </div>
              <div>
                <p className="text-ink-mute micro-cap">ЗАРОБЛЕНО ЗА ВСЕ ЖИТТЯ</p>
                <p className="text-on-primary font-bold text-lg mt-1 tabular-nums">
                  {formatGrams(state.careerGrams)} г
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-hairline-dark overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`micro-cap px-3 py-3 whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  tab === t.id
                    ? "border-on-primary text-on-primary"
                    : "border-transparent text-ink-mute hover:text-on-primary-mute"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="card-dark p-4 sm:p-5 max-h-[560px] overflow-y-auto">
            {tab === "shop" && <HelperShop state={state} onBuy={handleBuyHelper} />}
            {tab === "upgrades" && <UpgradeShop state={state} onBuy={handleBuyUpgrade} />}
            {tab === "achievements" && <AchievementsPanel state={state} />}
            {tab === "leaderboard" && (
              <ClickerLeaderboard loading={leaderboardLoading} rows={leaderboard} myUserId={user?.id} />
            )}
          </div>

          {!user && (
            <p className="text-on-primary-mute/60 text-[11px] text-center">
              Прогрес зберігається локально. Увійди, щоб синхронізувати з усіма пристроями і потрапити в лідерборд.
            </p>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes podroImpact {
          0% { transform: scale(1) rotate(0deg); }
          18% { transform: scale(0.86) rotate(-2deg); }
          38% { transform: scale(1.08) rotate(1deg); }
          60% { transform: scale(0.97) rotate(-0.5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes podroFloatUp {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          20% { opacity: 1; transform: translateY(-30px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-150px) scale(0.9); }
        }
        @keyframes podroCritFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
