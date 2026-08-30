import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PremiumAccessResult {
  isPremium: boolean;
  userId: string | null;
  role: string | null;
}

export async function verifyServerPremiumAccess(): Promise<PremiumAccessResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isPremium: false, userId: null, role: null };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, is_premium, premium_until")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { isPremium: false, userId: user.id, role: null };
    }

    // Owner and Podrofikovany always have access
    if (profile.role === "owner" || profile.role === "podrofikovany") {
      return { isPremium: true, userId: user.id, role: profile.role };
    }

    if (profile.is_premium) {
      if (profile.premium_until) {
        const expiresAt = new Date(profile.premium_until).getTime();
        if (expiresAt < Date.now()) {
          return { isPremium: false, userId: user.id, role: profile.role };
        }
      }
      return { isPremium: true, userId: user.id, role: profile.role };
    }

    return { isPremium: false, userId: user.id, role: profile.role };
  } catch (err) {
    console.error("verifyServerPremiumAccess error:", err);
    return { isPremium: false, userId: null, role: null };
  }
}
