import { createHmac, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WebhookEvent } from "@/lib/api/types";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("webhook_subscriptions")
      .select("id, url, secret, api_key_id")
      .eq("active", true)
      .contains("events", [event]);

    if (!subs?.length) return;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        const signature = createHmac("sha256", sub.secret).update(body).digest("hex");
        const res = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KodloHub-Event": event,
            "X-KodloHub-Signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          console.error(`Webhook ${sub.id} failed: ${res.status}`);
        }
      })
    );
  } catch (err) {
    console.error("Webhook dispatch error:", err);
  }
}
