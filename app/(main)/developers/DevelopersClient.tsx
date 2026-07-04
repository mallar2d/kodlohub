"use client";

import Link from "next/link";
import ApiKeysPanel from "@/components/admin/ApiKeysPanel";
import {
  API_DOC_ENDPOINTS,
  API_DOC_EXAMPLE,
  API_DOC_SECTIONS,
} from "@/lib/api/docs-content";

export default function DevelopersClient() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[900px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">ДЛЯ РОЗРОБНИКІВ</p>
        <h1 className="heading-section mb-4">KODLOHUB API</h1>
        <p className="text-on-primary-mute mb-10 max-w-2xl">
          REST API для ботів, інтеграцій і автоматизації. Базовий URL:{" "}
          <code className="text-on-primary text-sm">/api/v1</code>
        </p>

        <div className="space-y-10 mb-16">
          {API_DOC_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="card-dark p-6 sm:p-8">
              <h2 className="heading-sub text-2xl sm:text-3xl mb-4">{section.title}</h2>
              {"content" in section && (
                <div className="text-on-primary-mute text-sm leading-relaxed whitespace-pre-wrap prose-invert">
                  {section.content.split(/(`[^`]+`)/g).map((part, i) =>
                    part.startsWith("`") && part.endsWith("`") ? (
                      <code key={i} className="text-on-primary bg-canvas-night px-1 rounded text-xs">
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              )}
              {"items" in section && (
                <ul className="space-y-3 mt-2">
                  {section.items.map((item) => (
                    <li key={item.name} className="text-sm">
                      <code className="text-on-primary bg-canvas-night px-2 py-0.5 rounded text-xs">
                        {item.name}
                      </code>
                      <span className="text-on-primary-mute ml-2">{item.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section id="endpoints" className="card-dark p-6 sm:p-8 overflow-x-auto">
            <h2 className="heading-sub text-2xl sm:text-3xl mb-6">Ендпоінти</h2>
            <table className="w-full text-sm text-left min-w-[520px]">
              <thead>
                <tr className="border-b border-hairline-dark text-ink-mute micro-cap">
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2 pr-4">Scope</th>
                  <th className="py-2">Опис</th>
                </tr>
              </thead>
              <tbody>
                {API_DOC_ENDPOINTS.map((ep) => (
                  <tr key={`${ep.method}-${ep.path}`} className="border-b border-hairline-dark/50">
                    <td className="py-2 pr-4 font-mono text-xs text-on-primary">{ep.method}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-on-primary-mute">{ep.path}</td>
                    <td className="py-2 pr-4 text-xs">{ep.scope}</td>
                    <td className="py-2 text-on-primary-mute">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="caption text-ink-mute mt-4">
              Повний список:{" "}
              <code className="text-on-primary-mute">GET /api/v1</code> · OpenAPI:{" "}
              <a href="/api/v1/openapi" className="text-on-primary underline" target="_blank" rel="noreferrer">
                /api/v1/openapi
              </a>
            </p>
          </section>

          <section id="example" className="card-dark p-6 sm:p-8">
            <h2 className="heading-sub text-2xl sm:text-3xl mb-4">Приклад</h2>
            <pre className="text-xs text-on-primary-mute bg-canvas-night p-4 rounded overflow-x-auto border border-hairline-dark">
              {API_DOC_EXAMPLE}
            </pre>
          </section>
        </div>

        <section id="keys" className="mb-8">
          <h2 className="heading-sub mb-6">КЛЮЧІ ДОСТУПУ</h2>
          <ApiKeysPanel />
        </section>

        <p className="caption text-ink-mute text-center">
          Питання?{" "}
          <Link href="/users" className="text-on-primary-mute hover:text-on-primary">
            Знайди owner у списку учасників
          </Link>
        </p>
      </div>
    </div>
  );
}
