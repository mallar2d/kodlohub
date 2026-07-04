import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const category = searchParams.get("category");

  const supabase = createAdminClient();

  let query = supabase
    .from("lore_items")
    .select("id, title, description, category, created_at, media_id, profiles(display_name, username)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(request, error.message, 500);
  }

  const lore = (data || []).map((item) => ({
    ...item,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles || null,
  }));

  return apiJson(request, {
    lore,
    pagination: { limit, offset, total: count ?? lore.length },
  });
});

export const OPTIONS = GET;
