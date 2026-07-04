export function mapProfile<T extends { profiles?: unknown }>(row: T) {
  const profiles = row.profiles;
  return {
    ...row,
    profiles: Array.isArray(profiles) ? profiles[0] : profiles || null,
  };
}

export function parsePagination(searchParams: URLSearchParams, defaultLimit = 20, maxLimit = 50) {
  const limit = Math.min(parseInt(searchParams.get("limit") || String(defaultLimit), 10), maxLimit);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  return { limit, offset };
}

export function paginationMeta(limit: number, offset: number, total: number | null) {
  return { limit, offset, total: total ?? 0 };
}
