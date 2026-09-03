import Link from "next/link";

interface PremiumLockScreenProps {
  title?: string;
  description?: string;
}

export default function PremiumLockScreen({
  title = "РОЗДІЛ KODLOHUB PREMIUM",
  description = "Цей розділ та матеріали кодло-розробки доступні виключно для користувачів із підпискою KodloHUB Premium.",
}: PremiumLockScreenProps) {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-[520px] w-full mx-auto text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-canvas-night-soft border border-hairline-dark mx-auto flex items-center justify-center text-on-primary shadow-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="micro-cap text-[10px] text-ink-mute font-mono tracking-widest uppercase">
            ДОСТУП ОБМЕЖЕНО
          </span>
          <h1 className="heading-hero text-2xl sm:text-3xl font-bold uppercase tracking-tight text-on-primary">
            {title}
          </h1>
          <p className="text-sm text-ink-mute leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        </div>

        <div className="card-dark p-6 rounded-2xl border border-hairline-dark bg-canvas-night-soft space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-ink-mute">Вартість:</span>
            <span className="text-white font-bold">22 ₴ / місяць</span>
          </div>
          <Link
            href="/premium"
            className="w-full btn-solid !py-3 !text-xs font-mono font-bold uppercase block text-center"
          >
            ОФОРМИТИ ПІДПИСКУ (22 ₴) →
          </Link>
          <Link
            href="/premium"
            className="block text-xs text-ink-mute hover:text-on-primary font-mono transition-colors"
          >
            Детальніше про фонд та тариф
          </Link>
        </div>
      </div>
    </div>
  );
}
