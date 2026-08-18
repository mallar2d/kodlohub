import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import HomeHero from "@/components/home/HomeHero";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: { absolute: "KodloHUB" },
  description:
    "Все, що створило кодло, в одному місці. Ігри, проєкти, devlog, галерея, блог, кодлопедія та артефакти.",
  path: "/",
});

interface Media {
  id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  created_at: string;
}

const getRecentMedia = unstable_cache(
  async (): Promise<Media[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("media")
      .select("id, file_url, file_type, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(9);
    return data || [];
  },
  ["recent-media-9-v1"],
  { revalidate: 60 }
);

const featuredFlagships = [
  {
    title: "Hammer Launcher",
    badge: "Десктопний Клієнт",
    description: "Центральний лаунчер для завантаження, встановлення та автооновлення всіх ігор KodloHUB.",
    href: "/projects/hammer-launcher",
    cta: "ЗАВАНТАЖИТИ",
    tag: "LAUNCHER",
  },
  {
    title: "Brat TD",
    badge: "Tower Defense (Web SPA)",
    description: "Пародійний Tower Defense про Подро, молотки, Nescafe Gold та 1v1 онлайн PvP «Наїзд».",
    href: "/tools/brat-td",
    cta: "ГРАТИ В БРАУЗЕРІ",
    tag: "GAME",
  },
  {
    title: "Half Brat / Arena",
    badge: "Online Deathmatch",
    description: "Мультиплеєрний екшен Kodlo Arena: спарювання акаунта, кімнати, статистика та лідерборд.",
    href: "/tools/kodlo-arena",
    cta: "УВІЙТИ В АРЕНУ",
    tag: "MULTIPLAYER",
  },
  {
    title: "Podro Clicker",
    badge: "Інкрементальна гра",
    description: "Вари Nescafe Gold, наймай помічників, купуй апгрейди та шеметуйся за всесвітню повагу.",
    href: "/tools/podro-clicker",
    cta: "КЛІКАТИ",
    tag: "CLICKER",
  },
];

export default async function HomePage() {
  const recentMedia = await getRecentMedia();

  return (
    <div className="min-h-screen">
      {/* Iconic Hero Section with Scroll Transition */}
      <HomeHero />

      {/* Main Content Sections */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* 2 Key Announcements: Barista Open Source & Kodlorune Cancelled */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-16">
          {/* Banner 1: Barista Games Open Source */}
          <div className="border border-hairline-dark bg-canvas-night-soft/80 backdrop-blur rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all hover:border-white/20 group relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-on-primary font-mono font-semibold uppercase border border-hairline-dark">
                  Open Source
                </span>
                <span className="micro-cap text-ink-mute text-[10px]">MALLARDASK-OPS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-on-primary group-hover:text-white transition-colors mb-3 leading-snug">
                Ігри Barista тепер Open Source
              </h2>
              <p className="text-xs sm:text-sm text-on-primary-mute leading-relaxed mb-6">
                Всі ігри Barista переведено у відкритий вихідний код. У репозиторії також опубліковано одну додаткову неанонсовану гру, яку було скасовано.
              </p>
            </div>
            <div>
              <a
                href="https://github.com/mallardask-ops/barista-games"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-on-primary text-xs w-full sm:w-fit group-hover:border-white/40 inline-flex items-center gap-2"
              >
                <span>РЕПОЗИТОРІЙ GITHUB</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Banner 2: Kodlorune Cancelled */}
          <div className="border border-hairline-dark bg-canvas-night-soft/80 backdrop-blur rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all hover:border-white/20 group relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-on-primary font-mono font-semibold uppercase border border-hairline-dark">
                  Статус
                </span>
                <span className="micro-cap text-ink-mute text-[10px]">KODLORUNE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-on-primary group-hover:text-white transition-colors mb-3 leading-snug">
                Розробка KODLORUNE повністю відмінена
              </h2>
              <p className="text-xs sm:text-sm text-on-primary-mute leading-relaxed mb-6">
                Розробку гри KODLORUNE на даний момент повністю скасовано (відмінено). Роботу над релізом зупинено.
              </p>
            </div>
            <div>
              <Link
                href="/support-ending"
                className="btn-ghost text-on-primary text-xs w-full sm:w-fit group-hover:border-white/40 inline-flex items-center gap-2"
              >
                <span>ДЕТАЛІ В МАНІФЕСТІ</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Flagship Games & Creations Showcase */}
        <section className="pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="micro-cap text-ink-mute mb-1">ФЛАГМАНСЬКІ РЕЛІЗИ</p>
              <h2 className="heading-sub">ГОЛОВНІ ТВОРІННЯ</h2>
            </div>
            <Link
              href="/tools"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              УСІ ТУЛЗИ ТА ІГРИ →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredFlagships.map((item) => (
              <div
                key={item.title}
                className="card-dark p-6 flex flex-col justify-between hover:border-on-primary-mute transition-colors group relative overflow-hidden rounded-2xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="micro-cap px-2 py-0.5 rounded bg-canvas-night-soft border border-hairline-dark text-on-primary text-[10px] font-mono">
                      {item.tag}
                    </span>
                    <span className="text-xs text-ink-mute font-mono">{item.badge}</span>
                  </div>
                  <h3 className="text-2xl font-bold uppercase tracking-wider text-on-primary mb-2 group-hover:text-white transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-on-primary-mute text-sm leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <Link
                  href={item.href}
                  className="btn-ghost text-on-primary text-xs w-full sm:w-fit"
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Unified 9-Item Recent Media Showcase */}
        <section className="pb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="micro-cap text-ink-mute mb-1">МЕДІАТЕКА</p>
              <h2 className="heading-sub">ОСТАННЄ З МЕДІА</h2>
            </div>
            <Link
              href="/archive?tab=media"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              ДИВИТИСЬ ВСЕ →
            </Link>
          </div>

          {recentMedia.length === 0 ? (
            <div className="text-center">
              <EmptyState message="Медіатека поки порожня" className="py-12" />
              <Link href="/upload" className="btn-ghost text-on-primary">
                ЗАВАНТАЖИТИ
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentMedia.map((item) => (
                <Link
                  key={item.id}
                  href="/archive?tab=media"
                  className="group rounded-xl overflow-hidden bg-canvas-night-soft border border-hairline-dark hover:border-on-primary-mute transition-colors block"
                >
                  {item.file_type === "image" ? (
                    <div className="relative w-full h-48 bg-canvas-night">
                      <Image
                        src={item.file_url}
                        alt={item.caption || "Медіа"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                      />
                    </div>
                  ) : item.file_type === "video" ? (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center relative overflow-hidden">
                      <video
                        src={`${item.file_url}#t=0.5`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        preload="metadata"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-10 h-10 rounded-full bg-canvas-night/80 border border-hairline-dark flex items-center justify-center text-on-primary">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : item.file_type === "audio" ? (
                    <div className="w-full h-48 bg-canvas-night flex flex-col items-center justify-center text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-hairline-dark flex items-center justify-center text-on-primary mb-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <p className="micro-cap text-ink-mute text-[10px]">АУДІОЗАПИС</p>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-canvas-night flex items-center justify-center">
                      <p className="micro-cap text-ink-mute text-[10px]">ДОКУМЕНТ</p>
                    </div>
                  )}
                  {item.caption && (
                    <div className="p-3.5 border-t border-hairline-dark">
                      <p className="caption text-on-primary-mute truncate">{item.caption}</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
