import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";
import {
  createSignalingTicket,
  effectiveArenaNick,
  loadArenaProfile,
} from "@/lib/arena/auth";

/** POST /api/arena/signaling-ticket — short JWT for future P2P signaling. */
export const POST = withApiAuth(async (request, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    return apiError(request, "Arena user token required", 401, "invalid_api_key");
  }
  const profile = await loadArenaProfile(userId);
  if (!profile) {
    return apiError(request, "Profile not found", 404, "not_found");
  }
  try {
    const ticket = await createSignalingTicket(userId, effectiveArenaNick(profile));
    return apiJson(request, {
      ticket,
      expires_in: 300,
      display_name: effectiveArenaNick(profile),
      user_id: userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ticket error";
    return apiError(request, message, 503, "signaling_unavailable");
  }
}, { scopes: ["write"] });

export const OPTIONS = POST;
