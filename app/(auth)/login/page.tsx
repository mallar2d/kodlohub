"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const authError = searchParams.get("error");
  const nextPath = searchParams.get("next") || "/";
  const displayError =
    authError === "auth_failed" ? "Не вдалося увійти. Спробуй ще раз." : error;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="heading-section mb-4">УВІЙТИ</h1>
          <p className="text-on-primary-mute text-lg">
            Увійди через Google, щоб завантажувати контент
          </p>
        </div>

        <div className="card-dark p-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="micro-cap text-on-primary-mute">ЗАХОДИМО...</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-canvas-light text-ink font-bold rounded-lg hover:bg-canvas-cool transition-colors cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>

              <p className="caption text-ink-mute text-center mt-6">
                Натисни — Google запитає підтвердження
              </p>
            </>
          )}

          {displayError && (
            <div className="mt-6 p-4 border border-red-500/50 rounded-lg bg-red-500/10">
              <p className="text-red-400 text-sm text-center">{displayError}</p>
            </div>
          )}
        </div>

        <p className="text-center mt-8 caption text-ink-mute">
          Нажми і не бійся. Кодло чекає.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
