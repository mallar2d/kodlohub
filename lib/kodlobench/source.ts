import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LoadResult } from "./types";
import { parsePublishedFile } from "./validate";

/**
 * The only place the page gets data from.
 *
 * Published results are read from one explicitly prepared file. The site never
 * scans directories, never imports anything else and never reads files outside it.
 * To move to another store (for example a Supabase table), replace `loadPublishedFile`
 * so that it returns the same envelope; the page and components stay unchanged.
 */
const PUBLISHED_PATH = path.join(process.cwd(), "content", "kodlobench", "published.json");

async function loadPublishedFile(): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(PUBLISHED_PATH, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Synthetic UI-check data: development builds only, explicit opt-in, never in production. */
function syntheticModeEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.KODLOBENCH_SYNTHETIC === "1";
}

export async function loadKodloBench(): Promise<LoadResult> {
  try {
    if (syntheticModeEnabled()) {
      const { SYNTHETIC_FILE } = await import("./fixtures");
      const parsed = parsePublishedFile(SYNTHETIC_FILE, { allowSynthetic: true });
      if (!parsed.ok) return { status: "error", message: parsed.message };
      return { status: "ok", ...parsed, synthetic: true };
    }

    const raw = await loadPublishedFile();
    if (raw === null) {
      return { status: "ok", results: [], updatedAt: null, currency: null, rejected: 0, synthetic: false };
    }
    const parsed = parsePublishedFile(raw);
    if (!parsed.ok) {
      console.error("[kodlobench] published file rejected:", parsed.message);
      return { status: "error", message: "Не вдалося прочитати опубліковані результати." };
    }
    if (parsed.rejected > 0) {
      console.error(`[kodlobench] ${parsed.rejected} record(s) failed validation and were hidden`);
    }
    return { status: "ok", ...parsed, synthetic: false };
  } catch (e) {
    console.error("[kodlobench] load failed:", e);
    return { status: "error", message: "Не вдалося завантажити результати." };
  }
}
