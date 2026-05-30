import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-canvas-night border-t border-hairline-dark px-6 py-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="button-cap text-on-primary">KodloHUB</span>
            <span className="caption text-ink-mute">Хостинг для кодла</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/gallery"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              ГАЛЕРЕЯ
            </Link>
            <Link
              href="/blog"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              БЛОГ
            </Link>
            <Link
              href="/lore"
              className="micro-cap text-on-primary-mute hover:text-on-primary transition-opacity"
            >
              АРТЕФАКТИ
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-hairline-dark flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-on-primary font-bold tracking-[1.6px]">
            ⚡⚡ Powered by PODROID
          </span>
          <span className="caption text-ink-mute">
            © 2025 КОДЛО. Всі права захищені.
          </span>
        </div>
      </div>
    </footer>
  );
}
