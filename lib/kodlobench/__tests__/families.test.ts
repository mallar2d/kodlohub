import { describe, expect, it } from "vitest";
import { familyOf } from "../families";

describe("familyOf", () => {
  it("groups models by maker", () => {
    expect(familyOf("gpt-6-luna").id).toBe("openai");
    expect(familyOf("zai-glm-5-3").id).toBe("glm");
    expect(familyOf("Grok 4.7").id).toBe("grok");
    expect(familyOf("Claude Opus 5").id).toBe("claude");
    expect(familyOf("GPT-6 Luna").id).toBe("openai");
    expect(familyOf("GLM 5.3").id).toBe("glm");
  });
  it("falls back to a neutral family", () => {
    expect(familyOf("Synthetic Model A").id).toBe("other");
  });
});
