"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "owner") {
        setIsOwner(false);
        return;
      }

      setIsOwner(true);
    });
  }, [router, supabase]);

  if (isOwner === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute mb-6">
            Тільки Головний Подро має доступ до цієї сторінки
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-ghost text-on-primary"
          >
            НА ГОЛОВНУ
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
