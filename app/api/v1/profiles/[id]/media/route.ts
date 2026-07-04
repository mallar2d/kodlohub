import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { mapProfile, parsePagination, paginationMeta } from "@/lib/api/helpers";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, _ctx, routeCtx) => {
  const { id } = await routeCtx!.params;
  const { searchParams } = new URL(request.url);
  const { limit, offset } = parsePagination(searchParams);

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("media")
    .select("id, file_url, file_type, caption, created_at", { count: "exact" })
    .eq("author_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, {
    media: data || [],
    pagination: paginationMeta(limit, offset, count),
  });
});

export const OPTIONS = GET;
