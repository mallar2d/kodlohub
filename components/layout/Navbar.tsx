"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import NotificationsBell from "@/components/ui/NotificationsBell";

const navLinks = [
  { href: "/gallery", label: "ГАЛЕРЕЯ" },
  { href: "/blog", label: "БЛОГ" },
  { href: "/lore", label: "АРТЕФАКТИ" },
  { href: "/users", label: "УЧАСНИКИ" },
  { href: "/upload", label: "ЗАВАНТАЖИТИ" },
  { href: "https://kava.javajumper.ddns.net", label: "КАВА", external: true },
  {
    href: "https://soundcloud.com/zt-barista",
    label: "BARISTA",
    external: true,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setUserRole(profile?.role || null);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setUserRole(profile?.role || null);
      } else {
        setUserRole(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

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
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary"
        >
          KodloHUB
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            "external" in link && link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="micro-cap text-on-primary-mute hover:opacity-70 transition-opacity"
              >
                {link.label}
              </a>
            ) : (
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
            ),
          )}

          {user && (userRole === "owner" || userRole === "podrofikovany") && (
            <Link
              href="/admin"
              className={`micro-cap transition-opacity hover:opacity-70 ${
                pathname === "/admin"
                  ? userRole === "owner"
                    ? "text-yellow-400"
                    : "text-purple-400"
                  : userRole === "owner"
                    ? "text-yellow-400/70"
                    : "text-purple-400/70"
              }`}
            >
              АДМІН
            </Link>
          )}

          {user && <NotificationsBell />}

          {user ? (
            <div className="relative" data-user-menu>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-sm font-bold overflow-hidden cursor-pointer"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.email?.charAt(0).toUpperCase()
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-canvas-night-soft border border-hairline-dark rounded-lg shadow-xl z-50 py-2">
                  <Link
                    href={`/profile/${user.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary hover:bg-canvas-night transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    ПРОФІЛЬ
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUserMenuOpen(false);
                      window.location.href = "/";
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-on-primary-mute hover:bg-canvas-night hover:text-red-400 transition-colors w-full text-left cursor-pointer"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
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
        <div className="md:hidden bg-canvas-night border-t border-hairline-dark px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) =>
            "external" in link && link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="micro-cap text-on-primary-mute hover:text-on-primary"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="micro-cap text-on-primary-mute hover:text-on-primary"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ),
          )}
          {user && (userRole === "owner" || userRole === "podrofikovany") && (
            <Link
              href="/admin"
              className={`micro-cap hover:text-on-primary ${userRole === "owner" ? "text-yellow-400/70" : "text-purple-400/70"}`}
              onClick={() => setMenuOpen(false)}
            >
              АДМІН
            </Link>
          )}
          {user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <NotificationsBell />
                <Link
                  href={`/profile/${user.id}`}
                  className="micro-cap text-on-primary-mute hover:text-on-primary flex items-center gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Аватар"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : null}
                  ПРОФІЛЬ
                </Link>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setMenuOpen(false);
                  window.location.href = "/";
                }}
                className="micro-cap text-on-primary-mute hover:text-red-400 flex items-center gap-2 text-left cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
