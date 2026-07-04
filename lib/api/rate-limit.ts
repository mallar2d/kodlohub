const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(keyId: string, limitPerMinute: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const bucket = buckets.get(keyId);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + 60_000;
    buckets.set(keyId, { count: 1, resetAt });
    return { allowed: true, remaining: limitPerMinute - 1, resetAt };
  }

  if (bucket.count >= limitPerMinute) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - bucket.count,
    resetAt: bucket.resetAt,
  };
}
