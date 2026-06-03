"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import NotificationsBell from "@/components/ui/NotificationsBell";
import SearchBar from "@/components/ui/SearchBar";
import Avatar from "@/components/ui/Avatar";

const navLinks = [
  { href: "/gallery", label: "ГАЛЕРЕЯ" },
  { href: "/blog", label: "БЛОГ" },
  { href: "/lore", label: "АРТЕФАКТИ" },
  { href: "/wiki", label: "КОДЛОПЕДІЯ" },
  { href: "/users", label: "УЧАСНИКИ" },
  { href: "/tools", label: "TOOLS" },
];

const externalMenuLinks = [
  {
    href: "https://kava.javajumper.ddns.net",
    label: "КАВА",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    href: "https://soundcloud.com/zt-barista",
    label: "BARISTA",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    const cachedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas-night/80 backdrop-blur-sm border-b border-hairline-dark">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary"
        >
          KodloHUB
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`micro-cap transition-opacity hover:opacity-70 ${
                pathname === link.href
                  ? "text-on-primary"
                  : "text-on-primary-mute"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <SearchBar />
          <Link
            href="/tools/hammer"
            className="text-on-primary-mute hover:text-on-primary transition-colors"
            aria-label="Молоток"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
              <path d="m18 15 4-4" />
              <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
            </svg>
          </Link>
          {user && <NotificationsBell />}

          {user ? (
            <div className="relative" data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="cursor-pointer focus:outline-none"
              >
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  displayName={user.user_metadata?.display_name || user.email?.split("@")[0]}
                  size={32}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-canvas-night-soft border border-hairline-dark rounded-lg shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-hairline-dark">
                    <p className="text-sm text-on-primary truncate">
                      {user.user_metadata?.display_name ||
                        user.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-ink-mute truncate">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href={`/profile/${user.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary hover:bg-canvas-night transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    ПРОФІЛЬ
                  </Link>
                  <Link
                    href="/upload"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary hover:bg-canvas-night transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    ЗАВАНТАЖИТИ
                  </Link>
                  {userRole === "owner" || userRole === "podrofikovany" ? (
                    <Link
                      href="/admin"
                      className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-canvas-night transition-colors ${userRole === "owner" ? "text-yellow-400" : "text-purple-400"}`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      АДМІН
                    </Link>
                  ) : null}
                  <div className="border-t border-hairline-dark my-1" />
                  <p className="px-4 pt-2 pb-1 micro-cap text-ink-mute">Посилання</p>
                  {externalMenuLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary-mute hover:bg-canvas-night hover:text-on-primary transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      {link.icon}
                      {link.label}
                    </a>
                  ))}
                  <div className="border-t border-hairline-dark my-1" />
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUserMenuOpen(false);
                      window.location.href = "/";
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary-mute hover:bg-canvas-night hover:text-red-400 transition-colors w-full text-left cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    ВИЙТИ
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-ghost text-on-primary">
              УВІЙТИ
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-on-primary"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
        >
          <svg
            width="24"
            height="24"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-canvas-night border-t border-hairline-dark px-4 sm:px-6 py-5 flex flex-col gap-4">
          <div className="mb-2">
            <SearchBar />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="micro-cap text-on-primary-mute hover:text-on-primary"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <NotificationsBell />
                <Link
                  href="/upload"
                  className="micro-cap text-on-primary-mute hover:text-on-primary flex items-center gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  ЗАВАНТАЖИТИ
                </Link>
                {(userRole === "owner" || userRole === "podrofikovany") && (
                  <Link
                    href="/admin"
                    className={`micro-cap hover:text-on-primary flex items-center gap-2 ${userRole === "owner" ? "text-yellow-400/70" : "text-purple-400/70"}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    АДМІН
                  </Link>
                )}
                <Link
                  href={`/profile/${user.id}`}
                  className="micro-cap text-on-primary-mute hover:text-on-primary flex items-center gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    displayName={user.user_metadata?.display_name || user.email?.split("@")[0]}
                    size={24}
                  />
                  ПРОФІЛЬ
                </Link>
              </div>
              <div className="border-t border-hairline-dark pt-3 flex flex-col gap-3">
                <p className="micro-cap text-ink-mute">Посилання</p>
                {externalMenuLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="micro-cap text-on-primary-mute hover:text-on-primary flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.icon}
                    {link.label}
                  </a>
                ))}
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setMenuOpen(false);
                  window.location.href = "/";
                }}
                className="micro-cap text-on-primary-mute hover:text-red-400 flex items-center gap-2 text-left cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                ВИЙТИ
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-ghost text-on-primary w-fit"
              onClick={() => setMenuOpen(false)}
            >
              УВІЙТИ
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
