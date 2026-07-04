"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ApiKeysPanel from "@/components/admin/ApiKeysPanel";
import { useOrigin } from "@/lib/hooks/useOrigin";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative bg-canvas-night border border-hairline-dark rounded">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          });
        }}
        className="absolute top-2 right-3 micro-cap text-ink-mute hover:text-on-primary transition-colors"
      >
        {copied ? "СКОПІЙОВАНО" : "КОПІЮВАТИ"}
      </button>
      <pre className="text-xs text-on-primary-mute p-4 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

export default function DevelopersClient() {
  const base = useOrigin();
  const [apiStatus, setApiStatus] = useState<"ok" | "down" | "loading">("loading");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => setApiStatus(res.ok ? "ok" : "down"))
      .catch(() => setApiStatus("down"));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1000px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">ДЛЯ РОЗРОБНИКІВ</p>
        <h1 className="heading-section mb-4">KODLOHUB API</h1>
        <p className="text-on-primary-mute mb-8 max-w-2xl">
          REST API для ботів, скриптів і сторонніх сервісів: пости, коментарі, пошук, лідерборди,
          Slopus AI та webhooks. Базовий URL:{" "}
          <code className="text-on-primary text-sm">{base}/api/v1</code>
        </p>

        {/* Швидкі посилання */}
        <div className="grid sm:grid-cols-3 gap-4 mb-14">
          <Link
            href="/docs"
            className="card-dark p-5 hover:border-on-primary-mute transition-colors block"
          >
            <p className="micro-cap text-ink-mute mb-2">ДОКУМЕНТАЦІЯ</p>
            <p className="text-on-primary font-semibold mb-1">/docs</p>
            <p className="caption text-ink-mute">
              Повний довідник ендпоінтів, автентифікація, webhooks, помилки.
            </p>
          </Link>
          <a
            href="/api/v1/openapi"
            target="_blank"
            rel="noreferrer"
            className="card-dark p-5 hover:border-on-primary-mute transition-colors block"
          >
            <p className="micro-cap text-ink-mute mb-2">OPENAPI 3.0</p>
            <p className="text-on-primary font-semibold mb-1">/api/v1/openapi</p>
            <p className="caption text-ink-mute">
              JSON-специфікація для Postman, Insomnia чи Swagger UI.
            </p>
          </a>
          <a
            href="/api/v1/health"
            target="_blank"
            rel="noreferrer"
            className="card-dark p-5 hover:border-on-primary-mute transition-colors block"
          >
            <p className="micro-cap text-ink-mute mb-2">СТАТУС API</p>
            <p className="text-on-primary font-semibold mb-1 flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  apiStatus === "ok"
                    ? "bg-emerald-400"
                    : apiStatus === "down"
                      ? "bg-red-400"
                      : "bg-ink-mute animate-pulse"
                }`}
              />
              {apiStatus === "ok" ? "ONLINE" : apiStatus === "down" ? "OFFLINE" : "…"}
            </p>
            <p className="caption text-ink-mute">/api/v1/health — без ключа.</p>
          </a>
        </div>

        {/* Швидкий старт */}
        <section className="mb-14">
          <p className="micro-cap text-ink-mute mb-2">ЯК ПОЧАТИ</p>
          <h2 className="heading-sub mb-6">ШВИДКИЙ СТАРТ</h2>

          <div className="space-y-4">
            <div className="card-dark p-5 sm:p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-ink-mute text-sm">01</span>
                <h3 className="text-on-primary font-semibold">Створи API ключ</h3>
              </div>
              <p className="text-sm text-on-primary-mute">
                У панелі «Ключі доступу» нижче. Ключі створює <strong className="text-on-primary">owner</strong>{" "}
                або учасник, якому owner надав дозвіл. Ключ показується один раз — збережи його
                одразу.
              </p>
            </div>

            <div className="card-dark p-5 sm:p-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-mono text-ink-mute text-sm">02</span>
                <h3 className="text-on-primary font-semibold">Зроби перший запит</h3>
              </div>
              <CodeBlock
                code={`curl "${base}/api/v1/stats" \\\n  -H "Authorization: Bearer kh_live_ВАШ_КЛЮЧ"`}
              />
            </div>

            <div className="card-dark p-5 sm:p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-mono text-ink-mute text-sm">03</span>
                <h3 className="text-on-primary font-semibold">Читай документацію</h3>
              </div>
              <p className="text-sm text-on-primary-mute mb-4">
                Всі ендпоінти з параметрами, прикладами запитів і відповідей, scopes, rate limits та
                webhooks — на сторінці документації.
              </p>
              <Link href="/docs" className="btn-ghost text-on-primary">
                ВІДКРИТИ /DOCS
              </Link>
            </div>
          </div>
        </section>

        {/* Ключі */}
        <section id="keys" className="mb-8 scroll-mt-28">
          <p className="micro-cap text-ink-mute mb-2">УПРАВЛІННЯ</p>
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
