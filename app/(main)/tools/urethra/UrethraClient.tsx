"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { UrethraEngine } from "@/lib/urethra-io/engine";
import { UrethraRenderer } from "@/lib/urethra-io/renderer";
import { UrethraMultiplayer } from "@/lib/urethra-io/multiplayer";
import { audio } from "@/lib/urethra-io/audio";
import {
  type SkinId,
  SKINS,
  type LeaderboardEntry,
  type GameStats,
  type BuffType,
} from "@/lib/urethra-io/types";

interface ServerLeaderboardItem {
  id: string;
  player_name: string;
  skin: string;
  score: number;
  coffee_eaten: number;
  kills: number;
  duration_seconds: number;
  created_at: string;
}

const RANDOM_NICKS = [
  "Опариш_Подро",
  "Нескафе_Голд_Бос",
  "Чавунний_Лицар",
  "Садочок_Екзорцист",
  "Макаронина_ЗСУ",
  "Спецназ_Уретри",
  "Ворсинка_9000",
  "Дід_Панас_Кофеман",
  "Коростишівський_Гігант",
  "Кавовий_Дрист",
  "Хікан_3000",
  "Чашка_Петрі",
  "Infinix_На_Зарядці",
  "Пліснява_Під_Ліжком",
  "Нічний_Жор_о_03_00",
  "Золотий_Бульйончик",
  "Шолом_з_Каструлі",
  "Коростишівський_Кар'єр",
  "RGB_Про_Геймер",
  "Безодня_Хікікоморі",
  "Шеметований_Барон",
  "Радіаційна_Морквина",
  "CRT_Монітор_1998",
  "Макарони_за_9.99",
  "Свідок_Nescafe",
  "Військомат_Бердичів",
  "PUBG_На_Мінімалках",
  "Сковорода_4_Клас",
  "Крильце_ASMR_Master",
  "Морква_По_Феншую",
  "Анонім_з_Безодні",
  "Кавовий_Магнат",
  "Турбо_Дрист_V8",
  "Капілярний_Снайпер",
  "Мобілізований_Опариш",
  "Паралельна_Реальність",
  "Брудна_Тарілка",
  "Супутник_Подро",
  "Забута_Людина",
  "Молоток_Торпеда",
  "Гігантський_Міцелій",
  "Степовий_Хікан",
  "Рістретто_Кілер",
  "Масляний_Навар",
  "Елітна_Арабіка",
  "Чавунна_Броня",
];

function getBuffIcon(type: BuffType): ReactNode {
  switch (type) {
    case "magnet":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7v6a8 8 0 0 0 16 0V7" />
          <line x1="4" y1="11" x2="8" y2="11" />
          <line x1="16" y1="11" x2="20" y2="11" />
        </svg>
      );
    case "ghost":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        </svg>
      );
    case "turbo":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "multiplier":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "shockwave":
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

export default function UrethraClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine & subsystem instances
  const engineRef = useRef<UrethraEngine | null>(null);
  const rendererRef = useRef<UrethraRenderer | null>(null);
  const multiplayerRef = useRef<UrethraMultiplayer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // State
  const [gameState, setGameState] = useState<"lobby" | "playing" | "gameover">("lobby");
  const [playerName, setPlayerName] = useState("Опариш");
  const [selectedSkin, setSelectedSkin] = useState<SkinId>("classic");
  const [randomSkinOnRestart, setRandomSkinOnRestart] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"play" | "leaderboard" | "buffs">("play");

  // In-Game Live HUD
  const [liveLeaderboard, setLiveLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerScore, setPlayerScore] = useState(30);
  const [coffeeEaten, setCoffeeEaten] = useState(0);
  const [playerKills, setPlayerKills] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [activeBuffsList, setActiveBuffsList] = useState<Array<{ type: BuffType; timeLeft: number }>>([]);
  const [isBoosting, setIsBoosting] = useState(false);

  // Game Over Summary
  const [lastGameStats, setLastGameStats] = useState<GameStats | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // Global Server Leaderboard
  const [serverLeaderboard, setServerLeaderboard] = useState<ServerLeaderboardItem[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  // Load preferences
  useEffect(() => {
    try {
      const savedAutoSkin = localStorage.getItem("urethra_auto_random_skin");
      if (savedAutoSkin !== null) {
        setRandomSkinOnRestart(savedAutoSkin === "true");
      }
    } catch {}
  }, []);

  const handleRandomizeNick = () => {
    audio.playClick();
    const random = RANDOM_NICKS[Math.floor(Math.random() * RANDOM_NICKS.length)];
    setPlayerName(random);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audio.setSoundEnabled(next);
    if (next) audio.playClick();
  };

  const toggleRandomSkin = () => {
    const next = !randomSkinOnRestart;
    setRandomSkinOnRestart(next);
    try {
      localStorage.setItem("urethra_auto_random_skin", String(next));
    } catch {}
    if (soundEnabled) audio.playClick();
  };

  const fetchGlobalLeaderboard = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const res = await fetch("/api/urethra");
      const json = await res.json();
      if (json.ok && Array.isArray(json.scores)) {
        setServerLeaderboard(json.scores);
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsLoadingScores(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [fetchGlobalLeaderboard]);

  // Skin preview canvas animation in Lobby
  useEffect(() => {
    if (gameState !== "lobby" || activeTab !== "play" || !skinCanvasRef.current) return;
    const canvas = skinCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    let animId: number;

    const renderSkinPreview = () => {
      phase += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const skin = SKINS[selectedSkin] || SKINS.classic;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const segCount = 12;
      const baseRadius = 14;

      ctx.save();
      for (let s = segCount - 1; s >= 0; s--) {
        const segX = centerX - s * 9 + Math.cos(phase + s * 0.4) * 3;
        const segY = centerY + Math.sin(phase + s * 0.4) * 10;

        let color: string;
        if (skin.pattern === "rainbow") {
          color = `hsl(${(Date.now() * 0.08 + s * 16) % 360}, 95%, 55%)`;
        } else {
          color = s === 0 ? skin.headColor : skin.bodyColors[s % skin.bodyColors.length];
        }

        const taper = 1 - (s / segCount) * 0.35;
        const r = baseRadius * taper;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(segX, segY, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (s === 0) {
          ctx.fillStyle = skin.eyeColor || "#ffffff";
          ctx.beginPath();
          ctx.arc(segX + 4, segY - 4, 4, 0, Math.PI * 2);
          ctx.arc(segX + 4, segY + 4, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = skin.pupilColor || "#000000";
          ctx.beginPath();
          ctx.arc(segX + 5.5, segY - 4, 2, 0, Math.PI * 2);
          ctx.arc(segX + 5.5, segY + 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(renderSkinPreview);
    };

    animId = requestAnimationFrame(renderSkinPreview);
    return () => cancelAnimationFrame(animId);
  }, [gameState, activeTab, selectedSkin]);

  const submitScore = useCallback(
    async (stats: GameStats) => {
      setIsSubmittingScore(true);
      try {
        await fetch("/api/urethra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName,
            skin: selectedSkin,
            score: stats.score,
            coffeeEaten: stats.coffeeEaten,
            kills: stats.kills,
            durationSeconds: stats.timeAlive,
          }),
        });
        setScoreSubmitted(true);
        fetchGlobalLeaderboard();
      } catch {
        // Fallback
      } finally {
        setIsSubmittingScore(false);
      }
    },
    [playerName, selectedSkin, fetchGlobalLeaderboard]
  );

  const startGame = useCallback(() => {
    audio.playClick();
    const finalName = playerName.trim() || "Опариш";
    setPlayerName(finalName);
    setScoreSubmitted(false);

    let activeSkin = selectedSkin;
    if (randomSkinOnRestart) {
      const allSkins = Object.keys(SKINS) as SkinId[];
      activeSkin = allSkins[Math.floor(Math.random() * allSkins.length)];
      setSelectedSkin(activeSkin);
    }

    setGameState("playing");

    const engine = new UrethraEngine();
    engineRef.current = engine;

    const mp = new UrethraMultiplayer(engine);
    multiplayerRef.current = mp;

    mp.onOnlineCountChange = (count) => {
      setOnlineCount(count);
    };

    engine.onPlayerDeathBroadcast = (payload) => {
      mp.broadcastDeath(payload);
    };

    engine.onGameOver = (stats) => {
      mp.stopBroadcasting();
      setLastGameStats({
        score: stats.score,
        coffeeEaten: stats.coffeeEaten,
        kills: stats.kills,
        timeAlive: stats.timeAlive,
        peakRank: stats.finalRank,
        finalRank: stats.finalRank,
      });
      setGameState("gameover");
      submitScore({
        score: stats.score,
        coffeeEaten: stats.coffeeEaten,
        kills: stats.kills,
        timeAlive: stats.timeAlive,
        peakRank: stats.finalRank,
        finalRank: stats.finalRank,
      });
    };

    const localPlayerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    engine.start(finalName, activeSkin);
    if (engine.player) {
      engine.player.id = localPlayerId;
    }
    mp.connect(localPlayerId, finalName, activeSkin);
  }, [playerName, selectedSkin, randomSkinOnRestart, submitScore]);

  useEffect(() => {
    if (gameState !== "playing" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderer = new UrethraRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderer.setSize(canvas.width, canvas.height);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || !engine.player || !engine.player.alive) return;

      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const dx = clientX - canvas.width / 2;
      const dy = clientY - canvas.height / 2;
      const angle = Math.atan2(dy, dx);

      engine.setPlayerTargetAngle(angle);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        engineRef.current?.setPlayerBoosting(true);
        setIsBoosting(true);
      }
    };

    const handleMouseUp = () => {
      engineRef.current?.setPlayerBoosting(false);
      setIsBoosting(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        engineRef.current?.setPlayerBoosting(true);
        setIsBoosting(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        engineRef.current?.setPlayerBoosting(false);
        setIsBoosting(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const clientX = touch.clientX - rect.left;
        const clientY = touch.clientY - rect.top;
        const dx = clientX - canvas.width / 2;
        const dy = clientY - canvas.height / 2;
        const angle = Math.atan2(dy, dx);
        engineRef.current?.setPlayerTargetAngle(angle);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        engineRef.current?.resetLastTime();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });

    let lastHudUpdate = 0;

    const loop = () => {
      const engine = engineRef.current;
      if (engine && engine.isRunning) {
        engine.update();
        renderer.render(
          engine.player,
          engine.maggots,
          engine.foods,
          engine.powerUps,
          engine.particles,
          engine.shockwaves,
          engine.floatingTexts,
          engine.killFeed,
          engine.getLeaderboard()
        );

        const now = performance.now();
        if (now - lastHudUpdate > 80) {
          lastHudUpdate = now;
          if (engine.player && engine.player.alive) {
            setPlayerScore(Math.floor(engine.player.score));
            setCoffeeEaten(engine.player.coffeeEaten);
            setPlayerKills(engine.player.kills);

            const buffs = engine.player.activeBuffs
              .filter((b) => b.expiresAt > now)
              .map((b) => ({
                type: b.type,
                timeLeft: Math.max(1, Math.ceil((b.expiresAt - now) / 1000)),
              }));
            setActiveBuffsList(buffs);
          }
          setLiveLeaderboard(engine.getLeaderboard());
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    // Fallback heartbeat timer when tab is hidden so player doesn't freeze or drop
    const bgInterval = window.setInterval(() => {
      if (document.hidden && engineRef.current && engineRef.current.isRunning) {
        engineRef.current.update();
      }
    }, 45);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.clearInterval(bgInterval);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      canvas.removeEventListener("touchmove", handleTouchMove);

      engineRef.current?.stop();
      multiplayerRef.current?.disconnect();
    };
  }, [gameState]);

  return (
    <div className="relative w-full min-h-[85vh] flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      {/* 1. LOBBY VIEW */}
      {gameState === "lobby" && (
        <div className="w-full max-w-[1140px] mx-auto px-4 py-6 flex flex-col items-center animate-slide-up">
          {/* Streamlined Compact Header + Wide Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full mb-6 gap-4 border-b border-hairline-dark pb-4">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              URETHRA.IO
            </h1>

            {/* Navigation Pill Tabs */}
            <div className="flex items-center gap-1 bg-canvas-card/90 p-1 rounded-full border border-hairline-dark">
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTab("play");
                }}
                className={`button-cap px-5 sm:px-6 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === "play"
                    ? "bg-white text-ink shadow-sm"
                    : "text-on-primary-mute hover:text-white"
                }`}
              >
                СКАФАНДР & В БІЙ
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTab("leaderboard");
                  fetchGlobalLeaderboard();
                }}
                className={`button-cap px-5 sm:px-6 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === "leaderboard"
                    ? "bg-white text-ink shadow-sm"
                    : "text-on-primary-mute hover:text-white"
                }`}
              >
                РЕЙТИНГ
              </button>
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTab("buffs");
                }}
                className={`button-cap px-5 sm:px-6 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === "buffs"
                    ? "bg-white text-ink shadow-sm"
                    : "text-on-primary-mute hover:text-white"
                }`}
              >
                БАФИ ТА КЕРУВАННЯ
              </button>
            </div>
          </div>

          {/* TAB 1: PLAY & CUSTOMIZATION */}
          {activeTab === "play" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
              {/* Left Column: Player Nick & Skin Preview (4 cols) */}
              <div className="lg:col-span-4 card-dark p-6 flex flex-col justify-between">
                <div>
                  <span className="micro-cap text-ink-mute mb-2 block">
                    МОДЕЛЬ ОПАРИША
                  </span>

                  <div className="relative w-full h-32 rounded-xl bg-black border border-hairline-dark flex items-center justify-center overflow-hidden mb-4">
                    <canvas
                      ref={skinCanvasRef}
                      width={280}
                      height={120}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-ink-mute bg-canvas-night/80 border border-hairline-dark px-2 py-0.5 rounded">
                      {SKINS[selectedSkin]?.name}
                    </div>
                  </div>

                  {/* Nickname Input */}
                  <div className="w-full mb-3">
                    <label className="block micro-cap text-ink-mute mb-1">
                      ПОЗИВНИЙ
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={24}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Введи нік..."
                        className="w-full bg-canvas-night border border-hairline-dark focus:border-white/50 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleRandomizeNick}
                        title="Випадковий мемний позивний"
                        className="px-3 bg-canvas-night hover:bg-canvas-card text-on-primary-mute hover:text-white rounded-xl border border-hairline-dark transition-colors flex items-center justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" />
                          <path d="M16 8h.01" />
                          <path d="M8 8h.01" />
                          <path d="M8 16h.01" />
                          <path d="M16 16h.01" />
                          <path d="M12 12h.01" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="w-full p-2.5 rounded-lg bg-canvas-night/60 border border-hairline-dark text-[11px] text-on-primary-mute mb-5">
                    {SKINS[selectedSkin]?.lore}
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  onClick={startGame}
                  className="w-full py-3.5 rounded-full bg-white text-ink font-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 mt-auto"
                >
                  <span>ЗАЛІЗТИ В УРЕТРУ (PLAY)</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>

              {/* Right Column: Skin Selection Grid (8 cols, 3-column subgrid) */}
              <div className="lg:col-span-8 card-dark p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <span className="micro-cap text-ink-mute">
                    ВАРІАЦІЇ СКАФАНДРА ({Object.keys(SKINS).length})
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Auto Random Skin Toggle */}
                    <button
                      onClick={toggleRandomSkin}
                      className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all ${
                        randomSkinOnRestart
                          ? "bg-white/[0.12] border-white/60 text-white shadow-sm"
                          : "border-hairline-dark bg-canvas-night text-ink-mute hover:text-white hover:border-hairline-hover"
                      }`}
                      title="Змінювати скін випадковим чином при кожному перезапуску"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                      <span>РОТАЦІЯ: {randomSkinOnRestart ? "УВІМК" : "ВИМК"}</span>
                    </button>

                    {/* Sound Toggle */}
                    <button
                      onClick={toggleSound}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-ink-mute hover:text-white px-2.5 py-1 rounded-full border border-hairline-dark bg-canvas-night transition-colors"
                    >
                      {soundEnabled ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      )}
                      <span>{soundEnabled ? "ЗВУК" : "МУТ"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 overflow-y-auto max-h-[380px] pr-1.5 custom-scrollbar">
                  {(Object.keys(SKINS) as SkinId[]).map((skinId) => {
                    const skin = SKINS[skinId];
                    const isSelected = selectedSkin === skinId;
                    return (
                      <button
                        key={skinId}
                        onClick={() => {
                          audio.playClick();
                          setSelectedSkin(skinId);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-white/[0.08] border-white/60 text-white shadow-sm"
                            : "bg-canvas-night/60 border-hairline-dark text-on-primary-mute hover:border-hairline-hover"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-white leading-tight">{skin.name}</span>
                          <span
                            className="w-3 h-3 rounded-full border border-black/40 shrink-0 ml-1"
                            style={{ backgroundColor: skin.headColor }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {skin.bodyColors.slice(0, 4).map((c, i) => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full border border-black/30"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL LEADERBOARD */}
          {activeTab === "leaderboard" && (
            <div className="w-full card-dark p-6">
              <div className="flex items-center justify-between mb-4 border-b border-hairline-dark pb-3">
                <div>
                  <h2 className="button-cap text-white">РЕЄСТР РЕКОРДІВ</h2>
                  <p className="text-xs text-ink-mute">Найбільша маса за всю історію уретри</p>
                </div>
                <button
                  onClick={fetchGlobalLeaderboard}
                  disabled={isLoadingScores}
                  className="px-3 py-1 rounded-full border border-hairline-dark bg-canvas-night hover:border-hairline-hover text-xs font-mono text-on-primary-mute hover:text-white transition-colors"
                >
                  {isLoadingScores ? "ОНОВЛЕННЯ..." : "ОНОВИТИ"}
                </button>
              </div>

              {serverLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-ink-mute text-xs font-mono">
                  Записів ще немає. Зіграй першу сесію та запиши рекорд.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-ink-mute border-b border-hairline-dark">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">ПОЗИВНИЙ</th>
                        <th className="py-2 px-3">СКІН</th>
                        <th className="py-2 px-3 text-right">МАСА</th>
                        <th className="py-2 px-3 text-right">КАВА</th>
                        <th className="py-2 px-3 text-right">КІЛЛИ</th>
                        <th className="py-2 px-3 text-right">ДАТА</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline-dark/40">
                      {serverLeaderboard.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.02] text-on-primary-mute transition-colors"
                        >
                          <td className="py-2 px-3 text-ink-mute">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-white">{item.player_name}</td>
                          <td className="py-2 px-3 text-ink-mute capitalize">{item.skin}</td>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            {item.score} g
                          </td>
                          <td className="py-2 px-3 text-right">{item.coffee_eaten}</td>
                          <td className="py-2 px-3 text-right">{item.kills}</td>
                          <td className="py-2 px-3 text-right text-ink-mute">
                            {new Date(item.created_at).toLocaleDateString("uk-UA")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUFFS & CONTROLS */}
          {activeTab === "buffs" && (
            <div className="w-full card-dark p-6 space-y-6">
              <div>
                <h3 className="button-cap text-white mb-3">
                  ТАКТИЧНІ БАФИ НА АРЕНІ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-canvas-night/80 border border-hairline-dark flex gap-3 items-start">
                    <span className="p-1.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      {getBuffIcon("magnet")}
                    </span>
                    <div>
                      <div className="font-bold text-white mb-0.5">Кавовий Магніт (8s)</div>
                      <div className="text-ink-mute text-[11px]">Затягує всі кавові гранули в радіусі 380px прямо в голову.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-night/80 border border-hairline-dark flex gap-3 items-start">
                    <span className="p-1.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                      {getBuffIcon("ghost")}
                    </span>
                    <div>
                      <div className="font-bold text-white mb-0.5">Фантом Подро (5s)</div>
                      <div className="text-ink-mute text-[11px]">Примарне тіло: проходь крізь інших опаришів без ризику померти.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-night/80 border border-hairline-dark flex gap-3 items-start">
                    <span className="p-1.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                      {getBuffIcon("turbo")}
                    </span>
                    <div>
                      <div className="font-bold text-white mb-0.5">Еспресо-Форсаж (7s)</div>
                      <div className="text-ink-mute text-[11px]">Безкоштовне турбо (0 спаленої маси) +35% до швидкості.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-night/80 border border-hairline-dark flex gap-3 items-start">
                    <span className="p-1.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      {getBuffIcon("multiplier")}
                    </span>
                    <div>
                      <div className="font-bold text-white mb-0.5">2X Кавовий Множник (10s)</div>
                      <div className="text-ink-mute text-[11px]">Подвоює всю набрану масу з кави та зерен під час дії.</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas-night/80 border border-hairline-dark flex gap-3 items-start sm:col-span-2 md:col-span-2">
                    <span className="p-1.5 rounded bg-white/20 text-white border border-white/30 flex items-center justify-center shrink-0">
                      {getBuffIcon("shockwave")}
                    </span>
                    <div>
                      <div className="font-bold text-white mb-0.5">Молоток / Шокова Хвиля (Миттєво)</div>
                      <div className="text-ink-mute text-[11px]">Створює потужний вибух кофеїну, що розкидає всіх навколишніх черв&apos;яків.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-hairline-dark pt-4">
                <h3 className="button-cap text-white mb-2">
                  КЕРУВАННЯ
                </h3>
                <ul className="text-xs text-on-primary-mute space-y-1.5 font-mono">
                  <li>• ПК: Курсор миші для напрямку, Пробіл / ЛКМ для турбо</li>
                  <li>• Телефон: Тач по екрану + кнопка «ТУРБО»</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. IN-GAME CANVAS & HUD */}
      <div
        className={`fixed inset-0 z-50 bg-[#0a0a0a] overflow-hidden ${
          gameState === "playing" || gameState === "gameover" ? "block" : "hidden"
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* IN-GAME HUD */}
        {gameState === "playing" && (
          <>
            {/* Top-Left: Menu, Audio & Live Presence Badge */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <button
                onClick={() => {
                  engineRef.current?.stop();
                  multiplayerRef.current?.disconnect();
                  setGameState("lobby");
                }}
                className="px-3.5 py-1.5 rounded-full bg-canvas-night/80 backdrop-blur border border-hairline-dark text-xs font-mono text-on-primary-mute hover:text-white hover:border-white/30 transition-colors"
              >
                ← МЕНЮ
              </button>
              <button
                onClick={toggleSound}
                className="p-2 rounded-full bg-canvas-night/80 backdrop-blur border border-hairline-dark text-xs text-on-primary-mute hover:text-white transition-colors"
              >
                {soundEnabled ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-night/80 backdrop-blur border border-hairline-dark text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} {onlineCount === 1 ? "ГРАВЕЦЬ" : "ГРАВЦІ"} ОНЛАЙН</span>
              </div>
            </div>

            {/* Top-Center Stats Pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-5 bg-canvas-night/80 backdrop-blur border border-hairline-dark px-5 py-2 rounded-full shadow-lg pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="micro-cap text-ink-mute">МАСА</span>
                <span className="text-sm font-bold font-mono text-white">{playerScore}g</span>
              </div>
              <div className="w-[1px] h-4 bg-hairline-dark" />
              <div className="flex items-center gap-2">
                <span className="micro-cap text-ink-mute">КАВА</span>
                <span className="text-sm font-bold font-mono text-on-primary-mute">{coffeeEaten}</span>
              </div>
              <div className="w-[1px] h-4 bg-hairline-dark" />
              <div className="flex items-center gap-2">
                <span className="micro-cap text-ink-mute">ВБИТО</span>
                <span className="text-sm font-bold font-mono text-on-primary-mute">{playerKills}</span>
              </div>
            </div>

            {/* Active Buffs Indicators with SVG icons */}
            {activeBuffsList.length > 0 && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 pointer-events-none">
                {activeBuffsList.map((b) => (
                  <div
                    key={b.type}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas-night/90 backdrop-blur border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-md shadow-cyan-500/10"
                  >
                    <span className="text-cyan-400 flex items-center">
                      {getBuffIcon(b.type)}
                    </span>
                    <span className="font-bold uppercase">
                      {b.type === "magnet" ? "МАГНІТ" : b.type === "ghost" ? "ФАНТОМ" : b.type === "turbo" ? "ФОРСАЖ" : "2X МАСА"}
                    </span>
                    <span className="text-white font-bold">{b.timeLeft}s</span>
                  </div>
                ))}
              </div>
            )}

            {/* Top-Right: Room Leaderboard (Wider with ample room for names) */}
            <div className="absolute top-4 right-4 z-10 w-60 sm:w-72 bg-canvas-night/85 backdrop-blur border border-hairline-dark rounded-xl p-3 shadow-lg pointer-events-none">
              <div className="micro-cap text-ink-mute border-b border-hairline-dark pb-1 mb-1.5 flex justify-between">
                <span>ТОП ОПАРИШІВ</span>
                <span>МАСА</span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                {liveLeaderboard.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 px-1.5 py-0.5 rounded ${
                      item.isPlayer ? "text-white font-bold bg-white/[0.08]" : "text-on-primary-mute"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-ink-mute text-[10px] w-4 shrink-0">{idx + 1}.</span>
                      <span className="truncate">{item.name}</span>
                      {item.isLive && (
                        <span className="shrink-0 text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          LIVE
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right font-mono text-zinc-300">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Turbo Touch Button */}
            <div className="sm:hidden absolute bottom-6 right-6 z-20">
              <button
                onTouchStart={() => {
                  engineRef.current?.setPlayerBoosting(true);
                  setIsBoosting(true);
                }}
                onTouchEnd={() => {
                  engineRef.current?.setPlayerBoosting(false);
                  setIsBoosting(false);
                }}
                className={`w-18 h-18 rounded-full border text-xs font-mono uppercase tracking-wider flex items-center justify-center transition-all ${
                  isBoosting
                    ? "bg-white text-black border-white scale-105"
                    : "bg-canvas-night/80 text-white border-hairline-dark active:scale-95"
                }`}
              >
                ТУРБО
              </button>
            </div>
          </>
        )}

        {/* 3. GAME OVER MODAL OVERLAY */}
        {gameState === "gameover" && lastGameStats && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-slide-up">
            <div className="w-full max-w-sm card-dark p-6 sm:p-8 text-center shadow-2xl">
              <div className="w-10 h-10 rounded-full border border-hairline-dark bg-canvas-night flex items-center justify-center mx-auto mb-3 text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>

              <h2 className="heading-sub text-white mb-1">
                СИМУЛЯЦІЮ ЗАВЕРШЕНО
              </h2>
              <p className="text-ink-mute text-xs mb-6">
                Опариш луснув і розсипався на каву Nescafe Gold.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
                <div className="bg-canvas-night/80 border border-hairline-dark rounded-xl p-3">
                  <div className="micro-cap text-ink-mute">ФІНАЛЬНА МАСА</div>
                  <div className="text-base font-bold font-mono text-white">{lastGameStats.score} g</div>
                </div>
                <div className="bg-canvas-night/80 border border-hairline-dark rounded-xl p-3">
                  <div className="micro-cap text-ink-mute">З&apos;ЇДЕНО КАВИ</div>
                  <div className="text-base font-bold font-mono text-white">{lastGameStats.coffeeEaten}</div>
                </div>
                <div className="bg-canvas-night/80 border border-hairline-dark rounded-xl p-3">
                  <div className="micro-cap text-ink-mute">ВБИТО ОПАРИШІВ</div>
                  <div className="text-base font-bold font-mono text-white">{lastGameStats.kills}</div>
                </div>
                <div className="bg-canvas-night/80 border border-hairline-dark rounded-xl p-3">
                  <div className="micro-cap text-ink-mute">ЧАС У ГРІ</div>
                  <div className="text-base font-bold font-mono text-white">{lastGameStats.timeAlive}s</div>
                </div>
              </div>

              {/* Auto-rotation status badge */}
              {randomSkinOnRestart && (
                <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-hairline-dark text-[11px] font-mono text-on-primary-mute">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 3 21 3 21 8" />
                    <line x1="4" y1="20" x2="21" y2="3" />
                    <polyline points="21 16 21 21 16 21" />
                    <line x1="15" y1="15" x2="21" y2="21" />
                    <line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                  <span>Наступна спроба: новий випадковий скін</span>
                </div>
              )}

              {/* Leaderboard status */}
              <div className="text-xs font-mono text-ink-mute mb-5">
                {isSubmittingScore ? (
                  <span>Збереження рекорду в базі...</span>
                ) : scoreSubmitted ? (
                  <span className="text-white">Рекорд зафіксовано в системі</span>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={startGame}
                  className="w-full py-3 rounded-full bg-white text-ink font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all"
                >
                  СПРОБУВАТИ ЗНОВУ
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setGameState("lobby");
                  }}
                  className="w-full py-2.5 rounded-full bg-transparent border border-hairline-dark hover:border-hairline-hover text-on-primary-mute hover:text-white font-medium text-xs uppercase tracking-wider transition-colors"
                >
                  ГОЛОВНЕ МЕНЮ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
