import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { parsePagination, paginationMeta } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams, 30, 100);

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("activity_log")
    .select("id, user_id, action, entity_type, entity_id, details, created_at, profiles(display_name, username)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(request, error.message, 500);

  const activity = (data || []).map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles || null,
  }));

  return apiJson(request, {
    activity,
    pagination: paginationMeta(limit, offset, count),
  });
});

export const OPTIONS = GET;
