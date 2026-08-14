import { describe, expect, it } from "vitest";
import { resolveKavaAvatar } from "./kava-profile";

describe("resolveKavaAvatar", () => {
  it("prefers the Telegram avatar when Telegram provides one", () => {
    expect(resolveKavaAvatar("telegram.jpg", "profile.jpg")).toBe(
      "telegram.jpg"
    );
  });

  it("falls back to the site profile avatar", () => {
    expect(resolveKavaAvatar(null, "profile.jpg")).toBe("profile.jpg");
  });

  it("returns null when neither account has an avatar", () => {
    expect(resolveKavaAvatar(null, null)).toBeNull();
  });
});
