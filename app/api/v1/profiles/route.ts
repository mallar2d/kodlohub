import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const role = searchParams.get("role");

  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, role, created_at", { count: "exact" })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  return apiJson(request, {
    profiles: data || [],
    pagination: { limit, offset, total: count ?? (data?.length || 0) },
  });
});

export const OPTIONS = GET;
