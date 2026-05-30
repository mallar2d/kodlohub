"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const adminRoles = ["owner", "podrofikovany"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setRole(profile?.role || null);
      setLoading(false);
    });
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!role || !adminRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="heading-sub text-hairline-dark mb-4">:(</p>
          <p className="text-on-primary-mute mb-6">
            Тільки Головний Подро та Подрофіковані мають доступ до адмінки
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
