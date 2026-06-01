"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login?error=auth_failed");
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ data, error }: { data: { user: { id: string } | null }; error: { message: string } | null }) => {
      if (error || !data.user) {
        console.error("[auth/callback] exchange error:", error);
        router.replace("/login?error=auth_failed");
        return;
      }
      // Sync profile in background
      fetch("/api/sync-profile", { method: "POST" }).catch(() => {});
      router.replace("/");
    });
  }, [searchParams, router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
