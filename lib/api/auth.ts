import { createHash, randomBytes, randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/response";
import type { ApiAuthContext, ApiScope } from "@/lib/api/types";
import { ARENA_KEY_PREFIX, resolveArenaToken } from "@/lib/arena/auth";

interface RateInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

function withApiHeaders(response: Response, rate: RateInfo | null, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", requestId);
  if (rate) {
    headers.set("X-RateLimit-Limit", String(rate.limit));
    headers.set("X-RateLimit-Remaining", String(Math.max(0, rate.remaining)));
    headers.set("X-RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
    if (response.status === 429) {
      headers.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const KEY_PREFIX = "kh_live_";

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `${KEY_PREFIX}${secret}`;
  const prefix = rawKey.slice(0, 16);
  const hash = hashApiKey(rawKey);
  return { rawKey, prefix, hash };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey?.trim() || null;
}

export async function authenticateApiRequest(
  request: Request,
  requiredScopes: ApiScope[] = ["read"]
): Promise<{ ctx: ApiAuthContext; rate: RateInfo } | { error: Response; rate?: RateInfo }> {
  const rawKey = extractBearerToken(request);

  if (!rawKey) {
    return {
      error: apiError(
        request,
        "Missing or invalid API key. Use Authorization: Bearer kh_live_... / ka_live_... or X-API-Key header.",
        401,
        "invalid_api_key"
      ),
    };
  }

  if (rawKey.startsWith(ARENA_KEY_PREFIX)) {
    const arena = await resolveArenaToken(rawKey);
    if (!arena) {
      return { error: apiError(request, "Invalid arena game token", 401, "invalid_api_key") };
    }
    const arenaScopes: ApiScope[] = ["read", "write"];
    const missingScope = requiredScopes.find((s) => !arenaScopes.includes(s));
    if (missingScope) {
      return {
        error: apiError(
          request,
          `Insufficient scope. Required: ${requiredScopes.join(", ")}`,
          403,
          "insufficient_scope"
        ),
      };
    }
    const rate = checkRateLimit(arena.tokenId, 60);
    const rateInfo: RateInfo = { limit: 60, remaining: rate.remaining, resetAt: rate.resetAt };
    if (!rate.allowed) {
      return {
        error: apiError(request, "Rate limit exceeded", 429, "rate_limit_exceeded"),
        rate: rateInfo,
      };
    }
    return {
      ctx: {
        keyId: arena.tokenId,
        keyName: "HALF BRAT",
        scopes: arenaScopes,
        rateLimitPerMinute: 60,
        serviceUserId: arena.userId,
        userId: arena.userId,
        authKind: "arena_token",
      },
      rate: rateInfo,
    };
  }

  if (!rawKey.startsWith(KEY_PREFIX)) {
    return {
      error: apiError(
        request,
        "Missing or invalid API key. Use Authorization: Bearer kh_live_... / ka_live_... or X-API-Key header.",
        401,
        "invalid_api_key"
      ),
    };
  }

  const admin = createAdminClient();
  const keyHash = hashApiKey(rawKey);

  const { data: key, error } = await admin
    .from("api_keys")
    .select("id, name, scopes, rate_limit_per_minute, expires_at, revoked_at, service_user_id")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !key) {
    return {
      error: apiError(request, "Invalid API key", 401, "invalid_api_key"),
    };
  }

  if (key.revoked_at) {
    return {
      error: apiError(request, "API key has been revoked", 401, "revoked_api_key"),
    };
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return {
      error: apiError(request, "API key has expired", 401, "expired_api_key"),
    };
  }

  const scopes = (key.scopes || []) as ApiScope[];
  const missingScope = requiredScopes.find((s) => !scopes.includes(s));
  if (missingScope) {
    return {
      error: apiError(
        request,
        `Insufficient scope. Required: ${requiredScopes.join(", ")}`,
        403,
        "insufficient_scope"
      ),
    };
  }

  const rate = checkRateLimit(key.id, key.rate_limit_per_minute);
  const rateInfo: RateInfo = {
    limit: key.rate_limit_per_minute,
    remaining: rate.remaining,
    resetAt: rate.resetAt,
  };

  if (!rate.allowed) {
    return {
      error: apiError(request, "Rate limit exceeded", 429, "rate_limit_exceeded"),
      rate: rateInfo,
    };
  }

  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(undefined, () => {});

  return {
    ctx: {
      keyId: key.id,
      keyName: key.name,
      scopes,
      rateLimitPerMinute: key.rate_limit_per_minute,
      serviceUserId: key.service_user_id ?? null,
      userId: key.service_user_id ?? null,
      authKind: "api_key",
    },
    rate: rateInfo,
  };
}

export function requireServiceUser(
  request: Request,
  ctx: ApiAuthContext
): { userId: string } | { error: Response } {
  const userId = ctx.userId || ctx.serviceUserId;
  if (!userId) {
    return {
      error: apiError(
        request,
        "API key has no service_user_id. Set it when creating the key.",
        400,
        "missing_service_user"
      ),
    };
  }
  return { userId };
}

export type ApiHandler = (
  request: Request,
  ctx: ApiAuthContext,
  routeCtx?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function withApiAuth(
  handler: ApiHandler,
  options: { scopes?: ApiScope[] } = {}
): (request: Request, routeCtx?: { params: Promise<Record<string, string>> }) => Promise<Response> {
  const scopes = options.scopes ?? ["read"];

  return async (request: Request, routeCtx?: { params: Promise<Record<string, string>> }) => {
    const { handleCorsPreflight } = await import("@/lib/api/cors");
    const preflight = handleCorsPreflight(request);
    if (preflight) return preflight;

    const requestId = randomUUID();
    const auth = await authenticateApiRequest(request, scopes);
    if ("error" in auth) return withApiHeaders(auth.error, auth.rate ?? null, requestId);

    try {
      const response = await handler(request, auth.ctx, routeCtx);
      return withApiHeaders(response, auth.rate, requestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return withApiHeaders(apiError(request, message, 500, "internal_error"), auth.rate, requestId);
    }
  };
}
