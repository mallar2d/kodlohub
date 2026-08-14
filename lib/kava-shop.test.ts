import { describe, expect, it } from "vitest";
import { isRetiredKavaShopItem } from "./kava-shop";

describe("isRetiredKavaShopItem", () => {
  it("retires the first two items in the current price ordering", () => {
    expect(isRetiredKavaShopItem("VIP статус у боті")).toBe(true);
    expect(isRetiredKavaShopItem("молоток славіка")).toBe(true);
  });

  it("keeps Nescafe Gold available", () => {
    expect(isRetiredKavaShopItem("нескфе голд")).toBe(false);
  });
});
