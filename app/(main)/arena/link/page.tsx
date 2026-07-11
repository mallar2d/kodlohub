"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ArenaLinkInner() {
  const search = useSearchParams();
  const router = useRouter();
  const initial = (search.get("code") || "").toUpperCase();
  const [code, setCode] = useState(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        const next = `/arena/link${initial ? `?code=${initial}` : ""}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setUserId(data.user.id);
    });
  }, [initial, router]);

  const confirm = async () => {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(normalized);
    if (normalized.length !== 6) {
      setStatus("error");
      setMessage("Код має містити 6 символів");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/arena/pair/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Не вдалося підтвердити");
        return;
      }
      setStatus("ok");
      setMessage("Гру підключено. Повернись у HALF BRAT — логін підхопиться сам.");
    } catch {
      setStatus("error");
      setMessage("Мережева помилка");
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <p className="micro-cap text-ink-mute mb-2">HALF BRAT</p>
        <h1 className="heading-section mb-4">ПІДКЛЮЧИТИ ГРУ</h1>
        <p className="text-on-primary-mute text-sm mb-8">
          Введи код з екрана Kodlo Arena / HALF BRAT, щоб прив&apos;язати акаунт KodloHUB.
          Статистика й ігровий нік синхронізуються з профілем.
        </p>

        <div className="card-dark p-6 space-y-4">
          <label className="micro-cap text-on-primary-mute block">КОД З ГРИ</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="AB12CD"
            className="w-full px-4 py-4 bg-canvas-night-soft border border-hairline-dark rounded-lg text-on-primary text-center tracking-[0.35em] text-2xl font-mono uppercase focus:outline-none focus:border-on-primary-mute"
          />
          <button
            type="button"
            onClick={confirm}
            disabled={status === "loading" || !userId}
            className="w-full button-cap px-4 py-3 rounded-full border border-on-primary text-on-primary hover:bg-on-primary/10 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "ПІДТВЕРДЖЕННЯ…" : "ПІДТВЕРДИТИ"}
          </button>
          {message && (
            <p className={`text-sm text-center ${status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          {userId && (
            <Link href={`/profile/${userId}/edit`} className="text-on-primary hover:underline">
              Ігровий нік у профілі
            </Link>
          )}
          <Link href="/tools/kodlo-arena" className="text-on-primary-mute hover:text-on-primary">
            Про гру / лідерборд
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ArenaLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <ArenaLinkInner />
    </Suspense>
  );
}
