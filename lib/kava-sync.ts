export type LeaderboardSyncRow = {
  telegram_id: string;
  amount: number;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
};

export function normalizeLeaderboardSnapshot(
  items: unknown[]
): LeaderboardSyncRow[] {
  const rowsByTelegramId = new Map<string, LeaderboardSyncRow>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const telegramId = String(raw.telegram_id ?? "").trim();
    const amount = Number(raw.amount);

    if (!telegramId || telegramId.length > 64 || !Number.isFinite(amount)) {
      continue;
    }

    rowsByTelegramId.set(telegramId, {
      telegram_id: telegramId,
      amount: Math.trunc(amount),
      first_name:
        typeof raw.first_name === "string" && raw.first_name.trim()
          ? raw.first_name.trim()
          : null,
      username:
        typeof raw.username === "string" && raw.username.trim()
          ? raw.username.trim()
          : null,
      photo_url:
        typeof raw.photo_url === "string" && raw.photo_url.trim()
          ? raw.photo_url.trim()
          : null,
    });
  }

  return [...rowsByTelegramId.values()];
}
