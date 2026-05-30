"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TelegramWidget from "@/components/ui/TelegramWidget";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTelegramAuth = async (telegramUser: Record<string, unknown>) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telegramUser),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Помилка авторизації");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Щось пішло не так. Спробуй ще раз.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="heading-section mb-4">УВІЙТИ</h1>
          <p className="text-on-primary-mute text-lg">
            Увійди через Telegram, щоб завантажувати контент
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
              <TelegramWidget onAuth={handleTelegramAuth} />
              <p className="caption text-ink-mute text-center mt-6">
                Натисни на кнопку вище — Telegram запитає підтвердження
              </p>
            </>
          )}

          {error && (
            <div className="mt-6 p-4 border border-red-500/50 rounded-lg bg-red-500/10">
              <p className="text-red-400 text-sm text-center">{error}</p>
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
