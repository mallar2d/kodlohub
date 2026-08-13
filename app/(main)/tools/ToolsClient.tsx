"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";

type ToolCategory = "all" | "games" | "utilities" | "fun";

interface ToolItem {
  id: string;
  name: string;
  category: ToolCategory;
  categoryLabel: string;
  badge: string;
  description: string;
  href: string;
  ctaText: string;
  icon: ReactNode;
  highlight?: boolean;
}

const TOOLS_DATA: ToolItem[] = [
  {
    id: "kava",
    name: "KAVA HUB (22:00)",
    category: "utilities",
    categoryLabel: "ЕКОНОМІКА / БОТ",
    badge: "Telegram Sync & Balance",
    description: "Підключи свій Telegram від @podroid_bot. Клейми каву о 22:00, отримуй бонуси, роби депи, переказуй ☕ друзям та дивись лідерборд.",
    href: "/tools/kava",
    ctaText: "ВІДКРИТИ KAVA HUB",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    highlight: true,
  },
  {
    id: "brat-td",
    name: "BRAT TD",
    category: "games",
    categoryLabel: "ІГРА",
    badge: "Tower Defense (Web SPA)",
    description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та онлайн 1v1 PvP «Наїзд». Збереження прогресу в хмарі.",
    href: "/tools/brat-td",
    ctaText: "ГРАТИ В БРАУЗЕРІ",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    highlight: true,
  },
  {
    id: "kodlo-arena",
    name: "HALF BRAT (ARENA)",
    category: "games",
    categoryLabel: "ІГРА",
    badge: "Online Deathmatch",
    description: "Мультиплеєрний екшен Kodlo Arena. Спарювання акаунта, статистика, кімнати та лідерборд.",
    href: "/tools/kodlo-arena",
    ctaText: "УВІЙТИ В АРЕНУ",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    ),
    highlight: true,
  },
  {
    id: "hammer",
    name: "МОЛОТОК",
    category: "utilities",
    categoryLabel: "УТИЛІТА / ЛАУНЧЕР",
    badge: "Global Cooldown & Launcher",
    description: "Раз на годину — БАБАХ! Глобальний лідерборд найсильніших ударів та завантаження клієнта Hammer Launcher.",
    href: "/tools/hammer",
    ctaText: "ВДАРИТИ / ЛАУНЧЕР",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
        <path d="m18 15 4-4" />
        <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
      </svg>
    ),
    highlight: true,
  },
  {
    id: "podro-clicker",
    name: "ПОДРО-КЛІКЕР",
    category: "games",
    categoryLabel: "ІГРА",
    badge: "Clicker / Prestige",
    description: "Вари Nescafe Gold, наймай помічників, купуй апгрейди і шеметуйся заради поваги та глобального рейтингу.",
    href: "/tools/podro-clicker",
    ctaText: "ВАРИТИ КАВУ",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    id: "podro-nmt",
    name: "ПОДРО-НМТ",
    category: "games",
    categoryLabel: "ТЕСТУВАННЯ",
    badge: "Офіційний тест",
    description: "Національний мультипредметний тест про легенду ФІКТ. 40 питань, сувора система перевірки та одна офіційна спроба.",
    href: "/tools/podro-nmt",
    ctaText: "СКЛАСТИ НМТ",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "audio-combiner",
    name: "PDRLIFY",
    category: "utilities",
    categoryLabel: "УТИЛІТА",
    badge: "Audio FX Engine",
    description: "Додай легендарний PDR звук до будь-якого аудіофайлу з налаштовуваною затримкою та гучністю.",
    href: "/tools/audio-combiner",
    ctaText: "ОБРОБИТИ ЗВУК",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
  {
    id: "magic-8ball",
    name: "PODRO-BALL",
    category: "fun",
    categoryLabel: "ФАН",
    badge: "Oracle & Wisdom",
    description: "Магічна куля кодловських відповідей. Запитай долю і потряси пристрій.",
    href: "/tools/magic-8ball",
    ctaText: "СПИТАТИ КУЛЮ",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
      </svg>
    ),
  },
  {
    id: "spintrick",
    name: "SPINTRICK",
    category: "fun",
    categoryLabel: "ФАН",
    badge: "Mobile Gyro Game",
    description: "Обертай телефон — отримуй окуляри. Набирай комбо за неперервні обертання в одному напрямку.",
    href: "/tools/spintrick",
    ctaText: "КРУТИТИ ТЕЛЕФОН",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
      </svg>
    ),
  },
];

const CATEGORIES: { key: ToolCategory; label: string }[] = [
  { key: "all", label: "УСЕ" },
  { key: "games", label: "ІГРИ" },
  { key: "utilities", label: "ІНСТРУМЕНТИ" },
  { key: "fun", label: "ФАНОВІ" },
];

export default function ToolsClient() {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>("all");
  const [search, setSearch] = useState("");

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    return TOOLS_DATA.filter((tool) => {
      const matchesCategory =
        selectedCategory === "all" || tool.category === selectedCategory;
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.badge.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  return (
    <div className="space-y-10">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`button-cap px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                selectedCategory === cat.key
                  ? "bg-on-primary text-ink font-bold"
                  : "text-on-primary-mute hover:text-on-primary hover:bg-canvas-night"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Фільтр тулзів..."
            className="w-full px-3.5 py-2 text-xs rounded-lg bg-canvas-night border border-hairline-dark text-on-primary placeholder:text-ink-mute focus:outline-none focus:border-on-primary-mute transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-mute hover:text-on-primary cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            className={`card-dark p-6 flex flex-col justify-between hover:border-on-primary-mute transition-all group ${
              tool.highlight ? "bg-canvas-night-soft/30 border-hairline-dark" : ""
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="p-2.5 rounded-lg bg-canvas-night-soft border border-hairline-dark text-on-primary group-hover:border-on-primary-mute transition-colors">
                  {tool.icon}
                </div>
                <span className="micro-cap px-2 py-0.5 rounded border border-hairline-dark bg-canvas-night text-[10px] text-ink-mute font-mono">
                  {tool.categoryLabel}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-xs text-cyan-400 font-mono block mb-1">
                  {tool.badge}
                </span>
                <h3 className="heading-sub !text-2xl font-bold uppercase tracking-wide text-on-primary group-hover:text-cyan-300 transition-colors">
                  {tool.name}
                </h3>
              </div>

              <p className="text-on-primary-mute text-sm leading-relaxed mb-6">
                {tool.description}
              </p>
            </div>

            <div className="pt-4 border-t border-hairline-dark">
              <Link
                href={tool.href}
                className="btn-ghost text-on-primary text-xs w-full justify-center !py-3"
              >
                {tool.ctaText} →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16 border border-hairline-dark rounded-xl bg-canvas-night-soft/40">
          <p className="text-lg font-bold text-on-primary mb-1">Нічого не знайдено</p>
          <p className="text-sm text-ink-mute">Спробуйте змінити категорію або пошуковий запит.</p>
        </div>
      )}
    </div>
  );
}
