export type ApiScope = "read" | "write" | "admin";

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ApiScope[];
  rate_limit_per_minute: number;
  created_by: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ApiAuthContext {
  keyId: string;
  keyName: string;
  scopes: ApiScope[];
  rateLimitPerMinute: number;
  serviceUserId: string | null;
  /** Set for ka_live_ arena game tokens (and optionally kh service keys). */
  userId: string | null;
  authKind: "api_key" | "arena_token";
}

export type WebhookEvent =
  | "post.created"
  | "post.approved"
  | "comment.created"
  | "media.uploaded"
  | "user.joined"
  | "wiki.updated"
  | "podcast.episode";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "post.created",
  "post.approved",
  "comment.created",
  "media.uploaded",
  "user.joined",
  "wiki.updated",
  "podcast.episode",
];
