import { withApiAuth } from "@/lib/api/auth";
import { apiJson } from "@/lib/api/response";

export const GET = withApiAuth(async (request) => {
  const base = new URL(request.url).origin;

  return apiJson(request, {
    name: "KodloHUB API",
    version: "v1",
    documentation: `${base}/docs`,
    openapi: `${base}/api/v1/openapi`,
    health: `${base}/api/v1/health`,
    authentication: {
      type: "api_key",
      headers: [
        "Authorization: Bearer kh_live_<your_key>",
        "X-API-Key: kh_live_<your_key>",
      ],
    },
    scopes: {
      read: "Read public content, search, stats, games, AI chat",
      write: "Create posts, comments, notifications, webhooks",
      admin: "Moderation, wiki/podcast management",
    },
    webhooks: {
      subscribe: `POST ${base}/api/v1/webhooks`,
      events: ["post.created", "post.approved", "comment.created", "media.uploaded", "user.joined", "wiki.updated", "podcast.episode"],
      signature: "X-KodloHub-Signature: sha256=<hmac>",
    },
    endpoints: {
      health: `GET ${base}/api/v1/health`,
      me: `GET ${base}/api/v1/me`,
      stats: `GET ${base}/api/v1/stats`,
      activity: `GET ${base}/api/v1/activity`,
      search: `GET ${base}/api/v1/search?q=`,
      posts: `GET|POST ${base}/api/v1/posts`,
      post: `GET|PATCH|DELETE ${base}/api/v1/posts/:id`,
      postComments: `GET|POST ${base}/api/v1/posts/:id/comments`,
      profiles: `GET ${base}/api/v1/profiles`,
      profile: `GET ${base}/api/v1/profiles/:id`,
      profilePosts: `GET ${base}/api/v1/profiles/:id/posts`,
      profileMedia: `GET ${base}/api/v1/profiles/:id/media`,
      media: `GET ${base}/api/v1/media`,
      mediaItem: `GET ${base}/api/v1/media/:id`,
      mediaComments: `GET|POST ${base}/api/v1/media/:id/comments`,
      lore: `GET ${base}/api/v1/lore`,
      loreItem: `GET ${base}/api/v1/lore/:id`,
      wikiCategories: `GET ${base}/api/v1/wiki/categories`,
      wikiArticles: `GET|POST ${base}/api/v1/wiki/articles`,
      wikiArticle: `GET ${base}/api/v1/wiki/articles/:slug`,
      wikiRevisions: `GET ${base}/api/v1/wiki/articles/:slug/revisions`,
      podcastEpisodes: `GET|POST ${base}/api/v1/podcast/episodes`,
      podcastSettings: `GET ${base}/api/v1/podcast/settings`,
      gamesHammer: `GET ${base}/api/v1/games/hammer`,
      gamesNmt: `GET ${base}/api/v1/games/nmt`,
      gamesClicker: `GET ${base}/api/v1/games/podro-clicker`,
      gamesBratTd: `GET ${base}/api/v1/games/brat-td?leaderboard=best_score`,
      og: `GET ${base}/api/v1/og?url=`,
      notifications: `POST ${base}/api/v1/notifications`,
      webhooks: `GET|POST ${base}/api/v1/webhooks`,
      webhookDelete: `DELETE ${base}/api/v1/webhooks/:id`,
      webhookTest: `POST ${base}/api/v1/webhooks/:id/test`,
      slopus: `POST ${base}/api/v1/ai/slopus`,
      adminPendingPosts: `GET ${base}/api/v1/admin/pending-posts`,
      adminModeratePost: `PATCH ${base}/api/v1/admin/posts/:id`,
      adminJoinRequests: `GET ${base}/api/v1/admin/join-requests`,
    },
  });
});

export const OPTIONS = GET;
