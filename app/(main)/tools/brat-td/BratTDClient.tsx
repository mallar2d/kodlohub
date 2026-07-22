"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  GAME_VERSION,
  DEFAULT_DIFFICULTY_KEY,
  ARRAY_CAPS,
  ACHIEVEMENTS,
  TOWER_CONFIGS,
  TOWER_UNLOCK_LEVELS,
  getEndlessXpMultiplier,
  getPlayerLevelForXp,
  getPlayerLevelProgress,
  EMOJI_MAP,
} from "./gameConfig";
import { playSound, SoundEvent } from "@/lib/brat-td/audio";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  getDefaultProgression,
  normalizeProgression,
  loadLocalProgression,
  saveLocalProgression,
  loadSettings,
  saveSettings,
  getLocalLeaderboard,
  addToLocalLeaderboard,
  fetchGlobalLeaderboard,
  fetchBratTdData,
  saveCloudProgression,
  submitGlobalScore,
  mergeLeaderboards,
} from "@/lib/brat-td/state";
import { useGameSync } from "@/lib/brat-td/useGameSync";
import { getPureId, getPureRandom, getMapById, getRouteById, getRouteDistancePosition, getDistance, getWaveRouteIds, isPositionOnPath, MAP_CONFIGS, DEFAULT_MAP_ID } from "@/lib/brat-td/maps";
import { isSupportTowerType, applyDifficultyToEnemy, DIFFICULTY_CONFIG } from "@/lib/brat-td/pure";
import {
  type EngineContext,
  type EngineRefs,
  type EngineCallbacks,
  type EnginePendingEvent,
  updateGame as engineUpdateGame,
  startNextWave as engineStartNextWave,
  applyDamageDebuffCap as engineApplyDamageDebuffCap,
  spawnCosmeticParticles as engineSpawnCosmeticParticles,
  SCENE_THEMES,
  getEffectiveTowerDamage,
  getEffectiveTowerRange,
  getNonEndlessWaveClearReward,
  buildUpgradeStats,
  applyUpgradeStats,
  checkUpgradeAllowed,
  getUpgradePreview,
} from "@/lib/brat-td/engine";
import {
  renderGame as rendererRenderGame,
  type RenderContext,
} from "@/lib/brat-td/renderer";
import {
  addPlayerXp,
  addTowerXp,
  addTowerXpById,
  awardAchievements,
  buildSessionSummary,
  formatAchievementReward,
  markCurrentMapCompleted,
  type ProgressionActionsConfig,
} from "@/lib/brat-td/progression-actions";
import {
  buyUpgrade as buyUpgradeAction,
  sellSelectedTower as sellSelectedTowerAction,
  spawnEnemyCallback as spawnEnemyAction,
  spawnSandboxEnemy as spawnSandboxEnemyAction,
  tryPlaceTower as tryPlaceTowerAction,
  type TowerActionsConfig,
} from "@/lib/brat-td/tower-actions";
import { SpatialGrid } from "@/lib/brat-td/spatial-grid";
import { useCanvasInput } from "@/lib/brat-td/canvas-input";
import type {
  ActiveEnemy,
  AchievementToast,
  DifficultyKey,
  EnemyModifier,
  ExplosionRing,
  FloatingText,
  LeaderboardEntry,
  LeaderboardKind,
  Mine,
  MineProjectile,
  Particle,
  PlacedTower,
  ProgressionState,
  Projectile,
  SessionSummary,
  SpeedTrail,
} from "@/lib/brat-td/types";
import { AchievementsPanel } from "@/components/brat-td/AchievementsPanel";
import { AchievementToastStack } from "@/components/brat-td/AchievementToastStack";
import { CosmeticsPanel } from "@/components/brat-td/CosmeticsPanel";
import { EndGameOverlay } from "@/components/brat-td/EndGameOverlay";
import { GameHUD } from "@/components/brat-td/GameHUD";
import { IdleOverlay } from "@/components/brat-td/IdleOverlay";
import { LeaderboardPanel } from "@/components/brat-td/LeaderboardPanel";
import { ProgressionPanel } from "@/components/brat-td/ProgressionPanel";
import { SettingsPanel } from "@/components/brat-td/SettingsPanel";
import { ShopPanel } from "@/components/brat-td/ShopPanel";
import { StatusBar } from "@/components/brat-td/StatusBar";
import { UpgradePanel } from "@/components/brat-td/UpgradePanel";
import { WavePreview } from "@/components/brat-td/WavePreview";
import { SandboxPanel } from "@/components/brat-td/SandboxPanel";

const PROGRESSION_CONFIG = {
  towerConfigs: TOWER_CONFIGS,
  mapConfigs: MAP_CONFIGS,
  achievements: ACHIEVEMENTS,
  getPlayerLevelForXp,
  towerUnlockLevels: TOWER_UNLOCK_LEVELS,
};

function pushWithCap<T>(arr: T[], items: T | T[], cap: number): void {
  const itemList = Array.isArray(items) ? items : [items];
  while (arr.length + itemList.length > cap && arr.length > 0) arr.shift();
  arr.push(...itemList);
}

export default function BratTDClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [lives, setLives] = useState(300);
  const [gold, setGold] = useState(350);
  const [wave, setWave] = useState(1);
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2 | 3 | 5>(1);
  const [isEndless, setIsEndless] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const isSandboxRef = useRef(false);
  const [isAutoStart, setIsAutoStart] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<DifficultyKey>(DEFAULT_DIFFICULTY_KEY);
  const [selectedMapId, setSelectedMapId] = useState(DEFAULT_MAP_ID);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);

  const [selectedShopTower, setSelectedShopTower] = useState<string | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);
  const [statusMessage, setStatusMessage] = useState("Подро почув накати братви. Підготуйте оборону!");

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);
  const [draggedTowerType, setDraggedTowerType] = useState<string | null>(null);
  const [draggedTowerPos, setDraggedTowerPos] = useState<{ x: number; y: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardKind, setLeaderboardKind] = useState<LeaderboardKind>("best_score");
  const [playerName, setPlayerName] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [progression, setProgression] = useState<ProgressionState>(() => getDefaultProgression(TOWER_CONFIGS, MAP_CONFIGS));
  const [progressionLoaded, setProgressionLoaded] = useState(false);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  const selectedShopTowerRef = useRef<string | null>(null);
  const hoveredShopTowerRef = useRef<string | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isMouseOnCanvasRef = useRef(false);
  const draggedTowerTypeRef = useRef<string | null>(null);
  const draggedTowerPosRef = useRef<{ x: number; y: number } | null>(null);
  const difficultyRef = useRef<DifficultyKey>(DEFAULT_DIFFICULTY_KEY);
  const selectedMapIdRef = useRef(DEFAULT_MAP_ID);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const progressionRef = useRef<ProgressionState>(getDefaultProgression(TOWER_CONFIGS, MAP_CONFIGS));

  const waveStartLivesRef = useRef(300);
  const waveKillsRef = useRef(0);
  const gameStartFrameRef = useRef(0);
  const sessionPlayerXpRef = useRef(0);
  const sessionTowerXpRef = useRef<Record<string, number>>({});
  const sessionAchievementsRef = useRef<string[]>([]);
  const sessionStartLevelRef = useRef(1);
  const sessionStartUnlockedTowersRef = useRef<string[]>(["hammer", "boomerang"]);
  const sessionSummaryDoneRef = useRef(false);
  const sessionSeedRef = useRef(0);

  const towersRef = useRef<PlacedTower[]>([]);
  const enemiesRef = useRef<ActiveEnemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const mineProjectilesRef = useRef<MineProjectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const speedTrailsRef = useRef<SpeedTrail[]>([]);
  const minesRef = useRef<Mine[]>([]);

  const livesRef = useRef(300);
  const goldRef = useRef(350);
  const waveRef = useRef(1);
  const isWaveActiveRef = useRef(false);
  const gameStatusRef = useRef<"idle" | "playing" | "gameover" | "victory">("idle");
  const isPausedRef = useRef(false);
  const gameSpeedRef = useRef<1 | 2 | 3 | 5>(1);
  const isAutoStartRef = useRef(false);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const screenShakeRef = useRef({ x: 0, y: 0, intensity: 0, duration: 0 });
  const projectileTrailRef = useRef<{ x: number; y: number; color: string; alpha: number; size: number }[]>([]);
  const explosionRingsRef = useRef<ExplosionRing[]>([]);
  const waveAnnouncementRef = useRef<{ wave: number; frameStart: number } | null>(null);
  const enemyGridRef = useRef(new SpatialGrid<ActiveEnemy>());

  const spawnQueueRef = useRef<{ type: string; delay: number; modifiers?: EnemyModifier[]; routeId?: string }[]>([]);
  const spawnTimerRef = useRef<number>(0);
  const waveTotalEnemiesRef = useRef<number>(0);
  const waveTotalHpRef = useRef<number>(0);
  const pendingEventsRef = useRef<EnginePendingEvent[]>([]);

  useGameSync({
    wave: { value: wave, ref: waveRef },
    isWaveActive: { value: isWaveActive, ref: isWaveActiveRef },
    gameStatus: { value: gameStatus, ref: gameStatusRef },
    isPaused: { value: isPaused, ref: isPausedRef },
    gameSpeed: { value: gameSpeed, ref: gameSpeedRef },
    isAutoStart: { value: isAutoStart, ref: isAutoStartRef },
    score: { value: score, ref: scoreRef },
    selectedShopTower: { value: selectedShopTower, ref: selectedShopTowerRef },
    mousePos: { value: mousePos, ref: mousePosRef },
    isMouseOnCanvas: { value: isMouseOnCanvas, ref: isMouseOnCanvasRef },
    draggedTowerType: { value: draggedTowerType, ref: draggedTowerTypeRef },
    draggedTowerPos: { value: draggedTowerPos, ref: draggedTowerPosRef },
    difficulty: { value: difficulty, ref: difficultyRef },
    selectedMapId: { value: selectedMapId, ref: selectedMapIdRef },
    settings: { value: settings, ref: settingsRef },
    progression: { value: progression, ref: progressionRef },
  });
  useEffect(() => { saveSettings(settings); }, [settings]);

  const pushLog = (msg: string) => setStatusMessage(msg);

  const emitSound = (event: SoundEvent, towerType?: string) => {
    const s = settingsRef.current;
    playSound(event, {
      towerType,
      masterVolume: s.volume,
      sfxVolume: s.sfxVolume,
      uiVolume: s.uiVolume,
    });
  };

  // Single object the extracted modules read/mutate. Built fresh on every
  // render so the modules always see the latest state.
  const progressionCtx: ProgressionActionsConfig = {
    progressionRef,
    sessionPlayerXpRef,
    sessionTowerXpRef,
    sessionAchievementsRef,
    sessionStartLevelRef,
    sessionStartUnlockedTowersRef,
    sessionSummaryDoneRef,
    gameStartFrameRef,
    frameCountRef,
    waveRef,
    difficultyRef,
    towersRef,
    selectedMapIdRef,
    setProgression,
    setAchievementToasts,
    setSessionSummary,
    pushLog,
    getMapById,
    PROGRESSION_CONFIG,
  };

  const buildEngineContext = (): EngineContext => {
    const refs: EngineRefs = {
      frameCountRef,
      towersRef,
      enemiesRef,
      projectilesRef,
      mineProjectilesRef,
      particlesRef,
      floatingTextsRef,
      speedTrailsRef,
      minesRef,
      livesRef,
      goldRef,
      waveRef,
      isWaveActiveRef,
      gameStatusRef,
      isPausedRef,
      gameSpeedRef,
      isAutoStartRef,
      scoreRef,
      screenShakeRef,
      projectileTrailRef,
      explosionRingsRef,
      waveAnnouncementRef,
      enemyGridRef,
      spawnQueueRef,
      spawnTimerRef,
      waveTotalEnemiesRef,
      waveTotalHpRef,
      waveStartLivesRef,
      waveKillsRef,
      sessionSeedRef,
      progressionRef,
      settingsRef,
      difficultyRef,
      selectedMapIdRef,
      pendingEventsRef,
    };
    const cb: EngineCallbacks = {
      setLives,
      setGold,
      setScore,
      setWave,
      setIsWaveActive,
      setGameStatus,
      pushLog,
      emitSound,
      addPlayerXp: (xp) => addPlayerXp(xp, progressionCtx),
      addTowerXp: (towerType, amount) => addTowerXp(towerType, amount, progressionCtx),
      addTowerXpById: (id, xp) => addTowerXpById(id, xp, progressionCtx),
      awardAchievements: (ids) => awardAchievements(ids, progressionCtx),
      markCurrentMapCompleted: () => markCurrentMapCompleted(progressionCtx),
      buildSessionSummary: () => buildSessionSummary(progressionCtx),
      startNextWave,
      spawnEnemyCallback,
      getActiveMap,
      getRouteById,
      getWaveRouteIds,
      getNonEndlessWaveClearReward,
      getEnemyRoute,
      getEffectiveTowerRange,
      getEffectiveTowerDamage,
      applyDamageDebuffCap: engineApplyDamageDebuffCap,
      getDistance,
      getRouteDistancePosition,
      applyDifficultyToEnemy: <T extends { hp: number; maxHp?: number; speed: number; reward: number; damage: number; shieldHp?: number; maxShieldHp?: number }>(enemy: T): T =>
        applyDifficultyToEnemy(enemy, difficultyRef.current),
      isSupportTowerType,
      spawnHitParticles,
      spawnFloatingText,
      isEndless,
      isSandbox,
    };
    return { refs, cb };
  };

  useEffect(() => {
    const load = async () => {
      const local = getLocalLeaderboard();
      const { leaderboard: global, progress, isAuthed } = await fetchBratTdData(leaderboardKind);
      setLeaderboard(mergeLeaderboards(global, local));

      const localProgress = loadLocalProgression(TOWER_CONFIGS, MAP_CONFIGS);
      let resolvedProgress: ProgressionState;

      if (isAuthed && progress) {
        // У залогіненого гравця вже є рядок прогресу на сервері — він єдине джерело
        // правди. Інакше застарілий localStorage міг би "оживляти" дані після
        // ручного скидання статистики в базі (max-merge ніколи не дає зменшити прогрес).
        resolvedProgress = normalizeProgression(progress, PROGRESSION_CONFIG);
        saveLocalProgression(resolvedProgress);
      } else if (isAuthed) {
        // Залогінений, але рядка на сервері ще не було — це перший вхід,
        // переносимо гостьовий прогрес з цього браузера на акаунт.
        resolvedProgress = normalizeProgression(localProgress, PROGRESSION_CONFIG);
      } else {
        resolvedProgress = normalizeProgression(localProgress, PROGRESSION_CONFIG);
      }

      setProgression(resolvedProgress);
      progressionRef.current = resolvedProgress;
      setProgressionLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const local = leaderboardKind === "best_score" ? getLocalLeaderboard() : [];
      const global = await fetchGlobalLeaderboard(leaderboardKind);
      setLeaderboard(mergeLeaderboards(global, local));
    };
    loadLeaderboard();
  }, [leaderboardKind]);

  useEffect(() => {
    if (!progressionLoaded) return;
    saveLocalProgression(progression);
    const timeout = window.setTimeout(() => {
      saveCloudProgression(progression);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [progression, progressionLoaded]);

  const getActiveMap = () => getMapById(selectedMapIdRef.current);
  const getEnemyRoute = (enemy: ActiveEnemy) => getRouteById(getMapById(selectedMapIdRef.current), enemy.routeId);

  const spawnFloatingText = (x: number, y: number, text: string, color = "#ffffff", size = 12, font = "Arial") => {
    const cap = ARRAY_CAPS.FLOATING_TEXTS * (settingsRef.current.effectLimits ? 1 : 2);
    pushWithCap(floatingTextsRef.current, {
      x, y, text, color, life: 45, maxLife: 45, size, font,
    }, cap);
  };

  const spawnHitParticles = (x: number, y: number, color: string, count = 8, shape: "circle" | "square" = "circle") => {
    if (!settingsRef.current.particles) return;
    const cap = ARRAY_CAPS.PARTICLES * (settingsRef.current.effectLimits ? 1 : 2);
    for (let i = 0; i < count; i++) {
      const angle = getPureRandom() * Math.PI * 2;
      const speed = getPureRandom() * 2 + 1;
      pushWithCap(particlesRef.current, {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: getPureRandom() * 3 + 2,
        life: 30,
        maxLife: 30,
        shape,
      }, cap);
    }
  };

  const spawnCosmeticParticles = () => {
    engineSpawnCosmeticParticles(buildEngineContext());
  };

  const towerCtx: TowerActionsConfig = {
    towersRef,
    enemiesRef,
    minesRef,
    mineProjectilesRef,
    explosionRingsRef,
    selectedMapIdRef,
    difficultyRef,
    waveRef,
    goldRef,
    settingsRef,
    progressionRef,
    setGold,
    setSelectedPlacedTowerId,
    setSelectedTower,
    setProgression,
    setAchievementToasts,
    selectedPlacedTower: selectedTower,
    pushLog,
    spawnFloatingText,
    spawnHitParticles,
    emitSound,
    awardAchievements: (ids) => awardAchievements(ids, progressionCtx),
    getMapById,
    PROGRESSION_CONFIG,
    isSandbox,
  };

  const tryPlaceTower = (type: string, x: number, y: number) => tryPlaceTowerAction(type, x, y, towerCtx);
  const sellSelectedTower = () => sellSelectedTowerAction(towerCtx);
  const buyUpgrade = (pathIndex: number) => buyUpgradeAction(pathIndex, towerCtx);
  const spawnEnemyCallback = (type: string, x: number, y: number, modifiers?: EnemyModifier[], routeId?: string) =>
    spawnEnemyAction(type, x, y, modifiers, routeId, towerCtx);

  const startNextWave = () => {
    engineStartNextWave(buildEngineContext());
  };

  const TARGETING_MODES = ["first", "last", "strongest", "nearest"] as const;
  type TargetingMode = (typeof TARGETING_MODES)[number];

  const cycleTargetingMode = () => {
    const t = towersRef.current.find((tt) => tt.id === selectedPlacedTowerId);
    if (!t) return;
    const current = t.targetingMode || "first";
    const idx = TARGETING_MODES.indexOf(current as TargetingMode);
    const next = TARGETING_MODES[(idx + 1) % TARGETING_MODES.length];
    t.targetingMode = next;
    if (selectedTower) setSelectedTower({ ...t });
    pushLog(`Режим цілі: ${next}`);
  };

  // Canvas pointer + keyboard input. The hook returns a set of event
  // handler factories that close over the latest state.
  const { updateCanvasPointer } = useCanvasInput({
    canvasRef,
    gameStatus,
    setGameStatus,
    isWaveActive,
    isPaused,
    setIsPaused,
    selectedShopTower,
    setSelectedShopTower,
    selectedPlacedTowerId,
    setSelectedPlacedTowerId,
    setSelectedTower: setSelectedTower as (value: unknown) => void,
    mousePosRef,
    setMousePos,
    isMouseOnCanvasRef,
    setIsMouseOnCanvas,
    draggedTowerTypeRef,
    setDraggedTowerType,
    draggedTowerPosRef,
    setDraggedTowerPos,
    pushLog,
    isTowerUnlocked: (type: string) => progression.unlockedTowers.includes(type),
    tryPlaceTower,
    startNextWave,
    buyUpgrade,
    sellSelectedTower,
    cycleTargetingMode,
  });

  // Re-implement the original canvas click selection logic — it inspects
  // towersRef directly to find the closest placed tower. The hook above
  // delegates selection, so we attach this behaviour to the click handler
  // by wrapping it.
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStatus !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height),
    };
    if (selectedShopTower) {
      const success = tryPlaceTower(selectedShopTower, point.x, point.y);
      if (success) setSelectedShopTower(null);
      return;
    }
    const clickedTower = towersRef.current.find((t) => getDistance(point.x, point.y, t.x, t.y) < 20);
    if (clickedTower) {
      setSelectedPlacedTowerId(clickedTower.id);
      setSelectedTower(clickedTower);
      if (typeof window !== "undefined" && window.innerWidth < 768) setIsPaused(true);
      pushLog(`Вибрано: ${clickedTower.name}. Убивств: ${clickedTower.totalKills}`);
    } else {
      setSelectedPlacedTowerId(null);
      setSelectedTower(null);
    }
  };

  const startGame = () => {
    const activeMap = getActiveMap();
    const progress = progressionRef.current;
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    mineProjectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedTrailsRef.current = [];
    minesRef.current = [];
    const diffConfig = DIFFICULTY_CONFIG[difficultyRef.current];
    const startingLives = diffConfig.lives + progress.bonusLives;
    const startingGold = diffConfig.gold + progress.bonusStartGold;
    setLives(startingLives);
    livesRef.current = startingLives;
    setGold(startingGold);
    goldRef.current = startingGold;
    setWave(1);
    waveRef.current = 1;
    setIsWaveActive(false);
    isWaveActiveRef.current = false;
    setGameStatus("playing");
    gameStatusRef.current = "playing";
    setIsPaused(false);
    setIsEndless(false);
    setIsSandbox(false);
    isSandboxRef.current = false;
    setScore(0);
    waveKillsRef.current = 0;
    gameStartFrameRef.current = frameCountRef.current;
    sessionSeedRef.current = Date.now();
    sessionPlayerXpRef.current = 0;
    sessionTowerXpRef.current = {};
    sessionAchievementsRef.current = [];
    sessionStartLevelRef.current = progress.playerLevel;
    sessionStartUnlockedTowersRef.current = [...progress.unlockedTowers];
    sessionSummaryDoneRef.current = false;
    setSessionSummary(null);
    setAchievementToasts([]);
    setSelectedShopTower(null);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`Карта: ${activeMap.name}. Складність: ${diffConfig.label}. Поставте першого юніта!`);
  };

  const startSandboxGame = () => {
    const activeMap = getActiveMap();
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    mineProjectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedTrailsRef.current = [];
    minesRef.current = [];
    setLives(999999);
    livesRef.current = 999999;
    setGold(999999);
    goldRef.current = 999999;
    setWave(1);
    waveRef.current = 1;
    setIsWaveActive(false);
    isWaveActiveRef.current = false;
    setGameStatus("playing");
    gameStatusRef.current = "playing";
    setIsPaused(false);
    setIsEndless(false);
    setIsSandbox(true);
    isSandboxRef.current = true;
    setScore(0);
    waveKillsRef.current = 0;
    gameStartFrameRef.current = frameCountRef.current;
    sessionSeedRef.current = Date.now();
    sessionSummaryDoneRef.current = true;
    setSessionSummary(null);
    setAchievementToasts([]);
    setSelectedShopTower(null);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`🏖️ Sandbox: ${activeMap.name}. Всі вежі безкоштовні, нескінченні життя та золото.`);
  };

  const handleSandboxSpawnEnemy = (type: string, tier: number, modifiers: EnemyModifier[], count: number, routeId?: string) => {
    const towerCtxForSpawn = {
      enemiesRef,
      waveRef,
      difficultyRef,
      selectedMapIdRef,
      getMapById,
    };
    spawnSandboxEnemyAction(type, tier, modifiers, routeId, count, towerCtxForSpawn);
    if (!isWaveActiveRef.current) {
      pushLog(`🏖️ Спавнено ${count}× ${type} (Tier ${tier})`);
    }
  };

  useEffect(() => {
    if (!isSandbox && gold >= 5000) awardAchievements(["rich"], progressionCtx);
  }, [gold, isSandbox]);

  useEffect(() => {
    goldRef.current = gold;
  }, [gold]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    let animationId: number;
    const updateGame = () => {
      engineUpdateGame(buildEngineContext());
      const pending = pendingEventsRef.current;
      if (pending.length > 0) {
        for (const event of pending) {
          if (event.kind === "log") {
            pushLog(event.message);
          }
        }
        pending.length = 0;
      }
    };
    const renderGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const themeIdx = Math.floor((waveRef.current - 1) / 10) % SCENE_THEMES.length;
      const theme = SCENE_THEMES[themeIdx];
      const activeMap = getActiveMap();
      const activeRouteIds = getWaveRouteIds(activeMap, waveRef.current);
      const renderCtx: RenderContext = {
        ctx,
        theme,
        frame: frameCountRef.current,
        activeMap,
        activeRouteIds,
        towers: towersRef.current,
        enemies: enemiesRef.current,
        projectiles: projectilesRef.current,
        mineProjectiles: mineProjectilesRef.current,
        mines: minesRef.current,
        particles: particlesRef.current,
        floatingTexts: floatingTextsRef.current,
        speedTrails: speedTrailsRef.current,
        projectileTrail: projectileTrailRef.current,
        explosionRings: explosionRingsRef.current,
        shake: screenShakeRef.current,
        waveAnnouncement: waveAnnouncementRef.current,
        onClearWaveAnnouncement: () => {
          waveAnnouncementRef.current = null;
        },
        mousePos: mousePosRef.current,
        isMouseOnCanvas,
        selectedPlacedTowerId,
        selectedShopTower,
        draggedTowerType: draggedTowerTypeRef.current,
        draggedTowerPos: draggedTowerPosRef.current,
        hoveredShopTower: hoveredShopTowerRef.current,
        lives: livesRef.current,
        settings: { effectLimits: settingsRef.current.effectLimits },
        getDistance,
        isPositionOnPath: (x, y, radius) => isPositionOnPath(x, y, activeMap, radius ?? 24),
        isSupportTowerType,
        getEffectiveTowerRange,
        getRouteById,
        getWaveRouteIds,
      };
      rendererRenderGame(renderCtx);
    };
    const gameLoop = () => {
      updateGame();
      renderGame();
      animationId = requestAnimationFrame(gameLoop);
    };
    animationId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [selectedShopTower, isMouseOnCanvas, selectedPlacedTowerId, isEndless, isSandbox]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (gameStatus === "playing") {
        setLives(livesRef.current);
        setGold(goldRef.current);
        if (selectedPlacedTowerId) {
          const currentT = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
          if (currentT) {
            setSelectedTower({ ...currentT });
          } else {
            setSelectedTower(null);
          }
        }
      }
    }, 150);
    return () => clearInterval(syncInterval);
  }, [gameStatus, selectedPlacedTowerId]);

  const handleRestart = () => {
    setScoreSubmitted(false);
    setPlayerName("");
    startGame();
  };

  const handleEndless = () => {
    setIsEndless(true);
    gameStatusRef.current = "playing";
    setGameStatus("playing");
    waveRef.current = 47;
    setWave(47);
    isWaveActiveRef.current = false;
    setIsWaveActive(false);
    pushLog("Почалася нескінченна гра! Вороги стають сильнішими з кожною хвилею.");
  };

  const handleSubmitScore = async () => {
    if (isSandbox) return;
    const name = playerName.trim() || "Анонім";
    const finalWave = gameStatusRef.current === "victory" ? wave : wave - 1;
    addToLocalLeaderboard(name, score, finalWave, progressionRef.current);
    const meta = {
      difficulty: difficultyRef.current,
      isEndless,
      durationSeconds: sessionSummary?.durationSeconds ?? Math.max(0, Math.floor((frameCountRef.current - gameStartFrameRef.current) / 60)),
      version: GAME_VERSION,
      activeTitle: progressionRef.current.activeTitle,
      activeFrame: progressionRef.current.activeFrame,
      mapId: selectedMapIdRef.current,
    };
    await submitGlobalScore(name, score, finalWave, meta);
    const local = getLocalLeaderboard();
    const global = await fetchGlobalLeaderboard(leaderboardKind);
    setLeaderboard(mergeLeaderboards(global, local));
    setScoreSubmitted(true);
  };

  // Wave counter values shown in the HUD
  const remainingEnemies = isWaveActive
    ? enemiesRef.current.length + spawnQueueRef.current.filter((s) => s.type).length
    : 0;
  const remainingHp = isWaveActive
    ? enemiesRef.current.reduce((sum, e) => sum + e.hp, 0)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      <AchievementToastStack toasts={achievementToasts} />

      <div className="lg:col-span-3 flex flex-col gap-4">
        <GameHUD
          lives={lives}
          gold={gold}
          score={score}
          wave={wave}
          isEndless={isEndless}
          isSandbox={isSandbox}
          isWaveActive={isWaveActive}
          isPaused={isPaused}
          gameSpeed={gameSpeed}
          isAutoStart={isAutoStart}
          gameStatus={gameStatus}
          remainingEnemies={remainingEnemies}
          remainingHp={remainingHp}
          totalEnemies={waveTotalEnemiesRef.current}
          onTogglePause={() => setIsPaused((p) => !p)}
          onCycleSpeed={() => setGameSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : prev === 3 ? 5 : 1))}
          onToggleAutoStart={() => setIsAutoStart((p) => !p)}
          onStartNextWave={startNextWave}
          onStartGame={startGame}
        />

        {gameStatus === "playing" && isSandbox && (
          <SandboxPanel
            wave={wave}
            selectedMapId={selectedMapId}
            isWaveActive={isWaveActive}
            onSpawnEnemy={handleSandboxSpawnEnemy}
            onSetWave={(w: number) => { setWave(w); waveRef.current = w; }}
            onStartWave={startNextWave}
            onClearAllEnemies={() => {
              enemiesRef.current = [];
              spawnQueueRef.current = [];
              if (isWaveActiveRef.current) {
                setIsWaveActive(false);
                isWaveActiveRef.current = false;
              }
            }}
            onInstantWaveClear={() => {
              enemiesRef.current = [];
              spawnQueueRef.current = [];
              if (isWaveActiveRef.current) {
                isWaveActiveRef.current = false;
                setIsWaveActive(false);
                pushLog(`🏖️ Хвиля ${wave} очищена (sandbox).`);
              }
            }}
            onSetGold={(amount: number) => { setGold(amount); goldRef.current = amount; }}
            onSetLives={(amount: number) => { setLives(amount); livesRef.current = amount; }}
          />
        )}

        <div className="relative border border-hairline-dark rounded overflow-hidden aspect-[8/5] w-full bg-black shadow-xl shadow-cyan-950/25">
          {gameStatus === "playing" && selectedShopTower && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-black/90 border-2 border-yellow-500 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs max-w-[90%] pointer-events-auto">
              <span className="font-bold text-white flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-ping shrink-0" />
                Натисніть на карту щоб побудувати {TOWER_CONFIGS[selectedShopTower]?.name || "вежу"}
              </span>
              <button
                onClick={() => setSelectedShopTower(null)}
                className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800 text-[10px] font-bold hover:bg-red-900 shrink-0"
              >
                Скасувати ✕
              </button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            aria-label="Ігрове поле Brat TD — баштова оборона"
            onClick={handleCanvasClick}
            onMouseMove={(e) => updateCanvasPointer(e.clientX, e.clientY)}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) updateCanvasPointer(t.clientX, t.clientY);
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              if (!t || gameStatus !== "playing" || !selectedShopTower) return;
              const point = updateCanvasPointer(t.clientX, t.clientY);
              if (!point) return;
              if (tryPlaceTower(selectedShopTower, point.x, point.y)) setSelectedShopTower(null);
            }}
            onMouseEnter={(e) => {
              isMouseOnCanvasRef.current = true;
              setIsMouseOnCanvas(true);
              updateCanvasPointer(e.clientX, e.clientY);
            }}
            onMouseLeave={() => {
              isMouseOnCanvasRef.current = false;
              setIsMouseOnCanvas(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!draggedTowerTypeRef.current) return;
              isMouseOnCanvasRef.current = true;
              setIsMouseOnCanvas(true);
              updateCanvasPointer(e.clientX, e.clientY);
            }}
            onDragLeave={() => {
              draggedTowerPosRef.current = null;
              setDraggedTowerPos(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (gameStatus !== "playing") return;
              const towerType = e.dataTransfer.getData("text/plain");
              if (!towerType || !TOWER_CONFIGS[towerType]) return;
              const point = updateCanvasPointer(e.clientX, e.clientY);
              if (!point) return;
              tryPlaceTower(towerType, point.x, point.y);
              draggedTowerTypeRef.current = null;
              draggedTowerPosRef.current = null;
              setDraggedTowerType(null);
              setDraggedTowerPos(null);
            }}
            className="w-full h-full cursor-crosshair block"
          />

          {gameStatus === "gameover" && (
            <EndGameOverlay
              variant="gameover"
              score={score}
              wave={wave}
              sessionSummary={sessionSummary}
              scoreSubmitted={scoreSubmitted}
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              onSubmitScore={handleSubmitScore}
              onRestart={handleRestart}
              leaderboard={leaderboard}
            />
          )}

          {gameStatus === "victory" && (
            <EndGameOverlay
              variant="victory"
              score={score}
              wave={wave}
              sessionSummary={sessionSummary}
              scoreSubmitted={scoreSubmitted}
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              onSubmitScore={handleSubmitScore}
              onRestart={handleRestart}
              onEndless={handleEndless}
              leaderboard={leaderboard}
            />
          )}

          {gameStatus === "idle" && (
            <IdleOverlay
              selectedMapId={selectedMapId}
              onSelectMap={setSelectedMapId}
              difficulty={difficulty}
              onSelectDifficulty={setDifficulty}
              progression={progression}
              onStartGame={startGame}
              onStartSandbox={startSandboxGame}
            />
          )}
        </div>

        <LeaderboardPanel
          entries={leaderboard}
          leaderboardKind={leaderboardKind}
          onTabChange={setLeaderboardKind}
        />

        {gameStatus === "playing" && !isWaveActive && (
          <WavePreview wave={wave} selectedMapId={selectedMapId} />
        )}

        <StatusBar message={statusMessage} />
      </div>

      <div className="flex flex-col gap-6">
        <ProgressionPanel progression={progression} />

        {selectedTower ? (
          <UpgradePanel
            tower={selectedTower}
            gold={gold}
            gameStatus={gameStatus}
            progression={progression}
            ctx={progressionCtx}
            isSandbox={isSandbox}
            onSell={sellSelectedTower}
            onClose={() => {
              setSelectedPlacedTowerId(null);
              setSelectedTower(null);
            }}
            onBuyUpgrade={buyUpgrade}
            onChangeTargeting={(mode) => {
              const t = towersRef.current.find((tt) => tt.id === selectedTower.id);
              if (t) {
                t.targetingMode = mode;
                setSelectedTower({ ...t });
              }
            }}
            onTogglePrioritizeCamo={() => {
              const t = towersRef.current.find((tt) => tt.id === selectedTower.id);
              if (t) {
                t.prioritizeCamo = !t.prioritizeCamo;
                setSelectedTower({ ...t });
              }
            }}
            onTogglePrioritizeDrones={() => {
              const t = towersRef.current.find((tt) => tt.id === selectedTower.id);
              if (t) {
                t.prioritizeDrones = !t.prioritizeDrones;
                setSelectedTower({ ...t });
              }
            }}
          />
        ) : (
          <ShopPanel
            gold={gold}
            gameStatus={gameStatus}
            selectedShopTower={selectedShopTower}
            progression={progression}
            isSandbox={isSandbox}
            onSelect={setSelectedShopTower}
            onDragStart={(type) => {
              draggedTowerTypeRef.current = type;
              selectedShopTowerRef.current = null;
              setDraggedTowerType(type);
              setSelectedShopTower(null);
            }}
            onDragEnd={() => {
              draggedTowerTypeRef.current = null;
              draggedTowerPosRef.current = null;
              setDraggedTowerType(null);
              setDraggedTowerPos(null);
            }}
            onMouseEnter={(type) => {
              hoveredShopTowerRef.current = type;
            }}
            onMouseLeave={() => {
              hoveredShopTowerRef.current = null;
            }}
            setSelectedPlacedTowerId={setSelectedPlacedTowerId}
            setSelectedTower={setSelectedTower as (value: unknown) => void}
            pushLog={pushLog}
          />
        )}

        <AchievementsPanel progression={progression} />

        <CosmeticsPanel
          progression={progression}
          setProgression={setProgression}
          PROGRESSION_CONFIG={PROGRESSION_CONFIG}
        />

        <SettingsPanel settings={settings} onChange={setSettings} />
      </div>
    </div>
  );
}
