"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/gallery", label: "ГАЛЕРЕЯ" },
  { href: "/blog", label: "БЛОГ" },
  { href: "/lore", label: "ЛОРА" },
  { href: "/upload", label: "ЗАВАНТАЖИТИ" },
  { href: "https://kava.javajumper.ddns.net", label: "КАВА", external: true },
  { href: "https://soundcloud.com/zt-barista", label: "BARISTA", external: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-canvas-night/80 backdrop-blur-sm border-b border-hairline-dark">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary"
        >
          KODLOHOST
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
            )
          )}

          {user ? (
            <Link
              href={`/profile/${user.id}`}
              className="w-8 h-8 rounded-full bg-canvas-cool flex items-center justify-center text-ink text-sm font-bold overflow-hidden"
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
            </Link>
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            )
          )}
          {user ? (
            <div className="flex items-center gap-3">
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
          ) : (
            <Link href="/login" className="btn-ghost text-on-primary w-fit" onClick={() => setMenuOpen(false)}>
              УВІЙТИ
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
