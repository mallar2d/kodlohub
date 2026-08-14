import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  adjustPodroidKava,
  claimPodroidKava,
  getPodroidKavaState,
  PodroidKavaIntegrationError,
  transferPodroidKava,
} from "./podroid-kava";

describe("Podroid Kava integration", () => {
  beforeEach(() => {
    vi.stubEnv("PODROID_KAVA_API_URL", "https://bot.example.test/");
    vi.stubEnv("KODLOHUB_API_TOKEN", "shared-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("refuses to mutate when the bot integration is not configured", async () => {
    vi.stubEnv("PODROID_KAVA_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(claimPodroidKava("123")).rejects.toBeInstanceOf(
      PodroidKavaIntegrationError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads the authoritative bot state with the shared token", async () => {
    const state = {
      success: true as const,
      telegramId: "123",
      balance: 934,
      canClaim: false,
      totalClaims: 8,
      lastClaimAt: "2026-08-14T10:29:09.063Z",
      timeUntilNextClaim: 30_000,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(state), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPodroidKavaState("123")).resolves.toEqual(state);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bot.example.test/clicker/api/external-state",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer shared-token",
        }),
        body: JSON.stringify({ telegram_id: "123" }),
      })
    );
  });

  it("sends transfers to the authoritative bot balance", async () => {
    const result = {
      success: true,
      message: "Переказано 2 ☕",
      newBalance: 932,
      recipientName: "Mallаr2D",
      recipientTelegramId: "456",
      recipientNewBalance: 240,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      transferPodroidKava({
        senderTelegramId: "123",
        recipient: "456",
        amount: 2,
      })
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bot.example.test/clicker/api/external-transfer-sync",
      expect.objectContaining({
        body: JSON.stringify({
          sender_telegram_id: "123",
          recipient: "456",
          amount: 2,
        }),
      })
    );
  });

  it("sends an idempotency key with atomic game balance changes", async () => {
    const result = {
      success: true,
      message: "Баланс оновлено",
      balances: [
        {
          telegramId: "123",
          previousBalance: 10,
          newBalance: 5,
          delta: -5,
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      adjustPodroidKava({
        operationId: "dice:room-1:stakes",
        adjustments: [
          { telegramId: "123", delta: -5, description: "dice stake" },
        ],
      })
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://bot.example.test/clicker/api/external-adjustments",
      expect.objectContaining({
        body: JSON.stringify({
          operation_id: "dice:room-1:stakes",
          adjustments: [
            {
              telegram_id: "123",
              delta: -5,
              description: "dice stake",
            },
          ],
        }),
      })
    );
  });

  it("turns bot HTTP failures into an integration error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await expect(claimPodroidKava("123")).rejects.toThrow("Unauthorized");
  });
});
