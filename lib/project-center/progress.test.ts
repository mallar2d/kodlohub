import { describe, expect, it } from "vitest";
import { calculateProjectProgress, calculateSectionProgress, nestProgressSections } from "./progress";
import type { ProjectProgressSection } from "./types";

function section(overrides: Partial<ProjectProgressSection>): ProjectProgressSection {
  return {
    id: overrides.id || crypto.randomUUID(),
    project_id: "p1",
    parent_id: null,
    title: "Section",
    slug: "section",
    description: "",
    progress_percent: 0,
    progress_mode: "manual",
    status: "not_started",
    weight: 1,
    section_scope: "project",
    is_public: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("project-center progress", () => {
  it("keeps manual progress even when children exist", () => {
    const parent = section({
      progress_percent: 42,
      progress_mode: "manual",
      children: [section({ progress_percent: 100 })],
    });

    expect(calculateSectionProgress(parent)).toBe(42);
  });

  it("calculates auto progress from weighted children", () => {
    const parent = section({
      progress_mode: "auto",
      children: [
        section({ progress_percent: 100, weight: 3 }),
        section({ progress_percent: 0, weight: 1 }),
      ],
    });

    expect(calculateSectionProgress(parent)).toBe(75);
  });

  it("ignores hidden children for public progress", () => {
    const parent = section({
      progress_mode: "auto",
      children: [
        section({ progress_percent: 50, weight: 1 }),
        section({ progress_percent: 100, weight: 1, is_public: false }),
      ],
    });

    expect(calculateSectionProgress(parent, true)).toBe(50);
  });

  it("falls back when project has no sections", () => {
    expect(calculateProjectProgress([], 23)).toBe(23);
  });

  it("ignores update-scoped sections for project readiness", () => {
    expect(calculateProjectProgress([
      section({ progress_percent: 100, weight: 1, section_scope: "project" }),
      section({ progress_percent: 0, weight: 100, section_scope: "update" }),
    ], 0)).toBe(100);
  });

  it("nests sections by parent id and sorts them", () => {
    const parent = section({ id: "parent", title: "Parent", sort_order: 2 });
    const child = section({ id: "child", parent_id: "parent", title: "Child" });
    const roots = nestProgressSections([child, parent]);

    expect(roots).toHaveLength(1);
    expect(roots[0].children?.[0].id).toBe("child");
  });
});
