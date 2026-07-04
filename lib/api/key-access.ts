import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { ApiScope } from "@/lib/api/types";

export interface ApiKeyGrant {
  user_id: string;
  granted_by: string | null;
  allowed_scopes: ApiScope[];
  max_rate_limit_per_minute: number;
  allow_admin_scope: boolean;
  note: string;
  created_at: string;
  revoked_at: string | null;
}

export interface ApiKeyManagerContext {
  userId: string;
  isOwner: boolean;
  grant: ApiKeyGrant | null;
}

export async function getApiKeyManager(): Promise<
  { ctx: ApiKeyManagerContext } | { error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === "owner";

  if (isOwner) {
    return { ctx: { userId: user.id, isOwner: true, grant: null } };
  }

  const admin = createAdminClient();
  const { data: grant } = await admin
    .from("api_key_grants")
    .select("*")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!grant) {
    return {
      error: NextResponse.json(
        { error: "Немає дозволу на створення API ключів. Звернись до owner." },
        { status: 403 }
      ),
    };
  }

  return {
    ctx: {
      userId: user.id,
      isOwner: false,
      grant: grant as ApiKeyGrant,
    },
  };
}

export function canManageApiKeys(ctx: ApiKeyManagerContext): boolean {
  return ctx.isOwner || ctx.grant !== null;
}

export function resolveScopesForCreate(
  ctx: ApiKeyManagerContext,
  requested: ApiScope[]
): ApiScope[] | { error: string } {
  if (ctx.isOwner) return requested;

  const grant = ctx.grant!;
  const allowed = new Set(grant.allowed_scopes as ApiScope[]);
  if (!grant.allow_admin_scope) allowed.delete("admin");

  const invalid = requested.filter((s) => !allowed.has(s));
  if (invalid.length > 0) {
    return {
      error: `Scopes not allowed: ${invalid.join(", ")}. Allowed: ${[...allowed].join(", ")}`,
    };
  }

  return requested;
}

export function resolveRateLimit(ctx: ApiKeyManagerContext, requested: number): number {
  if (ctx.isOwner) return requested;
  return Math.min(requested, ctx.grant!.max_rate_limit_per_minute);
}

export function resolveServiceUserId(ctx: ApiKeyManagerContext, requested: string | null): string | null {
  if (ctx.isOwner) return requested;
  return ctx.userId;
}
