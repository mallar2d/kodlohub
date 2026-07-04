import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/api/auth";
import {
  getApiKeyManager,
  resolveRateLimit,
  resolveScopesForCreate,
  resolveServiceUserId,
} from "@/lib/api/key-access";
import type { ApiScope } from "@/lib/api/types";
import { NextResponse } from "next/server";

const VALID_SCOPES: ApiScope[] = ["read", "write", "admin"];

export async function GET() {
  const auth = await getApiKeyManager();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  let query = admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, rate_limit_per_minute, service_user_id, created_by, last_used_at, expires_at, revoked_at, created_at")
    .order("created_at", { ascending: false });

  if (!auth.ctx.isOwner) {
    query = query.eq("created_by", auth.ctx.userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data || [], isOwner: auth.ctx.isOwner });
}

export async function POST(request: Request) {
  const auth = await getApiKeyManager();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const requestedScopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s: string) => VALID_SCOPES.includes(s as ApiScope))
    : ["read"];
  const requestedRate =
    typeof body.rate_limit_per_minute === "number"
      ? Math.min(Math.max(body.rate_limit_per_minute, 1), 1000)
      : 60;
  const expiresAt = body.expires_at || null;
  const requestedServiceUser =
    typeof body.service_user_id === "string" ? body.service_user_id.trim() || null : null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const scopesResult = resolveScopesForCreate(auth.ctx, requestedScopes);
  if (!Array.isArray(scopesResult)) {
    return NextResponse.json({ error: scopesResult.error }, { status: 403 });
  }

  const scopes = scopesResult;
  if (scopes.length === 0) {
    return NextResponse.json({ error: "At least one valid scope is required" }, { status: 400 });
  }

  const rateLimit = resolveRateLimit(auth.ctx, requestedRate);
  const serviceUserId = resolveServiceUserId(auth.ctx, requestedServiceUser);

  const { rawKey, prefix, hash } = generateApiKey();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      name,
      key_prefix: prefix,
      key_hash: hash,
      scopes,
      rate_limit_per_minute: rateLimit,
      created_by: auth.ctx.userId,
      expires_at: expiresAt,
      service_user_id: serviceUserId,
    })
    .select("id, name, key_prefix, scopes, rate_limit_per_minute, service_user_id, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      key: data,
      secret: rawKey,
      warning: "Save this key now — it will not be shown again.",
    },
    { status: 201 }
  );
}
