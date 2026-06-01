"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="heading-hero text-hairline-dark mb-4">:(</p>
        <p className="heading-sub mb-6">ШОСЬ ЗЛАМАЛОСЬ</p>
        <p className="text-on-primary-mute text-lg mb-8 max-w-md mx-auto">
          Сталася помилка при завантаженні сторінки. Спробуйте ще раз.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="btn-ghost text-on-primary"
          >
            СПРОБУВАТИ ЗНОВУ
          </button>
          <a
            href="/"
            className="btn-ghost text-ink-mute border-hairline-dark"
          >
            НА ГОЛОВНУ
          </a>
        </div>
      </div>
    </div>
  );
}
