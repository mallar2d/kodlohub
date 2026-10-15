"use client";

import { useEffect } from "react";
import { ErrorNotice } from "@/components/kodlobench/Notices";

export default function KodloBenchError({
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
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">РЕЗУЛЬТАТИ ТЕСТУВАННЯ МОДЕЛЕЙ ШІ</p>
        <h1 className="heading-section mb-6">KodloBench</h1>
        <ErrorNotice message="Не вдалося показати сторінку результатів." onRetry={reset} />
      </div>
    </div>
  );
}
