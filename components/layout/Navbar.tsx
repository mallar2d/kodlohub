"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import NotificationsBell from "@/components/ui/NotificationsBell";
import SearchBar from "@/components/ui/SearchBar";
import Avatar from "@/components/ui/Avatar";

const navLinks = [
  { href: "/projects", label: "ПРОЄКТИ" },
  { href: "/archive", label: "АРХІВ", match: ["/archive", "/gallery", "/blog", "/lore", "/cast"] },
  { href: "/wiki", label: "КОДЛОПЕДІЯ" },
  { href: "/tools", label: "ТУЛЗИ" },
];

const externalMenuLinks = [
  {
    href: "https://soundcloud.com/zt-barista",
    label: "BARISTA",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, supabase } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const cachedRole =
      typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (cachedRole) setUserRole(cachedRole);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }
    const fetchRole = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profile?.role || null;
      setUserRole(role);
      if (role) localStorage.setItem("userRole", role);
    };
    fetchRole();
  }, [user, supabase]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-user-menu]")) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [userMenuOpen]);

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = pathname === "/";
  const logoOpacity = isHome ? Math.min(Math.max((scrollY - 60) / 100, 0), 1) : 1;
  const logoTranslateX = isHome ? `${(1 - logoOpacity) * -8}px` : "0px";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas-night/85 backdrop-blur-md border-b border-hairline-dark">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5 relative">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary group transition-all duration-200"
              style={{
                opacity: logoOpacity,
                transform: `translateX(${logoTranslateX})`,
                pointerEvents: isHome && logoOpacity < 0.2 ? "none" : "auto",
              }}
            >
              <span>KodloHUB</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-on-primary/10 border border-hairline-dark text-on-primary-mute font-mono tracking-normal">
                2.0
              </span>
            </Link>
          </div>

          {/* Center: Centered Nav Links */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const isActive = link.match
                ? link.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`button-cap transition-all py-1.5 px-3.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-on-primary text-ink font-bold shadow-sm"
                      : "text-on-primary-mute hover:text-on-primary hover:bg-white/[0.06]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden lg:flex items-center gap-2">
              <SearchBar />

              <Link
                href="/tools/hammer"
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all"
                aria-label="Молоток"
                title="Молоток"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                  <path d="m18 15 4-4" />
                  <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
                </svg>
              </Link>

              <Link
                href="/tools/kava"
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all"
                aria-label="Kava Hub"
                title="Kava Hub"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
              </Link>

              {user && <NotificationsBell />}
            </div>

            {user ? (
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="cursor-pointer focus:outline-none flex items-center gap-1.5 p-0.5 rounded-full border border-transparent hover:border-hairline-dark transition-colors"
                >
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    displayName={
                      user.user_metadata?.display_name ||
                      user.email?.split("@")[0]
                    }
                    size={30}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 max-h-[calc(100dvh-5rem)] overflow-y-auto bg-canvas-night-soft border border-hairline-dark rounded-xl shadow-2xl z-50 py-2 divide-y divide-hairline-dark">
                    <div className="px-4 py-2">
                      <p className="text-sm font-semibold text-on-primary truncate">
                        {user.user_metadata?.display_name ||
                          user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-ink-mute truncate">
                        {user.email}
                      </p>
                      {userRole && (
                        <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono ${
                          userRole === "owner" ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10" :
                          userRole === "podrofikovany" ? "border-purple-500/50 text-purple-400 bg-purple-500/10" :
                          "border-hairline-dark text-on-primary-mute"
                        }`}>
                          {userRole === "owner" ? "Головний Подро" : userRole === "podrofikovany" ? "Подрофікований" : userRole}
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-primary hover:bg-canvas-night transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        ПРОФІЛЬ
                      </Link>
                      <Link
                        href="/tools/kava"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-primary hover:bg-canvas-night transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                          <line x1="6" y1="1" x2="6" y2="4" />
                          <line x1="10" y1="1" x2="10" y2="4" />
                          <line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                        KAVA HUB
                      </Link>
                      <Link
                        href="/upload"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-primary hover:bg-canvas-night transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        ЗАВАНТАЖИТИ
                      </Link>
                      {(userRole === "owner" || userRole === "podrofikovany") && (
                        <Link
                          href="/admin"
                          className={`flex items-center gap-2.5 px-4 py-2 text-xs font-semibold hover:bg-canvas-night transition-colors ${
                            userRole === "owner" ? "text-yellow-400" : "text-purple-400"
                          }`}
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          АДМІН-ПАНЕЛЬ
                        </Link>
                      )}
                    </div>

                    <div className="py-1">
                      <p className="px-4 pt-1 pb-0.5 micro-cap text-[10px] text-ink-mute">
                        Сервіси
                      </p>
                      {externalMenuLinks.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-on-primary-mute hover:bg-canvas-night hover:text-on-primary transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          {link.icon}
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setUserMenuOpen(false);
                          window.location.href = "/";
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-on-primary-mute hover:bg-canvas-night hover:text-red-400 transition-colors w-full text-left cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        ВИЙТИ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-ghost text-on-primary !py-2 !px-4 !text-xs">
                УВІЙТИ
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/tools/hammer"
              className="text-on-primary-mute hover:text-on-primary p-2"
              aria-label="Молоток"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                <path d="m18 15 4-4" />
                <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
              </svg>
            </Link>
            <button
              className="p-2 text-on-primary cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Меню"
              aria-expanded={menuOpen}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <path d="M3 6h18M3 12h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile SpaceX Menu Drawer */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[53px] bottom-0 z-50 bg-canvas-night/95 backdrop-blur-xl border-t border-hairline-dark px-4 sm:px-6 py-6 overflow-y-auto overscroll-contain animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-label="Головне меню"
        >
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            <div>
              <SearchBar fullWidth />
            </div>

            {/* User card if logged in */}
            {user ? (
              <div className="p-4 rounded-xl bg-canvas-night-soft border border-hairline-dark flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    displayName={user.user_metadata?.display_name || user.email?.split("@")[0]}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-bold text-on-primary">
                      {user.user_metadata?.display_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-ink-mute">{user.email}</p>
                  </div>
                </div>
                <Link
                  href={`/profile/${user.id}`}
                  className="text-xs button-cap px-3 py-1.5 rounded-full border border-hairline-dark text-on-primary hover:border-on-primary-mute"
                  onClick={() => setMenuOpen(false)}
                >
                  ПРОФІЛЬ
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-canvas-night-soft border border-hairline-dark flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-on-primary">KodloHUB Акаунт</p>
                  <p className="text-xs text-ink-mute">Увійдіть для завантаження та коментування</p>
                </div>
                <Link
                  href="/login"
                  className="btn-solid !py-2 !px-4 !text-xs"
                  onClick={() => setMenuOpen(false)}
                >
                  УВІЙТИ
                </Link>
              </div>
            )}

            {/* Categorized Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category 1: Projects & Games */}
              <div className="p-4 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark space-y-2.5">
                <p className="micro-cap text-ink-mute text-[10px] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 2 3 5 5 3-5 3-3 5-3-5-5-3 5-3 3-5Z" />
                  </svg>
                  <span>ПРОЄКТИ ТА ІГРИ</span>
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/projects"
                    className="text-sm font-semibold text-on-primary hover:text-cyan-400 flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Каталог Проєктів</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/projects/updates"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Devlog Оновлення</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/tools"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Ігровий & Tools Хаб</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-on-primary/10 text-on-primary font-mono">2.0</span>
                  </Link>
                  <Link
                    href="/tools/kava"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>☕ Kava Hub (Кава 22:00)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-on-primary/10 text-on-primary font-mono">SYNC</span>
                  </Link>
                </div>
              </div>

              {/* Category 2: Unified Archive */}
              <div className="p-4 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark space-y-2.5">
                <p className="micro-cap text-ink-mute text-[10px] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>АРХІВ КОНТЕНТУ</span>
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/archive"
                    className="text-sm font-semibold text-on-primary hover:text-cyan-400 flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Єдиний Архів (Усе)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">2.0</span>
                  </Link>
                  <Link
                    href="/gallery"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Медіатека (Фото/Відео)</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/blog"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Блог Спільноти</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/lore"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Артефакти та Лор</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/cast"
                    className="text-sm text-on-primary-mute hover:text-on-primary flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>КодлоCAST Подкаст</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                </div>
              </div>

              {/* Category 3: Knowledge & Lore */}
              <div className="p-4 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark space-y-2.5">
                <p className="micro-cap text-ink-mute text-[10px] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span>БАЗА ЗНАНЬ</span>
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/wiki"
                    className="text-sm font-semibold text-on-primary hover:text-cyan-400 flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Кодлопедія (Вікі 2.0)</span>
                    <span className="text-xs text-ink-mute">→</span>
                  </Link>
                  <Link
                    href="/support-ending"
                    className="text-sm text-on-primary-mute hover:text-yellow-400 flex items-center justify-between"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>Оголошення KodloHUB 2.0</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-mono">2.0</span>
                  </Link>
                </div>
              </div>

              {/* Category 4: Actions & Quick Links */}
              <div className="p-4 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark space-y-2.5">
                <p className="micro-cap text-ink-mute text-[10px] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>ШВИДКІ ДІЇ</span>
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/upload"
                    className="text-sm font-semibold text-on-primary hover:text-cyan-400 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Завантажити контент
                  </Link>
                  {(userRole === "owner" || userRole === "podrofikovany") && (
                    <Link
                      href="/admin"
                      className={`text-sm flex items-center gap-2 ${userRole === "owner" ? "text-yellow-400" : "text-purple-400"}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Адмін-панель
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* External Links & Logout */}
            <div className="border-t border-hairline-dark pt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {externalMenuLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-on-primary-mute hover:text-on-primary flex items-center gap-1.5"
                  >
                    {link.icon}
                    {link.label}
                  </a>
                ))}
              </div>

              {user && (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setMenuOpen(false);
                    window.location.href = "/";
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                >
                  ВИЙТИ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

