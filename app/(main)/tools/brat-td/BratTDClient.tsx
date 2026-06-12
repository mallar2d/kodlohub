"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PATH,
  TOWER_CONFIGS,
  getScaledWave,
  getEnemyStatsForWave,
  GAME_WIDTH,
  GAME_HEIGHT,
  PathPoint,
  Upgrade,
  OBSTACLES
} from "./gameConfig";

interface PlacedTower {
  id: string;
  x: number;
  y: number;
  type: string;
  range: number;
  damage: number;
  fireRate: number;
  emoji: string;
  color: string;
  name: string;
  cooldown: number; // frames remaining until next shot
  upgradesBought: string[];
  path1Tier: number;
  path2Tier: number;
  path3Tier: number;
  level: number;
  totalKills: number;
  pierce: number;
  // custom stats for upgrades
  twoHits?: boolean;
  critChance?: number;
  buffMultiplier?: number;
  endOfWaveBonus?: number;
  isAoESlow?: boolean;
  damageDebuff?: number;
  freezeChance?: number;
  gachaChance?: number;
  copilotBug?: boolean;
  slowAmount?: number;
  antiArmor?: boolean;
  shotCount?: number;
  // BTD6 upgrades stats
  ignoresArmor?: boolean;
  alwaysDouble?: boolean;
  critMultiplier?: number;
  damageBuff?: number;
  rangeBuff?: number;
  ignoreArmorBuff?: number;
  rangeBuffPercent?: number;
  slowDurationBonus?: number;
  slowFactorBonus?: number;
  explodeDmg?: number;
  gachaDamageOverride?: number;
  freezeDurationBonus?: number;
  bsodAoE?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  disableGlitch?: boolean;
  disableAbilities?: boolean;
  camoDetection?: boolean;
  camoDetectionBuff?: boolean;
}


interface ActiveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  damage: number;
  color: string;
  borderColor: string;
  radius: number;
  name: string;
  emoji: string;
  pathIndex: number;
  distanceTraveled: number;
  // Statuses
  slowDuration: number; // in frames
  freezeDuration: number; // in frames
  gasSlowDuration: number; // in frames
  gasSlowFactor?: number;
  damageDebuff?: number; // multiplier
  hasCopilotBug?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  // Specials
  isArmored?: boolean;
  isSuperArmored?: boolean;
  isGlitching?: boolean;
  timeSinceGlitch?: number;
  isSlowingTowers?: boolean;
  isSpawningTrail?: boolean;
  onDeath?: (x: number, y: number, spawnCallback: (type: string, rx: number, ry: number) => void) => void;
  isCamo?: boolean;
  isRegen?: boolean;
  isLead?: boolean;
}

interface Projectile {
  id: string;
  type: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  emoji: string;
  color: string;
  // inherited stats
  critChance?: number;
  isAoESlow?: boolean;
  damageDebuff?: number;
  freezeChance?: number;
  gachaChance?: number;
  copilotBug?: boolean;
  ignoresArmor?: boolean;
  alwaysDouble?: boolean;
  critMultiplier?: number;
  slowDurationBonus?: number;
  slowFactorBonus?: number;
  explodeDmg?: number;
  gachaDamageOverride?: number;
  freezeDurationBonus?: number;
  bsodAoE?: boolean;
  bugExplodeDmg?: number;
  bugExplodeRadius?: number;
  bugContagion?: boolean;
  camoDetection?: boolean;
  pierce: number;
  hitEnemyIds: string[];
  // simple physics
  angle: number;
  lastTargetX: number;
  lastTargetY: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: "circle" | "square";
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface SpeedTrail {
  x: number;
  y: number;
  radius: number;
  life: number;
}

// Pure helpers to satisfy react-hooks/purity ruleset checking for Math.random
const getPureRandom = () => Math.random();
const getPureId = () => Math.random().toString(36).substr(2, 9);

// BTD6 Crosspathing logic helper
const checkUpgradeAllowed = (path1: number, path2: number, path3: number, pathIndex: number): boolean => {
  const newTiers = [path1, path2, path3];
  newTiers[pathIndex]++;
  if (newTiers[pathIndex] > 5) return false;
  const activePaths = newTiers.filter(t => t > 0).length;
  const highTiers = newTiers.filter(t => t >= 3).length;
  return activePaths <= 2 && highTiers <= 1;
};




export default function BratTDClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- REACT STATE FOR UI ---
  const [lives, setLives] = useState(100);
  const [gold, setGold] = useState(350);
  const [wave, setWave] = useState(1);
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "gameover" | "victory">("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [isEndless, setIsEndless] = useState(false);
  const [isAutoStart, setIsAutoStart] = useState(false);
  
  const [selectedShopTower, setSelectedShopTower] = useState<string | null>(null);
  const [selectedPlacedTowerId, setSelectedPlacedTowerId] = useState<string | null>(null);
  const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);
  const [statusMessage, setStatusMessage] = useState("Подро почув накати братви. Підготуйте оборону!");

  // Mouse hover details (for previewing placement)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOnCanvas, setIsMouseOnCanvas] = useState(false);

  // --- GAME REFS FOR HIGH-FPS LOOP ---
  const towersRef = useRef<PlacedTower[]>([]);
  const enemiesRef = useRef<ActiveEnemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const speedTrailsRef = useRef<SpeedTrail[]>([]);

  // Synchronized refs for the requestAnimationFrame loop to prevent stale values
  const livesRef = useRef(100);
  const goldRef = useRef(350);
  const waveRef = useRef(1);
  const isWaveActiveRef = useRef(false);
  const gameStatusRef = useRef<"idle" | "playing" | "gameover" | "victory">("idle");
  const isPausedRef = useRef(false);
  const gameSpeedRef = useRef<1 | 2>(1);
  const isAutoStartRef = useRef(false);

  // Spawner tracking
  const spawnQueueRef = useRef<{ type: string; delay: number }[]>([]);
  const spawnTimerRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { goldRef.current = gold; }, [gold]);
  useEffect(() => { waveRef.current = wave; }, [wave]);
  useEffect(() => { isWaveActiveRef.current = isWaveActive; }, [isWaveActive]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { gameSpeedRef.current = gameSpeed; }, [gameSpeed]);
  useEffect(() => { isAutoStartRef.current = isAutoStart; }, [isAutoStart]);

  // Audio helper
  const playPdrSound = () => {
    try {
      const audio = new Audio("/PDR_PRODUCTION_SOUND.mp3");
      audio.volume = 0.45;
      audio.play().catch(() => {});
    } catch {
      // Autoplay blocked or audio missing
    }
  };

  // Set status message with log
  const pushLog = (msg: string) => {
    setStatusMessage(msg);
  };

  // --- UTILS ---
  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.hypot(x2 - x1, y2 - y1);
  };

  const getDistanceToSegment = (p: PathPoint, a: PathPoint, b: PathPoint): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return getDistance(p.x, p.y, a.x, a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return getDistance(p.x, p.y, a.x + t * dx, a.y + t * dy);
  };

  const isPositionOnPath = (x: number, y: number, radius = 24) => {
    for (let i = 0; i < PATH.length - 1; i++) {
      const dist = getDistanceToSegment({ x, y }, PATH[i], PATH[i + 1]);
      if (dist < radius) return true;
    }
    return false;
  };

  // Spawn float text
  const spawnFloatingText = (x: number, y: number, text: string, color = "#ffffff") => {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      life: 45,
      maxLife: 45
    });
  };

  // Spawn particles
  const spawnHitParticles = (x: number, y: number, color: string, count = 8, shape: "circle" | "square" = "circle") => {
    for (let i = 0; i < count; i++) {
      const angle = getPureRandom() * Math.PI * 2;
      const speed = getPureRandom() * 2 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: getPureRandom() * 3 + 2,
        life: 30,
        maxLife: 30,
        shape
      });
    }
  };

  // Spawns enemy from death actions (e.g. boss minions)
  const spawnEnemyCallback = (type: string, x: number, y: number) => {
    const baseConfig = getEnemyStatsForWave(type, waveRef.current);
    const emojiMap: Record<string, string> = {
      ordinary: "😐", fast: "⚡", heavy: "🍔", coat: "🧥",
      infinix_brat: "👾", boss: "💀", rachky_brat: "🍬", gas_brat: "💨", granite: "🗿",
      camo: "🦹", regen: "💗", lead: "🔩"
    };
    
    // Find closest pathIndex for spawned minion
    let closestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < PATH.length; i++) {
      const dist = getDistance(x, y, PATH[i].x, PATH[i].y);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    
    const newEnemy: ActiveEnemy = {
      id: getPureId(),
      type,
      x,
      y,
      hp: baseConfig.hp,
      maxHp: baseConfig.hp,
      speed: baseConfig.speed,
      reward: baseConfig.reward,
      damage: baseConfig.damage,
      color: baseConfig.color,
      borderColor: baseConfig.borderColor,
      radius: baseConfig.radius,
      name: baseConfig.name,
      emoji: emojiMap[type] || "😐",
      pathIndex: Math.max(1, closestIndex),
      distanceTraveled: 0,
      slowDuration: 0,
      freezeDuration: 0,
      gasSlowDuration: 0,
      isArmored: baseConfig.isArmored,
      isSuperArmored: baseConfig.isSuperArmored,
      isGlitching: baseConfig.isGlitching,
      isSlowingTowers: baseConfig.isSlowingTowers,
      isSpawningTrail: baseConfig.isSpawningTrail,
      onDeath: baseConfig.onDeath,
      isCamo: baseConfig.isCamo,
      isRegen: baseConfig.isRegen,
      isLead: baseConfig.isLead
    };
    enemiesRef.current.push(newEnemy);
  };

  // --- GAME INITIALIZATION & CONTROL ---
  const startGame = () => {
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedTrailsRef.current = [];
    setLives(100);
    setGold(350);
    setWave(1);
    setIsWaveActive(false);
    setGameStatus("playing");
    setIsPaused(false);
    setIsEndless(false);
    setSelectedShopTower(null);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog("Подро почув накати братви. Поставте першого Подро з Молотком!");
  };

  const startNextWave = () => {
    if (isWaveActiveRef.current || gameStatusRef.current !== "playing") return;

    const segments = getScaledWave(waveRef.current);
    
    // Build spawn queue
    const queue: { type: string; delay: number }[] = [];
    segments.forEach((seg) => {
      for (let i = 0; i < seg.count; i++) {
        queue.push({
          type: seg.type,
          delay: seg.spawnDelay
        });
      }
      if (seg.delayBeforeNext) {
        // insert empty delay
        queue.push({ type: "", delay: seg.delayBeforeNext });
      }
    });

    spawnQueueRef.current = queue;
    spawnTimerRef.current = 0;
    setIsWaveActive(true);

    const waveQuotes = [
      `Накат братви #${waveRef.current}! Вони йдуть за Nescafe!`,
      `Хвиля ${waveRef.current}: Infinix-брати почали лагати реальність.`,
      `Хвиля ${waveRef.current}: рачки активовано, викладачі в шоці!`,
      `Хвиля ${waveRef.current}: Братва проривається! Подро почув!`
    ];
    pushLog(waveQuotes[Math.min(waveQuotes.length - 1, Math.floor(getPureRandom() * waveQuotes.length))]);
  };

  // --- CLICK HANDLING (PLACEMENT & SELECTION) ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStatus !== "playing" || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Map mouse click to logical coordinates (800x500)
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. Placing a new tower
    if (selectedShopTower) {
      const config = TOWER_CONFIGS[selectedShopTower];
      if (!config) return;

      // Validate gold
      if (gold < config.cost) {
        pushLog("Недостатньо Nescafe Gold!");
        setSelectedShopTower(null);
        return;
      }

      // Validate bounds
      if (clickX < 24 || clickX > GAME_WIDTH - 24 || clickY < 24 || clickY > GAME_HEIGHT - 24) {
        pushLog("Тут не можна ставити башти!");
        return;
      }

      // Validate collision with path
      if (isPositionOnPath(clickX, clickY, 26)) {
        pushLog("Не можна ставити башти на дорозі!");
        return;
      }

      // Validate collision with obstacles
      const onObstacle = OBSTACLES.some((obs) => getDistance(clickX, clickY, obs.x, obs.y) < obs.radius + 18);
      if (onObstacle) {
        pushLog("Не можна будувати вежу на перешкоді!");
        return;
      }

      // Validate collision with existing towers
      const isOverlap = towersRef.current.some((t) => getDistance(clickX, clickY, t.x, t.y) < 26);
      if (isOverlap) {
        pushLog("Занадто близько до іншої башти!");
        return;
      }

      // Create new tower
      const newTower: PlacedTower = {
        id: getPureId(),
        x: clickX,
        y: clickY,
        type: selectedShopTower,
        range: config.range,
        damage: config.damage,
        fireRate: config.fireRate,
        emoji: config.emoji,
        color: config.color,
        name: config.name,
        cooldown: 0,
        upgradesBought: [],
        path1Tier: 0,
        path2Tier: 0,
        path3Tier: 0,
        level: 1,
        totalKills: 0,
        camoDetection: config.camoDetection || false,
        pierce: config.pierce || 1
      };

      // Apply initial setup for buffs/aura
      if (selectedShopTower === "coffee") {
        newTower.buffMultiplier = 0.25;
        newTower.endOfWaveBonus = 20;
      } else if (selectedShopTower === "gas") {
        newTower.slowAmount = 0.15;
      }

      towersRef.current.push(newTower);
      setGold((prev) => prev - config.cost);
      setSelectedShopTower(null);
      pushLog(`Створено юніт: ${config.name}!`);
      
      // Play sound!
      playPdrSound();
      
      // Spawn feedback
      spawnFloatingText(clickX, clickY - 20, `-${config.cost} ☕`, "#ef4444");
      return;
    }

    // 2. Selecting an existing tower
    const clickedTower = towersRef.current.find((t) => getDistance(clickX, clickY, t.x, t.y) < 20);
    if (clickedTower) {
      setSelectedPlacedTowerId(clickedTower.id);
      setSelectedTower(clickedTower);
      pushLog(`Вибрано: ${clickedTower.name}. Убивств: ${clickedTower.totalKills}`);
    } else {
      setSelectedPlacedTowerId(null);
      setSelectedTower(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    setMousePos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
  };

  // --- SELLING & UPGRADING TOWERS ---
  const sellSelectedTower = () => {
    if (!selectedPlacedTowerId) return;
    const towerIdx = towersRef.current.findIndex((t) => t.id === selectedPlacedTowerId);
    if (towerIdx === -1) return;

    const tower = towersRef.current[towerIdx];
    const baseConfig = TOWER_CONFIGS[tower.type];
    
    // Calculate total cost spent on tower based on path tiers
    let totalCost = baseConfig.cost;
    for (let i = 0; i < tower.path1Tier; i++) totalCost += baseConfig.upgrades.path1[i].cost;
    for (let i = 0; i < tower.path2Tier; i++) totalCost += baseConfig.upgrades.path2[i].cost;
    for (let i = 0; i < tower.path3Tier; i++) totalCost += baseConfig.upgrades.path3[i].cost;

    const sellPrice = Math.floor(totalCost * 0.7);
    setGold((prev) => prev + sellPrice);
    
    // Remove tower
    towersRef.current.splice(towerIdx, 1);
    setSelectedPlacedTowerId(null);
    setSelectedTower(null);
    pushLog(`Продано ${tower.name} за ${sellPrice} Nescafe Gold.`);
    spawnFloatingText(tower.x, tower.y - 20, `+${sellPrice} ☕`, "#22c55e");
  };

  const buyUpgrade = (pathIndex: number) => {
    if (!selectedPlacedTowerId) return;
    const tower = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
    if (!tower) return;

    // Check if upgrade is allowed under BTD6 rules
    if (!checkUpgradeAllowed(tower.path1Tier, tower.path2Tier, tower.path3Tier, pathIndex)) {
      pushLog("Цей шлях заблоковано правилами крос-пасингу BTD6!");
      return;
    }

    const baseConfig = TOWER_CONFIGS[tower.type];
    
    // Find next upgrade in path
    let upgrade = null;
    if (pathIndex === 0 && tower.path1Tier < 5) {
      upgrade = baseConfig.upgrades.path1[tower.path1Tier];
    } else if (pathIndex === 1 && tower.path2Tier < 5) {
      upgrade = baseConfig.upgrades.path2[tower.path2Tier];
    } else if (pathIndex === 2 && tower.path3Tier < 5) {
      upgrade = baseConfig.upgrades.path3[tower.path3Tier];
    }

    if (!upgrade) {
      pushLog("Шлях уже повністю прокачано!");
      return;
    }

    if (gold < upgrade.cost) {
      pushLog("Недостатньо Nescafe Gold для апгрейду!");
      return;
    }

    // Apply upgrade
    const newStats = upgrade.effect({
      range: tower.range,
      damage: tower.damage,
      fireRate: tower.fireRate,
      twoHits: tower.twoHits,
      critChance: tower.critChance,
      buffMultiplier: tower.buffMultiplier,
      endOfWaveBonus: tower.endOfWaveBonus,
      isAoESlow: tower.isAoESlow,
      damageDebuff: tower.damageDebuff,
      freezeChance: tower.freezeChance,
      gachaChance: tower.gachaChance,
      copilotBug: tower.copilotBug,
      slowAmount: tower.slowAmount,
      antiArmor: tower.antiArmor,
      ignoresArmor: tower.ignoresArmor,
      alwaysDouble: tower.alwaysDouble,
      critMultiplier: tower.critMultiplier,
      damageBuff: tower.damageBuff,
      rangeBuff: tower.rangeBuff,
      ignoreArmorBuff: tower.ignoreArmorBuff,
      rangeBuffPercent: tower.rangeBuffPercent,
      slowDurationBonus: tower.slowDurationBonus,
      slowFactorBonus: tower.slowFactorBonus,
      explodeDmg: tower.explodeDmg,
      gachaDamageOverride: tower.gachaDamageOverride,
      freezeDurationBonus: tower.freezeDurationBonus,
      bsodAoE: tower.bsodAoE,
      bugExplodeDmg: tower.bugExplodeDmg,
      bugExplodeRadius: tower.bugExplodeRadius,
      bugContagion: tower.bugContagion,
      disableGlitch: tower.disableGlitch,
      disableAbilities: tower.disableAbilities,
      camoDetection: tower.camoDetection,
      camoDetectionBuff: tower.camoDetectionBuff,
      pierce: tower.pierce
    });

    // Deduct cost and apply variables
    setGold((prev) => prev - upgrade.cost);
    tower.upgradesBought.push(upgrade.id);
    
    if (pathIndex === 0) tower.path1Tier++;
    else if (pathIndex === 1) tower.path2Tier++;
    else if (pathIndex === 2) tower.path3Tier++;

    tower.range = newStats.range;
    tower.damage = newStats.damage;
    tower.fireRate = newStats.fireRate;
    tower.twoHits = newStats.twoHits;
    tower.critChance = newStats.critChance;
    tower.buffMultiplier = newStats.buffMultiplier;
    tower.endOfWaveBonus = newStats.endOfWaveBonus;
    tower.isAoESlow = newStats.isAoESlow;
    tower.damageDebuff = newStats.damageDebuff;
    tower.freezeChance = newStats.freezeChance;
    tower.gachaChance = newStats.gachaChance;
    tower.copilotBug = newStats.copilotBug;
    tower.slowAmount = newStats.slowAmount;
    tower.antiArmor = newStats.antiArmor;
    tower.ignoresArmor = newStats.ignoresArmor;
    tower.alwaysDouble = newStats.alwaysDouble;
    tower.critMultiplier = newStats.critMultiplier;
    tower.damageBuff = newStats.damageBuff;
    tower.rangeBuff = newStats.rangeBuff;
    tower.ignoreArmorBuff = newStats.ignoreArmorBuff;
    tower.rangeBuffPercent = newStats.rangeBuffPercent;
    tower.slowDurationBonus = newStats.slowDurationBonus;
    tower.slowFactorBonus = newStats.slowFactorBonus;
    tower.explodeDmg = newStats.explodeDmg;
    tower.gachaDamageOverride = newStats.gachaDamageOverride;
    tower.freezeDurationBonus = newStats.freezeDurationBonus;
    tower.bsodAoE = newStats.bsodAoE;
    tower.bugExplodeDmg = newStats.bugExplodeDmg;
    tower.bugExplodeRadius = newStats.bugExplodeRadius;
    tower.bugContagion = newStats.bugContagion;
    tower.disableGlitch = newStats.disableGlitch;
    tower.disableAbilities = newStats.disableAbilities;
    tower.camoDetection = newStats.camoDetection;
    tower.camoDetectionBuff = newStats.camoDetectionBuff;
    tower.pierce = newStats.pierce || 1;
    
    tower.level += 1;

    // Special logic for refund upgrade
    if (upgrade.id === "candy_cheap") {
      setGold((prev) => prev + 40);
      spawnFloatingText(tower.x, tower.y - 35, `+40 ☕`, "#22c55e");
    }

    pushLog(`Апгрейд куплено: ${upgrade.name}!`);
    spawnFloatingText(tower.x, tower.y - 20, `-${upgrade.cost} ☕`, "#ef4444");
    playPdrSound();
    setSelectedTower({ ...tower });
  };

  // --- MAIN LOOP ---
  useEffect(() => {
    let animationId: number;

    const updateGame = () => {
      // If not playing or paused, skip physics updates
      if (gameStatusRef.current !== "playing" || isPausedRef.current) return;

      const speedMult = gameSpeedRef.current; // 1 or 2

      for (let s = 0; s < speedMult; s++) {
        // --- 1. SPAWNING ENEMIES ---
        if (isWaveActiveRef.current) {
          if (spawnQueueRef.current.length > 0) {
            spawnTimerRef.current += 16.67; // approx ms per frame
            const nextSpawn = spawnQueueRef.current[0];
            if (spawnTimerRef.current >= nextSpawn.delay) {
              spawnTimerRef.current = 0;
              spawnQueueRef.current.shift(); // remove from queue
              
              if (nextSpawn.type) {
                // Actually spawn the enemy
                const baseConfig = getEnemyStatsForWave(nextSpawn.type, waveRef.current);
                const emojiMap: Record<string, string> = {
                  ordinary: "😐", fast: "⚡", heavy: "🍔", coat: "🧥",
                  infinix_brat: "👾", boss: "💀", rachky_brat: "🍬", gas_brat: "💨", granite: "🗿",
                  camo: "🦹", regen: "💗", lead: "🔩"
                };

                const newEnemy: ActiveEnemy = {
                  id: getPureId(),
                  type: nextSpawn.type,
                  x: PATH[0].x,
                  y: PATH[0].y,
                  hp: baseConfig.hp,
                  maxHp: baseConfig.hp,
                  speed: baseConfig.speed,
                  reward: baseConfig.reward,
                  damage: baseConfig.damage,
                  color: baseConfig.color,
                  borderColor: baseConfig.borderColor,
                  radius: baseConfig.radius,
                  name: baseConfig.name,
                  emoji: emojiMap[nextSpawn.type] || "😐",
                  pathIndex: 1,
                  distanceTraveled: 0,
                  slowDuration: 0,
                  freezeDuration: 0,
                  gasSlowDuration: 0,
                  isArmored: baseConfig.isArmored,
                  isSuperArmored: baseConfig.isSuperArmored,
                  isGlitching: baseConfig.isGlitching,
                  isSlowingTowers: baseConfig.isSlowingTowers,
                  isSpawningTrail: baseConfig.isSpawningTrail,
                  onDeath: baseConfig.onDeath,
                  isCamo: baseConfig.isCamo,
                  isRegen: baseConfig.isRegen,
                  isLead: baseConfig.isLead
                };

                enemiesRef.current.push(newEnemy);
              }
            }
          } else if (enemiesRef.current.length === 0) {
            // Wave clear!
            setIsWaveActive(false);
            
            // Apply Nescafe Ritual end of wave bonuses
            let bonusGold = 0;
            towersRef.current.forEach((t) => {
              if (t.type === "coffee" && t.endOfWaveBonus) {
                bonusGold += t.endOfWaveBonus;
              }
            });

            // Standard wave reward
            const waveReward = 100 + waveRef.current * 10;
            const finalBonus = waveReward + bonusGold;
            setGold((prev) => prev + finalBonus);

            pushLog(`Накат братви відбито! Отримано +${finalBonus} ☕ Nescafe Gold.`);
            
            // Check victory conditions (after wave 22)
            if (waveRef.current === 22 && !isEndless) {
              setGameStatus("victory");
            } else {
              setWave((prev) => prev + 1);
              if (isAutoStartRef.current) {
                setTimeout(() => {
                  startNextWave();
                }, 1000);
              }
            }
          }
        }

        // --- 2. MOVE TRAILS & PARTICLES & FLOATS ---
        // Trails
        speedTrailsRef.current = speedTrailsRef.current
          .map((trail) => ({ ...trail, life: trail.life - 1 }))
          .filter((trail) => trail.life > 0);

        // Particles
        particlesRef.current = particlesRef.current
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 1
          }))
          .filter((p) => p.life > 0);

        // Floating texts
        floatingTextsRef.current = floatingTextsRef.current
          .map((ft) => ({
            ...ft,
            y: ft.y - 0.4,
            life: ft.life - 1
          }))
          .filter((ft) => ft.life > 0);

        // --- 3. PROCESS ENEMIES ---
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];

          // Check if frozen
          if (enemy.freezeDuration > 0) {
            enemy.freezeDuration--;
          }

          // Check slow durations
          if (enemy.slowDuration > 0) {
            enemy.slowDuration--;
          }
          if (enemy.gasSlowDuration > 0) {
            enemy.gasSlowDuration--;
          }

          // Check if standing on speed trail (sweet pink candy dust)
          let standingOnTrail = false;
          for (const trail of speedTrailsRef.current) {
            if (getDistance(enemy.x, enemy.y, trail.x, trail.y) < trail.radius) {
              standingOnTrail = true;
              break;
            }
          }

          // Calculate actual speed
          let currentSpeed = enemy.speed;
          if (enemy.freezeDuration > 0) {
            currentSpeed = 0;
          } else {
            if (enemy.slowDuration > 0) {
              currentSpeed *= 0.5; // Candy slows by 50%
            }
            if (enemy.gasSlowDuration > 0) {
              currentSpeed *= (1 - (enemy.gasSlowFactor || 0.15));
            }
            if (standingOnTrail) {
              currentSpeed *= 1.4; // 40% speed boost
            }
          }

          // Move enemy along path segments
          if (currentSpeed > 0) {
            const target = PATH[enemy.pathIndex];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = getDistance(enemy.x, enemy.y, target.x, target.y);

            if (dist <= currentSpeed) {
              // Snap to checkpoint
              enemy.x = target.x;
              enemy.y = target.y;
              enemy.pathIndex++;

              if (enemy.pathIndex >= PATH.length) {
                // Reached the end: player loses lives
                setLives((prev) => {
                  const newLives = Math.max(0, prev - enemy.damage);
                  if (newLives <= 0) {
                    setGameStatus("gameover");
                    pushLog("Кодло не вивезло. Братва прорвала оборону.");
                  }
                  return newLives;
                });
                
                // Red glowing explosion at the end
                spawnHitParticles(enemy.x - 20, enemy.y, "#ef4444", 12);
                enemiesRef.current.splice(i, 1);
                continue;
              }
            } else {
              enemy.x += (dx / dist) * currentSpeed;
              enemy.y += (dy / dist) * currentSpeed;
            }
            enemy.distanceTraveled += currentSpeed;
          }

          // Regen healing (0.3 HP per frame, approx 18 HP per second)
          if (enemy.isRegen && enemy.hp > 0 && enemy.hp < enemy.maxHp && enemy.freezeDuration <= 0) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + 0.3);
          }

          // Check if standing in ability-disabling or glitch-disabling gas aura
          let glitchDisabled = false;
          let abilitiesDisabled = false;
          towersRef.current.forEach((t) => {
            if (t.type === "gas" && (t.disableGlitch || t.disableAbilities)) {
              if (getDistance(enemy.x, enemy.y, t.x, t.y) <= t.range) {
                if (t.disableGlitch) glitchDisabled = true;
                if (t.disableAbilities) abilitiesDisabled = true;
              }
            }
          });

          // Glitching effect for Infinix-brat
          if (enemy.isGlitching && !glitchDisabled) {
            enemy.timeSinceGlitch = (enemy.timeSinceGlitch || 0) + 1;
            if (enemy.timeSinceGlitch >= 150) { // every ~2.5s
              enemy.timeSinceGlitch = 0;
              
              // Teleport forward along path
              let warpRemaining = 45;
              while (warpRemaining > 0 && enemy.pathIndex < PATH.length) {
                const target = PATH[enemy.pathIndex];
                const wdist = getDistance(enemy.x, enemy.y, target.x, target.y);
                if (wdist <= warpRemaining) {
                  enemy.x = target.x;
                  enemy.y = target.y;
                  enemy.pathIndex++;
                  warpRemaining -= wdist;
                  enemy.distanceTraveled += wdist;
                } else {
                  enemy.x += ((target.x - enemy.x) / wdist) * warpRemaining;
                  enemy.y += ((target.y - enemy.y) / wdist) * warpRemaining;
                  enemy.distanceTraveled += warpRemaining;
                  warpRemaining = 0;
                }
              }
              // glitch particles
              spawnHitParticles(enemy.x, enemy.y, "#d8b4fe", 10, "square");
            }
          }

          // Spawning speed trail for Rachky-brat
          if (enemy.isSpawningTrail && !abilitiesDisabled && getPureRandom() < 0.15) {
            speedTrailsRef.current.push({
              x: enemy.x,
              y: enemy.y,
              radius: 40,
              life: 120 // 2 seconds
            });
          }
        }

        // --- 4. TOWERS TARGET & FIRE ---
        // Pre-calculate Nescafe Ritual buffs on nearby towers
        // For each tower, check if there's a Nescafe Ritual nearby
        const towers = towersRef.current;
        const coffeeTowers = towers.filter((t) => t.type === "coffee");
        
        towers.forEach((tower) => {
          // Find max coffee buff multiplier
          let maxBuff = 0;
          let hasCamoBuff = false;
          coffeeTowers.forEach((coffee) => {
            const dist = getDistance(tower.x, tower.y, coffee.x, coffee.y);
            if (dist <= coffee.range) {
              const buffVal = coffee.buffMultiplier || 0.25;
              if (buffVal > maxBuff) maxBuff = buffVal;
              if (coffee.camoDetectionBuff) {
                hasCamoBuff = true;
              }
            }
          });

          // Check if affected by Gas Brat debuff (slow attack rate)
          let speedDebuff = 1.0;
          enemiesRef.current.forEach((enemy) => {
            if (enemy.isSlowingTowers) {
              // check if enemy is inside an entropy gas tower that disables abilities
              let abilitiesDisabled = false;
              towersRef.current.forEach((t) => {
                if (t.type === "gas" && t.disableAbilities) {
                  if (getDistance(enemy.x, enemy.y, t.x, t.y) <= t.range) {
                    abilitiesDisabled = true;
                  }
                }
              });

              if (!abilitiesDisabled) {
                const dist = getDistance(tower.x, tower.y, enemy.x, enemy.y);
                if (dist <= 120) { // range of Gas Brat smell aura
                  speedDebuff = Math.min(speedDebuff, 0.6); // 40% slow
                }
              }
            }
          });

          // Tick cooldown
          if (tower.cooldown > 0) {
            // attack speed boosted by coffee buff, slowed by gas smell
            const cooldownSpeed = (1 + maxBuff) * speedDebuff;
            tower.cooldown = Math.max(0, tower.cooldown - cooldownSpeed);
          }

          // Coffee towers do not shoot
          if (tower.type === "coffee") return;

          const isCamoCapable = tower.camoDetection || hasCamoBuff;

          // Gas towers do AoE tick damage inside the update loop directly (no projectiles)
          if (tower.type === "gas") {
            if (tower.cooldown <= 0) {
              tower.cooldown = tower.fireRate * 60; // reset
              
              // Damage all enemies in range
              enemiesRef.current.forEach((enemy) => {
                if (enemy.isCamo && !isCamoCapable) return;
                const dist = getDistance(tower.x, tower.y, enemy.x, enemy.y);
                if (dist <= tower.range) {
                  let dmg = tower.damage;
                  
                  // Anti-armor upgrade (double damage to coat/granite)
                  if (tower.antiArmor && (enemy.isArmored || enemy.isSuperArmored)) {
                    dmg *= 2.0;
                  }

                  // Gacha chance (for gacha gas / jackpot)
                  if (tower.gachaChance && getPureRandom() < tower.gachaChance) {
                    dmg += tower.gachaDamageOverride || 150;
                    spawnFloatingText(enemy.x, enemy.y - 15, "💥 ГАЧА!", "#c084fc");
                  }

                  // Apply damage debuff if active on enemy
                  if (enemy.damageDebuff) dmg *= enemy.damageDebuff;

                  const wasAlive = enemy.hp > 0;
                  enemy.hp -= dmg;
                  enemy.gasSlowDuration = 30; // 0.5s slow inside gas
                  enemy.gasSlowFactor = tower.slowAmount || 0.15;

                  // Apply gas damage debuff
                  if (tower.damageDebuff) {
                    enemy.damageDebuff = Math.max(enemy.damageDebuff || 1.0, tower.damageDebuff);
                  }

                  // spawn green cloud particle on tick
                  if (getPureRandom() < 0.2) {
                    particlesRef.current.push({
                      x: enemy.x + (getPureRandom() - 0.5) * 10,
                      y: enemy.y + (getPureRandom() - 0.5) * 10,
                      vx: (getPureRandom() - 0.5) * 0.5,
                      vy: (getPureRandom() - 0.5) * 0.5,
                      color: "rgba(34, 197, 94, 0.4)",
                      size: getPureRandom() * 6 + 4,
                      life: 20,
                      maxLife: 20
                    });
                  }

                  if (wasAlive && enemy.hp <= 0) {
                    tower.totalKills++;
                  }
                }
              });
            }
            return;
          }

          // Target selection for projectile towers (Hammer, Candy, Infinix)
          if (tower.cooldown <= 0 && enemiesRef.current.length > 0) {
            // Find enemies in range
            const targetsInRange = enemiesRef.current.filter((e) => {
              if (e.isCamo && !isCamoCapable) return false;
              return getDistance(tower.x, tower.y, e.x, e.y) <= tower.range;
            });

            if (targetsInRange.length > 0) {
              // Target first (furthest along path)
              targetsInRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
              const target = targetsInRange[0];

              // Fire!
              tower.cooldown = tower.fireRate * 60; // reset frame cooldown

              // Projectile details
              const projId = getPureId();
              const dx = target.x - tower.x;
              const dy = target.y - tower.y;
              const angle = Math.atan2(dy, dx);

              const newProj: Projectile = {
                id: projId,
                type: tower.type,
                x: tower.x,
                y: tower.y,
                targetId: target.id,
                speed: tower.type === "infinix" ? 14 : 7, // Infinix beam is very fast
                damage: tower.damage,
                emoji: tower.emoji,
                color: tower.color,
                critChance: tower.critChance,
                isAoESlow: tower.isAoESlow,
                damageDebuff: tower.damageDebuff,
                freezeChance: tower.freezeChance,
                gachaChance: tower.gachaChance,
                copilotBug: tower.copilotBug,
                ignoresArmor: tower.ignoresArmor,
                alwaysDouble: tower.alwaysDouble,
                critMultiplier: tower.critMultiplier,
                slowDurationBonus: tower.slowDurationBonus,
                slowFactorBonus: tower.slowFactorBonus,
                explodeDmg: tower.explodeDmg,
                gachaDamageOverride: tower.gachaDamageOverride,
                freezeDurationBonus: tower.freezeDurationBonus,
                bsodAoE: tower.bsodAoE,
                bugExplodeDmg: tower.bugExplodeDmg,
                bugExplodeRadius: tower.bugExplodeRadius,
                bugContagion: tower.bugContagion,
                angle,
                lastTargetX: target.x,
                lastTargetY: target.y,
                pierce: tower.pierce || 1,
                hitEnemyIds: []
              };

              // Hammer double projectile logic
              if (tower.type === "hammer") {
                if (tower.alwaysDouble) {
                  const offsetProj = {
                    ...newProj,
                    id: projId + "_2",
                    angle: angle + 0.25,
                    x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                    y: tower.y + Math.sin(angle + Math.PI/2) * 8
                  };
                  projectilesRef.current.push(offsetProj);
                } else if (tower.twoHits) {
                  // track shot count
                  const shotCount = tower.shotCount || 0;
                  tower.shotCount = shotCount + 1;
                  
                  if ((shotCount + 1) % 3 === 0) {
                    const offsetProj = {
                      ...newProj,
                      id: projId + "_2",
                      angle: angle + 0.25,
                      x: tower.x + Math.cos(angle + Math.PI/2) * 8,
                      y: tower.y + Math.sin(angle + Math.PI/2) * 8
                    };
                    projectilesRef.current.push(offsetProj);
                  }
                }
              }

              projectilesRef.current.push(newProj);
            }
          }
        });

        // --- 5. PROCESS PROJECTILES ---
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          
          // Find target
          const target = enemiesRef.current.find((e) => e.id === proj.targetId);
          let targetX = proj.lastTargetX;
          let targetY = proj.lastTargetY;

          if (target) {
            targetX = target.x;
            targetY = target.y;
            proj.lastTargetX = target.x;
            proj.lastTargetY = target.y;
          }

          // Move projectile towards target (or fly straight if targetId is empty)
          let dx = 0;
          let dy = 0;
          let dist = 0;

          if (proj.targetId && target) {
            dx = target.x - proj.x;
            dy = target.y - proj.y;
            dist = getDistance(proj.x, proj.y, target.x, target.y);
            proj.angle = Math.atan2(dy, dx);

            // Move
            if (dist <= proj.speed) {
              proj.x = target.x;
              proj.y = target.y;
            } else {
              proj.x += (dx / dist) * proj.speed;
              proj.y += (dy / dist) * proj.speed;
            }
          } else {
            // Straight flight
            proj.x += Math.cos(proj.angle) * proj.speed;
            proj.y += Math.sin(proj.angle) * proj.speed;
          }

          // Out of bounds check
          if (proj.x < -40 || proj.x > GAME_WIDTH + 40 || proj.y < -40 || proj.y > GAME_HEIGHT + 40) {
            projectilesRef.current.splice(i, 1);
            continue;
          }

          // Spinning effect for hammer
          if (proj.type === "hammer") {
            proj.angle += 0.25;
          }

          // Collision detection with ALL enemies
          let hasSpliced = false;
          for (let eIdx = enemiesRef.current.length - 1; eIdx >= 0; eIdx--) {
            const enemy = enemiesRef.current[eIdx];
            if (enemy.hp <= 0) continue;
            if (enemy.isCamo && !proj.camoDetection) continue;
            
            // Check collision distance
            const colDist = getDistance(proj.x, proj.y, enemy.x, enemy.y);
            if (colDist <= enemy.radius + 6 && !proj.hitEnemyIds.includes(enemy.id)) {
              // Hit!
              proj.hitEnemyIds.push(enemy.id);
              proj.pierce--;

              let dmg = proj.damage;

              // Infinix random damage
              if (proj.type === "infinix") {
                dmg = Math.floor(getPureRandom() * 51) + 5;
              }

              // Lead armor hammer immunity
              if (enemy.isLead && proj.type === "hammer" && !proj.ignoresArmor) {
                dmg = 0;
              }

              // Apply armor reductions
              const armorIgnored = proj.ignoresArmor || false;
              if (!armorIgnored && dmg > 0) {
                if (enemy.isArmored && proj.type === "hammer") {
                  dmg = Math.floor(dmg * 0.5);
                } else if (enemy.isSuperArmored && proj.type === "hammer") {
                  dmg = Math.floor(dmg * 0.25);
                }
              }

              // Check Criticals
              let isCrit = false;
              if (dmg > 0 && proj.critChance && getPureRandom() < proj.critChance) {
                const mult = proj.critMultiplier || 3;
                dmg *= mult;
                isCrit = true;
                playPdrSound();
              }

              // Check Gacha jackpot
              if (dmg > 0 && proj.gachaChance && getPureRandom() < proj.gachaChance) {
                dmg = proj.gachaDamageOverride || 300;
                isCrit = true;
                playPdrSound();
              }

              // Apply damage debuff if active on enemy
              if (enemy.damageDebuff && dmg > 0) {
                dmg = Math.floor(dmg * enemy.damageDebuff);
              }

              // Apply damage
              const wasAlive = enemy.hp > 0;
              enemy.hp -= dmg;

              // Apply status effects
              if (proj.type === "candy") {
                enemy.slowDuration = 120; // 2 seconds slow
                
                if (proj.damageDebuff) {
                  enemy.damageDebuff = Math.max(enemy.damageDebuff || 1.0, proj.damageDebuff);
                }

                if (proj.isAoESlow) {
                  // slow nearby enemies in 60px radius
                  enemiesRef.current.forEach((other) => {
                    if (other.id !== enemy.id && getDistance(enemy.x, enemy.y, other.x, other.y) <= 60) {
                      other.slowDuration = 90;
                      if (proj.damageDebuff) {
                        other.damageDebuff = Math.max(other.damageDebuff || 1.0, proj.damageDebuff);
                      }
                    }
                  });
                  spawnHitParticles(enemy.x, enemy.y, "#f97316", 12);
                }
              }

              if (proj.type === "infinix") {
                if (proj.freezeChance && getPureRandom() < proj.freezeChance) {
                  enemy.freezeDuration = 60;
                  spawnFloatingText(enemy.x, enemy.y - 15, "ЛАГ 999мс", "#c084fc");
                }
                
                if (proj.copilotBug) {
                  enemy.hasCopilotBug = true;
                  enemy.bugExplodeDmg = proj.bugExplodeDmg || 50;
                  enemy.bugExplodeRadius = proj.bugExplodeRadius || 80;
                  enemy.bugContagion = proj.bugContagion || false;
                }
              }

              // Floating texts
              if (isCrit) {
                spawnFloatingText(enemy.x, enemy.y - 25, "ПОЧУВ! CRIT", "#f43f5e");
              }

              // Check kill
              if (wasAlive && enemy.hp <= 0) {
                const sourceTower = towersRef.current
                  .filter((t) => t.type === proj.type && getDistance(t.x, t.y, enemy.x, enemy.y) <= t.range + 40)
                  .sort((a, b) => getDistance(a.x, a.y, enemy.x, enemy.y) - getDistance(b.x, b.y, enemy.x, enemy.y))[0];
                
                if (sourceTower) {
                  sourceTower.totalKills++;
                }
              }

              // Trigger particles
              spawnHitParticles(enemy.x, enemy.y, proj.color, 6);

              // Check if projectile is depleted
              if (proj.pierce <= 0) {
                projectilesRef.current.splice(i, 1);
                hasSpliced = true;
                break;
              } else {
                // Homing Ricochet to next target
                const nextTarget = enemiesRef.current
                  .filter((other) => other.hp > 0 && !proj.hitEnemyIds.includes(other.id) && getDistance(proj.x, proj.y, other.x, other.y) <= 120 && !(other.isCamo && !proj.camoDetection))
                  .sort((a, b) => getDistance(proj.x, proj.y, a.x, a.y) - getDistance(proj.x, proj.y, b.x, b.y))[0];

                if (nextTarget) {
                  proj.targetId = nextTarget.id;
                  proj.lastTargetX = nextTarget.x;
                  proj.lastTargetY = nextTarget.y;
                } else {
                  proj.targetId = "";
                }
              }
            }
          }

          if (hasSpliced) continue;
        }

        // --- 6. UNIFIED DEAD ENEMIES CLEANUP ---
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
          const enemy = enemiesRef.current[i];
          if (enemy.hp <= 0) {
            // Reward gold
            setGold((prev) => prev + enemy.reward);
            spawnFloatingText(enemy.x, enemy.y, `+${enemy.reward} ☕`, "#eab308");

            // Check Copilot Bug explosion
            if (enemy.hasCopilotBug) {
              const explodeDmg = enemy.bugExplodeDmg || 50;
              const explodeRad = enemy.bugExplodeRadius || 80;
              spawnFloatingText(enemy.x, enemy.y - 15, "BUG EXPLOSION!", "#a855f7");
              spawnHitParticles(enemy.x, enemy.y, "#a855f7", 15, "square");

              // Damage nearby enemies
              enemiesRef.current.forEach((other) => {
                if (other.id !== enemy.id && other.hp > 0 && getDistance(enemy.x, enemy.y, other.x, other.y) <= explodeRad) {
                  const wasAliveOther = other.hp > 0;
                  other.hp -= explodeDmg;
                  // If other dies from explosion, attribute kill to nearest Infinix tower
                  if (wasAliveOther && other.hp <= 0) {
                    const sourceTower = towersRef.current
                      .filter((t) => t.type === "infinix" && getDistance(t.x, t.y, other.x, other.y) <= t.range + 40)
                      .sort((a, b) => getDistance(a.x, a.y, other.x, other.y) - getDistance(b.x, b.y, other.x, other.y))[0];
                    if (sourceTower) {
                      sourceTower.totalKills++;
                    }

                    // Spread the bug if bugContagion is active
                    if (enemy.bugContagion) {
                      other.hasCopilotBug = true;
                      other.bugExplodeDmg = enemy.bugExplodeDmg;
                      other.bugExplodeRadius = enemy.bugExplodeRadius;
                      other.bugContagion = true;
                    }
                  }
                }
              });
            }

            // Spawn minions if boss
            if (enemy.onDeath) {
              enemy.onDeath(enemy.x, enemy.y, spawnEnemyCallback);
            }

            // Remove enemy from list
            enemiesRef.current.splice(i, 1);
          }
        }
      }
    };

    const renderGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear screen
      ctx.fillStyle = "#000000"; // SpaceX dark night
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // --- Draw Grid (Background vibe) ---
      ctx.strokeStyle = "rgba(58, 58, 63, 0.2)"; // hairline dark
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < GAME_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, GAME_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_WIDTH, y);
        ctx.stroke();
      }

      // --- Draw Path (Track) ---
      // 1. Dark wide backing
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) {
        ctx.lineTo(PATH[i].x, PATH[i].y);
      }
      ctx.lineWidth = 36;
      ctx.strokeStyle = "#0d0d0f"; // Night soft backing
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.lineWidth = 28;
      ctx.strokeStyle = "#17171a"; // Dark inner road
      ctx.stroke();

      // 2. Neon cyan glowing power rails (circuit look)
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) {
        ctx.lineTo(PATH[i].x, PATH[i].y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#06b6d4"; // Cyan rail
      
      // Glow settings
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 8;
      ctx.stroke();
      
      // Reset shadow for performance
      ctx.shadowBlur = 0;

      // 3. Portals / Gates
      // Starting Portal (Korostyshiv Granite Pit Entry)
      const startX = PATH[0].x;
      const startY = PATH[0].y;
      ctx.beginPath();
      ctx.arc(startX + 15, startY, 20, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.25)"; // green tint
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px var(--font-display)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ВХІД", startX + 15, startY);

      // Ending Gate (KODLOHUB Core)
      const endX = PATH[PATH.length - 1].x;
      const endY = PATH[PATH.length - 1].y;
      ctx.beginPath();
      ctx.arc(endX - 15, endY, 22, 0, Math.PI * 2);
      ctx.fillStyle = livesRef.current < 40 ? "rgba(239, 68, 68, 0.25)" : "rgba(56, 189, 248, 0.25)"; // pulse red if health low
      ctx.strokeStyle = livesRef.current < 40 ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 3;
      ctx.shadowColor = livesRef.current < 40 ? "#ef4444" : "#38bdf8";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px var(--font-display)";
      ctx.fillText("CORE", endX - 15, endY);

      // --- Draw Speed Trails (pink candy dust) ---
      speedTrailsRef.current.forEach((trail) => {
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 63, 94, ${0.08 * (trail.life / 120)})`;
        ctx.fill();
      });

      // --- Draw Obstacles ---
      OBSTACLES.forEach((obs) => {
        // Draw glow aura
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${obs.color === "#1d4ed8" ? "29, 78, 216" : obs.color === "#6b21a8" ? "107, 33, 168" : "75, 85, 99"}, 0.12)`;
        ctx.strokeStyle = obs.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();

        // Draw inner obstacle body
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius - 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10, 10, 10, 0.85)";
        ctx.fill();

        // Draw emoji
        ctx.fillStyle = "#ffffff";
        ctx.font = "20px var(--font-display)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obs.emoji, obs.x, obs.y);

        // Draw name label below
        ctx.font = "bold 8px var(--font-display)";
        ctx.fillStyle = "rgba(156, 163, 175, 0.85)"; // text-ink-mute
        ctx.fillText(obs.name.toUpperCase(), obs.x, obs.y + obs.radius - 1);
      });

      // --- Draw Placed Tower Ranges (when selected) ---
      if (selectedPlacedTowerId) {
        const selectedTower = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
        if (selectedTower) {
          ctx.beginPath();
          ctx.arc(selectedTower.x, selectedTower.y, selectedTower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }

      // --- Draw Hovered Tower Range ---
      if (isMouseOnCanvas && !selectedShopTower) {
        const hoveredTower = towersRef.current.find(
          (t) => getDistance(mousePos.x, mousePos.y, t.x, t.y) < 26
        );
        if (hoveredTower && hoveredTower.id !== selectedPlacedTowerId) {
          ctx.beginPath();
          ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(6, 182, 212, 0.04)";
          ctx.strokeStyle = "rgba(6, 182, 212, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }


      // --- Draw Coffee Tower Range Rings (always visible, light gold) ---
      towersRef.current.forEach((tower) => {
        if (tower.type === "coffee") {
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(234, 179, 8, 0.02)";
          ctx.strokeStyle = "rgba(234, 179, 8, 0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (tower.type === "gas") {
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34, 197, 94, 0.03)";
          ctx.fill();
        }
      });

      // --- Draw Shop Hover Preview ---
      if (selectedShopTower && isMouseOnCanvas) {
        const config = TOWER_CONFIGS[selectedShopTower];
        if (config) {
          // Range circle preview
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, config.range, 0, Math.PI * 2);
          
          const onPath = isPositionOnPath(mousePos.x, mousePos.y, 26);
          const onObstacle = OBSTACLES.some((obs) => getDistance(mousePos.x, mousePos.y, obs.x, obs.y) < obs.radius + 18);
          const overlap = towersRef.current.some((t) => getDistance(mousePos.x, mousePos.y, t.x, t.y) < 26);
          const invalid = onPath || onObstacle || overlap || mousePos.x < 24 || mousePos.x > GAME_WIDTH - 24 || mousePos.y < 24 || mousePos.y > GAME_HEIGHT - 24;

          ctx.fillStyle = invalid ? "rgba(239, 68, 68, 0.08)" : "rgba(34, 197, 94, 0.08)";
          ctx.strokeStyle = invalid ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Base representation preview
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, 18, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeStyle = invalid ? "#ef4444" : "#22c55e";
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          // Draw emoji preview
          ctx.font = "18px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(config.emoji, mousePos.x, mousePos.y);
        }
      }

      // --- Draw Towers ---
      towersRef.current.forEach((tower) => {
        // Base ring
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#0d0d0f"; // dark plate
        ctx.strokeStyle = selectedPlacedTowerId === tower.id ? "#ffffff" : tower.color;
        ctx.lineWidth = selectedPlacedTowerId === tower.id ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Level indicator stars/dots on top border of tower
        ctx.fillStyle = tower.color;
        for (let l = 0; l < tower.level; l++) {
          const angle = -Math.PI / 2 + (l - (tower.level - 1) / 2) * 0.3;
          const sx = tower.x + Math.cos(angle) * 23;
          const sy = tower.y + Math.sin(angle) * 23;
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw emoji inside
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tower.emoji, tower.x, tower.y);
      });

      // --- Draw Enemies ---
      enemiesRef.current.forEach((enemy) => {
        // Draw glitched lag shadow if freezing/glitching
        if (enemy.freezeDuration > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x + (getPureRandom() - 0.5) * 4, enemy.y + (getPureRandom() - 0.5) * 4, enemy.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
          ctx.fill();
        }

        // Base circle
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.strokeStyle = enemy.borderColor;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw emoji inside
        ctx.font = `${enemy.radius * 1.2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);

        // Draw armor shield icon if armored
        if (enemy.isArmored || enemy.isSuperArmored) {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(enemy.x - enemy.radius + 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw bug icon if Copilot Bug active
        if (enemy.hasCopilotBug) {
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.arc(enemy.x + enemy.radius - 3, enemy.y - enemy.radius + 3, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Health bar
        const barW = enemy.radius * 1.8;
        const barH = 4;
        const barX = enemy.x - barW / 2;
        const barY = enemy.y - enemy.radius - 8;

        // Background
        ctx.fillStyle = "#3f3f46";
        ctx.fillRect(barX, barY, barW, barH);

        // Fill ratio
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
      });

      // --- Draw Projectiles ---
      projectilesRef.current.forEach((proj) => {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.angle);

        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Draw rotated projectile emoji
        ctx.fillText(proj.emoji, 0, 0);

        ctx.restore();
      });

      // --- Draw Particles ---
      particlesRef.current.forEach((p) => {
        ctx.fillStyle = p.color;
        const opacity = p.life / p.maxLife;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        if (p.shape === "square") {
          ctx.rect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0; // reset
      });

      // --- Draw Floating Text ---
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        const opacity = ft.life / ft.maxLife;
        ctx.globalAlpha = opacity;
        ctx.fillStyle = ft.color;
        ctx.font = "bold 11px var(--font-body)";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
    };

    // The core loop callback
    const gameLoop = () => {
      updateGame();
      renderGame();
      
      // Pull lives & gold into state on change to trigger React re-renders for UI
      if (towersRef.current.length >= 0) { // keep check cheap
        // sync back to react state if changed, using throttle
        if (getPureRandom() < 0.1) {
          // Sync state
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShopTower, isMouseOnCanvas, selectedPlacedTowerId, isEndless]);

  // Periodic React state synchronization loop (run at slower rate to prevent React lag)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (gameStatus === "playing") {
        // Fetch current lives & gold from ref
        setLives(livesRef.current);
        setGold(goldRef.current);

        // Sync selected tower statistics (like kills)
        if (selectedPlacedTowerId) {
          const currentT = towersRef.current.find((t) => t.id === selectedPlacedTowerId);
          if (currentT) {
            setSelectedTower({ ...currentT });
          } else {
            setSelectedTower(null);
          }
        }
      }
    }, 150); // 6 times a second is plenty for responsive UI
    
    return () => clearInterval(syncInterval);
  }, [gameStatus, selectedPlacedTowerId]);

  // Reset helper
  const handleRestart = () => {
    startGame();
  };

  const handleEndless = () => {
    setIsEndless(true);
    setGameStatus("playing");
    setWave(23);
    pushLog("Почалася нескінченна гра! Вороги стають сильнішими з кожною хвилею.");
  };

  const selectedPlacedTower = selectedTower;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* LEFT: Game Scene Area */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="card-dark p-4 flex flex-wrap items-center justify-between gap-4 border-hairline-dark">
          {/* Status Display */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Нерви Кодла (HP)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">❤️</span>
                <span className={`text-xl font-bold font-[var(--font-display)] ${lives <= 35 ? "text-red-500 animate-pulse" : "text-on-primary"}`}>
                  {lives}
                </span>
                <div className="w-24 h-2 bg-zinc-800 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-200 ${lives <= 35 ? "bg-red-500" : "bg-green-500"}`} 
                    style={{ width: `${lives}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Nescafe Gold (Валюта)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">☕</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-yellow-500">
                  {gold}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="micro-cap text-ink-mute">Накат Братви (Хвиля)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">🌊</span>
                <span className="text-xl font-bold font-[var(--font-display)] text-on-primary">
                  {wave} {isEndless && <span className="text-xs text-purple-400 font-normal">Endless</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {gameStatus === "playing" && (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold micro-cap"
                >
                  {isPaused ? "Продовжити" : "Пауза"}
                </button>
                <button
                  onClick={() => setGameSpeed((prev) => (prev === 1 ? 2 : 1))}
                  className="px-4 py-2 border border-hairline-dark rounded hover:bg-canvas-night-soft text-sm font-bold text-cyan-400 micro-cap"
                >
                  Швидкість: {gameSpeed}x
                </button>
                <button
                  onClick={() => setIsAutoStart(!isAutoStart)}
                  className={`px-4 py-2 border rounded text-sm font-bold micro-cap transition-all ${
                    isAutoStart 
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                      : "border-hairline-dark hover:bg-canvas-night-soft text-ink-mute"
                  }`}
                >
                  Авто-накат: {isAutoStart ? "УВМ" : "ВИМК"}
                </button>
                {!isWaveActive && (
                  <button
                    onClick={startNextWave}
                    className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 text-sm font-bold button-cap"
                  >
                    Почати накат
                  </button>
                )}
              </>
            )}

            {gameStatus === "idle" && (
              <button
                onClick={startGame}
                className="px-6 py-3 bg-cyan-600 text-white rounded hover:bg-cyan-500 font-bold button-cap"
              >
                Почати гру
              </button>
            )}
          </div>
        </div>

        {/* Canvas Game Box */}
        <div className="relative border border-hairline-dark rounded overflow-hidden aspect-[8/5] w-full bg-black shadow-xl shadow-cyan-950/25">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseEnter={() => setIsMouseOnCanvas(true)}
            onMouseLeave={() => setIsMouseOnCanvas(false)}
            className="w-full h-full cursor-crosshair block"
          />

          {/* Game Over Screen */}
          {gameStatus === "gameover" && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-slide-up">
              <h2 className="heading-hero text-red-500 mb-2">Кодло не вивезло</h2>
              <p className="text-on-primary-mute mb-8 max-w-md text-sm">
                Братва прорвала оборону Кодлохабу. Подро мовчав занадто довго. Спробуйте іншу тактику!
              </p>
              <button
                onClick={handleRestart}
                className="btn-ghost text-red-400 hover:text-white"
              >
                Зіграти ще раз
              </button>
            </div>
          )}

          {/* Victory Screen */}
          {gameStatus === "victory" && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-slide-up">
              <h2 className="heading-hero text-yellow-500 mb-2">ПОДРО ПОЧУВ</h2>
              <p className="text-on-primary-mute mb-8 max-w-md text-sm">
                Братва відбита! CodloHub survived another cringe incident. Ви можете грати нескінченно!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleEndless}
                  className="px-6 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-500 button-cap"
                >
                  Нескінченна гра
                </button>
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 border border-hairline-dark rounded hover:bg-canvas-night-soft text-on-primary button-cap"
                >
                  Почати знову
                </button>
              </div>
            </div>
          )}

          {/* Start Prompt Overlay */}
          {gameStatus === "idle" && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="heading-section text-on-primary mb-4">BRAT TD</h2>
              <p className="text-on-primary-mute mb-8 max-w-md text-sm">
                Захистіть Кодлохаб від хвиль Братви. Ставте Подро-юнітів, які кидатимуть молотки,
                каву та святих рачків.
              </p>
              <button
                onClick={startGame}
                className="btn-ghost text-cyan-400 hover:text-white"
              >
                ПРИЙНЯТИ НАКАТ
              </button>
            </div>
          )}
        </div>

        {/* Message Ticker Log */}
        <div className="card-dark p-3 text-sm border-hairline-dark flex items-center gap-3 bg-canvas-night-soft text-cyan-400 font-mono">
          <span className="animate-pulse text-xs">●</span>
          <span>{statusMessage}</span>
        </div>
      </div>

      {/* RIGHT: Sidebar Shop & Upgrades */}
      <div className="flex flex-col gap-6">
        {/* Tower Shop */}
        <div className="card-dark p-4 border-hairline-dark">
          <p className="micro-cap text-ink-mute mb-3">МАГАЗИН ПОДРО-ЮНІТІВ</p>
          <div className="flex flex-col gap-3">
            {Object.entries(TOWER_CONFIGS).map(([type, config]) => {
              const canAfford = gold >= config.cost;
              const isSelected = selectedShopTower === type;
              return (
                <button
                  key={type}
                  disabled={gameStatus !== "playing" || isPaused}
                  onClick={() => {
                    setSelectedShopTower(isSelected ? null : type);
                    setSelectedPlacedTowerId(null);
                  }}
                  className={`w-full p-3 border rounded text-left transition-all ${
                    isSelected
                      ? "border-white bg-zinc-900 shadow-md shadow-white/5"
                      : canAfford
                      ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night-soft"
                      : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold button-cap text-on-primary flex items-center gap-2">
                      <span className="text-lg">{config.emoji}</span>
                      {config.name}
                    </span>
                    <span className="text-sm font-semibold font-[var(--font-display)] text-yellow-500">
                      ☕ {config.cost}
                    </span>
                  </div>
                  <p className="text-xs text-on-primary-mute leading-relaxed">{config.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upgrades Panel (appears when a placed tower is selected) */}
        {selectedPlacedTower ? (
          <div className="card-dark p-4 border-hairline-dark bg-canvas-night-soft animate-slide-up">
            <div className="flex items-center justify-between border-b border-hairline-dark pb-3 mb-3">
              <div>
                <h3 className="font-bold text-on-primary flex items-center gap-2 button-cap">
                  <span>{selectedPlacedTower.emoji}</span>
                  {selectedPlacedTower.name}
                </h3>
                <p className="text-xs text-ink-mute mt-0.5">Рівень: {selectedPlacedTower.level} | Убивств: {selectedPlacedTower.totalKills}</p>
              </div>
              <button
                onClick={sellSelectedTower}
                className="px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 rounded text-xs micro-cap"
              >
                Продати: +{Math.floor(
                  (TOWER_CONFIGS[selectedPlacedTower.type].cost +
                    ((): number => {
                      const baseConfig = TOWER_CONFIGS[selectedPlacedTower.type];
                      let upCost = 0;
                      for (let i = 0; i < selectedPlacedTower.path1Tier; i++) upCost += baseConfig.upgrades.path1[i].cost;
                      for (let i = 0; i < selectedPlacedTower.path2Tier; i++) upCost += baseConfig.upgrades.path2[i].cost;
                      for (let i = 0; i < selectedPlacedTower.path3Tier; i++) upCost += baseConfig.upgrades.path3[i].cost;
                      return upCost;
                    })()) * 0.7
                )} ☕
              </button>
            </div>

            <p className="micro-cap text-ink-mute mb-2">ПРОКАЧКА ЮНІТА</p>
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((pathIndex) => {
                const baseConfig = TOWER_CONFIGS[selectedPlacedTower.type];
                let pathName = "";
                let currentTier = 0;
                let pathUpgrades: Upgrade[] = [];
                
                if (pathIndex === 0) {
                  pathName = "Шлях 1: Руйнівна Сила";
                  currentTier = selectedPlacedTower.path1Tier;
                  pathUpgrades = baseConfig.upgrades.path1;
                } else if (pathIndex === 1) {
                  pathName = "Шлях 2: Швидкість Атаки";
                  currentTier = selectedPlacedTower.path2Tier;
                  pathUpgrades = baseConfig.upgrades.path2;
                } else {
                  pathName = "Шлях 3: Особливі Ефекти";
                  currentTier = selectedPlacedTower.path3Tier;
                  pathUpgrades = baseConfig.upgrades.path3;
                }

                // Check if allowed under BTD6 rules
                const isLocked = !checkUpgradeAllowed(
                  selectedPlacedTower.path1Tier,
                  selectedPlacedTower.path2Tier,
                  selectedPlacedTower.path3Tier,
                  pathIndex
                );

                const nextUpgrade = currentTier < 5 ? pathUpgrades[currentTier] : null;
                const canAfford = nextUpgrade ? gold >= nextUpgrade.cost : false;

                return (
                  <div key={pathIndex} className="border border-hairline-dark/60 rounded p-2.5 bg-canvas-night bg-opacity-40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-on-primary-mute uppercase tracking-wider micro-cap">
                        {pathName}
                      </span>
                      {/* Dots indicator for purchased tiers */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((tier) => (
                          <div
                            key={tier}
                            className={`w-2 h-2 rounded-full border ${
                              tier <= currentTier
                                ? "bg-cyan-500 border-cyan-400 shadow shadow-cyan-500"
                                : "bg-black/40 border-hairline-dark"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {nextUpgrade ? (
                      isLocked ? (
                        <div className="p-2 border border-dashed border-red-950/50 bg-red-950/10 text-red-400 rounded text-center text-xs micro-cap">
                          ЗАБЛОКОВАНО (Правило крос-пасингу BTD6)
                        </div>
                      ) : (
                        <button
                          disabled={!canAfford || gameStatus !== "playing" || isPaused}
                          onClick={() => buyUpgrade(pathIndex)}
                          className={`w-full p-2.5 border rounded text-left transition-all ${
                            canAfford
                              ? "border-hairline-dark hover:border-on-primary-mute hover:bg-canvas-night hover:bg-opacity-80"
                              : "border-hairline-dark/40 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-xs text-on-primary">
                              {nextUpgrade.name} (T{currentTier + 1})
                            </span>
                            <span className="text-xs font-semibold text-yellow-500 font-[var(--font-display)]">
                              ☕ {nextUpgrade.cost}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-primary-mute leading-relaxed">{nextUpgrade.description}</p>
                        </button>
                      )
                    ) : (
                      <div className="p-2 border border-green-950/40 bg-green-950/10 text-green-400 rounded text-center text-xs micro-cap">
                        МАКСИМУМ (Tier 5)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-dark p-6 border-hairline-dark border-dashed text-center text-on-primary-mute text-sm bg-canvas-night-soft">
            Клікніть на побудованого Подро-юніта, щоб подивитися характеристики чи апгрейднути його.
          </div>
        )}
      </div>
    </div>
  );
}
