import { WEBHOOK_EVENTS } from "@/lib/api/types";

export const API_BASE_PATH = "/api/v1";

export type DocMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type DocScope = "read" | "write" | "admin" | null;

export interface DocField {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
}

export interface DocEndpoint {
  method: DocMethod;
  path: string;
  title: string;
  scope: DocScope;
  serviceUser?: boolean;
  query?: DocField[];
  body?: DocField[];
  response?: string;
  notes?: string[];
}

export interface DocGroup {
  id: string;
  title: string;
  desc?: string;
  endpoints: DocEndpoint[];
}

export const API_ERROR_CODES = [
  { code: "invalid_api_key", status: 401, desc: "Ключ відсутній, має неправильний формат або не існує" },
  { code: "revoked_api_key", status: 401, desc: "Ключ відкликано" },
  { code: "expired_api_key", status: 401, desc: "Термін дії ключа минув" },
  { code: "insufficient_scope", status: 403, desc: "Ключ не має потрібного scope" },
  { code: "forbidden", status: 403, desc: "Дія недоступна для цього ключа (наприклад, чужий пост)" },
  { code: "missing_service_user", status: 400, desc: "Для write-операції ключ повинен мати service user" },
  { code: "not_found", status: 404, desc: "Ресурс не знайдено" },
  { code: "rate_limit_exceeded", status: 429, desc: "Перевищено ліміт запитів — дивись заголовок Retry-After" },
  { code: "internal_error", status: 500, desc: "Внутрішня помилка сервера" },
] as const;

export { WEBHOOK_EVENTS };

const paginationFields: DocField[] = [
  { name: "limit", type: "number", desc: "Кількість елементів (макс. 50)" },
  { name: "offset", type: "number", desc: "Зсув для пагінації (за замовчуванням 0)" },
];

export const API_GROUPS: DocGroup[] = [
  {
    id: "system",
    title: "Система",
    desc: "Службові ендпоінти: статус, індекс, інформація про ключ.",
    endpoints: [
      {
        method: "GET",
        path: "/health",
        title: "Статус API",
        scope: null,
        response: `{
  "status": "ok",
  "service": "KodloHUB API",
  "version": "v1",
  "timestamp": "2026-07-04T12:00:00.000Z"
}`,
      },
      {
        method: "GET",
        path: "/",
        title: "Індекс API",
        scope: "read",
        notes: ["Повертає повний список ендпоінтів, scopes та webhook-подій у JSON."],
      },
      {
        method: "GET",
        path: "/openapi",
        title: "OpenAPI 3.0 специфікація",
        scope: null,
        notes: ["Можна імпортувати в Postman, Insomnia, Swagger UI тощо."],
      },
      {
        method: "GET",
        path: "/me",
        title: "Поточний ключ",
        scope: "read",
        response: `{
  "key": {
    "id": "…",
    "name": "my-bot",
    "prefix": "kh_live_AbCdEfGh",
    "scopes": ["read", "write"],
    "rateLimitPerMinute": 60,
    "serviceUserId": "…",
    "lastUsedAt": "2026-07-04T11:58:00.000Z",
    "expiresAt": null,
    "createdAt": "2026-07-01T09:00:00.000Z"
  }
}`,
      },
    ],
  },
  {
    id: "site",
    title: "Сайт",
    desc: "Статистика, активність, пошук і Open Graph дані.",
    endpoints: [
      {
        method: "GET",
        path: "/stats",
        title: "Статистика сайту",
        scope: "read",
        response: `{
  "stats": {
    "profiles": 12,
    "posts": 34,
    "media": 156,
    "lore": 20,
    "wikiArticles": 45,
    "podcastEpisodes": 7
  }
}`,
      },
      {
        method: "GET",
        path: "/activity",
        title: "Стрічка активності",
        scope: "read",
        query: [
          { name: "limit", type: "number", desc: "Кількість записів (за замовчуванням 30, макс. 100)" },
          { name: "offset", type: "number", desc: "Зсув для пагінації" },
        ],
        response: `{
  "activity": [
    {
      "id": "…",
      "user_id": "…",
      "action": "post_created",
      "entity_type": "post",
      "entity_id": "…",
      "details": { "title": "…", "via": "api" },
      "created_at": "…",
      "profiles": { "display_name": "Подро", "username": "podro" }
    }
  ],
  "pagination": { "limit": 30, "offset": 0, "total": 128 }
}`,
      },
      {
        method: "GET",
        path: "/search",
        title: "Глобальний пошук",
        scope: "read",
        query: [{ name: "q", type: "string", required: true, desc: "Пошуковий запит (мінімум 2 символи)" }],
        response: `{
  "results": {
    "posts": [ … ],
    "media": [ … ],
    "lore": [ … ],
    "wiki": [ … ]
  }
}`,
        notes: ["До 10 результатів на кожну категорію."],
      },
      {
        method: "GET",
        path: "/og",
        title: "Open Graph дані сторінки",
        scope: "read",
        query: [{ name: "url", type: "string", required: true, desc: "URL або шлях сторінки сайту" }],
        notes: ["Підтримує /blog/:id, /profile/:id та /wiki/:category/:slug."],
        response: `{
  "og": {
    "title": "…",
    "description": "…",
    "url": "https://kodlo.host/blog/…",
    "type": "article"
  }
}`,
      },
    ],
  },
  {
    id: "posts",
    title: "Пости",
    desc: "Блог: читання, створення, редагування та коментарі.",
    endpoints: [
      {
        method: "GET",
        path: "/posts",
        title: "Список постів",
        scope: "read",
        query: [...paginationFields, { name: "tag", type: "string", desc: "Фільтр за тегом" }],
        response: `{
  "posts": [
    {
      "id": "…",
      "title": "…",
      "content": "…",
      "tags": ["подро"],
      "status": "approved",
      "created_at": "…",
      "updated_at": "…",
      "profiles": { "display_name": "…", "username": "…", "avatar_url": "…" }
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 34 }
}`,
      },
      {
        method: "POST",
        path: "/posts",
        title: "Створити пост",
        scope: "write",
        serviceUser: true,
        body: [
          { name: "title", type: "string", required: true, desc: "Заголовок" },
          { name: "content", type: "string", required: true, desc: "Текст поста (markdown)" },
          { name: "tags", type: "string[]", desc: "Теги" },
          { name: "auto_approve", type: "boolean", desc: "Одразу опублікувати (потрібен scope admin)" },
        ],
        response: `{
  "post": { "id": "…", "title": "…", "status": "approved", … },
  "status": "approved"
}`,
        notes: [
          "Якщо роль service user — shemetovany, пост іде на модерацію (status: pending, максимум 3 в черзі).",
          "Тригерить webhook post.created (і post.approved, якщо опубліковано одразу).",
        ],
      },
      {
        method: "GET",
        path: "/posts/:id",
        title: "Отримати пост",
        scope: "read",
        notes: ["Повертає лише опубліковані (approved) пости."],
      },
      {
        method: "PATCH",
        path: "/posts/:id",
        title: "Редагувати свій пост",
        scope: "write",
        serviceUser: true,
        body: [
          { name: "title", type: "string", desc: "Новий заголовок" },
          { name: "content", type: "string", desc: "Новий текст" },
          { name: "tags", type: "string[]", desc: "Нові теги" },
        ],
        response: `{ "post": { … } }`,
        notes: ["Потрібне хоча б одне поле.", "Редагувати можна лише пости, автором яких є service user ключа."],
      },
      {
        method: "DELETE",
        path: "/posts/:id",
        title: "Видалити свій пост",
        scope: "write",
        serviceUser: true,
        response: `{ "success": true }`,
        notes: ["Видаляти можна лише пости, автором яких є service user ключа."],
      },
      {
        method: "GET",
        path: "/posts/:id/comments",
        title: "Коментарі поста",
        scope: "read",
        response: `{ "comments": [ { "id": "…", "content": "…", "created_at": "…", "profiles": { … } } ] }`,
      },
      {
        method: "POST",
        path: "/posts/:id/comments",
        title: "Додати коментар",
        scope: "write",
        serviceUser: true,
        body: [{ name: "content", type: "string", required: true, desc: "Текст коментаря" }],
        response: `{ "comment": { … } }`,
        notes: ["Тригерить webhook comment.created."],
      },
    ],
  },
  {
    id: "profiles",
    title: "Профілі",
    desc: "Учасники кодла.",
    endpoints: [
      {
        method: "GET",
        path: "/profiles",
        title: "Список учасників",
        scope: "read",
        query: [
          ...paginationFields,
          { name: "role", type: "string", desc: "Фільтр за роллю: owner, podrofikovany, kodlo, shemetovany" },
        ],
        response: `{
  "profiles": [
    { "id": "…", "username": "…", "display_name": "…", "avatar_url": "…", "bio": "…", "role": "kodlo", "created_at": "…" }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 12 }
}`,
      },
      { method: "GET", path: "/profiles/:id", title: "Отримати профіль", scope: "read" },
      {
        method: "GET",
        path: "/profiles/:id/posts",
        title: "Пости користувача",
        scope: "read",
        query: paginationFields,
      },
      {
        method: "GET",
        path: "/profiles/:id/media",
        title: "Медіа користувача",
        scope: "read",
        query: paginationFields,
      },
    ],
  },
  {
    id: "media",
    title: "Медіа",
    desc: "Галерея: зображення, відео, документи.",
    endpoints: [
      {
        method: "GET",
        path: "/media",
        title: "Список медіа",
        scope: "read",
        query: [
          ...paginationFields,
          { name: "type", type: "string", desc: "Фільтр за типом: image, video, document, audio" },
        ],
        response: `{
  "media": [
    { "id": "…", "file_url": "…", "file_type": "image", "caption": "…", "created_at": "…", "profiles": { … } }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 156 }
}`,
      },
      { method: "GET", path: "/media/:id", title: "Отримати медіафайл", scope: "read" },
      {
        method: "GET",
        path: "/media/:id/comments",
        title: "Коментарі медіа",
        scope: "read",
      },
      {
        method: "POST",
        path: "/media/:id/comments",
        title: "Додати коментар до медіа",
        scope: "write",
        serviceUser: true,
        body: [{ name: "content", type: "string", required: true, desc: "Текст коментаря" }],
        notes: ["Тригерить webhook comment.created."],
      },
    ],
  },
  {
    id: "lore",
    title: "Артефакти",
    desc: "Лор-предмети кодла.",
    endpoints: [
      {
        method: "GET",
        path: "/lore",
        title: "Список артефактів",
        scope: "read",
        query: [...paginationFields, { name: "category", type: "string", desc: "Фільтр за категорією" }],
      },
      {
        method: "GET",
        path: "/lore/:id",
        title: "Отримати артефакт",
        scope: "read",
        notes: ["Включає прикріплений медіафайл (media), якщо є."],
      },
    ],
  },
  {
    id: "wiki",
    title: "Кодлопедія",
    desc: "Wiki-статті та категорії.",
    endpoints: [
      { method: "GET", path: "/wiki/categories", title: "Категорії", scope: "read" },
      {
        method: "GET",
        path: "/wiki/articles",
        title: "Список статей",
        scope: "read",
        query: [...paginationFields, { name: "category", type: "string", desc: "Slug категорії" }],
      },
      {
        method: "POST",
        path: "/wiki/articles",
        title: "Створити статтю",
        scope: "admin",
        serviceUser: true,
        body: [
          { name: "title", type: "string", required: true, desc: "Назва статті" },
          { name: "content", type: "string", required: true, desc: "Вміст (markdown)" },
          { name: "slug", type: "string", desc: "URL-slug (генерується з назви, якщо не вказано)" },
          { name: "category_id", type: "string", desc: "ID категорії" },
          { name: "edit_comment", type: "string", desc: "Коментар до ревізії" },
        ],
        notes: ["Тригерить webhook wiki.updated."],
      },
      {
        method: "GET",
        path: "/wiki/articles/:slug",
        title: "Отримати статтю",
        scope: "read",
        notes: ["Кожен запит збільшує лічильник переглядів статті."],
      },
      {
        method: "GET",
        path: "/wiki/articles/:slug/revisions",
        title: "Історія ревізій",
        scope: "read",
      },
    ],
  },
  {
    id: "podcast",
    title: "КодлоCAST",
    desc: "Епізоди подкасту.",
    endpoints: [
      {
        method: "GET",
        path: "/podcast/episodes",
        title: "Список епізодів",
        scope: "read",
        query: paginationFields,
      },
      {
        method: "POST",
        path: "/podcast/episodes",
        title: "Створити епізод",
        scope: "admin",
        serviceUser: true,
        body: [
          { name: "title", type: "string", required: true, desc: "Назва епізоду" },
          { name: "audio_url", type: "string", required: true, desc: "URL аудіофайлу" },
          { name: "episode_number", type: "number", required: true, desc: "Номер епізоду" },
          { name: "description", type: "string", desc: "Опис" },
          { name: "duration", type: "number", desc: "Тривалість у секундах" },
          { name: "is_published", type: "boolean", desc: "Опублікувати одразу (за замовчуванням true)" },
        ],
        notes: ["Тригерить webhook podcast.episode."],
      },
      { method: "GET", path: "/podcast/settings", title: "Налаштування подкасту", scope: "read" },
    ],
  },
  {
    id: "games",
    title: "Ігри",
    desc: "Лідерборди ігор KodloHUB.",
    endpoints: [
      {
        method: "GET",
        path: "/games/hammer",
        title: "Молоток",
        scope: "read",
        response: `{
  "totalHits": 12345,
  "totalHitters": 9,
  "leaderboard": [
    { "user_id": "…", "count": 500, "username": "…", "display_name": "…", "avatar_url": "…" }
  ]
}`,
        notes: ["Топ-10 за кількістю ударів."],
      },
      {
        method: "GET",
        path: "/games/nmt",
        title: "НМТ",
        scope: "read",
        notes: ["Топ-50 за балами, при рівності — за часом проходження."],
      },
      {
        method: "GET",
        path: "/games/podro-clicker",
        title: "Podro Clicker",
        scope: "read",
        notes: ["Топ-20 за career_grams."],
      },
      {
        method: "GET",
        path: "/games/brat-td",
        title: "Brat TD",
        scope: "read",
        query: [
          {
            name: "leaderboard",
            type: "string",
            desc: "Тип лідерборду: best_score (за замовчуванням), normal_wave, hard_wave, endless_wave, fastest_victory",
          },
        ],
        response: `{ "leaderboard": [ … ], "kind": "best_score" }`,
      },
    ],
  },
  {
    id: "ai",
    title: "Slopus AI",
    desc: "Чат зі Слопусом — AI-агентом кодла.",
    endpoints: [
      {
        method: "POST",
        path: "/ai/slopus",
        title: "Чат зі Слопусом",
        scope: "read",
        body: [
          {
            name: "messages",
            type: "object[]",
            required: true,
            desc: 'Історія повідомлень: [{ "role": "user", "content": "…" }]',
          },
        ],
        notes: ["Відповідь стрімиться як text/plain, а не JSON.", "Слопус знає контекст сайту: статті, профілі, пости, медіа."],
      },
    ],
  },
  {
    id: "notifications",
    title: "Сповіщення",
    desc: "Надсилання сповіщень користувачам сайту.",
    endpoints: [
      {
        method: "POST",
        path: "/notifications",
        title: "Надіслати сповіщення",
        scope: "write",
        body: [
          { name: "user_id", type: "string", required: true, desc: "ID користувача-отримувача" },
          { name: "title", type: "string", required: true, desc: "Заголовок" },
          { name: "message", type: "string", required: true, desc: "Текст сповіщення" },
          { name: "link", type: "string", desc: "Посилання (шлях на сайті)" },
          { name: "type", type: "string", desc: "Тип: system (за замовчуванням), comment, post_approved, post_rejected, role_changed, post_deleted" },
        ],
        response: `{ "success": true }`,
      },
    ],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    desc: "Підписка на події сайту в реальному часі.",
    endpoints: [
      {
        method: "GET",
        path: "/webhooks",
        title: "Мої підписки",
        scope: "read",
        response: `{ "webhooks": [ { "id": "…", "url": "…", "events": ["post.created"], "active": true, "created_at": "…" } ] }`,
        notes: ["Повертає підписки лише поточного ключа."],
      },
      {
        method: "POST",
        path: "/webhooks",
        title: "Підписатися на події",
        scope: "write",
        body: [
          { name: "url", type: "string", required: true, desc: "HTTPS URL твого сервера" },
          { name: "events", type: "string[]", required: true, desc: `Події: ${WEBHOOK_EVENTS.join(", ")}` },
        ],
        response: `{
  "webhook": { "id": "…", "url": "…", "events": [ … ], "active": true },
  "secret": "…",
  "warning": "Save the secret for verifying X-KodloHub-Signature headers."
}`,
        notes: ["Secret показується один раз — збережи його для перевірки підписів."],
      },
      {
        method: "POST",
        path: "/webhooks/:id/test",
        title: "Тестова доставка",
        scope: "write",
        response: `{ "delivered": true, "status": 200, "event": "test.ping" }`,
        notes: ["Надсилає подію test.ping на URL підписки з валідним підписом — зручно для перевірки інтеграції."],
      },
      {
        method: "DELETE",
        path: "/webhooks/:id",
        title: "Відписатися",
        scope: "write",
        response: `{ "success": true, "webhook": { "id": "…", "active": false } }`,
      },
    ],
  },
  {
    id: "admin",
    title: "Модерація",
    desc: "Адмін-операції. Scope admin видається лише з явного дозволу owner.",
    endpoints: [
      {
        method: "GET",
        path: "/admin/pending-posts",
        title: "Пости на модерації",
        scope: "admin",
      },
      {
        method: "PATCH",
        path: "/admin/posts/:id",
        title: "Схвалити / відхилити пост",
        scope: "admin",
        body: [{ name: "status", type: "string", required: true, desc: '"approved" або "rejected"' }],
        notes: ["Автор поста отримує сповіщення про рішення.", "При схваленні тригериться webhook post.approved."],
      },
      {
        method: "GET",
        path: "/admin/join-requests",
        title: "Заявки на вступ",
        scope: "admin",
      },
    ],
  },
];

export function endpointAnchor(ep: DocEndpoint): string {
  const pathPart = ep.path === "/" ? "index" : ep.path.replace(/[/:]+/g, "-").replace(/^-|-$/g, "");
  return `${ep.method.toLowerCase()}-${pathPart}`;
}
