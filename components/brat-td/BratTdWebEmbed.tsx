"use client";

import { useEffect, useState } from "react";

/** Embedded Vite SPA built from brat-td-desktop (`public/brat-td`). */
export default function BratTdWebEmbed() {
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const sync = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const short = Math.min(window.innerWidth, window.innerHeight) <= 720;
      setPhone(coarse && short);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  if (phone) {
    return (
      <section className="mb-8">
        <div className="mb-3">
          <p className="micro-cap text-ink-mute mb-2">ГРАТИ В БРАУЗЕРІ</p>
          <h2 className="heading-sub mb-3">Brat TD 1.0</h2>
          <p className="max-w-2xl text-ink-mute leading-relaxed">
            На телефоні гра відкривається на весь екран у альбомній орієнтації —
            той самий інтерфейс, що на ПК.
          </p>
        </div>
        <a
          href="/brat-td/"
          className="btn-ghost text-on-primary inline-flex min-h-12 items-center"
        >
          Відкрити гру на весь екран →
        </a>
      </section>
    );
  }

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
          allow="autoplay; fullscreen; gamepad; screen-wake-lock"
          allowFullScreen
          loading="eager"
        />
      </div>
    </section>
  );
}
