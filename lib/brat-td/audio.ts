export enum SoundEvent {
  TOWER_FIRE = "tower_fire",
  ENEMY_DEATH = "enemy_death",
  WAVE_START = "wave_start",
  WAVE_CLEAR = "wave_clear",
  TOWER_PLACE = "tower_place",
  TOWER_SELL = "tower_sell",
  TOWER_UPGRADE = "tower_upgrade",
  GAME_OVER = "game_over",
  VICTORY = "victory",
  CRIT_HIT = "crit_hit",
  EXPLOSION = "explosion",
}

/** Audio category — used to apply per-category volume multipliers. */
export enum SoundCategory {
  /** Tower fire, explosions, enemy death, crit hits, wave events, game-over/victory. */
  SFX = "sfx",
  /** UI interactions: tower place, sell, upgrade. */
  UI = "ui",
}

export interface SoundConfig {
  file: string;
  /** Base volume for this event (before category & master multipliers). */
  volume: number;
  category: SoundCategory;
}

const SOUND_FILE = "/PDR_PRODUCTION_SOUND.mp3";
const DEFAULT_VOLUME = 0.45;

/** Per-tower-type fire volumes (base volume before multipliers). */
const TOWER_FIRE_VOLUMES: Record<string, number> = {
  hammer: 0.35,
  coffee: 0.2,
  candy: 0.3,
  infinix: 0.4,
  gas: 0.15,
  sniper: 0.5,
  chain: 0.35,
  kladmen: 0.4,
  bankomat: 0.18,
  monolith: 0.55,
  boomerang: 0.35,
};

const S = SoundCategory;

const SOUND_MAP: Record<SoundEvent, SoundConfig> = {
  [SoundEvent.TOWER_FIRE]:  { file: SOUND_FILE, volume: DEFAULT_VOLUME, category: S.SFX },
  [SoundEvent.ENEMY_DEATH]: { file: SOUND_FILE, volume: 0.3,           category: S.SFX },
  [SoundEvent.WAVE_START]:  { file: SOUND_FILE, volume: 0.22,          category: S.SFX },
  [SoundEvent.WAVE_CLEAR]:  { file: SOUND_FILE, volume: 0.35,          category: S.SFX },
  [SoundEvent.GAME_OVER]:   { file: SOUND_FILE, volume: 0.5,           category: S.SFX },
  [SoundEvent.VICTORY]:     { file: SOUND_FILE, volume: 0.5,           category: S.SFX },
  [SoundEvent.CRIT_HIT]:    { file: SOUND_FILE, volume: 0.4,           category: S.SFX },
  [SoundEvent.EXPLOSION]:   { file: SOUND_FILE, volume: 0.55,          category: S.SFX },
  [SoundEvent.TOWER_PLACE]:   { file: SOUND_FILE, volume: 0.25, category: S.UI },
  [SoundEvent.TOWER_SELL]:    { file: SOUND_FILE, volume: 0.2,  category: S.UI },
  [SoundEvent.TOWER_UPGRADE]: { file: SOUND_FILE, volume: 0.3,  category: S.UI },
};

export function playSound(
  event: SoundEvent,
  options?: {
    towerType?: string;
    masterVolume?: number;
    sfxVolume?: number;
    uiVolume?: number;
  },
): void {
  try {
    const masterVolume = options?.masterVolume ?? 1;
    if (masterVolume <= 0) return;

    const config = SOUND_MAP[event];
    let volume = config.volume;

    // Override volume for tower-fire events based on tower type
    if (event === SoundEvent.TOWER_FIRE && options?.towerType) {
      volume = TOWER_FIRE_VOLUMES[options.towerType] ?? DEFAULT_VOLUME;
    }

    const categoryVolume =
      config.category === SoundCategory.UI
        ? (options?.uiVolume ?? 1)
        : (options?.sfxVolume ?? 1);

    const finalVolume = volume * categoryVolume * masterVolume;
    if (finalVolume <= 0) return;

    const audio = new Audio(config.file);
    audio.volume = Math.min(1, finalVolume);
    audio.play().catch((e: unknown) => {
      if (e instanceof Error && e.name !== "NotAllowedError") {
        console.warn("[brat-td] audio:", e.message);
      }
    });
  } catch (err) {
    console.warn("[brat-td] playSound:", err);
  }
}
