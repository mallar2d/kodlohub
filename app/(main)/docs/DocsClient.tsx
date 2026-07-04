"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOrigin } from "@/lib/hooks/useOrigin";
import {
  API_GROUPS,
  API_ERROR_CODES,
  WEBHOOK_EVENTS,
  endpointAnchor,
  type DocEndpoint,
  type DocField,
} from "@/lib/api/docs-data";

const GUIDE_SECTIONS = [
  { id: "quickstart", title: "Швидкий старт" },
  { id: "auth", title: "Автентифікація" },
  { id: "scopes", title: "Scopes" },
  { id: "rate-limits", title: "Rate limits" },
  { id: "errors", title: "Помилки" },
  { id: "pagination", title: "Пагінація" },
  { id: "webhooks-guide", title: "Webhooks" },
] as const;

const METHOD_STYLES: Record<DocEndpoint["method"], string> = {
  GET: "text-emerald-400 border-emerald-400/40",
  POST: "text-sky-400 border-sky-400/40",
  PATCH: "text-amber-400 border-amber-400/40",
  DELETE: "text-red-400 border-red-400/40",
};

function sampleValue(field: DocField): unknown {
  if (field.name === "messages") return [{ role: "user", content: "Привіт, Слопус!" }];
  if (field.type === "number") return 1;
  if (field.type === "boolean") return true;
  if (field.type.endsWith("[]")) return ["..."];
  return "...";
}

function curlFor(ep: DocEndpoint, base: string): string {
  const path = ep.path === "/" ? "" : ep.path.replace(/:([A-Za-z_]+)/g, "<$1>");
  const requiredQuery = (ep.query ?? []).filter((f) => f.required);
  const qs = requiredQuery.length
    ? `?${requiredQuery.map((f) => `${f.name}=...`).join("&")}`
    : "";
  const lines = [`curl${ep.method === "GET" ? "" : ` -X ${ep.method}`} "${base}/api/v1${path}${qs}"`];
  if (ep.scope) {
    lines.push(`  -H "Authorization: Bearer kh_live_ВАШ_КЛЮЧ"`);
  }
  if (ep.contentType === "multipart") {
    for (const f of ep.body ?? []) {
      lines.push(f.type === "file" ? `  -F "${f.name}=@./${f.name}.jpg"` : `  -F "${f.name}=..."`);
    }
  } else if (ep.body?.length) {
    lines.push(`  -H "Content-Type: application/json"`);
    const sample = Object.fromEntries(
      ep.body.filter((f) => f.required).map((f) => [f.name, sampleValue(f)])
    );
    lines.push(`  -d '${JSON.stringify(sample)}'`);
  }
  return lines.join(" \\\n");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="micro-cap text-ink-mute hover:text-on-primary transition-colors shrink-0"
    >
      {copied ? "СКОПІЙОВАНО" : "КОПІЮВАТИ"}
    </button>
  );
}

function CodeBlock({ code, copy = true }: { code: string; copy?: boolean }) {
  return (
    <div className="relative bg-canvas-night border border-hairline-dark rounded">
      {copy && (
        <div className="absolute top-2 right-3">
          <CopyButton text={code} />
        </div>
      )}
      <pre className="text-xs text-on-primary-mute p-4 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

function FieldTable({ title, fields }: { title: string; fields: DocField[] }) {
  return (
    <div>
      <p className="micro-cap text-ink-mute mb-2">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[420px]">
          <thead>
            <tr className="border-b border-hairline-dark text-ink-mute micro-cap">
              <th className="py-1.5 pr-4 font-normal">Параметр</th>
              <th className="py-1.5 pr-4 font-normal">Тип</th>
              <th className="py-1.5 font-normal">Опис</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.name} className="border-b border-hairline-dark/40">
                <td className="py-2 pr-4 font-mono text-xs text-on-primary whitespace-nowrap">
                  {f.name}
                  {f.required && <span className="text-red-400 ml-1">*</span>}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-ink-mute whitespace-nowrap">{f.type}</td>
                <td className="py-2 text-on-primary-mute">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ ep, base }: { ep: DocEndpoint; base: string }) {
  return (
    <div
      id={endpointAnchor(ep)}
      className="card-dark p-5 sm:p-6 scroll-mt-28 hover:border-on-primary-mute transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span
          className={`font-mono text-xs font-bold border rounded px-2 py-0.5 ${METHOD_STYLES[ep.method]}`}
        >
          {ep.method}
        </span>
        <code className="font-mono text-sm text-on-primary break-all">/api/v1{ep.path === "/" ? "" : ep.path}</code>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h4 className="text-on-primary font-semibold">{ep.title}</h4>
        <span className="micro-cap text-ink-mute border border-hairline-dark rounded px-1.5 py-0.5">
          {ep.scope ? `scope: ${ep.scope}` : "без ключа"}
        </span>
        {ep.serviceUser && (
          <span className="micro-cap text-ink-mute border border-hairline-dark rounded px-1.5 py-0.5">
            service user
          </span>
        )}
      </div>

      {ep.notes && (
        <ul className="mb-4 space-y-1">
          {ep.notes.map((note) => (
            <li key={note} className="text-sm text-on-primary-mute flex gap-2">
              <span className="text-ink-mute shrink-0">—</span>
              {note}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4">
        {ep.query && ep.query.length > 0 && <FieldTable title="QUERY ПАРАМЕТРИ" fields={ep.query} />}
        {ep.body && ep.body.length > 0 && (
          <FieldTable
            title={ep.contentType === "multipart" ? "ФОРМА (multipart/form-data)" : "ТІЛО ЗАПИТУ (JSON)"}
            fields={ep.body}
          />
        )}

        <div>
          <p className="micro-cap text-ink-mute mb-2">ЗАПИТ</p>
          <CodeBlock code={curlFor(ep, base)} />
        </div>

        {ep.response && (
          <details className="group">
            <summary className="micro-cap text-ink-mute hover:text-on-primary cursor-pointer select-none list-none">
              <span className="group-open:hidden">▸ ПРИКЛАД ВІДПОВІДІ</span>
              <span className="hidden group-open:inline">▾ ПРИКЛАД ВІДПОВІДІ</span>
            </summary>
            <div className="mt-2">
              <CodeBlock code={ep.response} copy={false} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card-dark p-6 sm:p-8 scroll-mt-28">
      <h2 className="heading-sub text-xl sm:text-2xl mb-4">{title}</h2>
      <div className="space-y-4 text-sm text-on-primary-mute leading-relaxed">{children}</div>
    </section>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-on-primary bg-canvas-night border border-hairline-dark/60 px-1.5 py-0.5 rounded text-xs">
      {children}
    </code>
  );
}

export default function DocsClient() {
  const base = useOrigin();
  const [filter, setFilter] = useState("");

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return API_GROUPS;
    return API_GROUPS.map((group) => ({
      ...group,
      endpoints: group.endpoints.filter(
        (ep) =>
          ep.path.toLowerCase().includes(q) ||
          ep.title.toLowerCase().includes(q) ||
          ep.method.toLowerCase() === q
      ),
    })).filter((group) => group.endpoints.length > 0);
  }, [filter]);

  const totalEndpoints = useMemo(
    () => API_GROUPS.reduce((sum, g) => sum + g.endpoints.length, 0),
    []
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">ДОКУМЕНТАЦІЯ</p>
        <h1 className="heading-section mb-4">KODLOHUB API V1</h1>
        <p className="text-on-primary-mute mb-6 max-w-2xl">
          REST API для ботів, скриптів та інтеграцій. Базовий URL:{" "}
          <InlineCode>{base}/api/v1</InlineCode> · {totalEndpoints} ендпоінтів
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/developers" className="btn-ghost text-on-primary">
            ОТРИМАТИ КЛЮЧ
          </Link>
          <a href="/api/v1/openapi" target="_blank" rel="noreferrer" className="btn-ghost text-on-primary">
            OPENAPI JSON
          </a>
          <a href="/api/v1/health" target="_blank" rel="noreferrer" className="btn-ghost text-on-primary">
            СТАТУС
          </a>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
          {/* Sidebar */}
          <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="micro-cap text-ink-mute mb-3">ГАЙД</p>
            <nav className="space-y-1 mb-6">
              {GUIDE_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-on-primary-mute hover:text-on-primary py-0.5 transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <p className="micro-cap text-ink-mute mb-3">ДОВІДНИК</p>
            <nav className="space-y-1">
              {API_GROUPS.map((g) => (
                <a
                  key={g.id}
                  href={`#group-${g.id}`}
                  className="block text-sm text-on-primary-mute hover:text-on-primary py-0.5 transition-colors"
                >
                  {g.title}
                  <span className="text-ink-mute ml-1.5 text-xs">{g.endpoints.length}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Mobile nav */}
          <div className="lg:hidden mb-8 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {[...GUIDE_SECTIONS.map((s) => ({ id: s.id, title: s.title })), ...API_GROUPS.map((g) => ({ id: `group-${g.id}`, title: g.title }))].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="micro-cap text-on-primary-mute border border-hairline-dark rounded px-3 py-1.5 whitespace-nowrap hover:text-on-primary"
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            {/* ГАЙД */}
            <div className="space-y-6 mb-14">
              <GuideSection id="quickstart" title="ШВИДКИЙ СТАРТ">
                <ol className="space-y-3 list-decimal list-inside marker:text-ink-mute">
                  <li>
                    Отримай API ключ на сторінці{" "}
                    <Link href="/developers" className="text-on-primary underline">
                      /developers
                    </Link>
                    . Ключі створює owner або учасник із дозволом.
                  </li>
                  <li>Зроби перший запит:</li>
                </ol>
                <CodeBlock
                  code={`curl "${base}/api/v1/stats" \\\n  -H "Authorization: Bearer kh_live_ВАШ_КЛЮЧ"`}
                />
                <p>Відповідь:</p>
                <CodeBlock
                  copy={false}
                  code={`{\n  "stats": {\n    "profiles": 12,\n    "posts": 34,\n    "media": 156,\n    "lore": 20,\n    "wikiArticles": 45,\n    "podcastEpisodes": 7\n  }\n}`}
                />
              </GuideSection>

              <GuideSection id="auth" title="АВТЕНТИФІКАЦІЯ">
                <p>
                  Усі запити, крім <InlineCode>/api/v1/health</InlineCode> та{" "}
                  <InlineCode>/api/v1/openapi</InlineCode>, потребують API ключа формату{" "}
                  <InlineCode>kh_live_…</InlineCode> в одному з заголовків:
                </p>
                <CodeBlock
                  copy={false}
                  code={`Authorization: Bearer kh_live_ВАШ_КЛЮЧ\n# або\nX-API-Key: kh_live_ВАШ_КЛЮЧ`}
                />
                <p>
                  Ключ показується <strong className="text-on-primary">один раз</strong> при створенні
                  — на сервері зберігається лише його hash. Ключ може мати термін дії та бути
                  відкликаним у будь-який момент.
                </p>
                <p>
                  Для write-операцій (пости, коментарі) ключ повинен мати{" "}
                  <strong className="text-on-primary">service user</strong> — профіль, від імені якого
                  виконуються дії.
                </p>
              </GuideSection>

              <GuideSection id="scopes" title="SCOPES">
                <ul className="space-y-3">
                  <li>
                    <InlineCode>read</InlineCode>{" "}
                    <span className="ml-1">
                      — читання контенту, пошук, статистика, лідерборди, Slopus AI.
                    </span>
                  </li>
                  <li>
                    <InlineCode>write</InlineCode>{" "}
                    <span className="ml-1">
                      — створення і редагування постів, коментарі, сповіщення, webhooks. Потрібен
                      service user.
                    </span>
                  </li>
                  <li>
                    <InlineCode>admin</InlineCode>{" "}
                    <span className="ml-1">
                      — модерація, створення wiki-статей та епізодів подкасту. Видається лише з
                      явного дозволу owner.
                    </span>
                  </li>
                </ul>
              </GuideSection>

              <GuideSection id="rate-limits" title="RATE LIMITS">
                <p>
                  За замовчуванням — <strong className="text-on-primary">60 запитів на хвилину</strong>{" "}
                  на ключ (owner може задати інший ліміт). Кожна відповідь містить заголовки:
                </p>
                <CodeBlock
                  copy={false}
                  code={`X-RateLimit-Limit: 60\nX-RateLimit-Remaining: 58\nX-RateLimit-Reset: 1751630400   # unix-час скидання вікна\nX-Request-Id: 5f0c…              # ID запиту для дебагу`}
                />
                <p>
                  При перевищенні ліміту API повертає <InlineCode>429</InlineCode> з кодом{" "}
                  <InlineCode>rate_limit_exceeded</InlineCode> і заголовком{" "}
                  <InlineCode>Retry-After</InlineCode> (секунди до наступної спроби).
                </p>
              </GuideSection>

              <GuideSection id="errors" title="ПОМИЛКИ">
                <p>Помилки повертаються у форматі:</p>
                <CodeBlock copy={false} code={`{ "error": "Опис помилки", "code": "error_code" }`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[480px]">
                    <thead>
                      <tr className="border-b border-hairline-dark text-ink-mute micro-cap">
                        <th className="py-1.5 pr-4 font-normal">Код</th>
                        <th className="py-1.5 pr-4 font-normal">HTTP</th>
                        <th className="py-1.5 font-normal">Опис</th>
                      </tr>
                    </thead>
                    <tbody>
                      {API_ERROR_CODES.map((e) => (
                        <tr key={e.code} className="border-b border-hairline-dark/40">
                          <td className="py-2 pr-4 font-mono text-xs text-on-primary whitespace-nowrap">
                            {e.code}
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs text-ink-mute">{e.status}</td>
                          <td className="py-2 text-on-primary-mute">{e.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideSection>

              <GuideSection id="pagination" title="ПАГІНАЦІЯ">
                <p>
                  Списки приймають query-параметри <InlineCode>limit</InlineCode> та{" "}
                  <InlineCode>offset</InlineCode> і повертають блок <InlineCode>pagination</InlineCode>:
                </p>
                <CodeBlock
                  copy={false}
                  code={`GET /api/v1/posts?limit=10&offset=20\n\n{\n  "posts": [ … ],\n  "pagination": { "limit": 10, "offset": 20, "total": 34 }\n}`}
                />
                <p>
                  Максимальний <InlineCode>limit</InlineCode> — 50 (для{" "}
                  <InlineCode>/activity</InlineCode> — 100).
                </p>
              </GuideSection>

              <GuideSection id="webhooks-guide" title="WEBHOOKS">
                <p>
                  Webhooks доставляють події сайту на твій сервер у реальному часі. Підписка (scope{" "}
                  <InlineCode>write</InlineCode>):
                </p>
                <CodeBlock
                  code={`curl -X POST "${base}/api/v1/webhooks" \\\n  -H "Authorization: Bearer kh_live_ВАШ_КЛЮЧ" \\\n  -H "Content-Type: application/json" \\\n  -d '{"url":"https://your-bot.example/hook","events":["post.created","comment.created"]}'`}
                />
                <p>Доступні події:</p>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map((e) => (
                    <InlineCode key={e}>{e}</InlineCode>
                  ))}
                </div>
                <p>Кожна доставка — це POST із тілом:</p>
                <CodeBlock
                  copy={false}
                  code={`{\n  "event": "post.created",\n  "timestamp": "2026-07-04T12:00:00.000Z",\n  "data": { … }\n}`}
                />
                <p>
                  Підпис — заголовок <InlineCode>X-KodloHub-Signature: sha256=&lt;hmac&gt;</InlineCode>:
                  HMAC-SHA256 сирого тіла запиту з ключем <InlineCode>secret</InlineCode>, який
                  повертається один раз при підписці. Перевірка на Node.js:
                </p>
                <CodeBlock
                  code={`import { createHmac, timingSafeEqual } from "crypto";\n\nfunction verifySignature(rawBody, header, secret) {\n  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");\n  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));\n}`}
                />
                <p>
                  Перевір інтеграцію тестовою подією:{" "}
                  <InlineCode>POST /api/v1/webhooks/:id/test</InlineCode> — надішле{" "}
                  <InlineCode>test.ping</InlineCode> з валідним підписом.
                </p>
              </GuideSection>
            </div>

            {/* ДОВІДНИК */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <p className="micro-cap text-ink-mute mb-2">ДОВІДНИК</p>
                <h2 className="heading-sub text-2xl sm:text-3xl">ЕНДПОІНТИ</h2>
              </div>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Фільтр: /posts, пошук, GET…"
                className="bg-canvas-night-soft border border-hairline-dark rounded px-3 py-2 text-sm text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute w-full sm:w-72"
              />
            </div>

            {filteredGroups.length === 0 && (
              <p className="text-ink-mute text-sm py-8 text-center">
                Нічого не знайдено за запитом «{filter}».
              </p>
            )}

            <div className="space-y-12">
              {filteredGroups.map((group) => (
                <section key={group.id} id={`group-${group.id}`} className="scroll-mt-28">
                  <h3 className="heading-sub text-lg sm:text-xl mb-1">{group.title.toUpperCase()}</h3>
                  {group.desc && <p className="text-sm text-ink-mute mb-4">{group.desc}</p>}
                  <div className="space-y-4">
                    {group.endpoints.map((ep) => (
                      <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} base={base} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <p className="caption text-ink-mute text-center mt-16">
              Питання чи потрібен ключ?{" "}
              <Link href="/developers" className="text-on-primary-mute hover:text-on-primary underline">
                Сторінка для розробників
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
