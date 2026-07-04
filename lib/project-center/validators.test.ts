import { describe, expect, it } from "vitest";
import {
  isActionStyle,
  isProjectPriority,
  isProjectStatus,
  isUpdateType,
  parsePercent,
  parseSlug,
} from "./validators";

describe("project-center validators", () => {
  it("accepts known enum values", () => {
    expect(isProjectStatus("active")).toBe(true);
    expect(isProjectPriority("main_focus")).toBe(true);
    expect(isUpdateType("devlog")).toBe(true);
    expect(isActionStyle("primary")).toBe(true);
  });

  it("rejects unknown enum values", () => {
    expect(isProjectStatus("shipping")).toBe(false);
    expect(isProjectPriority("urgent")).toBe(false);
    expect(isUpdateType("tweet")).toBe(false);
    expect(isActionStyle("sparkly")).toBe(false);
  });

  it("rejects progress outside range", () => {
    expect(() => parsePercent(101)).toThrow();
    expect(() => parsePercent(-1)).toThrow();
  });

  it("slugifies titles", () => {
    expect(parseSlug("", "Sonic Frontiers UA Final Horizon")).toBe("sonic-frontiers-ua-final-horizon");
  });
});
