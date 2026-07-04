import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApiAuth } from "@/lib/api/auth";
import { apiError, apiJson } from "@/lib/api/response";

export const POST = withApiAuth(
  async (request, ctx, routeCtx) => {
    const { id } = await routeCtx!.params;
    const admin = createAdminClient();

    const { data: sub, error } = await admin
      .from("webhook_subscriptions")
      .select("id, url, secret, active")
      .eq("id", id)
      .eq("api_key_id", ctx.keyId)
      .maybeSingle();

    if (error) return apiError(request, error.message, 500);
    if (!sub) return apiError(request, "Webhook not found", 404, "not_found");
    if (!sub.active) return apiError(request, "Webhook is inactive", 400, "webhook_inactive");

    const body = JSON.stringify({
      event: "test.ping",
      timestamp: new Date().toISOString(),
      data: { message: "Тестова доставка з KodloHUB API. Гойда." },
    });
    const signature = createHmac("sha256", sub.secret).update(body).digest("hex");

    try {
      const res = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KodloHub-Event": "test.ping",
          "X-KodloHub-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      return apiJson(request, {
        delivered: res.ok,
        status: res.status,
        event: "test.ping",
      });
    } catch (err) {
      return apiJson(request, {
        delivered: false,
        status: null,
        event: "test.ping",
        error: err instanceof Error ? err.message : "Delivery failed",
      });
    }
  },
  { scopes: ["write"] }
);

export const OPTIONS = POST;
