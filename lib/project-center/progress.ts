import type { ProjectProgressSection } from "./types";

function normalizeWeight(weight: number | string | null | undefined): number {
  const numeric = typeof weight === "string" ? Number(weight) : weight;
  return Number.isFinite(numeric) && numeric && numeric > 0 ? numeric : 1;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function nestProgressSections(sections: ProjectProgressSection[]): ProjectProgressSection[] {
  const byId = new Map<string, ProjectProgressSection>();
  const roots: ProjectProgressSection[] = [];

  for (const section of sections) {
    byId.set(section.id, { ...section, weight: normalizeWeight(section.weight), children: [] });
  }

  for (const section of byId.values()) {
    if (section.parent_id && byId.has(section.parent_id)) {
      byId.get(section.parent_id)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }

  const sortTree = (items: ProjectProgressSection[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
    for (const item of items) sortTree(item.children || []);
  };
  sortTree(roots);

  return roots;
}

export function calculateSectionProgress(section: ProjectProgressSection, publicOnly = true): number {
  const children = (section.children || []).filter((child) => !publicOnly || child.is_public);
  if (section.progress_mode === "auto" && children.length > 0) {
    let weightedTotal = 0;
    let totalWeight = 0;
    for (const child of children) {
      const weight = normalizeWeight(child.weight);
      weightedTotal += calculateSectionProgress(child, publicOnly) * weight;
      totalWeight += weight;
    }
    return clampPercent(totalWeight === 0 ? 0 : weightedTotal / totalWeight);
  }

  return clampPercent(section.progress_percent);
}

export function calculateProjectProgress(sections: ProjectProgressSection[], fallbackPercent = 0): number {
  const publicRoots = sections.filter((section) => section.is_public && (section.section_scope || "project") === "project");
  if (publicRoots.length === 0) return clampPercent(fallbackPercent);

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const section of publicRoots) {
    const weight = normalizeWeight(section.weight);
    weightedTotal += calculateSectionProgress(section, true) * weight;
    totalWeight += weight;
  }

  return clampPercent(totalWeight === 0 ? fallbackPercent : weightedTotal / totalWeight);
}
