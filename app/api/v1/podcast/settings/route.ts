import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("podcast_settings")
    .select("id, background_track_url, background_volume, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, { settings: data });
});

export const OPTIONS = GET;
