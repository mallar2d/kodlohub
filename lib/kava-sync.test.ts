import { describe, expect, it } from "vitest";
import { normalizeLeaderboardSnapshot } from "./kava-sync";

describe("normalizeLeaderboardSnapshot", () => {
  it("keeps the complete bot leaderboard instead of truncating it", () => {
    const snapshot = Array.from({ length: 24 }, (_, index) => ({
      telegram_id: String(1_000_000_000 + index),
      amount: 500 - index,
      first_name: `User ${index + 1}`,
      username: `user_${index + 1}`,
    }));

    expect(normalizeLeaderboardSnapshot(snapshot)).toHaveLength(24);
  });

  it("deduplicates users and ignores invalid rows", () => {
    const snapshot = normalizeLeaderboardSnapshot([
      { telegram_id: "123", amount: 5, username: "old" },
      { telegram_id: "123", amount: 8.9, username: "new" },
      { telegram_id: "", amount: 10 },
      { telegram_id: "456", amount: "not-a-number" },
      null,
    ]);

    expect(snapshot).toEqual([
      {
        telegram_id: "123",
        amount: 8,
        first_name: null,
        username: "new",
        photo_url: null,
      },
    ]);
  });
});
