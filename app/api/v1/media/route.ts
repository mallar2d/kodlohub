import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const fileType = searchParams.get("type");

  const supabase = createAdminClient();

  let query = supabase
    .from("media")
    .select("id, file_url, file_type, caption, created_at, profiles(display_name, username, avatar_url)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (fileType) {
    query = query.eq("file_type", fileType);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  const media = (data || []).map((m) => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles || null,
  }));

  return apiJson(request, {
    media,
    pagination: { limit, offset, total: count ?? media.length },
  });
});

export const OPTIONS = GET;
