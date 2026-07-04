import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/response";
import type { ApiAuthContext, ApiScope } from "@/lib/api/types";

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
): Promise<{ ctx: ApiAuthContext } | { error: Response }> {
  const rawKey = extractBearerToken(request);

  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return {
      error: apiError(
        request,
        "Missing or invalid API key. Use Authorization: Bearer kh_live_... or X-API-Key header.",
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
  if (!rate.allowed) {
    return {
      error: apiError(request, "Rate limit exceeded", 429, "rate_limit_exceeded"),
    };
  }

  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    ctx: {
      keyId: key.id,
      keyName: key.name,
      scopes,
      rateLimitPerMinute: key.rate_limit_per_minute,
      serviceUserId: key.service_user_id ?? null,
    },
  };
}

export function requireServiceUser(
  request: Request,
  ctx: ApiAuthContext
): { userId: string } | { error: Response } {
  if (!ctx.serviceUserId) {
    return {
      error: apiError(
        request,
        "API key has no service_user_id. Set it when creating the key.",
        400,
        "missing_service_user"
      ),
    };
  }
  return { userId: ctx.serviceUserId };
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

    const auth = await authenticateApiRequest(request, scopes);
    if ("error" in auth) return auth.error;

    try {
      return await handler(request, auth.ctx, routeCtx);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return apiError(request, message, 500, "internal_error");
    }
  };
}
