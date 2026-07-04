import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wiki_categories")
    .select("id, name, slug, icon, created_at")
    .order("name", { ascending: true });

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, { categories: data || [] });
});

export const OPTIONS = GET;
