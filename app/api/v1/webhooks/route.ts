import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { generateWebhookSecret } from "@/lib/api/webhooks";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/api/types";
import { apiError, apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request, ctx) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_subscriptions")
    .select("id, url, events, active, created_at")
    .eq("api_key_id", ctx.keyId)
    .order("created_at", { ascending: false });

  if (error) return apiError(request, error.message, 500);

  return apiJson(request, { webhooks: data || [] });
});

export const POST = withApiAuth(
  async (request, ctx) => {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const events = Array.isArray(body.events)
      ? body.events.filter((e: string) => WEBHOOK_EVENTS.includes(e as WebhookEvent))
      : [];

    if (!url) return apiError(request, "url is required", 400);
    if (events.length === 0) return apiError(request, "At least one valid event is required", 400);

    try {
      new URL(url);
    } catch {
      return apiError(request, "Invalid webhook url", 400);
    }

    const secret = generateWebhookSecret();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("webhook_subscriptions")
      .insert({
        api_key_id: ctx.keyId,
        url,
        events,
        secret,
      })
      .select("id, url, events, active, created_at")
      .single();

    if (error) return apiError(request, error.message, 500);

    return apiJson(
      request,
      {
        webhook: data,
        secret,
        warning: "Save the secret for verifying X-KodloHub-Signature headers.",
        availableEvents: WEBHOOK_EVENTS,
      },
      201
    );
  },
  { scopes: ["write"] }
);

export const OPTIONS = GET;
