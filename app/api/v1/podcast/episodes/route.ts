import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth, requireServiceUser } from "@/lib/api/auth";
import { dispatchWebhook } from "@/lib/api/webhooks";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("podcast_episodes")
    .select("id, title, description, audio_url, episode_number, duration, is_published, created_at, profiles(display_name, username, avatar_url)", {
      count: "exact",
    })
    .eq("is_published", true)
    .order("episode_number", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return apiError(request, error.message, 500);
  }

  const episodes = (data || []).map((e) => ({
    ...e,
    profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles || null,
  }));

  return apiJson(request, {
    episodes,
    pagination: { limit, offset, total: count ?? episodes.length },
  });
});

export const POST = withApiAuth(
  async (request, ctx) => {
    const userCheck = requireServiceUser(request, ctx);
    if ("error" in userCheck) return userCheck.error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const audioUrl = typeof body.audio_url === "string" ? body.audio_url.trim() : "";
    const episodeNumber = body.episode_number;

    if (!title || !audioUrl || episodeNumber == null) {
      return apiError(request, "title, audio_url and episode_number are required", 400);
    }

    const admin = createAdminClient();
    const { data: episode, error } = await admin
      .from("podcast_episodes")
      .insert({
        title,
        description: body.description || "",
        audio_url: audioUrl,
        duration: body.duration || 0,
        episode_number: episodeNumber,
        author_id: userCheck.userId,
        is_published: body.is_published !== false,
      })
      .select("*, profiles(display_name, username, avatar_url)")
      .single();

    if (error) return apiError(request, error.message, 500);

    const mapped = {
      ...episode,
      profiles: Array.isArray(episode.profiles) ? episode.profiles[0] : episode.profiles || null,
    };

    void dispatchWebhook("podcast.episode", { episode: mapped, action: "created" });

    return apiJson(request, { episode: mapped }, 201);
  },
  { scopes: ["admin"] }
);

export const OPTIONS = GET;
