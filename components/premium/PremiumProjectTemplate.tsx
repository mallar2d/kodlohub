"use client";

import Link from "next/link";

export interface PremiumProjectMeta {
  slug: string;
  title: string;
  phase: string;
  tag: string;
  logline: string;
  version?: string;
  engine?: string;
  statusText?: string;
}

interface PremiumProjectTemplateProps {
  project: PremiumProjectMeta;
}

export default function PremiumProjectTemplate({ project }: PremiumProjectTemplateProps) {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-[1000px] mx-auto space-y-10">
        {/* Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-hairline-dark">
          <Link
            href="/premium/hub"
            className="btn-ghost !text-xs !py-1.5 !px-3.5 font-mono inline-flex items-center gap-1.5"
          >
            ← ПРЕМІУМ-ХАБ
          </Link>
          <span className="button-cap px-2.5 py-0.5 rounded text-[10px] border border-white/20 bg-white/[0.04] text-white font-mono uppercase tracking-wider">
            {project.tag}
          </span>
        </div>

        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="micro-cap text-[10px] text-ink-mute font-mono tracking-wider uppercase">
              ФАЗА: {project.phase}
            </span>
            {project.version && (
              <>
                <span className="text-ink-mute text-xs">•</span>
                <span className="text-[10px] font-mono text-ink-mute">{project.version}</span>
              </>
            )}
          </div>

          <h1 className="heading-hero text-4xl sm:text-6xl font-black uppercase tracking-tight text-white select-none">
            {project.title}
          </h1>

          <p className="text-ink-mute text-sm sm:text-base max-w-2xl leading-relaxed">
            {project.logline}
          </p>
        </div>

        {/* Section 1: Playable Build / Interactive Demo (Placeholder) */}
        <div className="card-dark p-6 sm:p-8 rounded-3xl border border-hairline-dark bg-canvas-night-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="micro-cap text-[10px] text-ink-mute font-mono uppercase tracking-wider">
                ІНТЕРАКТИВНИЙ БІЛД
              </p>
              <h2 className="text-lg font-bold text-on-primary uppercase tracking-wide">
                Рання версія / Прототип
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-canvas-night border border-hairline-dark text-ink-mute uppercase">
              {project.statusText || "Закрите тестування"}
            </span>
          </div>

          {/* Placeholder Canvas Area */}
          <div className="w-full aspect-video max-h-[380px] rounded-2xl bg-canvas-night border border-hairline-dark flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-canvas-night-soft border border-hairline-dark flex items-center justify-center text-ink-mute">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="text-xs font-mono text-ink-mute max-w-md">
              Інтерактивний білд на стадії підготовки та компіляції. Доступ до запуску зʼявиться тут для підписників Premium.
            </p>
          </div>
        </div>

        {/* 2-Column Grid: Assets & Design Documentation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Dev Materials & Sprites */}
          <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft space-y-4">
            <div className="space-y-1">
              <p className="micro-cap text-[10px] text-ink-mute font-mono uppercase tracking-wider">
                МАТЕРІАЛИ РОЗРОБКИ
              </p>
              <h3 className="text-sm font-bold text-on-primary uppercase tracking-wide">
                Спрайти та вихідні ассети
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-canvas-night border border-hairline-dark text-center space-y-2 py-8">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mx-auto text-ink-mute">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-xs font-mono text-ink-mute">
                Вихідні спрайти, концепт-арти та дизайн-паки будуть додані найближчим часом.
              </p>
            </div>
          </div>

          {/* Column B: Design Documents & Lore */}
          <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft space-y-4">
            <div className="space-y-1">
              <p className="micro-cap text-[10px] text-ink-mute font-mono uppercase tracking-wider">
                ДОКУМЕНТАЦІЯ ТА ЛОР
              </p>
              <h3 className="text-sm font-bold text-on-primary uppercase tracking-wide">
                Дизайн-документи та механіки
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-canvas-night border border-hairline-dark text-center space-y-2 py-8">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="mx-auto text-ink-mute">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p className="text-xs font-mono text-ink-mute">
                Опис механік, баланс, сюжетні чернетки та дизайн-документи готуються до релізу.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Devlog & Changelog */}
        <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft space-y-4">
          <div className="flex items-center justify-between">
            <p className="micro-cap text-[10px] text-ink-mute font-mono uppercase tracking-wider">
              ЖУРНАЛ РОЗРОБКИ (DEVLOG)
            </p>
            <span className="text-[10px] font-mono text-ink-mute">ОНОВЛЮЄТЬСЯ</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-canvas-night border border-hairline-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">v0.1.0-alpha</span>
                  <span className="text-[10px] font-mono text-ink-mute">• Ініціалізація розділу</span>
                </div>
                <p className="text-xs text-ink-mute">
                  Створення преміум-сторінки проєкту та підготовка структури для завантаження матеріалів.
                </p>
              </div>
              <span className="text-[10px] font-mono text-ink-mute shrink-0">Сьогодні</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
