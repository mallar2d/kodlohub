export const API_DOC_SECTIONS = [
  {
    id: "intro",
    title: "Вступ",
    content: `KodloHUB API дозволяє ботам, скриптам і стороннім сервісам читати контент сайту та (за дозволом) створювати пости, коментарі та webhooks.

**Важливо:** API ключі не видаються автоматично. Їх може створити лише **owner** або учасник, якому owner надав дозвіл.`,
  },
  {
    id: "auth",
    title: "Автентифікація",
    content: `Усі запити (крім \`/api/v1/health\`) потребують API ключа:

\`\`\`
Authorization: Bearer kh_live_<your_key>
\`\`\`

або

\`\`\`
X-API-Key: kh_live_<your_key>
\`\`\`

Ключ показується **один раз** при створенні — збережи його одразу.`,
  },
  {
    id: "scopes",
    title: "Scopes",
    items: [
      { name: "read", desc: "Читання публічного контенту, пошук, статистика, лідерборди, Slopus AI" },
      { name: "write", desc: "Створення постів, коментарів, сповіщень, webhooks (потрібен service user = твій профіль)" },
      { name: "admin", desc: "Модерація, wiki, подкаст — тільки якщо owner явно дозволив" },
    ],
  },
  {
    id: "rate-limit",
    title: "Rate limit",
    content: `За замовчуванням **60 запитів/хв** на ключ. Owner може змінити ліміт при видачі дозволу.`,
  },
  {
    id: "webhooks",
    title: "Webhooks",
    content: `Підписка (scope \`write\`):

\`\`\`http
POST /api/v1/webhooks
{ "url": "https://your-bot.example/hook", "events": ["post.created", "comment.created"] }
\`\`\`

Події: \`post.created\`, \`post.approved\`, \`comment.created\`, \`media.uploaded\`, \`user.joined\`, \`wiki.updated\`, \`podcast.episode\`

Перевірка підпису: заголовок \`X-KodloHub-Signature: sha256=<hmac>\` (HMAC-SHA256 тіла запиту + secret з відповіді при підписці).`,
  },
] as const;

export const API_DOC_ENDPOINTS = [
  { method: "GET", path: "/api/v1/health", scope: "—", desc: "Статус API (без ключа)" },
  { method: "GET", path: "/api/v1", scope: "read", desc: "Індекс ендпоінтів" },
  { method: "GET", path: "/api/v1/openapi", scope: "—", desc: "OpenAPI JSON" },
  { method: "GET", path: "/api/v1/me", scope: "read", desc: "Інфо про поточний ключ" },
  { method: "GET", path: "/api/v1/stats", scope: "read", desc: "Статистика сайту" },
  { method: "GET", path: "/api/v1/activity", scope: "read", desc: "Стрічка активності" },
  { method: "GET", path: "/api/v1/search?q=", scope: "read", desc: "Глобальний пошук" },
  { method: "GET", path: "/api/v1/posts", scope: "read", desc: "Список постів" },
  { method: "POST", path: "/api/v1/posts", scope: "write", desc: "Створити пост" },
  { method: "GET", path: "/api/v1/posts/:id/comments", scope: "read", desc: "Коментарі поста" },
  { method: "POST", path: "/api/v1/posts/:id/comments", scope: "write", desc: "Додати коментар" },
  { method: "GET", path: "/api/v1/profiles", scope: "read", desc: "Учасники" },
  { method: "GET", path: "/api/v1/profiles/:id/posts", scope: "read", desc: "Пости користувача" },
  { method: "GET", path: "/api/v1/media", scope: "read", desc: "Галерея" },
  { method: "GET", path: "/api/v1/lore", scope: "read", desc: "Артефакти" },
  { method: "GET", path: "/api/v1/wiki/articles", scope: "read", desc: "Кодлопедія" },
  { method: "GET", path: "/api/v1/podcast/episodes", scope: "read", desc: "КодлоCAST" },
  { method: "GET", path: "/api/v1/games/hammer", scope: "read", desc: "Лідерборд молотка" },
  { method: "GET", path: "/api/v1/games/nmt", scope: "read", desc: "Лідерборд NMT" },
  { method: "GET", path: "/api/v1/games/podro-clicker", scope: "read", desc: "Лідерборд клікера" },
  { method: "GET", path: "/api/v1/games/brat-td", scope: "read", desc: "Лідерборд Brat TD" },
  { method: "POST", path: "/api/v1/webhooks", scope: "write", desc: "Підписатися на події" },
  { method: "POST", path: "/api/v1/ai/slopus", scope: "read", desc: "Slopus AI чат" },
  { method: "GET", path: "/api/v1/admin/pending-posts", scope: "admin", desc: "Пости на модерацію" },
  { method: "PATCH", path: "/api/v1/admin/posts/:id", scope: "admin", desc: "Approve / reject" },
] as const;

export const API_DOC_EXAMPLE = `curl -H "Authorization: Bearer kh_live_ВАШ_КЛЮЧ" \\
  "https://kodlo.host/api/v1/search?q=подро"`;
