"use client";

import { useEffect, useState } from "react";

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleError(event: ErrorEvent) {
      console.error("Unhandled error:", event.error);
      setError("Щось пішло не так. Спробуй оновити сторінку.");
    }

    function handleRejection(event: PromiseRejectionEvent) {
      console.error("Unhandled rejection:", event.reason);
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas-night text-on-primary p-4">
        <div className="text-center max-w-md">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute mb-6">{error}</p>
          <button
            onClick={() => { setError(null); window.location.reload(); }}
            className="btn-ghost text-on-primary"
          >
            ОНОВИТИ
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
