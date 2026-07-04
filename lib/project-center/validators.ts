import {
  ACTION_STYLES,
  ACTION_TYPES,
  PROGRESS_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  UPDATE_STATUSES,
  UPDATE_TYPES,
} from "./constants";
import { slugifyProjectCenter } from "./format";

function hasValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

export function isProjectStatus(value: unknown) {
  return hasValue(PROJECT_STATUSES, value);
}

export function isProjectPriority(value: unknown) {
  return hasValue(PROJECT_PRIORITIES, value);
}

export function isProjectVisibility(value: unknown) {
  return hasValue(PROJECT_VISIBILITIES, value);
}

export function isProgressStatus(value: unknown) {
  return hasValue(PROGRESS_STATUSES, value);
}

export function isUpdateType(value: unknown) {
  return hasValue(UPDATE_TYPES, value);
}

export function isUpdateStatus(value: unknown) {
  return hasValue(UPDATE_STATUSES, value);
}

export function isActionType(value: unknown) {
  return hasValue(ACTION_TYPES, value);
}

export function isActionStyle(value: unknown) {
  return hasValue(ACTION_STYLES, value);
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePercent(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0 || numeric > 100) throw new Error("progress_percent must be between 0 and 100");
  return Math.round(numeric);
}

export function parsePositiveWeight(value: unknown, fallback = 1): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 0) throw new Error("weight must be greater than 0");
  return numeric;
}

export function parseSlug(value: unknown, fallbackTitle?: string): string {
  const source = typeof value === "string" && value.trim() ? value : fallbackTitle || "";
  const slug = slugifyProjectCenter(source);
  if (!slug) throw new Error("slug is required");
  return slug;
}
