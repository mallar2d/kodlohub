import { CATEGORIES, DEFAULT_CATEGORY_ID, isViewCategoryId } from "./categories";
import { withOverall } from "./overall";
import { metricValue } from "./format";
import type { PublishedResult, ScatterAxis, SortDir, SortKey } from "./types";

export const MAX_SELECTED = 8;

/** Everything the visitor can change. Serialised into the URL so a view can be shared. */
export interface ViewState {
  category: string;
  query: string;
  models: string[];
  agents: string[];
  sort: SortKey;
  dir: SortDir;
  /** Categories left out of the overall total (the index is rescaled to the same maximum). */
  exclude: string[];
  /** Scatter charts whose X axis is logarithmic. */
  logs: ScatterAxis[];
  onlySelected: boolean;
  /**
   * Fixed colour slots. Index = slot (0..7), value = result id or null for a free slot.
   * Removing an entry frees its slot without shifting the others, so a colour always
   * follows the entry and never its rank.
   */
  slots: (string | null)[];
  openId: string | null;
}

export const DEFAULT_VIEW: ViewState = {
  category: DEFAULT_CATEGORY_ID,
  query: "",
  models: [],
  agents: [],
  sort: "score",
  dir: "desc",
  exclude: [],
  logs: [],
  onlySelected: false,
  slots: [],
  openId: null,
};

const SORT_KEYS: SortKey[] = ["model", "agent", "config", "score", "time", "tokens", "cost"];
const SCATTER_AXES: ScatterAxis[] = ["cost", "time", "tokens"];

type RawParams = Record<string, string | string[] | undefined>;

function many(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).filter((s) => s.length > 0);
}
function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Tolerant parse: unknown or stale values fall back to defaults and never throw. */
export function parseView(params: RawParams, published: readonly PublishedResult[]): ViewState {
  const category = isViewCategoryId(one(params.category)) ? (one(params.category) as string) : DEFAULT_CATEGORY_ID;
  // At least one category must stay counted.
  const exclude = CATEGORIES.map((c) => c.id)
    .filter((id) => (one(params.without) ?? "").split(",").includes(id))
    .slice(0, CATEGORIES.length - 1);
  // Overall rows depend on the exclusion list, so they are derived here from the published rows.
  const all = withOverall(published, exclude);
  const inCategory = new Map(all.filter((r) => r.category === category).map((r) => [r.id, r]));

  const sort = SORT_KEYS.find((k) => k === one(params.sort)) ?? DEFAULT_VIEW.sort;
  const dirRaw = one(params.dir);
  const dir: SortDir = dirRaw === "asc" || dirRaw === "desc" ? dirRaw : sort === "score" ? "desc" : "asc";
  const logs = (one(params.log) ?? "")
    .split(",")
    .filter((a): a is ScatterAxis => SCATTER_AXES.includes(a as ScatterAxis));

  const slots: (string | null)[] = [];
  const used = new Set<string>();
  for (const part of (one(params.sel) ?? "").split(",").slice(0, MAX_SELECTED)) {
    if (part && inCategory.has(part) && !used.has(part)) {
      slots.push(part);
      used.add(part);
    } else {
      slots.push(null);
    }
  }
  while (slots.length > 0 && slots[slots.length - 1] === null) slots.pop();

  const open = one(params.open);
  return {
    category,
    query: (one(params.q) ?? "").slice(0, 80),
    models: many(params.model),
    agents: many(params.agent),
    sort,
    dir,
    exclude,
    logs: SCATTER_AXES.filter((a) => logs.includes(a)),
    onlySelected: one(params.only) === "1" && slots.length > 0,
    slots,
    openId: open && inCategory.has(open) ? open : null,
  };
}

/** Only non-default values are written, so the plain page keeps a clean address. */
export function serializeView(v: ViewState): string {
  const p = new URLSearchParams();
  if (v.category !== DEFAULT_CATEGORY_ID) p.set("category", v.category);
  if (v.query.trim()) p.set("q", v.query.trim());
  v.models.forEach((m) => p.append("model", m));
  v.agents.forEach((a) => p.append("agent", a));
  const defaultDir: SortDir = v.sort === "score" ? "desc" : "asc";
  if (v.sort !== DEFAULT_VIEW.sort) p.set("sort", v.sort);
  if (v.dir !== defaultDir) p.set("dir", v.dir);
  if (v.exclude.length > 0) p.set("without", v.exclude.join(","));
  if (v.logs.length > 0) p.set("log", v.logs.join(","));
  if (v.onlySelected) p.set("only", "1");
  if (v.slots.some(Boolean)) p.set("sel", v.slots.map((s) => s ?? "").join(","));
  if (v.openId) p.set("open", v.openId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function selectedIds(slots: readonly (string | null)[]): Set<string> {
  return new Set(slots.filter((s): s is string => s !== null));
}

export function slotOf(slots: readonly (string | null)[], id: string): number {
  return slots.indexOf(id);
}

/** Toggle an entry. Returns `full: true` and the unchanged slots when all colours are taken. */
export function toggleSlot(
  slots: readonly (string | null)[],
  id: string,
): { slots: (string | null)[]; full: boolean } {
  const next = [...slots];
  const existing = next.indexOf(id);
  if (existing !== -1) {
    next[existing] = null;
    while (next.length > 0 && next[next.length - 1] === null) next.pop();
    return { slots: next, full: false };
  }
  const free = next.indexOf(null);
  if (free !== -1) {
    next[free] = id;
    return { slots: next, full: false };
  }
  if (next.length < MAX_SELECTED) {
    next.push(id);
    return { slots: next, full: false };
  }
  return { slots: [...slots], full: true };
}

export function matchesQuery(r: PublishedResult, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("uk-UA");
  if (!q) return true;
  return [r.model, r.agent ?? "", r.config ?? ""].some((s) => s.toLocaleLowerCase("uk-UA").includes(q));
}

/**
 * Visible set = records of the category that match the filters, plus every selected record
 * (a selection is never hidden by a filter). "Only selected" narrows to the selection.
 */
export function visibleResults(all: readonly PublishedResult[], v: ViewState): PublishedResult[] {
  const sel = selectedIds(v.slots);
  return all.filter((r) => {
    if (r.category !== v.category) return false;
    if (v.onlySelected) return sel.has(r.id);
    if (sel.has(r.id)) return true;
    if (v.models.length > 0 && !v.models.includes(r.model)) return false;
    if (v.agents.length > 0 && !(r.agent !== null && v.agents.includes(r.agent))) return false;
    return matchesQuery(r, v.query);
  });
}

function sortValue(r: PublishedResult, key: SortKey): string | number | null {
  switch (key) {
    case "model":
      return r.model;
    case "agent":
      return r.agent;
    case "config":
      return r.config;
    case "score":
      return metricValue(r, "score");
    case "time":
      return metricValue(r, "time");
    case "tokens":
      return metricValue(r, "tokens");
    case "cost":
      return metricValue(r, "cost");
  }
}

const collator = new Intl.Collator("uk-UA", { numeric: true, sensitivity: "base" });

/** Missing values always sort last, in either direction. */
export function sortResults(rows: readonly PublishedResult[], key: SortKey, dir: SortDir): PublishedResult[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === null && bv !== null) return 1;
    if (av !== null && bv === null) return -1;
    if (av !== null && bv !== null && av !== bv) {
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : collator.compare(String(av), String(bv));
      if (c !== 0) return c * sign;
    }
    return collator.compare(a.model, b.model) || collator.compare(a.config ?? "", b.config ?? "") || collator.compare(a.id, b.id);
  });
}

export function uniqueSorted(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => v !== null))].sort(collator.compare);
}

/** Scatter points: both axes must be present (and positive on a log axis). Others are counted, not drawn. */
export function scatterSplit(
  rows: readonly PublishedResult[],
  x: "cost" | "time" | "tokens",
  log: boolean,
): { plotted: PublishedResult[]; missing: number } {
  const plotted = rows.filter((r) => {
    const xv = metricValue(r, x);
    return r.score !== null && xv !== null && (!log || xv > 0);
  });
  return { plotted, missing: rows.length - plotted.length };
}

/** Builds the raw parameter map from a query string (repeated keys become arrays). */
export function paramsFromSearch(search: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const sp = new URLSearchParams(search);
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}
