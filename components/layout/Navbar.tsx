"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import NotificationsBell from "@/components/ui/NotificationsBell";
import SearchBar from "@/components/ui/SearchBar";
import Avatar from "@/components/ui/Avatar";
import ThemeSelector from "@/components/ui/ThemeSelector";

const navLinks = [
  { href: "/projects", label: "ПРОЄКТИ" },
  { href: "/archive", label: "АРХІВ", match: ["/archive", "/gallery", "/blog", "/lore", "/cast"] },
  { href: "/wiki", label: "КОДЛОПЕДІЯ" },
  { href: "/tools", label: "ТУЛЗИ" },
  { href: "/kodlobench", label: "KODLOBENCH", wide: true },
  { href: "/premium", label: "ПРЕМІУМ" },
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
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkPremium = () => {
      setIsPremium(localStorage.getItem("kodlohub_premium") === "true");
    };
    checkPremium();
    window.addEventListener("premium_updated", checkPremium);
    window.addEventListener("storage", checkPremium);
    return () => {
      window.removeEventListener("premium_updated", checkPremium);
      window.removeEventListener("storage", checkPremium);
    };
  }, []);

  useEffect(() => {
    const cachedRole =
      typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (cachedRole) setUserRole(cachedRole);
  }, []);

  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setIsPremium(false);
      localStorage.removeItem("kodlohub_premium");
      return;
    }
    const fetchRoleAndPremium = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_premium")
        .eq("id", user.id)
        .single();
      const role = profile?.role || null;
      const prem = !!profile?.is_premium;
      setUserRole(role);
      setIsPremium(prem);
      if (role) localStorage.setItem("userRole", role);
      if (prem) {
        localStorage.setItem("kodlohub_premium", "true");
      } else {
        localStorage.removeItem("kodlohub_premium");
      }
    };
    fetchRoleAndPremium();
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
          {/* Left: Logo & Nav Links */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary group transition-all duration-200 shrink-0"
              style={{
                opacity: logoOpacity,
                transform: `translateX(${logoTranslateX})`,
                pointerEvents: isHome && logoOpacity < 0.2 ? "none" : "auto",
              }}
            >
              <span
                className={
                  isPremium
                    ? "text-transparent bg-clip-text animate-premium-sheen"
                    : ""
                }
                style={
                  isPremium
                    ? {
                        backgroundImage: "var(--premium-gradient)",
                        filter: "var(--premium-text-filter)",
                      }
                    : undefined
                }
              >
                KodloHUB
              </span>
              {isPremium && (
                <span
                  className="font-[var(--font-display)] text-[11px] font-black tracking-[1.6px] px-2.5 py-0.5 rounded-full border text-transparent bg-clip-text animate-premium-sheen uppercase shrink-0 transition-all"
                  style={{
                    backgroundImage: "var(--premium-gradient)",
                    borderColor: "var(--premium-badge-border)",
                    backgroundColor: "var(--premium-badge-bg)",
                    boxShadow: "var(--premium-badge-shadow)",
                    filter: "var(--premium-text-filter)",
                  }}
                >
                  PREMIUM
                </span>
              )}
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {navLinks.map((link) => {
                const isActive = link.match
                  ? link.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`button-cap transition-all py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      "wide" in link && link.wide ? "hidden xl:inline-block " : ""
                    }${
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
          </div>

          {/* Right: Desktop Actions & Mobile Menu Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <SearchBar />

              <ThemeSelector />

              <Link
                href="/tools/hammer"
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all shrink-0"
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
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark hover:border-white/40 text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 hover:bg-canvas-night-soft transition-all shrink-0"
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
                        {isPremium && (
                          <Link
                            href="/premium/hub"
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-white hover:bg-canvas-night transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            ПРЕМІУМ-ХАБ (VAULT)
                          </Link>
                        )}
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
                            localStorage.removeItem("dev_mock_user");
                            localStorage.removeItem("userRole");
                            localStorage.removeItem("kodlohub_premium");
                            window.dispatchEvent(new Event("dev_auth_changed"));
                            window.dispatchEvent(new Event("premium_updated"));
                            try {
                              await supabase.auth.signOut();
                            } catch {}
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
                <Link href="/login" className="btn-ghost text-on-primary !py-2 !px-4 !text-xs shrink-0 whitespace-nowrap">
                  УВІЙТИ
                </Link>
              )}
            </div>

            {/* Mobile Actions: Theme, Hammer & Hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeSelector variant="icon" />
              <Link
                href="/tools/hammer"
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark text-on-primary-mute hover:text-on-primary bg-canvas-night-soft/60 transition-colors"
                aria-label="Молоток"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                  <path d="m18 15 4-4" />
                  <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
                </svg>
              </Link>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center border border-hairline-dark text-on-primary bg-canvas-night-soft/60 cursor-pointer"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Меню"
                aria-expanded={menuOpen}
              >
                <svg
                  width="16"
                  height="16"
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
        </div>
      </nav>

      {/* Mobile SpaceX Menu Drawer */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-[53px] bottom-0 z-50 bg-canvas-night/95 backdrop-blur-xl border-t border-hairline-dark px-4 sm:px-6 py-6 overflow-y-auto overscroll-contain animate-slide-up flex flex-col justify-between"
          role="dialog"
          aria-modal="true"
          aria-label="Головне меню"
        >
          <div className="max-w-[600px] w-full mx-auto flex flex-col gap-6">
            {/* Search Bar */}
            <div>
              <SearchBar fullWidth />
            </div>

            {/* User Info / Login Bar */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-canvas-night-soft border border-hairline-dark flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    displayName={user.user_metadata?.display_name || user.email?.split("@")[0]}
                    size={38}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-primary truncate">
                      {user.user_metadata?.display_name || user.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-ink-mute truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/profile/${user.id}`}
                    className="text-xs font-mono font-medium px-3 py-1.5 rounded-full border border-hairline-dark text-on-primary hover:border-white/40 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    ПРОФІЛЬ
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-canvas-night-soft border border-hairline-dark flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-on-primary">KodloHUB Акаунт</p>
                  <p className="text-xs text-ink-mute">Авторизуйтеся для повного доступу</p>
                </div>
                <Link
                  href="/login"
                  className="btn-solid !py-2 !px-5 !text-xs font-bold shrink-0"
                  onClick={() => setMenuOpen(false)}
                >
                  УВІЙТИ
                </Link>
              </div>
            )}

            {/* Primary Navigation */}
            <div className="space-y-2">
              <p className="micro-cap text-ink-mute text-[10px] px-1 tracking-wider">
                ГОЛОВНЕ МЕНЮ
              </p>
              <div className="grid grid-cols-1 gap-2">
                {/* 1. Projects */}
                <Link
                  href="/projects"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/projects" || pathname.startsWith("/projects/")
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">Проєкти</p>
                      <p className="text-xs text-ink-mute font-mono">Каталог ігор, розробка, devlog</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>

                {/* 2. Archive */}
                <Link
                  href="/archive"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/archive" || ["/gallery", "/blog", "/lore", "/cast"].some((m) => pathname.startsWith(m))
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">Архів</p>
                      <p className="text-xs text-ink-mute font-mono">Медіатека, блог, лор, подкасти</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>

                {/* 3. Wiki */}
                <Link
                  href="/wiki"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/wiki" || pathname.startsWith("/wiki/")
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">Кодлопедія</p>
                      <p className="text-xs text-ink-mute font-mono">База знань та енциклопедія</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>

                {/* 4. Tools */}
                <Link
                  href="/tools"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/tools" || pathname.startsWith("/tools/")
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">Тулзи</p>
                      <p className="text-xs text-ink-mute font-mono">Всі інтерактивні утиліти та ігри</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>

                {/* 4b. KodloBench */}
                <Link
                  href="/kodlobench"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/kodlobench" || pathname.startsWith("/kodlobench/")
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide">KodloBench</p>
                      <p className="text-xs text-ink-mute font-mono">Результати тестування моделей ШІ</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>

                {/* 5. Premium */}
                <Link
                  href="/premium"
                  onClick={() => setMenuOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    pathname === "/premium"
                      ? "bg-canvas-night-soft border-on-primary/30 text-on-primary"
                      : "bg-canvas-night-soft/60 border-hairline-dark text-on-primary hover:border-on-primary/20 hover:bg-canvas-night-soft"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-canvas-night border border-hairline-dark flex items-center justify-center text-on-primary-mute group-hover:text-on-primary transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold uppercase tracking-wide">Преміум</p>
                        {isPremium && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded border border-on-primary/25 bg-on-primary/10 text-on-primary font-mono font-semibold">
                            АКТИВНО
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-mute font-mono">22 ₴/міс • Підтримка слопу, без реклами</p>
                    </div>
                  </div>
                  <span className="text-ink-mute group-hover:text-on-primary transition-colors">→</span>
                </Link>
              </div>
            </div>

            {/* Quick Actions & Tools (with zero emojis, strictly monochrome SVGs) */}
            <div className="space-y-2">
              <p className="micro-cap text-ink-mute text-[10px] px-1 tracking-wider">
                ШВИДКИЙ ДОСТУП
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/tools/hammer"
                  onClick={() => setMenuOpen(false)}
                  className="p-3 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark hover:border-white/20 text-xs font-semibold text-on-primary flex items-center gap-2.5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-primary-mute shrink-0">
                    <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
                    <path d="m18 15 4-4" />
                    <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
                  </svg>
                  <span className="truncate">Молоток</span>
                </Link>
                <Link
                  href="/tools/kava"
                  onClick={() => setMenuOpen(false)}
                  className="p-3 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark hover:border-white/20 text-xs font-semibold text-on-primary flex items-center gap-2.5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-primary-mute shrink-0">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                  <span className="truncate">Kava Hub</span>
                </Link>
                <Link
                  href="/upload"
                  onClick={() => setMenuOpen(false)}
                  className="p-3 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark hover:border-white/20 text-xs font-semibold text-on-primary flex items-center gap-2.5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-primary-mute shrink-0">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="truncate">Завантажити</span>
                </Link>
                {(userRole === "owner" || userRole === "podrofikovany") && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="p-3 rounded-xl bg-canvas-night-soft/60 border border-hairline-dark hover:border-white/20 text-xs font-semibold text-yellow-400 flex items-center gap-2.5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="truncate">Адмінка</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Themes Section in Mobile Drawer */}
            <div className="space-y-2">
              <p className="micro-cap text-ink-mute text-[10px] px-1 tracking-wider">
                ОФОРМЛЕННЯ
              </p>
              <ThemeSelector compact />
            </div>
          </div>

          {/* Bottom Bar: External Links & Logout */}
          <div className="max-w-[600px] w-full mx-auto border-t border-hairline-dark pt-4 mt-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              {externalMenuLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-mute hover:text-on-primary flex items-center gap-1.5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              ))}
            </div>

            {user && (
              <button
                onClick={async () => {
                  localStorage.removeItem("dev_mock_user");
                  localStorage.removeItem("userRole");
                  localStorage.removeItem("kodlohub_premium");
                  window.dispatchEvent(new Event("dev_auth_changed"));
                  window.dispatchEvent(new Event("premium_updated"));
                  try {
                    await supabase.auth.signOut();
                  } catch {}
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
      )}
    </>
  );
}


