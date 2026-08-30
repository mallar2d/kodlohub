"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import PremiumLockScreen from "./PremiumLockScreen";
import PremiumProjectTemplate, { PremiumProjectMeta } from "./PremiumProjectTemplate";

interface PremiumProtectedWrapperProps {
  project: PremiumProjectMeta;
}

export default function PremiumProtectedWrapper({ project }: PremiumProtectedWrapperProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserPremium = async () => {
      let active = false;

      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_premium")
            .eq("id", user.id)
            .single();

          if (profile?.role === "owner" || profile?.role === "podrofikovany" || profile?.is_premium) {
            active = true;
          }
        } catch {
          active = false;
        }
      }

      setIsPremium(active);
      setLoading(false);
    };

    checkUserPremium();
    window.addEventListener("premium_updated", checkUserPremium);
    return () => {
      window.removeEventListener("premium_updated", checkUserPremium);
    };
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-on-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <PremiumLockScreen
        title={`${project.title} — KODLOHUB PREMIUM`}
        description="Цей проєкт та матеріали розробки доступні виключно для користувачів із підпискою KodloHUB Premium."
      />
    );
  }

  return <PremiumProjectTemplate project={project} />;
}
