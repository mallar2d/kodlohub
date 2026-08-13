import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-canvas-night border-t border-hairline-dark px-4 sm:px-6 pt-14 pb-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-3">
            <Link
              href="/"
              className="inline-block font-[var(--font-display)] text-xl font-bold tracking-[1.6px] uppercase text-on-primary hover:opacity-80 transition-opacity"
            >
              KodloHUB
            </Link>
            <p className="text-sm text-ink-mute max-w-sm leading-relaxed">
              Єдиний цифровий архів творчості, ігор, медіа та бази знань кодла.
            </p>
          </div>

          {/* Col 1: Projects */}
          <div className="space-y-3">
            <p className="micro-cap text-ink-mute text-[10px] tracking-[0.1em]">ПРОЄКТИ</p>
            <ul className="space-y-2 text-sm text-on-primary-mute">
              <li>
                <Link href="/projects" className="hover:text-on-primary transition-colors">
                  Каталог проєктів
                </Link>
              </li>
              <li>
                <Link href="/projects/updates" className="hover:text-on-primary transition-colors">
                  Devlog оновлення
                </Link>
              </li>
              <li>
                <Link href="/tools/hammer" className="hover:text-on-primary transition-colors">
                  Hammer Launcher
                </Link>
              </li>
              <li>
                <Link href="/tools/brat-td" className="hover:text-on-primary transition-colors">
                  Brat TD
                </Link>
              </li>
              <li>
                <Link href="/tools/kodlo-arena" className="hover:text-on-primary transition-colors">
                  Half Brat Arena
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-on-primary transition-colors">
                  Усі тулзи
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Archive & Knowledge */}
          <div className="space-y-3">
            <p className="micro-cap text-ink-mute text-[10px] tracking-[0.1em]">АРХІВ</p>
            <ul className="space-y-2 text-sm text-on-primary-mute">
              <li>
                <Link href="/archive" className="hover:text-on-primary transition-colors">
                  Єдиний архів
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-on-primary transition-colors">
                  Медіатека
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-on-primary transition-colors">
                  Блог спільноти
                </Link>
              </li>
              <li>
                <Link href="/lore" className="hover:text-on-primary transition-colors">
                  Артефакти та лор
                </Link>
              </li>
              <li>
                <Link href="/cast" className="hover:text-on-primary transition-colors">
                  КодлоCAST
                </Link>
              </li>
              <li>
                <Link href="/wiki" className="hover:text-on-primary transition-colors">
                  Кодлопедія
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Resources */}
          <div className="space-y-3">
            <p className="micro-cap text-ink-mute text-[10px] tracking-[0.1em]">СПІЛЬНОТА</p>
            <ul className="space-y-2 text-sm text-on-primary-mute">
              <li>
                <Link href="/support-ending" className="hover:text-on-primary transition-colors">
                  Маніфест 2.0
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-on-primary transition-colors">
                  Документація API
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-on-primary transition-colors">
                  Ключі розробника
                </Link>
              </li>
              <li>
                <a
                  href="https://kava.javajumper.ddns.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-on-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Кава</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-mute">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              </li>
              <li>
                <a
                  href="https://soundcloud.com/zt-barista"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-on-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <span>SoundCloud</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-mute">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-hairline-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-mute">
          <div className="flex items-center gap-2">
            <span className="text-on-primary font-bold tracking-[1.4px] uppercase flex items-center gap-1.5 font-mono text-[11px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              POWERED BY PODROID
            </span>
          </div>
          <div>
            <span className="font-mono text-[11px]">© {new Date().getFullYear()} 22:00 КОДЛО · KODLOHUB 2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
