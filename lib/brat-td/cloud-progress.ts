import { createAdminClient } from "@/lib/supabase/admin";

export type HubProgressPayload = {
  schemaVersion?: number;
  playerLevel: number;
  totalXp: number;
  unlockedTowers: string[];
  achievements: string[];
  bonusStartGold: number;
  bonusLives: number;
  towerMastery: Record<
    string,
    { towerXp: number; unlockedTiers: string[]; highestTierAchieved: number }
  >;
  mapCompletions?: Record<string, string[]>;
  legacyMapCompletions?: Record<string, string[]>;
  unlockedTitles?: string[];
  unlockedFrames?: string[];
  unlockedEffects?: string[];
  activeTitle?: string | null;
  activeFrame?: string | null;
  activeEffect?: string | null;
};

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item));
}

function asMastery(
  value: unknown
): Record<string, { towerXp: number; unlockedTiers: string[]; highestTierAchieved: number }> {
  if (!value || typeof value !== "object") return {};
  const out: Record<
    string,
    { towerXp: number; unlockedTiers: string[]; highestTierAchieved: number }
  > = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    out[key] = {
      towerXp: Math.max(0, Number(row.towerXp ?? row.tower_xp ?? 0) || 0),
      unlockedTiers: asStringArray(row.unlockedTiers ?? row.unlocked_tiers),
      highestTierAchieved: Math.max(
        2,
        Math.floor(Number(row.highestTierAchieved ?? row.highest_tier_achieved ?? 2) || 2)
      ),
    };
  }
  return out;
}

export function parseProgressPayload(body: unknown): HubProgressPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const playerLevel = Math.max(1, Math.floor(Number(b.playerLevel ?? b.player_level ?? 1) || 1));
  const totalXp = Math.max(0, Math.floor(Number(b.totalXp ?? b.total_xp ?? 0) || 0));
  return {
    schemaVersion: Math.max(1, Math.floor(Number(b.schemaVersion ?? b.progress_schema_version ?? 1) || 1)),
    playerLevel,
    totalXp,
    unlockedTowers: asStringArray(b.unlockedTowers ?? b.unlocked_towers, ["hammer", "boomerang"]),
    achievements: asStringArray(b.achievements),
    bonusStartGold: Math.max(0, Math.floor(Number(b.bonusStartGold ?? b.bonus_start_gold ?? 0) || 0)),
    bonusLives: Math.max(0, Math.floor(Number(b.bonusLives ?? b.bonus_lives ?? 0) || 0)),
    towerMastery: asMastery(b.towerMastery ?? b.tower_mastery),
    mapCompletions:
      b.mapCompletions && typeof b.mapCompletions === "object"
        ? (b.mapCompletions as Record<string, string[]>)
        : b.map_completions && typeof b.map_completions === "object"
          ? (b.map_completions as Record<string, string[]>)
          : {},
    legacyMapCompletions:
      b.legacyMapCompletions && typeof b.legacyMapCompletions === "object"
        ? (b.legacyMapCompletions as Record<string, string[]>)
        : b.legacy_map_completions && typeof b.legacy_map_completions === "object"
          ? (b.legacy_map_completions as Record<string, string[]>)
          : {},
    unlockedTitles: asStringArray(b.unlockedTitles ?? b.unlocked_titles),
    unlockedFrames: asStringArray(b.unlockedFrames ?? b.unlocked_frames),
    unlockedEffects: asStringArray(b.unlockedEffects ?? b.unlocked_effects),
    activeTitle: b.activeTitle == null && b.active_title == null ? null : String(b.activeTitle ?? b.active_title),
    activeFrame: b.activeFrame == null && b.active_frame == null ? null : String(b.activeFrame ?? b.active_frame),
    activeEffect:
      b.activeEffect == null && b.active_effect == null ? null : String(b.activeEffect ?? b.active_effect),
  };
}

export async function loadCloudProgress(userId: string): Promise<HubProgressPayload | null> {
  const admin = createAdminClient();
  const { data: progressRow } = await admin
    .from("brat_td_progress")
    .select(
      "progress_schema_version, player_level, total_xp, unlocked_towers, achievements, bonus_start_gold, bonus_lives, map_completions, legacy_map_completions, unlocked_titles, unlocked_frames, unlocked_effects, active_title, active_frame, active_effect"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { data: masteryRows } = await admin
    .from("brat_td_tower_mastery")
    .select("tower_key, tower_xp, unlocked_tiers, highest_tier_achieved")
    .eq("user_id", userId);

  if (!progressRow) return null;

  return {
    schemaVersion: progressRow.progress_schema_version ?? 1,
    playerLevel: progressRow.player_level,
    totalXp: progressRow.total_xp,
    unlockedTowers: progressRow.unlocked_towers ?? ["hammer", "boomerang"],
    achievements: progressRow.achievements ?? [],
    bonusStartGold: progressRow.bonus_start_gold ?? 0,
    bonusLives: progressRow.bonus_lives ?? 0,
    mapCompletions: progressRow.map_completions ?? {},
    legacyMapCompletions: progressRow.legacy_map_completions ?? {},
    unlockedTitles: progressRow.unlocked_titles ?? [],
    unlockedFrames: progressRow.unlocked_frames ?? [],
    unlockedEffects: progressRow.unlocked_effects ?? [],
    activeTitle: progressRow.active_title ?? null,
    activeFrame: progressRow.active_frame ?? null,
    activeEffect: progressRow.active_effect ?? null,
    towerMastery: Object.fromEntries(
      (masteryRows ?? []).map((row) => [
        row.tower_key,
        {
          towerXp: Number(row.tower_xp ?? 0),
          unlockedTiers: row.unlocked_tiers ?? [],
          highestTierAchieved: row.highest_tier_achieved ?? 2,
        },
      ])
    ),
  };
}

export async function saveCloudProgress(
  userId: string,
  progress: HubProgressPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: progressError } = await admin.from("brat_td_progress").upsert({
    user_id: userId,
    progress_schema_version: progress.schemaVersion ?? 3,
    player_level: progress.playerLevel,
    total_xp: progress.totalXp,
    unlocked_towers: progress.unlockedTowers,
    achievements: progress.achievements,
    bonus_start_gold: progress.bonusStartGold,
    bonus_lives: progress.bonusLives,
    map_completions: progress.mapCompletions ?? {},
    legacy_map_completions: progress.legacyMapCompletions ?? {},
    unlocked_titles: progress.unlockedTitles ?? [],
    unlocked_frames: progress.unlockedFrames ?? [],
    unlocked_effects: progress.unlockedEffects ?? [],
    active_title: progress.activeTitle ?? null,
    active_frame: progress.activeFrame ?? null,
    active_effect: progress.activeEffect ?? null,
    updated_at: now,
  });
  if (progressError) return { ok: false, error: progressError.message };

  const masteryRows = Object.entries(progress.towerMastery ?? {}).map(([towerKey, mastery]) => ({
    user_id: userId,
    tower_key: towerKey,
    tower_xp: mastery.towerXp,
    unlocked_tiers: mastery.unlockedTiers,
    highest_tier_achieved: mastery.highestTierAchieved,
    updated_at: now,
  }));

  if (masteryRows.length > 0) {
    const { error: masteryError } = await admin.from("brat_td_tower_mastery").upsert(masteryRows);
    if (masteryError) return { ok: false, error: masteryError.message };
  }

  return { ok: true };
}
