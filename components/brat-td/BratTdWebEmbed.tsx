"use client";

/** Embedded Vite SPA built from brat-td-desktop (`public/brat-td`). */
export default function BratTdWebEmbed() {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="micro-cap text-ink-mute mb-2">ГРАТИ В БРАУЗЕРІ</p>
          <h2 className="heading-sub">Brat TD 1.0</h2>
        </div>
        <a
          href="/brat-td/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-on-primary"
        >
          На весь екран
        </a>
      </div>
      <div className="overflow-hidden border border-hairline-dark bg-canvas-night">
        <iframe
          title="Brat TD: Total PDR Edition"
          src="/brat-td/"
          className="block w-full border-0 bg-black"
          style={{ height: "min(80vh, 900px)", minHeight: 640 }}
          allow="autoplay; fullscreen; gamepad"
          loading="eager"
        />
      </div>
    </section>
  );
}
