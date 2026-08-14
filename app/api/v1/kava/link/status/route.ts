import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canClaimToday, getTimeUntilNextClaim } from "@/lib/kava";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Параметр token є обов'язковим" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Find the link token
    const { data: linkRecord, error: tokenErr } = await admin
      .from("telegram_link_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenErr || !linkRecord) {
      return NextResponse.json({ success: true, linked: false });
    }

    if (linkRecord.used) {
      // Fetch the updated profile
      const { data: profile } = await admin
        .from("profiles")
        .select(
          "id, full_name, avatar_url, telegram_id, telegram_username, telegram_first_name, telegram_photo_url, telegram_linked_at, kava_balance_cache, kava_last_claim_at, kava_total_claims"
        )
        .eq("id", linkRecord.user_id)
        .single();

      if (profile && profile.telegram_id) {
        const lastClaim = profile.kava_last_claim_at;
        return NextResponse.json({
          success: true,
          linked: true,
          telegram: {
            id: profile.telegram_id,
            username: profile.telegram_username,
            firstName: profile.telegram_first_name,
            photoUrl: profile.telegram_photo_url,
            linkedAt: profile.telegram_linked_at,
          },
          balance: profile.kava_balance_cache || 0,
          canClaim: canClaimToday(lastClaim),
          timeUntilNextClaim: getTimeUntilNextClaim(lastClaim),
          totalClaims: profile.kava_total_claims || 0,
        });
      }
    }

    return NextResponse.json({ success: true, linked: false });
  } catch (error: any) {
    console.error("Link status error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
