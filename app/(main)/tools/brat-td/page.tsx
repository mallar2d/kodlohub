import BratTdSuggestionForm from "@/components/brat-td/SuggestionForm";
import BratTdWebEmbed from "@/components/brat-td/BratTdWebEmbed";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Brat TD: Total PDR Edition",
  description:
    "Грай Brat TD 1.0 у браузері або завантаж Windows-установщик. Android і Linux плануються пізніше.",
  path: "/tools/brat-td",
  images: [{ url: "/og-brattd.png", width: 1731, height: 909, alt: "Brat TD" }],
});

export default function BratTDPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-canvas-night">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB MINI-GAME</p>
        <h1 className="heading-section mb-6">Brat TD</h1>

        <section className="card-dark mb-8 border-on-primary-mute bg-canvas-night-soft/80 p-6">
          <p className="micro-cap text-ink-mute mb-2">ВЕРСІЯ 1.0</p>
          <h2 className="heading-sub mb-3">Brat TD: Total PDR Edition</h2>
          <div className="max-w-3xl space-y-4 text-ink-mute leading-relaxed">
            <p>
              Повна веб-версія гри зібрана з desktop-клієнта. Для збереження
              прогресу потрібен логін KodloHUB (той самий акаунт, що й для HALF
              BRAT / Hammer Launcher). Локальні дані синхронізуються в хмару після
              входу.
            </p>
            <p>
              Pairing: у грі натисни «Увійти через KodloHUB», підтверди код на{" "}
              <a href="/brat-td/link" className="text-on-primary underline">
                /brat-td/link
              </a>
              .
            </p>
            <p>
              Desktop: Linux zip уже на сайті для Hammer Launcher. Windows
              setup 1.0 треба зібрати на Windows (див.{" "}
              <code className="text-on-primary">brat-td-desktop/scripts/build-windows-for-launcher.sh</code>
              ).
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#play" className="btn-ghost text-on-primary">
              Грати в браузері
            </a>
            <a
              href="/Brat_TD_1.0.0_linux_x86_64.zip"
              download
              className="btn-ghost text-on-primary"
            >
              Завантажити Linux (zip)
            </a>
            <a
              href="/Brat%20TD_0.8.0_x64-setup.exe"
              download
              className="btn-ghost text-on-primary"
            >
              Windows setup (поки 0.8)
            </a>
          </div>
        </section>

        <div id="play">
          <BratTdWebEmbed />
        </div>

        <BratTdSuggestionForm />
      </div>
    </main>
  );
}
